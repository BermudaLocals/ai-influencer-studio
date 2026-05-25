-- MARKETING DEPARTMENT SCHEMA
-- Run at console.neon.tech after existing schema

CREATE TABLE IF NOT EXISTS content_calendars (
  id           SERIAL PRIMARY KEY,
  creator_id   VARCHAR(100) UNIQUE REFERENCES creators(id) ON DELETE CASCADE,
  calendar_data JSONB DEFAULT '[]',
  created_at   TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scheduled_posts (
  id             SERIAL PRIMARY KEY,
  creator_id     VARCHAR(100),
  platform       VARCHAR(50),
  content        JSONB DEFAULT '{}',
  media_urls     JSONB DEFAULT '[]',
  scheduled_time TIMESTAMP,
  status         VARCHAR(30) DEFAULT 'scheduled',
  posted_at      TIMESTAMP,
  post_id        TEXT,
  error_msg      TEXT,
  created_at     TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS video_clips (
  id           SERIAL PRIMARY KEY,
  creator_id   VARCHAR(100),
  original_url TEXT,
  clips_data   JSONB DEFAULT '[]',
  created_at   TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trending_topics (
  id          SERIAL PRIMARY KEY,
  niche       VARCHAR(100),
  topic       TEXT,
  trend_score FLOAT DEFAULT 0.6,
  platform    VARCHAR(50),
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Seed basic trending scores
INSERT INTO trending_topics (niche, topic, trend_score, platform) VALUES
  ('fitness',  'workout routine', 0.85, 'tiktok'),
  ('beauty',   'skincare routine', 0.90, 'tiktok'),
  ('finance',  'passive income',   0.88, 'tiktok'),
  ('music',    'new artist',       0.80, 'tiktok'),
  ('gaming',   'game review',      0.75, 'tiktok'),
  ('adult',    'exclusive content', 0.70, 'fanvue')
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_scheduled_posts_creator ON scheduled_posts(creator_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_time    ON scheduled_posts(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status  ON scheduled_posts(status);
