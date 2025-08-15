"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
exports.startServer = startServer;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const config_1 = require("../config");
const dual_rag_system_1 = require("../core/dual-rag-system");
const app = (0, express_1.default)();
exports.app = app;
const ragSystem = new dual_rag_system_1.DualRAGSystem();
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://syncwithme.vercel.app', 'https://your-frontend-domain.com']
        : ['http://localhost:3000', 'http://localhost:3003']
}));
app.use(express_1.default.json({ limit: '10mb' }));
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});
// RAG Query Endpoint
app.post('/api/rag/query', async (req, res) => {
    try {
        const request = req.body;
        if (!request.userMessage) {
            return res.status(400).json({
                error: 'userMessage is required'
            });
        }
        console.log('🔍 RAG Query:', {
            message: request.userMessage.slice(0, 100) + '...',
            hasContext: !!request.context,
            tripId: request.context?.tripId
        });
        const response = await ragSystem.query(request);
        res.json(response);
    }
    catch (error) {
        console.error('❌ RAG query error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Get system statistics
app.get('/api/rag/stats', async (req, res) => {
    try {
        const stats = await ragSystem.getSystemStats();
        res.json(stats);
    }
    catch (error) {
        console.error('❌ Stats error:', error);
        res.status(500).json({
            error: 'Failed to get stats'
        });
    }
});
// Learning endpoint - for feedback
app.post('/api/rag/learn', async (req, res) => {
    try {
        const { query, intent, bookedVenue, userSatisfaction } = req.body;
        await ragSystem.learnFromBooking(query, intent, bookedVenue, userSatisfaction);
        res.json({ success: true });
    }
    catch (error) {
        console.error('❌ Learning error:', error);
        res.status(500).json({
            error: 'Failed to process learning data'
        });
    }
});
// Test endpoint for development
app.post('/api/rag/test', async (req, res) => {
    if (config_1.CONFIG.server.nodeEnv !== 'development') {
        return res.status(404).json({ error: 'Not found' });
    }
    try {
        const testQueries = [
            'looking for techno clubs in berlin, we\'re broke students',
            'want to see art museums in paris with my partner, budget around €800',
            'obsessed with ramen in tokyo, solo travel, authentic spots only'
        ];
        const results = [];
        for (const query of testQueries) {
            const response = await ragSystem.query({ userMessage: query });
            results.push({
                query,
                confidence: response.confidence,
                venues: response.recommendations.venues.length,
                intent: response.intent
            });
        }
        res.json({
            testResults: results,
            summary: {
                avgConfidence: results.reduce((sum, r) => sum + r.confidence, 0) / results.length,
                totalVenues: results.reduce((sum, r) => sum + r.venues, 0)
            }
        });
    }
    catch (error) {
        console.error('❌ Test error:', error);
        res.status(500).json({
            error: 'Test failed'
        });
    }
});
// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: config_1.CONFIG.server.nodeEnv === 'development' ? error.message : 'Something went wrong'
    });
});
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found'
    });
});
async function startServer() {
    try {
        console.log('🚀 Starting RAG System server...');
        // Initialize RAG system
        await ragSystem.initialize();
        // Start server
        const server = app.listen(config_1.CONFIG.server.port, () => {
            console.log(`✅ RAG System running on port ${config_1.CONFIG.server.port}`);
            console.log(`🌍 Environment: ${config_1.CONFIG.server.nodeEnv}`);
            console.log(`📊 Health check: http://localhost:${config_1.CONFIG.server.port}/health`);
        });
        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('Received SIGTERM, shutting down gracefully...');
            server.close(() => {
                console.log('Server closed');
                process.exit(0);
            });
        });
        return server;
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}
// Start server if called directly
if (require.main === module) {
    startServer();
}
//# sourceMappingURL=server.js.map