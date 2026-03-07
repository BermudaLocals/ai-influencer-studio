# AI Influencer Studio 🤖🎬🎵
## @mosthigh_flava | No Fluff, Max ROI

---

## QUICK START

### 1. Install dependencies
```bash
npm install
cd client && npm install && cd ..
```

### 2. Setup database
```bash
psql -U postgres -c "CREATE DATABASE ai_influencer_studio;"
psql -U postgres -d ai_influencer_studio -f server/db/schema.sql
```

### 3. Configure environment
```bash
cp .env.example .env
# Edit .env and add your API keys
```

### 4. Start development
```bash
# Terminal 1 - Backend
npm run dev

# Terminal 2 - Frontend
cd client && npm run dev
```

### 5. Production build
```bash
cd client && npm run build && cd ..
NODE_ENV=production npm start
```

---

## FEATURES
- 🤖 Avatar Studio — Create AI influencer personas
- 🎬 Content Engine — AI script → talking video → thumbnail
- 🎵 Music Studio — Text-to-music, beat maker, lyric writer
- 📅 Publishing Hub — Schedule posts to TikTok/IG/YouTube
- 🎯 Lead Scraper — Scrape businesses + AI pitch emails
- 💰 Monetization — Brand deals, affiliates, revenue tracking
- ⚙️ Settings — API keys, billing, team management

## SUBSCRIPTION PLANS
- Starter: $29/mo
- Pro: $97/mo
- Agency: $297/mo

## TECH STACK
Backend: Node.js + Express + PostgreSQL
Frontend: React 18 + Vite + Tailwind CSS
AI: OpenRouter, ElevenLabs, Kling, Stability AI, MusicGen
Payments: Stripe
