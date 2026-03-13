// index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';

import connectDB from './config/db.js';
import ChatRoutes from './routes/chat.js';
import UploadRoutes from './routes/upload.js';
import AuthRoutes from './routes/auth.js';
import Document from './models/Document.js';
import Conversation from './models/Conversation.js';
import Message from './models/Message.js';
import { deleteCollection } from './services/vectorStore.js';
import { deleteFromSupabase } from './services/supabaseStorage.js';

dotenv.config();

// ─────────────────────────────────────────────────────────────────────────────
// FIX: Firebase Admin was never initialized anywhere.
//      Must be done before any firebase-admin usage (uploadToFirebase, etc.)
// ─────────────────────────────────────────────────────────────────────────────

// Connect to MongoDB
await connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  'http://localhost:5173',          // Local frontend
  'https://academic-assistant-vert.vercel.app', // Deployed frontend
  process.env.FRONTEND_URL          // Fallback env variable
].filter(Boolean);

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', AuthRoutes);
app.use('/api/chat', ChatRoutes);
app.use('/api/upload', UploadRoutes);

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'online', timestamp: new Date().toISOString() });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Global Error:', err);
  res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7-DAY CLEANUP CRON
//
// Runs daily at 02:00. Finds Documents whose expiresAt has passed and:
//   1. Deletes their Qdrant collection (via Python service)
//   2. Deletes their file from Firebase Storage
//   3. Deletes related Conversations and Messages from MongoDB
//   4. Deletes the Document record itself
//
// WHY: MongoDB TTL indexes auto-delete records but cannot call external APIs.
//      This cron cleans Qdrant and Firebase BEFORE the record disappears.
// ─────────────────────────────────────────────────────────────────────────────
cron.schedule('0 2 * * *', async () => {
  console.log('🧹 Running 7-day cleanup cron...');

  try {
    const now = new Date();
    const expiredDocs = await Document.find({ expiresAt: { $lte: now } });

    console.log(`Found ${expiredDocs.length} expired document(s) to clean up.`);

    for (const doc of expiredDocs) {
      try {
        // 1. Delete Qdrant collection
        await deleteCollection(doc.qdrantCollection);

        // 2. Delete Supabase file
        await deleteFromSupabase(doc.storagePath);

        // 3. Delete all conversations for this document
        const conversations = await Conversation.find({ document: doc._id });
        const convIds = conversations.map((c) => c._id);

        // 4. Delete all messages in those conversations
        if (convIds.length > 0) {
          await Message.deleteMany({ conversation: { $in: convIds } });
          await Conversation.deleteMany({ _id: { $in: convIds } });
        }

        // 5. Delete the document record
        await Document.deleteOne({ _id: doc._id });

        console.log(`✅ Cleaned up document: ${doc.filename} (${doc._id})`);

      } catch (docError) {
        console.error(`❌ Cleanup failed for document ${doc._id}:`, docError.message);
        // Continue with other documents even if one fails
      }
    }

    console.log('🧹 Cleanup cron complete.');
  } catch (error) {
    console.error('❌ Cleanup cron error:', error);
  }
});

// ── Start Server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});