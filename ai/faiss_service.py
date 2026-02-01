import os
import faiss # type: ignore
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# 1. Get the key from your .env
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY not found in environment variables")

# 2. VITAL FIX: Set the standard environment variable that LangChain expects
# This avoids the "No parameter named google_api_key" error entirely.
os.environ["GOOGLE_API_KEY"] = api_key

EMBEDDING_DIM = 768
index = faiss.IndexFlatIP(EMBEDDING_DIM)
documents = []

try:
    # 3. Initialize WITHOUT the explicit google_api_key parameter
    # It automatically reads os.environ["GOOGLE_API_KEY"]
    embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
except Exception as e:
    print(f"Failed to initialize embeddings: {e}")

def normalize(vectors):
    faiss.normalize_L2(vectors)
    return vectors

class AddRequest(BaseModel):
    chunks: list[str]
    filename: str

class SearchRequest(BaseModel):
    query: str
    top_k: int = 5

@app.post("/add")
def add_documents(req: AddRequest):
    try:
        if not req.chunks:
            return {"status": "skipped", "message": "No chunks provided"}

        vectors = embeddings.embed_documents(req.chunks)
        vectors = np.array(vectors).astype("float32")
        vectors = normalize(vectors)

        index.add(vectors) # type: ignore

        for chunk in req.chunks:
            documents.append({
                "content": chunk,
                "filename": req.filename,
                "timestamp": datetime.utcnow().isoformat()
            })

        print(f"Successfully added {len(req.chunks)} chunks for {req.filename}")
        return {"status": "ok", "chunks_added": len(req.chunks)}
    
    except Exception as e:
        print(f"Error in /add: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/search")
def search(req: SearchRequest):
    try:
        query_vec = embeddings.embed_query(req.query)
        query_vec = np.array([query_vec]).astype("float32")
        query_vec = normalize(query_vec)

        scores, indices = index.search(query_vec, req.top_k) # type: ignore

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
    except Exception as e:
        print(f"Error in /search: {e}")
        raise HTTPException(status_code=500, detail=str(e))