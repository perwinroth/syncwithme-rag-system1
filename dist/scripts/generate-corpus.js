#!/usr/bin/env tsx
"use strict";
/**
 * Generate 10,000+ activity-planning conversations for RAG training
 * Based on user's specifications for real + synthetic data
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateBatch = generateBatch;
exports.downloadOpenDatasets = downloadOpenDatasets;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const openai_1 = require("openai");
const config_1 = require("../config");
const openai = new openai_1.OpenAI({
    apiKey: config_1.CONFIG.openai.apiKey
});
const SYSTEM_PROMPT = `You are generating a license-free synthetic dataset for RAG training.

Output format: JSON Lines (one JSON object per line). Do NOT include code fences or extra prose.

Each line must follow:
{
  "query": "<natural user request planning an activity>",
  "context": "<brief grounding, generic facts (no brand claims), neutral and plausible>",
  "response": "<helpful, stepwise, safety-conscious plan with SPECIFIC venues, addresses, prices>",
  "metadata": {
    "activity_types": ["one-or-more, e.g., kayaking, concert, museum"],
    "location": "<city, region, country, or 'local'>",
    "is_local": <true|false>,
    "season": "any|spring|summer|autumn|winter",
    "budget": "low|medium|high|any",
    "language": "en|sv",
    "tags": ["family","date-night","rainy-day","wheelchair-accessible","solo","group","kids","last-minute","out-of-town","local"]
  }
}

Content rules:
- Include SPECIFIC venue names, addresses, and prices (e.g., "Berghain, Am Wriezener Bahnhof, €20")
- Mix global travel and local-in-city phrasing, English and Swedish (about 20% Swedish)
- Cover many activities: movies, concerts, theatre, museums, galleries, food tours, restaurants, wine/beer tastings, hiking, cycling, kayaking, boat tours, escape rooms, comedy, festivals, sports games, classes, street art tours, etc.
- Vary constraints (date, time, budget, accessibility, family/kids)
- Keep context < 280 chars and response < 420 chars
- No URLs, emails, phone numbers, or real-time claims
- One JSON object per line. No blank lines.
- Focus on patterns like "broke students [city] [activity]" that return specific venues`;
async function generateBatch(batchNumber, entriesPerBatch = 500) {
    console.log(`🤖 Generating batch ${batchNumber} (${entriesPerBatch} entries)...`);
    const userPrompt = `Generate ${entriesPerBatch} JSONL lines that satisfy the schema and rules. 
  Ensure diverse activities, locations (worldwide), and tags. 
  Batch ${batchNumber}: Focus on ${batchNumber % 3 === 0 ? 'budget/student' : batchNumber % 3 === 1 ? 'family/group' : 'premium/date'} scenarios.
  Include specific venue names, addresses, and price ranges for ALL recommendations.`;
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: userPrompt }
            ],
            max_tokens: 4096,
            temperature: 0.9
        });
        const content = response.choices[0].message.content || '';
        // Validate JSONL format
        const lines = content.split('\n').filter(line => line.trim());
        const validLines = lines.filter(line => {
            try {
                JSON.parse(line);
                return true;
            }
            catch {
                return false;
            }
        });
        console.log(`✅ Batch ${batchNumber}: ${validLines.length} valid entries generated`);
        return validLines.join('\n');
    }
    catch (error) {
        console.error(`❌ Error generating batch ${batchNumber}:`, error);
        return '';
    }
}
async function downloadOpenDatasets() {
    console.log('📥 Downloading open datasets...');
    // URLs for open datasets
    const datasets = [
        {
            name: 'Taskmaster-1',
            url: 'https://github.com/google-research-datasets/Taskmaster/raw/master/TM-1-2019/data.json',
            filter: (item) => item.domain === 'travel' || item.domain === 'movie'
        },
        {
            name: 'Schema-Guided Dialogue',
            url: 'https://github.com/google-research-datasets/dstc8-schema-guided-dialogue/raw/master/train/dialogues_001.json',
            filter: (item) => true
        }
    ];
    // For now, return placeholder
    console.log('📊 Open datasets would be downloaded and processed here');
    return [];
}
async function main() {
    const outputDir = path_1.default.join(process.cwd(), 'data', 'corpus');
    const outputFile = path_1.default.join(outputDir, 'activities_rag_10k.jsonl');
    // Create directory if it doesn't exist
    if (!fs_1.default.existsSync(outputDir)) {
        fs_1.default.mkdirSync(outputDir, { recursive: true });
    }
    console.log('🚀 Starting corpus generation...');
    console.log(`📁 Output: ${outputFile}`);
    // Clear existing file
    fs_1.default.writeFileSync(outputFile, '');
    // Generate synthetic data in batches
    const TOTAL_BATCHES = 20;
    const ENTRIES_PER_BATCH = 500;
    for (let i = 1; i <= TOTAL_BATCHES; i++) {
        const batchContent = await generateBatch(i, ENTRIES_PER_BATCH);
        if (batchContent) {
            fs_1.default.appendFileSync(outputFile, batchContent + '\n');
        }
        // Rate limiting
        if (i < TOTAL_BATCHES) {
            console.log('⏳ Waiting 2 seconds before next batch...');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    // Count total entries
    const finalContent = fs_1.default.readFileSync(outputFile, 'utf-8');
    const totalEntries = finalContent.split('\n').filter(line => line.trim()).length;
    console.log('✅ Corpus generation complete!');
    console.log(`📊 Total entries: ${totalEntries}`);
    console.log(`📁 Saved to: ${outputFile}`);
    // Sample output
    const samples = finalContent.split('\n').filter(line => line.trim()).slice(0, 3);
    console.log('\n📝 Sample entries:');
    samples.forEach((sample, i) => {
        const entry = JSON.parse(sample);
        console.log(`\n${i + 1}. Query: "${entry.query}"`);
        console.log(`   Response: "${entry.response.substring(0, 100)}..."`);
        console.log(`   Location: ${entry.metadata.location}, Budget: ${entry.metadata.budget}`);
    });
}
// Run if executed directly
if (require.main === module) {
    main().catch(console.error);
}
//# sourceMappingURL=generate-corpus.js.map