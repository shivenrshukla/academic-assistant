import os
import faiss
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from datetime import datetime
from contextlib import asynccontextmanager

# ── Config ────────────────────────────────────────────────────────────────────
UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

# ── Local Embedding Model ─────────────────────────────────────────────────────
# Downloads once (~90 MB), then runs fully offline.
# Swap the model name for a larger one (e.g. "all-mpnet-base-v2") if you need
# higher accuracy at the cost of speed.
print("🔌 Loading local embedding model...")
model = SentenceTransformer("all-MiniLM-L6-v2")
EMBEDDING_DIM = model.get_sentence_embedding_dimension()
print(f"✅ Model loaded  |  Embedding dim: {EMBEDDING_DIM}")

# ── FAISS Index & Document Store ──────────────────────────────────────────────
index = faiss.IndexFlatIP(EMBEDDING_DIM)
documents: list[dict] = []


def normalize(vectors: np.ndarray) -> np.ndarray:
    faiss.normalize_L2(vectors)
    return vectors


def embed_texts(texts: list[str]) -> np.ndarray:
    """Embed a list of strings locally and return a float32 numpy array."""
    vecs = model.encode(texts, show_progress_bar=False, convert_to_numpy=True)
    return vecs.astype("float32")


# ── Cleanup Helper ────────────────────────────────────────────────────────────
def clear_session():
    """Reset the in-memory FAISS index and document store."""
    global index, documents

    index = faiss.IndexFlatIP(EMBEDDING_DIM)
    documents.clear()

    print("🗑️ FAISS index cleared.")
    print("🗑️ Document store cleared.")
    print("✅ Session reset complete.")


# ── Lifespan (startup / shutdown hooks) ───────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup — nothing extra needed; model is already loaded above
    yield
    # shutdown — runs when the server stops (Ctrl-C, SIGTERM, etc.)
    print("\n🔴 Server shutting down — cleaning up session data...")
    clear_session()


app = FastAPI(lifespan=lifespan)


# ── Request Models ────────────────────────────────────────────────────────────
class AddRequest(BaseModel):
    chunks: list[str]
    filename: str


class SearchRequest(BaseModel):
    query: str
    top_k: int = 5


# ── Routes ────────────────────────────────────────────────────────────────────
@app.post("/add")
def add_documents(req: AddRequest):
    try:
        print(f"📥 Indexing {len(req.chunks)} chunks from: {req.filename}")

        if not req.chunks:
            return {"status": "skipped", "message": "No chunks provided"}

        # Embed locally — no API calls, no rate limits, no batching delays needed
        vectors = embed_texts(req.chunks)
        vectors = normalize(vectors)

        index.add(x=vectors) # type: ignore

        for chunk in req.chunks:
            documents.append({
                "content": chunk,
                "filename": req.filename,
                "timestamp": datetime.utcnow().isoformat(),
            })

        print(f"✅ Indexed {len(req.chunks)} chunks from {req.filename}")
        return {"status": "ok", "chunks_added": len(req.chunks)}

    except Exception as e:
        print(f"❌ Error in /add: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/search")
def search(req: SearchRequest):
    try:
        if index.ntotal == 0:
            return []

        query_vec = embed_texts([req.query])
        query_vec = normalize(query_vec)

        scores, indices = index.search(x=query_vec, k=req.top_k) # type: ignore

        results = []
        for idx, score in zip(indices[0], scores[0]):
            if idx == -1:
                continue
            results.append({
                "content": documents[idx]["content"],
                "filename": documents[idx]["filename"],
                "similarity": float(score),
            })

        return results

    except Exception as e:
        print(f"❌ Error in /search: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/clear")
def clear_endpoint():
    """Optional manual endpoint to clear the session without restarting."""
    clear_session()
    return {"status": "ok", "message": "Session cleared"}