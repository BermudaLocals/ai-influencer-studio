// server/routes/content.js
// One Push → all platforms via platforms.js
const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');

function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h) return res.status(401).json({ error: 'No token' });
  try { req.user = jwt.verify(h.replace('Bearer ', ''), process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
}

// POST /api/content/push — One Push to all platforms
router.post('/push', auth, async (req, res) => {
  const { content, media_url, influencer_id, platforms } = req.body;
  if (!content) return res.status(400).json({ error: 'content required' });
  try {
    const { onePush } = require('../platforms');
    const creatorName = `Creator ${influencer_id || 1}`;
    const targetPlatforms = platforms || ['facebook','instagram','x','threads'];
    const result = await onePush(content, media_url, creatorName, targetPlatforms);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/content/video — generate script + push
router.post('/video', auth, async (req, res) => {
  const { script, influencer_id, platform = 'all' } = req.body;
  if (!script) return res.status(400).json({ error: 'script required' });
  try {
    const targetPlatforms = platform === 'all'
      ? ['facebook','instagram','x','threads','tiktok']
      : [platform];
    let result = { posted: 0, failed: 0, results: [] };
    if (process.env.FB_ACCESS_TOKEN || process.env.X_BEARER_TOKEN) {
      const { onePush } = require('../platforms');
      result = await onePush(script, null, `Creator ${influencer_id || 1}`, targetPlatforms);
    }
    res.json({ success: true, script, platforms: targetPlatforms, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/content/status — health of all platform connections
router.get('/status', auth, (req, res) => {
  res.json({
    platforms: {
      facebook:  { connected: !!process.env.FB_ACCESS_TOKEN,        pages: [process.env.FB_PAGE_ID, process.env.FB_PAGE_ID_2, process.env.FB_PAGE_ID_3].filter(Boolean) },
      instagram: { connected: !!process.env.IG_BUSINESS_ID,         needs: 'IG_BUSINESS_ID + FB_ACCESS_TOKEN' },
      youtube:   { connected: !!process.env.YOUTUBE_REFRESH_TOKEN,  needs: 'YOUTUBE_REFRESH_TOKEN + CLIENT_ID + CLIENT_SECRET' },
      snapchat:  { connected: !!process.env.SNAPCHAT_ACCESS_TOKEN,  needs: 'SNAPCHAT_ACCESS_TOKEN + AD_ACCOUNT_ID' },
      tiktok:    { connected: !!process.env.TIKTOK_ACCESS_TOKEN,    needs: 'TIKTOK_ACCESS_TOKEN' },
      x:         { connected: !!process.env.X_BEARER_TOKEN,         needs: 'X_BEARER_TOKEN + X_ACCESS_TOKEN' },
      threads:   { connected: !!process.env.THREADS_ACCESS_TOKEN,   needs: 'THREADS_ACCESS_TOKEN + THREADS_USER_ID' },
      reddit:    { connected: !!process.env.REDDIT_ACCESS_TOKEN,    needs: 'REDDIT_ACCESS_TOKEN' },
    }
  });
});

module.exports = router;
