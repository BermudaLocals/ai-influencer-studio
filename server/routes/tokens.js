const router = require('express').Router();
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;
const { Pool } = require('pg');
const { authRequired } = require('./auth');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  max: 5,
});

// ── CREDIT PACKS ───────────────────────────────────────────────
const CREDIT_PACKS = [
  { id: 'pack_500',   name: 'Starter Pack',  credits: 500,   price: 900,  description: '500 credits — great for testing' },
  { id: 'pack_2000',  name: 'Creator Pack',  credits: 2000,  price: 2300, description: '2,000 credits — best value ⭐' },
  { id: 'pack_10000', name: 'Agency Pack',   credits: 10000, price: 5800, description: '10,000 credits — agency scale' },
];

// ── SUBSCRIPTION PLANS ─────────────────────────────────────────
const PLANS = [
  { id: 'starter', name: 'Starter',  credits: 500,  price: 4700,  interval: 'month' },
  { id: 'pro',     name: 'Pro',      credits: 1000, price: 14700, interval: 'month' },
  { id: 'agency',  name: 'Agency',   credits: 5000, price: 44700, interval: 'month' },
];

// ── LIST PACKS ─────────────────────────────────────────────────
router.get('/packs', (req, res) => {
  res.json({ ok: true, packs: CREDIT_PACKS, plans: PLANS });
});

// ── GET USER CREDITS ───────────────────────────────────────────
router.get('/balance', authRequired, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT credits, plan FROM users WHERE id=$1', [req.user.id]
    );
    res.json({ ok: true, credits: rows[0]?.credits || 0, plan: rows[0]?.plan || 'free' });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── CREATE CHECKOUT SESSION ────────────────────────────────────
router.post('/checkout', authRequired, async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Payments not configured — set STRIPE_SECRET_KEY' });
  try {
    const { pack_id, success_url, cancel_url } = req.body;
    const pack = CREDIT_PACKS.find(p => p.id === pack_id);
    if (!pack) return res.status(400).json({ error: 'Invalid pack ID' });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: req.user.email,
      payment_method_types: ['card'],
      payment_method_options: {
        card: { installments: { enabled: true } },
      },
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: pack.name, description: pack.description },
          unit_amount: pack.price,
        },
        quantity: 1,
      }],
      metadata: { user_id: String(req.user.id), credits: String(pack.credits), pack_id },
      success_url: success_url || `${process.env.APP_URL || 'https://ai-influencer-studio-production.up.railway.app'}/?payment=success`,
      cancel_url:  cancel_url  || `${process.env.APP_URL || 'https://ai-influencer-studio-production.up.railway.app'}/?payment=cancelled`,
    });

    res.json({ ok: true, checkout_url: session.url, session_id: session.id });
  } catch(e) {
    console.error('[TOKENS] checkout error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── SUBSCRIBE TO PLAN ──────────────────────────────────────────
router.post('/subscribe', authRequired, async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Payments not configured' });
  try {
    const { plan_id, success_url, cancel_url } = req.body;
    const plan = PLANS.find(p => p.id === plan_id);
    if (!plan) return res.status(400).json({ error: 'Invalid plan' });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: req.user.email,
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `AI Studio ${plan.name}` },
          unit_amount: plan.price,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      metadata: { user_id: String(req.user.id), plan_id, credits: String(plan.credits) },
      success_url: success_url || `${process.env.APP_URL || 'https://ai-influencer-studio-production.up.railway.app'}/?subscribed=true`,
      cancel_url:  cancel_url  || `${process.env.APP_URL || 'https://ai-influencer-studio-production.up.railway.app'}/?payment=cancelled`,
    });

    res.json({ ok: true, checkout_url: session.url });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── STRIPE WEBHOOK ─────────────────────────────────────────────
router.post('/webhook', require('express').raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch(e) {
    console.error('[WEBHOOK] signature error:', e.message);
    return res.status(400).json({ error: 'Webhook signature invalid' });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId  = parseInt(session.metadata?.user_id);
      const credits  = parseInt(session.metadata?.credits || 0);
      const planId   = session.metadata?.plan_id;

      if (userId && credits > 0) {
        await pool.query(
          'UPDATE users SET credits = credits + $1, updated_at = NOW() WHERE id = $2',
          [credits, userId]
        );
        console.log(`[WEBHOOK] +${credits} credits → user ${userId}`);
      }
      if (planId) {
        await pool.query(
          'UPDATE users SET plan = $1, updated_at = NOW() WHERE id = $2',
          [planId, userId]
        );
        console.log(`[WEBHOOK] plan → ${planId} for user ${userId}`);
      }
    }

    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object;
      const custId  = invoice.customer;
      const { rows } = await pool.query('SELECT id, plan FROM users WHERE stripe_customer=$1', [custId]);
      if (rows.length) {
        const plan = PLANS.find(p => p.id === rows[0].plan);
        if (plan) {
          await pool.query(
            'UPDATE users SET credits = credits + $1, updated_at = NOW() WHERE id = $2',
            [plan.credits, rows[0].id]
          );
          console.log(`[WEBHOOK] Monthly renewal +${plan.credits} → user ${rows[0].id}`);
        }
      }
    }

    res.json({ received: true });
  } catch(e) {
    console.error('[WEBHOOK] processing error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── ADMIN: MANUALLY ADD CREDITS ────────────────────────────────
router.post('/admin/add-credits', authRequired, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { user_id, credits } = req.body;
  try {
    await pool.query('UPDATE users SET credits = credits + $1 WHERE id = $2', [credits, user_id]);
    res.json({ ok: true, added: credits });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
