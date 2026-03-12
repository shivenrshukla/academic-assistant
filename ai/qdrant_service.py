# faiss_service.py
import os
import gc
import uuid
from datetime import datetime
from contextlib import asynccontextmanager
from typing import cast

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, PointStruct, ScoredPoint

# ── Config ────────────────────────────────────────────────────────────────────
# 1. Load environment variables BEFORE trying to read them
load_dotenv()

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")

if not QDRANT_URL:
    print("⚠️ WARNING: QDRANT_URL not found in environment. Falling back to localhost.")
    QDRANT_URL = "http://localhost:6333"

# ── Model ─────────────────────────────────────────────────────────────────────
print("🔌 Loading local embedding model...")
model = SentenceTransformer("all-MiniLM-L6-v2")

embedding_dim = model.get_sentence_embedding_dimension()
if embedding_dim is None:
    raise RuntimeError("Embedding dimension could not be determined.")

EMBEDDING_DIM: int = embedding_dim
print(f"✅ Model loaded  |  Embedding dim: {EMBEDDING_DIM}")

# ── Qdrant Client ─────────────────────────────────────────────────────────────
print(f"📡 Connecting to Qdrant at: {QDRANT_URL}")
client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)

# ── Utilities ─────────────────────────────────────────────────────────────────

def embed_texts(texts: list[str]) -> list[list[float]]:
    vectors = model.encode(texts, show_progress_bar=False, convert_to_numpy=True)
    return vectors.tolist()


def ensure_collection(collection_name: str):
    existing = client.get_collections().collections
    names = [c.name for c in existing]
    if collection_name not in names:
        client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=EMBEDDING_DIM, distance=Distance.COSINE),
        )
        print(f"🆕 Created collection: {collection_name}")


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    print("🔴 Server shutting down...")


app = FastAPI(lifespan=lifespan)

# ── Request Models ────────────────────────────────────────────────────────────

class AddRequest(BaseModel):
    chunks: list[str]
    collection_name: str


class SearchRequest(BaseModel):
    query: str
    collection_name: str
    top_k: int = 5


class EmbedRequest(BaseModel):
    text: str


class DeleteCollectionRequest(BaseModel):
    collection_name: str


# ── Routes ────────────────────────────────────────────────────────────────────

@app.post("/add")
def add_documents(req: AddRequest):
    try:
        if not req.chunks:
            return {"status": "skipped", "message": "No chunks provided"}

        print(f"📥 Indexing {len(req.chunks)} chunks into '{req.collection_name}'")
        ensure_collection(req.collection_name)

        # 1. Create local embeddings
        vectors = embed_texts(req.chunks)
        points = [
            PointStruct(
                id=str(uuid.uuid4()),
                vector=vectors[i],
                payload={
                    "content": req.chunks[i],
                    "timestamp": datetime.utcnow().isoformat(),
                },
            )
            for i in range(len(req.chunks))
        ]

        # 2. Pass them on to Qdrant Cloud
        client.upsert(collection_name=req.collection_name, points=points)
        print(f"✅ Indexed {len(points)} chunks")

        # 3. Delete local embeddings from RAM explicitly
        del vectors
        del points
        gc.collect() # Force garbage collector to clean up RAM immediately
        print("🧹 Local memory cleared")

        return {"status": "ok", "chunks_added": len(req.chunks)}

    except Exception as e:
        print(f"❌ Error in /add: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/search")
def search(req: SearchRequest):
    try:
        # Create a single embedding for the query locally
        query_vector = embed_texts([req.query])[0]
        
        # 4. Do vector search on Qdrant
        response = client.query_points(
            collection_name=req.collection_name,
            query=query_vector,
            limit=req.top_k,
        )
        
        points = cast(list[ScoredPoint], response.points)
        return [
            {
                "content": point.payload.get("content") if point.payload else None,
                "similarity": point.score,
            }
            for point in points
        ]
    except Exception as e:
        print(f"❌ Error in /search: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/embed")
def embed_single(req: EmbedRequest):
    try:
        vector = embed_texts([req.text])[0]
        return {"vector": vector}
    except Exception as e:
        print(f"❌ Error in /embed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/delete_collection")
def delete_collection(req: DeleteCollectionRequest):
    try:
        client.delete_collection(collection_name=req.collection_name)
        print(f"🗑️ Deleted collection: {req.collection_name}")
        return {"status": "ok", "message": "Collection deleted"}
    except Exception as e:
        print(f"❌ Error deleting collection: {e}")
        raise HTTPException(status_code=500, detail=str(e))