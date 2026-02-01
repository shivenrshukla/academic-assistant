// backend/check_models.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import 'dotenv/config';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("❌ No API Key found in .env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
  try {
    console.log("Checking available models for your API key...");
    // This fetches the list directly from Google
    const models = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }).apiKey; 
    // Actually, let's use the listModels method on the client
    // Note: The Node SDK exposes this differently, let's try the fetch directly to be safe
    // or use the proper SDK method if available.
    
    // Easier way with fetch to avoid SDK version issues:
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();

    if (data.error) {
        console.error("❌ API Error:", data.error);
        return;
    }

    console.log("\n✅ AVAILABLE MODELS:");
    const generateModels = data.models.filter(m => m.supportedGenerationMethods.includes("generateContent"));
    
    generateModels.forEach(m => {
        console.log(`- ${m.name.replace('models/', '')}`);
    });
    
    console.log("\n(Please copy one of these names into your ragService.js)");

  } catch (error) {
    console.error("Failed to list models:", error);
  }
}

listModels();