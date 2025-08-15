#!/usr/bin/env tsx
/**
 * Debug Pinecone - See what's actually in there
 */

import { Pinecone } from '@pinecone-database/pinecone'
import { OpenAI } from 'openai'
import { CONFIG } from '../config'

const pc = new Pinecone({ apiKey: CONFIG.pinecone.apiKey })
const openai = new OpenAI({ apiKey: CONFIG.openai.apiKey })

async function debugPinecone() {
  console.log('🔍 Debugging Pinecone contents...\n')
  
  const index = pc.index(CONFIG.pinecone.indexName)
  
  // Get index stats
  const stats = await index.describeIndexStats()
  console.log('📊 Index Stats:')
  console.log(`Total vectors: ${stats.totalRecordCount}`)
  console.log(`Dimensions: ${stats.dimension}`)
  console.log('')
  
  // Create a proper test vector with correct dimensions
  console.log('🧪 Creating test embedding for "berlin techno clubs"...')
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: 'berlin techno clubs',
    dimensions: 2048
  })
  const testVector = embeddingResponse.data[0].embedding
  
  // Query without any filters to see what's there
  console.log('📥 Querying for ANY vectors (no filters)...')
  const anyResults = await index.query({
    vector: testVector,
    topK: 5,
    includeMetadata: true
  })
  
  console.log(`\nFound ${anyResults.matches?.length || 0} matches without filters:`)
  anyResults.matches?.forEach((match, i) => {
    console.log(`\n${i + 1}. ID: ${match.id}`)
    console.log(`   Score: ${match.score}`)
    console.log(`   Metadata keys: ${Object.keys(match.metadata || {}).join(', ')}`)
    if (match.metadata?.type) {
      console.log(`   Type: ${match.metadata.type}`)
    }
    if (match.metadata?.destination) {
      console.log(`   Destination: ${match.metadata.destination}`)
    }
    if (match.metadata?.query) {
      console.log(`   Query: ${match.metadata.query?.substring(0, 50)}...`)
    }
  })
  
  // Try with success_pattern filter
  console.log('\n📥 Querying with type="success_pattern" filter...')
  const successResults = await index.query({
    vector: testVector,
    topK: 5,
    includeMetadata: true,
    filter: { type: { $eq: 'success_pattern' } }
  })
  
  console.log(`Found ${successResults.matches?.length || 0} success patterns`)
  
  // Try with massive_corpus filter
  console.log('\n📥 Querying with type="massive_corpus" filter...')
  const massiveResults = await index.query({
    vector: testVector,
    topK: 5,
    includeMetadata: true,
    filter: { type: { $eq: 'massive_corpus' } }
  })
  
  console.log(`Found ${massiveResults.matches?.length || 0} massive corpus entries`)
  
  // Try to find vectors by ID patterns
  console.log('\n🔍 Checking ID patterns in the index...')
  const idPrefixes = new Set<string>()
  
  // Sample more vectors to understand ID patterns
  const sampleResults = await index.query({
    vector: testVector,
    topK: 100,
    includeMetadata: false
  })
  
  sampleResults.matches?.forEach(match => {
    const prefix = match.id.split('_')[0]
    idPrefixes.add(prefix)
  })
  
  console.log(`\nUnique ID prefixes found: ${Array.from(idPrefixes).join(', ')}`)
  
  // Check if we can find berlin-specific data
  console.log('\n🏙️ Searching for Berlin-specific content...')
  const berlinResults = await index.query({
    vector: testVector,
    topK: 10,
    includeMetadata: true,
    filter: { 
      $or: [
        { destination: { $eq: 'berlin' } },
        { location: { $eq: 'berlin' } },
        { destination: { $eq: 'Berlin' } }
      ]
    }
  })
  
  console.log(`Found ${berlinResults.matches?.length || 0} Berlin-related vectors`)
  if (berlinResults.matches && berlinResults.matches.length > 0) {
    console.log('\nSample Berlin match:')
    const match = berlinResults.matches[0]
    console.log(`  ID: ${match.id}`)
    console.log(`  Metadata: ${JSON.stringify(match.metadata, null, 2)}`)
  }
  
  // Final diagnosis
  console.log('\n\n🏁 DIAGNOSIS:')
  console.log('==============')
  if (anyResults.matches && anyResults.matches.length > 0) {
    const sampleMetadata = anyResults.matches[0].metadata
    console.log('✅ Vectors exist in Pinecone')
    console.log(`📝 Metadata structure: ${JSON.stringify(Object.keys(sampleMetadata || {}), null, 2)}`)
    
    if (!successResults.matches || successResults.matches.length === 0) {
      console.log('❌ But no "success_pattern" type found')
      console.log('   The metadata type field is: ' + sampleMetadata?.type)
    }
    
    if (berlinResults.matches && berlinResults.matches.length > 0) {
      console.log('✅ Berlin data exists')
    } else {
      console.log('❌ No Berlin-specific data found with filters')
    }
  } else {
    console.log('❌ No vectors found at all!')
  }
}

if (require.main === module) {
  debugPinecone().catch(console.error)
}

export { debugPinecone }