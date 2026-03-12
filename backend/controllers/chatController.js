// controllers/chatController.js
import { processQuery } from '../services/ragService.js';
import { searchVectorStore } from '../services/vectorStore.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Document from '../models/Document.js';

const TTL_DAYS = 7;

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/chat/session/:documentId
//
// "Reload embeddings" endpoint — called when a user opens a chat for a document.
// Verifies the document exists, belongs to the user, and Qdrant collection is
// reachable. Returns or creates a Conversation. Also returns message history.
// ─────────────────────────────────────────────────────────────────────────────
export const initSession = async (req, res) => {
  try {
    const { documentId } = req.params;

    // Load document and verify ownership
    const doc = await Document.findOne({ _id: documentId, user: req.user.id });
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found.' });
    }
    if (doc.status !== 'ready') {
      return res.status(400).json({ success: false, error: `Document status: ${doc.status}` });
    }

    // Verify the Qdrant collection is reachable with a trivial search
    try {
      await searchVectorStore('test', doc.qdrantCollection, 1);
    } catch {
      return res.status(503).json({
        success: false,
        error: 'Vector store unavailable. Embeddings may still be loading.',
      });
    }

    // Find existing open conversation or create one
    let conversation = await Conversation.findOne({
      user: req.user.id,
      document: doc._id,
      expiresAt: { $gt: new Date() },
    });

    if (!conversation) {
      const expiresAt = new Date(Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000);
      conversation = await Conversation.create({
        user: req.user.id,
        document: doc._id,
        title: doc.filename,
        lastMessageAt: new Date(),
        expiresAt,
      });
    }

    // Return conversation + full message history
    const messages = await Message.find({ conversation: conversation._id })
      .sort({ createdAt: 1 })
      .select('role content citations createdAt');

    return res.status(200).json({
      success: true,
      conversationId: conversation._id,
      documentId: doc._id,
      filename: doc.filename,
      expiresAt: doc.expiresAt,
      messages,
    });

  } catch (error) {
    console.error('Session init error:', error);
    return res.status(500).json({ success: false, error: 'Failed to initialize chat session.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/chat
//
// Send a query. Requires conversationId in body.
//
// FIX 1: Loads the document's qdrantCollection from MongoDB — previously
//         ragService had no collection name and searched nothing.
//
// FIX 2: Saves user message and assistant reply to MongoDB.
//
// FIX 3: Passes conversation history to ragService for context-aware answers.
// ─────────────────────────────────────────────────────────────────────────────
export const runQuery = async (req, res) => {
  try {
    const { query, conversationId } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({ success: false, error: 'Query is required.' });
    }
    if (!conversationId) {
      return res.status(400).json({ success: false, error: 'conversationId is required.' });
    }

    // Load conversation and verify ownership
    const conversation = await Conversation.findOne({
      _id: conversationId,
      user: req.user.id,
    }).populate('document');

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found.' });
    }

    const doc = conversation.document;
    if (!doc || doc.status !== 'ready') {
      return res.status(400).json({ success: false, error: 'Document is not ready.' });
    }

    // Load recent message history for context (last 10 messages)
    const recentMessages = await Message.find({ conversation: conversation._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('role content');
    const history = recentMessages.reverse();

    const expiresAt = new Date(Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000);

    // Save user message
    await Message.create({
      conversation: conversation._id,
      role: 'user',
      content: query,
      expiresAt,
    });

    // Run RAG with the correct scoped collection
    const { answer, citations } = await processQuery(
      query,
      doc.qdrantCollection,
      history
    );

    // Save assistant message with citations
    const assistantMsg = await Message.create({
      conversation: conversation._id,
      role: 'assistant',
      content: answer,
      citations,
      expiresAt,
    });

    // Update conversation timestamp
    conversation.lastMessageAt = new Date();
    await conversation.save();

    return res.status(200).json({
      success: true,
      response: answer,
      citations,
      messageId: assistantMsg._id,
      timestamp: assistantMsg.createdAt,
    });

  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      response: 'I encountered an error processing your query. Please try again.',
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/chat/conversations
//
// Retrieve all active conversations for the logged-in user to populate the sidebar.
// ─────────────────────────────────────────────────────────────────────────────
export const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      user: req.user.id,
      expiresAt: { $gt: new Date() },
    })
      .populate('document', 'filename status storageUrl')
      .sort({ lastMessageAt: -1 });

    return res.status(200).json({
      success: true,
      conversations,
    });
  } catch (error) {
    console.error('Fetch conversations error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch conversations.',
    });
  }
};