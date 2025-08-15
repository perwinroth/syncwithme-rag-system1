export declare const CONFIG: {
    pinecone: {
        apiKey: string;
        environment: string;
        indexName: string;
    };
    openai: {
        apiKey: string;
        model: string;
        embeddingModel: string;
        embeddingDimensions: number;
    };
    blob: {
        token: string;
    };
    database: {
        url: string;
    };
    server: {
        port: number;
        nodeEnv: string;
    };
    rag: {
        maxTokens: number;
        temperature: number;
        topK: number;
        confidenceThreshold: number;
        maxRetries: number;
        dualMode: boolean;
    };
};
//# sourceMappingURL=index.d.ts.map