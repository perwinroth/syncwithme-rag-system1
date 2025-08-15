#!/usr/bin/env tsx
/**
 * Test confidence scores
 */

import { Pinecone } from '@pinecone-database/pinecone'
import { OpenAI } from 'openai'
import { CONFIG } from '../config'

const pc = new Pinecone({ apiKey: CONFIG.pinecone.apiKey })
const openai = new OpenAI({ apiKey: CONFIG.openai.apiKey })

async function testConfidence() {
  console.log('🎯 Testing confidence scores\n')
  
  const index = pc.index(CONFIG.pinecone.indexName)
  
  // Create embedding for "berghain berlin techno"
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: 'berghain berlin techno',
    dimensions: 2048
  })
  const testVector = embeddingResponse.data[0].embedding
  
  // Query with Berlin filter
  console.log('Query: "berghain berlin techno" WITH destination=berlin filter')
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
  
  console.log(`Found ${results.matches?.length || 0} matches\n`)
  
  if (results.matches && results.matches.length > 0) {
    console.log('Confidence scores:')
    results.matches.forEach((match, i) => {
      console.log(`  ${i+1}. Score: ${match.score.toFixed(3)} - ID: ${match.id}`)
      if (match.metadata?.venues) {
        const venues = typeof match.metadata.venues === 'string' 
          ? JSON.parse(match.metadata.venues as string) 
          : match.metadata.venues
        if (venues[0]) {
          console.log(`     Venue: ${venues[0].name}`)
        }
      }
    })
    
    console.log(`\nCurrent threshold: ${CONFIG.rag.confidenceThreshold}`)
    const passing = results.matches.filter(m => m.score >= CONFIG.rag.confidenceThreshold).length
    console.log(`Passing threshold: ${passing}/${results.matches.length}`)
    
    if (passing === 0) {
      console.log('\n❌ ALL results are being filtered out by confidence threshold!')
      const maxScore = Math.max(...results.matches.map(m => m.score))
      console.log(`   Highest score: ${maxScore.toFixed(3)}`)
      console.log(`   Threshold: ${CONFIG.rag.confidenceThreshold}`)
      console.log(`   Recommended: Lower threshold to ${(maxScore - 0.05).toFixed(2)} or less`)
    }
  } else {
    console.log('❌ No matches found even before confidence filtering')
    console.log('   This suggests the filter conditions are too restrictive')
  }
  
  // Try without destination filter
  console.log('\n---\nQuery: "berghain berlin techno" WITHOUT destination filter')
  const results2 = await index.query({
    vector: testVector,
    topK: 10,
    includeMetadata: true,
    filter: { type: { $eq: 'success_pattern' } }
  })
  
  console.log(`Found ${results2.matches?.length || 0} matches`)
  if (results2.matches && results2.matches.length > 0) {
    console.log('Top 3 scores:')
    results2.matches.slice(0, 3).forEach((match, i) => {
      console.log(`  ${i+1}. Score: ${match.score.toFixed(3)}`)
      console.log(`     Destination: ${match.metadata?.destination}`)
    })
  }
}

if (require.main === module) {
  testConfidence().catch(console.error)
}

export { testConfidence }