import mammoth from 'mammoth';
import { extractText, getDocumentProxy } from 'unpdf';

/**
 * Extract raw text from a file buffer.
 * @param {Buffer} fileBuffer - The file contents as a buffer
 * @param {string} mimeType   - MIME type string
 * @returns {Promise<string>} - Cleaned plain text
 */
export async function processDocument(fileBuffer, mimeType) {
  try {
    let text = '';

    if (mimeType === 'application/pdf') {
      try {
        // Step 1: Convert buffer to Uint8Array and create a PDF document proxy
        const uint8Array = new Uint8Array(fileBuffer);
        const pdf = await getDocumentProxy(uint8Array);

        // Step 2: Pass the proxy to extractText — NOT the raw Uint8Array.
        // mergePages: true returns a single string instead of string[]
        const { totalPages, text: pdfText } = await extractText(pdf, { mergePages: true });

        console.log(`Processing PDF with ${totalPages} pages`);
        text = pdfText || '';

      } catch (pdfError) {
        console.error('unpdf extraction error:', pdfError);
        throw new Error(`Failed to parse PDF: ${pdfError.message}`);
      }
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword'
    ) {
      try {
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        text = result.value;
      } catch (docError) {
        console.error('Word doc parse error:', docError);
        throw new Error(`Failed to parse Word document: ${docError.message}`);
      }
    } else if (
      mimeType.startsWith('text/') ||
      mimeType === 'text/plain' ||
      mimeType === 'text/markdown'
    ) {
      text = fileBuffer.toString('utf-8');
    }

    // Validation: Ensure we actually got text
    if (!text) {
      throw new Error(
        'Extracted text is empty. The document may be image-based (scanned) or corrupted.'
      );
    }

    return cleanText(text);
  } catch (error) {
    console.error('❌ Document processing error:', error.message);
    throw new Error(`Processing failed: ${error.message}`);
  }
}

/**
 * Basic text cleaning to remove artifacts and excessive whitespace
 */
function cleanText(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+/g, ' ')
    .replace(/[^\x20-\x7E\n\r\t]/g, '')
    .trim();
}

/**
 * Split extracted text into overlapping word-level chunks for Vector Indexing.
 */
export function chunkText(text, chunkSize = 1000, overlap = 200) {
  const chunks = [];
  if (!text) return chunks;

  const words = text.split(/\s+/);
  const step = chunkSize - overlap;
  const actualStep = step > 0 ? step : chunkSize;

  for (let i = 0; i < words.length; i += actualStep) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    if (chunk.trim()) {
      chunks.push(chunk);
    }
  }

  return chunks;
}