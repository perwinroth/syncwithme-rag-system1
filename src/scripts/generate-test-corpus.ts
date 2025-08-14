#!/usr/bin/env tsx
/**
 * Generate small test corpus to verify format and processing
 */

import fs from 'fs'
import path from 'path'
import { OpenAI } from 'openai'
import { CONFIG } from '../config'

const openai = new OpenAI({
  apiKey: CONFIG.openai.apiKey
})

const SYSTEM_PROMPT = `Generate a small test dataset for RAG training.

Output format: JSON Lines (one JSON object per line). Do NOT include code fences or extra prose.

Each line must follow:
{
  "query": "<natural user request planning an activity>",
  "context": "<brief grounding with generic facts>",
  "response": "<helpful plan with SPECIFIC venues, addresses, prices>",
  "metadata": {
    "activity_types": ["clubs", "museums", "restaurants", etc],
    "location": "<city, region>",
    "is_local": true|false,
    "season": "any|spring|summer|autumn|winter",
    "budget": "low|medium|high|any",
    "language": "en|sv",
    "tags": ["family","date-night","solo","group","kids","budget"]
  }
}

Critical: Include SPECIFIC venue details like "Berghain, Friedrichshain, €20, techno club" not generic responses.
Focus on patterns like "broke students [city] [activity]" that return real venue recommendations.
Mix English and Swedish (20% Swedish).`

async function generateTestCorpus() {
  console.log('🧪 Generating test corpus (50 entries)...')
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: 'Generate 50 JSONL lines focusing on diverse activities with specific venue details. Include "broke students" scenarios in Berlin, Stockholm, London.' }
      ],
      max_tokens: 3000,
      temperature: 0.8
    })

    const content = response.choices[0].message.content || ''
    
    // Validate and clean JSONL
    const lines = content.split('\n').filter(line => line.trim())
    const validLines = lines.filter(line => {
      try {
        const parsed = JSON.parse(line)
        return parsed.query && parsed.response && parsed.metadata
      } catch {
        return false
      }
    })

    // Save test corpus
    const outputPath = path.join(process.cwd(), 'data', 'corpus', 'test_corpus.jsonl')
    fs.writeFileSync(outputPath, validLines.join('\n'))

    console.log(`✅ Test corpus generated: ${validLines.length} entries`)
    console.log(`📁 Saved to: ${outputPath}`)

    // Show samples
    const samples = validLines.slice(0, 3).map(line => JSON.parse(line))
    console.log('\n📝 Sample entries:')
    samples.forEach((entry, i) => {
      console.log(`\n${i + 1}. Query: "${entry.query}"`)
      console.log(`   Response: "${entry.response.substring(0, 120)}..."`)
      console.log(`   Location: ${entry.metadata.location}, Budget: ${entry.metadata.budget}`)
      console.log(`   Tags: ${entry.metadata.tags.join(', ')}`)
    })

    return validLines.length
    
  } catch (error) {
    console.error('❌ Error generating test corpus:', error)
    return 0
  }
}

if (require.main === module) {
  generateTestCorpus().then(count => {
    console.log(`\n🎉 Test corpus complete: ${count} entries generated`)
  })
}

export { generateTestCorpus }