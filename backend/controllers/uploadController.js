// controllers/uploadController.js
import { processDocument, chunkText } from '../services/processDocument.js';
import { uploadToSupabase } from '../services/supabaseStorage.js'; // 🔄 Changed import
import { addToVectorStore } from '../services/vectorStore.js';
import Document from '../models/Document.js';

const TTL_DAYS = 7;

export const uploadFiles = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const expiresAt = new Date(Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000);
    const processedDocs = [];

    for (const file of req.files) {
      let docRecord = null;

      try {
        // 1. Upload to Supabase Storage (requires file.buffer — multer memoryStorage)
        const { url, path: storagePath } = await uploadToSupabase(file); // 🔄 Changed function

        // 2. Extract text from buffer
        const extractedText = await processDocument(file.buffer, file.mimetype);

        // 3. Chunk the text
        const chunks = chunkText(extractedText);

        if (chunks.length === 0) {
          throw new Error('No text chunks could be extracted from document.');
        }

        // 4. Save Document record to MongoDB first (to get _id for collection name)
        docRecord = await Document.create({
          user: req.user.id,
          filename: file.originalname,
          storagePath,
          storageUrl: url,
          qdrantCollection: 'pending', 
          chunkCount: chunks.length,
          status: 'processing',
          expiresAt,
        });

        // 5. Use MongoDB _id in collection name for stable, unique scoping
        const collectionName = `${req.user.id}_${docRecord._id}`;

        // 6. Index chunks in Qdrant via Python service
        await addToVectorStore({ chunks, collectionName });

        // 7. Update Document with final collection name and ready status
        docRecord.qdrantCollection = collectionName;
        docRecord.status = 'ready';
        await docRecord.save();

        processedDocs.push({
          documentId: docRecord._id,
          name: file.originalname,
          size: file.size,
          type: file.mimetype,
          supabaseUrl: url, // 🔄 Changed key name
          qdrantCollection: collectionName,
          chunkCount: chunks.length,
          expiresAt,
        });

        console.log(`✅ Indexed ${chunks.length} chunks for "${file.originalname}"`);

      } catch (fileError) {
        console.error(`❌ Failed to process "${file.originalname}":`, fileError.message);

        // Mark document as failed if it was created
        if (docRecord) {
          docRecord.status = 'failed';
          await docRecord.save();
        }

        processedDocs.push({
          name: file.originalname,
          error: fileError.message,
          status: 'failed',
        });
      }
    }

    const successful = processedDocs.filter((d) => !d.error);
    const failed = processedDocs.filter((d) => d.error);

    return res.status(failed.length === processedDocs.length ? 500 : 200).json({
      success: successful.length > 0,
      files: processedDocs,
      message: `${successful.length} document(s) uploaded and indexed${failed.length > 0 ? `, ${failed.length} failed` : ''}`,
    });

  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      error: 'Failed to process documents',
      message: error.message,
    });
  }
};