/**
 * JOB QUEUE — In-memory queue (no Redis required)
 * Falls back gracefully if BullMQ/Redis not available
 */

const jobs = new Map();

function createJob(type, data) {
  const id = `job_${Date.now()}_${Math.random().toString(36).substr(2,9)}`;
  const job = { id, type, data, status: 'pending', createdAt: new Date(), result: null, error: null };
  jobs.set(id, job);
  return job;
}

function updateJob(id, updates) {
  const job = jobs.get(id);
  if (job) jobs.set(id, { ...job, ...updates });
}

function getJob(id) {
  return jobs.get(id) || null;
}

async function queueFullPipeline({ jobId, userId, creatorId, prompt, platform, scheduledAt }) {
  const job = createJob('full_pipeline', { jobId, userId, creatorId, prompt, platform, scheduledAt });
  
  // Run async without blocking response
  setImmediate(async () => {
    try {
      updateJob(job.id, { status: 'active' });
      const { runFullPipeline } = require('../services/pipelineOrchestrator');
      const result = await runFullPipeline({ jobId, userId, creatorId, prompt, platform, scheduledAt });
      updateJob(job.id, { status: 'completed', result });
    } catch (e) {
      updateJob(job.id, { status: 'failed', error: e.message });
    }
  });

  return job;
}

async function queuePublish({ postId, platform, content, scheduledAt }) {
  return createJob('publish', { postId, platform, content, scheduledAt });
}

async function getQueueStats() {
  const all = Array.from(jobs.values());
  return {
    generation: {
      waiting: all.filter(j => j.status === 'pending').length,
      active: all.filter(j => j.status === 'active').length,
      completed: all.filter(j => j.status === 'completed').length,
      failed: all.filter(j => j.status === 'failed').length,
      delayed: 0
    }
  };
}

async function getFailedJobs() {
  return Array.from(jobs.values()).filter(j => j.status === 'failed');
}

async function retryJob(queueName, jobId) {
  const job = jobs.get(jobId);
  if (!job) throw new Error('Job not found');
  updateJob(jobId, { status: 'pending', error: null });
  return { retried: true, jobId };
}

module.exports = { queueFullPipeline, queuePublish, getQueueStats, getFailedJobs, retryJob, getJob, jobs };
