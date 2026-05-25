/**
 * SCHEDULER ENGINE — Enhanced with queue, retries, and self-healing
 */
const cron = require('node-cron');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const { generationQueue, publishingQueue, JOB_TYPES, queuePublish } = require('../queue/jobQueue');
const { healStuckJobs, getSystemHealth } = require('./monitoringEngine');
const logger = require('./logger');

const startScheduler = () => {
  logger.info('[Scheduler] Starting all cron jobs...');

  // Every 5 min — pick up scheduled jobs and push to queue
  cron.schedule('*/5 * * * *', async () => {
    try {
      const due = await pool.query(
        `SELECT * FROM content_jobs WHERE status='pending' AND (scheduled_at IS NULL OR scheduled_at <= NOW()) LIMIT 10`
      );
      for (const job of due.rows) {
        await pool.query(`UPDATE content_jobs SET status='queued' WHERE id=$1`, [job.id]);
        await generationQueue.add(JOB_TYPES.FULL_PIPELINE, {
          jobId: job.id, userId: job.user_id, creatorId: job.influencer_id,
          prompt: job.topic, platform: job.platform
        }, { jobId: `job_${job.id}` });
      }
      if (due.rows.length) logger.info(`[Scheduler] Queued ${due.rows.length} pending jobs`);
    } catch (e) { logger.error(`[Scheduler] Queue pickup error: ${e.message}`); }
  });

  // Every 10 min — process scheduled posts
  cron.schedule('*/10 * * * *', async () => {
    try {
      const posts = await pool.query(
        `SELECT * FROM scheduled_posts WHERE status='scheduled' AND scheduled_at <= NOW() LIMIT 20`
      );
      for (const post of posts.rows) {
        await pool.query(`UPDATE scheduled_posts SET status='publishing' WHERE id=$1`, [post.id]);
        await queuePublish({ postId: post.id, platform: post.platform, content: post.content_data, scheduledAt: null });
      }
      if (posts.rows.length) logger.info(`[Scheduler] Dispatched ${posts.rows.length} scheduled posts`);
    } catch (e) { logger.error(`[Scheduler] Post dispatch error: ${e.message}`); }
  });

  // Every 15 min — self-heal stuck jobs
  cron.schedule('*/15 * * * *', async () => {
    const healed = await healStuckJobs();
    if (healed > 0) logger.warn(`[Scheduler] Self-healed ${healed} stuck jobs`);
  });

  // Every hour — system health check
  cron.schedule('0 * * * *', async () => {
    const health = await getSystemHealth();
    if (health.status !== 'healthy') {
      logger.error('[Scheduler] 🚨 System health degraded', health);
    }
  });

  // Daily 3am — cleanup old data
  cron.schedule('0 3 * * *', async () => {
    try {
      await pool.query(`DELETE FROM content_jobs WHERE status='completed' AND created_at < NOW() - INTERVAL '30 days'`);
      await pool.query(`DELETE FROM analytics WHERE created_at < NOW() - INTERVAL '90 days'`);
      logger.info('[Scheduler] Daily cleanup complete');
    } catch (e) { logger.error(`[Scheduler] Cleanup error: ${e.message}`); }
  });

  // Every 6 hours — trending content scan (fires for each active creator)
  cron.schedule('0 */6 * * *', async () => {
    try {
      const creators = await pool.query(`SELECT * FROM influencers WHERE status='active' LIMIT 50`);
      for (const creator of creators.rows) {
        // Queue a trending content job per creator
        await generationQueue.add('scan_trending', { creatorId: creator.id, niche: creator.niche }, { priority: 8 });
      }
      logger.info(`[Scheduler] Trending scan queued for ${creators.rows.length} creators`);
    } catch (e) { logger.error(`[Scheduler] Trending scan error: ${e.message}`); }
  });

  logger.info('[Scheduler] ✅ All cron jobs registered');
};

module.exports = { startScheduler };
