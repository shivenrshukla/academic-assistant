import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import ChatRoutes from './routes/chat.js';
import uploadRoutes from './routes/upload.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/chat', ChatRoutes);
app.use('/api/upload', uploadRoutes);

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'online', timestamp: new Date().toISOString() })
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📚 Academic Assistant Backend initialized`);
})