import faiss
import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from datetime import datetime

app = FastAPI()

EMBEDDING_DIM = 768  # Gemini embedding-001
index = faiss.IndexFlatIP(EMBEDDING_DIM)
documents = []

embeddings = GoogleGenerativeAIEmbeddings(
    model="models/embedding-001",
    google_api_key="YOUR_GEMINI_API_KEY"
)

def normalize(vectors):
    faiss.normalize_L2(vectors)
    return vectors


# ---------- Schemas ----------
class AddRequest(BaseModel):
    chunks: list[str]
    filename: str

class SearchRequest(BaseModel):
    query: str
    top_k: int = 5


# ---------- Endpoints ----------
@app.post("/add")
def add_documents(req: AddRequest):
    vectors = embeddings.embed_documents(req.chunks)
    vectors = np.array(vectors).astype("float32")
    vectors = normalize(vectors)

    index.add(vectors)

    for chunk in req.chunks:
        documents.append({
            "content": chunk,
            "filename": req.filename,
            "timestamp": datetime.utcnow().isoformat()
        })

    return {"status": "ok", "chunks_added": len(req.chunks)}


@app.post("/search")
def search(req: SearchRequest):
    query_vec = embeddings.embed_query(req.query)
    query_vec = np.array([query_vec]).astype("float32")
    query_vec = normalize(query_vec)

    scores, indices = index.search(query_vec, req.top_k)

    results = []
    for idx, score in zip(indices[0], scores[0]):
        if idx == -1:
            continue
        results.append({
            "content": documents[idx]["content"],
            "filename": documents[idx]["filename"],
            "similarity": float(score)
        })

    return results
