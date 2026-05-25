-- AI Influencer Studio Database Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  plan VARCHAR(50) DEFAULT 'starter',
  stripe_customer_id VARCHAR(255),
  posts_used INTEGER DEFAULT 0,
  leads_used INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Influencers (AI Personas)
CREATE TABLE influencers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  niche VARCHAR(255),
  avatar_url TEXT,
  voice_id VARCHAR(255),
  personality_prompt TEXT,
  platform_tokens JSONB DEFAULT '{}',
  signature_music_url TEXT,
  jingle_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Content Jobs
CREATE TABLE content_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  influencer_id UUID REFERENCES influencers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  topic TEXT,
  script TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  music_url TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  platform VARCHAR(50),
  scheduled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Posts
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_job_id UUID REFERENCES content_jobs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50),
  external_post_id VARCHAR(255),
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0,
  posted_at TIMESTAMP DEFAULT NOW()
);

-- Brand Deals
CREATE TABLE brand_deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  brand_name VARCHAR(255),
  contact_email VARCHAR(255),
  value DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'pending',
  deadline DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Affiliate Links
CREATE TABLE affiliate_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  label VARCHAR(255),
  url TEXT,
  short_code VARCHAR(50) UNIQUE,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  earnings DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Leads
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  business_name VARCHAR(255),
  website TEXT,
  email VARCHAR(255),
  phone VARCHAR(100),
  niche VARCHAR(255),
  location VARCHAR(255),
  status VARCHAR(50) DEFAULT 'new',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  plan VARCHAR(50),
  status VARCHAR(50),
  current_period_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Music Tracks
CREATE TABLE music_tracks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  influencer_id UUID REFERENCES influencers(id) ON DELETE SET NULL,
  title VARCHAR(255),
  prompt TEXT,
  genre VARCHAR(100),
  mood VARCHAR(100),
  duration INTEGER,
  file_url TEXT,
  type VARCHAR(50) DEFAULT 'background',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_influencers_user ON influencers(user_id);
CREATE INDEX idx_content_jobs_user ON content_jobs(user_id);
CREATE INDEX idx_leads_user ON leads(user_id);
CREATE INDEX idx_posts_user ON posts(user_id);


-- ═══════════════════════════════════════════════════════
-- ADDON SYSTEM + COMMUNICATIONS (added 2026-02-28)
-- ═══════════════════════════════════════════════════════

-- Ensure avatars table has status/suspended_at cols
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP;
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS comms_enabled JSONB DEFAULT '{"dm":true,"whatsapp":false,"phone":false,"voice_call":false,"toy":false}';
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS toy_config JSONB DEFAULT '{}';
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS phone_number VARCHAR(30);
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(30);
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS platforms JSONB DEFAULT '["fanvue","tiktok","instagram"]';
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS active_addons JSONB DEFAULT '[]';

-- Ensure users table has subscription fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(30) DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_end TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS grace_period_end TIMESTAMP;

-- AVATAR ADD-ONS
CREATE TABLE IF NOT EXISTS avatar_addons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  addon_type VARCHAR(50) NOT NULL,
  avatar_id UUID REFERENCES influencers(id),
  status VARCHAR(20) DEFAULT 'active',
  stripe_item_id VARCHAR(255),
  price_monthly DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW(),
  cancelled_at TIMESTAMP
);

-- AI COMMUNICATION LOGS
CREATE TABLE IF NOT EXISTS ai_communications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  avatar_id UUID REFERENCES influencers(id),
  comm_type VARCHAR(30),
  platform VARCHAR(50),
  fan_identifier VARCHAR(255),
  duration_seconds INTEGER,
  revenue_generated DECIMAL(10,2) DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  session_start TIMESTAMP DEFAULT NOW(),
  session_end TIMESTAMP,
  outcome VARCHAR(50),
  messages JSONB DEFAULT '[]'  
);

-- TOY SESSIONS
CREATE TABLE IF NOT EXISTS toy_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  avatar_id UUID REFERENCES influencers(id),
  fan_identifier VARCHAR(255),
  platform VARCHAR(50),
  toy_device_id VARCHAR(100),
  toy_type VARCHAR(50),
  session_start TIMESTAMP DEFAULT NOW(),
  session_end TIMESTAMP,
  total_tips DECIMAL(10,2) DEFAULT 0,
  commands_sent INTEGER DEFAULT 0,
  peak_intensity INTEGER DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0
);

-- PHONE LINES
CREATE TABLE IF NOT EXISTS phone_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  avatar_id UUID REFERENCES influencers(id),
  phone_number VARCHAR(30),
  provider VARCHAR(30) DEFAULT 'twilio',
  per_minute_rate DECIMAL(5,2) DEFAULT 1.99,
  total_minutes INTEGER DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- PHONE BOOKINGS
CREATE TABLE IF NOT EXISTS phone_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  avatar_id UUID REFERENCES influencers(id),
  fan_id VARCHAR(255),
  fan_phone VARCHAR(30),
  duration_minutes INTEGER,
  scheduled_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending',
  amount_paid DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- SCHEDULED POSTS
CREATE TABLE IF NOT EXISTS scheduled_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  avatar_id UUID REFERENCES influencers(id),
  platform VARCHAR(50),
  content_id UUID REFERENCES content_jobs(id),
  scheduled_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'scheduled',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ANALYTICS (daily snapshots)
CREATE TABLE IF NOT EXISTS analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  avatar_id UUID REFERENCES influencers(id),
  date DATE DEFAULT CURRENT_DATE,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  followers INTEGER DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0,
  UNIQUE(avatar_id, date)
);

-- REVENUE EVENTS
CREATE TABLE IF NOT EXISTS revenue_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  avatar_id UUID REFERENCES influencers(id),
  amount DECIMAL(10,2),
  stream VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_avatar_addons_user ON avatar_addons(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_comms_avatar ON ai_communications(avatar_id);
CREATE INDEX IF NOT EXISTS idx_toy_sessions_avatar ON toy_sessions(avatar_id);
CREATE INDEX IF NOT EXISTS idx_analytics_avatar_date ON analytics(avatar_id, date);
CREATE INDEX IF NOT EXISTS idx_revenue_events_user ON revenue_events(user_id);

-- ============================================================
-- ADDON SYSTEM (added 2026)
-- ============================================================

CREATE TABLE IF NOT EXISTS avatar_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  addon_type VARCHAR(50) NOT NULL,
  avatar_id UUID REFERENCES influencers(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'active',
  stripe_item_id VARCHAR(255),
  price_monthly DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW(),
  cancelled_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_avatar_addons_user ON avatar_addons(user_id);
CREATE INDEX IF NOT EXISTS idx_avatar_addons_status ON avatar_addons(status);

CREATE TABLE IF NOT EXISTS ai_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avatar_id UUID REFERENCES influencers(id) ON DELETE CASCADE,
  comm_type VARCHAR(30),
  platform VARCHAR(50),
  fan_identifier VARCHAR(255),
  duration_seconds INTEGER,
  revenue_generated DECIMAL(10,2) DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  session_start TIMESTAMP DEFAULT NOW(),
  session_end TIMESTAMP,
  outcome VARCHAR(50)
);
CREATE INDEX IF NOT EXISTS idx_ai_comms_avatar ON ai_communications(avatar_id);
CREATE INDEX IF NOT EXISTS idx_ai_comms_platform ON ai_communications(platform);

CREATE TABLE IF NOT EXISTS toy_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avatar_id UUID REFERENCES influencers(id) ON DELETE CASCADE,
  fan_identifier VARCHAR(255),
  platform VARCHAR(50),
  toy_device_id VARCHAR(100),
  toy_type VARCHAR(50),
  session_start TIMESTAMP DEFAULT NOW(),
  session_end TIMESTAMP,
  total_tips DECIMAL(10,2) DEFAULT 0,
  commands_sent INTEGER DEFAULT 0,
  peak_intensity INTEGER,
  revenue DECIMAL(10,2) DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_toy_sessions_avatar ON toy_sessions(avatar_id);

CREATE TABLE IF NOT EXISTS phone_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avatar_id UUID REFERENCES influencers(id) ON DELETE CASCADE,
  phone_number VARCHAR(30),
  provider VARCHAR(30),
  per_minute_rate DECIMAL(5,2) DEFAULT 1.99,
  total_minutes INTEGER DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avatar_id UUID REFERENCES influencers(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  post_type VARCHAR(30) DEFAULT 'post',
  script TEXT,
  caption TEXT,
  topic VARCHAR(255),
  audio_url TEXT,
  media_url TEXT,
  scheduled_at TIMESTAMP NOT NULL,
  posted_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending',
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sched_posts_avatar ON scheduled_posts(avatar_id);
CREATE INDEX IF NOT EXISTS idx_sched_posts_status ON scheduled_posts(status);
CREATE INDEX IF NOT EXISTS idx_sched_posts_scheduled ON scheduled_posts(scheduled_at);

CREATE TABLE IF NOT EXISTS analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avatar_id UUID REFERENCES influencers(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  platform VARCHAR(50) DEFAULT 'all',
  views BIGINT DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  followers_gained INTEGER DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0,
  UNIQUE(avatar_id, date, platform)
);
CREATE INDEX IF NOT EXISTS idx_analytics_avatar_date ON analytics(avatar_id, date);

CREATE TABLE IF NOT EXISTS revenue_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  avatar_id UUID REFERENCES influencers(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  stream VARCHAR(50),
  platform VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_revenue_user ON revenue_events(user_id);
CREATE INDEX IF NOT EXISTS idx_revenue_avatar ON revenue_events(avatar_id);
CREATE INDEX IF NOT EXISTS idx_revenue_stream ON revenue_events(stream);

-- Add missing columns to existing tables if not present
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(30) DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_end TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS grace_period_end TIMESTAMP;
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP;
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS posting_schedule JSONB DEFAULT '{}' ::jsonb;
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS voice_id VARCHAR(100);
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS avatar_3d_config JSONB DEFAULT '{}' ::jsonb;
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS brand_deal_rate DECIMAL(10,2) DEFAULT 500;
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS monthly_revenue DECIMAL(10,2) DEFAULT 0;
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS platform_accounts JSONB DEFAULT '{}' ::jsonb;
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS active_addons JSONB DEFAULT '[]' ::jsonb;
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS comms_enabled JSONB DEFAULT '{"dm":true,"whatsapp":false,"phone":false,"voice_call":false,"toy":false}' ::jsonb;
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS toy_config JSONB DEFAULT '{}' ::jsonb;
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS phone_number VARCHAR(30);
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(30);
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS platforms JSONB DEFAULT '["glowx","fanvue","tiktok","instagram"]' ::jsonb;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS views BIGINT DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS comments INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS shares INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS viral_score INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS avatar_id UUID REFERENCES influencers(id) ON DELETE CASCADE;

-- ═══════════════════════════════════════════════════
-- SELF-SUFFICIENCY UPGRADE SCHEMA
-- ═══════════════════════════════════════════════════

-- Add error tracking and job type to content_jobs
ALTER TABLE content_jobs ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE content_jobs ADD COLUMN IF NOT EXISTS job_type VARCHAR(50) DEFAULT 'full_pipeline';
ALTER TABLE content_jobs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE content_jobs ADD COLUMN IF NOT EXISTS platform_post_id TEXT;
ALTER TABLE content_jobs ADD COLUMN IF NOT EXISTS published_at TIMESTAMP;

-- Add plan to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'starter';

-- Job logs table
CREATE TABLE IF NOT EXISTS job_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID,
  level VARCHAR(20),
  message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Storage assets table  
CREATE TABLE IF NOT EXISTS storage_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES content_jobs(id) ON DELETE CASCADE,
  asset_type VARCHAR(50),
  storage_key TEXT,
  public_url TEXT,
  file_size_bytes BIGINT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- System health log
CREATE TABLE IF NOT EXISTS health_checks (
  id SERIAL PRIMARY KEY,
  status VARCHAR(20),
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
