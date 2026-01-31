import express from 'express';
import multer from 'multer';
import { uploadFiles } from '../controllers/uploadController.js';

const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /pdf|txt|doc|docx|md/;
        const extname = allowedTypes.test(file.originalname.toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'application/pdf';

        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Only document files are allowed'));
        }
    }
});

router.post('/', upload.array('files', 10), uploadFiles);

export default router;