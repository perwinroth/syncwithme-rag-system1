#!/bin/bash
# Railway deployment script for SyncWithMe RAG System

echo "🚀 Deploying SyncWithMe RAG System to Railway..."

# Check if logged in
if ! railway whoami > /dev/null 2>&1; then
    echo "❌ Not logged in to Railway"
    echo "Please run: railway login"
    echo "Then run this script again"
    exit 1
fi

echo "✅ Railway login confirmed"

# Initialize Railway project if not exists
if [ ! -f ".railway" ]; then
    echo "🆕 Creating new Railway project..."
    railway init
fi

# Set environment variables
echo "🔧 Setting environment variables..."
railway variables set NODE_ENV=production
railway variables set PORT=3001
railway variables set PINECONE_INDEX_NAME=syncwithme-travel-rag

echo "⚠️  Please manually set these sensitive variables in Railway dashboard:"
echo "   - PINECONE_API_KEY"
echo "   - OPENAI_API_KEY"
echo ""
echo "🌐 Railway dashboard: https://railway.app/dashboard"

# Deploy
echo "🚀 Deploying to Railway..."
railway up

echo "✅ Deployment complete!"
echo "📍 Check your Railway dashboard for the live URL"