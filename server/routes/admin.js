/**
 * ADMIN ROUTES — Layer 4: System monitoring, job management, governance
 */
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { getSystemHealth, healStuckJobs, PLAN_LIMITS } = require('../services/monitoringEngine');
const { getQueueStats, getFailedJobs, retryJob } = require('../queue/jobQueue');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

function adminAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token' });
  try {
    const user = jwt.verify(header.replace('Bearer ', ''), process.env.JWT_SECRET);
    if (user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    req.user = user;
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
}

// GET /api/admin/health — full system health
router.get('/health', adminAuth, async (req, res) => {
  try {
    const health = await getSystemHealth();
    res.json(health);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/queues — queue stats
router.get('/queues', adminAuth, async (req, res) => {
  try {
    const stats = await getQueueStats();
    res.json(stats);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/failed-jobs — see all failed jobs
router.get('/failed-jobs', adminAuth, async (req, res) => {
  try {
    const { queue = 'generation', limit = 20 } = req.query;
    const jobs = await getFailedJobs(queue, parseInt(limit));
    res.json(jobs.map(j => ({ id: j.id, name: j.name, data: j.data, failedReason: j.failedReason, attemptsMade: j.attemptsMade, timestamp: j.timestamp })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/retry/:queue/:jobId — retry a failed job
router.post('/retry/:queue/:jobId', adminAuth, async (req, res) => {
  try {
    const result = await retryJob(req.params.queue, req.params.jobId);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/heal — self-heal stuck jobs
router.post('/heal', adminAuth, async (req, res) => {
  try {
    const healed = await healStuckJobs();
    res.json({ healed, message: `Healed ${healed} stuck jobs` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/jobs — all jobs with filters
router.get('/jobs', adminAuth, async (req, res) => {
  const { status, limit = 50, offset = 0 } = req.query;
  try {
    const where = status ? `WHERE status=$1` : '';
    const params = status ? [status, limit, offset] : [limit, offset];
    const jobs = await pool.query(
      `SELECT cj.*, i.name as creator_name, u.email as user_email
       FROM content_jobs cj
       LEFT JOIN influencers i ON cj.influencer_id=i.id
       LEFT JOIN users u ON cj.user_id=u.id
       ${where}
       ORDER BY cj.created_at DESC
       LIMIT $${params.length-1} OFFSET $${params.length}`,
      params
    );
    res.json(jobs.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/users — user list with plan info
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await pool.query(
      `SELECT id, email, plan, credits, created_at,
       (SELECT COUNT(*) FROM content_jobs WHERE user_id=users.id) as total_jobs
       FROM users ORDER BY created_at DESC LIMIT 100`
    );
    res.json(users.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/admin/users/:id — update user plan/credits
router.patch('/users/:id', adminAuth, async (req, res) => {
  const { plan, credits } = req.body;
  try {
    const updates = [];
    const params = [];
    if (plan) { updates.push(`plan=$${params.length+1}`); params.push(plan); }
    if (credits !== undefined) { updates.push(`credits=$${params.length+1}`); params.push(credits); }
    if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
    params.push(req.params.id);
    await pool.query(`UPDATE users SET ${updates.join(',')} WHERE id=$${params.length}`, params);
    res.json({ updated: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/plans — plan limits
router.get('/plans', adminAuth, (req, res) => res.json(PLAN_LIMITS));

module.exports = router;
