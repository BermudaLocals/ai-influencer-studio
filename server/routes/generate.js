// generate.js — COMPLETE EMPIRE API ROUTES
// Drop into server/routes/ then add to index.js:
//   app.use('/api/generate', require('./routes/generate'));
//   app.use('/api/assistant', require('./routes/generate').assistant);
//   app.use('/api/music', require('./routes/generate').music);
//   app.use('/api/video', require('./routes/generate').video);

const router   = require('express').Router();
// node 18+ has native fetch built in - no require needed
const fs       = require('fs');
const path     = require('path');
const { Pool } = require('pg');
const pool     = new Pool({ connectionString: process.env.DATABASE_URL });

// ── AUTH MIDDLEWARE ──────────────────────────────────────────────
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token' });
  try {
    const jwt     = require('jsonwebtoken');
    req.user      = jwt.verify(header.replace('Bearer ', ''), process.env.JWT_SECRET);
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
}

// ── CREDIT DEDUCT ─────────────────────────────────────────────────
async function deductCredits(userId, amount) {
  const r = await pool.query('UPDATE users SET credits = credits - $1 WHERE id=$2 AND credits >= $1 RETURNING credits', [amount, userId]);
  if (!r.rows[0]) throw new Error('Insufficient credits');
  return r.rows[0].credits;
}

// ════════════════════════════════════════════════════════════════
// SECTION 1 — MUSIC GENERATION (Mureka + MusicGen fallback)
// ════════════════════════════════════════════════════════════════

const music = require('express').Router();

// POST /api/music/generate
// Body: { prompt, genre, mood, duration, influencer_id, title }
music.post('/generate', auth, async (req, res) => {
  const { prompt, genre = 'pop', mood = 'energetic', duration = 30, influencer_id, title } = req.body;
  try {
    await deductCredits(req.user.id, 5);
    let trackUrl = null;

    // ── Try Mureka first ──────────────────────────────────────
    if (process.env.MUREKA_API_KEY) {
      try {
        const mReq = await fetch('https://api.mureka.ai/v1/song/generate', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${process.env.MUREKA_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `${genre} ${mood} song about: ${prompt}. Duration: ${duration} seconds.`,
            model: 'auto',
            lyrics_type: 'generate',
          })
        });
        const mData = await mReq.json();
        // Mureka returns task_id — poll for result
        if (mData.id || mData.task_id) {
          const taskId = mData.id || mData.task_id;
          // Poll up to 60s
          for (let i = 0; i < 12; i++) {
            await new Promise(r => setTimeout(r, 5000));
            const poll = await fetch(`https://api.mureka.ai/v1/song/${taskId}`, {
              headers: { 'Authorization': `Bearer ${process.env.MUREKA_API_KEY}` }
            });
            const pData = await poll.json();
            if (pData.status === 'succeeded' || pData.flac_url || pData.mp3_url) {
              trackUrl = pData.mp3_url || pData.flac_url || pData.audio_url;
              break;
            }
            if (pData.status === 'failed') break;
          }
        }
        if (mData.mp3_url || mData.audio_url) trackUrl = mData.mp3_url || mData.audio_url;
      } catch (e) { console.error('Mureka error:', e.message); }
    }

    // ── Fallback: Replicate MusicGen ──────────────────────────
    if (!trackUrl && process.env.REPLICATE_API_TOKEN) {
      const rRes = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: { 'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: 'b05b1dff1d8c6dc63d14b0cdb42135378dcb87f6942db2a3f45ddc3f0b892bdc',
          input: { prompt: `${genre} ${mood}: ${prompt}`, duration, model_version: 'stereo-large', output_format: 'mp3' }
        })
      });
      const rData = await rRes.json();
      if (rData.id) {
        for (let i = 0; i < 20; i++) {
          await new Promise(r => setTimeout(r, 3000));
          const poll = await fetch(`https://api.replicate.com/v1/predictions/${rData.id}`, {
            headers: { 'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}` }
          });
          const p = await poll.json();
          if (p.status === 'succeeded') { trackUrl = p.output; break; }
          if (p.status === 'failed') break;
        }
      }
    }

    if (!trackUrl) return res.status(500).json({ error: 'Music generation failed — check MUREKA_API_KEY or REPLICATE_API_TOKEN in Railway' });

    const saved = await pool.query(
      'INSERT INTO music_tracks (user_id, influencer_id, title, prompt, genre, mood, duration, file_url, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW()) RETURNING *',
      [req.user.id, influencer_id || null, title || `${genre} — ${mood}`, prompt, genre, mood, duration, trackUrl]
    ).catch(() => ({ rows: [{ id: null }] }));

    res.json({ success: true, track_url: trackUrl, track: saved.rows[0], provider: process.env.MUREKA_API_KEY ? 'mureka' : 'replicate-musicgen' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/music/lyrics
// Body: { topic, genre, mood, influencer_id }
music.post('/lyrics', auth, async (req, res) => {
  const { topic, genre = 'pop', mood = 'upbeat', influencer_id } = req.body;
  try {
    let creatorName = 'Artist';
    if (influencer_id) {
      const inf = await pool.query('SELECT name FROM influencers WHERE id=$1', [influencer_id]).catch(() => ({ rows: [] }));
      if (inf.rows[0]) creatorName = inf.rows[0].name;
    }
    const res2 = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'anthropic/claude-haiku-4-5',
        messages: [{
          role: 'user',
          content: `Write full song lyrics for an AI creator called ${creatorName}. Genre: ${genre}. Mood: ${mood}. Topic: ${topic}. Include: verse 1, chorus, verse 2, chorus, bridge, final chorus. Make it catchy, viral, TikTok-ready.`
        }]
      })
    });
    const data = await res2.json();
    res.json({ lyrics: data.choices?.[0]?.message?.content || 'Lyrics generation failed' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/music — library
music.get('/', auth, async (req, res) => {
  const r = await pool.query('SELECT * FROM music_tracks WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50', [req.user.id]).catch(() => ({ rows: [] }));
  res.json(r.rows);
});

// ════════════════════════════════════════════════════════════════
// SECTION 2 — VIDEO GENERATION (Kling + HeyGen + D-ID + Wan2.1)
// ════════════════════════════════════════════════════════════════

const video = require('express').Router();

// POST /api/video/dance — dancing AI creator video
// Body: { prompt, duration, influencer_id }
video.post('/dance', auth, async (req, res) => {
  const { prompt, duration = 5, influencer_id } = req.body;
  try {
    await deductCredits(req.user.id, 8);
    let videoUrl = null;

    // ── Kling AI ──────────────────────────────────────────────
    if (process.env.KLING_API_KEY) {
      try {
        const kRes = await fetch('https://api.klingai.com/v1/videos/text2video', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${process.env.KLING_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `${prompt}. Dancing, performing, engaging with camera. High energy. Cinematic.`,
            negative_prompt: 'blurry, low quality, static, boring',
            cfg_scale: 0.5, mode: 'std',
            duration: String(Math.min(duration, 10)),
            aspect_ratio: '9:16'
          })
        });
        const kData = await kRes.json();
        const taskId = kData?.data?.task_id;
        if (taskId) {
          for (let i = 0; i < 24; i++) {
            await new Promise(r => setTimeout(r, 5000));
            const poll = await fetch(`https://api.klingai.com/v1/videos/text2video/${taskId}`, {
              headers: { 'Authorization': `Bearer ${process.env.KLING_API_KEY}` }
            });
            const p = await poll.json();
            if (p?.data?.task_status === 'succeed') {
              videoUrl = p?.data?.videos?.[0]?.url; break;
            }
            if (p?.data?.task_status === 'failed') break;
          }
        }
      } catch (e) { console.error('Kling error:', e.message); }
    }

    // ── Fallback: Wan 2.1 via Replicate ──────────────────────
    if (!videoUrl && process.env.REPLICATE_API_TOKEN) {
      const rRes = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: { 'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: '97d4fc5f0b45f61f60d4f9e3cb1c2e3cb04e0b5f3db5f5c5b5e5a5c5d5e5f5a',
          input: { prompt: `${prompt}. Dancing creator, engaging performance, 9:16 vertical video`, num_frames: duration * 8, fast_mode: true }
        })
      });
      const rData = await rRes.json();
      if (rData.id) {
        for (let i = 0; i < 20; i++) {
          await new Promise(r => setTimeout(r, 4000));
          const p = await fetch(`https://api.replicate.com/v1/predictions/${rData.id}`, { headers: { 'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}` } });
          const pd = await p.json();
          if (pd.status === 'succeeded') { videoUrl = pd.output; break; }
          if (pd.status === 'failed') break;
        }
      }
    }

    if (!videoUrl) return res.status(500).json({ error: 'Video generation failed — check KLING_API_KEY in Railway' });
    res.json({ success: true, video_url: videoUrl, provider: process.env.KLING_API_KEY ? 'kling' : 'replicate-wan' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/video/lipsync — creator face lip-syncs to audio
// Body: { face_image_url, audio_url, influencer_id }
video.post('/lipsync', auth, async (req, res) => {
  const { face_image_url, audio_url, influencer_id, script } = req.body;
  try {
    await deductCredits(req.user.id, 10);
    let videoUrl = null;

    // Get creator face if not provided
    let faceUrl = face_image_url;
    if (!faceUrl && influencer_id) {
      const inf = await pool.query('SELECT avatar_url FROM influencers WHERE id=$1', [influencer_id]).catch(() => ({ rows: [] }));
      faceUrl = inf.rows[0]?.avatar_url;
    }

    // ── HeyGen ───────────────────────────────────────────────
    if (process.env.HEYGEN_API_KEY && (faceUrl || script)) {
      try {
        // If we have a script use HeyGen avatar video
        const hBody = script ? {
          video_inputs: [{
            character: { type: 'avatar', avatar_id: 'Daisy-inskirt-20220818', avatar_style: 'normal' },
            voice: { type: 'text', input_text: script, voice_id: '1bd001e7e50f421d891986aad5158bc8' }
          }],
          dimension: { width: 720, height: 1280 }
        } : {
          video_inputs: [{
            character: { type: 'talking_photo', talking_photo_url: faceUrl },
            voice: { type: 'audio', audio_url: audio_url }
          }],
          dimension: { width: 720, height: 1280 }
        };
        const hRes = await fetch('https://api.heygen.com/v2/video/generate', {
          method: 'POST',
          headers: { 'X-Api-Key': process.env.HEYGEN_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify(hBody)
        });
        const hData = await hRes.json();
        const videoId = hData?.data?.video_id;
        if (videoId) {
          for (let i = 0; i < 30; i++) {
            await new Promise(r => setTimeout(r, 5000));
            const poll = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${videoId}`, {
              headers: { 'X-Api-Key': process.env.HEYGEN_API_KEY }
            });
            const p = await poll.json();
            if (p?.data?.status === 'completed') { videoUrl = p.data.video_url; break; }
            if (p?.data?.status === 'failed') break;
          }
        }
      } catch (e) { console.error('HeyGen error:', e.message); }
    }

    // ── Fallback: D-ID ───────────────────────────────────────
    if (!videoUrl && process.env.DID_API_KEY && faceUrl) {
      try {
        const dRes = await fetch('https://api.d-id.com/talks', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${Buffer.from(process.env.DID_API_KEY + ':').toString('base64')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            source_url: faceUrl,
            script: script ? {
              type: 'text', input: script,
              provider: { type: 'elevenlabs', voice_id: process.env.DEFAULT_ELEVENLABS_VOICE || 'EXAVITQu4vr4xnSDxMaL' }
            } : {
              type: 'audio', audio_url: audio_url
            }
          })
        });
        const dData = await dRes.json();
        if (dData.id) {
          for (let i = 0; i < 20; i++) {
            await new Promise(r => setTimeout(r, 4000));
            const poll = await fetch(`https://api.d-id.com/talks/${dData.id}`, {
              headers: { 'Authorization': `Basic ${Buffer.from(process.env.DID_API_KEY + ':').toString('base64')}` }
            });
            const p = await poll.json();
            if (p.status === 'done') { videoUrl = p.result_url; break; }
            if (p.status === 'error') break;
          }
        }
      } catch (e) { console.error('D-ID error:', e.message); }
    }

    if (!videoUrl) return res.status(500).json({ error: 'Lip-sync failed — check HEYGEN_API_KEY or DID_API_KEY in Railway' });
    res.json({ success: true, video_url: videoUrl, provider: process.env.HEYGEN_API_KEY ? 'heygen' : 'did' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/video/musicvideo — FULL MUSIC VIDEO PIPELINE
// Body: { influencer_id, genre, topic, mood }
video.post('/musicvideo', auth, async (req, res) => {
  const { influencer_id, genre = 'hip-hop', topic = 'success and empire', mood = 'hype' } = req.body;
  try {
    await deductCredits(req.user.id, 40);

    // Get creator
    const inf = await pool.query('SELECT * FROM influencers WHERE id=$1 AND user_id=$2', [influencer_id, req.user.id]).catch(() => ({ rows: [] }));
    const creator = inf.rows[0] || { name: 'Empire Creator', niche: 'lifestyle', avatar_url: null, voice_id: null };

    res.json({
      success: true,
      status: 'processing',
      message: `Full music video for ${creator.name} is being generated. This takes 3-5 minutes. Poll /api/video/musicvideo/status/${influencer_id} for progress.`,
      steps: [
        { step: 1, name: 'Generate lyrics', api: 'OpenRouter/Claude', status: 'queued' },
        { step: 2, name: 'Generate song', api: 'Mureka', status: 'queued' },
        { step: 3, name: 'Generate dance video', api: 'Kling', status: 'queued' },
        { step: 4, name: 'Generate lip-sync', api: 'HeyGen/D-ID', status: 'queued' },
        { step: 5, name: 'Post to all platforms', api: 'GLOWX One Push', status: 'queued' },
      ]
    });

    // Run pipeline async — don't block the response
    setImmediate(async () => {
      try {
        // Step 1: Lyrics
        const lyricsRes = await fetch(`${process.env.BASE_URL}/api/music/lyrics`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': req.headers.authorization },
          body: JSON.stringify({ topic, genre, mood, influencer_id })
        });
        const { lyrics } = await lyricsRes.json();

        // Step 2: Music
        const musicRes = await fetch(`${process.env.BASE_URL}/api/music/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': req.headers.authorization },
          body: JSON.stringify({ prompt: topic, genre, mood, duration: 30, influencer_id, title: `${creator.name} — ${topic}` })
        });
        const { track_url } = await musicRes.json();

        // Step 3: Dance video
        const danceRes = await fetch(`${process.env.BASE_URL}/api/video/dance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': req.headers.authorization },
          body: JSON.stringify({ prompt: `${creator.name} ${genre} performance, ${mood} energy, ${topic}`, duration: 8, influencer_id })
        });
        const { video_url: danceUrl } = await danceRes.json();

        // Step 4: Lip-sync
        const lipRes = await fetch(`${process.env.BASE_URL}/api/video/lipsync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': req.headers.authorization },
          body: JSON.stringify({ face_image_url: creator.avatar_url, audio_url: track_url, influencer_id, script: lyrics?.substring(0, 300) })
        });
        const { video_url: lipsyncUrl } = await lipRes.json();

        // Save completed music video to DB
        await pool.query(
          'INSERT INTO content_jobs (user_id, influencer_id, script, video_url, status, platform, created_at) VALUES ($1,$2,$3,$4,$5,$6,NOW())',
          [req.user.id, influencer_id, lyrics, lipsyncUrl || danceUrl, 'ready', 'all']
        ).catch(() => {});

        console.log(`[MUSIC VIDEO COMPLETE] Creator: ${creator.name} | Dance: ${danceUrl} | Lipsync: ${lipsyncUrl} | Track: ${track_url}`);
      } catch (e) { console.error('[MUSIC VIDEO PIPELINE ERROR]', e.message); }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/video/product — AI creator demonstrates product
// Body: { product_name, product_description, influencer_id, product_images }
video.post('/product', auth, async (req, res) => {
  const { product_name, product_description, influencer_id, product_images = [] } = req.body;
  try {
    await deductCredits(req.user.id, 15);
    const inf = await pool.query('SELECT * FROM influencers WHERE id=$1', [influencer_id]).catch(() => ({ rows: [{}] }));
    const creator = inf.rows[0] || {};
    // Generate product demo script
    const scriptRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'anthropic/claude-haiku-4-5',
        messages: [{ role: 'user', content: `Write a 30-second product demo script for ${creator.name || 'AI Creator'} presenting: ${product_name}. Description: ${product_description}. Make it energetic, TikTok-style, include a strong CTA. Max 80 words.` }]
      })
    });
    const scriptData = await scriptRes.json();
    const script = scriptData.choices?.[0]?.message?.content || `Check out ${product_name}! ${product_description}. Get yours now!`;
    // Generate talking head video with script
    const lipRes = await fetch(`${process.env.BASE_URL}/api/video/lipsync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': req.headers.authorization },
      body: JSON.stringify({ face_image_url: creator.avatar_url, influencer_id, script })
    });
    const { video_url } = await lipRes.json();
    res.json({ success: true, video_url, script, product: product_name });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════════
// SECTION 3 — VOICE (ElevenLabs)
// ════════════════════════════════════════════════════════════════

router.post('/voice', auth, async (req, res) => {
  const { text, voice_id, influencer_id } = req.body;
  try {
    await deductCredits(req.user.id, 3);
    let vid = voice_id;
    if (!vid && influencer_id) {
      const inf = await pool.query('SELECT voice_id FROM influencers WHERE id=$1', [influencer_id]).catch(() => ({ rows: [] }));
      vid = inf.rows[0]?.voice_id;
    }
    vid = vid || process.env.DEFAULT_ELEVENLABS_VOICE || 'EXAVITQu4vr4xnSDxMaL';

    if (!process.env.ELEVENLABS_API_KEY) return res.status(400).json({ error: 'Add ELEVENLABS_API_KEY to Railway' });

    const eRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${vid}`, {
      method: 'POST',
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model_id: 'eleven_turbo_v2', voice_settings: { stability: 0.5, similarity_boost: 0.8 } })
    });
    if (!eRes.ok) throw new Error(`ElevenLabs error: ${eRes.status}`);
    const buffer = await eRes.buffer();
    const filePath = `/tmp/voice_${Date.now()}.mp3`;
    fs.writeFileSync(filePath, buffer);
    res.json({ success: true, audio_url: filePath, provider: 'elevenlabs' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/generate/voices — list available voices
router.get('/voices', auth, async (req, res) => {
  try {
    if (!process.env.ELEVENLABS_API_KEY) return res.json({ voices: [], message: 'Add ELEVENLABS_API_KEY to Railway' });
    const eRes = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY } });
    const data = await eRes.json();
    res.json({ voices: data.voices || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════════
// SECTION 4 — IMAGE (Replicate SDXL / FLUX)
// ════════════════════════════════════════════════════════════════

router.post('/image', auth, async (req, res) => {
  const { prompt, width = 768, height = 1344, style = 'photorealistic' } = req.body;
  try {
    await deductCredits(req.user.id, 5);
    if (!process.env.REPLICATE_API_TOKEN) return res.status(400).json({ error: 'Add REPLICATE_API_TOKEN to Railway' });
    const rRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: { 'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version: '39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
        input: { prompt: `${prompt}, ${style}, 4K, ultra detailed`, width, height, num_inference_steps: 30, guidance_scale: 7.5 }
      })
    });
    const rData = await rRes.json();
    if (!rData.id) throw new Error(rData.detail || 'Replicate error');
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 2500));
      const p = await fetch(`https://api.replicate.com/v1/predictions/${rData.id}`, { headers: { 'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}` } });
      const pd = await p.json();
      if (pd.status === 'succeeded') return res.json({ success: true, image_url: pd.output?.[0] || pd.output, provider: 'replicate-sdxl' });
      if (pd.status === 'failed') throw new Error(pd.error || 'Generation failed');
    }
    throw new Error('Timeout');
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════════
// SECTION 5 — DM AUTO-REPLY (in-character, upsells tokens)
// ════════════════════════════════════════════════════════════════

router.post('/dm', auth, async (req, res) => {
  const { message, influencer_id, fan_name = 'babe' } = req.body;
  try {
    const inf = await pool.query('SELECT * FROM influencers WHERE id=$1', [influencer_id]).catch(() => ({ rows: [{}] }));
    const creator = inf.rows[0] || { name: 'Luna', personality_prompt: 'flirty, mysterious, confident', niche: 'lifestyle' };
    const dmRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'anthropic/claude-haiku-4-5',
        messages: [{
          role: 'user',
          content: `You are ${creator.name}, a ${creator.niche} AI creator. Personality: ${creator.personality_prompt || 'flirty, confident, mysterious'}.
Reply to this fan DM in character. Keep it under 80 words. Be warm and engaging. Naturally mention your exclusive content if relevant. Don't be pushy.
Fan name: ${fan_name}. Their message: "${message}"`
        }]
      })
    });
    const data = await dmRes.json();
    const reply = data.choices?.[0]?.message?.content || `Hey ${fan_name}! 💕 So glad you messaged me. What would you like to know?`;
    res.json({ success: true, reply, creator: creator.name });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════════
// SECTION 6 — SCRIPT + CAPTION + VIRAL SCORE
// ════════════════════════════════════════════════════════════════

router.post('/script', auth, async (req, res) => {
  const { topic, platform = 'tiktok', niche = 'lifestyle', duration = 30 } = req.body;
  try {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'anthropic/claude-haiku-4-5',
        messages: [{ role: 'user', content: `Write a ${duration}-second ${platform} video script about: ${topic}. Niche: ${niche}. Include: strong hook (first 3 seconds), body, agree-bait question, CTA to comment. Max 120 words total. Format: HOOK: / BODY: / AGREE BAIT: / CTA:` }]
      })
    });
    const d = await r.json();
    res.json({ script: d.choices?.[0]?.message?.content });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/caption', auth, async (req, res) => {
  const { content, platform = 'tiktok', niche = 'lifestyle' } = req.body;
  try {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'anthropic/claude-haiku-4-5',
        messages: [{ role: 'user', content: `Write a ${platform} caption for: ${content}. Niche: ${niche}. Include: 150-200 words, agree-bait question, keyword CTA, 30 hashtags (5 viral + 15 niche + 10 brand). Ready to paste.` }]
      })
    });
    const d = await r.json();
    res.json({ caption: d.choices?.[0]?.message?.content });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/viral-score', auth, async (req, res) => {
  const { content, platform = 'tiktok' } = req.body;
  try {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'anthropic/claude-haiku-4-5',
        messages: [{ role: 'user', content: `Score this ${platform} content for virality 0-100. Content: "${content}". Reply ONLY with JSON: {"score": 85, "hook_strength": 90, "agree_bait": 80, "cta_clarity": 85, "tip": "one improvement"}` }]
      })
    });
    const d = await r.json();
    let result = { score: 75, tip: 'Add stronger hook' };
    try { result = JSON.parse(d.choices?.[0]?.message?.content?.replace(/```json|```/g, '').trim()); } catch {}
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════════
// SECTION 7 — AI ASSISTANT CHAT (for widget.js)
// ════════════════════════════════════════════════════════════════

const assistant = require('express').Router();

// POST /api/assistant/chat
assistant.post('/chat', async (req, res) => {
  const { messages, system, product } = req.body;
  try {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'anthropic/claude-haiku-4-5',
        system: system || `You are the AI assistant for the Empire — CREATRIX Studio, AI Influencer Studio, GLOWX, NVME.live. Help users create AI videos, music, post everywhere. Keep responses under 60 words. Be direct and enthusiastic.`,
        messages: (messages || []).slice(-8)
      })
    });
    const d = await r.json();
    res.json({ reply: d.choices?.[0]?.message?.content || 'Ask me anything about creating AI content!' });
  } catch (err) { res.status(500).json({ reply: 'I\'m here — ask me anything about the empire!' }); }
});

// GET /api/assistant/widget.js — serves the widget script
assistant.get('/widget.js', (req, res) => {
  const widgetPath = path.join(__dirname, '../widget.js');
  if (fs.existsSync(widgetPath)) {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(widgetPath);
  } else {
    // Inline minimal widget if file not found
    res.setHeader('Content-Type', 'application/javascript');
    res.send(`
(function(){
  const s=document.currentScript;
  const p=s&&s.getAttribute('data-product')||'EMPIRE';
  const g=s&&s.getAttribute('data-color')||'#C9A84C';
  const btn=document.createElement('button');
  btn.id='ewb';btn.textContent='🤖';
  btn.style.cssText='position:fixed;bottom:28px;right:28px;z-index:99999;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,'+g+',#5a4000);border:2px solid '+g+';cursor:pointer;font-size:22px;color:#fff;box-shadow:0 0 20px '+g+'55';
  btn.title='Ask AI Assistant';
  btn.onclick=()=>window.open('https://ai-influencer-studio-production.up.railway.app','_blank');
  document.body.appendChild(btn);
})();
    `);
  }
});

// POST /api/leads/capture — from widget email form
const leads = require('express').Router();
leads.post('/capture', async (req, res) => {
  const { email, product, source, page } = req.body;
  try {
    await pool.query(
      'INSERT INTO leads (email, source, niche, status, created_at) VALUES ($1,$2,$3,$4,NOW()) ON CONFLICT (email) DO UPDATE SET source=$2, updated_at=NOW()',
      [email, `widget-${product || 'empire'}`, page || source, 'new']
    ).catch(() => {});
    // Send welcome email via Resend if configured
    if (process.env.RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `Empire AI <${process.env.FROM_EMAIL || 'hello@aigrowth.hq'}>`,
          to: [email],
          subject: '👑 Welcome to the Empire — Your Free Walkthrough Inside',
          html: `<div style="background:#0d0d0d;color:#f0e8d0;padding:40px;font-family:Arial;max-width:600px;margin:0 auto">
<h1 style="color:#C9A84C">👑 Welcome to the Empire</h1>
<p>You just joined something different.</p>
<p>Here is your free walkthrough of everything we have built:</p>
<ul>
<li><strong style="color:#C9A84C">CREATRIX Studio</strong> — 30 AI tools. Videos in 20 seconds. Music in 30. 129 prompts.</li>
<li><strong style="color:#C9A84C">AI Influencer Studio</strong> — 29 AI creators posting 9x daily, earning subscriptions while you sleep.</li>
<li><strong style="color:#C9A84C">GLOWX</strong> — One Push to TikTok, Instagram, Facebook, Snapchat, Threads.</li>
<li><strong style="color:#C9A84C">NVME.live</strong> — Go live. Earn virtual gifts. Real money in real time.</li>
</ul>
<p style="margin-top:30px"><a href="${process.env.BASE_URL}" style="background:linear-gradient(135deg,#C9A84C,#8a6f2e);color:#000;padding:14px 28px;text-decoration:none;font-weight:bold;border-radius:8px">START CREATING FREE →</a></p>
<p style="color:#666;font-size:12px;margin-top:40px">AI Growth HQ · Reply to this email with any questions · Unsubscribe</p>
</div>`
        })
      }).catch(e => console.error('Resend error:', e.message));
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'live',
    apis: {
      replicate:   !!process.env.REPLICATE_API_TOKEN,
      openrouter:  !!process.env.OPENROUTER_API_KEY,
      elevenlabs:  !!process.env.ELEVENLABS_API_KEY,
      kling:       !!process.env.KLING_API_KEY,
      heygen:      !!process.env.HEYGEN_API_KEY,
      did:         !!process.env.DID_API_KEY,
      mureka:      !!process.env.MUREKA_API_KEY,
      resend:      !!process.env.RESEND_API_KEY,
      snapchat:    !!process.env.SNAPCHAT_ACCESS_TOKEN,
      facebook:    !!process.env.FB_PAGE_ID,
      instagram:   !!process.env.IG_BUSINESS_ID,
    }
  });
});

module.exports = router;
module.exports.music     = music;
module.exports.video     = video;
module.exports.assistant = assistant;
module.exports.leads     = leads;
