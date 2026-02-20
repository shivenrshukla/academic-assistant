import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ChatRoutes from './routes/chat.js';
import uploadRoutes from './routes/upload.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const UPLOADS_DIR = path.join(__dirname, 'uploads');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/chat', ChatRoutes);
app.use('/api/upload', uploadRoutes);

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'online', timestamp: new Date().toISOString() });
});

// ── Cleanup ───────────────────────────────────────────────────────────────────
function clearUploads() {
    if (!fs.existsSync(UPLOADS_DIR)) return;

    const entries = fs.readdirSync(UPLOADS_DIR);
    for (const entry of entries) {
        const fullPath = path.join(UPLOADS_DIR, entry);
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log(`🗑️  Deleted: ${entry}`);
    }
    console.log('✅ Uploads folder cleared.');
}

function shutdown(signal) {
    console.log(`\n🔴 ${signal} received — cleaning up...`);
    clearUploads();
    process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));   // Ctrl-C
process.on('SIGTERM', () => shutdown('SIGTERM')); // Docker / PM2 stop
process.on('exit', clearUploads);                 // fallback for other exits

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📚 Academic Assistant Backend initialized`);
});