#!/usr/bin/env tsx
/**
 * Check if new format vectors are being uploaded correctly
 */

import { Pinecone } from '@pinecone-database/pinecone'
import { OpenAI } from 'openai'
import { CONFIG } from '../config'

const pc = new Pinecone({ apiKey: CONFIG.pinecone.apiKey })
const openai = new OpenAI({ apiKey: CONFIG.openai.apiKey })

async function checkNewFormat() {
  const index = pc.index(CONFIG.pinecone.indexName)
  
  // Create test vector
  console.log('Creating test embedding...')
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: 'berghain berlin',
    dimensions: 2048
  })
  const testVector = embeddingResponse.data[0].embedding
  
  // Query for success_pattern type
  console.log('\nLooking for success_pattern vectors...')
  const results = await index.query({
    vector: testVector,
    topK: 5,
    includeMetadata: true,
    filter: { type: { $eq: 'success_pattern' } }
  })
  
  console.log(`Found ${results.matches?.length || 0} success_pattern vectors`)
  
  if (results.matches && results.matches.length > 0) {
    console.log('\nFirst success_pattern match:')
    console.log('  ID:', results.matches[0].id)
    console.log('  Score:', results.matches[0].score)
    console.log('  Metadata keys:', Object.keys(results.matches[0].metadata || {}))
    
    // Check if venues field exists
    if (results.matches[0].metadata?.venues) {
      console.log('  ✅ Has venues field!')
      try {
        const venues = JSON.parse(results.matches[0].metadata.venues as string)
        console.log('  First venue:', JSON.stringify(venues[0], null, 2))
      } catch (e: any) {
        console.log('  ❌ Error parsing venues:', e.message)
      }
    } else {
      console.log('  ❌ No venues field')
    }
    
    // Check destination field
    if (results.matches[0].metadata?.destination) {
      console.log('  ✅ Has destination field:', results.matches[0].metadata.destination)
    } else {
      console.log('  ❌ No destination field')
    }
  }
  
  // Check for corpus_ prefixed IDs (from new upload)
  console.log('\nLooking for corpus_ prefixed vectors...')
  const corpusResults = await index.query({
    vector: testVector,
    topK: 200,
    includeMetadata: false
  })
  
  const corpusCount = corpusResults.matches?.filter(m => m.id.startsWith('corpus_')).length || 0
  const languageCorpusCount = corpusResults.matches?.filter(m => m.id.startsWith('corpus_lang_')).length || 0
  
  console.log(`Found ${corpusCount} corpus_ prefixed vectors`)
  console.log(`Found ${languageCorpusCount} corpus_lang_ prefixed vectors`)
  
  // Check ID patterns
  const idPrefixes = new Set<string>()
  corpusResults.matches?.forEach(match => {
    const prefix = match.id.split('_')[0]
    idPrefixes.add(prefix)
  })
  
  console.log('\nAll ID prefixes in index:', Array.from(idPrefixes).join(', '))
  
  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('SUMMARY:')
  if (results.matches && results.matches.length > 0 && 
      results.matches[0].metadata?.venues && 
      results.matches[0].metadata?.destination) {
    console.log('✅ New format vectors are being uploaded correctly!')
    console.log('   The final-fix-upload script is working.')
  } else {
    console.log('⚠️  New format not fully detected yet.')
    console.log('   Upload may still be in progress.')
  }
  
  if (corpusCount > 0) {
    console.log(`✅ ${corpusCount} new corpus vectors uploaded so far`)
  }
}

if (require.main === module) {
  checkNewFormat().catch(console.error)
}

export { checkNewFormat }