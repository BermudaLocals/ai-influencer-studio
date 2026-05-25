/**
 * GOVERNANCE MIDDLEWARE — Layer 4
 * Plan limits, rate limits, prompt moderation, user isolation
 */
const jwt = require('jsonwebtoken');
const { checkPlanLimit } = require('../services/monitoringEngine');
const logger = require('../services/logger');

// Plan-based resource limits
function planGate(resourceType) {
  return async (req, res, next) => {
    if (!req.user?.id) return res.status(401).json({ error: 'Auth required' });
    const check = await checkPlanLimit(req.user.id, resourceType);
    if (!check.allowed) {
      return res.status(429).json({
        error: 'Plan limit reached',
        resource: resourceType,
        used: check.used,
        limit: check.limit,
        plan: check.plan,
        upgrade: '/billing/upgrade'
      });
    }
    req.planCheck = check;
    next();
  };
}

// Prompt content moderation (basic)
function moderatePrompt(req, res, next) {
  const prompt = req.body?.prompt || req.body?.text || '';
  const blocked = ['child', 'minor', 'underage', 'gore', 'violence against'];
  const found = blocked.find(term => prompt.toLowerCase().includes(term));
  if (found) {
    logger.warn(`[Governance] Blocked prompt containing "${found}" from user ${req.user?.id}`);
    return res.status(400).json({ error: 'Prompt violates content policy', blocked: true });
  }
  next();
}

// Concurrency cap per user
const activeCounts = new Map();
function concurrencyLimit(max = 3) {
  return (req, res, next) => {
    const userId = req.user?.id;
    if (!userId) return next();
    const current = activeCounts.get(userId) || 0;
    if (current >= max) {
      return res.status(429).json({ error: `Too many concurrent jobs (max ${max})` });
    }
    activeCounts.set(userId, current + 1);
    res.on('finish', () => {
      const c = activeCounts.get(userId) || 1;
      activeCounts.set(userId, Math.max(0, c - 1));
    });
    next();
  };
}

module.exports = { planGate, moderatePrompt, concurrencyLimit };
