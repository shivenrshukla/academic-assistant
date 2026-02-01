import os
import time # Added for rate limiting delays
import faiss # type: ignore
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# 1. Validate API Key
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("❌ CRITICAL: GEMINI_API_KEY not found in .env")
    raise ValueError("GEMINI_API_KEY not found")

os.environ["GOOGLE_API_KEY"] = api_key

# 2. Initialize Embeddings
# We use text-embedding-004 as it is the latest stable model
print("🔌 Connecting to Google AI...")
try:
    embeddings = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004")
    embeddings.embed_query("test connection") # Fail fast check
    print("✅ AI Service Initialized Successfully")
except Exception as e:
    print(f"❌ STARTUP ERROR: Could not connect to Google AI. Details:\n{e}")
    # We allow the server to start, but requests will likely fail
    
EMBEDDING_DIM = 768
index = faiss.IndexFlatIP(EMBEDDING_DIM)
documents = []

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
        print(f"📥 Received request to process {len(req.chunks)} chunks from: {req.filename}")
        
        if not req.chunks:
            return {"status": "skipped", "message": "No chunks provided"}

        # 3. BATCH PROCESSING (The Fix for 429 Errors)
        # We split the chunks into groups of 10 and process them one by one.
        BATCH_SIZE = 10
        all_vectors = []
        
        total_batches = (len(req.chunks) + BATCH_SIZE - 1) // BATCH_SIZE
        
        for i in range(0, len(req.chunks), BATCH_SIZE):
            batch = req.chunks[i : i + BATCH_SIZE]
            current_batch_num = (i // BATCH_SIZE) + 1
            print(f"   ⏳ Embedding batch {current_batch_num}/{total_batches} ({len(batch)} chunks)...")
            
            try:
                # Embed just this small batch
                batch_vectors = embeddings.embed_documents(batch)
                all_vectors.extend(batch_vectors)
                
                # CRITICAL: Sleep for 2 seconds between batches to respect Free Tier rate limits
                if i + BATCH_SIZE < len(req.chunks):
                    time.sleep(2)
                    
            except Exception as batch_error:
                print(f"❌ Error embedding batch {current_batch_num}: {batch_error}")
                raise batch_error

        # Convert all collected vectors to numpy array
        vectors = np.array(all_vectors).astype("float32")
        vectors = normalize(vectors)

        # Add to FAISS
        index.add(vectors) # type: ignore

        # Store Metadata
        for chunk in req.chunks:
            documents.append({
                "content": chunk,
                "filename": req.filename,
                "timestamp": datetime.utcnow().isoformat()
            })

        print(f"✅ Successfully indexed {req.filename}")
        return {"status": "ok", "chunks_added": len(req.chunks)}
    
    except Exception as e:
        print(f"❌ Error in /add: {e}")
        raise HTTPException(status_code=500, detail=f"AI Service Error: {str(e)}")

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