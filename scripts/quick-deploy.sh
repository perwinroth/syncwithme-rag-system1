#!/bin/bash
# 🚀 One-command deployment script for RAG system

set -e  # Exit on any error

echo "🚀 SyncWithMe RAG System - Quick Deploy"
echo "========================================"

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Not in a git repository. Please run this from the project root."
    exit 1
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "📝 Found uncommitted changes. Adding them..."
    git add .
    
    # Get commit message from user or use default
    if [ -z "$1" ]; then
        COMMIT_MSG="🚀 Auto-deploy: RAG system updates

$(date '+%Y-%m-%d %H:%M:%S') - Automated deployment

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"
    else
        COMMIT_MSG="$1"
    fi
    
    echo "💾 Committing changes..."
    git commit -m "$COMMIT_MSG"
fi

# Push to GitHub (triggers automatic Railway deployment)
echo "📤 Pushing to GitHub..."
git push origin main

echo ""
echo "✅ Deployment initiated!"
echo "🔄 GitHub Actions will now:"
echo "   1. ✅ Test the TypeScript build"
echo "   2. 🚀 Deploy to Railway automatically"
echo "   3. 🌐 Make your RAG system live!"
echo ""
echo "📊 Check progress at:"
echo "   🐙 GitHub: https://github.com/perwinroth/syncwithme-rag-system1/actions"
echo "   🚂 Railway: https://railway.app/project/your-project"
echo ""
echo "🎉 Your global travel RAG system will be live in ~2-3 minutes!"