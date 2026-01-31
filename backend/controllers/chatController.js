import { processQuery } from '../services/ragService.js';

export const runQuery = async (req, res) => {
    try {
        const { query, context, files } = req.body;

        if (!query || !query.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Query is required',
                response: null
            });
        }

        const response = await processQuery(query, context, files);

        return res.status(200).json({
            success: true,
            response,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error("Chat error: ", error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            response: 'I apologize, but I encountered an error processing your query. Please try again.'
        });
    }
}