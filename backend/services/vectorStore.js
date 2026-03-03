// services/vectorStore.js
/**
 * FIX 1: Removed direct Qdrant JS client entirely.
 *         All vector ops now go through the Python faiss_service via HTTP.
 *         This ensures add and search use the same all-MiniLM-L6-v2 model.
 *
 * FIX 2: `searchVectorStore` was never exported — ragService.js import would
 *         silently receive `undefined` and crash at call time.
 */

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

/**
 * Index text chunks into a Qdrant collection via the Python service.
 * @param {{ chunks: string[], collectionName: string }} params
 */
export const addToVectorStore = async ({ chunks, collectionName }) => {
  const response = await fetch(`${PYTHON_SERVICE_URL}/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chunks, collection_name: collectionName }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Vector store add error: ${err}`);
  }

  return response.json();
};

/**
 * Search a Qdrant collection for chunks relevant to a query.
 * @param {string} query
 * @param {string} collectionName - the user+document scoped collection
 * @param {number} topK
 * @returns {Promise<Array<{ content: string, similarity: number }>>}
 */
export const searchVectorStore = async (query, collectionName, topK = 5) => {
  const response = await fetch(`${PYTHON_SERVICE_URL}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      collection_name: collectionName,
      top_k: topK,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Vector store search error: ${err}`);
  }

  return response.json(); // [{ content, similarity }]
};

/**
 * Delete an entire Qdrant collection (called during 7-day cleanup).
 * @param {string} collectionName
 */
export const deleteCollection = async (collectionName) => {
  const response = await fetch(`${PYTHON_SERVICE_URL}/delete_collection`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ collection_name: collectionName }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.warn(`⚠️ Qdrant delete skipped (${collectionName}): ${err}`);
  } else {
    console.log(`🗑️ Qdrant: deleted collection ${collectionName}`);
  }
};