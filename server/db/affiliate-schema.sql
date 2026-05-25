-- ═══════════════════════════════════════════════════════════
-- GLOWX AFFILIATE PROGRAM SCHEMA
-- ═══════════════════════════════════════════════════════════

-- Affiliates table
CREATE TABLE IF NOT EXISTS affiliates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ref_code VARCHAR(30) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'active',    -- active | suspended | pending
  tier VARCHAR(20) DEFAULT 'standard',    -- standard | silver | gold | platinum
  commission_rate DECIMAL(5,4) DEFAULT 0.30, -- 30% default
  total_clicks INTEGER DEFAULT 0,
  total_signups INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  total_earned DECIMAL(12,2) DEFAULT 0,
  total_paid DECIMAL(12,2) DEFAULT 0,
  pending_balance DECIMAL(12,2) DEFAULT 0,
  payout_method VARCHAR(30),              -- paypal | bank | crypto
  payout_details JSONB,
  custom_landing TEXT,                    -- optional custom landing page slug
  promo_materials JSONB,                  -- links to banners, videos etc
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Referral tracking
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ref_code VARCHAR(30),
  affiliate_id UUID REFERENCES affiliates(id),
  ip_hash VARCHAR(64),                    -- hashed for privacy
  user_agent TEXT,
  landing_page TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  converted BOOLEAN DEFAULT false,
  converted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Conversions (signups + purchases attributed to affiliate)
CREATE TABLE IF NOT EXISTS affiliate_conversions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID REFERENCES affiliates(id),
  referred_user_id UUID REFERENCES users(id),
  ref_code VARCHAR(30),
  conversion_type VARCHAR(30),            -- signup | course_purchase | subscription | upgrade
  product VARCHAR(50),                    -- glowx | course | ai_studio | fanvue
  gross_amount DECIMAL(12,2),
  commission_rate DECIMAL(5,4),
  commission_amount DECIMAL(12,2),
  status VARCHAR(20) DEFAULT 'pending',   -- pending | approved | paid | reversed
  stripe_payment_intent TEXT,
  approved_at TIMESTAMP,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Payout requests
CREATE TABLE IF NOT EXISTS affiliate_payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID REFERENCES affiliates(id),
  amount DECIMAL(12,2),
  method VARCHAR(30),
  details JSONB,
  status VARCHAR(20) DEFAULT 'pending',   -- pending | processing | paid | failed
  reference TEXT,
  requested_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);

-- Affiliate tiers configuration
CREATE TABLE IF NOT EXISTS affiliate_tiers (
  tier VARCHAR(20) PRIMARY KEY,
  label TEXT,
  min_conversions INTEGER,
  commission_rate DECIMAL(5,4),
  bonuses JSONB
);

INSERT INTO affiliate_tiers VALUES
  ('standard',  'Standard Affiliate',  0,   0.30, '{"welcome_bonus": 0}'),
  ('silver',    'Silver Affiliate',    10,  0.35, '{"welcome_bonus": 50, "monthly_bonus_threshold": 20}'),
  ('gold',      'Gold Affiliate',      50,  0.40, '{"welcome_bonus": 100, "monthly_bonus_threshold": 50, "priority_support": true}'),
  ('platinum',  'Platinum Affiliate',  200, 0.50, '{"welcome_bonus": 500, "monthly_bonus_threshold": 100, "dedicated_manager": true, "custom_deals": true}')
ON CONFLICT (tier) DO NOTHING;

-- Add referral tracking to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by_code VARCHAR(30);
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by_id UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS affiliate_id UUID;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_affiliate_ref_code ON affiliates(ref_code);
CREATE INDEX IF NOT EXISTS idx_clicks_ref_code ON affiliate_clicks(ref_code);
CREATE INDEX IF NOT EXISTS idx_conversions_affiliate ON affiliate_conversions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_conversions_status ON affiliate_conversions(status);
