"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntentExtractor = void 0;
const openai_1 = require("openai");
const config_1 = require("../config");
class IntentExtractor {
    constructor(vectorStore) {
        this.openai = new openai_1.OpenAI({
            apiKey: config_1.CONFIG.openai.apiKey
        });
        this.vectorStore = vectorStore;
    }
    async extractIntent(userMessage) {
        console.log('🧠 Extracting intent from:', userMessage.slice(0, 100) + '...');
        // First, query language patterns for similar expressions
        const languagePatterns = await this.vectorStore.queryLanguagePatterns(userMessage);
        // Use both AI and pattern matching for robust extraction
        const aiIntent = await this.extractWithAI(userMessage);
        const patternIntent = this.extractFromPatterns(userMessage, languagePatterns);
        // Merge and validate
        const mergedIntent = this.mergeIntents(aiIntent, patternIntent, userMessage);
        console.log('🎯 Extracted intent:', {
            destination: mergedIntent.destination,
            interests: mergedIntent.interests,
            budgetTier: mergedIntent.budgetTier,
            confidence: mergedIntent.confidence
        });
        return mergedIntent;
    }
    async extractWithAI(userMessage) {
        const prompt = `
Extract travel intent from this message. Return JSON only:

Message: "${userMessage}"

Extract:
{
  "destination": "city/country name or null",
  "dates": {"start": "YYYY-MM-DD", "end": "YYYY-MM-DD"} or null,
  "interests": ["array", "of", "interests"],
  "budgetTier": "low|medium|high|luxury",
  "groupType": "solo|couple|friends|family", 
  "pace": "relaxed|moderate|intensive",
  "confidence": 0.0-1.0
}

Budget indicators:
- "broke", "budget", "cheap" = low
- "reasonable", "moderate" = medium  
- "nice", "good" = high
- "luxury", "best", "splurge" = luxury

Group indicators:
- "I", "me", "solo" = solo
- "we", "my partner", "couple" = couple
- "friends", "group", "us" = friends
- "family", "kids", "children" = family
`;
        try {
            const response = await this.openai.chat.completions.create({
                model: config_1.CONFIG.openai.model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
                max_tokens: 500
            });
            const content = response.choices[0]?.message?.content;
            if (!content)
                throw new Error('No AI response');
            return JSON.parse(content);
        }
        catch (error) {
            console.warn('⚠️ AI intent extraction failed:', error);
            return { confidence: 0.3 };
        }
    }
    extractFromPatterns(userMessage, patterns) {
        const message = userMessage.toLowerCase();
        let confidence = 0;
        const extracted = {};
        for (const pattern of patterns) {
            if (pattern.type !== 'language_pattern')
                continue;
            const langPattern = pattern.content;
            // Check if any phrases match
            const matchingPhrases = langPattern.phrases.filter(phrase => message.includes(phrase.toLowerCase()));
            if (matchingPhrases.length > 0) {
                confidence = Math.max(confidence, pattern.confidence);
                // Apply mappings
                if (langPattern.mapsTo.budgetTier) {
                    extracted.budgetTier = langPattern.mapsTo.budgetTier;
                }
                if (langPattern.mapsTo.interests) {
                    extracted.interests = [...(extracted.interests || []), ...langPattern.mapsTo.interests];
                }
                if (langPattern.mapsTo.pace) {
                    extracted.pace = langPattern.mapsTo.pace;
                }
                if (langPattern.mapsTo.groupType) {
                    extracted.groupType = langPattern.mapsTo.groupType;
                }
            }
        }
        return { ...extracted, confidence };
    }
    mergeIntents(aiIntent, patternIntent, originalText) {
        // Use highest confidence values, with AI as fallback
        const merged = {
            destination: aiIntent.destination || '',
            dates: aiIntent.dates,
            interests: this.mergeArrays(aiIntent.interests, patternIntent.interests),
            budgetTier: patternIntent.budgetTier || aiIntent.budgetTier || 'medium',
            groupType: patternIntent.groupType || aiIntent.groupType || 'solo',
            pace: patternIntent.pace || aiIntent.pace || 'moderate',
            originalText,
            confidence: Math.max(aiIntent.confidence || 0, patternIntent.confidence || 0, 0.5 // Minimum baseline
            )
        };
        return merged;
    }
    mergeArrays(arr1, arr2) {
        const combined = [...(arr1 || []), ...(arr2 || [])];
        return [...new Set(combined)]; // Remove duplicates
    }
    // Learn from successful extractions
    async learnFromInteraction(userMessage, extractedIntent, userFeedback) {
        if (!userFeedback)
            return;
        // Create new language patterns from corrections
        const newPatterns = [];
        if (userFeedback.correctBudget && userFeedback.correctBudget !== extractedIntent.budgetTier) {
            // Learn budget expressions
            const budgetPhrases = this.extractBudgetPhrases(userMessage);
            if (budgetPhrases.length > 0) {
                newPatterns.push({
                    id: `budget_${Date.now()}`,
                    intent: 'budget_expression',
                    phrases: budgetPhrases,
                    confidence: 0.8,
                    mapsTo: { budgetTier: userFeedback.correctBudget },
                    examples: [userMessage]
                });
            }
        }
        // Add to vector store for future use
        if (newPatterns.length > 0) {
            await this.vectorStore.upsertLanguagePatterns(newPatterns);
            console.log('📚 Learned new language patterns:', newPatterns.length);
        }
    }
    extractBudgetPhrases(message) {
        // Extract potential budget-related phrases
        const words = message.toLowerCase().split(/\s+/);
        const budgetKeywords = ['budget', 'cheap', 'expensive', 'affordable', 'luxury', 'broke', 'money'];
        const phrases = [];
        for (let i = 0; i < words.length; i++) {
            if (budgetKeywords.some(keyword => words[i].includes(keyword))) {
                // Get surrounding context (2 words before and after)
                const start = Math.max(0, i - 2);
                const end = Math.min(words.length, i + 3);
                phrases.push(words.slice(start, end).join(' '));
            }
        }
        return phrases;
    }
}
exports.IntentExtractor = IntentExtractor;
//# sourceMappingURL=intent-extractor.js.map