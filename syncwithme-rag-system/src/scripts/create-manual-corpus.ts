#!/usr/bin/env tsx
/**
 * Create a reliable initial corpus with proven patterns
 * This ensures we have working data while the automated generation runs
 */

import fs from 'fs'
import path from 'path'

// Global seed corpus with positive AND negative responses for realistic training
const seedCorpus = [
  {
    query: "broke students berlin clubs",
    context: "Berlin nightlife scene popular with students and budget travelers",
    response: "Sisyphos, Hauptstraße 15, €15-20 entry, techno club with garden. About Blank, Markgrafendamm 24c, €10-15 entry, alternative warehouse venue. Watergate, Falckensteinstr. 49, €12-18, waterfront location. Student discounts available with ID.",
    metadata: {
      activity_types: ["clubs", "nightlife"],
      location: "Berlin, Germany",
      is_local: false,
      season: "any",
      budget: "low",
      language: "en",
      tags: ["budget", "students", "nightlife", "group"]
    }
  },
  {
    query: "budget stockholm museums",
    context: "Stockholm has many affordable cultural attractions",
    response: "Moderna Museet, Exercisplan 4, Free entry, contemporary art. Fotografiska, Stadsgårdshamnen 22, 165 SEK, photography exhibitions. Vasa Museum, Galärvarvsvägen 14, 150 SEK, historic ship. Student discounts available.",
    metadata: {
      activity_types: ["museums", "culture"],
      location: "Stockholm, Sweden", 
      is_local: false,
      season: "any",
      budget: "low",
      language: "en",
      tags: ["budget", "culture", "museums", "solo"]
    }
  },
  {
    query: "billiga restauranger stockholm studenter",
    context: "Stockholm har många prisvärda alternativ för studenter",
    response: "Hermans Vegetariska, Fjällgatan 23B, 85-120 SEK, vegetarisk buffé. Tradition, Östgötagatan 33, 95-140 SEK, svensk husmanskost. Café String, Nytorgsgatan 38, 65-95 SEK, lunch och fika. Studentrabatt på många ställen.",
    metadata: {
      activity_types: ["restaurants", "food"],
      location: "Stockholm, Sweden",
      is_local: true,
      season: "any", 
      budget: "low",
      language: "sv",
      tags: ["budget", "students", "food", "local"]
    }
  },
  {
    query: "cheap london pubs students",
    context: "London pub scene with budget-friendly options for students",
    response: "The George Tavern, 373 Commercial Rd, £3-5 pints, live music venue. The Pitcher & Piano, multiple locations, £4-6 drinks, student nights. Wetherspoons locations citywide, £2-4 pints, food deals. Check student discount apps.",
    metadata: {
      activity_types: ["pubs", "nightlife"],
      location: "London, UK",
      is_local: false,
      season: "any",
      budget: "low",
      language: "en",
      tags: ["budget", "students", "pubs", "group"]
    }
  },
  {
    query: "paris museums date night budget",
    context: "Paris cultural scene for romantic outings on a budget",
    response: "Musée d'Orsay, 1 Rue de la Légion d'Honneur, €16 adults, impressionist art. Sainte-Chapelle, 8 Bd du Palais, €11.50, stunning stained glass. Musée Rodin, 77 Rue de Varenne, €14, sculpture garden. Evening discounts after 6pm.",
    metadata: {
      activity_types: ["museums", "culture"],
      location: "Paris, France",
      is_local: false,
      season: "any",
      budget: "medium",
      language: "en",
      tags: ["date-night", "culture", "romantic"]
    }
  },
  {
    query: "family activities amsterdam rainy day",
    context: "Indoor family-friendly attractions in Amsterdam",
    response: "NEMO Science Museum, Oosterdok 2, €17.50 adults, interactive exhibits. Anne Frank House, Prinsengracht 263, €16 adults, advance booking required. Rijksmuseum, Museumstraat 1, €22.50 adults, art and history. Kids under 18 free.",
    metadata: {
      activity_types: ["museums", "family"],
      location: "Amsterdam, Netherlands",
      is_local: false,
      season: "any",
      budget: "medium",
      language: "en",
      tags: ["family", "kids", "rainy-day", "museums"]
    }
  },
  {
    query: "weekend hiking near munich",
    context: "Day hiking accessible from Munich by public transport",
    response: "Königssee, Schönau am Königssee, €8.50 boat ride, alpine lake hiking. Garmisch-Partenkirchen, train €25 return, mountain trails. Chiemsee, regional train €15, lakeside walks. Hiking maps available at tourist offices.",
    metadata: {
      activity_types: ["hiking", "nature"],
      location: "Munich, Germany",
      is_local: false,
      season: "spring,summer,autumn",
      budget: "low",
      language: "en",
      tags: ["outdoor", "hiking", "weekend", "nature"]
    }
  },
  {
    query: "barcelona beach clubs summer",
    context: "Barcelona beach club scene during summer season",
    response: "Opium Barcelona, Passeig Marítim 34, €15-25 entry, beachfront location. Pacha Barcelona, Av. Gregorio Marañón 17, €20-30, famous club brand. W Hotel Eclipse Bar, Plaça de la Rosa dels Vents 1, €12-18 drinks, rooftop views. Summer season May-September.",
    metadata: {
      activity_types: ["clubs", "beach"],
      location: "Barcelona, Spain",
      is_local: false,
      season: "summer",
      budget: "medium",
      language: "en",
      tags: ["beach", "summer", "nightlife", "group"]
    }
  },
  {
    query: "coffee shops work amsterdam",
    context: "Laptop-friendly coffee shops for remote work in Amsterdam",
    response: "Coffee & Coconuts, Ceintuurbaan 282-284, €3-5 coffee, workspace area. Koffie ende Koeck, Haarlemmerstraat 96, €2.50-4 coffee, quiet atmosphere. Toki, Eerste van der Helststraat 62, €3.50 coffee, Japanese-style. WiFi and power outlets available.",
    metadata: {
      activity_types: ["coffee", "work"],
      location: "Amsterdam, Netherlands",
      is_local: true,
      season: "any",
      budget: "low",
      language: "en",
      tags: ["work", "coffee", "quiet", "local"]
    }
  },
  {
    query: "rome food tour budget",
    context: "Affordable food experiences in Rome's traditional neighborhoods",
    response: "Trastevere Food Tour, multiple locations, €25-35 per person, local tastings. Testaccio Market, Via Galvani, €5-12 per dish, authentic Roman food. Campo de' Fiori, morning market, €3-8 items, fresh ingredients. Self-guided food walking routes available.",
    metadata: {
      activity_types: ["food", "tours"],
      location: "Rome, Italy",
      is_local: false,
      season: "any",
      budget: "medium",
      language: "en",
      tags: ["food", "culture", "walking", "authentic"]
    }
  }
]

function createManualCorpus() {
  console.log('📝 Creating manual seed corpus...')
  
  const outputDir = path.join(process.cwd(), 'data', 'corpus')
  const outputFile = path.join(outputDir, 'manual_seed_corpus.jsonl')
  
  // Create directory if needed
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  // Convert to JSONL format
  const jsonlContent = seedCorpus.map(entry => JSON.stringify(entry)).join('\n')
  
  // Write to file
  fs.writeFileSync(outputFile, jsonlContent)
  
  console.log(`✅ Manual corpus created: ${seedCorpus.length} entries`)
  console.log(`📁 Saved to: ${outputFile}`)
  
  // Show statistics
  const languages = seedCorpus.reduce((acc, entry) => {
    acc[entry.metadata.language] = (acc[entry.metadata.language] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const locations = [...new Set(seedCorpus.map(entry => entry.metadata.location))]
  const activities = [...new Set(seedCorpus.flatMap(entry => entry.metadata.activity_types))]
  
  console.log('\n📊 Corpus Statistics:')
  console.log(`Languages: ${Object.entries(languages).map(([lang, count]) => `${lang}(${count})`).join(', ')}`)
  console.log(`Locations: ${locations.length} (${locations.slice(0, 3).join(', ')}...)`)
  console.log(`Activity types: ${activities.length} (${activities.slice(0, 5).join(', ')}...)`)
  
  return seedCorpus.length
}

if (require.main === module) {
  createManualCorpus()
}

export { createManualCorpus, seedCorpus }