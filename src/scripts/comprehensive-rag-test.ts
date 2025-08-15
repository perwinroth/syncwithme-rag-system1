#!/usr/bin/env tsx
/**
 * Comprehensive RAG System Test Suite
 * Tests multiple destinations, venues, and query patterns
 */

import { CloudVectorStore } from '../core/vector-store'
import { DualRAGSystem } from '../core/dual-rag-system'
import { SuccessPattern, Venue } from '../types'

// Define test cases covering various scenarios
const TEST_CASES = [
  // Berlin Tests
  {
    category: 'Berlin Nightlife',
    tests: [
      {
        query: 'berghain berlin nightclub',
        expectedVenue: 'Berghain',
        expectedAddress: 'Am Wriezener Bahnhof',
        expectedPrice: '€18-25'
      },
      {
        query: 'cheap techno clubs berlin',
        expectedVenues: ['Sisyphos', 'Club der Visionaere'],
        minResults: 2
      },
      {
        query: 'best underground techno berlin',
        expectedVenues: ['Berghain', 'Tresor', 'Sisyphos'],
        minResults: 2
      },
      {
        query: 'watergate berlin house music',
        expectedVenue: 'Watergate',
        expectedAddress: 'Falckensteinstraße'
      }
    ]
  },
  
  // Tokyo Tests
  {
    category: 'Tokyo Nightlife',
    tests: [
      {
        query: 'golden gai tokyo bars',
        expectedVenue: 'Golden Gai',
        expectedAddress: 'Kabukicho',
        expectedPrice: '¥500-1000'
      },
      {
        query: 'robot restaurant shinjuku',
        expectedVenue: 'Robot Restaurant',
        expectedPrice: '¥8000'
      },
      {
        query: 'tiny bars tokyo local experience',
        expectedVenue: 'Golden Gai',
        minResults: 1
      }
    ]
  },
  
  // London Tests
  {
    category: 'London Nightlife',
    tests: [
      {
        query: 'fabric london electronic music',
        expectedVenue: 'Fabric',
        expectedAddress: 'Charterhouse St',
        expectedPrice: '£15-25'
      },
      {
        query: 'best techno clubs london',
        expectedVenue: 'Fabric',
        minResults: 1
      }
    ]
  },
  
  // Budget-based Tests
  {
    category: 'Budget Queries',
    tests: [
      {
        query: 'cheap nightlife berlin under 15 euros',
        expectedVenues: ['Sisyphos', 'Club der Visionaere'],
        maxPrice: 15,
        minResults: 1
      },
      {
        query: 'luxury experience tokyo money no object',
        minResults: 1,
        budgetTier: 'luxury'
      }
    ]
  },
  
  // Negative Tests (Should handle gracefully)
  {
    category: 'Edge Cases',
    tests: [
      {
        query: 'techno clubs in antarctica',
        expectNoResults: true
      },
      {
        query: 'berghain advance tickets online booking',
        shouldWarn: 'Pay at door only'
      }
    ]
  },
  
  // Complex Natural Language
  {
    category: 'Natural Language',
    tests: [
      {
        query: 'I want to party in Berlin this weekend, love techno, dont want to spend too much',
        expectedVenues: ['Sisyphos', 'Club der Visionaere', 'Tresor'],
        minResults: 2
      },
      {
        query: 'Planning a trip to Tokyo, want authentic local bar experience not touristy',
        expectedVenue: 'Golden Gai',
        minResults: 1
      },
      {
        query: 'First time in London, where do electronic music fans go?',
        expectedVenue: 'Fabric',
        minResults: 1
      }
    ]
  }
]

async function runComprehensiveTests() {
  console.log('🧪 COMPREHENSIVE RAG SYSTEM TEST SUITE\n')
  console.log('=' .repeat(60) + '\n')
  
  const vectorStore = new CloudVectorStore()
  await vectorStore.initialize()
  
  const ragSystem = new DualRAGSystem()
  await ragSystem.initialize()
  
  let totalTests = 0
  let passedTests = 0
  let failedTests: any[] = []
  
  for (const category of TEST_CASES) {
    console.log(`\n📋 ${category.category.toUpperCase()}`)
    console.log('-'.repeat(40))
    
    for (const test of category.tests) {
      totalTests++
      console.log(`\nTest ${totalTests}: "${test.query.slice(0, 50)}..."`)
      
      try {
        // Test both vector store directly and full RAG system
        
        // 1. Vector Store Test
        const vectorResults = await vectorStore.querySuccessPatterns(
          test.query,
          test.budgetTier ? { budgetTier: test.budgetTier } : {}
        )
        
        // 2. Full RAG System Test
        const ragResponse = await ragSystem.query({
          userMessage: test.query,
          conversationContext: []
        })
        
        // Validate results
        let testPassed = true
        let failureReasons: string[] = []
        
        // Check vector store results
        if (test.expectNoResults) {
          if (vectorResults.length > 0) {
            testPassed = false
            failureReasons.push('Expected no results but got some')
          }
        } else if (test.minResults) {
          if (vectorResults.length < test.minResults) {
            testPassed = false
            failureReasons.push(`Expected ${test.minResults} results, got ${vectorResults.length}`)
          }
        }
        
        // Check for specific venues
        if (vectorResults.length > 0 && !test.expectNoResults) {
          const pattern = vectorResults[0].content as SuccessPattern
          const venues = pattern.venues || []
          
          if (test.expectedVenue) {
            const found = venues.find(v => 
              v.name.toLowerCase().includes(test.expectedVenue.toLowerCase())
            )
            if (!found) {
              testPassed = false
              failureReasons.push(`Expected venue "${test.expectedVenue}" not found`)
            } else {
              // Check additional properties if specified
              if (test.expectedAddress && !found.address?.includes(test.expectedAddress)) {
                testPassed = false
                failureReasons.push(`Address mismatch for ${test.expectedVenue}`)
              }
              if (test.expectedPrice && found.priceRange !== test.expectedPrice) {
                testPassed = false
                failureReasons.push(`Price mismatch: expected ${test.expectedPrice}, got ${found.priceRange}`)
              }
            }
          }
          
          if (test.expectedVenues) {
            const foundVenues = venues.map(v => v.name)
            const missingVenues = test.expectedVenues.filter(expected =>
              !foundVenues.some(found => found.toLowerCase().includes(expected.toLowerCase()))
            )
            if (missingVenues.length > 0) {
              testPassed = false
              failureReasons.push(`Missing venues: ${missingVenues.join(', ')}`)
            }
          }
          
          if (test.maxPrice) {
            const overPricedVenues = venues.filter(v => {
              const price = parseInt(v.priceRange?.match(/\d+/)?.[0] || '0')
              return price > test.maxPrice
            })
            if (overPricedVenues.length > 0) {
              testPassed = false
              failureReasons.push(`Venues over budget: ${overPricedVenues.map(v => v.name).join(', ')}`)
            }
          }
        }
        
        // Check RAG response quality
        if (ragResponse.confidence < 0.5 && !test.expectNoResults) {
          testPassed = false
          failureReasons.push(`Low confidence: ${ragResponse.confidence.toFixed(2)}`)
        }
        
        // Display results
        if (testPassed) {
          console.log('  ✅ PASSED')
          passedTests++
          
          if (vectorResults.length > 0 && !test.expectNoResults) {
            const pattern = vectorResults[0].content as SuccessPattern
            const topVenue = pattern.venues?.[0]
            if (topVenue) {
              console.log(`     Found: ${topVenue.name} - ${topVenue.priceRange} at ${topVenue.address || 'N/A'}`)
            }
          }
          console.log(`     RAG Confidence: ${ragResponse.confidence.toFixed(2)}`)
        } else {
          console.log('  ❌ FAILED')
          failureReasons.forEach(reason => console.log(`     - ${reason}`))
          
          failedTests.push({
            query: test.query,
            reasons: failureReasons,
            vectorResults: vectorResults.length,
            ragConfidence: ragResponse.confidence
          })
        }
        
      } catch (error: any) {
        console.log('  ❌ ERROR:', error.message)
        failedTests.push({
          query: test.query,
          error: error.message
        })
      }
    }
  }
  
  // Final Report
  console.log('\n' + '='.repeat(60))
  console.log('📊 TEST RESULTS SUMMARY')
  console.log('='.repeat(60))
  console.log(`Total Tests: ${totalTests}`)
  console.log(`Passed: ${passedTests} (${((passedTests/totalTests)*100).toFixed(1)}%)`)
  console.log(`Failed: ${failedTests.length} (${((failedTests.length/totalTests)*100).toFixed(1)}%)`)
  
  if (failedTests.length > 0) {
    console.log('\n❌ FAILED TESTS DETAIL:')
    failedTests.forEach((test, i) => {
      console.log(`\n${i + 1}. "${test.query.slice(0, 50)}..."`)
      if (test.reasons) {
        test.reasons.forEach((r: string) => console.log(`   - ${r}`))
      }
      if (test.error) {
        console.log(`   Error: ${test.error}`)
      }
    })
  }
  
  // Check index stats
  console.log('\n📈 PINECONE INDEX STATS:')
  const stats = await vectorStore.getStats()
  console.log(`Total Vectors: ${stats.totalRecordCount}`)
  console.log(`Dimensions: ${stats.dimension}`)
  
  // Success criteria
  const successRate = (passedTests / totalTests) * 100
  console.log('\n' + '='.repeat(60))
  if (successRate >= 80) {
    console.log('🎉 RAG SYSTEM TEST SUITE PASSED!')
    console.log('The system is returning specific venues with high accuracy.')
  } else if (successRate >= 60) {
    console.log('⚠️  RAG SYSTEM PARTIALLY WORKING')
    console.log('Some tests are passing but needs improvement.')
  } else {
    console.log('❌ RAG SYSTEM NEEDS FIXING')
    console.log('Most tests are failing. Check the vector metadata and format.')
  }
  
  return {
    total: totalTests,
    passed: passedTests,
    failed: failedTests.length,
    successRate
  }
}

if (require.main === module) {
  runComprehensiveTests().catch(console.error)
}

export { runComprehensiveTests }