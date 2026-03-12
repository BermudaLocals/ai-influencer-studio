require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Safe route loader — won't crash if file missing
function safeRoute(routePath) {
  try { return require(routePath); }
  catch(e) {
    console.warn(`[WARN] Route not found: ${routePath} — ${e.message}`);
    const r = require('express').Router();
    r.all('*', (req,res) => res.status(501).json({ error: 'Route not yet deployed', path: routePath }));
    return r;
  }
}

// ── ROUTES ─────────────────────────────────────────────────────
app.use('/api/tools',     safeRoute('./routes/tools'));
app.use('/api/pipeline',  safeRoute('./routes/pipeline'));
app.use('/api/admin',     safeRoute('./routes/admin'));
app.use('/api/affiliate', safeRoute('./routes/affiliate'));
app.use('/api/creators',  safeRoute('./routes/creators'));
app.use('/api/marketing', safeRoute('./routes/marketing'));

// ── LOCAL STORAGE ──────────────────────────────────────────────
try {
  const { getLocalStoragePath } = require('./services/storageEngine');
  app.use('/storage', express.static(getLocalStoragePath()));
} catch(e) { console.warn('[WARN] storageEngine not loaded'); }

// ── HEALTH ─────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  res.json({
    status: 'live',
    time:   new Date().toISOString(),
    routes: ['tools','pipeline','admin','affiliate','creators','marketing'],
    env: {
      replicate:  !!process.env.REPLICATE_API_TOKEN,
      openrouter: !!process.env.OPENROUTER_API_KEY,
      elevenlabs: !!process.env.ELEVENLABS_API_KEY,
      stripe:     !!process.env.STRIPE_SECRET_KEY,
      database:   !!process.env.DATABASE_URL,
      tiktok:     !!process.env.TIKTOK_ACCESS_TOKEN,
      instagram:  !!process.env.FB_ACCESS_TOKEN,
    }
  });
});

// ── STATIC HTML ────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../public')));
app.get('/', (req, res) => {
  const idx = path.join(__dirname, '../public/index.html');
  if (fs.existsSync(idx)) return res.sendFile(idx);
  res.json({ message: 'Empire API live', version: '2.0' });
});

// ── COURSE PURCHASE WEBHOOK ────────────────────────────────────
app.post('/api/billing/course-purchased', async (req, res) => {
  if (req.headers['x-webhook-secret'] !== 'empire-affiliate-2025')
    return res.status(401).json({ error: 'bad secret' });
  try {
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    const trial = new Date(Date.now() + 30*24*60*60*1000).toISOString();
    await pool.query(
      `UPDATE users SET plan='starter',glowx_trial=true,trial_ends=$1,course_purchased=true WHERE id=$2`,
      [trial, req.body.userId]
    );
    res.json({ ok: true, trial_ends: trial });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, () => console.log(`✅ Empire API live on port ${PORT}`));
