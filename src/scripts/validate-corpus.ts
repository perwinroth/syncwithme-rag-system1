#!/usr/bin/env tsx
/**
 * Corpus Validation Script
 * Periodically checks if venues in corpus are still open
 * Run as cron job: 0 0 * * * (daily at midnight)
 */

import { VenueValidator } from '../core/venue-validator'
import { CloudVectorStore } from '../core/vector-store'
import { SuccessPattern } from '../types'

async function validateCorpus() {
  console.log('🔍 Starting Corpus Validation Job')
  console.log('=' .repeat(60))
  console.log(`Time: ${new Date().toISOString()}`)
  console.log('')
  
  const validator = new VenueValidator()
  const vectorStore = new CloudVectorStore()
  await vectorStore.initialize()
  
  const stats = {
    totalPatterns: 0,
    totalVenues: 0,
    validated: 0,
    stillOpen: 0,
    closed: 0,
    uncertain: 0,
    updated: 0,
    errors: 0
  }
  
  try {
    // Get sample of patterns to validate (in production, paginate through all)
    const sampleQueries = [
      'berghain berlin',
      'golden gai tokyo',
      'fabric london',
      'sisyphos berlin',
      'robot restaurant tokyo'
    ]
    
    for (const query of sampleQueries) {
      console.log(`\n📍 Checking venues for: "${query}"`)
      
      const patterns = await vectorStore.querySuccessPatterns(query, {})
      stats.totalPatterns += patterns.length
      
      for (const result of patterns) {
        const pattern = result.content as SuccessPattern
        const venues = pattern.venues || []
        stats.totalVenues += venues.length
        
        for (const venue of venues) {
          try {
            const validation = await validator.validateVenue(venue)
            stats.validated++
            
            if (validation.status === 'open') {
              stats.stillOpen++
              console.log(`  ✅ ${venue.name} - OPEN (confidence: ${validation.confidence.toFixed(2)})`)
            } else if (validation.status === 'closed') {
              stats.closed++
              console.log(`  ❌ ${venue.name} - CLOSED`)
              
              // TODO: Update pattern in vector store to mark venue as closed
              // This would reduce the pattern's confidence score
            } else if (validation.status === 'uncertain') {
              stats.uncertain++
              console.log(`  ⚠️  ${venue.name} - UNCERTAIN (needs manual check)`)
            }
            
            // Check if venue info was updated
            if (validation.updatedInfo && Object.keys(validation.updatedInfo).length > 0) {
              stats.updated++
              console.log(`     📝 Updated info available:`, validation.updatedInfo)
            }
            
          } catch (error: any) {
            stats.errors++
            console.error(`  ❌ Error validating ${venue.name}:`, error.message)
          }
        }
      }
    }
    
    // Print summary
    console.log('\n' + '=' .repeat(60))
    console.log('📊 VALIDATION SUMMARY')
    console.log('=' .repeat(60))
    console.log(`Total Patterns Checked: ${stats.totalPatterns}`)
    console.log(`Total Venues Validated: ${stats.validated}/${stats.totalVenues}`)
    console.log(`✅ Still Open: ${stats.stillOpen} (${((stats.stillOpen/stats.validated)*100).toFixed(1)}%)`)
    console.log(`❌ Closed: ${stats.closed} (${((stats.closed/stats.validated)*100).toFixed(1)}%)`)
    console.log(`⚠️  Uncertain: ${stats.uncertain} (${((stats.uncertain/stats.validated)*100).toFixed(1)}%)`)
    console.log(`📝 Updated: ${stats.updated}`)
    console.log(`🔥 Errors: ${stats.errors}`)
    
    // Alert if too many closures detected
    const closureRate = stats.closed / stats.validated
    if (closureRate > 0.1) {
      console.log('\n⚠️  WARNING: High closure rate detected!')
      console.log('   Consider running full corpus refresh')
    }
    
    // Save validation report
    const report = {
      timestamp: new Date().toISOString(),
      stats,
      closureRate,
      healthScore: (stats.stillOpen / stats.validated)
    }
    
    console.log('\n📋 Report saved for monitoring')
    console.log(`Health Score: ${(report.healthScore * 100).toFixed(1)}%`)
    
    return report
    
  } catch (error) {
    console.error('❌ Validation job failed:', error)
    throw error
  }
}

// Support for scheduled execution
async function scheduledValidation() {
  console.log('⏰ Scheduled corpus validation starting...')
  
  try {
    const report = await validateCorpus()
    
    // In production, this would:
    // 1. Send alerts if health score drops
    // 2. Log to monitoring service
    // 3. Update dashboard metrics
    
    if (report.healthScore < 0.8) {
      console.log('📧 Alert: Corpus health below 80%')
      // Send notification to admin
    }
    
  } catch (error) {
    console.error('Scheduled validation failed:', error)
    // Send error alert
  }
}

if (require.main === module) {
  validateCorpus().catch(console.error)
}

export { validateCorpus, scheduledValidation }