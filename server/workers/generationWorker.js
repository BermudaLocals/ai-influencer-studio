/**
 * GENERATION WORKER
 * Layer 2: Processes jobs from BullMQ with retries and recovery
 * Run as separate process: node server/workers/generationWorker.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { Worker } = require('bullmq');
const { JOB_TYPES, redisConnection } = require('../queue/jobQueue');
const { runFullPipeline } = require('../services/pipelineOrchestrator');
const logger = require('../services/logger');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '3');

const worker = new Worker('generation', async (job) => {
  logger.info(`[Worker] Processing job ${job.id} type=${job.name} attempt=${job.attemptsMade+1}`);

  switch (job.name) {

    case JOB_TYPES.FULL_PIPELINE:
      return runFullPipeline(job.data);

    case JOB_TYPES.GENERATE_SCRIPT: {
      const { generateScript } = require('../services/pipelineOrchestrator');
      const creatorResult = await pool.query('SELECT * FROM influencers WHERE id=$1', [job.data.creatorId]);
      return generateScript({ ...job.data, creator: creatorResult.rows[0] });
    }

    case JOB_TYPES.GENERATE_IMAGES: {
      const { generateSceneImages } = require('../services/pipelineOrchestrator');
      const creatorResult = await pool.query('SELECT * FROM influencers WHERE id=$1', [job.data.creatorId]);
      return generateSceneImages({ scenes: job.data.scenes, creator: creatorResult.rows[0] });
    }

    case JOB_TYPES.CLEANUP: {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      await pool.query(`DELETE FROM content_jobs WHERE status='completed' AND created_at < $1`, [cutoff]);
      logger.info('[Worker] Cleanup complete');
      return { cleaned: true };
    }

    default:
      logger.warn(`[Worker] Unknown job type: ${job.name}`);
      return { skipped: true };
  }

}, {
  connection: redisConnection,
  concurrency: CONCURRENCY,
  lockDuration: 300000 // 5 min max per job
});

// ── EVENT HANDLERS ─────────────────────────────────────────────────
worker.on('completed', (job, result) => {
  logger.info(`[Worker] ✅ Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  logger.error(`[Worker] ❌ Job ${job?.id} failed (attempt ${job?.attemptsMade}): ${err.message}`);
  // Self-heal: if max attempts reached, notify admin
  if (job && job.attemptsMade >= job.opts.attempts) {
    logger.error(`[Worker] 🚨 Job ${job.id} exhausted all retries — needs manual review`);
    // Could send email/webhook alert here
  }
});

worker.on('stalled', (jobId) => {
  logger.warn(`[Worker] ⚠️ Job ${jobId} stalled — will auto-retry`);
});

worker.on('error', (err) => {
  logger.error(`[Worker] Worker error: ${err.message}`);
});

logger.info(`[Worker] 🚀 Generation worker started (concurrency=${CONCURRENCY})`);

// ── GRACEFUL SHUTDOWN ──────────────────────────────────────────────
process.on('SIGTERM', async () => {
  logger.info('[Worker] Graceful shutdown...');
  await worker.close();
  process.exit(0);
});
process.on('SIGINT', async () => {
  await worker.close();
  process.exit(0);
});
