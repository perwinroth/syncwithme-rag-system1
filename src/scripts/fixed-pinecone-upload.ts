#!/usr/bin/env tsx
/**
 * Fixed Pinecone Upload - Matches RAG System Format Exactly
 * Uses proper IDs, metadata structure, and search text format
 */

import { DualRAGSystem } from '../core/dual-rag-system'
import fs from 'fs'
import path from 'path'

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

async function fixedUpload() {
  console.log('🔧 Fixed upload - using RAG system format...')
  
  // Load the massive corpus
  const corpusPath = path.join(process.cwd(), 'data', 'corpus', 'massive_global_corpus_10k.jsonl')
  
  if (!fs.existsSync(corpusPath)) {
    console.error('❌ Massive corpus not found')
    return
  }
  
  const corpusContent = fs.readFileSync(corpusPath, 'utf-8')
  const corpus: CorpusEntry[] = corpusContent
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line))
  
  console.log(`📊 Converting ${corpus.length} entries to RAG format...`)
  
  // Convert to Success and Language patterns that match RAG system
  const { successPatterns, languagePatterns } = convertCorpusToRAGFormat(corpus)
  
  console.log(`✅ Generated ${successPatterns.length} success patterns`)
  console.log(`✅ Generated ${languagePatterns.length} language patterns`)
  
  // Initialize RAG system 
  console.log('🚀 Initializing RAG system...')
  const ragSystem = new DualRAGSystem()
  await ragSystem.initialize()
  
  // Clear existing vectors first (clean slate)
  console.log('🧹 Clearing existing vectors...')
  await clearPineconeIndex()
  
  // Upload success patterns using RAG system's own method
  console.log('📤 Uploading success patterns...')
  const vectorStore = (ragSystem as any).vectorStore
  await vectorStore.upsertSuccessPatterns(successPatterns)
  
  // Upload language patterns using RAG system's own method
  console.log('📤 Uploading language patterns...')
  await vectorStore.upsertLanguagePatterns(languagePatterns)
  
  // Test the upload
  console.log('🧪 Testing upload with RAG system...')
  const testQuery = "cheap techno clubs berlin broke students"
  const testResult = await ragSystem.query({ userMessage: testQuery })
  
  console.log('Test Result:', {
    destination: testResult.intent.destination,
    budgetTier: testResult.intent.budgetTier,
    firstVenue: testResult.recommendations.venues[0]?.name,
    confidence: testResult.confidence
  })
  
  if (testResult.recommendations.venues[0]?.name.includes('Berghain') || 
      testResult.recommendations.venues[0]?.name.includes('Sisyphos')) {
    console.log('🎉 SUCCESS! Specific venues are now appearing!')
  } else {
    console.log('⚠️ Still returning generic venues. May need more debugging.')
  }
  
  console.log('✅ Fixed upload complete!')
}

function convertCorpusToRAGFormat(corpus: CorpusEntry[]) {
  const successPatterns = []
  const languagePatterns = []
  
  for (let i = 0; i < corpus.length; i++) {
    const entry = corpus[i]
    
    // Create Success Pattern (what venues work)
    const venues = entry.response.includes('Sorry') || entry.response.includes('No ') ? [] : [
      {
        name: extractVenueName(entry.response),
        type: entry.metadata.activity_types[0] || 'general',
        address: extractAddress(entry.response),
        priceRange: extractPrice(entry.response),
        bookingMethod: extractBookingMethod(entry.response),
        rating: entry.metadata.response_type === 'positive' ? 4.5 : 
               entry.metadata.response_type === 'negative' ? 1.5 : 3.0,
        specialNotes: [entry.metadata.response_type]
      }
    ]

    const successPattern = {
      id: `massive_${i + 1}`,
      destination: entry.metadata.location,
      category: entry.metadata.activity_types[0] || 'general',
      venues,
      budgetTier: entry.metadata.budget,
      successRate: entry.metadata.response_type === 'positive' ? 0.9 : 
                  entry.metadata.response_type === 'negative' ? 0.1 : 0.5,
      userSatisfaction: entry.metadata.response_type === 'positive' ? 5 :
                       entry.metadata.response_type === 'negative' ? 1 : 3,
      metadata: {
        source: 'massive_corpus',
        lastUpdated: new Date().toISOString(),
        bookingPattern: 'mixed',
        localInsights: [entry.response.substring(0, 100)],
        language: entry.metadata.language,
        responseType: entry.metadata.response_type
      }
    }
    successPatterns.push(successPattern)
    
    // Create Language Pattern (how people talk)
    const languagePattern = {
      id: `massive_lang_${i + 1}`,
      userQuery: entry.query,
      confidence: entry.metadata.response_type === 'positive' ? 0.9 :
                 entry.metadata.response_type === 'negative' ? 0.3 : 0.6,
      intent: entry.metadata.activity_types[0] || 'general',
      phrases: [entry.query],
      mapsTo: {
        budgetTier: entry.metadata.budget,
        interests: entry.metadata.activity_types,
        groupType: inferGroupType(entry.query)
      }
    }
    languagePatterns.push(languagePattern)
  }
  
  return { successPatterns, languagePatterns }
}

function extractVenueName(response: string): string {
  // Extract the first venue mentioned
  const patterns = [
    /^([^,\.]+?)(?:,|\.|$)/,  // Everything before first comma or period
    /^(.+?)(?:\s+at\s+|\s+\(|\s+–|\s+-)/,  // Everything before location indicators
  ]
  
  for (const pattern of patterns) {
    const match = response.match(pattern)
    if (match && match[1].trim()) {
      let name = match[1].trim()
      // Clean up common prefixes
      name = name.replace(/^(Try |Visit |Check out |Go to )/i, '')
      return name
    }
  }
  
  return response.split(' ').slice(0, 3).join(' ') || 'Various venues'
}

function extractAddress(response: string): string | undefined {
  // Look for address patterns
  const addressPatterns = [
    /(?:at|located at|address:?)\s+([^\n,]+)/i,
    /([A-Z][a-zA-Z\s]+\s+\d+[a-zA-Z]?(?:,\s*\d{5})?(?:,\s*[A-Z][a-zA-Z\s]+)?)/,  // Street address pattern
    /(\d+\s+[A-Z][a-zA-Z\s]+(?: Street| St| Avenue| Ave| Road| Rd|straße|strasse))/i
  ]
  
  for (const pattern of addressPatterns) {
    const match = response.match(pattern)
    if (match) {
      return match[1].trim()
    }
  }
  
  return undefined
}

function extractPrice(response: string): string {
  // Extract price information
  const pricePatterns = [
    /[€$¥£]\s*\d+(?:-\d+)?(?:\s*per\s+\w+)?/i,
    /\d+(?:-\d+)?\s*[€$¥£]/i,
    /\d+\s*(?:SEK|NOK|AED|TL|KSH|ISK|pesos)/i
  ]
  
  for (const pattern of pricePatterns) {
    const match = response.match(pattern)
    if (match) return match[0]
  }
  
  return 'Varies'
}

function extractBookingMethod(response: string): string {
  if (response.includes('http')) return 'online'
  if (response.includes('phone') || response.includes('+')) return 'phone'
  if (response.includes('walk-in') || response.includes('queue')) return 'walk-in'
  if (response.includes('reservation')) return 'reservation'
  return 'direct'
}

function inferGroupType(query: string): string {
  const lower = query.toLowerCase()
  if (lower.includes('solo') || lower.includes('alone')) return 'solo'
  if (lower.includes('couple') || lower.includes('romantic')) return 'couple'
  if (lower.includes('friends') || lower.includes('group')) return 'friends'
  if (lower.includes('family') || lower.includes('kids')) return 'family'
  return 'friends' // Default for "students" etc
}

async function clearPineconeIndex() {
  // This would ideally delete all vectors, but Pinecone free tier might not support this
  // For now, we'll rely on upsert overwriting
  console.log('⚠️ Note: Existing vectors will be overwritten during upsert')
}

if (require.main === module) {
  fixedUpload().catch(console.error)
}

export { fixedUpload }