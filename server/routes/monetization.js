// server/routes/monetization.js
const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');

function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h) return res.status(401).json({ error: 'No token' });
  try { req.user = jwt.verify(h.replace('Bearer ', ''), process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
}

// Subscription tiers
router.get('/plans', (req, res) => {
  res.json({
    plans: [
      { id: 'starter',  name: 'Starter',  price: 4.99,  tokens: 30,   description: '30 tokens — try it free' },
      { id: 'creator',  name: 'Creator',  price: 12.99, tokens: 100,  description: '100 tokens — for creators' },
      { id: 'empire',   name: 'Empire',   price: 34.99, tokens: 300,  description: '300 tokens — full empire' },
      { id: 'sub',      name: 'Creator Sub', price: 14.99, tokens: 200, description: '£14.99/mo — unlimited access' },
    ]
  });
});

// Token balance
router.get('/balance', auth, async (req, res) => {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  try {
    const r = await pool.query('SELECT credits, plan FROM users WHERE id=$1', [req.user.id]);
    res.json(r.rows[0] || { credits: 0, plan: 'free' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PayPal checkout — create order
router.post('/checkout', auth, async (req, res) => {
  const { plan_id } = req.body;
  const plans = { starter: 4.99, creator: 12.99, empire: 34.99, sub: 14.99 };
  const amount = plans[plan_id];
  if (!amount) return res.status(400).json({ error: 'Invalid plan' });

  if (!process.env.PAYPAL_CLIENT_ID) {
    return res.status(400).json({ error: 'Add PAYPAL_CLIENT_ID to Railway' });
  }

  try {
    // Get PayPal access token
    const tokenRes = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });
    const { access_token } = await tokenRes.json();

    // Create order
    const orderRes = await fetch('https://api-m.paypal.com/v2/checkout/orders', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{ amount: { currency_code: 'GBP', value: String(amount) }, description: `Empire ${plan_id} pack` }],
        application_context: {
          return_url: `${process.env.BASE_URL}/api/monetization/success`,
          cancel_url: `${process.env.BASE_URL}/api/monetization/cancel`
        }
      })
    });
    const order = await orderRes.json();
    const approvalUrl = order.links?.find(l => l.rel === 'approve')?.href;
    res.json({ success: true, order_id: order.id, approval_url: approvalUrl });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/success', (req, res) => {
  res.json({ success: true, message: 'Payment complete — credits added to your account' });
});

router.get('/cancel', (req, res) => {
  res.json({ cancelled: true, message: 'Payment cancelled' });
});

module.exports = router;
