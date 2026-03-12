/**
 * FULL GENERATION PIPELINE ORCHESTRATOR
 * Layer 1: idea → script → scenes → images → voice → video → captions → final render
 * Connects ALL engines. Fully autonomous end-to-end.
 */
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const imageEngine   = require('./imageEngine');
const voiceEngine   = require('./voiceEngine');
const videoEngine   = require('./videoEngine');
const textEngine    = require('./textEngine');
const storageEngine = require('./storageEngine');
const captionEngine = require('./captionEngine');
const logger        = require('./logger');

// ── STAGE 1: GENERATE SCRIPT ──────────────────────────────────────
async function generateScript({ prompt, creator, platform }) {
  logger.info(`[Pipeline] Stage 1: Generating script for "${prompt}"`);
  const platformRules = {
    tiktok:    { maxDuration: 60,  style: 'hook-first, punchy, trending audio cue, 3-act structure' },
    youtube:   { maxDuration: 600, style: 'SEO title, detailed, chapters, CTA at 30%' },
    instagram: { maxDuration: 90,  style: 'visual-first, lifestyle, aspirational' },
    fanvue:    { maxDuration: 120, style: 'intimate, personal, exclusive feel' }
  };
  const rules = platformRules[platform] || platformRules.tiktok;

  const scriptPrompt = `You are a viral content scriptwriter for AI influencer "${creator.name}" (${creator.niche} niche, ${creator.personality}).

Write a ${platform} video script about: "${prompt}"

Rules:
- Platform: ${platform} (max ${rules.maxDuration}s, style: ${rules.style})
- Voice: ${creator.voice_style}
- Include: [HOOK], [SCENE 1-N], [VOICEOVER TEXT], [ON-SCREEN TEXT], [CTA]
- Scenes should have visual descriptions for image generation

Return JSON only:
{
  "title": "...",
  "hook": "...",
  "duration_seconds": 30,
  "scenes": [
    {
      "scene_num": 1,
      "duration": 5,
      "voiceover": "...",
      "visual_description": "...",
      "on_screen_text": "...",
      "image_prompt": "ultra-realistic portrait of ${creator.name}, [scene description], 8K, photorealistic"
    }
  ],
  "cta": "...",
  "hashtags": ["..."],
  "caption": "..."
}`;

  const result = await textEngine.generateText(scriptPrompt);
  try {
    const clean = result.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    logger.warn('[Pipeline] Script parse failed, using fallback');
    return {
      title: prompt,
      hook: `Check this out — ${prompt}`,
      duration_seconds: 30,
      scenes: [{ scene_num: 1, duration: 30, voiceover: prompt, visual_description: prompt, on_screen_text: '', image_prompt: `${creator.name}, ${prompt}, ultra realistic, 8K` }],
      cta: 'Follow for more',
      hashtags: ['#aiinfluencer', `#${creator.niche.replace(/\s/g,'')}`],
      caption: prompt
    };
  }
}

// ── STAGE 2: GENERATE SCENE IMAGES ───────────────────────────────
async function generateSceneImages({ scenes, creator }) {
  logger.info(`[Pipeline] Stage 2: Generating ${scenes.length} scene images`);
  const imagePaths = await Promise.allSettled(
    scenes.map(scene =>
      imageEngine.generateImage(scene.image_prompt || `${creator.name}, ${scene.visual_description}, photorealistic, 8K`, {
        width: 1080, height: 1920, type: 'scene'
      })
    )
  );
  return imagePaths.map((r, i) => r.status === 'fulfilled' ? r.value : null).filter(Boolean);
}

// ── STAGE 3: GENERATE VOICEOVER ──────────────────────────────────
async function generateVoiceover({ scenes, creator }) {
  logger.info(`[Pipeline] Stage 3: Generating voiceover`);
  const fullScript = scenes.map(s => s.voiceover).join(' ');
  try {
    const audioPath = await voiceEngine.generateVoice({
      text: fullScript,
      voiceId: creator.elevenlabs_voice_id || process.env.ELEVENLABS_VOICE_ID,
      creatorName: creator.name
    });
    return audioPath;
  } catch (e) {
    logger.error(`[Pipeline] Voiceover failed: ${e.message}`);
    return null;
  }
}

// ── STAGE 4: GENERATE CAPTIONS ───────────────────────────────────
async function generateCaptions({ scenes, audioPath }) {
  logger.info(`[Pipeline] Stage 4: Generating captions`);
  try {
    const captionEngine = require('./captionEngine');
    return await captionEngine.generateCaptions({ scenes, audioPath });
  } catch {
    // Fallback: build SRT from scene timecodes
    let srt = '', time = 0;
    scenes.forEach((s, i) => {
      const start = formatSRT(time);
      time += s.duration || 5;
      const end = formatSRT(time);
      srt += `${i+1}\n${start} --> ${end}\n${s.on_screen_text || s.voiceover?.slice(0,60)}\n\n`;
    });
    const captionPath = `/tmp/captions_${Date.now()}.srt`;
    require('fs').writeFileSync(captionPath, srt);
    return captionPath;
  }
}

function formatSRT(secs) {
  const h = Math.floor(secs/3600), m = Math.floor((secs%3600)/60), s = Math.floor(secs%60);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},000`;
}

// ── STAGE 5: RENDER FINAL VIDEO ───────────────────────────────────
async function renderFinalVideo({ imagePaths, audioPath, captionPath, script, outputPath }) {
  logger.info(`[Pipeline] Stage 5: Rendering final video`);
  return videoEngine.createSlideVideo({
    images: imagePaths,
    audioPath,
    outputPath: outputPath || `/tmp/final_${Date.now()}.mp4`,
    duration: script.duration_seconds || 30,
    captions: captionPath
  });
}

// ── STAGE 6: UPLOAD TO PERSISTENT STORAGE ─────────────────────────
async function uploadAssets({ videoPath, imagePaths, jobId }) {
  logger.info(`[Pipeline] Stage 6: Uploading to storage`);
  try {
    const storage = require('./storageEngine');
    const videoUrl = await storage.uploadFile(videoPath, `videos/${jobId}/final.mp4`);
    const thumbnailUrl = imagePaths[0] ? await storage.uploadFile(imagePaths[0], `videos/${jobId}/thumbnail.jpg`) : null;
    return { videoUrl, thumbnailUrl };
  } catch (e) {
    logger.warn(`[Pipeline] Storage upload failed: ${e.message} — keeping local path`);
    return { videoUrl: videoPath, thumbnailUrl: imagePaths[0] };
  }
}

// ══════════════════════════════════════════════════════════════════
// MASTER PIPELINE — runs all 6 stages sequentially
// ══════════════════════════════════════════════════════════════════
async function runFullPipeline({ jobId, userId, creatorId, prompt, platform, scheduledAt }) {
  const startTime = Date.now();
  logger.info(`[Pipeline] 🚀 Starting full pipeline: ${jobId}`);

  // Update job status in DB
  const updateStatus = async (status, data = {}) => {
    await pool.query(
      `UPDATE content_jobs SET status=$1, ${Object.keys(data).map((k,i) => `${k}=$${i+2}`).join(',') || 'updated_at=NOW()'} WHERE id=$${Object.keys(data).length+2}`,
      [status, ...Object.values(data), jobId]
    ).catch(e => logger.warn(`[Pipeline] DB update failed: ${e.message}`));
  };

  try {
    // Fetch creator profile
    await updateStatus('processing');
    const creatorResult = await pool.query('SELECT * FROM influencers WHERE id=$1', [creatorId]);
    const creator = creatorResult.rows[0];
    if (!creator) throw new Error(`Creator ${creatorId} not found`);

    // Stage 1: Script
    await updateStatus('generating_script');
    const script = await generateScript({ prompt, creator, platform: platform || 'tiktok' });
    await pool.query('UPDATE content_jobs SET script=$1 WHERE id=$2', [JSON.stringify(script), jobId]);

    // Stage 2: Images
    await updateStatus('generating_images');
    const imagePaths = await generateSceneImages({ scenes: script.scenes, creator });
    if (!imagePaths.length) throw new Error('No images generated');

    // Stage 3: Voice
    await updateStatus('generating_voice');
    const audioPath = await generateVoiceover({ scenes: script.scenes, creator });

    // Stage 4: Captions
    await updateStatus('generating_captions');
    const captionPath = await generateCaptions({ scenes: script.scenes, audioPath });

    // Stage 5: Render
    await updateStatus('rendering');
    const outputPath = `/tmp/final_${jobId}.mp4`;
    await renderFinalVideo({ imagePaths, audioPath, captionPath, script, outputPath });

    // Stage 6: Upload
    await updateStatus('uploading');
    const { videoUrl, thumbnailUrl } = await uploadAssets({ videoPath: outputPath, imagePaths, jobId });

    // Done — update DB
    const duration = Math.round((Date.now() - startTime) / 1000);
    await pool.query(
      `UPDATE content_jobs SET status='completed', video_url=$1, thumbnail_url=$2, script=$3, updated_at=NOW() WHERE id=$4`,
      [videoUrl, thumbnailUrl, JSON.stringify(script), jobId]
    );

    // Queue for publishing if scheduled
    if (scheduledAt) {
      const { queuePublish } = require('../queue/jobQueue');
      await queuePublish({ postId: jobId, platform, content: { videoUrl, caption: script.caption, hashtags: script.hashtags }, scheduledAt });
    }

    logger.info(`[Pipeline] ✅ Complete: ${jobId} in ${duration}s`);
    return { success: true, jobId, videoUrl, thumbnailUrl, script, duration };

  } catch (err) {
    logger.error(`[Pipeline] ❌ Failed: ${jobId} — ${err.message}`);
    await updateStatus('failed');
    await pool.query(`UPDATE content_jobs SET error_message=$1 WHERE id=$2`, [err.message, jobId]).catch(() => {});
    throw err;
  }
}

module.exports = { runFullPipeline, generateScript, generateSceneImages, generateVoiceover, generateCaptions, renderFinalVideo };
