import { TravelIntent } from '../types';
import { CloudVectorStore } from './vector-store';
export declare class IntentExtractor {
    private openai;
    private vectorStore;
    constructor(vectorStore: CloudVectorStore);
    extractIntent(userMessage: string): Promise<TravelIntent>;
    private extractWithAI;
    private extractFromPatterns;
    private mergeIntents;
    private mergeArrays;
    learnFromInteraction(userMessage: string, extractedIntent: TravelIntent, userFeedback: {
        correctDestination?: string;
        correctInterests?: string[];
        correctBudget?: string;
    }): Promise<void>;
    private extractBudgetPhrases;
}
//# sourceMappingURL=intent-extractor.d.ts.map