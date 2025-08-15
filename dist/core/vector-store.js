"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudVectorStore = void 0;
const pinecone_1 = require("@pinecone-database/pinecone");
const openai_1 = require("@langchain/openai");
const config_1 = require("../config");
class CloudVectorStore {
    constructor() {
        this.pinecone = new pinecone_1.Pinecone({
            apiKey: config_1.CONFIG.pinecone.apiKey
        });
        this.embeddings = new openai_1.OpenAIEmbeddings({
            openAIApiKey: config_1.CONFIG.openai.apiKey,
            modelName: config_1.CONFIG.openai.embeddingModel,
            dimensions: config_1.CONFIG.openai.embeddingDimensions
        });
    }
    async initialize() {
        try {
            // Get index (lightweight operation)
            this.index = this.pinecone.Index(config_1.CONFIG.pinecone.indexName);
            console.log('✅ Vector store connected to index:', config_1.CONFIG.pinecone.indexName);
        }
        catch (error) {
            console.error('❌ Vector store initialization failed:', error);
            throw error;
        }
    }
    async upsertSuccessPatterns(patterns) {
        console.log(`📊 Upserting ${patterns.length} success patterns...`);
        const vectors = await Promise.all(patterns.map(async (pattern) => {
            // Create searchable text for embedding
            const searchText = this.createSearchText(pattern);
            const embedding = await this.embeddings.embedQuery(searchText);
            return {
                id: `success_${pattern.id}`,
                values: embedding,
                metadata: {
                    type: 'success_pattern',
                    destination: pattern.destination,
                    category: pattern.category,
                    budgetTier: pattern.budgetTier,
                    successRate: pattern.successRate,
                    userSatisfaction: pattern.userSatisfaction,
                    venues: JSON.stringify(pattern.venues),
                    searchText,
                    ...pattern.metadata
                }
            };
        }));
        // Batch upsert
        const batchSize = 100;
        for (let i = 0; i < vectors.length; i += batchSize) {
            const batch = vectors.slice(i, i + batchSize);
            await this.index.upsert(batch);
        }
        console.log('✅ Success patterns upserted');
    }
    async upsertLanguagePatterns(patterns) {
        console.log(`💬 Upserting ${patterns.length} language patterns...`);
        const vectors = await Promise.all(patterns.map(async (pattern) => {
            // Create searchable text from phrases or userQuery
            const searchText = pattern.phrases ? pattern.phrases.join(' | ') : pattern.userQuery || '';
            const embedding = await this.embeddings.embedQuery(searchText);
            return {
                id: `language_${pattern.id}`,
                values: embedding,
                metadata: {
                    type: 'language_pattern',
                    intent: pattern.intent,
                    confidence: pattern.confidence,
                    phrases: JSON.stringify(pattern.phrases),
                    mapsTo: JSON.stringify(pattern.mapsTo),
                    searchText
                }
            };
        }));
        // Batch upsert
        const batchSize = 100;
        for (let i = 0; i < vectors.length; i += batchSize) {
            const batch = vectors.slice(i, i + batchSize);
            await this.index.upsert(batch);
        }
        console.log('✅ Language patterns upserted');
    }
    async querySuccessPatterns(query, filters = {}) {
        const embedding = await this.embeddings.embedQuery(query);
        const filterConditions = {
            type: { $eq: 'success_pattern' }
        };
        if (filters.destination) {
            filterConditions.destination = { $eq: filters.destination.toLowerCase() };
        }
        if (filters.budgetTier) {
            filterConditions.budgetTier = { $eq: filters.budgetTier };
        }
        if (filters.category) {
            filterConditions.category = { $eq: filters.category };
        }
        const results = await this.index.query({
            vector: embedding,
            topK: config_1.CONFIG.rag.topK,
            includeMetadata: true,
            filter: filterConditions
        });
        return results.matches
            .filter((match) => match.score >= config_1.CONFIG.rag.confidenceThreshold)
            .map((match) => ({
            type: 'success_pattern',
            content: this.parseSuccessPattern(match.metadata),
            confidence: match.score,
            source: match.metadata.source || 'unknown'
        }));
    }
    async queryLanguagePatterns(query) {
        const embedding = await this.embeddings.embedQuery(query);
        const results = await this.index.query({
            vector: embedding,
            topK: 5,
            includeMetadata: true,
            filter: {
                type: { $eq: 'language_pattern' }
            }
        });
        return results.matches
            .filter((match) => match.score >= 0.6) // Lower threshold for language
            .map((match) => ({
            type: 'language_pattern',
            content: this.parseLanguagePattern(match.metadata),
            confidence: match.score,
            source: 'language_corpus'
        }));
    }
    createSearchText(pattern) {
        const venues = pattern.venues || [];
        const venueNames = venues.map(v => v.name).join(' ');
        const venueTypes = venues.map(v => v.type).join(' ');
        const insights = pattern.metadata.localInsights?.join(' ') || '';
        return `${pattern.destination} ${pattern.category || ''} ${venueNames} ${venueTypes} ${insights} ${pattern.budgetTier || ''}`;
    }
    parseSuccessPattern(metadata) {
        return {
            id: metadata.id,
            destination: metadata.destination,
            category: metadata.category,
            venues: typeof metadata.venues === 'string' ? JSON.parse(metadata.venues || '[]') : metadata.venues || [],
            budgetTier: metadata.budgetTier,
            successRate: metadata.successRate || 0,
            userSatisfaction: metadata.userSatisfaction || 0,
            metadata: {
                source: metadata.source,
                lastUpdated: metadata.lastUpdated,
                bookingPattern: metadata.bookingPattern || '',
                localInsights: typeof metadata.localInsights === 'string'
                    ? JSON.parse(metadata.localInsights || '[]')
                    : metadata.localInsights || []
            }
        };
    }
    parseLanguagePattern(metadata) {
        return {
            id: metadata.id,
            intent: metadata.intent,
            phrases: JSON.parse(metadata.phrases || '[]'),
            confidence: metadata.confidence || 0,
            mapsTo: JSON.parse(metadata.mapsTo || '{}'),
            examples: []
        };
    }
    async getStats() {
        return await this.index.describeIndexStats();
    }
}
exports.CloudVectorStore = CloudVectorStore;
//# sourceMappingURL=vector-store.js.map