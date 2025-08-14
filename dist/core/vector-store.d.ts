import { SuccessPattern, LanguagePattern, RAGResult } from '../types';
export declare class CloudVectorStore {
    private pinecone;
    private embeddings;
    private index;
    constructor();
    initialize(): Promise<void>;
    upsertSuccessPatterns(patterns: SuccessPattern[]): Promise<void>;
    upsertLanguagePatterns(patterns: LanguagePattern[]): Promise<void>;
    querySuccessPatterns(query: string, filters?: {
        destination?: string;
        budgetTier?: string;
        category?: string;
    }): Promise<RAGResult[]>;
    queryLanguagePatterns(query: string): Promise<RAGResult[]>;
    private createSearchText;
    private parseSuccessPattern;
    private parseLanguagePattern;
    getStats(): Promise<any>;
}
//# sourceMappingURL=vector-store.d.ts.map