import express from 'express';
import { runQuery } from '../controllers/chatController.js';

const router = express.Router();

router.post('/', runQuery);

export default router;