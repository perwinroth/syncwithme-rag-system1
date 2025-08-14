// Quick test of the RAG system
const fetch = require('node-fetch');

async function testRAG() {
  try {
    console.log('🧪 Testing RAG system locally...\n');
    
    // Test the health endpoint
    const healthResponse = await fetch('http://localhost:3005/health');
    const health = await healthResponse.json();
    console.log('✅ Health check:', health);
    
    // Test the RAG query
    const testQuery = {
      userMessage: "looking for techno clubs in berlin, we are broke students"
    };
    
    console.log('\n🔍 Testing query:', testQuery.userMessage);
    
    const ragResponse = await fetch('http://localhost:3005/api/rag/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testQuery)
    });
    
    if (!ragResponse.ok) {
      throw new Error(`HTTP ${ragResponse.status}: ${ragResponse.statusText}`);
    }
    
    const result = await ragResponse.json();
    
    console.log('\n🎯 RAG Results:');
    console.log('Intent:', {
      destination: result.intent.destination,
      interests: result.intent.interests,
      budgetTier: result.intent.budgetTier,
      confidence: result.intent.confidence
    });
    
    console.log('\n🏛️ Recommended Venues:');
    result.recommendations.venues.forEach(venue => {
      console.log(`  • ${venue.name} (${venue.type})`);
      console.log(`    📍 ${venue.address || 'Address TBD'}`);
      console.log(`    💰 ${venue.priceRange}`);
      console.log(`    ⭐ ${venue.rating}/5`);
      console.log('');
    });
    
    console.log('🎯 Overall Confidence:', `${Math.round(result.confidence * 100)}%`);
    console.log('⚡ Processing Time:', `${result.processingTime}ms`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRAG();