// services/vectorStore.js
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import crypto from 'crypto';

dotenv.config();

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is missing in .env');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });

/**
 * Generate 768-dim embeddings using Gemini.
 * Optimized with batching to avoid multiple round-trips.
 */
async function generateEmbeddings(texts) {
  try {
    // text-embedding-004 is current, but we'll use batch for efficiency
    const result = await embeddingModel.batchEmbedContents({
      requests: texts.map((t) => ({
        content: { role: 'user', parts: [{ text: t }] },
      })),
    });
    return result.embeddings.map((e) => e.values);
  } catch (error) {
    console.error('Gemini embedding error:', error);
    // Fallback to individual embedding if batch fails or check if model name is wrong
    throw new Error('Failed to generate embeddings via Gemini');
  }
}

/**
 * Headers for Qdrant API
 */
const getQdrantHeaders = () => {
  const headers = { 'Content-Type': 'application/json' };
  if (QDRANT_API_KEY) {
    headers['api-key'] = QDRANT_API_KEY;
  }
  return headers;
};

/**
 * Ensure collection exists with 3072 dimensions (Gemini default)
 */
async function ensureCollection(collectionName) {
  const url = `${QDRANT_URL}/collections/${collectionName}`;
  const response = await fetch(url, { headers: getQdrantHeaders() });

  if (response.status === 404) {
    console.log(`🆕 Creating Qdrant collection: ${collectionName}`);
    const createRes = await fetch(url, {
      method: 'PUT',
      headers: getQdrantHeaders(),
      body: JSON.stringify({
        vectors: { size: 3072, distance: 'Cosine' },
      }),
    });
    if (!createRes.ok) {
      const err = await createRes.text();
      throw new Error(`Failed to create collection: ${err}`);
    }
  } else if (response.ok) {
    const data = await response.json();
    const existingSize = data.result?.config?.params?.vectors?.size;
    
    // If we have a dimension mismatch (e.g. old 768 collection), delete and recreate
    if (existingSize && existingSize !== 3072) {
      console.warn(`⚠️ Dimension mismatch (${existingSize} vs 3072). Recreating collection ${collectionName}...`);
      await fetch(url, { method: 'DELETE', headers: getQdrantHeaders() });
      return ensureCollection(collectionName); // Recursive call to recreate
    }
  } else {
    const err = await response.text();
    throw new Error(`Error checking collection: ${err}`);
  }
}

/**
 * Deterministic UUID for chunks to prevent duplicates
 */
function generateId(collectionName, text) {
  return crypto.createHash('md5').update(`${collectionName}_${text}`).digest('hex');
}

/**
 * Index text chunks into Qdrant using Gemini embeddings.
 */
export const addToVectorStore = async ({ chunks, collectionName }) => {
  try {
    await ensureCollection(collectionName);

    const embeddings = await generateEmbeddings(chunks);
    const points = chunks.map((text, i) => ({
      id: generateId(collectionName, text),
      vector: embeddings[i],
      payload: {
        content: text,
        timestamp: new Date().toISOString(),
      },
    }));

    const response = await fetch(`${QDRANT_URL}/collections/${collectionName}/points?wait=true`, {
      method: 'PUT',
      headers: getQdrantHeaders(),
      body: JSON.stringify({ points }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Qdrant upsert error: ${err}`);
    }

    console.log(`✅ Indexed ${chunks.length} chunks into ${collectionName} via Gemini`);
    return { status: 'ok', chunks_added: chunks.length };
  } catch (error) {
    console.error('addToVectorStore error:', error);
    throw error;
  }
};

/**
 * Search Qdrant via REST.
 */
export const searchVectorStore = async (query, collectionName, topK = 5) => {
  try {
    const [queryEmbedding] = await generateEmbeddings([query]);

    const response = await fetch(`${QDRANT_URL}/collections/${collectionName}/points/query`, {
      method: 'POST',
      headers: getQdrantHeaders(),
      body: JSON.stringify({
        query: queryEmbedding,
        limit: topK,
        with_payload: true,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Qdrant search error: ${err}`);
    }

    const data = await response.json();
    return data.result.points.map((p) => ({
      content: p.payload.content,
      similarity: p.score,
    }));
  } catch (error) {
    console.error('searchVectorStore error:', error);
    throw error;
  }
};

/**
 * Delete collection via REST.
 */
export const deleteCollection = async (collectionName) => {
  try {
    const response = await fetch(`${QDRANT_URL}/collections/${collectionName}`, {
      method: 'DELETE',
      headers: getQdrantHeaders(),
    });

    if (response.ok) {
      console.log(`🗑️ Deleted Qdrant collection: ${collectionName}`);
    } else if (response.status !== 404) {
      const err = await response.text();
      console.warn(`⚠️ Failed to delete collection ${collectionName}: ${err}`);
    }
  } catch (error) {
    console.error('deleteCollection error:', error);
  }
};