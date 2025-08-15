/**
 * Venue Freshness Validator
 * Checks if venues are still open and updates corpus accordingly
 */

import { Venue, SuccessPattern } from '../types'
import { CloudVectorStore } from './vector-store'
import fetch from 'node-fetch'
import { OpenAI } from 'openai'
import { CONFIG } from '../config'

interface ValidationResult {
  venue: Venue
  isValid: boolean
  status: 'open' | 'closed' | 'uncertain' | 'moved'
  lastChecked: string
  confidence: number
  updatedInfo?: {
    address?: string
    priceRange?: string
    website?: string
    hours?: string
  }
}

export class VenueValidator {
  private openai: OpenAI
  private vectorStore: CloudVectorStore
  private cacheMap: Map<string, ValidationResult> = new Map()
  private CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

  constructor() {
    this.openai = new OpenAI({ apiKey: CONFIG.openai.apiKey })
    this.vectorStore = new CloudVectorStore()
  }

  /**
   * Validate venues before returning to user
   */
  async validateVenues(venues: Venue[]): Promise<Venue[]> {
    console.log(`🔍 Validating ${venues.length} venues...`)
    
    const validatedVenues: Venue[] = []
    
    for (const venue of venues) {
      const validation = await this.validateVenue(venue)
      
      if (validation.isValid) {
        // Update venue with fresh info if available
        const updatedVenue = {
          ...venue,
          ...validation.updatedInfo,
          lastValidated: validation.lastChecked,
          validationStatus: validation.status
        }
        validatedVenues.push(updatedVenue)
      } else if (validation.status === 'uncertain') {
        // Include but mark as needs verification
        validatedVenues.push({
          ...venue,
          specialNotes: [
            ...(venue.specialNotes || []),
            '⚠️ Status uncertain - verify before visiting'
          ],
          lastValidated: validation.lastChecked,
          validationStatus: validation.status
        })
      }
      // Skip closed venues entirely
    }
    
    console.log(`✅ Validated: ${validatedVenues.length}/${venues.length} venues are valid`)
    return validatedVenues
  }

  /**
   * Validate a single venue
   */
  async validateVenue(venue: Venue): Promise<ValidationResult> {
    const cacheKey = `${venue.name}_${venue.address || venue.type}`
    
    // Check cache first
    const cached = this.cacheMap.get(cacheKey)
    if (cached) {
      const age = Date.now() - new Date(cached.lastChecked).getTime()
      if (age < this.CACHE_DURATION) {
        console.log(`📦 Using cached validation for ${venue.name}`)
        return cached
      }
    }
    
    console.log(`🔍 Validating ${venue.name}...`)
    
    // Strategy 1: Check if website is accessible (if available)
    let websiteValid = false
    if (venue.website) {
      websiteValid = await this.checkWebsite(venue.website)
    }
    
    // Strategy 2: Search for recent information
    const searchResult = await this.searchForVenue(venue)
    
    // Strategy 3: AI validation combining all signals
    const validation = await this.aiValidation(venue, websiteValid, searchResult)
    
    // Cache the result
    this.cacheMap.set(cacheKey, validation)
    
    // If venue is closed, mark it in the corpus
    if (!validation.isValid && validation.status === 'closed') {
      await this.markVenueAsClosed(venue)
    }
    
    return validation
  }

  /**
   * Check if venue website is still accessible
   */
  private async checkWebsite(url: string): Promise<boolean> {
    if (!url || url === 'Walk-in only' || url === 'Pay at door') {
      return true // Not a real URL, skip check
    }
    
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; VenueValidator/1.0)'
        }
      })
      
      // 200-399 status codes are good
      return response.status >= 200 && response.status < 400
    } catch (error) {
      console.log(`❌ Website check failed for ${url}`)
      return false
    }
  }

  /**
   * Search for recent information about the venue
   */
  private async searchForVenue(venue: Venue): Promise<any> {
    const searchQuery = `${venue.name} ${venue.address || ''} ${new Date().getFullYear()} open closed hours`
    
    try {
      // In production, this would use Google Places API or similar
      // For now, use GPT-4's knowledge with current date context
      const prompt = `
Current date: ${new Date().toISOString().split('T')[0]}

Is this venue still open and operating?
Venue: ${venue.name}
Address: ${venue.address || 'Unknown'}
Type: ${venue.type}

Based on your knowledge up to January 2025, provide:
1. Is it still open? (yes/no/uncertain)
2. Any changes to address, hours, or prices?
3. Confidence level (0-1)

Return JSON:
{
  "stillOpen": true/false/null,
  "confidence": 0.0-1.0,
  "lastKnownStatus": "description",
  "updates": {
    "address": "new address if changed",
    "hours": "current hours if known",
    "priceRange": "current prices if changed"
  }
}
`

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        response_format: { type: 'json_object' },
        max_tokens: 200
      })
      
      return JSON.parse(response.choices[0]?.message?.content || '{}')
    } catch (error) {
      console.error('Search failed:', error)
      return { stillOpen: null, confidence: 0 }
    }
  }

  /**
   * AI validation combining all signals
   */
  private async aiValidation(
    venue: Venue, 
    websiteValid: boolean, 
    searchResult: any
  ): Promise<ValidationResult> {
    const now = new Date().toISOString()
    
    // Combine signals
    let confidence = 0.5 // Start neutral
    let status: 'open' | 'closed' | 'uncertain' | 'moved' = 'uncertain'
    let isValid = true
    
    // Website signal
    if (venue.website && venue.website.startsWith('http')) {
      if (websiteValid) {
        confidence += 0.3
      } else {
        confidence -= 0.2
      }
    }
    
    // Search result signal
    if (searchResult.stillOpen === true) {
      confidence = Math.max(confidence, searchResult.confidence)
      status = 'open'
      isValid = true
    } else if (searchResult.stillOpen === false) {
      confidence = searchResult.confidence
      status = 'closed'
      isValid = false
    } else {
      // Uncertain
      status = 'uncertain'
      isValid = confidence > 0.5
    }
    
    // Special cases
    if (venue.name.toLowerCase().includes('berghain') || 
        venue.name.toLowerCase().includes('golden gai')) {
      // These iconic venues are almost certainly still open
      confidence = Math.max(confidence, 0.9)
      status = 'open'
      isValid = true
    }
    
    return {
      venue,
      isValid,
      status,
      lastChecked: now,
      confidence,
      updatedInfo: searchResult.updates || {}
    }
  }

  /**
   * Mark venue as closed in corpus
   */
  private async markVenueAsClosed(venue: Venue) {
    console.log(`🚫 Marking ${venue.name} as closed in corpus`)
    
    // In production, this would update the vector store
    // For now, we'll log it for monitoring
    const closureEvent = {
      venue: venue.name,
      address: venue.address,
      markedClosedAt: new Date().toISOString(),
      reason: 'Failed validation checks'
    }
    
    console.log('Closure event:', closureEvent)
    
    // TODO: Update vector store to mark pattern as outdated
    // This would involve:
    // 1. Finding all patterns containing this venue
    // 2. Reducing their confidence scores
    // 3. Adding a "closed" flag to metadata
  }

  /**
   * Batch validate all venues in corpus (maintenance task)
   */
  async validateCorpus(limit: number = 100) {
    console.log(`🔍 Starting corpus validation (limit: ${limit})...`)
    
    // This would be run as a scheduled job
    // 1. Query all unique venues from corpus
    // 2. Validate each one
    // 3. Update corpus with results
    // 4. Remove or flag closed venues
    
    const stats = {
      checked: 0,
      open: 0,
      closed: 0,
      uncertain: 0,
      updated: 0
    }
    
    // TODO: Implement full corpus scan
    
    console.log('📊 Validation complete:', stats)
    return stats
  }

  /**
   * Get validation statistics
   */
  getStats() {
    return {
      cacheSize: this.cacheMap.size,
      cacheHitRate: 0, // TODO: Track hits/misses
      validationCount: this.cacheMap.size,
      lastValidation: new Date().toISOString()
    }
  }
}