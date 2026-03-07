// auth-fix.js — DROP THIS INTO server/routes/auth.js (replaces existing)
// Agent Zero: POST /api/auth/login  → get Bearer token → use on all /api/* routes

const router  = require('express').Router();
const jwt     = require('jsonwebtoken');
const { Pool } = require('pg');
const bcrypt  = require('bcryptjs');
const pool    = new Pool({ connectionString: process.env.DATABASE_URL });

// ── ENSURE ADMIN USER EXISTS ON STARTUP ────────────────────────
async function ensureAdminExists() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        credits INTEGER DEFAULT 1000,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@dollardouble.com';
    const adminPass  = process.env.ADMIN_PASSWORD || 'Empire2025!';
    
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    if (exists.rows.length === 0) {
      const hash = await bcrypt.hash(adminPass, 10);
      await pool.query(
        'INSERT INTO users (email, password, role, credits) VALUES ($1, $2, $3, $4)',
        [adminEmail, hash, 'admin', 999999]
      );
      console.log(`✅ Admin user created: ${adminEmail}`);
    }

    // Also create Agent Zero service account
    const az = await pool.query('SELECT id FROM users WHERE email = $1', ['agentzero@dollardouble.com']);
    if (az.rows.length === 0) {
      const hash = await bcrypt.hash('AgentZero2025!', 10);
      await pool.query(
        'INSERT INTO users (email, password, role, credits) VALUES ($1, $2, $3, $4)',
        ['agentzero@dollardouble.com', hash, 'admin', 999999]
      );
      console.log('✅ Agent Zero account created');
    }
  } catch (err) {
    console.error('Admin setup error:', err.message);
  }
}
ensureAdminExists();

// ── LOGIN ───────────────────────────────────────────────────────
// POST /api/auth/login
// Body: { "email": "admin@dollardouble.com", "password": "Empire2025!" }
// Returns: { "token": "eyJ..." }
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (!result.rows[0]) return res.status(401).json({ error: 'Invalid credentials' });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'empire-secret-2025',
      { expiresIn: '30d' }
    );

    res.json({ token, user: { id: user.id, email: user.email, role: user.role, credits: user.credits } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── REGISTER ────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password, role, credits) VALUES ($1, $2, $3, $4) RETURNING id, email, role, credits',
      [email, hash, 'user', 100]
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'empire-secret-2025', { expiresIn: '30d' });
    res.json({ token, user });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: err.message });
  }
});

// ── ME ──────────────────────────────────────────────────────────
router.get('/me', async (req, res) => {
  try {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: 'No token' });
    const user = jwt.verify(header.replace('Bearer ', ''), process.env.JWT_SECRET || 'empire-secret-2025');
    const result = await pool.query('SELECT id, email, role, credits FROM users WHERE id = $1', [user.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// ── AGENT ZERO FAST TOKEN ───────────────────────────────────────
// GET /api/auth/agent-token?key=AgentZero2025!
// No POST body needed — Agent Zero can just GET this
router.get('/agent-token', async (req, res) => {
  const key = req.query.key;
  const masterKey = process.env.AGENT_ZERO_KEY || 'AgentZero2025!';
  if (key !== masterKey) return res.status(401).json({ error: 'Invalid key' });
  
  const token = jwt.sign(
    { id: 0, email: 'agentzero@dollardouble.com', role: 'admin' },
    process.env.JWT_SECRET || 'empire-secret-2025',
    { expiresIn: '30d' }
  );
  res.json({ token, note: 'Agent Zero admin token — valid 30 days' });
});

module.exports = router;
