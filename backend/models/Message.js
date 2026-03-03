// models/Message.js
import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    citations: [
      {
        chunkId: String,
        score: Number,
      },
    ],
    // FIX: added expiresAt — was missing entirely. Messages expire with their conversation.
    expiresAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// TTL index — MongoDB will auto-delete messages when expiresAt is reached
messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// FIX: was `module.exports` mixed with ESM `import`
export default mongoose.model('Message', messageSchema);