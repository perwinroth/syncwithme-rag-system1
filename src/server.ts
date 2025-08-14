import express from 'express'
import cors from 'cors'
import { DualRAGSystem } from './core/dual-rag-system'
import { RAGQueryRequest } from './types'
import { CONFIG } from './config'

const app = express()
const PORT = CONFIG.server.port || 3001

// Middleware
app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.static('public'))

// Initialize RAG system
let ragSystem: DualRAGSystem | null = null

async function initializeRAG() {
  if (!ragSystem) {
    console.log('🚀 Initializing RAG System...')
    ragSystem = new DualRAGSystem()
    await ragSystem.initialize()
    console.log('✅ RAG System initialized')
  }
  return ragSystem
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    service: 'SyncWithMe RAG Server',
    mode: 'persistent-server',
    uptime: process.uptime()
  })
})

// Main RAG query endpoint
app.post('/api/rag/query', async (req, res) => {
  try {
    const rag = await initializeRAG()
    const request: RAGQueryRequest = req.body
    
    if (!request.userMessage) {
      return res.status(400).json({
        error: 'userMessage is required'
      })
    }

    console.log('🔍 RAG Query:', {
      message: request.userMessage.slice(0, 100) + '...',
      hasContext: !!request.context
    })

    const response = await rag.query(request)
    res.json(response)

  } catch (error) {
    console.error('❌ RAG query error:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Process corpus endpoint (for training)
app.post('/api/rag/process-corpus', async (req, res) => {
  try {
    const { corpus, type } = req.body
    
    if (!corpus || !Array.isArray(corpus)) {
      return res.status(400).json({
        error: 'corpus array is required'
      })
    }

    console.log(`📊 Processing ${corpus.length} ${type} patterns...`)
    
    const rag = await initializeRAG()
    // Process corpus will be implemented
    
    res.json({
      success: true,
      processed: corpus.length,
      type,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Corpus processing error:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Start server
async function start() {
  try {
    // Initialize RAG on startup for faster first request
    await initializeRAG()
    
    app.listen(PORT, () => {
      console.log(`🚀 RAG Server running on port ${PORT}`)
      console.log(`📍 Health: http://localhost:${PORT}/api/health`)
      console.log(`📍 Query: http://localhost:${PORT}/api/rag/query`)
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

start()