// routes/upload.js
// FIX 1: Switched from diskStorage → memoryStorage.
//         diskStorage gives file.path (no buffer). Firebase upload and
//         processDocument both need file.buffer — memoryStorage provides it.
//
// FIX 2: Auth middleware was missing — req.user.id would crash uploadController.
import express from 'express';
import multer from 'multer';
import { uploadFiles } from '../controllers/uploadController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// memoryStorage: files stored in memory as Buffer — no disk writes needed
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
    ];
    const allowedExts = /\.(pdf|doc|docx|txt|md)$/i;

    if (allowedMimes.includes(file.mimetype) && allowedExts.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, Word, TXT, and Markdown files are allowed.'));
    }
  },
});

// Protect then upload
router.post('/', protect, upload.array('files', 10), uploadFiles);

export default router;