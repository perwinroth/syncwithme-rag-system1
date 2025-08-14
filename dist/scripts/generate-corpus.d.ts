#!/usr/bin/env tsx
/**
 * Generate 10,000+ activity-planning conversations for RAG training
 * Based on user's specifications for real + synthetic data
 */
declare function generateBatch(batchNumber: number, entriesPerBatch?: number): Promise<string>;
declare function downloadOpenDatasets(): Promise<never[]>;
export { generateBatch, downloadOpenDatasets };
//# sourceMappingURL=generate-corpus.d.ts.map