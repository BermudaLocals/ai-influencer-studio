
const router = require('express').Router();
const axios  = require('axios');
const { Pool } = require('pg');
const { authRequired } = require('./auth');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  max: 5,
});

const APP_URL = process.env.APP_URL || 'https://ai-influencer-studio-production.up.railway.app';
const PAYPAL_API = process.env.PAYPAL_ENV === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

// ── Credit Packs ─────────────────────────────────
const CREDIT_PACKS = [
  { id: 'pack_500',   name: 'Starter Pack',  credits: 500,   price: '9.00',  description: '500 credits — great for testing' },
  { id: 'pack_2000',  name: 'Creator Pack',  credits: 2000,  price: '23.00', description: '2,000 credits — best value ⭐' },
  { id: 'pack_10000', name: 'Agency Pack',   credits: 10000, price: '58.00', description: '10,000 credits — agency scale' },
];

const PLANS = [
  { id: 'starter', name: 'Starter', credits: 500,  price: '47.00',  interval: 'month' },
  { id: 'pro',     name: 'Pro',     credits: 1000, price: '147.00', interval: 'month' },
  { id: 'agency',  name: 'Agency',  credits: 5000, price: '447.00', interval: 'month' },
];

// ── PayPal Auth ───────────────────────────────────
async function getPayPalToken() {
  const cid = process.env.PAYPAL_CLIENT_ID;
  const sec = process.env.PAYPAL_SECRET;
  if (!cid || !sec) throw new Error('PayPal credentials not configured');

  const res = await axios.post(
    `${PAYPAL_API}/v1/oauth2/token`,
    'grant_type=client_credentials',
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      auth: { username: cid, password: sec } }
  );
  return res.data.access_token;
}

// ── List Packs ────────────────────────────────────
router.get('/packs', (req, res) => {
  res.json({ ok: true, packs: CREDIT_PACKS, plans: PLANS });
});

// ── User Credit Balance ───────────────────────────
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

// ── Create PayPal Order (one-time pack purchase) ──
router.post('/checkout', authRequired, async (req, res) => {
  try {
    const { pack_id } = req.body;
    const pack = CREDIT_PACKS.find(p => p.id === pack_id);
    if (!pack) return res.status(400).json({ error: 'Invalid pack ID' });

    const token = await getPayPalToken();
    const order = await axios.post(`${PAYPAL_API}/v2/checkout/orders`, {
      intent: 'CAPTURE',
      purchase_units: [{
        amount: { currency_code: 'USD', value: pack.price },
        description: `AI Influencer Studio — ${pack.name} (${pack.credits} credits)`,
        custom_id: `${req.user.id}:${pack.credits}:${pack_id}`,
      }],
      application_context: {
        brand_name: 'AI Influencer Studio',
        return_url: `${APP_URL}/payment-success`,
        cancel_url:  `${APP_URL}/payment-cancelled`,
        user_action: 'PAY_NOW',
      },
    }, { headers: { Authorization: `Bearer ${token}` } });

    const approvalUrl = order.data.links.find(l => l.rel === 'approve')?.href;
    res.json({ ok: true, order_id: order.data.id, approval_url: approvalUrl, pack });
  } catch(e) {
    console.error('[TOKENS] checkout error:', e.response?.data || e.message);
    res.status(500).json({ error: e.response?.data?.message || e.message });
  }
});

// ── Capture PayPal Order (called after user approves) ──
router.post('/capture', authRequired, async (req, res) => {
  try {
    const { order_id } = req.body;
    if (!order_id) return res.status(400).json({ error: 'order_id required' });

    const token = await getPayPalToken();

    // Get order details to extract metadata
    const details = await axios.get(`${PAYPAL_API}/v2/checkout/orders/${order_id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const customId = details.data.purchase_units[0]?.custom_id || '';
    const [userId, credits] = customId.split(':');

    // Capture the payment
    const capture = await axios.post(
      `${PAYPAL_API}/v2/checkout/orders/${order_id}/capture`, {},
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );

    if (capture.data.status === 'COMPLETED') {
      const uid  = parseInt(userId) || req.user.id;
      const cred = parseInt(credits) || 0;
      if (cred > 0) {
        await pool.query(
          'UPDATE users SET credits = credits + $1, updated_at = NOW() WHERE id = $2',
          [cred, uid]
        );
        console.log(`[PAYPAL] +${cred} credits → user ${uid}`);
      }
      res.json({ ok: true, status: 'COMPLETED', credits_added: cred, order_id });
    } else {
      res.status(400).json({ error: 'Payment not completed', status: capture.data.status });
    }
  } catch(e) {
    console.error('[TOKENS] capture error:', e.response?.data || e.message);
    res.status(500).json({ error: e.response?.data?.message || e.message });
  }
});

// ── Subscribe to Plan (PayPal Subscription) ───────
router.post('/subscribe', authRequired, async (req, res) => {
  try {
    const { plan_id } = req.body;
    const plan = PLANS.find(p => p.id === plan_id);
    if (!plan) return res.status(400).json({ error: 'Invalid plan' });

    // For subscriptions, use one-time order with plan metadata
    // (Full PayPal Billing Plans require pre-created plan IDs in PayPal dashboard)
    const token = await getPayPalToken();
    const order = await axios.post(`${PAYPAL_API}/v2/checkout/orders`, {
      intent: 'CAPTURE',
      purchase_units: [{
        amount: { currency_code: 'USD', value: plan.price },
        description: `AI Influencer Studio — ${plan.name} Plan (${plan.credits} credits/mo)`,
        custom_id: `${req.user.id}:${plan.credits}:${plan_id}`,
      }],
      application_context: {
        brand_name: 'AI Influencer Studio',
        return_url: `${APP_URL}/subscribed`,
        cancel_url:  `${APP_URL}/payment-cancelled`,
        user_action: 'SUBSCRIBE_NOW',
      },
    }, { headers: { Authorization: `Bearer ${token}` } });

    const approvalUrl = order.data.links.find(l => l.rel === 'approve')?.href;
    res.json({ ok: true, order_id: order.data.id, approval_url: approvalUrl, plan });
  } catch(e) {
    console.error('[TOKENS] subscribe error:', e.response?.data || e.message);
    res.status(500).json({ error: e.response?.data?.message || e.message });
  }
});

// ── Admin: Manually Add Credits ───────────────────
router.post('/admin/add-credits', authRequired, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { user_id, credits } = req.body;
  try {
    await pool.query(
      'UPDATE users SET credits = credits + $1 WHERE id = $2', [credits, user_id]
    );
    res.json({ ok: true, added: credits, user_id });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
