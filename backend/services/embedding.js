// services/embedding.js
/**
 * NEW FILE — was imported in uploadController.js but never created.
 *
 * All embedding is delegated to the Python faiss_service (all-MiniLM-L6-v2).
 * This keeps indexing and querying embeddings 100% consistent —
 * both use the exact same model and weights.
 */

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

/**
 * Embed a single string by calling the Python service's /embed endpoint.
 * Used by vectorStore.js for query-time search.
 * @param {string} text
 * @returns {Promise<number[]>} - embedding vector
 */
export const embedText = async (text) => {
  const response = await fetch(`${PYTHON_SERVICE_URL}/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Embedding service error: ${err}`);
  }

  const data = await response.json();
  return data.vector;
};