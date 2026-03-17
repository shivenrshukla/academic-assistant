// routes/chat.js
// FIX: Auth middleware was missing — req.user.id would be undefined on every request.
import express from 'express';
import { runQuery, initSession, getConversations, renameConversation } from '../controllers/chatController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All chat routes require authentication
router.use(protect);

// GET /api/chat/conversations
// Fetch all conversations for the user
router.get('/conversations', getConversations);

// GET /api/chat/session/:conversationId
// Called when user opens a chat — verifies embeddings are loaded, returns history
router.get('/session/:conversationId', initSession);

// POST /api/chat
// Send a query within an existing conversation
router.post('/', runQuery);

// PUT /api/chat/conversations/:conversationId
// Rename a conversation
router.put('/conversations/:conversationId', renameConversation);

export default router;