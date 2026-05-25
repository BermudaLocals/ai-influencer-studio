/**
 * MONITORING ENGINE — Layer 2: Health checks, alerts, self-healing
 * Tracks job failures, API health, system metrics
 */
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const logger = require('./logger');

// ── PLAN LIMITS (Layer 4 Governance) ─────────────────────────────
const PLAN_LIMITS = {
  starter:  { videos_per_day: 5,  images_per_day: 20, voice_per_day: 10, creators: 1,  concurrent_jobs: 1 },
  pro:      { videos_per_day: 30, images_per_day: 100, voice_per_day: 50, creators: 5,  concurrent_jobs: 3 },
  agency:   { videos_per_day: 200, images_per_day: 500, voice_per_day: 200, creators: 29, concurrent_jobs: 10 },
  empire:   { videos_per_day: 999, images_per_day: 9999, voice_per_day: 999, creators: 200, concurrent_jobs: 50 }
};

async function checkPlanLimit(userId, resourceType) {
  try {
    const userRes = await pool.query('SELECT plan FROM users WHERE id=$1', [userId]);
    const plan = userRes.rows[0]?.plan || 'starter';
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.starter;
    const limitKey = `${resourceType}_per_day`;
    const limit = limits[limitKey];
    if (!limit) return { allowed: true };

    // Count today's usage
    const usageRes = await pool.query(
      `SELECT COUNT(*) as count FROM content_jobs WHERE user_id=$1 AND job_type=$2 AND created_at > NOW() - INTERVAL '24 hours'`,
      [userId, resourceType]
    );
    const used = parseInt(usageRes.rows[0]?.count || 0);
    const allowed = used < limit;
    return { allowed, used, limit, plan };
  } catch (e) {
    logger.warn(`[Monitor] Plan check failed: ${e.message}`);
    return { allowed: true }; // fail open
  }
}

// ── SYSTEM HEALTH CHECK ───────────────────────────────────────────
async function getSystemHealth() {
  const checks = {};

  // DB check
  try {
    await pool.query('SELECT 1');
    checks.database = { status: 'ok' };
  } catch (e) {
    checks.database = { status: 'error', error: e.message };
  }

  // Redis check
  try {
    const { createClient } = require('redis');
    const client = createClient({ url: process.env.REDIS_URL });
    await client.connect();
    await client.ping();
    await client.disconnect();
    checks.redis = { status: 'ok' };
  } catch (e) {
    checks.redis = { status: 'error', error: e.message };
  }

  // Queue stats
  try {
    const { getQueueStats } = require('../queue/jobQueue');
    checks.queues = await getQueueStats();
  } catch (e) {
    checks.queues = { status: 'unavailable' };
  }

  // API provider checks
  checks.providers = {
    replicate:   process.env.REPLICATE_API_TOKEN ? 'configured' : 'missing',
    elevenlabs:  process.env.ELEVENLABS_API_KEY ? 'configured' : 'missing',
    kling:       process.env.KLING_API_KEY ? 'configured' : 'missing',
    openrouter:  process.env.OPENROUTER_API_KEY ? 'configured' : 'missing',
    stability:   process.env.STABILITY_API_KEY ? 'configured' : 'missing',
    storage:     process.env.R2_ACCOUNT_ID ? 'r2' : process.env.AWS_ACCESS_KEY_ID ? 's3' : 'local'
  };

  // Job stats from DB
  try {
    const jobStats = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM content_jobs
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY status
    `);
    checks.jobs_24h = Object.fromEntries(jobStats.rows.map(r => [r.status, parseInt(r.count)]));
  } catch {}

  const allOk = checks.database?.status === 'ok' && checks.redis?.status === 'ok';
  return { status: allOk ? 'healthy' : 'degraded', timestamp: new Date().toISOString(), checks };
}

// ── SELF-HEALING: retry stuck jobs ───────────────────────────────
async function healStuckJobs() {
  try {
    // Jobs stuck in 'processing' for over 10 minutes
    const stuck = await pool.query(`
      UPDATE content_jobs
      SET status='pending', updated_at=NOW()
      WHERE status='processing'
      AND updated_at < NOW() - INTERVAL '10 minutes'
      RETURNING id
    `);
    if (stuck.rows.length > 0) {
      logger.warn(`[Monitor] Self-healed ${stuck.rows.length} stuck jobs`);
    }
    return stuck.rows.length;
  } catch (e) {
    logger.error(`[Monitor] Heal failed: ${e.message}`);
    return 0;
  }
}

// ── ALERT SYSTEM ─────────────────────────────────────────────────
async function sendAlert(type, message, data = {}) {
  logger.error(`[ALERT] ${type}: ${message}`, data);

  // Webhook alert (Slack/Discord/custom)
  if (process.env.ALERT_WEBHOOK_URL) {
    try {
      const axios = require('axios');
      await axios.post(process.env.ALERT_WEBHOOK_URL, {
        text: `🚨 *${type}*: ${message}`,
        attachments: [{ text: JSON.stringify(data, null, 2) }]
      });
    } catch {}
  }
}

module.exports = { checkPlanLimit, getSystemHealth, healStuckJobs, sendAlert, PLAN_LIMITS };
