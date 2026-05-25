/**
 * PIPELINE ROUTE — Layer 1+2: Trigger and monitor generation pipeline
 */
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const { queueFullPipeline } = require('../queue/jobQueue');
const { runFullPipeline } = require('../services/pipelineOrchestrator');
const { planGate, moderatePrompt, concurrencyLimit } = require('../middleware/governance');

function auth(req, res, next) {
  try {
    req.user = jwt.verify((req.headers.authorization||'').replace('Bearer ',''), process.env.JWT_SECRET);
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
}

// POST /api/pipeline/start — queue a full generation pipeline
router.post('/start', auth, moderatePrompt, concurrencyLimit(5), planGate('videos'), async (req, res) => {
  const { creatorId, prompt, platform = 'tiktok', scheduledAt, mode = 'queue' } = req.body;
  if (!creatorId || !prompt) return res.status(400).json({ error: 'creatorId and prompt required' });

  try {
    // Create job record
    const jobResult = await pool.query(
      `INSERT INTO content_jobs (user_id, influencer_id, topic, status, platform, scheduled_at, created_at)
       VALUES ($1,$2,$3,'pending',$4,$5,NOW()) RETURNING id`,
      [req.user.id, creatorId, prompt, platform, scheduledAt || null]
    );
    const jobId = jobResult.rows[0].id;

    if (mode === 'sync') {
      // Run synchronously (for testing/small jobs)
      const result = await runFullPipeline({ jobId, userId: req.user.id, creatorId, prompt, platform, scheduledAt });
      return res.json(result);
    }

    // Queue async (default — recommended)
    await queueFullPipeline({ jobId, userId: req.user.id, creatorId, prompt, platform, scheduledAt });
    res.json({ queued: true, jobId, message: 'Pipeline queued — poll /api/pipeline/status/:jobId for updates' });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/pipeline/status/:jobId — get job status + result
router.get('/status/:jobId', auth, async (req, res) => {
  try {
    const job = await pool.query(
      `SELECT cj.*, i.name as creator_name, i.niche
       FROM content_jobs cj
       LEFT JOIN influencers i ON cj.influencer_id=i.id
       WHERE cj.id=$1 AND cj.user_id=$2`,
      [req.params.jobId, req.user.id]
    );
    if (!job.rows[0]) return res.status(404).json({ error: 'Job not found' });
    res.json(job.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/pipeline/jobs — list user's jobs
router.get('/jobs', auth, async (req, res) => {
  const { status, limit = 20 } = req.query;
  try {
    const where = status ? 'AND cj.status=$3' : '';
    const params = status ? [req.user.id, limit, status] : [req.user.id, limit];
    const jobs = await pool.query(
      `SELECT cj.id, cj.topic, cj.status, cj.platform, cj.video_url, cj.thumbnail_url, cj.created_at, i.name as creator_name
       FROM content_jobs cj
       LEFT JOIN influencers i ON cj.influencer_id=i.id
       WHERE cj.user_id=$1 ${where}
       ORDER BY cj.created_at DESC LIMIT $2`,
      params
    );
    res.json(jobs.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/pipeline/jobs/:id — cancel/delete job
router.delete('/jobs/:id', auth, async (req, res) => {
  try {
    await pool.query(`UPDATE content_jobs SET status='cancelled' WHERE id=$1 AND user_id=$2`, [req.params.id, req.user.id]);
    res.json({ cancelled: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
