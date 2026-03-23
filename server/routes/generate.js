const router    = require('express').Router();
const { Pool } = require('pg');
const { authRequired } = require('./auth');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  max: 5,
});

// ── CREDIT COSTS ───────────────────────────────────────────────
const COSTS = {
  image:      5,   // SDXL / Flux
  image_hd:   10,  // Flux Pro / Midjourney quality
  video:      50,  // Wan 2.1 / Kling
  video_long: 100, // 10s+ video
  voice:      3,   // Kokoro TTS
  voice_clone:20,  // ElevenLabs clone
  music:      15,  // MusicGen
  avatar:     30,  // Talking avatar (SadTalker)
  text:       1,   // Llama 3 text
  upscale:    8,   // Real-ESRGAN
  bg_remove:  4,   // Background removal
};

// ── DEDUCT CREDITS ─────────────────────────────────────────────
async function deductCredits(userId, amount) {
  const { rows } = await pool.query(
    'SELECT credits FROM users WHERE id=$1 FOR UPDATE',
    [userId]
  );
  if (!rows.length || rows[0].credits < amount) {
    throw new Error(`Insufficient credits. Need ${amount}, have ${rows[0]?.credits || 0}`);
  }
  await pool.query(
    'UPDATE users SET credits = credits - $1, updated_at = NOW() WHERE id = $2',
    [amount, userId]
  );
  return rows[0].credits - amount;
}

// ── REPLICATE CLIENT ───────────────────────────────────────────
function getReplicate() {
  if (!process.env.REPLICATE_API_TOKEN) throw new Error('REPLICATE_API_TOKEN not set in Railway environment variables');
  return new (require('replicate'))({ auth: process.env.REPLICATE_API_TOKEN });
}

// ── WATERMARK HELPER ───────────────────────────────────────────
function addWatermarkMeta(output, type) {
  return {
    output,
    type,
    watermark: 'AI STUDIO',
    generated_at: new Date().toISOString(),
    platform: 'Dollar Double Empire — AI Influencer Studio',
  };
}

// ══════════════════════════════════════════════════════════════
// IMAGE GENERATION
// ══════════════════════════════════════════════════════════════
router.post('/image', authRequired, async (req, res) => {
  const { prompt, style = 'photorealistic', size = '1024x1024', hd = false } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt required' });
  const cost = hd ? COSTS.image_hd : COSTS.image;
  try {
    const remaining = await deductCredits(req.user.id, cost);
    const replicate  = getReplicate();

    const stylePrompts = {
      photorealistic: 'photorealistic, 8k, ultra detailed, professional photography',
      anime:          'anime style, vibrant, cel shaded, studio quality',
      digital_art:    'digital art, concept art, artstation trending',
      portrait:       'professional portrait, studio lighting, sharp focus',
      cinematic:      'cinematic, film still, dramatic lighting, ultra detailed',
    };

    const fullPrompt = `${prompt}, ${stylePrompts[style] || stylePrompts.photorealistic}`;
    const model = hd
      ? 'black-forest-labs/flux-pro'
      : 'black-forest-labs/flux-schnell';

    const output = await replicate.run(model, {
      input: { prompt: fullPrompt, num_outputs: 1, output_format: 'webp', output_quality: 90 }
    });

    const url = Array.isArray(output) ? output[0] : output;
    res.json({ ok: true, credits_remaining: remaining, ...addWatermarkMeta({ url }, 'image') });
  } catch(e) {
    console.error('[GENERATE] image error:', e.message);
    if (e.message.includes('Insufficient')) return res.status(402).json({ error: e.message });
    res.status(500).json({ error: e.message });
  }
});

// ══════════════════════════════════════════════════════════════
// VIDEO GENERATION (Wan 2.1)
// ══════════════════════════════════════════════════════════════
router.post('/video', authRequired, async (req, res) => {
  const { prompt, duration = 5, image_url } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt required' });
  const cost = duration > 5 ? COSTS.video_long : COSTS.video;
  try {
    const remaining = await deductCredits(req.user.id, cost);
    const replicate  = getReplicate();

    const input = {
      prompt,
      num_frames: duration * 16,
      guidance_scale: 7.5,
    };
    if (image_url) input.image = image_url;

    const output = await replicate.run('wan-video/wan-2.1-i2v-480p', { input });
    const url = Array.isArray(output) ? output[0] : output;
    res.json({ ok: true, credits_remaining: remaining, ...addWatermarkMeta({ url, duration }, 'video') });
  } catch(e) {
    if (e.message.includes('Insufficient')) return res.status(402).json({ error: e.message });
    res.status(500).json({ error: e.message });
  }
});

// ══════════════════════════════════════════════════════════════
// VOICE / TTS (Kokoro)
// ══════════════════════════════════════════════════════════════
router.post('/voice', authRequired, async (req, res) => {
  const { text, voice = 'af_bella', speed = 1.0 } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });
  try {
    const remaining = await deductCredits(req.user.id, COSTS.voice);
    const replicate  = getReplicate();

    const output = await replicate.run('jaaari/kokoro-82m', {
      input: { text, voice, speed }
    });

    const url = typeof output === 'string' ? output : output?.audio || output[0];
    res.json({ ok: true, credits_remaining: remaining, ...addWatermarkMeta({ url, voice }, 'voice') });
  } catch(e) {
    if (e.message.includes('Insufficient')) return res.status(402).json({ error: e.message });
    res.status(500).json({ error: e.message });
  }
});

// ══════════════════════════════════════════════════════════════
// MUSIC GENERATION (MusicGen)
// ══════════════════════════════════════════════════════════════
router.post('/music', authRequired, async (req, res) => {
  const { prompt, duration = 15 } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt required' });
  try {
    const remaining = await deductCredits(req.user.id, COSTS.music);
    const replicate  = getReplicate();

    const output = await replicate.run('meta/musicgen', {
      input: { prompt, duration, model_version: 'stereo-large', output_format: 'mp3', normalization_strategy: 'peak' }
    });

    const url = typeof output === 'string' ? output : output[0];
    res.json({ ok: true, credits_remaining: remaining, ...addWatermarkMeta({ url, duration }, 'music') });
  } catch(e) {
    if (e.message.includes('Insufficient')) return res.status(402).json({ error: e.message });
    res.status(500).json({ error: e.message });
  }
});

// ══════════════════════════════════════════════════════════════
// TALKING AVATAR (SadTalker)
// ══════════════════════════════════════════════════════════════
router.post('/avatar', authRequired, async (req, res) => {
  const { image_url, audio_url, text } = req.body;
  if (!image_url) return res.status(400).json({ error: 'image_url required' });
  if (!audio_url && !text) return res.status(400).json({ error: 'audio_url or text required' });
  try {
    const remaining = await deductCredits(req.user.id, COSTS.avatar);
    const replicate  = getReplicate();
    let finalAudio = audio_url;

    // Auto-generate audio from text if no audio provided
    if (!audio_url && text) {
      const ttsOut = await replicate.run('jaaari/kokoro-82m', {
        input: { text, voice: 'af_bella', speed: 1.0 }
      });
      finalAudio = typeof ttsOut === 'string' ? ttsOut : ttsOut?.audio || ttsOut[0];
    }

    const output = await replicate.run('cjwbw/sadtalker', {
      input: {
        source_image: image_url,
        driven_audio: finalAudio,
        preprocess: 'crop',
        still_mode: false,
        use_enhancer: true,
        batch_size: 1,
        size: 256,
        pose_style: 0,
        face3dvis: false,
        exp_scale: 1.0,
        input_yaw_list: [0],
      }
    });

    const url = typeof output === 'string' ? output : output?.video || output[0];
    res.json({ ok: true, credits_remaining: remaining, ...addWatermarkMeta({ url }, 'avatar') });
  } catch(e) {
    if (e.message.includes('Insufficient')) return res.status(402).json({ error: e.message });
    res.status(500).json({ error: e.message });
  }
});

// ══════════════════════════════════════════════════════════════
// TEXT GENERATION (Llama 3)
// ══════════════════════════════════════════════════════════════
router.post('/text', authRequired, async (req, res) => {
  const { prompt, system = 'You are a professional content creator.', max_tokens = 512 } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt required' });
  try {
    const remaining = await deductCredits(req.user.id, COSTS.text);
    const replicate  = getReplicate();

    let fullText = '';
    for await (const chunk of replicate.stream('meta/meta-llama-3-70b-instruct', {
      input: { prompt, system_prompt: system, max_new_tokens: max_tokens, temperature: 0.7 }
    })) {
      fullText += chunk;
    }

    res.json({ ok: true, credits_remaining: remaining, ...addWatermarkMeta({ text: fullText.trim() }, 'text') });
  } catch(e) {
    if (e.message.includes('Insufficient')) return res.status(402).json({ error: e.message });
    res.status(500).json({ error: e.message });
  }
});

// ══════════════════════════════════════════════════════════════
// UPSCALE IMAGE
// ══════════════════════════════════════════════════════════════
router.post('/upscale', authRequired, async (req, res) => {
  const { image_url, scale = 4 } = req.body;
  if (!image_url) return res.status(400).json({ error: 'image_url required' });
  try {
    const remaining = await deductCredits(req.user.id, COSTS.upscale);
    const replicate  = getReplicate();

    const output = await replicate.run('nightmareai/real-esrgan', {
      input: { image: image_url, scale, face_enhance: true }
    });

    res.json({ ok: true, credits_remaining: remaining, ...addWatermarkMeta({ url: output }, 'upscale') });
  } catch(e) {
    if (e.message.includes('Insufficient')) return res.status(402).json({ error: e.message });
    res.status(500).json({ error: e.message });
  }
});

// ══════════════════════════════════════════════════════════════
// BACKGROUND REMOVAL
// ══════════════════════════════════════════════════════════════
router.post('/bg-remove', authRequired, async (req, res) => {
  const { image_url } = req.body;
  if (!image_url) return res.status(400).json({ error: 'image_url required' });
  try {
    const remaining = await deductCredits(req.user.id, COSTS.bg_remove);
    const replicate  = getReplicate();

    const output = await replicate.run('cjwbw/rembg', { input: { image: image_url } });
    res.json({ ok: true, credits_remaining: remaining, ...addWatermarkMeta({ url: output }, 'bg_remove') });
  } catch(e) {
    if (e.message.includes('Insufficient')) return res.status(402).json({ error: e.message });
    res.status(500).json({ error: e.message });
  }
});

// ── CREDIT COST TABLE ──────────────────────────────────────────
router.get('/costs', (req, res) => res.json({ ok: true, costs: COSTS }));

module.exports = router;
