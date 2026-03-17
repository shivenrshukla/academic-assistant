// models/Conversation.js
import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    documents: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
    }],
    qdrantCollection: {
      type: String,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      default: 'New Chat',
    },
    lastMessageAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// TTL index — MongoDB auto-deletes conversation when expiresAt is reached
conversationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('Conversation', conversationSchema);