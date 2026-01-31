import fetch from "node-fetch";
import { chunkText } from "./processDocument.js";

const FAISS_BASE_URL = "http://localhost:8001";

/**
 * Sends document chunks to the Python FAISS service
 */
export async function addToVectorStore(text, filename) {
  try {
    const chunks = chunkText(text);

    if (!chunks.length) {
      console.warn("No chunks generated for document:", filename);
      return;
    }

    const response = await fetch(`${FAISS_BASE_URL}/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chunks,
        filename
      })
    });

    if (!response.ok) {
      throw new Error(`FAISS add failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`Added ${result.chunks_added} chunks from ${filename} to FAISS`);

  } catch (error) {
    console.error("Vector store error:", error);
    throw error;
  }
}

/**
 * Queries FAISS for top-k similar document chunks
 */
export async function searchVectorStore(query, topK = 5) {
  try {
    const response = await fetch(`${FAISS_BASE_URL}/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query,
        top_k: topK
      })
    });

    if (!response.ok) {
      throw new Error(`FAISS search failed: ${response.statusText}`);
    }

    const results = await response.json();
    return results;

  } catch (error) {
    console.error("Search error:", error);
    return [];
  }
}

/**
 * FAISS is stateful on the Python side.
 * Clearing vectors should be implemented as a Python endpoint if required.
 */
export function clearVectorStore() {
  console.warn(
    "clearVectorStore is not implemented on Node.js. " +
    "FAISS state is managed by the Python service."
  );
}
