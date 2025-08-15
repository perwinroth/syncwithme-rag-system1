import { TravelIntent, RAGQueryRequest, RAGQueryResponse, Venue } from '../types';
export declare class DualRAGSystem {
    private openai;
    private vectorStore;
    private intentExtractor;
    constructor();
    initialize(): Promise<void>;
    query(request: RAGQueryRequest): Promise<RAGQueryResponse>;
    private generateRecommendations;
    private generateContextualResponse;
    private generateFallbackRecommendations;
    private deduplicateVenues;
    private calculateOverallConfidence;
    private calculateRecommendationConfidence;
    private getBudgetRange;
    learnFromBooking(query: string, intent: TravelIntent, bookedVenue: Venue, userSatisfaction: number): Promise<void>;
    getSystemStats(): Promise<{
        vectorStore: any;
        config: {
            confidenceThreshold: number;
            topK: number;
            model: string;
        };
    }>;
}
//# sourceMappingURL=dual-rag-system.d.ts.map