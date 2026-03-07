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

// ── CORE ROUTES ────────────────────────────────────────────────
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/avatars',      require('./routes/avatars'));
app.use('/api/content',      require('./routes/content'));
app.use('/api/monetization', require('./routes/monetization'));
app.use('/api/leads',        require('./routes/billing'));
app.use('/api/billing',      require('./routes/billing'));

// ── EMPIRE GENERATE ROUTES (new) ───────────────────────────────
const generate = require('./routes/generate');
app.use('/api/generate',   generate);
app.use('/api/music',      generate.music);
app.use('/api/video',      generate.video);
app.use('/api/assistant',  generate.assistant);
app.use('/api/leads',      generate.leads);

// ── WIDGET.JS — serve AI assistant widget ─────────────────────
// Also copy widget.js to server/ folder when you deploy
const widgetPath = path.join(__dirname, 'widget.js');
app.get('/widget.js', (req, res) => {
  if (fs.existsSync(widgetPath)) {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(widgetPath);
  } else {
    res.redirect('/api/assistant/widget.js');
  }
});

// ── HEALTH ─────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({
  status: 'live', time: new Date().toISOString(),
  env: {
    replicate:  !!process.env.REPLICATE_API_TOKEN,
    openrouter: !!process.env.OPENROUTER_API_KEY,
    elevenlabs: !!process.env.ELEVENLABS_API_KEY,
    kling:      !!process.env.KLING_API_KEY,
    heygen:     !!process.env.HEYGEN_API_KEY,
    mureka:     !!process.env.MUREKA_API_KEY,
    did:        !!process.env.DID_API_KEY,
    resend:     !!process.env.RESEND_API_KEY,
    facebook:   !!process.env.FB_PAGE_ID,
    snapchat:   !!process.env.SNAPCHAT_ACCESS_TOKEN,
  }
}));

// ── REACT FRONTEND ─────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../client/dist/index.html')));
}

app.listen(PORT, () => console.log(`Empire API live on port ${PORT}`));
