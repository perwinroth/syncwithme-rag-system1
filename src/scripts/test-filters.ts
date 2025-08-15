#!/usr/bin/env tsx
/**
 * Test filter functionality
 */

import { CloudVectorStore } from '../core/vector-store'
import { SuccessPattern } from '../types'

async function testFilters() {
  console.log('🔍 Testing CloudVectorStore filters\n')
  
  const vectorStore = new CloudVectorStore()
  await vectorStore.initialize()
  
  // Test 1: Berlin with filter
  console.log('Test 1: Query "berghain" WITH destination=berlin filter')
  const results1 = await vectorStore.querySuccessPatterns(
    'berghain',
    { destination: 'berlin' }
  )
  console.log(`  Results: ${results1.length}`)
  if (results1.length > 0) {
    const pattern = results1[0].content as SuccessPattern
    console.log(`  First venue: ${pattern.venues?.[0]?.name}`)
    console.log(`  Destination: ${pattern.destination}`)
  }
  
  // Test 2: Berlin without filter
  console.log('\nTest 2: Query "berghain" WITHOUT filter')
  const results2 = await vectorStore.querySuccessPatterns('berghain', {})
  console.log(`  Results: ${results2.length}`)
  if (results2.length > 0) {
    const pattern = results2[0].content as SuccessPattern
    console.log(`  First venue: ${pattern.venues?.[0]?.name}`)
    console.log(`  Destination: ${pattern.destination}`)
  }
  
  // Test 3: Full query with filter
  console.log('\nTest 3: Query "berghain berlin techno" WITH destination=berlin')
  const results3 = await vectorStore.querySuccessPatterns(
    'berghain berlin techno',
    { destination: 'berlin' }
  )
  console.log(`  Results: ${results3.length}`)
  if (results3.length > 0) {
    const pattern = results3[0].content as SuccessPattern
    console.log(`  First venue: ${pattern.venues?.[0]?.name}`)
    console.log(`  Confidence: ${results3[0].confidence}`)
  }
  
  // Test 4: Check confidence threshold
  console.log('\nTest 4: Checking confidence threshold')
  console.log(`  CONFIG.rag.confidenceThreshold: ${(await import('../config')).CONFIG.rag.confidenceThreshold}`)
  
  // Test 5: Try simpler query
  console.log('\nTest 5: Simple query "nightclub" WITH destination=berlin')
  const results5 = await vectorStore.querySuccessPatterns(
    'nightclub',
    { destination: 'berlin' }
  )
  console.log(`  Results: ${results5.length}`)
  if (results5.length > 0) {
    const pattern = results5[0].content as SuccessPattern
    console.log(`  First venue: ${pattern.venues?.[0]?.name}`)
    console.log(`  Confidence: ${results5[0].confidence}`)
  }
}

if (require.main === module) {
  testFilters().catch(console.error)
}

export { testFilters }