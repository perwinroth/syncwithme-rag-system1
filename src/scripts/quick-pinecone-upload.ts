#!/usr/bin/env tsx
/**
 * Quick batch upload to Pinecone - optimized for large datasets
 */

import { Pinecone } from '@pinecone-database/pinecone'
import { OpenAI } from 'openai'
import fs from 'fs'
import path from 'path'
import { CONFIG } from '../config'

const openai = new OpenAI({ apiKey: CONFIG.openai.apiKey })
const pc = new Pinecone({ apiKey: CONFIG.pinecone.apiKey })

interface CorpusEntry {
  query: string
  context: string
  response: string
  metadata: any
}

async function quickUpload() {
  console.log('🚀 Quick upload of massive corpus to Pinecone...')
  
  // Load the massive corpus
  const corpusPath = path.join(process.cwd(), 'data', 'corpus', 'massive_global_corpus_10k.jsonl')
  
  if (!fs.existsSync(corpusPath)) {
    console.error('❌ Massive corpus not found')
    return
  }
  
  const corpusContent = fs.readFileSync(corpusPath, 'utf-8')
  const corpus: CorpusEntry[] = corpusContent
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line))
  
  console.log(`📊 Processing ${corpus.length} entries...`)
  
  // Get index
  const index = pc.index(CONFIG.pinecone.indexName)
  
  // Process in smaller batches for reliability
  const BATCH_SIZE = 50
  let processed = 0
  
  for (let i = 0; i < corpus.length; i += BATCH_SIZE) {
    const batch = corpus.slice(i, i + BATCH_SIZE)
    console.log(`📤 Uploading batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(corpus.length/BATCH_SIZE)} (${batch.length} entries)...`)
    
    try {
      // Create vectors for this batch
      const vectors = []
      
      for (let j = 0; j < batch.length; j++) {
        const entry = batch[j]
        
        // Create embedding for the query
        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-3-large',
          input: entry.query,
          dimensions: 2048
        })
        
        const vector = {
          id: `quick_${i + j}_${Date.now()}`,
          values: embeddingResponse.data[0].embedding,
          metadata: {
            type: 'massive_corpus',
            query: entry.query.substring(0, 500),
            response: entry.response.substring(0, 1000),
            location: entry.metadata.location,
            activity: entry.metadata.activity_types[0] || 'general',
            budget: entry.metadata.budget,
            response_type: entry.metadata.response_type,
            language: entry.metadata.language
          }
        }
        
        vectors.push(vector)
      }
      
      // Upload batch to Pinecone
      await index.upsert(vectors)
      processed += batch.length
      
      console.log(`✅ Uploaded batch. Total processed: ${processed}/${corpus.length}`)
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000))
      
    } catch (error) {
      console.error(`❌ Failed to upload batch starting at ${i}:`, error)
      // Continue with next batch
    }
  }
  
  console.log(`🎉 Upload complete! Processed ${processed}/${corpus.length} entries`)
  
  // Test the upload
  console.log('🧪 Testing upload...')
  const testResults = await index.query({
    vector: Array(2048).fill(0.1), // Dummy vector
    topK: 3,
    includeMetadata: true
  })
  
  console.log(`✅ Found ${testResults.matches?.length || 0} vectors in index`)
  if (testResults.matches && testResults.matches.length > 0) {
    console.log('Sample result:', {
      id: testResults.matches[0].id,
      query: testResults.matches[0].metadata?.query,
      location: testResults.matches[0].metadata?.location
    })
  }
}

if (require.main === module) {
  quickUpload().catch(console.error)
}

export { quickUpload }