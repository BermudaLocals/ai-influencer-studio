const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { Pool } = require('pg');

// ── DB POOL (Railway-safe SSL) ─────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway')
    ? { rejectUnauthorized: false }
    : process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => console.error('[DB] pool error', err.message));

// ── AUTO-CREATE TABLES ─────────────────────────────────────────
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id               SERIAL PRIMARY KEY,
        email            VARCHAR(255) UNIQUE NOT NULL,
        password_hash    TEXT NOT NULL,
        name             TEXT,
        plan             VARCHAR(50) DEFAULT 'free',
        credits          INTEGER DEFAULT 100,
        role             VARCHAR(20) DEFAULT 'user',
        stripe_customer  TEXT,
        glowx_trial      BOOLEAN DEFAULT FALSE,
        trial_ends       TIMESTAMPTZ,
        course_purchased BOOLEAN DEFAULT FALSE,
        created_at       TIMESTAMPTZ DEFAULT NOW(),
        updated_at       TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token      TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('[AUTH] Tables ready');
  } catch(e) {
    console.error('[AUTH] Table init error:', e.message);
  }
})();

const JWT_SECRET  = process.env.JWT_SECRET  || 'empire-jwt-secret-change-in-prod';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

function makeToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, plan: user.plan },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

// ── MIDDLEWARE ─────────────────────────────────────────────────
function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch(e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
module.exports.authRequired = authRequired;

// ── REGISTER ──────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    if (password.length < 6)  return res.status(400).json({ error: 'Password must be 6+ characters' });

    const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email.toLowerCase().trim()]);
    if (exists.rows.length) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, name, credits)
       VALUES ($1,$2,$3,100) RETURNING id,email,name,plan,credits,role`,
      [email.toLowerCase().trim(), hash, name || null]
    );
    const user  = rows[0];
    const token = makeToken(user);
    res.status(201).json({ ok: true, token, user: { id:user.id, email:user.email, name:user.name, plan:user.plan, credits:user.credits } });
  } catch(e) {
    console.error('[AUTH] register error:', e.message);
    res.status(500).json({ error: 'Registration failed', detail: e.message });
  }
});

// ── LOGIN ──────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const { rows } = await pool.query(
      'SELECT id,email,name,password_hash,plan,credits,role FROM users WHERE email=$1',
      [email.toLowerCase().trim()]
    );
    if (!rows.length) return res.status(401).json({ error: 'Invalid email or password' });

    const user  = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const token = makeToken(user);
    res.json({ ok: true, token, user: { id:user.id, email:user.email, name:user.name, plan:user.plan, credits:user.credits } });
  } catch(e) {
    console.error('[AUTH] login error:', e.message);
    res.status(500).json({ error: 'Login failed', detail: e.message });
  }
});

// ── ME ─────────────────────────────────────────────────────────
router.get('/me', authRequired, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id,email,name,plan,credits,role,created_at FROM users WHERE id=$1',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ ok: true, user: rows[0] });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── CHANGE PASSWORD ────────────────────────────────────────────
router.post('/change-password', authRequired, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id=$1', [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password incorrect' });
    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2', [hash, req.user.id]);
    res.json({ ok: true, message: 'Password updated' });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
module.exports.pool = pool;
module.exports.authRequired = authRequired;
