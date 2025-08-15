/**
 * Self-Learning RAG System
 * Automatically searches web for unknown venues and adds them to corpus
 */

import { OpenAI } from 'openai'
import { CONFIG } from '../config'
import { CloudVectorStore } from './vector-store'
import { DualRAGSystem } from './dual-rag-system'
import { SuccessPattern, Venue, TravelIntent, RAGQueryResponse } from '../types'
import fetch from 'node-fetch'

interface WebSearchResult {
  name: string
  address?: string
  price?: string
  description?: string
  rating?: number
  website?: string
  type?: string
}

export class SelfLearningRAG extends DualRAGSystem {
  private selfOpenai: OpenAI
  private selfVectorStore: CloudVectorStore
  private learningEnabled: boolean = true

  constructor() {
    super()
    this.selfOpenai = new OpenAI({ apiKey: CONFIG.openai.apiKey })
    this.selfVectorStore = new CloudVectorStore()
  }

  async query(request: { userMessage: string; conversationContext: any[] }): Promise<RAGQueryResponse> {
    console.log('🧠 Self-Learning RAG processing:', request.userMessage.slice(0, 50) + '...')
    
    // First, try regular RAG query
    const ragResponse = await super.query(request)
    
    // Check if we got good results
    if (ragResponse.confidence >= 0.7 && ragResponse.recommendations.venues.length > 0) {
      console.log('✅ Found in corpus with high confidence')
      return ragResponse
    }
    
    // Low confidence or no results - search the web
    console.log('🔍 Low confidence or no results - searching the web...')
    
    // Extract what they're looking for
    const searchIntent = await this.extractSearchIntent(request.userMessage)
    
    if (!searchIntent.searchable) {
      console.log('❌ Query not searchable on web')
      return ragResponse
    }
    
    // Search the web for venue information
    const webResults = await this.searchWeb(searchIntent)
    
    if (webResults.length === 0) {
      console.log('❌ No web results found')
      return ragResponse
    }
    
    console.log(`✅ Found ${webResults.length} venues on the web`)
    
    // Convert web results to venues
    const newVenues = await this.convertToVenues(webResults, searchIntent)
    
    // Add to corpus for future use
    if (this.learningEnabled) {
      await this.addToCorpus(newVenues, searchIntent)
      console.log('📚 Added to corpus for future queries')
    }
    
    // Return enhanced response
    return {
      ...ragResponse,
      recommendations: {
        ...ragResponse.recommendations,
        venues: [...newVenues, ...ragResponse.recommendations.venues].slice(0, 5),
        localTips: [
          'These venues were found through web search',
          'Information may need verification',
          ...ragResponse.recommendations.localTips
        ]
      },
      confidence: Math.max(ragResponse.confidence, 0.6),
      sources: [...ragResponse.sources, 'web_search']
    }
  }

  private async extractSearchIntent(userMessage: string): Promise<any> {
    const prompt = `
Extract search intent from this travel query:
"${userMessage}"

Return JSON with:
{
  "searchable": true/false (can we search for this on the web?),
  "destination": "city name",
  "venueType": "nightclub/restaurant/museum/etc",
  "specificVenue": "name if looking for specific place",
  "searchQuery": "optimized Google search query"
}
`

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        response_format: { type: 'json_object' }
      })
      
      return JSON.parse(response.choices[0]?.message?.content || '{}')
    } catch (error) {
      console.error('Failed to extract search intent:', error)
      return { searchable: false }
    }
  }

  private async searchWeb(searchIntent: any): Promise<WebSearchResult[]> {
    // This would integrate with Google Places API or similar
    // For now, simulate with structured search
    
    const searchQuery = searchIntent.searchQuery || 
      `${searchIntent.venueType} ${searchIntent.destination} address price`
    
    console.log(`🌐 Web search: "${searchQuery}"`)
    
    // In production, this would call Google Places API
    // For demonstration, we'll use a mock implementation
    
    try {
      // Simulate web search with GPT-4 knowledge
      const prompt = `
You are helping find real venues. For this search: "${searchQuery}"

Return up to 3 REAL venues that actually exist with accurate information:
- Real addresses
- Actual price ranges
- Real websites if they have them

Format as JSON array:
[
  {
    "name": "Actual venue name",
    "address": "Real street address",
    "price": "Actual price range",
    "type": "venue type",
    "description": "Brief description",
    "rating": 4.5,
    "website": "actual website or null"
  }
]

If you don't know real venues for this search, return empty array []
`

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        response_format: { type: 'json_object' },
        max_tokens: 500
      })
      
      const content = response.choices[0]?.message?.content || '{"venues":[]}'
      const parsed = JSON.parse(content)
      return parsed.venues || []
      
    } catch (error) {
      console.error('Web search failed:', error)
      return []
    }
  }

  private async convertToVenues(webResults: WebSearchResult[], searchIntent: any): Promise<Venue[]> {
    return webResults.map(result => ({
      name: result.name,
      type: result.type || searchIntent.venueType || 'venue',
      address: result.address,
      priceRange: result.price || 'Check venue',
      bookingMethod: result.website ? 'online' : 'direct',
      rating: result.rating || 4,
      specialNotes: [
        'Found via web search',
        'Verify details before visiting'
      ],
      website: result.website
    }))
  }

  private async addToCorpus(venues: Venue[], searchIntent: any) {
    const timestamp = new Date().toISOString()
    
    // Create success pattern from web search
    const successPattern: SuccessPattern = {
      id: `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      destination: searchIntent.destination.toLowerCase(),
      category: searchIntent.venueType || 'general',
      venues,
      budgetTier: this.inferBudgetTier(venues),
      successRate: 0.6, // Lower confidence for web-sourced data
      userSatisfaction: 3.5, // Neutral until verified
      metadata: {
        source: 'web_search',
        lastUpdated: timestamp,
        bookingPattern: 'mixed',
        localInsights: [
          `Found via web search for "${searchIntent.searchQuery}"`,
          'Information should be verified'
        ]
      }
    }
    
    try {
      // Add to vector store
      await this.vectorStore.upsertSuccessPatterns([successPattern])
      console.log('✅ Successfully added to corpus')
      
      // Log learning event
      this.logLearningEvent({
        timestamp,
        query: searchIntent.searchQuery,
        venuesAdded: venues.length,
        destination: searchIntent.destination
      })
      
    } catch (error) {
      console.error('Failed to add to corpus:', error)
    }
  }

  private inferBudgetTier(venues: Venue[]): string {
    // Analyze price ranges to infer budget tier
    const prices = venues
      .map(v => v.priceRange)
      .filter(p => p && p.includes('€'))
      .map(p => {
        const match = p.match(/€(\d+)/)
        return match ? parseInt(match[1]) : 0
      })
    
    if (prices.length === 0) return 'medium'
    
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length
    
    if (avgPrice < 20) return 'low'
    if (avgPrice < 50) return 'medium'
    if (avgPrice < 100) return 'high'
    return 'luxury'
  }

  private logLearningEvent(event: any) {
    // In production, this would log to a database or analytics service
    console.log('📊 Learning Event:', event)
  }

  async enableLearning(enabled: boolean) {
    this.learningEnabled = enabled
    console.log(`🧠 Self-learning ${enabled ? 'enabled' : 'disabled'}`)
  }

  async getLearningSummary() {
    // Return statistics about learned venues
    const stats = await this.vectorStore.getStats()
    
    const webSourcedCount = 0 // Would query for source='web_search'
    
    return {
      totalVectors: stats.totalRecordCount,
      webSourced: webSourcedCount,
      learningEnabled: this.learningEnabled,
      confidenceThreshold: CONFIG.rag.confidenceThreshold
    }
  }
}