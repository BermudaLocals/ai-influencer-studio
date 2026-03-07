const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false
});
const JWT_SECRET = process.env.JWT_SECRET || 'dollardouble_change_this';
const BASE_URL = process.env.BASE_URL || 'https://ai-influencer-studio-production.up.railway.app';

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
};

const PACKS = {
  starter: { credits: 500,   price: 920,  name: 'Starter Pack',  description: '500 AI credits' },
  value:   { credits: 2000,  price: 2645, name: 'Value Pack',    description: '2,000 credits — save 43%' },
  agency:  { credits: 10000, price: 6670, name: 'Agency Pack',   description: '10,000 credits — save 60%' },
};

const PLANS = {
  basic:  { credits: 500,  price_id: process.env.STRIPE_BASIC_PRICE_ID,  name: 'Basic' },
  pro:    { credits: 1000, price_id: process.env.STRIPE_PRO_PRICE_ID,    name: 'Pro' },
  agency: { credits: 5000, price_id: process.env.STRIPE_AGENCY_PRICE_ID, name: 'Agency' },
};

router.get('/packs', (req, res) => res.json({ packs: PACKS, plans: PLANS }));

router.get('/balance', auth, async (req, res) => {
  try {
    const r = await pool.query('SELECT credits, plan FROM users WHERE id = $1', [req.user.id]);
    res.json(r.rows[0] || { credits: 0, plan: 'free' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/checkout', auth, async (req, res) => {
  const pack = PACKS[req.body.pack];
  if (!pack) return res.status(400).json({ error: 'Invalid pack' });
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'klarna', 'afterpay_clearpay'],
      line_items: [{ price_data: { currency: 'gbp', product_data: { name: pack.name, description: pack.description }, unit_amount: pack.price }, quantity: 1 }],
      mode: 'payment',
      success_url: `${BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}&pack=${req.body.pack}`,
      cancel_url: `${BASE_URL}/billing`,
      metadata: { user_id: req.user.id, pack: req.body.pack, credits: pack.credits.toString() }
    });
    res.json({ url: session.url });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/subscribe', auth, async (req, res) => {
  const plan = PLANS[req.body.plan];
  if (!plan?.price_id) return res.status(400).json({ error: 'Invalid plan or price ID not set' });
  try {
    const u = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    let cid = u.rows[0]?.stripe_customer_id;
    if (!cid) {
      const c = await stripe.customers.create({ email: u.rows[0].email, metadata: { user_id: req.user.id } });
      cid = c.id;
      await pool.query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [cid, req.user.id]);
    }
    const session = await stripe.checkout.sessions.create({
      customer: cid,
      payment_method_types: ['card', 'klarna'],
      line_items: [{ price: plan.price_id, quantity: 1 }],
      mode: 'subscription',
      success_url: `${BASE_URL}/success?plan=${req.body.plan}`,
      cancel_url: `${BASE_URL}/billing`,
      metadata: { user_id: req.user.id, plan: req.body.plan }
    });
    res.json({ url: session.url });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
    if (event.type === 'checkout.session.completed') {
      const { user_id, pack, credits, plan } = event.data.object.metadata;
      if (credits) await pool.query('UPDATE users SET credits = credits + $1 WHERE id = $2', [parseInt(credits), user_id]);
      if (plan && PLANS[plan]) await pool.query('UPDATE users SET plan = $1, credits = credits + $2 WHERE id = $3', [plan, PLANS[plan].credits, user_id]);
    }
    if (event.type === 'invoice.payment_succeeded' && event.data.object.subscription) {
      const sub = await stripe.subscriptions.retrieve(event.data.object.subscription).catch(() => null);
      if (sub?.metadata?.user_id && PLANS[sub.metadata.plan])
        await pool.query('UPDATE users SET credits = credits + $1 WHERE id = $2', [PLANS[sub.metadata.plan].credits, sub.metadata.user_id]);
    }
  } catch (err) { return res.status(400).json({ error: err.message }); }
  res.json({ received: true });
});

router.post('/deduct', auth, async (req, res) => {
  const { amount, tool } = req.body;
  if (!amount) return res.status(400).json({ error: 'Amount required' });
  try {
    const r = await pool.query('SELECT credits FROM users WHERE id = $1', [req.user.id]);
    const current = r.rows[0]?.credits || 0;
    if (current < amount) return res.status(402).json({ error: 'Insufficient credits', credits: current });
    await pool.query('UPDATE users SET credits = credits - $1 WHERE id = $2', [amount, req.user.id]);
    res.json({ success: true, credits_remaining: current - amount });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
