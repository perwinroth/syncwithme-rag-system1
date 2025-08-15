#!/usr/bin/env tsx
/**
 * Quick test to check if Berghain and other specific venues are showing up
 */

import { CloudVectorStore } from '../core/vector-store'
import { SuccessPattern } from '../types'

const QUICK_TESTS = [
  { query: 'berghain berlin techno', expected: 'Berghain', destination: 'berlin' },
  { query: 'sisyphos berlin outdoor', expected: 'Sisyphos', destination: 'berlin' },
  { query: 'tresor berlin underground', expected: 'Tresor', destination: 'berlin' },
  { query: 'watergate berlin house', expected: 'Watergate', destination: 'berlin' },
  { query: 'golden gai tokyo bars', expected: 'Golden Gai', destination: 'tokyo' },
  { query: 'fabric london electronic', expected: 'Fabric', destination: 'london' },
  { query: 'cheap berlin nightlife', expected: ['Sisyphos', 'Club der Visionaere'], destination: 'berlin' }
]

async function quickTest() {
  console.log('⚡ QUICK RAG TEST - Checking key venues\n')
  
  const vectorStore = new CloudVectorStore()
  await vectorStore.initialize()
  
  let passed = 0
  let failed = 0
  
  for (const test of QUICK_TESTS) {
    console.log(`\nTesting: "${test.query}"`)
    console.log(`Expected: ${Array.isArray(test.expected) ? test.expected.join(' or ') : test.expected}`)
    
    const filters = test.destination ? { destination: test.destination } : {}
    const results = await vectorStore.querySuccessPatterns(test.query, filters)
    
    if (results.length === 0) {
      console.log('❌ No results found')
      failed++
    } else {
      const pattern = results[0].content as SuccessPattern
      const venues = pattern.venues || []
      const venueNames = venues.map(v => v.name).join(', ')
      
      const expectedArray = Array.isArray(test.expected) ? test.expected : [test.expected]
      const found = expectedArray.some(exp => 
        venues.some(v => v.name.toLowerCase().includes(exp.toLowerCase()))
      )
      
      if (found) {
        console.log(`✅ Found: ${venueNames}`)
        console.log(`   Confidence: ${results[0].confidence.toFixed(2)}`)
        if (venues[0].address) {
          console.log(`   Address: ${venues[0].address}`)
        }
        if (venues[0].priceRange) {
          console.log(`   Price: ${venues[0].priceRange}`)
        }
        passed++
      } else {
        console.log(`❌ Wrong result: ${venueNames}`)
        failed++
      }
    }
  }
  
  console.log('\n' + '='.repeat(50))
  console.log(`Results: ${passed}/${QUICK_TESTS.length} passed`)
  console.log(`Success Rate: ${((passed/QUICK_TESTS.length)*100).toFixed(1)}%`)
  
  if (passed === QUICK_TESTS.length) {
    console.log('🎉 All key venues are showing up correctly!')
  } else if (passed > QUICK_TESTS.length / 2) {
    console.log('⚠️  Some venues are working, but not all')
  } else {
    console.log('❌ Most venues are not showing up correctly')
  }
}

if (require.main === module) {
  quickTest().catch(console.error)
}

export { quickTest }