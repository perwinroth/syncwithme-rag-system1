#!/usr/bin/env tsx
/**
 * Check if Berlin venues are in Pinecone
 */

import { Pinecone } from '@pinecone-database/pinecone'
import { OpenAI } from 'openai'
import { CONFIG } from '../config'

const pc = new Pinecone({ apiKey: CONFIG.pinecone.apiKey })
const openai = new OpenAI({ apiKey: CONFIG.openai.apiKey })

async function checkBerlin() {
  const index = pc.index(CONFIG.pinecone.indexName)
  
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: 'berghain berlin nightclub techno',
    dimensions: 2048
  })
  const testVector = embeddingResponse.data[0].embedding
  
  // Check for Berlin success patterns
  console.log('Searching for Berlin success patterns...')
  const results = await index.query({
    vector: testVector,
    topK: 10,
    includeMetadata: true,
    filter: { 
      $and: [
        { type: { $eq: 'success_pattern' } },
        { destination: { $eq: 'berlin' } }
      ]
    }
  })
  
  const matchCount = results.matches?.length || 0
  console.log(`Found ${matchCount} Berlin success patterns\n`)
  
  if (results.matches && results.matches.length > 0) {
    // Check first few matches
    results.matches.slice(0, 3).forEach((match, i) => {
      console.log(`Match ${i+1}: ${match.id}`)
      if (match.metadata?.venues) {
        const venues = typeof match.metadata.venues === 'string' 
          ? JSON.parse(match.metadata.venues as string) 
          : match.metadata.venues
        const venueNames = venues.map((v: any) => v.name).join(', ')
        console.log(`  Venues: ${venueNames}`)
      }
    })
  }
  
  // Try searching for Berghain specifically
  console.log('\nSearching for patterns mentioning Berghain...')
  const berghainEmbed = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: 'Berghain Am Wriezener Bahnhof Berlin techno club €18-25',
    dimensions: 2048
  })
  
  const berghainResults = await index.query({
    vector: berghainEmbed.data[0].embedding,
    topK: 5,
    includeMetadata: true,
    filter: { type: { $eq: 'success_pattern' } }
  })
  
  let foundBerghain = false
  berghainResults.matches?.forEach(match => {
    if (match.metadata?.venues) {
      const venues = typeof match.metadata.venues === 'string' 
        ? JSON.parse(match.metadata.venues as string) 
        : match.metadata.venues
      const berghain = venues.find((v: any) => v.name?.toLowerCase().includes('berghain'))
      if (berghain) {
        console.log('✅ FOUND BERGHAIN:', berghain)
        foundBerghain = true
      }
    }
  })
  
  if (!foundBerghain) {
    console.log('❌ Berghain not found in any success patterns yet')
    console.log('This likely means the upload hasn\'t reached Berlin venues yet')
  }
  
  // Check upload progress
  console.log('\nChecking upload IDs to estimate progress...')
  const latestResults = await index.query({
    vector: testVector,
    topK: 100,
    includeMetadata: false
  })
  
  // Find highest corpus_ ID
  let highestCorpusId = 0
  latestResults.matches?.forEach(match => {
    if (match.id.startsWith('corpus_')) {
      const idNum = parseInt(match.id.replace('corpus_', '').split('_')[0])
      if (!isNaN(idNum) && idNum > highestCorpusId) {
        highestCorpusId = idNum
      }
    }
  })
  
  if (highestCorpusId > 0) {
    console.log(`Highest corpus ID found: corpus_${highestCorpusId}`)
    console.log(`Estimated progress: ${highestCorpusId}/10020 patterns`)
  } else {
    console.log('No corpus_ prefixed IDs found (using different ID scheme)')
  }
}

if (require.main === module) {
  checkBerlin().catch(console.error)
}

export { checkBerlin }