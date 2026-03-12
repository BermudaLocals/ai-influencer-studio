/**
 * GLOWX AFFILIATE ENGINE
 * Handles: tracking, attribution, commissions, payouts, tier upgrades
 */
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const crypto = require('crypto');

// ── COMMISSION RATES BY PRODUCT ───────────────────────────────────
const COMMISSION_RATES = {
  course:         0.40,   // 40% on $97 course = $38.80 per sale
  glowx_starter:  0.30,   // 30% on $49/mo = $14.70/mo recurring
  glowx_pro:      0.35,   // 35% on $97/mo = $33.95/mo recurring
  glowx_empire:   0.40,   // 40% on $197/mo = $78.80/mo recurring
  ai_studio:      0.30,   // 30% on AI Influencer Studio plans
  one_time_addon: 0.25    // 25% on one-time purchases
};

// ── TIER THRESHOLDS ───────────────────────────────────────────────
const TIERS = {
  standard:  { min: 0,   rate: 0.30, label: 'Standard',  color: '#888' },
  silver:    { min: 10,  rate: 0.35, label: 'Silver',    color: '#C0C0C0' },
  gold:      { min: 50,  rate: 0.40, label: 'Gold',      color: '#FFD700' },
  platinum:  { min: 200, rate: 0.50, label: 'Platinum',  color: '#E5E4E2' }
};

// ── GENERATE UNIQUE REF CODE ──────────────────────────────────────
function generateRefCode(username) {
  const base = username.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${base}${suffix}`;
}

// ── CREATE AFFILIATE ACCOUNT ──────────────────────────────────────
async function createAffiliate(userId, username) {
  let refCode = generateRefCode(username);
  // Ensure uniqueness
  let attempts = 0;
  while (attempts < 5) {
    const exists = await pool.query('SELECT id FROM affiliates WHERE ref_code=$1', [refCode]);
    if (!exists.rows.length) break;
    refCode = generateRefCode(username + attempts);
    attempts++;
  }
  const result = await pool.query(
    `INSERT INTO affiliates (user_id, ref_code, tier, commission_rate)
     VALUES ($1, $2, 'standard', 0.30)
     ON CONFLICT (user_id) DO UPDATE SET updated_at=NOW()
     RETURNING *`,
    [userId, refCode]
  );
  await pool.query('UPDATE users SET affiliate_id=$1 WHERE id=$2', [result.rows[0].id, userId]);
  return result.rows[0];
}

// ── TRACK CLICK ───────────────────────────────────────────────────
async function trackClick({ refCode, ip, userAgent, landingPage, utm = {} }) {
  const affiliate = await pool.query('SELECT id FROM affiliates WHERE ref_code=$1 AND status=\'active\'', [refCode]);
  if (!affiliate.rows[0]) return null;

  const ipHash = crypto.createHash('sha256').update(ip || '').digest('hex');
  await pool.query(
    `INSERT INTO affiliate_clicks (ref_code, affiliate_id, ip_hash, user_agent, landing_page, utm_source, utm_medium, utm_campaign)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [refCode, affiliate.rows[0].id, ipHash, userAgent?.slice(0,200), landingPage, utm.source, utm.medium, utm.campaign]
  );
  await pool.query('UPDATE affiliates SET total_clicks=total_clicks+1 WHERE ref_code=$1', [refCode]);
  return affiliate.rows[0].id;
}

// ── TRACK SIGNUP (free) ───────────────────────────────────────────
async function trackSignup({ userId, refCode }) {
  if (!refCode) return;
  const affiliate = await pool.query('SELECT * FROM affiliates WHERE ref_code=$1', [refCode]);
  if (!affiliate.rows[0]) return;

  const aff = affiliate.rows[0];
  // Record on user
  await pool.query('UPDATE users SET referred_by_code=$1, referred_by_id=$2 WHERE id=$3', [refCode, aff.id, userId]);
  // Track conversion
  await pool.query(
    `INSERT INTO affiliate_conversions (affiliate_id, referred_user_id, ref_code, conversion_type, product, gross_amount, commission_rate, commission_amount, status)
     VALUES ($1,$2,$3,'signup','glowx',0,0,0,'approved')`,
    [aff.id, userId, refCode]
  );
  await pool.query('UPDATE affiliates SET total_signups=total_signups+1 WHERE id=$1', [aff.id]);
}

// ── TRACK PURCHASE (paid conversion) ─────────────────────────────
async function trackPurchase({ userId, product, grossAmount, stripePaymentIntent }) {
  // Find who referred this user
  const userResult = await pool.query('SELECT referred_by_id, referred_by_code FROM users WHERE id=$1', [userId]);
  const user = userResult.rows[0];
  if (!user?.referred_by_id) return null;

  const affiliate = await pool.query('SELECT * FROM affiliates WHERE id=$1', [user.referred_by_id]);
  if (!affiliate.rows[0]) return null;
  const aff = affiliate.rows[0];

  // Get commission rate (product-specific OR affiliate tier rate, whichever is higher)
  const productRate = COMMISSION_RATES[product] || 0.30;
  const commissionRate = Math.max(productRate, aff.commission_rate);
  const commissionAmount = Math.round(grossAmount * commissionRate * 100) / 100;

  // Create conversion record
  const conv = await pool.query(
    `INSERT INTO affiliate_conversions (affiliate_id, referred_user_id, ref_code, conversion_type, product, gross_amount, commission_rate, commission_amount, status, stripe_payment_intent)
     VALUES ($1,$2,$3,'purchase',$4,$5,$6,$7,'pending',$8) RETURNING id`,
    [aff.id, userId, user.referred_by_code, product, grossAmount, commissionRate, commissionAmount, stripePaymentIntent]
  );

  // Update affiliate totals
  await pool.query(
    `UPDATE affiliates SET
       total_conversions = total_conversions + 1,
       total_earned = total_earned + $1,
       pending_balance = pending_balance + $1,
       updated_at = NOW()
     WHERE id = $2`,
    [commissionAmount, aff.id]
  );

  // Check tier upgrade
  await checkTierUpgrade(aff.id);

  return { conversionId: conv.rows[0].id, commissionAmount, commissionRate };
}

// ── APPROVE COMMISSIONS (after 14-day refund window) ─────────────
async function approveCommissions() {
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const result = await pool.query(
    `UPDATE affiliate_conversions SET status='approved', approved_at=NOW()
     WHERE status='pending' AND created_at < $1 RETURNING *`,
    [cutoff]
  );
  return result.rows.length;
}

// ── CHECK + APPLY TIER UPGRADE ────────────────────────────────────
async function checkTierUpgrade(affiliateId) {
  const aff = await pool.query('SELECT * FROM affiliates WHERE id=$1', [affiliateId]);
  if (!aff.rows[0]) return;
  const { total_conversions, tier } = aff.rows[0];

  let newTier = 'standard';
  if (total_conversions >= TIERS.platinum.min) newTier = 'platinum';
  else if (total_conversions >= TIERS.gold.min) newTier = 'gold';
  else if (total_conversions >= TIERS.silver.min) newTier = 'silver';

  if (newTier !== tier) {
    await pool.query(
      'UPDATE affiliates SET tier=$1, commission_rate=$2, updated_at=NOW() WHERE id=$3',
      [newTier, TIERS[newTier].rate, affiliateId]
    );
    return { upgraded: true, newTier, newRate: TIERS[newTier].rate };
  }
  return { upgraded: false };
}

// ── REQUEST PAYOUT ────────────────────────────────────────────────
async function requestPayout({ affiliateId, amount, method, details }) {
  const aff = await pool.query('SELECT * FROM affiliates WHERE id=$1', [affiliateId]);
  if (!aff.rows[0]) throw new Error('Affiliate not found');

  const MIN_PAYOUT = 50; // $50 minimum
  if (aff.rows[0].pending_balance < MIN_PAYOUT) throw new Error(`Minimum payout is $${MIN_PAYOUT}`);
  if (amount > aff.rows[0].pending_balance) throw new Error('Insufficient balance');

  const payout = await pool.query(
    `INSERT INTO affiliate_payouts (affiliate_id, amount, method, details, status)
     VALUES ($1,$2,$3,$4,'pending') RETURNING id`,
    [affiliateId, amount, method, JSON.stringify(details)]
  );
  // Reserve the funds
  await pool.query('UPDATE affiliates SET pending_balance=pending_balance-$1 WHERE id=$2', [amount, affiliateId]);
  return payout.rows[0];
}

// ── GET AFFILIATE DASHBOARD DATA ──────────────────────────────────
async function getAffiliateDashboard(userId) {
  const aff = await pool.query('SELECT * FROM affiliates WHERE user_id=$1', [userId]);
  if (!aff.rows[0]) return null;
  const a = aff.rows[0];

  // Recent conversions
  const conversions = await pool.query(
    `SELECT * FROM affiliate_conversions WHERE affiliate_id=$1 ORDER BY created_at DESC LIMIT 20`,
    [a.id]
  );

  // Monthly earnings
  const monthly = await pool.query(
    `SELECT DATE_TRUNC('month', created_at) as month, SUM(commission_amount) as earned, COUNT(*) as sales
     FROM affiliate_conversions WHERE affiliate_id=$1 AND status IN ('approved','paid')
     GROUP BY month ORDER BY month DESC LIMIT 6`,
    [a.id]
  );

  // Next tier info
  const currentTier = TIERS[a.tier] || TIERS.standard;
  const tierKeys = Object.keys(TIERS);
  const nextTierKey = tierKeys[tierKeys.indexOf(a.tier) + 1];
  const nextTier = nextTierKey ? { ...TIERS[nextTierKey], key: nextTierKey, conversionsNeeded: TIERS[nextTierKey].min - a.total_conversions } : null;

  return {
    affiliate: { ...a, refUrl: `${process.env.GLOWX_URL || 'https://glowx.com'}?ref=${a.ref_code}` },
    currentTier: { ...currentTier, key: a.tier },
    nextTier,
    conversions: conversions.rows,
    monthlyEarnings: monthly.rows,
    links: {
      course:    `${process.env.COURSE_URL || 'https://course.glowx.com'}?ref=${a.ref_code}`,
      glowx:     `${process.env.GLOWX_URL || 'https://glowx.com'}?ref=${a.ref_code}`,
      aiStudio:  `${process.env.STUDIO_URL || 'https://ai-influencer-studio-production.up.railway.app'}?ref=${a.ref_code}`
    }
  };
}

// ── GET LEADERBOARD ───────────────────────────────────────────────
async function getLeaderboard(limit = 20) {
  return pool.query(
    `SELECT a.ref_code, a.tier, a.total_conversions, a.total_earned,
            u.username, u.display_name
     FROM affiliates a JOIN users u ON a.user_id=u.id
     WHERE a.status='active'
     ORDER BY a.total_earned DESC LIMIT $1`,
    [limit]
  );
}

module.exports = {
  createAffiliate, trackClick, trackSignup, trackPurchase,
  approveCommissions, requestPayout, getAffiliateDashboard,
  getLeaderboard, checkTierUpgrade, COMMISSION_RATES, TIERS
};
