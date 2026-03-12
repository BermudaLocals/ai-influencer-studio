/**
 * JOB QUEUE — BullMQ powered by Redis
 * Layer 2: Queues, retries, monitoring
 */
const { Queue } = require('bullmq');

const redisConnection = process.env.REDIS_URL
  ? { url: process.env.REDIS_URL }
  : { host: process.env.REDIS_HOST || 'localhost', port: parseInt(process.env.REDIS_PORT || '6379'), password: process.env.REDIS_PASSWORD };

const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: { age: 86400, count: 500 },
  removeOnFail: { age: 604800, count: 200 }
};

const generationQueue = new Queue('generation', { connection: redisConnection, defaultJobOptions: DEFAULT_JOB_OPTIONS });
const publishingQueue  = new Queue('publishing',  { connection: redisConnection, defaultJobOptions: { ...DEFAULT_JOB_OPTIONS, attempts: 5 } });
const thumbnailQueue   = new Queue('thumbnails',  { connection: redisConnection, defaultJobOptions: { attempts: 2 } });

const JOB_TYPES = {
  FULL_PIPELINE:     'full_pipeline',
  GENERATE_SCRIPT:   'generate_script',
  GENERATE_IMAGES:   'generate_images',
  GENERATE_VOICE:    'generate_voice',
  GENERATE_VIDEO:    'generate_video',
  GENERATE_CAPTIONS: 'generate_captions',
  RENDER_FINAL:      'render_final',
  UPLOAD_ASSETS:     'upload_assets',
  PUBLISH_POST:      'publish_post',
  BULK_PUBLISH:      'bulk_publish',
  CLEANUP:           'cleanup'
};

async function queueFullPipeline({ userId, creatorId, prompt, platform, scheduledAt }) {
  const jobId = `pipeline_${userId}_${Date.now()}`;
  return generationQueue.add(JOB_TYPES.FULL_PIPELINE, { userId, creatorId, prompt, platform, scheduledAt, jobId }, { priority: 3, jobId });
}

async function queuePublish({ postId, platform, content, scheduledAt }) {
  const delay = scheduledAt ? Math.max(0, new Date(scheduledAt) - Date.now()) : 0;
  return publishingQueue.add(JOB_TYPES.PUBLISH_POST, { postId, platform, content }, { delay });
}

async function getQueueStats() {
  const stats = {};
  for (const [name, queue] of [['generation', generationQueue], ['publishing', publishingQueue], ['thumbnails', thumbnailQueue]]) {
    stats[name] = {
      waiting:   await queue.getWaitingCount(),
      active:    await queue.getActiveCount(),
      completed: await queue.getCompletedCount(),
      failed:    await queue.getFailedCount(),
      delayed:   await queue.getDelayedCount()
    };
  }
  return stats;
}

async function getFailedJobs(queueName = 'generation', limit = 20) {
  const q = { generation: generationQueue, publishing: publishingQueue }[queueName];
  return q ? q.getFailed(0, limit - 1) : [];
}

async function retryJob(queueName, jobId) {
  const q = { generation: generationQueue, publishing: publishingQueue }[queueName];
  const job = await q?.getJob(jobId);
  if (!job) throw new Error('Job not found');
  await job.retry();
  return { retried: true, jobId };
}

module.exports = { generationQueue, publishingQueue, thumbnailQueue, JOB_TYPES, queueFullPipeline, queuePublish, getQueueStats, getFailedJobs, retryJob, redisConnection };
