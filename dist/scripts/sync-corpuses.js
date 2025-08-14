"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CorpusSync = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const vector_store_1 = require("../core/vector-store");
const process_corpuses_1 = require("./process-corpuses");
class CorpusSync {
    constructor() {
        this.vectorStore = new vector_store_1.CloudVectorStore();
        this.processor = new process_corpuses_1.CorpusProcessor();
    }
    async syncAll() {
        console.log('🔄 Starting corpus sync to cloud vector store...');
        try {
            // Initialize vector store
            await this.vectorStore.initialize();
            // Ensure data directory exists
            const dataDir = (0, path_1.join)(process.cwd(), 'data');
            if (!(0, fs_1.existsSync)(dataDir)) {
                (0, fs_1.mkdirSync)(dataDir, { recursive: true });
            }
            // Process or load corpus data
            let successPatterns;
            let languagePatterns;
            const successPatternsPath = (0, path_1.join)(dataDir, 'success-patterns.json');
            const languagePatternsPath = (0, path_1.join)(dataDir, 'language-patterns.json');
            if ((0, fs_1.existsSync)(successPatternsPath) && (0, fs_1.existsSync)(languagePatternsPath)) {
                console.log('📂 Loading existing processed data...');
                successPatterns = JSON.parse((0, fs_1.readFileSync)(successPatternsPath, 'utf-8'));
                languagePatterns = JSON.parse((0, fs_1.readFileSync)(languagePatternsPath, 'utf-8'));
            }
            else {
                console.log('🔄 Processing raw corpus data...');
                successPatterns = await this.processor.processSuccessPatterns();
                languagePatterns = await this.processor.processLanguagePatterns();
                // Save for future use
                await this.processor.saveProcessedData(successPatterns, languagePatterns);
            }
            // Sync to vector store
            await this.syncSuccessPatterns(successPatterns);
            await this.syncLanguagePatterns(languagePatterns);
            // Get final stats
            const stats = await this.vectorStore.getStats();
            console.log('📊 Vector store stats:', stats);
            console.log('✅ Corpus sync completed successfully!');
        }
        catch (error) {
            console.error('❌ Corpus sync failed:', error);
            throw error;
        }
    }
    async syncSuccessPatterns(patterns) {
        console.log(`📊 Syncing ${patterns.length} success patterns...`);
        try {
            await this.vectorStore.upsertSuccessPatterns(patterns);
            console.log('✅ Success patterns synced');
        }
        catch (error) {
            console.error('❌ Failed to sync success patterns:', error);
            throw error;
        }
    }
    async syncLanguagePatterns(patterns) {
        console.log(`💬 Syncing ${patterns.length} language patterns...`);
        try {
            await this.vectorStore.upsertLanguagePatterns(patterns);
            console.log('✅ Language patterns synced');
        }
        catch (error) {
            console.error('❌ Failed to sync language patterns:', error);
            throw error;
        }
    }
    async validateSync() {
        console.log('🔍 Validating corpus sync...');
        try {
            await this.vectorStore.initialize();
            // Test queries to validate both corpuses
            const testQueries = [
                {
                    query: 'techno clubs berlin budget students',
                    expectSuccess: true,
                    expectLanguage: true
                },
                {
                    query: 'art museums paris couple',
                    expectSuccess: true,
                    expectLanguage: true
                },
                {
                    query: 'broke students need cheap',
                    expectSuccess: false,
                    expectLanguage: true
                }
            ];
            const results = [];
            for (const test of testQueries) {
                console.log(`Testing: "${test.query}"`);
                // Test success pattern retrieval
                const successResults = await this.vectorStore.querySuccessPatterns(test.query);
                const successFound = successResults.length > 0;
                // Test language pattern retrieval
                const languageResults = await this.vectorStore.queryLanguagePatterns(test.query);
                const languageFound = languageResults.length > 0;
                const result = {
                    query: test.query,
                    successPatternsFound: successFound,
                    languagePatternsFound: languageFound,
                    successExpected: test.expectSuccess,
                    languageExpected: test.expectLanguage,
                    passed: (successFound === test.expectSuccess) && (languageFound === test.expectLanguage)
                };
                results.push(result);
                console.log(`  Success patterns: ${successFound ? '✅' : '❌'} (expected: ${test.expectSuccess})`);
                console.log(`  Language patterns: ${languageFound ? '✅' : '❌'} (expected: ${test.expectLanguage})`);
                console.log(`  Overall: ${result.passed ? '✅ PASS' : '❌ FAIL'}`);
            }
            const allPassed = results.every(r => r.passed);
            console.log('\n📋 Validation Summary:');
            console.log(`Tests passed: ${results.filter(r => r.passed).length}/${results.length}`);
            console.log(`Overall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
            if (!allPassed) {
                const failed = results.filter(r => !r.passed);
                console.log('Failed tests:', failed);
            }
            return allPassed;
        }
        catch (error) {
            console.error('❌ Validation failed:', error);
            return false;
        }
    }
}
exports.CorpusSync = CorpusSync;
// CLI interface
async function main() {
    const command = process.argv[2];
    const sync = new CorpusSync();
    try {
        switch (command) {
            case 'sync':
                await sync.syncAll();
                break;
            case 'validate':
                const isValid = await sync.validateSync();
                process.exit(isValid ? 0 : 1);
                break;
            case 'sync-and-validate':
                await sync.syncAll();
                const isValidAfterSync = await sync.validateSync();
                process.exit(isValidAfterSync ? 0 : 1);
                break;
            default:
                console.log('Usage:');
                console.log('  npm run sync-corpuses sync           - Sync corpuses to vector store');
                console.log('  npm run sync-corpuses validate       - Validate existing sync');
                console.log('  npm run sync-corpuses sync-and-validate - Sync and then validate');
                process.exit(1);
        }
    }
    catch (error) {
        console.error('❌ Command failed:', error);
        process.exit(1);
    }
}
// Run if called directly
if (require.main === module) {
    main();
}
// CorpusSync class already exported above
//# sourceMappingURL=sync-corpuses.js.map