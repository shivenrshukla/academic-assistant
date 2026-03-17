import mongoose from 'mongoose';
import { processDocument, chunkText } from '../services/processDocument.js';
import { uploadToSupabase } from '../services/supabaseStorage.js';
import { addToVectorStore } from '../services/vectorStore.js';
import Document from '../models/Document.js';
import Conversation from '../models/Conversation.js';

const TTL_DAYS = 7;

export const uploadFiles = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const { conversationId } = req.body;
    const expiresAt = new Date(Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000);
    const processedDocs = [];

    // Find or create Conversation to govern this upload batch
    let conversation;
    if (conversationId) {
      conversation = await Conversation.findOne({
        _id: conversationId,
        user: req.user.id,
      });
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
    } else {
      // Create a temporary conversation ID (MongoDB ObjectId)
      const mockId = new mongoose.Types.ObjectId();
      const qdrantCollection = `${req.user.id}_${mockId}`;

      conversation = new Conversation({
        _id: mockId,
        user: req.user.id,
        documents: [],
        qdrantCollection,
        title: req.files[0].originalname, // Use first file name as title initially
        lastMessageAt: new Date(),
        expiresAt,
      });
    }

    for (const file of req.files) {
      let docRecord = null;

      try {
        // 1. Upload to Supabase Storage
        const { url, path: storagePath } = await uploadToSupabase(file);

        // 2. Extract text from buffer
        const extractedText = await processDocument(file.buffer, file.mimetype);

        // 3. Chunk the text
        const chunks = chunkText(extractedText);

        if (chunks.length === 0) {
          throw new Error('No text chunks could be extracted from document.');
        }

        // 4. Save Document record to MongoDB
        docRecord = await Document.create({
          user: req.user.id,
          filename: file.originalname,
          storagePath,
          storageUrl: url,
          chunkCount: chunks.length,
          status: 'ready', // We can mark ready early since collection logic is unified
          expiresAt,
        });

        // 5. Index chunks in Qdrant into the single conversation collection
        await addToVectorStore({ chunks, collectionName: conversation.qdrantCollection });

        // 6. Push document ID into conversation
        conversation.documents.push(docRecord._id);

        processedDocs.push({
          documentId: docRecord._id,
          name: file.originalname,
          size: file.size,
          type: file.mimetype,
          supabaseUrl: url,
          chunkCount: chunks.length,
          expiresAt,
        });

        console.log(`✅ Indexed ${chunks.length} chunks for "${file.originalname}" into ${conversation.qdrantCollection}`);

      } catch (fileError) {
        console.error(`❌ Failed to process "${file.originalname}":`, fileError.message);

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

    // Save the conversation (creates it if new, updates documents array if existing)
    if (conversation.documents.length > 0) {
       // Only save if at least one document succeeded to avoid empty conversations
       await conversation.save();
    } else if (!conversationId) {
        // Remove the temporary _id if we fail completely on a new conversation to be safe
       return res.status(500).json({ error: 'Failed to process any documents.' });
    }

    const successful = processedDocs.filter((d) => !d.error);
    const failed = processedDocs.filter((d) => d.error);

    return res.status(failed.length === processedDocs.length ? 500 : 200).json({
      success: successful.length > 0,
      files: processedDocs,
      conversationId: conversation._id,
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