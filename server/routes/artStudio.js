/**
 * AI ART STUDIO API ROUTES
 * OpenArt.ai-style endpoints for image generation, gallery, and model management
 */
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const artEngine = require('../services/artImageEngine');
const logger = require('../services/logger');

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

// ── MIDDLEWARE ────────────────────────────────────────────────────
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  try {
    const jwt = require('jsonwebtoken');
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const checkCredits = async (req, res, next) => {
  const { user } = req;
  const result = await pool.query('SELECT art_credits FROM users WHERE id = $1', [user.id]);
  const credits = result.rows[0]?.art_credits || 0;
  if (credits <= 0) return res.status(402).json({ error: 'Insufficient credits', credits });
  req.userCredits = credits;
  next();
};

// ── MODELS ────────────────────────────────────────────────────────
router.get('/models', authenticate, async (req, res) => {
  try {
    const models = Object.entries(artEngine.MODELS).map(([key, config]) => ({
      id: key,
      name: key.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      provider: config.provider,
      maxResolution: config.maxResolution,
      defaultResolution: config.defaultResolution,
      supportsImg2Img: config.supportsImg2Img,
      supportsControlNet: config.supportsControlNet || false,
      costPerGen: config.costPerGen
    }));
    res.json({ models });
  } catch (err) {
    logger.error('[ArtStudio] Error fetching models:', err);
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

// ── STYLE PRESETS ─────────────────────────────────────────────────
router.get('/styles', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, category, prompt_suffix as promptSuffix, 
             negative_prompt as negativePrompt, preview_image_url as previewUrl,
             recommended_model, recommended_cfg, recommended_steps
      FROM art_style_presets
      WHERE is_system = true OR created_by = $1
      ORDER BY category, name
    `, [req.user.id]);
    
    res.json({ styles: result.rows });
  } catch (err) {
    logger.error('[ArtStudio] Error fetching styles:', err);
    res.status(500).json({ error: 'Failed to fetch styles' });
  }
});

// ── TEXT TO IMAGE ─────────────────────────────────────────────────
router.post('/generate/text-to-image', authenticate, checkCredits, async (req, res) => {
  try {
    const { 
      prompt, 
      negativePrompt = '', 
      model = 'flux-dev',
      width = 1024, 
      height = 1024,
      cfg = 7.5,
      steps = 30,
      seed,
      styleId,
      numOutputs = 1
    } = req.body;

    if (!prompt?.trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Validate model
    const modelConfig = artEngine.MODELS[model];
    if (!modelConfig) {
      return res.status(400).json({ error: 'Invalid model' });
    }

    // Apply style preset if specified
    let finalPrompt = prompt;
    let finalNegativePrompt = negativePrompt;
    
    if (styleId) {
      const styleResult = await pool.query(
        'SELECT prompt_suffix, negative_prompt FROM art_style_presets WHERE id = $1',
        [styleId]
      );
      if (styleResult.rows[0]) {
        finalPrompt = `${prompt}, ${styleResult.rows[0].prompt_suffix}`;
        finalNegativePrompt = negativePrompt || styleResult.rows[0].negative_prompt;
      }
    }

    // Create generation record
    const generationId = uuidv4();
    await pool.query(`
      INSERT INTO art_generations 
        (id, user_id, prompt, negative_prompt, model, width, height, cfg_scale, steps, seed, generation_type, credit_cost, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'txt2img', $11, 'pending')
    `, [generationId, req.user.id, prompt, finalNegativePrompt, model, width, height, cfg, steps, seed, modelConfig.costPerGen]);

    // Start async generation
    res.status(202).json({ 
      generationId, 
      status: 'pending',
      estimatedCost: modelConfig.costPerGen,
      message: 'Generation queued' 
    });

    // Process in background
    processGeneration(generationId, 'textToImage', {
      prompt: finalPrompt,
      negativePrompt: finalNegativePrompt,
      model,
      width,
      height,
      cfg,
      steps,
      seed
    });

  } catch (err) {
    logger.error('[ArtStudio] Error in text-to-image:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── IMAGE TO IMAGE ────────────────────────────────────────────────
router.post('/generate/image-to-image', authenticate, checkCredits, async (req, res) => {
  try {
    const { prompt, imageUrl, strength = 0.7, model = 'sdxl' } = req.body;

    if (!prompt || !imageUrl) {
      return res.status(400).json({ error: 'Prompt and imageUrl are required' });
    }

    const modelConfig = artEngine.MODELS[model];
    if (!modelConfig || !modelConfig.supportsImg2Img) {
      return res.status(400).json({ error: 'Model does not support image-to-image' });
    }

    const generationId = uuidv4();
    await pool.query(`
      INSERT INTO art_generations 
        (id, user_id, prompt, model, generation_type, source_image_url, strength, credit_cost, status)
      VALUES ($1, $2, $3, $4, 'img2img', $5, $6, $7, 'pending')
    `, [generationId, req.user.id, prompt, model, imageUrl, strength, modelConfig.costPerGen]);

    res.status(202).json({ generationId, status: 'pending' });

    processGeneration(generationId, 'imageToImage', {
      prompt, imageUrl, strength, model
    });

  } catch (err) {
    logger.error('[ArtStudio] Error in image-to-image:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── UPSCALE ───────────────────────────────────────────────────────
router.post('/generate/upscale', authenticate, checkCredits, async (req, res) => {
  try {
    const { imageUrl, scale = 2 } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'imageUrl is required' });
    }

    const generationId = uuidv4();
    const cost = 0.005;

    await pool.query(`
      INSERT INTO art_generations 
        (id, user_id, prompt, generation_type, source_image_url, credit_cost, status)
      VALUES ($1, $2, 'Upscale image', 'upscale', $3, $4, 'pending')
    `, [generationId, req.user.id, imageUrl, cost]);

    res.status(202).json({ generationId, status: 'pending' });

    processGeneration(generationId, 'upscale', { imageUrl, scale });

  } catch (err) {
    logger.error('[ArtStudio] Error in upscale:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GENERATION STATUS ─────────────────────────────────────────────
router.get('/generations/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, prompt, model, width, height, status, result_image_url as imageUrl,
             generation_time_seconds as generationTime, error_message as error,
             seed, cfg_scale as cfg, steps, created_at as createdAt
      FROM art_generations
      WHERE id = $1 AND user_id = $2
    `, [req.params.id, req.user.id]);

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Generation not found' });
    }

    res.json({ generation: result.rows[0] });
  } catch (err) {
    logger.error('[ArtStudio] Error fetching generation:', err);
    res.status(500).json({ error: 'Failed to fetch generation' });
  }
});

// ── USER GALLERY ──────────────────────────────────────────────────
router.get('/gallery', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, model, generationType } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE g.user_id = $1';
    const params = [req.user.id];
    let paramIndex = 2;

    if (model) {
      whereClause += ` AND g.model = $${paramIndex++}`;
      params.push(model);
    }

    if (generationType) {
      whereClause += ` AND g.generation_type = $${paramIndex++}`;
      params.push(generationType);
    }

    params.push(limit, offset);

    const result = await pool.query(`
      SELECT g.id, g.prompt, g.model, g.generation_type as type,
             g.result_image_url as imageUrl, g.width, g.height,
             g.credit_cost as cost, g.created_at as createdAt,
             g.seed, g.cfg_scale as cfg, g.steps,
             EXISTS(SELECT 1 FROM art_favorites f WHERE f.generation_id = g.id) as isFavorite
      FROM art_generations g
      ${whereClause}
      ORDER BY g.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `, params);

    // Get total count
    const countResult = await pool.query(`
      SELECT COUNT(*) FROM art_generations g ${whereClause}
    `, params.slice(0, paramIndex - 2));

    res.json({
      generations: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        hasMore: offset + result.rows.length < parseInt(countResult.rows[0].count)
      }
    });
  } catch (err) {
    logger.error('[ArtStudio] Error fetching gallery:', err);
    res.status(500).json({ error: 'Failed to fetch gallery' });
  }
});

// ── PUBLIC COMMUNITY FEED ─────────────────────────────────────────
router.get('/community', async (req, res) => {
  try {
    const { page = 1, limit = 24 } = req.query;
    const offset = (page - 1) * limit;

    result = await pool.query(`
      SELECT g.id, g.prompt, g.model, g.generation_type as type,
             g.result_image_url as imageUrl, g.width, g.height,
             g.created_at as createdAt,
             u.username as creator
      FROM art_generations g
      JOIN users u ON u.id = g.user_id
      WHERE g.is_public = true AND g.status = 'completed'
      ORDER BY g.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    res.json({ generations: result.rows });
  } catch (err) {
    logger.error('[ArtStudio] Error fetching community:', err);
    res.status(500).json({ error: 'Failed to fetch community feed' });
  }
});

// ── COLLECTIONS ───────────────────────────────────────────────────
router.get('/collections', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, description, cover_image_url as coverImage,
             image_count as imageCount, is_public as isPublic,
             created_at as createdAt
      FROM art_collections
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [req.user.id]);

    res.json({ collections: result.rows });
  } catch (err) {
    logger.error('[ArtStudio] Error fetching collections:', err);
    res.status(500).json({ error: 'Failed to fetch collections' });
  }
});

router.post('/collections', authenticate, async (req, res) => {
  try {
    const { name, description, isPublic = false } = req.body;
    
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Collection name is required' });
    }

    const result = await pool.query(`
      INSERT INTO art_collections (user_id, name, description, is_public)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, description, is_public as isPublic, created_at as createdAt
    `, [req.user.id, name, description, isPublic]);

    res.status(201).json({ collection: result.rows[0] });
  } catch (err) {
    logger.error('[ArtStudio] Error creating collection:', err);
    res.status(500).json({ error: 'Failed to create collection' });
  }
});

router.post('/collections/:id/items', authenticate, async (req, res) => {
  try {
    const { generationId, note } = req.body;
    
    // Verify collection ownership
    const collectionCheck = await pool.query(
      'SELECT id FROM art_collections WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    
    if (!collectionCheck.rows[0]) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    const result = await pool.query(`
      INSERT INTO art_collection_items (collection_id, generation_id, note)
      VALUES ($1, $2, $3)
      RETURNING id
    `, [req.params.id, generationId, note]);

    res.status(201).json({ itemId: result.rows[0].id });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Item already in collection' });
    }
    logger.error('[ArtStudio] Error adding to collection:', err);
    res.status(500).json({ error: 'Failed to add item' });
  }
});

// ── USER CREDITS ──────────────────────────────────────────────────
router.get('/credits', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT art_credits as credits, art_credits_used as used FROM users WHERE id = $1',
      [req.user.id]
    );
    
    res.json({ 
      credits: result.rows[0]?.credits || 0,
      used: result.rows[0]?.used || 0
    });
  } catch (err) {
    logger.error('[ArtStudio] Error fetching credits:', err);
    res.status(500).json({ error: 'Failed to fetch credits' });
  }
});

// ── BACKGROUND GENERATION PROCESSOR ───────────────────────────────
async function processGeneration(generationId, type, params) {
  try {
    await pool.query("UPDATE art_generations SET status = 'processing', started_at = NOW() WHERE id = $1", [generationId]);
    
    const startTime = Date.now();
    let result;

    switch (type) {
      case 'textToImage':
        result = await artEngine.generateTextToImage(params);
        break;
      case 'imageToImage':
        result = await artEngine.generateImageToImage(params);
        break;
      case 'upscale':
        result = await artEngine.upscaleImage(params);
        break;
      default:
        throw new Error('Unknown generation type');
    }

    const generationTime = (Date.now() - startTime) / 1000;

    await pool.query(`
      UPDATE art_generations 
      SET status = 'completed', 
          result_image_url = $2,
          generation_time_seconds = $3,
          completed_at = NOW()
      WHERE id = $1
    `, [generationId, result.imageUrl, generationTime]);

    logger.info(`[ArtStudio] Generation ${generationId} completed in ${generationTime}s`);

  } catch (err) {
    logger.error(`[ArtStudio] Generation ${generationId} failed:`, err);
    await pool.query(`
      UPDATE art_generations 
      SET status = 'failed', error_message = $2 
      WHERE id = $1
    `, [generationId, err.message]);
  }
}

module.exports = router;
