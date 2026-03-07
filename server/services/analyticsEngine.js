const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const getCreatorStats = async (avatarId, days = 30) => {
  try {
    const result = await pool.query(
      `SELECT SUM(views) as views, SUM(likes) as likes, SUM(followers_gained) as followers
       FROM analytics WHERE avatar_id=$1 AND date >= CURRENT_DATE - $2`,
      [avatarId, days]
    );
    return result.rows[0] || { views: 0, likes: 0, followers: 0 };
  } catch (err) { return { views: 0, likes: 0, followers: 0 }; }
};

const getDailyBreakdown = async (avatarId, days = 30) => {
  try {
    const result = await pool.query(
      `SELECT date, views, likes, followers_gained FROM analytics
       WHERE avatar_id=$1 AND date >= CURRENT_DATE - $2 ORDER BY date ASC`,
      [avatarId, days]
    );
    return result.rows;
  } catch (err) { return []; }
};

const getTopPerformingContent = async (avatarId, limit = 10) => {
  try {
    const result = await pool.query(
      `SELECT id, topic, platform, status, created_at FROM content_jobs
       WHERE influencer_id=$1 ORDER BY created_at DESC LIMIT $2`,
      [avatarId, limit]
    );
    return result.rows;
  } catch (err) { return []; }
};

const getEmpireStats = async (userId) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(DISTINCT i.id) as creators,
              COALESCE(SUM(a.views),0) as total_views,
              COALESCE(SUM(a.followers_gained),0) as total_followers
       FROM influencers i
       LEFT JOIN analytics a ON a.avatar_id=i.id
       WHERE i.user_id=$1`,
      [userId]
    );
    return result.rows[0] || { creators: 0, total_views: 0, total_followers: 0 };
  } catch (err) { return { creators: 0, total_views: 0, total_followers: 0 }; }
};

const recordEvent = async (avatarId, eventType, data = {}) => {
  try {
    await pool.query(
      `INSERT INTO analytics_events (avatar_id, event_type, data, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [avatarId, eventType, JSON.stringify(data)]
    );
  } catch (err) { console.error('recordEvent error:', err.message); }
};

const trackEvent = async (userId, event, data = {}) => {
  try {
    await pool.query(
      `INSERT INTO analytics_events (user_id, event, data, created_at) VALUES ($1, $2, $3, NOW())`,
      [userId, event, JSON.stringify(data)]
    );
  } catch (err) { console.error('trackEvent error:', err.message); }
};

module.exports = { getCreatorStats, getDailyBreakdown, getTopPerformingContent, getEmpireStats, recordEvent, trackEvent };

