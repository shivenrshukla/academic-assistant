import { GoogleGenerativeAI } from '@google/generative-ai';
import { searchVectorStore } from './vectorStore.js';
import 'dotenv/config'; // <--- 1. CRITICAL FIX: Load .env variables

// 2. Initialize the client (Check if key exists)
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is missing in backend .env file");
}

const genAI = new GoogleGenerativeAI(apiKey);

export async function processQuery(query, context = [], files = []) {
    try {
        const relevantDocs = await searchVectorStore(query, 5);

        const contextText = relevantDocs.length > 0 ? relevantDocs.map((doc, i) => `[Sources ${i + 1} - ${doc.filename}]:\n${doc.content}`).join('\n\n')
                            : 'No uploaded documents available for context.';

        const prompt = buildAcademicPrompt(query, contextText);

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                temperature: 0.3,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2048,
            }
        });

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        return text;
    } catch (error) {
        console.error('RAG processing error:', error);
        throw new Error('Failed to process query with RAG pipeline');
    }
}

function buildAcademicPrompt(query, contextText) {
  return `You are an academically rigorous AI assistant specializing in providing precise, well-reasoned responses based on provided documents. Your responses should be:

        1. Academically precise and formal in tone
        2. Evidence-based, citing specific information from the provided context
        3. Clear and well-structured
        4. Objective and unbiased
        5. Comprehensive yet concise

        CONTEXT FROM UPLOADED DOCUMENTS:
        ${contextText}

        USER QUERY:
        ${query}

        INSTRUCTIONS:
            - Analyze the provided context carefully
            - Answer the query using information from the context
            - If the context doesn't contain sufficient information, acknowledge this limitation
            - Cite specific sources when making claims
            - Maintain academic rigor and precision
            - Use formal academic language
            - Do NOT use asterisks or markdown formatting.

        RESPONSE:`;
}