import { OpenAI } from 'openai'
import { CONFIG } from '../config'
import { 
  TravelIntent, 
  TravelRecommendation, 
  RAGQueryRequest, 
  RAGQueryResponse,
  SuccessPattern,
  Venue 
} from '../types'
import { CloudVectorStore } from './vector-store'
import { IntentExtractor } from './intent-extractor'

export class DualRAGSystem {
  private openai: OpenAI
  private vectorStore: CloudVectorStore
  private intentExtractor: IntentExtractor

  constructor() {
    this.openai = new OpenAI({
      apiKey: CONFIG.openai.apiKey
    })
    this.vectorStore = new CloudVectorStore()
    this.intentExtractor = new IntentExtractor(this.vectorStore)
  }

  async initialize() {
    console.log('🚀 Initializing Dual RAG System...')
    await this.vectorStore.initialize()
    console.log('✅ Dual RAG System ready')
  }

  async query(request: RAGQueryRequest): Promise<RAGQueryResponse> {
    const startTime = Date.now()
    console.log('🔍 Processing RAG query:', request.userMessage.slice(0, 100) + '...')

    try {
      // 1. Extract intent using both AI and language patterns
      const intent = await this.intentExtractor.extractIntent(request.userMessage)
      
      // 2. Query success patterns with extracted intent
      const successPatterns = await this.vectorStore.querySuccessPatterns(
        request.userMessage,
        {
          destination: intent.destination,
          budgetTier: intent.budgetTier
        }
      )

      // 3. Generate recommendations from retrieved patterns
      const recommendations = await this.generateRecommendations(
        intent,
        successPatterns,
        request.userMessage
      )

      const processingTime = Date.now() - startTime
      
      const response: RAGQueryResponse = {
        intent,
        recommendations,
        confidence: this.calculateOverallConfidence(intent, successPatterns, recommendations),
        processingTime,
        sources: successPatterns.map(p => p.source)
      }

      console.log('✅ RAG query completed:', {
        confidence: response.confidence,
        venues: response.recommendations.venues.length,
        processingTime: `${processingTime}ms`
      })

      return response

    } catch (error) {
      console.error('❌ RAG query failed:', error)
      throw error
    }
  }

  private async generateRecommendations(
    intent: TravelIntent,
    successPatterns: any[],
    originalQuery: string
  ): Promise<TravelRecommendation> {
    
    if (successPatterns.length === 0) {
      console.log('⚠️ No success patterns found, using fallback generation')
      return this.generateFallbackRecommendations(intent)
    }

    // Extract venues from top success patterns
    const allVenues: Venue[] = []
    const localTips: string[] = []
    
    for (const pattern of successPatterns.slice(0, 3)) { // Top 3 patterns
      const successPattern = pattern.content as SuccessPattern
      allVenues.push(...successPattern.venues)
      localTips.push(...(successPattern.metadata.localInsights || []))
    }

    // Remove duplicates and rank by confidence
    const uniqueVenues = this.deduplicateVenues(allVenues)
    const topVenues = uniqueVenues.slice(0, 5) // Top 5 recommendations

    // Generate contextual response using retrieved data
    const contextualResponse = await this.generateContextualResponse(
      intent,
      topVenues,
      localTips,
      originalQuery
    )

    return {
      venues: topVenues,
      confidence: this.calculateRecommendationConfidence(successPatterns, topVenues),
      reasoning: contextualResponse.reasoning,
      localTips: [...new Set(localTips)].slice(0, 5),
      alternatives: uniqueVenues.slice(5, 8) // Additional options
    }
  }

  private async generateContextualResponse(
    intent: TravelIntent,
    venues: Venue[],
    localTips: string[],
    originalQuery: string
  ): Promise<{ reasoning: string }> {
    
    const venueContext = venues.map(v => 
      `${v.name} (${v.type}) - ${v.priceRange} - ${v.address || 'location TBD'}`
    ).join('\n')

    const prompt = `
Based on successful travel patterns, provide contextual reasoning for these recommendations:

User Request: "${originalQuery}"
User Intent: ${intent.destination}, ${intent.interests.join(', ')}, ${intent.budgetTier} budget

Retrieved Successful Venues:
${venueContext}

Local Tips:
${localTips.slice(0, 3).join('\n')}

Write a brief reasoning (2-3 sentences) explaining WHY these venues match their request and what makes them successful choices. Be specific about the connection to their interests and budget.
`

    try {
      const response = await this.openai.chat.completions.create({
        model: CONFIG.openai.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 200
      })

      return {
        reasoning: response.choices[0]?.message?.content || 'These venues have proven successful for similar travelers.'
      }
    } catch (error) {
      console.warn('⚠️ Contextual response generation failed:', error)
      return {
        reasoning: 'These recommendations are based on successful patterns from similar travelers.'
      }
    }
  }

  private generateFallbackRecommendations(intent: TravelIntent): TravelRecommendation {
    // Basic fallback when no patterns are found
    const fallbackVenue: Venue = {
      name: `Top ${intent.interests[0] || 'attraction'} in ${intent.destination}`,
      type: intent.interests[0] || 'attraction',
      priceRange: this.getBudgetRange(intent.budgetTier),
      bookingMethod: 'online',
      rating: 4.0,
      specialNotes: ['Popular with travelers', 'Recommended for first-time visitors']
    }

    return {
      venues: [fallbackVenue],
      confidence: 0.3, // Low confidence for fallback
      reasoning: `I don't have specific success patterns for ${intent.destination} yet, but this is a popular choice for ${intent.interests.join(' and ')} enthusiasts.`,
      localTips: ['Consider booking in advance', 'Check local weather conditions'],
      alternatives: []
    }
  }

  private deduplicateVenues(venues: Venue[]): Venue[] {
    const seen = new Set<string>()
    return venues.filter(venue => {
      const key = `${venue.name.toLowerCase()}_${venue.type}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  private calculateOverallConfidence(
    intent: TravelIntent,
    patterns: any[],
    recommendations: TravelRecommendation
  ): number {
    const intentConfidence = intent.confidence
    const patternConfidence = patterns.length > 0 ? 
      patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length : 0.3
    const recommendationConfidence = recommendations.confidence
    
    // Weighted average
    return (intentConfidence * 0.3 + patternConfidence * 0.4 + recommendationConfidence * 0.3)
  }

  private calculateRecommendationConfidence(patterns: any[], venues: Venue[]): number {
    if (patterns.length === 0 || venues.length === 0) return 0.3
    
    // Base confidence on pattern quality and venue count
    const avgPatternConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length
    const venueBonus = Math.min(venues.length / 5, 1) * 0.2 // Bonus for having multiple options
    
    return Math.min(avgPatternConfidence + venueBonus, 1.0)
  }

  private getBudgetRange(budgetTier: string): string {
    switch (budgetTier) {
      case 'low': return '€5-20'
      case 'medium': return '€20-50'
      case 'high': return '€50-100'
      case 'luxury': return '€100+'
      default: return '€20-50'
    }
  }

  // Learning and improvement methods
  async learnFromBooking(
    query: string,
    intent: TravelIntent,
    bookedVenue: Venue,
    userSatisfaction: number
  ) {
    console.log('📚 Learning from successful booking:', bookedVenue.name)
    
    // This would update success patterns with real booking data
    // For now, we'll log it for monitoring
    console.log('Booking data:', {
      destination: intent.destination,
      venue: bookedVenue.name,
      satisfaction: userSatisfaction,
      query: query.slice(0, 50) + '...'
    })
  }

  async getSystemStats() {
    const vectorStats = await this.vectorStore.getStats()
    return {
      vectorStore: vectorStats,
      config: {
        confidenceThreshold: CONFIG.rag.confidenceThreshold,
        topK: CONFIG.rag.topK,
        model: CONFIG.openai.model
      }
    }
  }
}