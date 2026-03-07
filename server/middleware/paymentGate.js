// middleware/paymentGate.js â€” Blocks access if subscription expired
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL , ssl: { rejectUnauthorized: false }});

const paymentGate = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await pool.query(
      'SELECT plan, subscription_status, subscription_end, grace_period_end FROM users WHERE id=$1',
      [userId]
    );
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'User not found' });

    const now = new Date();

    // ACTIVE â€” pass through
    if (user.subscription_status === 'active' || user.plan === 'free') return next();

    // GRACE PERIOD (7 days after failed payment) â€” warn but allow
    if (user.grace_period_end && new Date(user.grace_period_end) > now) {
      const daysLeft = Math.ceil((new Date(user.grace_period_end) - now) / 86400000);
      res.set('X-Payment-Warning', `Payment failed. ${daysLeft} days until creators are suspended.`);
      return next();
    }

    // EXPIRED â€” block and suspend creators
    if (['cancelled','expired','past_due'].includes(user.subscription_status)) {
      await pool.query(
        `UPDATE influencers SET status='suspended', suspended_at=NOW()
         WHERE user_id=$1 AND status='active'`,
        [userId]
      );
      return res.status(402).json({
        error: 'subscription_expired',
        message: 'Your subscription has ended. Your AI creators have been suspended.',
        reactivate_url: '/billing',
      });
    }

    next(); // fail open on unknown status
  } catch (err) {
    console.error('[PaymentGate] Error:', err.message);
    next(); // never hard-block on gate error
  }
};

const reactivateCreators = async (userId) => {
  await pool.query(
    `UPDATE influencers SET status='active', suspended_at=NULL
     WHERE user_id=$1 AND status='suspended'`,
    [userId]
  );
  await pool.query(
    `UPDATE users SET subscription_status='active', grace_period_end=NULL WHERE id=$1`,
    [userId]
  );
  console.log('[PaymentGate] Reactivated creators for user', userId);
};

const hardDeleteUnpaid = async () => {
  const cutoff = new Date(Date.now() - 30*24*60*60*1000);
  const result = await pool.query(
    `DELETE FROM influencers WHERE status='suspended' AND suspended_at < $1
     RETURNING id, name, user_id`,
    [cutoff]
  );
  if (result.rows.length) {
    console.log('[PaymentGate] Hard-deleted', result.rows.length, 'unpaid creators');
  }
  return result.rows;
};

module.exports = { paymentGate, reactivateCreators, hardDeleteUnpaid };

