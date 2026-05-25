-- AI Art Gallery Database Schema
-- Extends ai-influencer-studio with OpenArt.ai-style features

-- ── GENERATIONS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS art_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Generation parameters
  prompt TEXT NOT NULL,
  negative_prompt TEXT,
  model VARCHAR(50) NOT NULL DEFAULT 'flux-dev',
  
  -- Image settings
  width INTEGER NOT NULL DEFAULT 1024,
  height INTEGER NOT NULL DEFAULT 1024,
  cfg_scale DECIMAL(3,1) DEFAULT 7.5,
  steps INTEGER DEFAULT 30,
  seed BIGINT,
  
  -- Generation type
  generation_type VARCHAR(20) NOT NULL DEFAULT 'txt2img' 
    CHECK (generation_type IN ('txt2img', 'img2img', 'inpaint', 'outpaint', 'upscale', 'variation')),
  
  -- Source/reference for img2img/inpainting
  source_image_url TEXT,
  mask_image_url TEXT,
  strength DECIMAL(3,2) DEFAULT 0.75,
  
  -- Results
  result_image_url TEXT,
  result_image_urls TEXT[], -- For multiple outputs
  generation_time_seconds DECIMAL(6,2),
  
  -- Metadata
  status VARCHAR(20) NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  error_message TEXT,
  
  -- Cost tracking
  credit_cost DECIMAL(6,4) NOT NULL DEFAULT 0.003,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Indexes
  CONSTRAINT valid_dimensions CHECK (width >= 256 AND width <= 2048 AND height >= 256 AND height <= 2048)
);

CREATE INDEX idx_art_generations_user_id ON art_generations(user_id);
CREATE INDEX idx_art_generations_created_at ON art_generations(created_at DESC);
CREATE INDEX idx_art_generations_model ON art_generations(model);
CREATE INDEX idx_art_generations_status ON art_generations(status) WHERE status IN ('pending', 'processing');

-- ── GALLERIES / COLLECTIONS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS art_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  name VARCHAR(100) NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  
  -- Visibility
  is_public BOOLEAN DEFAULT false,
  
  -- Stats
  image_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_art_collections_user_id ON art_collections(user_id);
CREATE INDEX idx_art_collections_public ON art_collections(is_public) WHERE is_public = true;

-- ── COLLECTION ITEMS (Many-to-Many) ──────────────────────────────
CREATE TABLE IF NOT EXISTS art_collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID REFERENCES art_collections(id) ON DELETE CASCADE,
  generation_id UUID REFERENCES art_generations(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  note TEXT,
  
  UNIQUE(collection_id, generation_id)
);

CREATE INDEX idx_art_collection_items_collection ON art_collection_items(collection_id);
CREATE INDEX idx_art_collection_items_generation ON art_collection_items(generation_id);

-- ── USER FAVORITES / LIKES ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS art_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  generation_id UUID REFERENCES art_generations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, generation_id)
);

CREATE INDEX idx_art_favorites_user ON art_favorites(user_id);
CREATE INDEX idx_art_favorites_generation ON art_favorites(generation_id);

-- ── CUSTOM TRAINED MODELS (LoRA/DreamBooth) ───────────────────────
CREATE TABLE IF NOT EXISTS art_custom_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  name VARCHAR(100) NOT NULL,
  description TEXT,
  trigger_word VARCHAR(50),
  
  -- Training config
  base_model VARCHAR(50) NOT NULL DEFAULT 'sdxl',
  training_type VARCHAR(20) NOT NULL DEFAULT 'lora' 
    CHECK (training_type IN ('lora', 'dreambooth', 'embedding')),
  
  -- Training data
  training_image_urls TEXT[] NOT NULL,
  training_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (training_status IN ('pending', 'uploading', 'training', 'completed', 'failed')),
  
  -- Model weights (hosted URL or path)
  model_url TEXT,
  model_version_id VARCHAR(100), -- For Replicate/Leonardo model IDs
  
  -- Training metrics
  training_steps INTEGER,
  training_loss DECIMAL(8,6),
  training_time_seconds INTEGER,
  
  -- Usage
  is_public BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  credit_cost DECIMAL(6,4) DEFAULT 0.01,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  error_message TEXT
);

CREATE INDEX idx_art_custom_models_user ON art_custom_models(user_id);
CREATE INDEX idx_art_custom_models_public ON art_custom_models(is_public) WHERE is_public = true;
CREATE INDEX idx_art_custom_models_status ON art_custom_models(training_status);

-- ── STYLE PRESETS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS art_style_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL, -- 'photography', 'art', '3d', 'anime', etc.
  
  -- Style definition
  prompt_suffix TEXT NOT NULL, -- Added to user prompt
  negative_prompt TEXT,
  preview_image_url TEXT,
  
  -- Settings override
  recommended_model VARCHAR(50),
  recommended_cfg DECIMAL(3,1),
  recommended_steps INTEGER,
  
  -- System/user
  is_system BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO art_style_presets (name, category, prompt_suffix, negative_prompt, is_system) VALUES
('Photorealistic', 'photography', 'photorealistic, 8k, highly detailed, sharp focus, professional photography', 'painting, drawing, sketch, cartoon, anime', true),
('Digital Art', 'art', 'digital art, trending on artstation, concept art, vibrant colors, detailed illustration', 'photograph, realistic, 3d render, blurry', true),
('Oil Painting', 'art', 'oil painting, impasto brushstrokes, classical art, museum quality, rich tones', 'digital, sketch, cartoon, modern', true),
('Anime', 'anime', 'anime style, studio ghibli, detailed anime illustration, cel shaded', 'photorealistic, 3d, western cartoon', true),
('Cyberpunk', 'art', 'cyberpunk, neon lights, futuristic city, high tech, dystopian, blade runner style', 'natural, rural, historical, medieval', true),
('Watercolor', 'art', 'watercolor painting, soft edges, flowing colors, artistic, paper texture', 'photograph, digital, sharp edges', true),
('3D Render', '3d', 'octane render, 3d render, blender, unreal engine 5, ray tracing, cinematic lighting', '2d, sketch, drawing, photograph', true),
('Cinematic', 'photography', 'cinematic shot, film grain, anamorphic lens, dramatic lighting, color graded', 'cartoon, drawing, painting, flat', true),
('Fantasy Art', 'art', 'fantasy art, magical, ethereal, dreamlike, highly detailed, vibrant', 'modern, urban, minimalist, realistic', true),
('Portrait', 'photography', 'portrait photography, studio lighting, professional headshot, sharp focus on eyes', 'full body, landscape, blurry, candid', true)
ON CONFLICT DO NOTHING;

-- ── GENERATION QUEUE (For async processing) ───────────────────────
CREATE TABLE IF NOT EXISTS art_generation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id UUID REFERENCES art_generations(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 0, -- Higher = processed first
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  worker_id VARCHAR(100),
  started_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_art_generation_queue_priority ON art_generation_queue(priority DESC, created_at);
CREATE INDEX idx_art_generation_queue_worker ON art_generation_queue(worker_id) WHERE worker_id IS NOT NULL;

-- ── USER CREDIT SYSTEM ────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS art_credits DECIMAL(10,4) DEFAULT 10.0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS art_credits_used DECIMAL(10,4) DEFAULT 0.0;

CREATE TABLE IF NOT EXISTS art_credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  amount DECIMAL(10,4) NOT NULL,
  transaction_type VARCHAR(20) NOT NULL 
    CHECK (transaction_type IN ('purchase', 'usage', 'refund', 'bonus', 'subscription')),
  
  description TEXT,
  reference_id UUID, -- Link to generation or payment
  
  balance_after DECIMAL(10,4) NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_art_credit_transactions_user ON art_credit_transactions(user_id);
CREATE INDEX idx_art_credit_transactions_created ON art_credit_transactions(created_at DESC);

-- ── VIEW: USER GALLERY WITH STATS ────────────────────────────────
CREATE OR REPLACE VIEW user_gallery_stats AS
SELECT 
  g.user_id,
  COUNT(*) as total_generations,
  COUNT(*) FILTER (WHERE g.status = 'completed') as completed_generations,
  COUNT(*) FILTER (WHERE g.created_at > NOW() - INTERVAL '30 days') as generations_this_month,
  SUM(g.credit_cost) FILTER (WHERE g.status = 'completed') as credits_spent,
  COUNT(DISTINCT c.id) as collection_count
FROM art_generations g
LEFT JOIN art_collections c ON c.user_id = g.user_id
GROUP BY g.user_id;

-- ── TRIGGER: Update collection image_count ───────────────────────
CREATE OR REPLACE FUNCTION update_collection_image_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE art_collections 
    SET image_count = image_count + 1, updated_at = NOW()
    WHERE id = NEW.collection_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE art_collections 
    SET image_count = image_count - 1, updated_at = NOW()
    WHERE id = OLD.collection_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_collection_count
AFTER INSERT OR DELETE ON art_collection_items
FOR EACH ROW EXECUTE FUNCTION update_collection_image_count();

-- ── TRIGGER: Update user credits on generation ───────────────────
CREATE OR REPLACE FUNCTION charge_generation_credits()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE users 
    SET art_credits = art_credits - NEW.credit_cost,
        art_credits_used = art_credits_used + NEW.credit_cost
    WHERE id = NEW.user_id;
    
    INSERT INTO art_credit_transactions 
      (user_id, amount, transaction_type, description, reference_id, balance_after)
    SELECT 
      NEW.user_id, 
      -NEW.credit_cost, 
      'usage',
      'Image generation: ' || LEFT(NEW.prompt, 50),
      NEW.id,
      u.art_credits
    FROM users u WHERE u.id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_charge_credits
AFTER UPDATE OF status ON art_generations
FOR EACH ROW EXECUTE FUNCTION charge_generation_credits();
