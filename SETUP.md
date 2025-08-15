# 🚀 Automated Deployment Setup

## 📋 One-Time Setup (5 minutes)

### Step 1: Upload Files to GitHub
Upload these files to your `syncwithme-rag-system1` repository:

**Essential Files:**
- `.github/workflows/deploy.yml` ← **GitHub Actions automation**
- `scripts/quick-deploy.sh` ← **One-command deployment** 
- `AUTOMATION.md` ← **Usage instructions**
- `package.json` ← **Updated with deploy scripts**
- All source code with TypeScript fixes

### Step 2: Get Railway Token
1. Go to https://railway.app/account/tokens
2. Click **"Create Token"**
3. Name: `RAG_DEPLOY_TOKEN`
4. Copy the token (starts with `railway_`)

### Step 3: Add GitHub Secrets
1. Go to https://github.com/perwinroth/syncwithme-rag-system1/settings/secrets/actions
2. Click **"New repository secret"**
3. Add these secrets:

```
Name: RAILWAY_TOKEN
Value: railway_your_token_here

Name: RAILWAY_SERVICE  
Value: your-railway-service-id
```

**How to find Railway Service ID:**
- Go to Railway dashboard → Your project → Settings → Service ID

### Step 4: Test Automation
Once files are uploaded and secrets are set:

```bash
# This will trigger automatic deployment
git push origin main
```

## 🎯 Daily Usage (30 seconds)

```bash
# Make your changes
vim src/core/dual-rag-system.ts

# Deploy everything automatically  
npm run deploy

# Or with custom message
./scripts/quick-deploy.sh "Added new global patterns"
```

## ✅ Verification

**GitHub Actions**: https://github.com/perwinroth/syncwithme-rag-system1/actions
- Should show green ✅ for builds and deployments

**Railway**: https://railway.app/project/your-project  
- Should show successful deployment
- Live URL available

**Your RAG System**: 
- Health: `https://your-app.railway.app/api/health`
- Query: `https://your-app.railway.app/api/rag/query`

## 🎉 What You Get

- **⚡ 30-second deployments** vs 10+ minutes manual
- **🤖 Fully automated** - just `git push`
- **🛡️ Automatic testing** prevents broken deploys
- **📊 Clear monitoring** with GitHub Actions
- **🌍 Global RAG system** with 39+ trained patterns live!

---

**Ready to set up automated deployment?** 🚀