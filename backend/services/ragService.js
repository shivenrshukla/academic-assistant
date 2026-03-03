// services/ragService.js
import { GoogleGenerativeAI } from '@google/generative-ai';
import { searchVectorStore } from './vectorStore.js';
import dotenv from 'dotenv'

dotenv.config()

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error('GEMINI_API_KEY is missing in .env');
}

const genAI = new GoogleGenerativeAI(apiKey);

/**
 * Run a RAG query against a specific Qdrant collection.
 *
 * FIX 1: `collectionName` is now a required parameter.
 *         Previously searchVectorStore was called with no collection name —
 *         it had no idea which Qdrant collection to search.
 *
 * FIX 2: `context` (conversation history) is now included in the prompt.
 *
 * @param {string} query
 * @param {string} collectionName  - Qdrant collection for this document
 * @param {Array<{ role: string, content: string }>} history - prior messages
 * @returns {Promise<{ answer: string, citations: Array<{ score: number }> }>}
 */
export async function processQuery(query, collectionName, history = []) {
  try {
    // Search the correct scoped collection
    const relevantDocs = await searchVectorStore(query, collectionName, 5);

    const contextText =
      relevantDocs.length > 0
        ? relevantDocs
            .map((doc, i) => `[Source ${i + 1}]:\n${doc.content}`)
            .join('\n\n')
        : 'No relevant content found in the uploaded document.';

    // Build conversation history string for the prompt
    const historyText =
      history.length > 0
        ? history
            .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
            .join('\n')
        : '';

    const prompt = buildAcademicPrompt(query, contextText, historyText);

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.3,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    });

    const result = await model.generateContent(prompt);
    const answer = result.response.text();

    // Return answer + citation scores so chatController can save them
    const citations = relevantDocs.map((doc) => ({ score: doc.similarity }));

    return { answer, citations };
  } catch (error) {
    console.error('RAG processing error:', error);
    throw new Error('Failed to process query with RAG pipeline');
  }
}

function buildAcademicPrompt(query, contextText, historyText) {
  return `You are an academically rigorous AI assistant. Your responses must be:
1. Evidence-based, citing information from the provided document context
2. Clear, well-structured, and formally written
3. Honest about the limits of the provided context
4. Free of asterisks or markdown formatting

${historyText ? `CONVERSATION HISTORY:\n${historyText}\n` : ''}

DOCUMENT CONTEXT:
${contextText}

USER QUERY:
${query}

INSTRUCTIONS:
- Answer using information from the document context above
- If the context is insufficient, clearly state that limitation
- Maintain academic precision and formal language
- Do NOT use asterisks or markdown formatting

RESPONSE:`;
}