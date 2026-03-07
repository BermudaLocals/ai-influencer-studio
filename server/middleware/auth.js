const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL , ssl: { rejectUnauthorized: false }});

const auth = async (req, res, next) => {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
    if (!token) return res.status(401).json({ error: 'No token provided' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const r = await pool.query('SELECT id, email, plan, subscription_status FROM users WHERE id=$1', [decoded.id]);
    if (!r.rows[0]) return res.status(401).json({ error: 'User not found' });
    req.user = r.rows[0];
    next();
  } catch (e) {
    if (e.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expired' });
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = auth;

