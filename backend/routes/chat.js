// routes/chat.js
// FIX: Auth middleware was missing — req.user.id would be undefined on every request.
import express from 'express';
import { runQuery, initSession } from '../controllers/chatController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All chat routes require authentication
router.use(protect);

// GET /api/chat/session/:documentId
// Called when user opens a chat — verifies embeddings are loaded, returns history
router.get('/session/:documentId', initSession);

// POST /api/chat
// Send a query within an existing conversation
router.post('/', runQuery);

export default router;