import { VercelRequest, VercelResponse } from '@vercel/node'
import { DualRAGSystem } from '../src/core/dual-rag-system'
import { RAGQueryRequest } from '../src/types'

const ragSystem = new DualRAGSystem()
let initialized = false

async function initializeRAG() {
  if (!initialized) {
    await ragSystem.initialize()
    initialized = true
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    await initializeRAG()

    const url = new URL(req.url!, `http://${req.headers.host}`)
    const pathname = url.pathname

    // Health check
    if (pathname === '/health' || pathname === '/api/health') {
      return res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      })
    }

    // RAG query endpoint
    if (pathname === '/api/rag/query' && req.method === 'POST') {
      const request: RAGQueryRequest = req.body
      
      if (!request.userMessage) {
        return res.status(400).json({
          error: 'userMessage is required'
        })
      }

      const response = await ragSystem.query(request)
      return res.json(response)
    }

    // Stats endpoint
    if (pathname === '/api/rag/stats' && req.method === 'GET') {
      const stats = await ragSystem.getSystemStats()
      return res.json(stats)
    }

    // 404
    return res.status(404).json({
      error: 'Endpoint not found'
    })

  } catch (error) {
    console.error('Handler error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}