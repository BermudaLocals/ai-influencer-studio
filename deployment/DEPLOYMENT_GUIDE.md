# 🚀 AI INFLUENCER STUDIO - RAILWAY DEPLOYMENT GUIDE

## 📋 **OVERVIEW**

This guide will help you deploy the AI Influencer Studio platform to Railway in **30 minutes**.

**What you're deploying:**
- Complete AI Influencer creation platform
- 4 pricing tiers: $49, $197, $497, $2500+$997/month
- Automated content posting (3x daily)
- AI DM management (24/7)
- Fanvue, OnlyFans, TikTok, Instagram integration
- Whale management system
- Brand deal finder
- UGC & Ad video services

---

## ⚡ **QUICK START (30 MINUTES)**

### **Prerequisites:**
1. ✅ Railway account (free tier works)
2. ✅ GitHub account (optional, for easier deployment)
3. ✅ API keys ready (see checklist below)

### **Deployment Steps:**

#### **Step 1: Prepare API Keys (10 min)**

Gather these API keys before starting:

**Required (Must Have):**
- [ ] Stripe Secret Key (`sk_live_...`)
- [ ] Stripe Publishable Key (`pk_live_...`)
- [ ] OpenRouter API Key (for AI text generation)
- [ ] Replicate API Token (for AI models)

**Recommended (For Full Features):**
- [ ] ElevenLabs API Key (voice cloning)
- [ ] Kling API Key (video generation)
- [ ] Stability AI Key (image generation)

**Optional (Platform Integrations):**
- [ ] Fanvue API credentials
- [ ] OnlyFans API credentials
- [ ] TikTok API credentials
- [ ] Instagram API credentials

---

#### **Step 2: Deploy to Railway (5 min)**

**Option A: Deploy via Railway Dashboard (Easiest)**

1. **Go to Railway Dashboard**
   - Visit: https://railway.app/dashboard
   - Click "New Project"

2. **Deploy from GitHub (Recommended)**
   - Click "Deploy from GitHub repo"
   - Select your forked repository
   - Railway will auto-detect the configuration

3. **Or Deploy from Local Files**
   - Click "Deploy from local directory"
   - Upload the `/tmp/repos/ai-influencer-studio/` folder
   - Railway will build and deploy

**Option B: Deploy via Railway CLI (Faster)**

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login to Railway
railway login

# Navigate to project
cd /tmp/repos/ai-influencer-studio

# Initialize Railway project
railway init

# Deploy
railway up
```

---

#### **Step 3: Add Database & Redis (5 min)**

**In Railway Dashboard:**

1. **Add PostgreSQL**
   - Click "New" → "Database" → "Add PostgreSQL"
   - Railway auto-creates `DATABASE_URL` variable

2. **Add Redis**
   - Click "New" → "Database" → "Add Redis"
   - Railway auto-creates `REDIS_URL` variable

3. **Verify Variables**
   - Go to your service → "Variables" tab
   - Confirm `DATABASE_URL` and `REDIS_URL` exist

---

#### **Step 4: Configure Environment Variables (10 min)**

**In Railway Dashboard:**

1. **Go to Variables Tab**
   - Click on your deployed service
   - Click "Variables" in the sidebar

2. **Add Required Variables**

Copy and paste these (replace with your actual keys):

```env
# Server
NODE_ENV=production
PORT=3000

# Security
JWT_SECRET=your-super-secret-jwt-key-change-this
SESSION_SECRET=your-session-secret-change-this

# Stripe (Required)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_IDENTITY_VERIFICATION=true

# AI Services (Required)
OPENROUTER_API_KEY=sk-or-v1-...
REPLICATE_API_TOKEN=r8_...

# AI Services (Recommended)
ELEVENLABS_API_KEY=your-elevenlabs-key
KLING_API_KEY=your-kling-key
STABILITY_AI_KEY=sk-...

# Platform Integrations (Optional)
FANVUE_API_KEY=your-fanvue-key
ONLYFANS_API_KEY=your-onlyfans-key
TIKTOK_CLIENT_KEY=your-tiktok-key
INSTAGRAM_ACCESS_TOKEN=your-instagram-token

# GlowX Integration
GLOWX_API_URL=https://glowx.live/api
GLOWX_PAYOUT_RATE=0.90

# Feature Flags
ENABLE_ADULT_CONTENT=true
ENABLE_AGE_VERIFICATION=true
ENABLE_WHALE_MANAGEMENT=true
ENABLE_BRAND_DEALS=true
ENABLE_AUTO_POSTING=true
ENABLE_AI_DM=true

# Cron Schedule (Auto-posting)
POST_SCHEDULE_MORNING=0 9 * * *
POST_SCHEDULE_AFTERNOON=0 13 * * *
POST_SCHEDULE_EVENING=0 19 * * *
```

3. **Save Variables**
   - Click "Add Variable" for each one
   - Or use "Raw Editor" to paste all at once

---

#### **Step 5: Deploy & Verify (5 min)**

1. **Trigger Deployment**
   - Railway auto-deploys when you add variables
   - Or click "Deploy" manually

2. **Check Deployment Logs**
   - Go to "Deployments" tab
   - Click on latest deployment
   - Watch logs for errors

3. **Get Your URL**
   - Go to "Settings" → "Domains"
   - Railway provides a free `.railway.app` domain
   - Or add your custom domain

4. **Test the Platform**
   - Visit your Railway URL
   - You should see the AI Influencer Studio homepage
   - Try creating an account
   - Test the pricing page

---

## 🎯 **POST-DEPLOYMENT CHECKLIST**

### **Immediate (Do Now):**
- [ ] Change admin password (default in .env)
- [ ] Test Stripe payment flow
- [ ] Create test AI influencer
- [ ] Verify auto-posting works
- [ ] Test DM automation

### **Within 24 Hours:**
- [ ] Set up custom domain
- [ ] Configure SSL certificate
- [ ] Set up email notifications
- [ ] Test all pricing tiers
- [ ] Verify Fanvue integration

### **Within 1 Week:**
- [ ] Set up monitoring (Sentry)
- [ ] Configure backups
- [ ] Test whale management
- [ ] Verify brand deal finder
- [ ] Launch marketing campaign

---

## 🔧 **TROUBLESHOOTING**

### **Deployment Failed**

**Problem:** Build fails with "Module not found"
**Solution:**
```bash
# Make sure package.json is correct
cd /tmp/repos/ai-influencer-studio
npm install
npm start
# If it works locally, redeploy to Railway
```

**Problem:** "DATABASE_URL not found"
**Solution:**
- Go to Railway → Add PostgreSQL database
- Verify `DATABASE_URL` variable exists
- Redeploy

### **Platform Not Loading**

**Problem:** 502 Bad Gateway
**Solution:**
- Check deployment logs for errors
- Verify `PORT=3000` in variables
- Check if database is connected

**Problem:** "Stripe error"
**Solution:**
- Verify Stripe keys are correct
- Check if Stripe webhook is configured
- Test with Stripe test keys first

### **Features Not Working**

**Problem:** Auto-posting not working
**Solution:**
- Check cron schedule variables
- Verify platform API keys (TikTok, Instagram)
- Check logs for errors

**Problem:** AI generation failing
**Solution:**
- Verify API keys (ElevenLabs, Kling, Replicate)
- Check API quotas/limits
- Test with one service at a time

---

## 💰 **PRICING CONFIGURATION**

The platform is pre-configured with these tiers:

### **Creator Starter - $49/month**
- 1 AI creator
- SFW content only
- 30 posts/month
- TikTok + Instagram
- Target earnings: $500-900/mo

### **Fanvue Pro - $197/month**
- 3 AI creators
- Adult content enabled
- Unlimited posts
- Full Fanvue pipeline
- AI DM automation
- Target earnings: $3,000-5,000/mo

### **Fanvue Empire - $497/month**
- 10 AI creators
- Whale management
- Brand deal finder
- White-label option
- Dedicated manager
- Target earnings: $10,000-18,000/mo

### **Done For You - $2,500 setup + $997/month**
- 29 AI creators
- Fully managed service
- Monthly performance calls
- Revenue split available
- Target earnings: $30,000-60,000/mo

**To modify pricing:**
- Edit `server/services/pricing.js`
- Update tier features
- Redeploy to Railway

---

## 🚀 **SCALING & OPTIMIZATION**

### **When to Scale:**

**10-50 users:**
- Railway Hobby plan ($5/month)
- 1 server instance
- Shared database

**50-500 users:**
- Railway Pro plan ($20/month)
- 2-3 server instances
- Dedicated database
- Redis caching

**500+ users:**
- Railway Team plan ($100/month)
- Auto-scaling enabled
- Load balancer
- CDN for media
- Dedicated Redis

### **Cost Optimization:**

**Current costs per user:**
- Server: $0.10/month
- Database: $0.05/month
- AI APIs: $2-5/month (varies by tier)
- **Total: ~$3-5/month per user**

**Revenue per user:**
- Starter: $49/month (margin: $46)
- Pro: $197/month (margin: $182)
- Empire: $497/month (margin: $457)
- DFY: $997/month (margin: $917)

**Target: 50 users mixed = $12,500/month revenue**

---

## 📞 **SUPPORT & RESOURCES**

### **Documentation:**
- Railway Docs: https://docs.railway.app
- Stripe Docs: https://stripe.com/docs
- Fanvue API: https://fanvue.com/api-docs

### **Community:**
- Railway Discord: https://discord.gg/railway
- AI Influencer Studio Discord: [Your Discord]

### **Need Help?**
- Email: support@your-domain.com
- Discord: [Your Discord Server]
- GitHub Issues: [Your Repo]

---

## ✅ **DEPLOYMENT COMPLETE!**

**You now have:**
- ✅ AI Influencer Studio live on Railway
- ✅ 4 pricing tiers configured
- ✅ Payment processing enabled
- ✅ Auto-posting scheduled
- ✅ AI DM automation active
- ✅ Platform integrations ready

**Next steps:**
1. Test all features
2. Launch marketing campaign
3. Onboard first customers
4. Monitor performance
5. Scale as needed

**Target: $12,500/month recurring revenue with 50 customers!** 🚀

