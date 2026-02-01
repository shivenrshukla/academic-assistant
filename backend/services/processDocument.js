import fs from 'fs/promises';
import { createRequire } from "module";
const nodeRequire = createRequire(import.meta.url);

// 1. Load the library
const pdfParseLib = nodeRequire("pdf-parse");

// 2. CRITICAL FIX: Handle the import mismatch
// This line ensures 'pdfParse' is the actual function, whether it's wrapped or not.
const pdfParse = pdfParseLib.default || pdfParseLib;

import mammoth from 'mammoth';

export async function processDocument(filePath, mimeType) {
  try {
    const fileBuffer = await fs.readFile(filePath);

    let text = '';

    console.log(`Processing file: ${filePath} with type: ${mimeType}`);

    if (mimeType === 'application/pdf') {
      // debug log to ensure pdfParse is usable
      if (typeof pdfParse !== 'function') {
        throw new Error(`pdfParse is not a function, it is: ${typeof pdfParse}`);
      }
      
      const pdfData = await pdfParse(fileBuffer);
      text = pdfData.text;
    } 
    else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
             mimeType === 'application/msword') {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      text = result.value;
    } 
    else if (mimeType.includes('text/') || filePath.endsWith('.txt') || filePath.endsWith('.md')) {
      text = fileBuffer.toString('utf-8');
    }

    // File is kept on disk (commented out as per your request)
    // await fs.unlink(filePath);

    return cleanText(text);

  } catch (error) {
    console.error('Document processing error:', error);
    throw new Error(`Failed to process document: ${error.message}`);
  }
}

function cleanText(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function chunkText(text, chunkSize = 1000, overlap = 200) {
  const chunks = [];
  const words = text.split(/\s+/);
  
  for (let i = 0; i < words.length; i += (chunkSize - overlap)) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    if (chunk.trim()) {
      chunks.push(chunk);
    }
  }
  
  return chunks;
}