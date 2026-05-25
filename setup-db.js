const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.argv[2] });
async function setup() {
  const statements = [
    "CREATE TABLE IF NOT EXISTS creators (id VARCHAR(100) PRIMARY KEY, name TEXT NOT NULL, niche TEXT, content_type VARCHAR(20) DEFAULT 'sfw', status VARCHAR(20) DEFAULT 'active', profile_data JSONB DEFAULT '{}', image_urls JSONB DEFAULT '[]', fanvue_profile JSONB DEFAULT '{}', posting_schedule JSONB DEFAULT '{}', glowx_id TEXT, fanvue_username TEXT, total_subscribers INTEGER DEFAULT 0, total_revenue DECIMAL(12,2) DEFAULT 0, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())",
    "CREATE TABLE IF NOT EXISTS content_calendars (id SERIAL PRIMARY KEY, creator_id VARCHAR(100) UNIQUE, calendar_data JSONB DEFAULT '[]', created_at TIMESTAMP DEFAULT NOW())",
    "CREATE TABLE IF NOT EXISTS scheduled_posts (id SERIAL PRIMARY KEY, creator_id VARCHAR(100), platform VARCHAR(50), content JSONB DEFAULT '{}', scheduled_time TIMESTAMP, status VARCHAR(30) DEFAULT 'scheduled', posted_at TIMESTAMP, created_at TIMESTAMP DEFAULT NOW())",
    "CREATE TABLE IF NOT EXISTS trending_topics (id SERIAL PRIMARY KEY, niche TEXT, topic TEXT, trend_score FLOAT DEFAULT 0.6, platform VARCHAR(50), created_at TIMESTAMP DEFAULT NOW())",
    "CREATE TABLE IF NOT EXISTS affiliates (id VARCHAR(100) PRIMARY KEY, name TEXT, email TEXT UNIQUE, ref_code VARCHAR(20) UNIQUE, commission_rate DECIMAL(5,2) DEFAULT 30.00, total_earnings DECIMAL(12,2) DEFAULT 0, status VARCHAR(20) DEFAULT 'active', created_at TIMESTAMP DEFAULT NOW())",
    "INSERT INTO trending_topics (niche,topic,trend_score,platform) VALUES ('fitness','workout',0.85,'tiktok'),('beauty','skincare',0.90,'tiktok'),('finance','passive income',0.88,'tiktok'),('adult','exclusive',0.70,'fanvue') ON CONFLICT DO NOTHING"
  ];
  for (const sql of statements) {
    try { await pool.query(sql); console.log('?', sql.slice(7,47)); }
    catch(e) { console.log('?', e.message); }
  }
  await pool.end();
  console.log('DONE');
}
setup();
