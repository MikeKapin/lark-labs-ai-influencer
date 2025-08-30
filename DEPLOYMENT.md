# 🚀 Deployment Guide

## Railway + Vercel Deployment (Recommended)

### Prerequisites
- GitHub account with repository created
- Railway account (free tier available)
- Vercel account (free tier available)
- API keys for: Anthropic Claude, ElevenLabs, YouTube, LinkedIn, Facebook

---

## Step 1: Push to GitHub

1. **Create GitHub Repository**:
   - Go to [GitHub.com](https://github.com/new)
   - Repository name: `lark-labs-ai-influencer`
   - Description: `Complete AI-powered influencer system featuring Alex Reid`
   - Make it Public or Private
   - **Don't** initialize with README

2. **Update remote and push**:
   ```bash
   cd lark-labs-ai-influencer
   git remote set-url origin https://github.com/YOURUSERNAME/lark-labs-ai-influencer.git
   git push -u origin main
   ```

---

## Step 2: Deploy Backend to Railway

### 2.1 Setup Railway Project

1. **Sign up at [Railway.app](https://railway.app)**
2. **Create New Project** → **Deploy from GitHub repo**
3. **Connect** your `lark-labs-ai-influencer` repository
4. **Configure** the deployment:
   - **Root Directory**: Leave blank (Railway will auto-detect)
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`

### 2.2 Add PostgreSQL Database

1. In your Railway project dashboard
2. Click **"+ New Service"** → **"Database"** → **"PostgreSQL"**
3. Railway will create a PostgreSQL instance automatically
4. Note the connection details from the database service

### 2.3 Configure Environment Variables

In Railway project → **Variables** tab, add:

```env
# Database (Railway will auto-populate DATABASE_URL)
DATABASE_URL=postgresql://...  # Auto-provided by Railway

# AI Services
ANTHROPIC_API_KEY=sk-your-anthropic-key
ELEVENLABS_API_KEY=your-elevenlabs-key
ELEVENLABS_VOICE_ID=your-alex-reid-voice-id

# Social Media APIs
YOUTUBE_CLIENT_ID=your-youtube-client-id
YOUTUBE_CLIENT_SECRET=your-youtube-client-secret
YOUTUBE_REFRESH_TOKEN=your-youtube-refresh-token

LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
LINKEDIN_ACCESS_TOKEN=your-linkedin-access-token

FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
FACEBOOK_ACCESS_TOKEN=your-facebook-access-token

# Application Settings
NODE_ENV=production
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-here
CORS_ORIGIN=https://your-frontend-domain.vercel.app

# File Storage (Optional - for production files)
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_S3_BUCKET=lark-labs-content
AWS_REGION=us-east-1
```

### 2.4 Deploy and Test

1. Railway will automatically deploy after you push to GitHub
2. Check the **Deployments** tab for build status
3. Once deployed, get your Railway backend URL (e.g., `https://your-app.railway.app`)
4. Test health endpoint: `https://your-app.railway.app/health`

---

## Step 3: Deploy Frontend to Vercel

### 3.1 Setup Vercel Project

1. **Sign up at [Vercel.com](https://vercel.com)**
2. **Import Project** → **Import Git Repository**
3. **Select** your `lark-labs-ai-influencer` repository
4. **Configure Project**:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 3.2 Configure Environment Variables

In Vercel project → **Settings** → **Environment Variables**, add:

```env
VITE_API_BASE_URL=https://your-railway-app.railway.app/api
VITE_APP_NAME=LARK Labs AI Influencer
VITE_ENVIRONMENT=production
```

### 3.3 Deploy

1. Vercel will auto-deploy from your main branch
2. Get your Vercel URL (e.g., `https://your-app.vercel.app`)
3. Update Railway CORS_ORIGIN to match your Vercel URL

---

## Step 4: Initial Setup & Testing

### 4.1 Database Migration

1. **Connect to Railway PostgreSQL**:
   ```bash
   # Use Railway database connection string
   psql "postgresql://user:pass@host:port/dbname"
   ```

2. **Run database schema**:
   ```sql
   -- Copy contents from backend/src/database/schema.sql
   -- and run in your Railway PostgreSQL instance
   ```

### 4.2 Test the System

1. **Backend Health**: Visit `https://your-railway-app.railway.app/health`
2. **Frontend**: Visit your Vercel URL
3. **API Connection**: Check if dashboard loads data
4. **Content Generation**: Test the content pipeline

### 4.3 Domain Setup (Optional)

1. **Custom Domain for Backend**: Railway → Settings → Custom Domain
2. **Custom Domain for Frontend**: Vercel → Settings → Domains
3. **Update CORS settings** to match custom domains

---

## 📊 Expected Costs

### Railway (Backend + Database)
- **Hobby Plan**: $5/month + usage
- **Pro Plan**: $20/month + usage
- **Database**: ~$5-10/month for PostgreSQL
- **Total**: ~$10-30/month depending on usage

### Vercel (Frontend)
- **Hobby**: Free (includes custom domains)
- **Pro**: $20/month (if you need more)
- **Total**: $0-20/month

### API Costs
- **Anthropic Claude**: ~$20-100/month (depends on content volume)
- **ElevenLabs**: ~$22/month for Creator plan
- **Social Media APIs**: Free tiers available

**Total Monthly Cost: $50-200/month**

---

## 🔧 Troubleshooting

### Common Issues:

1. **Build Fails on Railway**:
   - Check that `package.json` has correct scripts
   - Ensure all dependencies are in `dependencies`, not `devDependencies`

2. **Database Connection Issues**:
   - Verify DATABASE_URL is correctly set
   - Check that PostgreSQL service is running

3. **CORS Errors**:
   - Update CORS_ORIGIN in Railway to match Vercel URL
   - Make sure frontend API calls use correct backend URL

4. **API Key Issues**:
   - Double-check all environment variables
   - Test API keys individually

### Monitoring:
- **Railway**: Built-in logs and metrics
- **Vercel**: Analytics and function logs
- **Set up alerts** for system health

---

## 🎯 Next Steps After Deployment

1. **Test all features** thoroughly
2. **Set up monitoring** and alerts
3. **Configure backup strategies**
4. **Set up CI/CD** for automatic deployments
5. **Monitor costs** and optimize as needed

Your LARK Labs AI Influencer System will be fully operational and autonomous! 🤖