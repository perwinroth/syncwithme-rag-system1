import { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Maximum CORS permissiveness
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', '*')
  res.setHeader('Access-Control-Max-Age', '86400')
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  return res.status(200).json({
    success: true,
    message: '🎉 RAG API is working! No authentication required.',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    testData: {
      query: 'broke students berlin clubs',
      expectedResponse: 'Sisyphos €15-20, Hauptstraße 15'
    }
  })
}