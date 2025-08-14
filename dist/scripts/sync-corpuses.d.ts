export declare class CorpusSync {
    private vectorStore;
    private processor;
    constructor();
    syncAll(): Promise<void>;
    private syncSuccessPatterns;
    private syncLanguagePatterns;
    validateSync(): Promise<boolean>;
}
//# sourceMappingURL=sync-corpuses.d.ts.map