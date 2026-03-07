// server/routes/avatars.js — stub (prevents 502 if original missing)
const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h) return res.status(401).json({ error: 'No token' });
  try { req.user = jwt.verify(h.replace('Bearer ', ''), process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
}

router.get('/', auth, async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM influencers WHERE user_id=$1 ORDER BY created_at DESC', [req.user.id]).catch(() => ({ rows: [] }));
    res.json(r.rows);
  } catch (e) { res.json([]); }
});

router.post('/', auth, async (req, res) => {
  const { name, niche, personality_prompt, avatar_url, voice_id, subscription_price } = req.body;
  try {
    const r = await pool.query(
      'INSERT INTO influencers (user_id, name, niche, personality_prompt, avatar_url, voice_id, subscription_price, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW()) RETURNING *',
      [req.user.id, name, niche, personality_prompt, avatar_url, voice_id, subscription_price || 14.99]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM influencers WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]).catch(() => ({ rows: [] }));
    if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
