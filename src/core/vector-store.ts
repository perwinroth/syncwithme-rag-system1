import { Pinecone } from '@pinecone-database/pinecone'
import { OpenAIEmbeddings } from '@langchain/openai'
import { CONFIG } from '../config'
import { SuccessPattern, LanguagePattern, RAGResult } from '../types'

export class CloudVectorStore {
  private pinecone: Pinecone
  private embeddings: OpenAIEmbeddings
  private index: any

  constructor() {
    this.pinecone = new Pinecone({
      apiKey: CONFIG.pinecone.apiKey
    })
    
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: CONFIG.openai.apiKey,
      modelName: CONFIG.openai.embeddingModel,
      dimensions: CONFIG.openai.embeddingDimensions
    })
  }

  async initialize() {
    try {
      // Get index (lightweight operation)
      this.index = this.pinecone.Index(CONFIG.pinecone.indexName)
      console.log('✅ Vector store connected to index:', CONFIG.pinecone.indexName)
      
    } catch (error) {
      console.error('❌ Vector store initialization failed:', error)
      throw error
    }
  }

  async upsertSuccessPatterns(patterns: SuccessPattern[]) {
    console.log(`📊 Upserting ${patterns.length} success patterns...`)
    
    const vectors = await Promise.all(
      patterns.map(async (pattern) => {
        // Create searchable text for embedding
        const searchText = this.createSearchText(pattern)
        const embedding = await this.embeddings.embedQuery(searchText)
        
        return {
          id: `success_${pattern.id}`,
          values: embedding,
          metadata: {
            type: 'success_pattern',
            destination: pattern.destination,
            category: pattern.category,
            budgetTier: pattern.budgetTier,
            successRate: pattern.successRate,
            userSatisfaction: pattern.userSatisfaction,
            venues: JSON.stringify(pattern.venues),
            searchText,
            ...pattern.metadata
          }
        }
      })
    )

    // Batch upsert
    const batchSize = 100
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize)
      await this.index.upsert(batch)
    }
    
    console.log('✅ Success patterns upserted')
  }

  async upsertLanguagePatterns(patterns: LanguagePattern[]) {
    console.log(`💬 Upserting ${patterns.length} language patterns...`)
    
    const vectors = await Promise.all(
      patterns.map(async (pattern) => {
        // Create searchable text from phrases or userQuery
        const searchText = pattern.phrases ? pattern.phrases.join(' | ') : pattern.userQuery || ''
        const embedding = await this.embeddings.embedQuery(searchText)
        
        return {
          id: `language_${pattern.id}`,
          values: embedding,
          metadata: {
            type: 'language_pattern',
            intent: pattern.intent,
            confidence: pattern.confidence,
            phrases: JSON.stringify(pattern.phrases),
            mapsTo: JSON.stringify(pattern.mapsTo),
            searchText
          }
        }
      })
    )

    // Batch upsert
    const batchSize = 100
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize)
      await this.index.upsert(batch)
    }
    
    console.log('✅ Language patterns upserted')
  }

  async querySuccessPatterns(
    query: string,
    filters: {
      destination?: string
      budgetTier?: string
      category?: string
    } = {}
  ): Promise<RAGResult[]> {
    const embedding = await this.embeddings.embedQuery(query)
    
    const filterConditions: any = {
      type: { $eq: 'success_pattern' }
    }
    
    if (filters.destination) {
      filterConditions.destination = { $eq: filters.destination.toLowerCase() }
    }
    if (filters.budgetTier) {
      filterConditions.budgetTier = { $eq: filters.budgetTier }
    }
    if (filters.category) {
      filterConditions.category = { $eq: filters.category }
    }

    const results = await this.index.query({
      vector: embedding,
      topK: CONFIG.rag.topK,
      includeMetadata: true,
      filter: filterConditions
    })

    return results.matches
      .filter((match: any) => match.score >= CONFIG.rag.confidenceThreshold)
      .map((match: any) => ({
        type: 'success_pattern' as const,
        content: this.parseSuccessPattern(match.metadata),
        confidence: match.score,
        source: match.metadata.source || 'unknown'
      }))
  }

  async queryLanguagePatterns(query: string): Promise<RAGResult[]> {
    const embedding = await this.embeddings.embedQuery(query)
    
    const results = await this.index.query({
      vector: embedding,
      topK: 5,
      includeMetadata: true,
      filter: {
        type: { $eq: 'language_pattern' }
      }
    })

    return results.matches
      .filter((match: any) => match.score >= 0.6) // Lower threshold for language
      .map((match: any) => ({
        type: 'language_pattern' as const,
        content: this.parseLanguagePattern(match.metadata),
        confidence: match.score,
        source: 'language_corpus'
      }))
  }

  private createSearchText(pattern: SuccessPattern): string {
    const venues = pattern.venues || []
    const venueNames = venues.map(v => v.name).join(' ')
    const venueTypes = venues.map(v => v.type).join(' ')
    const insights = pattern.metadata.localInsights?.join(' ') || ''
    
    return `${pattern.destination} ${pattern.category || ''} ${venueNames} ${venueTypes} ${insights} ${pattern.budgetTier || ''}`
  }

  private parseSuccessPattern(metadata: any): SuccessPattern {
    return {
      id: metadata.id,
      destination: metadata.destination,
      category: metadata.category,
      venues: typeof metadata.venues === 'string' ? JSON.parse(metadata.venues || '[]') : metadata.venues || [],
      budgetTier: metadata.budgetTier,
      successRate: metadata.successRate || 0,
      userSatisfaction: metadata.userSatisfaction || 0,
      metadata: {
        source: metadata.source,
        lastUpdated: metadata.lastUpdated,
        bookingPattern: metadata.bookingPattern || '',
        localInsights: typeof metadata.localInsights === 'string' 
          ? JSON.parse(metadata.localInsights || '[]') 
          : metadata.localInsights || []
      }
    }
  }

  private parseLanguagePattern(metadata: any): LanguagePattern {
    return {
      id: metadata.id,
      intent: metadata.intent,
      phrases: JSON.parse(metadata.phrases || '[]'),
      confidence: metadata.confidence || 0,
      mapsTo: JSON.parse(metadata.mapsTo || '{}'),
      examples: []
    }
  }

  async getStats() {
    return await this.index.describeIndexStats()
  }
}