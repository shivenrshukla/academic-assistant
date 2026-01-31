import { processDocument } from '../services/processDocument.js';
import { addToVectorStore } from '../services/vectorStore.js';

export const uploadFiles = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                error: 'No files uploaded'
            });
        }

        const processedDocs = [];

        for (const file of req.files) {
            const content = await processDocument(file.path, file.mimetype);
            await addToVectorStore(content, file.originalname);

            processedDocs.push({
                name: file.originalname,
                size: file.size, 
                type: file.mimetype,
                path: file.path
            });
        }

        return res.status(200).json({
            success: true,
            files: processedDocs,
            message: `${processedDocs.length} document(s) processed and indexed`
        });
    } catch (error) {
        console.error('Upload error:', error);
        return res.status(500).json({ 
            error: 'Failed to process documents',
            message: error.message 
        });
    }
}