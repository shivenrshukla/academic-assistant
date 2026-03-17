# faiss_service.py
import os
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
    if not client.collection_exists(collection_name=collection_name):
        client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=EMBEDDING_DIM, distance=Distance.COSINE),
        )
        print(f"🆕 Created collection: {collection_name}")

def generate_deterministic_id(collection_name: str, text: str) -> str:
    # If the exact same text is uploaded to the same collection twice, 
    # Qdrant will simply overwrite it instead of creating a duplicate.
    unique_string = f"{collection_name}_{text}"
    return str(uuid.uuid5(uuid.NAMESPACE_OID, unique_string))


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

        BATCH_SIZE = 100
        total_added = 0

        for i in range(0, len(req.chunks), BATCH_SIZE):
            batch_chunks = req.chunks[i : i + BATCH_SIZE]

            # 1. Create local embeddings
            vectors = embed_texts(batch_chunks)
            points = [
                PointStruct(
                    id=generate_deterministic_id(req.collection_name, chunk_text),
                    vector=vectors[idx],
                    payload={
                        "content": chunk_text,
                        "timestamp": datetime.utcnow().isoformat(),
                    },
                )
                for idx, chunk_text in enumerate(batch_chunks)
            ]
            
            # Upsert the batch to Qdrant
            client.upsert(collection_name=req.collection_name, points=points)
            total_added += len(points)

            print(f"⏳ Progress: {total_added}/{len(req.chunks)} chunks indexed...")

        # Python will naturally clean up the variables when the function returns.
        print(f"✅ Successfully indexed all {total_added} chunks")
        return {"status": "ok", "chunks_added": total_added}

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