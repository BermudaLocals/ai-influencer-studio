const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL , ssl: { rejectUnauthorized: false }});
const getStats = async () => { try { const r = await pool.query('SELECT COUNT(*) as total FROM influencers'); return { total_creators: r.rows[0].total, status: 'ok' }; } catch(e) { return { total_creators: 0, status: 'error' }; } };
const getCreatorStats = async (id,days=30) => { try { const r = await pool.query('SELECT SUM(views) as views FROM analytics WHERE avatar_id=$1 AND date >= CURRENT_DATE-$2',[id,days]); return r.rows[0]||{views:0}; } catch(e){return{views:0};} };
const getEmpireStats = async (userId) => { try { const r = await pool.query('SELECT COUNT(*) as creators FROM influencers WHERE user_id=$1',[userId]); return r.rows[0]||{creators:0}; } catch(e){return{creators:0};} };
const getDailyBreakdown = async (id,days=30) => { try { const r = await pool.query('SELECT date,views FROM analytics WHERE avatar_id=$1 ORDER BY date ASC',[id]); return r.rows; } catch(e){return[];} };
const getTopPerformingContent = async (id,limit=10) => { try { const r = await pool.query('SELECT id,topic FROM content_jobs WHERE influencer_id=$1 ORDER BY created_at DESC LIMIT $2',[id,limit]); return r.rows; } catch(e){return[];} };
const recordEvent = async (avatarId,eventType,data={}) => { try { await pool.query('INSERT INTO analytics_events(avatar_id,event_type,data,created_at) VALUES($1,$2,$3,NOW())',[avatarId,eventType,JSON.stringify(data)]); } catch(e){} };
module.exports = { getStats, getCreatorStats, getEmpireStats, getDailyBreakdown, getTopPerformingContent, recordEvent };
