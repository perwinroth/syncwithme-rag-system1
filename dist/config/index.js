"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIG = void 0;
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
exports.CONFIG = {
    // Pinecone
    pinecone: {
        apiKey: process.env.PINECONE_API_KEY,
        environment: process.env.PINECONE_ENVIRONMENT,
        indexName: (process.env.PINECONE_INDEX_NAME || 'syncwithme-travel-rag').trim()
    },
    // OpenAI
    openai: {
        apiKey: process.env.OPENAI_API_KEY,
        model: 'gpt-4',
        embeddingModel: 'text-embedding-3-large', // Supports up to 3072 dimensions
        embeddingDimensions: 2048 // Match your Pinecone index
    },
    // Vercel Blob
    blob: {
        token: process.env.BLOB_READ_WRITE_TOKEN
    },
    // Database
    database: {
        url: process.env.DATABASE_URL
    },
    // Server
    server: {
        port: parseInt(process.env.PORT || '3001'),
        nodeEnv: process.env.NODE_ENV || 'development'
    },
    // RAG Configuration
    rag: {
        maxTokens: 4000,
        temperature: 0.1,
        topK: 10,
        confidenceThreshold: 0.6, // Lowered to capture more results (scores are ~0.66)
        maxRetries: 3,
        dualMode: true
    }
};
// Validation
const requiredEnvVars = [
    'PINECONE_API_KEY',
    'OPENAI_API_KEY'
];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
    }
}
//# sourceMappingURL=index.js.map