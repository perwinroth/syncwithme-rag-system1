#!/usr/bin/env tsx
/**
 * Create comprehensive global corpus with positive/negative responses
 * Covers worldwide destinations with realistic conversation patterns
 */

import fs from 'fs'
import path from 'path'

interface CorpusEntry {
  query: string
  context: string
  response: string
  metadata: {
    activity_types: string[]
    location: string
    is_local: boolean
    season: string
    budget: string
    language: string
    tags: string[]
    response_type: 'positive' | 'negative' | 'mixed'
  }
}

// Global corpus with realistic positive/negative patterns
const globalCorpus: CorpusEntry[] = [
  // POSITIVE RESPONSES - Specific venues found
  {
    query: "broke students tokyo nightlife",
    context: "Tokyo has budget-friendly nightlife districts like Shibuya and Harajuku",
    response: "Golden Gai, Shinjuku, ¥500-1000 drinks, tiny bars. Robot Restaurant, Kabukicho, ¥8000 show, unique experience. Ameya-Yokocho, Ueno, ¥300-500 yakitori, market stalls. Shibuya clubs: Womb ¥3000, Contact ¥2500.",
    metadata: {
      activity_types: ["clubs", "bars", "nightlife"],
      location: "Tokyo, Japan",
      is_local: false,
      season: "any",
      budget: "low",
      language: "en",
      tags: ["students", "nightlife", "budget"],
      response_type: "positive"
    }
  },
  {
    query: "family restaurants melbourne",
    context: "Melbourne has diverse family-friendly dining options",
    response: "Chin Chin, 125 Flinders Ln, $25-35 per dish, Southeast Asian. The Eureka Skydeck, 7 Riverside Quay, $25 entry + restaurant, city views. Luna Park, 18 Lower Esplanade, $10-15 rides + food court. Kids menus available.",
    metadata: {
      activity_types: ["restaurants", "family"],
      location: "Melbourne, Australia", 
      is_local: false,
      season: "any",
      budget: "medium",
      language: "en",
      tags: ["family", "kids", "restaurants"],
      response_type: "positive"
    }
  },
  {
    query: "cheap museums dubai",
    context: "Dubai cultural attractions with budget options",
    response: "Dubai Museum, Al Fahidi Fort, AED 3 entry, historical exhibits. Etihad Museum, Jumeira, AED 25, UAE history. Al Shindagha Museum, Al Shindagha, AED 15, traditional culture. Emirates Palace free lobby visit.",
    metadata: {
      activity_types: ["museums", "culture"],
      location: "Dubai, UAE",
      is_local: false,
      season: "any",
      budget: "low",
      language: "en",
      tags: ["budget", "culture", "museums"],
      response_type: "positive"
    }
  },

  // NEGATIVE RESPONSES - Nothing suitable found
  {
    query: "vegan ice cream antarctica",
    context: "Antarctica has no commercial food establishments",
    response: "Sorry, there are no vegan ice cream shops in Antarctica. Antarctica has no permanent commercial establishments. The closest options would be in Ushuaia, Argentina (gateway city) with limited vegan options at cafés like Almacén Ramos Generales.",
    metadata: {
      activity_types: ["food", "vegan"],
      location: "Antarctica",
      is_local: false,
      season: "summer",
      budget: "any",
      language: "en",
      tags: ["vegan", "impossible", "remote"],
      response_type: "negative"
    }
  },
  {
    query: "24 hour nightclubs riyadh",
    context: "Riyadh nightlife is limited due to local regulations",
    response: "Riyadh doesn't have traditional nightclubs due to local laws. Alternatives: Al Nakheel Mall entertainment complex until 11pm, café culture at Tahlia Street, hotel lounges like Four Seasons. Consider daytime activities instead.",
    metadata: {
      activity_types: ["clubs", "nightlife"],
      location: "Riyadh, Saudi Arabia",
      is_local: false,
      season: "any", 
      budget: "any",
      language: "en",
      tags: ["nightlife", "cultural-restrictions"],
      response_type: "negative"
    }
  },
  {
    query: "beach clubs january moscow",
    context: "Moscow in January has extreme winter conditions",
    response: "No beach clubs operate in Moscow during January (-10°C average). Winter alternatives: Sanduny Baths, Neglinnaya St 14, traditional Russian banya experience. Gorky Park ice skating, free entry. Indoor pools at Radisson and Marriott hotels.",
    metadata: {
      activity_types: ["beach", "clubs"],
      location: "Moscow, Russia",
      is_local: false,
      season: "winter",
      budget: "any",
      language: "en",
      tags: ["winter", "seasonal-impossible"],
      response_type: "negative"
    }
  },

  // MIXED RESPONSES - Some options, but limitations
  {
    query: "luxury dining remote alaska",
    context: "Remote Alaska has limited high-end dining options",
    response: "Limited luxury options in remote Alaska. Anchorage: Simon & Seafort's, 420 L St, $35-55 entrees, seafood views. Juneau: Salt, 200 Seward St, $28-45, local ingredients. Most remote areas: local lodges only, call ahead. Bush planes required for access.",
    metadata: {
      activity_types: ["restaurants", "luxury"],
      location: "Alaska, USA",
      is_local: false,
      season: "summer",
      budget: "high",
      language: "en",
      tags: ["luxury", "remote", "limited-options"],
      response_type: "mixed"
    }
  },
  {
    query: "budget backpacker oslo",
    context: "Oslo is expensive but has some budget options for backpackers",
    response: "Oslo is very expensive. Budget options: Anker Hostel, Storgata 55, 250-400 NOK/night. Free activities: Vigeland Park sculptures, Aker Brygge waterfront walk. Cheap eats: Grønland district, 60-120 NOK meals. Many attractions 150-200 NOK entry.",
    metadata: {
      activity_types: ["hostels", "budget"],
      location: "Oslo, Norway",
      is_local: false,
      season: "any",
      budget: "low",
      language: "en", 
      tags: ["backpacker", "expensive-city", "limited-budget"],
      response_type: "mixed"
    }
  },

  // NON-ENGLISH RESPONSES
  {
    query: "billig mat stockholm studenter",
    context: "Stockholm har studentvänliga matställen i olika delar av staden",
    response: "Hermans Vegetariska, Fjällgatan 23B, 85-120 SEK buffé, vegetarisk. Nystekt Strömming, Södermalm, 45-65 SEK, stekt strömming. Tradition, Östgötagatan 33, 95-140 SEK, svensk husmanskost. Max Burgers, flera ställen, 60-85 SEK, svensk snabbmat.",
    metadata: {
      activity_types: ["restaurants", "food"],
      location: "Stockholm, Sweden",
      is_local: true,
      season: "any",
      budget: "low",
      language: "sv",
      tags: ["studenter", "billig", "mat"],
      response_type: "positive"
    }
  },
  {
    query: "restaurantes baratos buenos aires",
    context: "Buenos Aires tiene muchas opciones económicas para comer",
    response: "El Cuartito, Talcahuano 937, $500-800 pesos, pizza porteña. Los Inmortales, Corrientes 1369, $400-600, empanadas. Café Tortoni, Av. de Mayo 825, $300-500, histórico café. La Brigada, Estados Unidos 465, $800-1200, parrilla.",
    metadata: {
      activity_types: ["restaurants", "food"],
      location: "Buenos Aires, Argentina",
      is_local: false,
      season: "any",
      budget: "low", 
      language: "es",
      tags: ["baratos", "comida", "argentina"],
      response_type: "positive"
    }
  },

  // DIVERSE GLOBAL LOCATIONS
  {
    query: "hiking nairobi weekend",
    context: "Nairobi has nearby hiking options accessible for day trips",
    response: "Ngong Hills, 30km south, 500 KSH entry, rolling hills views. Karura Forest, Kiambu Road, free entry, urban forest trails. Mount Longonot, 90km northwest, 300 KSH + 2000 KSH guide, crater hike. Matatu transport 100-200 KSH each way.",
    metadata: {
      activity_types: ["hiking", "nature"],
      location: "Nairobi, Kenya",
      is_local: false,
      season: "any",
      budget: "low",
      language: "en",
      tags: ["hiking", "weekend", "nature"],
      response_type: "positive"
    }
  },
  {
    query: "late night food istanbul",
    context: "Istanbul has vibrant late-night street food culture",
    response: "Balık Ekmek, Galata Bridge, 15-25 TL, grilled fish sandwich. Döner stands, Taksim Square, 10-20 TL, late night kebabs. Simit vendors, throughout city, 3-5 TL, Turkish bagels. Taksim area open until 3-4am.",
    metadata: {
      activity_types: ["food", "street-food"],
      location: "Istanbul, Turkey",
      is_local: false,
      season: "any",
      budget: "low",
      language: "en",
      tags: ["late-night", "street-food", "budget"],
      response_type: "positive"
    }
  },
  {
    query: "winter surfing iceland",
    context: "Iceland has surfing but requires specialized equipment in winter",
    response: "Reykjanes Peninsula has winter surfing but requires 6mm+ wetsuit, boots, gloves. Temperatures 2-4°C water, -5°C air. Local guides: Arctic Surfers, 15000 ISK lesson + gear. Only for experienced surfers. Summer (June-August) recommended for beginners.",
    metadata: {
      activity_types: ["surfing", "extreme-sports"],
      location: "Iceland",
      is_local: false,
      season: "winter",
      budget: "high",
      language: "en",
      tags: ["extreme", "winter", "specialized"],
      response_type: "mixed"
    }
  },

  // MORE NEGATIVE EXAMPLES
  {
    query: "beach parties north pole",
    context: "North Pole is a remote Arctic location with no infrastructure",
    response: "No beach parties possible at the North Pole - it's Arctic ice with temperatures below -30°C. No beaches, no infrastructure, no access except scientific expeditions. Consider Arctic cruise destinations like Svalbard instead for unique Arctic experiences.",
    metadata: {
      activity_types: ["beach", "parties"],
      location: "North Pole",
      is_local: false,
      season: "any",
      budget: "any",
      language: "en",
      tags: ["impossible", "arctic", "no-infrastructure"],
      response_type: "negative"
    }
  },
  {
    query: "nightclubs sunday teheran",
    context: "Tehran nightlife is restricted and Sunday is beginning of work week",
    response: "Traditional nightclubs don't exist in Tehran due to local regulations. Sunday evening alternatives: tea houses like Azari Tea House, traditional Persian cafes, shopping malls like Iran Mall until 10pm. Consider cultural events at Vahdat Hall instead.",
    metadata: {
      activity_types: ["clubs", "nightlife"],
      location: "Tehran, Iran",
      is_local: false,
      season: "any",
      budget: "any",
      language: "en",
      tags: ["cultural-restrictions", "sunday", "alternatives"],
      response_type: "negative"
    }
  }
]

function createGlobalCorpus() {
  console.log('🌍 Creating global corpus with positive/negative responses...')
  
  const outputDir = path.join(process.cwd(), 'data', 'corpus')
  const outputFile = path.join(outputDir, 'global_corpus.jsonl')
  
  // Create directory if needed
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  // Convert to JSONL format
  const jsonlContent = globalCorpus.map(entry => JSON.stringify(entry)).join('\n')
  
  // Write to file
  fs.writeFileSync(outputFile, jsonlContent)
  
  console.log(`✅ Global corpus created: ${globalCorpus.length} entries`)
  console.log(`📁 Saved to: ${outputFile}`)
  
  // Statistics
  const stats = {
    responseTypes: globalCorpus.reduce((acc, entry) => {
      acc[entry.metadata.response_type] = (acc[entry.metadata.response_type] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    
    languages: globalCorpus.reduce((acc, entry) => {
      acc[entry.metadata.language] = (acc[entry.metadata.language] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    
    locations: [...new Set(globalCorpus.map(entry => entry.metadata.location))],
    activities: [...new Set(globalCorpus.flatMap(entry => entry.metadata.activity_types))],
    budgets: globalCorpus.reduce((acc, entry) => {
      acc[entry.metadata.budget] = (acc[entry.metadata.budget] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }
  
  console.log('\n📊 Corpus Statistics:')
  console.log(`Response types: ${Object.entries(stats.responseTypes).map(([type, count]) => `${type}(${count})`).join(', ')}`)
  console.log(`Languages: ${Object.entries(stats.languages).map(([lang, count]) => `${lang}(${count})`).join(', ')}`)
  console.log(`Locations: ${stats.locations.length} worldwide`)
  console.log(`Activity types: ${stats.activities.length}`)
  console.log(`Budgets: ${Object.entries(stats.budgets).map(([budget, count]) => `${budget}(${count})`).join(', ')}`)
  
  // Show sample of each response type
  console.log('\n📝 Sample entries by response type:')
  Object.keys(stats.responseTypes).forEach(responseType => {
    const sample = globalCorpus.find(entry => entry.metadata.response_type === responseType)
    if (sample) {
      console.log(`\n${responseType.toUpperCase()}:`)
      console.log(`Query: "${sample.query}"`)
      console.log(`Response: "${sample.response.substring(0, 100)}..."`)
      console.log(`Location: ${sample.metadata.location}`)
    }
  })
  
  return globalCorpus.length
}

if (require.main === module) {
  createGlobalCorpus()
}

export { createGlobalCorpus, globalCorpus }