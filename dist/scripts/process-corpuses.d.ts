import { SuccessPattern, LanguagePattern } from '../types';
export declare class CorpusProcessor {
    processSuccessPatterns(): Promise<SuccessPattern[]>;
    processLanguagePatterns(): Promise<LanguagePattern[]>;
    saveProcessedData(successPatterns: SuccessPattern[], languagePatterns: LanguagePattern[]): Promise<void>;
}
//# sourceMappingURL=process-corpuses.d.ts.map