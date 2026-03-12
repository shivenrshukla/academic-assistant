// models/Document.js
import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    filename: {
      type: String,
      required: true,
    },
    storagePath: {
      type: String, // Firebase storage path (used for deletion)
      required: true,
    },
    storageUrl: {
      type: String, // Firebase public URL
      required: true,
    },
    qdrantCollection: {
      type: String, // Format: userId_documentId
      required: true,
    },
    chunkCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['processing', 'ready', 'failed'],
      default: 'processing',
    },
    expiresAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// TTL index — MongoDB auto-deletes document record after expiresAt.
// NOTE: The cleanup cron in index.js handles Qdrant + Firebase BEFORE this fires.
documentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// FIX: was `module.exports` mixed with ESM `import`
export default mongoose.model('Document', documentSchema);