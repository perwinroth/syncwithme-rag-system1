# 🚀 RAG System Deployment Guide

## Prerequisites Setup

### 1. Get Pinecone API Key
1. Go to [pinecone.io](https://pinecone.io) and sign up
2. Create a new index:
   - **Name:** `syncwithme-travel-rag`
   - **Dimensions:** `1536` (for OpenAI text-embedding-3-small)
   - **Metric:** `cosine`
   - **Cloud:** `aws` or `gcp`
3. Copy your API key and environment

### 2. Get OpenAI API Key
1. Go to [platform.openai.com](https://platform.openai.com)
2. Create API key with GPT-4 access
3. Copy the key

### 3. Set Up Environment Variables

Create `.env` file in the rag-system directory:

```bash
# Copy from .env.example and fill in your keys
cp .env.example .env
```

Required variables:
```env
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_ENVIRONMENT=your_pinecone_environment
PINECONE_INDEX_NAME=syncwithme-travel-rag
OPENAI_API_KEY=your_openai_api_key_here
NODE_ENV=production
```

## Deployment Steps

### Option 1: Deploy to Vercel (Recommended)

1. **Install Vercel CLI:**
```bash
npm install -g vercel
```

2. **Deploy:**
```bash
npm run deploy
```

3. **Set Environment Variables on Vercel:**
```bash
vercel env add PINECONE_API_KEY
vercel env add PINECONE_ENVIRONMENT  
vercel env add OPENAI_API_KEY
vercel env add PINECONE_INDEX_NAME
```

4. **Sync Corpuses to Cloud:**
```bash
npm run sync-corpuses sync-and-validate
```

### Option 2: Local Development

1. **Start Local Server:**
```bash
npm run dev
```

2. **Test Health Check:**
```bash
curl http://localhost:3001/health
```

3. **Sync Corpuses:**
```bash
npm run sync-corpuses sync-and-validate
```

## Testing the Deployment

### 1. Health Check
```bash
curl https://your-deployment-url.vercel.app/health
```

### 2. Test RAG Query
```bash
curl -X POST https://your-deployment-url.vercel.app/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage": "looking for techno clubs in berlin, we are broke students"
  }'
```

### 3. Get System Stats
```bash
curl https://your-deployment-url.vercel.app/api/rag/stats
```

## Expected Response Format

Successful RAG query should return:
```json
{
  "intent": {
    "destination": "berlin",
    "interests": ["nightlife", "techno"],
    "budgetTier": "low",
    "confidence": 0.85
  },
  "recommendations": {
    "venues": [
      {
        "name": "Sisyphos",
        "type": "techno club",
        "address": "Hauptstraße 15, 10317 Berlin",
        "priceRange": "€15-20",
        "rating": 4.6
      }
    ],
    "confidence": 0.89,
    "reasoning": "These venues match your budget constraints and techno interests based on successful patterns from similar travelers."
  },
  "confidence": 0.87,
  "processingTime": 1250
}
```

## Troubleshooting

### Common Issues:

1. **"Missing environment variable" error:**
   - Check all required env vars are set in Vercel dashboard

2. **Pinecone connection failed:**
   - Verify index name and dimensions match
   - Check API key permissions

3. **Empty results:**
   - Run corpus sync: `npm run sync-corpuses sync`
   - Validate with: `npm run sync-corpuses validate`

4. **Deployment timeout:**
   - Increase Vercel function timeout in vercel.json

## Performance Monitoring

Monitor these metrics:
- **Response time:** Should be < 2 seconds
- **Confidence scores:** Should average > 0.7
- **Error rate:** Should be < 5%

## Next Steps

1. **Connect to Frontend:** Update your main app to use RAG endpoints
2. **Add Monitoring:** Set up logging and error tracking
3. **Scale Up:** Add more success patterns and language patterns
4. **Continuous Learning:** Implement feedback loops from user interactions