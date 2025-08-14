import { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Force CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
  res.setHeader('Access-Control-Max-Age', '86400')
  
  // Disable any authentication
  res.setHeader('Cache-Control', 'no-cache')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      service: 'SyncWithMe RAG System',
      message: 'RAG API is running successfully!',
      endpoints: {
        health: '/api/health',
        query: '/api/rag/query (POST)'
      }
    })
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}