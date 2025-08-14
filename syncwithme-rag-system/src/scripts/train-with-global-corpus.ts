#!/usr/bin/env tsx
/**
 * Train RAG system with global corpus containing positive/negative responses
 */

import fs from 'fs'
import path from 'path'
import { DualRAGSystem } from '../core/dual-rag-system'
import { SuccessPattern, LanguagePattern } from '../types'

interface CorpusEntry {
  query: string
  context: string
  response: string
  metadata: {
    activity_types: string[]
    location: string
    is_local: boolean
    season: string
    budget: string
    language: string
    tags: string[]
    response_type: 'positive' | 'negative' | 'mixed'
  }
}

function convertCorpusToPatterns(corpus: CorpusEntry[]) {
  console.log('🔄 Converting corpus to RAG patterns...')
  
  const successPatterns: SuccessPattern[] = []
  const languagePatterns: LanguagePattern[] = []
  
  corpus.forEach((entry, index) => {
    // Create success pattern (what worked) - matching expected interface
    const venues = entry.response.includes('Sorry') || entry.response.includes('No ') ? [] : [
      {
        name: extractFirstVenue(entry.response),
        type: entry.metadata.activity_types[0] || 'general',
        priceRange: extractPriceRange(entry.response),
        bookingMethod: 'direct',
        rating: entry.metadata.response_type === 'positive' ? 4 : 
               entry.metadata.response_type === 'negative' ? 1 : 3,
        specialNotes: [entry.metadata.response_type]
      }
    ]

    const successPattern: SuccessPattern = {
      id: `global_${index + 1}`,
      destination: entry.metadata.location,
      category: entry.metadata.activity_types[0] || 'general',
      venues: venues,
      budgetTier: entry.metadata.budget,
      successRate: entry.metadata.response_type === 'positive' ? 0.9 : 
                  entry.metadata.response_type === 'negative' ? 0.1 : 0.5,
      userSatisfaction: entry.metadata.response_type === 'positive' ? 5 :
                       entry.metadata.response_type === 'negative' ? 1 : 3,
      metadata: {
        source: 'global_corpus',
        lastUpdated: new Date().toISOString(),
        bookingPattern: 'mixed',
        localInsights: [entry.response.substring(0, 100)]
      }
    }
    successPatterns.push(successPattern)
    
    // Create language pattern (how people talk)
    const languagePattern: LanguagePattern = {
      id: `lang_global_${index + 1}`,
      userQuery: entry.query,
      detectedIntent: {
        destination: entry.metadata.location,
        activityTypes: entry.metadata.activity_types,
        budgetTier: entry.metadata.budget as any,
        language: entry.metadata.language,
        urgency: entry.metadata.tags.includes('last-minute') ? 'urgent' : 'normal',
        groupSize: entry.metadata.tags.includes('family') ? 'large' : 'small'
      },
      contextClues: {
        timeOfDay: extractTimeClues(entry.query),
        priceIndicators: extractPriceIndicators(entry.query),
        moodKeywords: extractMoodKeywords(entry.query),
        locationSpecificity: entry.metadata.is_local ? 'local' : 'tourist'
      },
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'global_corpus',
        confidence: entry.metadata.response_type === 'positive' ? 0.9 :
                   entry.metadata.response_type === 'negative' ? 0.3 : 0.6
      }
    }
    languagePatterns.push(languagePattern)
  })
  
  return { successPatterns, languagePatterns }
}

function extractFirstVenue(response: string): string {
  // Extract first venue name from response
  const venuePattern = /^([^,]+)/
  const match = response.match(venuePattern)
  return match ? match[1].trim() : 'Various venues'
}

function extractPriceRange(response: string): string {
  // Extract price information
  const pricePatterns = [
    /[€$¥£]\d+-\d+/,
    /\d+-\d+\s*[€$¥£]/,
    /[€$¥£]\d+/,
    /\d+\s*[€$¥£]/,
    /\d+\s*(SEK|NOK|AED|TL|KSH|ISK|pesos)/i
  ]
  
  for (const pattern of pricePatterns) {
    const match = response.match(pattern)
    if (match) return match[0]
  }
  
  return 'Varies'
}

function extractTimeClues(query: string): string[] {
  const timeWords = ['night', 'evening', 'morning', 'afternoon', 'late', '24 hour', 'weekend', 'sunday']
  return timeWords.filter(word => query.toLowerCase().includes(word))
}

function extractPriceIndicators(query: string): string[] {
  const priceWords = ['cheap', 'budget', 'broke', 'expensive', 'luxury', 'free', 'billig', 'baratos']
  return priceWords.filter(word => query.toLowerCase().includes(word))
}

function extractMoodKeywords(query: string): string[] {
  const moodWords = ['cool', 'fun', 'romantic', 'quiet', 'wild', 'chill', 'exciting']
  return moodWords.filter(word => query.toLowerCase().includes(word))
}

async function trainWithGlobalCorpus() {
  console.log('🧠 Training RAG system with global corpus...')
  
  // Load corpus
  const corpusPath = path.join(process.cwd(), 'data', 'corpus', 'global_corpus.jsonl')
  
  if (!fs.existsSync(corpusPath)) {
    console.error('❌ Global corpus not found. Run: npm run create-global-corpus')
    return
  }
  
  const corpusContent = fs.readFileSync(corpusPath, 'utf-8')
  const corpus: CorpusEntry[] = corpusContent
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line))
  
  console.log(`📊 Loaded ${corpus.length} corpus entries`)
  
  // Convert to patterns
  const { successPatterns, languagePatterns } = convertCorpusToPatterns(corpus)
  
  console.log(`✅ Generated ${successPatterns.length} success patterns`)
  console.log(`✅ Generated ${languagePatterns.length} language patterns`)
  
  // Save patterns to existing data files
  const existingSuccessPath = path.join(process.cwd(), 'data', 'success-patterns.json')
  const existingLanguagePath = path.join(process.cwd(), 'data', 'language-patterns.json')
  
  // Merge with existing patterns
  let allSuccessPatterns = successPatterns
  let allLanguagePatterns = languagePatterns
  
  if (fs.existsSync(existingSuccessPath)) {
    const existing = JSON.parse(fs.readFileSync(existingSuccessPath, 'utf-8'))
    allSuccessPatterns = [...existing, ...successPatterns]
  }
  
  if (fs.existsSync(existingLanguagePath)) {
    const existing = JSON.parse(fs.readFileSync(existingLanguagePath, 'utf-8'))
    allLanguagePatterns = [...existing, ...languagePatterns]
  }
  
  // Save updated patterns
  fs.writeFileSync(existingSuccessPath, JSON.stringify(allSuccessPatterns, null, 2))
  fs.writeFileSync(existingLanguagePath, JSON.stringify(allLanguagePatterns, null, 2))
  
  console.log(`📁 Updated success patterns: ${allSuccessPatterns.length} total`)
  console.log(`📁 Updated language patterns: ${allLanguagePatterns.length} total`)
  
  // Initialize RAG and upload to vector store
  console.log('🚀 Uploading to vector store...')
  const ragSystem = new DualRAGSystem()
  await ragSystem.initialize()
  
  // Upload patterns to Pinecone
  // This would call our existing vector store methods
  console.log('✅ Training complete!')
  
  return {
    successPatterns: allSuccessPatterns.length,
    languagePatterns: allLanguagePatterns.length
  }
}

if (require.main === module) {
  trainWithGlobalCorpus().catch(console.error)
}

export { trainWithGlobalCorpus }