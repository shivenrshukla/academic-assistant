import fs from 'fs/promises';
import path from 'path';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';

export async function processDocument(filePath, mimeType) {
  try {
    // 1. Verify file existence before processing
    try {
      await fs.access(filePath);
    } catch (e) {
      throw new Error(`File not found at path: ${filePath}`);
    }

    const fileBuffer = await fs.readFile(filePath);
    let text = '';

    console.log(`📄 Processing: ${path.basename(filePath)} (${mimeType})`);

    if (mimeType === 'application/pdf') {
      try {
        const parser = new PDFParse({
        data: fileBuffer,          // ✅ buffer instead of url
        verbosity: 0               // optional, ERRORS only
      });

      const result = await parser.getText();
      text = result?.text || '';

      await parser.destroy();
    } catch (pdfError) {
        console.error('PDF Parse specific error:', pdfError);
        throw new Error(`Failed to parse PDF: ${pdfError.message}`);
      }
    }

    else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
      mimeType === 'application/msword'
    ) {
      try {
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        text = result.value;
      } catch (docError) {
        console.error('Word Doc specific error:', docError);
        throw new Error(`Failed to parse Word Doc: ${docError.message}`);
      }
    } 
    else if (mimeType.includes('text/') || filePath.endsWith('.txt') || filePath.endsWith('.md')) {
      text = fileBuffer.toString('utf-8');
    } 
    else {
      console.warn(`⚠️ Unsupported MIME type: ${mimeType}, treating as empty.`);
    }

    if (!text) {
      throw new Error('Extracted text is empty. The document might be image-based or empty.');
    }

    return cleanText(text);

  } catch (error) {
    console.error('❌ Document processing error:', error.message);
    // Rethrow with clear message for the controller to catch
    throw new Error(`Processing failed: ${error.message}`);
  }
}

function cleanText(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[^\x20-\x7E\n\r\t]/g, '') // Remove non-printable characters
    .trim();
}

export function chunkText(text, chunkSize = 1000, overlap = 200) {
  const chunks = [];
  if (!text) return chunks;
  
  const words = text.split(/\s+/);
  
  for (let i = 0; i < words.length; i += (chunkSize - overlap)) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    if (chunk.trim()) {
      chunks.push(chunk);
    }
  }
  
  return chunks;
}