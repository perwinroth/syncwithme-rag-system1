#!/usr/bin/env tsx
/**
 * Debug JSON parsing error in vector results
 */

import { Pinecone } from '@pinecone-database/pinecone'
import { OpenAI } from 'openai'
import { CONFIG } from '../config'

const pc = new Pinecone({ apiKey: CONFIG.pinecone.apiKey })
const openai = new OpenAI({ apiKey: CONFIG.openai.apiKey })

async function debugJsonError() {
  const index = pc.index(CONFIG.pinecone.indexName)
  
  // Create test vector
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: 'golden gai tokyo bars',
    dimensions: 2048
  })
  const testVector = embeddingResponse.data[0].embedding
  
  // Query with success_pattern filter
  console.log('Querying for "golden gai tokyo bars"...\n')
  const results = await index.query({
    vector: testVector,
    topK: 3,
    includeMetadata: true,
    filter: { type: { $eq: 'success_pattern' } }
  })
  
  if (results.matches && results.matches.length > 0) {
    console.log(`Found ${results.matches.length} matches\n`)
    
    results.matches.forEach((match, i) => {
      console.log(`Match ${i + 1}:`)
      console.log('  ID:', match.id)
      console.log('  Score:', match.score)
      console.log('  Metadata type:', match.metadata?.type)
      
      // Check localInsights field
      if (match.metadata?.localInsights) {
        console.log('  localInsights raw value:', match.metadata.localInsights)
        console.log('  localInsights type:', typeof match.metadata.localInsights)
        
        // Try to parse if it's a string
        if (typeof match.metadata.localInsights === 'string') {
          try {
            const parsed = JSON.parse(match.metadata.localInsights)
            console.log('  ✅ localInsights parsed successfully:', parsed)
          } catch (e) {
            console.log('  ❌ Error parsing localInsights:', e.message)
            console.log('  First 100 chars:', match.metadata.localInsights.substring(0, 100))
          }
        }
      }
      
      // Check venues field
      if (match.metadata?.venues) {
        console.log('  venues type:', typeof match.metadata.venues)
        console.log('  venues first 200 chars:', 
          typeof match.metadata.venues === 'string' 
            ? match.metadata.venues.substring(0, 200) 
            : match.metadata.venues
        )
        
        if (typeof match.metadata.venues === 'string') {
          try {
            const parsed = JSON.parse(match.metadata.venues)
            console.log('  ✅ venues parsed successfully')
            console.log('  First venue:', parsed[0])
          } catch (e) {
            console.log('  ❌ Error parsing venues:', e.message)
          }
        }
      }
      
      console.log('')
    })
  } else {
    console.log('No matches found for "golden gai tokyo bars"')
    
    // Try without filter
    console.log('\nTrying without type filter...')
    const anyResults = await index.query({
      vector: testVector,
      topK: 3,
      includeMetadata: true
    })
    
    if (anyResults.matches && anyResults.matches.length > 0) {
      console.log(`Found ${anyResults.matches.length} matches without filter`)
      console.log('First match type:', anyResults.matches[0].metadata?.type)
      console.log('First match location:', anyResults.matches[0].metadata?.location || anyResults.matches[0].metadata?.destination)
    }
  }
}

if (require.main === module) {
  debugJsonError().catch(console.error)
}

export { debugJsonError }