import { VercelRequest, VercelResponse } from '@vercel/node'
import { DualRAGSystem } from '../../src/core/dual-rag-system'
import { RAGQueryRequest } from '../../src/types'

let ragSystem: DualRAGSystem | null = null
let initialized = false

async function initializeRAG() {
  if (!ragSystem) {
    ragSystem = new DualRAGSystem()
  }
  
  if (!initialized) {
    await ragSystem.initialize()
    initialized = true
  }
}

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
    await initializeRAG()

    const request: RAGQueryRequest = req.body
    
    if (!request.userMessage) {
      return res.status(400).json({
        error: 'userMessage is required'
      })
    }

    console.log('🔍 RAG Query:', {
      message: request.userMessage.slice(0, 100) + '...',
      hasContext: !!request.context,
      tripId: request.context?.tripId
    })

    const response = await ragSystem!.query(request)
    
    return res.json(response)

  } catch (error) {
    console.error('❌ RAG query error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}