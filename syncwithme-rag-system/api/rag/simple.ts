import { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userMessage } = req.body
    
    if (!userMessage) {
      return res.status(400).json({ error: 'userMessage is required' })
    }

    console.log('🔍 Simple RAG Query:', userMessage)

    // Simple rule-based response for testing
    const response = generateSimpleResponse(userMessage)
    
    return res.json({
      success: true,
      recommendations: response.recommendations,
      reasoning: response.reasoning,
      metadata: {
        processedBy: 'simple-rag',
        timestamp: new Date().toISOString(),
        queryTime: '< 1s'
      }
    })

  } catch (error) {
    console.error('❌ Simple RAG error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

function generateSimpleResponse(userMessage: string) {
  const message = userMessage.toLowerCase()
  
  // Berlin clubs pattern
  if (message.includes('berlin') && (message.includes('club') || message.includes('night'))) {
    if (message.includes('broke') || message.includes('cheap') || message.includes('budget')) {
      return {
        recommendations: [
          {
            name: "Sisyphos",
            type: "club",
            location: "Hauptstraße 15, 10317 Berlin",
            price: "€15-20",
            description: "Popular techno club with garden area, student-friendly pricing",
            booking: "At door or online"
          },
          {
            name: "About Blank",
            type: "club", 
            location: "Markgrafendamm 24c, 10245 Berlin",
            price: "€10-15",
            description: "Alternative club in former warehouse, great for students",
            booking: "At door"
          }
        ],
        reasoning: "Found budget-friendly Berlin clubs based on student preferences"
      }
    }
  }

  // Default response
  return {
    recommendations: [
      {
        name: "Local Discovery",
        type: "general",
        location: "Various locations",
        price: "Varies",
        description: "Explore local venues and activities in your area",
        booking: "Check local listings"
      }
    ],
    reasoning: "General recommendation - need more specific location and activity preferences"
  }
}