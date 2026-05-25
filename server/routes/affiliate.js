/**
 * GLOWX AFFILIATE ROUTES
 * Public: click tracking, signup attribution
 * Private: dashboard, payouts, link generation
 * Admin: approve commissions, manage affiliates
 */
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const {
  createAffiliate, trackClick, trackSignup, trackPurchase,
  approveCommissions, requestPayout, getAffiliateDashboard,
  getLeaderboard, TIERS
} = require('../services/affiliateEngine');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

function auth(req, res, next) {
  try { req.user = jwt.verify((req.headers.authorization||'').replace('Bearer ',''), process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Unauthorized' }); }
}
function adminAuth(req, res, next) {
  try {
    const user = jwt.verify((req.headers.authorization||'').replace('Bearer ',''), process.env.JWT_SECRET);
    if (user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    req.user = user; next();
  } catch { res.status(401).json({ error: 'Unauthorized' }); }
}

// ── PUBLIC ────────────────────────────────────────────────────────

// GET /api/affiliate/track?ref=CODE — called when someone visits with ref link
router.get('/track', async (req, res) => {
  const { ref, page, utm_source, utm_medium, utm_campaign } = req.query;
  if (!ref) return res.json({ tracked: false });
  try {
    await trackClick({
      refCode: ref,
      ip: req.ip || req.headers['x-forwarded-for'],
      userAgent: req.headers['user-agent'],
      landingPage: page || '/',
      utm: { source: utm_source, medium: utm_medium, campaign: utm_campaign }
    });
    // Set cookie for attribution (30 days)
    res.cookie('glowx_ref', ref, { maxAge: 30*24*60*60*1000, httpOnly: true, sameSite: 'lax' });
    res.json({ tracked: true, ref });
  } catch(e) { res.json({ tracked: false, error: e.message }); }
});

// GET /api/affiliate/leaderboard — public leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const lb = await getLeaderboard(20);
    // Anonymise partially
    const data = lb.rows.map((r, i) => ({
      rank: i + 1,
      handle: r.ref_code.slice(0, 4) + '***',
      tier: r.tier,
      conversions: r.total_conversions,
      earned: i < 3 ? r.total_earned : null // only show top 3 earnings
    }));
    res.json(data);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/affiliate/info?ref=CODE — check if ref code is valid
router.get('/info', async (req, res) => {
  const { ref } = req.query;
  if (!ref) return res.status(400).json({ error: 'ref required' });
  try {
    const result = await pool.query(
      `SELECT a.ref_code, a.tier, u.display_name as affiliate_name
       FROM affiliates a JOIN users u ON a.user_id=u.id
       WHERE a.ref_code=$1 AND a.status='active'`, [ref]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Invalid ref code' });
    res.json({ valid: true, ...result.rows[0] });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/affiliate/tiers — all tier info (for the join page)
router.get('/tiers', (req, res) => {
  res.json(Object.entries(TIERS).map(([key, t]) => ({ key, ...t })));
});

// ── AUTH REQUIRED ─────────────────────────────────────────────────

// POST /api/affiliate/join — become an affiliate
router.post('/join', auth, async (req, res) => {
  try {
    const user = await pool.query('SELECT * FROM users WHERE id=$1', [req.user.id]);
    if (!user.rows[0]) return res.status(404).json({ error: 'User not found' });
    const existing = await pool.query('SELECT * FROM affiliates WHERE user_id=$1', [req.user.id]);
    if (existing.rows[0]) return res.json({ already: true, affiliate: existing.rows[0] });
    const affiliate = await createAffiliate(req.user.id, user.rows[0].username || user.rows[0].email.split('@')[0]);
    res.json({ created: true, affiliate });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/affiliate/dashboard — full dashboard data
router.get('/dashboard', auth, async (req, res) => {
  try {
    const data = await getAffiliateDashboard(req.user.id);
    if (!data) return res.status(404).json({ error: 'Not an affiliate — POST /api/affiliate/join first' });
    res.json(data);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/affiliate/links — all trackable links
router.get('/links', auth, async (req, res) => {
  try {
    const aff = await pool.query('SELECT * FROM affiliates WHERE user_id=$1', [req.user.id]);
    if (!aff.rows[0]) return res.status(404).json({ error: 'Not an affiliate' });
    const ref = aff.rows[0].ref_code;
    const base = process.env.GLOWX_URL || 'https://glowx.com';
    const courseBase = process.env.COURSE_URL || 'https://course.aigrowth-hq.com';
    const studioBase = process.env.STUDIO_URL || 'https://ai-influencer-studio-production.up.railway.app';
    res.json({
      ref_code: ref,
      links: [
        { name: 'GlowX Homepage',         url: `${base}?ref=${ref}`,            commission: '30–50%', product: 'glowx' },
        { name: 'GlowX Pricing Page',     url: `${base}/pricing?ref=${ref}`,    commission: '30–50%', product: 'glowx' },
        { name: 'Course ($97)',           url: `${courseBase}?ref=${ref}`,      commission: '40%',    product: 'course' },
        { name: 'AI Influencer Studio',   url: `${studioBase}?ref=${ref}`,     commission: '30%',    product: 'ai_studio' },
        { name: 'Fanvue Signup',          url: `https://fanvue.com/sign-up?referralCode=${ref}`, commission: 'Fanvue rates', product: 'fanvue' }
      ],
      utm_builder: `${base}?ref=${ref}&utm_source=YOUR_SOURCE&utm_medium=YOUR_PLATFORM&utm_campaign=YOUR_CAMPAIGN`
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/affiliate/payout — request a payout
router.post('/payout', auth, async (req, res) => {
  const { amount, method, details } = req.body;
  if (!amount || !method) return res.status(400).json({ error: 'amount and method required' });
  try {
    const aff = await pool.query('SELECT * FROM affiliates WHERE user_id=$1', [req.user.id]);
    if (!aff.rows[0]) return res.status(404).json({ error: 'Not an affiliate' });
    const payout = await requestPayout({ affiliateId: aff.rows[0].id, amount: parseFloat(amount), method, details });
    res.json({ requested: true, payout });
  } catch(e) { res.status(400).json({ error: e.message }); }
});

// GET /api/affiliate/conversions — list conversions
router.get('/conversions', auth, async (req, res) => {
  const { limit = 50, status } = req.query;
  try {
    const aff = await pool.query('SELECT id FROM affiliates WHERE user_id=$1', [req.user.id]);
    if (!aff.rows[0]) return res.status(404).json({ error: 'Not an affiliate' });
    const where = status ? 'AND status=$3' : '';
    const params = status ? [aff.rows[0].id, parseInt(limit), status] : [aff.rows[0].id, parseInt(limit)];
    const convs = await pool.query(
      `SELECT * FROM affiliate_conversions WHERE affiliate_id=$1 ${where} ORDER BY created_at DESC LIMIT $2`, params
    );
    res.json(convs.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── WEBHOOK: Stripe purchase event ────────────────────────────────
// POST /api/affiliate/webhook/purchase — called by Stripe/SwiftPay after payment
router.post('/webhook/purchase', async (req, res) => {
  const { userId, product, grossAmount, stripePaymentIntent, refCode } = req.body;
  // Verify webhook secret
  const webhookSecret = req.headers['x-webhook-secret'];
  if (webhookSecret !== process.env.AFFILIATE_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Invalid webhook secret' });
  }
  try {
    const result = await trackPurchase({ userId, product, grossAmount: parseFloat(grossAmount), stripePaymentIntent });
    res.json({ tracked: true, result });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── ADMIN ─────────────────────────────────────────────────────────

// POST /api/affiliate/admin/approve — approve pending commissions
router.post('/admin/approve', adminAuth, async (req, res) => {
  try {
    const approved = await approveCommissions();
    res.json({ approved, message: `${approved} commissions approved` });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/affiliate/admin/all — all affiliates
router.get('/admin/all', adminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, u.email, u.display_name FROM affiliates a JOIN users u ON a.user_id=u.id
       ORDER BY a.total_earned DESC LIMIT 200`
    );
    res.json(result.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/affiliate/admin/:id — update affiliate (rate, tier, status)
router.patch('/admin/:id', adminAuth, async (req, res) => {
  const { commission_rate, tier, status } = req.body;
  const updates = [], params = [];
  if (commission_rate) { updates.push(`commission_rate=$${params.length+1}`); params.push(commission_rate); }
  if (tier) { updates.push(`tier=$${params.length+1}`); params.push(tier); }
  if (status) { updates.push(`status=$${params.length+1}`); params.push(status); }
  if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
  params.push(req.params.id);
  try {
    await pool.query(`UPDATE affiliates SET ${updates.join(',')} WHERE id=$${params.length}`, params);
    res.json({ updated: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/affiliate/admin/payout/:id/process — mark payout as paid
router.post('/admin/payout/:id/process', adminAuth, async (req, res) => {
  const { reference } = req.body;
  try {
    await pool.query(
      `UPDATE affiliate_payouts SET status='paid', reference=$1, processed_at=NOW() WHERE id=$2`,
      [reference, req.params.id]
    );
    // Update affiliate totals
    const payout = await pool.query('SELECT * FROM affiliate_payouts WHERE id=$1', [req.params.id]);
    if (payout.rows[0]) {
      await pool.query(
        'UPDATE affiliates SET total_paid=total_paid+$1 WHERE id=$2',
        [payout.rows[0].amount, payout.rows[0].affiliate_id]
      );
    }
    res.json({ processed: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
