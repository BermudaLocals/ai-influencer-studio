/**
 * MARKETING DEPARTMENT ENGINE
 * TikTok viral detection, content calendar, video editing pipeline,
 * Opus Clip style auto-cutting, social media scheduler
 */
const axios   = require('axios');
const { Pool } = require('pg');
const pool    = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// ── VIRAL CONTENT DETECTOR ────────────────────────────────────────────────────
// Scores any content idea against viral patterns
async function analyzeViralPotential(content) {
  const { niche, hook, caption, hashtags = [], duration_seconds } = content;

  // Engagement score weights based on TikTok algorithm patterns
  const scores = {
    hook_strength:     scoreHook(hook),
    caption_quality:   scoreCaption(caption),
    hashtag_relevance: scoreHashtags(hashtags, niche),
    duration_fit:      scoreDuration(duration_seconds),
    trend_alignment:   await checkTrendAlignment(niche, hashtags)
  };

  const viral_score = (
    scores.hook_strength     * 0.35 +
    scores.caption_quality   * 0.20 +
    scores.hashtag_relevance * 0.15 +
    scores.duration_fit      * 0.15 +
    scores.trend_alignment   * 0.15
  );

  const anomaly_type = detectAnomaly(scores);

  return {
    viral_score: Math.round(viral_score * 100),
    scores,
    anomaly_type,
    recommendation: buildRecommendation(scores, viral_score),
    predicted_engagement: {
      views:    Math.round(viral_score * 50000),
      likes:    Math.round(viral_score * 3500),
      comments: Math.round(viral_score * 280),
      shares:   Math.round(viral_score * 420),
      followers_gained: Math.round(viral_score * 180)
    }
  };
}

function scoreHook(hook = '') {
  if (!hook) return 0.3;
  const powerWords = ['secret','never','finally','exposed','truth','shocking','watch','stop','wait','wrong','mistake'];
  const questionWords = ['why','how','what','did you know','have you'];
  const numberPattern = /\d+/;

  let score = 0.4;
  const lower = hook.toLowerCase();
  if (powerWords.some(w => lower.includes(w))) score += 0.25;
  if (questionWords.some(w => lower.includes(w))) score += 0.15;
  if (numberPattern.test(hook)) score += 0.1;
  if (hook.length < 60) score += 0.1;
  return Math.min(score, 1.0);
}

function scoreCaption(caption = '') {
  if (!caption) return 0.3;
  let score = 0.4;
  if (caption.includes('?')) score += 0.15;
  if (caption.includes('!')) score += 0.1;
  if (caption.length > 50 && caption.length < 200) score += 0.2;
  if (/[🔥💯✨👀🎯]/.test(caption)) score += 0.1;
  return Math.min(score, 1.0);
}

function scoreHashtags(hashtags = [], niche = '') {
  if (!hashtags.length) return 0.3;
  const nicheMap = {
    fitness:   ['fyp','fitness','workout','gym','health','motivation'],
    beauty:    ['fyp','beauty','makeup','skincare','glowup','tutorial'],
    finance:   ['fyp','money','investing','finance','rich','passive'],
    adult:     ['fyp','creator','exclusive','fanvue','subscribe','link'],
    music:     ['fyp','music','newmusic','artist','singer','viral'],
    gaming:    ['fyp','gaming','gamer','twitch','xbox','ps5']
  };
  const good = nicheMap[niche] || ['fyp','viral','trending','foryou'];
  const matches = hashtags.filter(h => good.includes(h.toLowerCase().replace('#',''))).length;
  return Math.min(0.4 + (matches / good.length) * 0.6, 1.0);
}

function scoreDuration(seconds) {
  if (!seconds) return 0.5;
  // TikTok sweet spots: 7-15s for pure viral, 30-60s for depth
  if (seconds >= 7  && seconds <= 15)  return 1.0;
  if (seconds >= 15 && seconds <= 30)  return 0.85;
  if (seconds >= 30 && seconds <= 60)  return 0.80;
  if (seconds >= 60 && seconds <= 90)  return 0.70;
  return 0.5;
}

async function checkTrendAlignment(niche, hashtags) {
  // Check against stored trending data in DB
  try {
    const r = await pool.query(
      'SELECT trend_score FROM trending_topics WHERE niche=$1 ORDER BY created_at DESC LIMIT 1',
      [niche]
    );
    return r.rows[0]?.trend_score || 0.6;
  } catch { return 0.6; }
}

function detectAnomaly(scores) {
  if (scores.hook_strength > 0.85 && scores.trend_alignment > 0.8) return 'VIRAL_SPIKE';
  if (scores.hashtag_relevance > 0.9 && scores.caption_quality > 0.8) return 'ENGAGEMENT_BUBBLE';
  if (scores.duration_fit > 0.9) return 'HIGH_RETENTION';
  return 'STANDARD';
}

function buildRecommendation(scores, viral_score) {
  const tips = [];
  if (scores.hook_strength < 0.6)     tips.push('Strengthen your hook — add a number, power word, or question');
  if (scores.caption_quality < 0.6)   tips.push('Add a question to your caption to boost comments');
  if (scores.hashtag_relevance < 0.6) tips.push('Use more niche-specific hashtags + #fyp');
  if (scores.duration_fit < 0.7)      tips.push('Trim to 7-15 seconds for maximum reach');
  if (viral_score > 0.7) tips.push('🔥 High viral potential — post between 6-10pm local time');
  return tips;
}

// ── CONTENT CALENDAR ──────────────────────────────────────────────────────────
function generateContentCalendar(creator, weeks = 4) {
  const themes = {
    monday:    { theme: 'Motivation Monday',    cta: 'Save this for the week',    best_time: '07:00' },
    tuesday:   { theme: 'Tutorial Tuesday',     cta: 'Follow for more tips',      best_time: '12:00' },
    wednesday: { theme: 'Behind the Scenes',    cta: 'Comment your thoughts',     best_time: '15:00' },
    thursday:  { theme: 'Throwback/Story',      cta: 'Share if you relate',       best_time: '19:00' },
    friday:    { theme: 'Friday Fun/Trend',     cta: 'Tag a friend',              best_time: '18:00' },
    saturday:  { theme: 'Exclusive Content',    cta: 'Subscribe for more',        best_time: '20:00' },
    sunday:    { theme: 'Personal/Reflective',  cta: 'DM me your thoughts',       best_time: '21:00' }
  };

  const calendar = [];
  const startDate = new Date();

  for (let week = 0; week < weeks; week++) {
    const weekData = { week: week + 1, posts: [] };

    Object.entries(themes).forEach(([day, config]) => {
      const postDate = new Date(startDate);
      const dayOffset = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'].indexOf(day);
      postDate.setDate(startDate.getDate() + (week * 7) + dayOffset);

      weekData.posts.push({
        date:         postDate.toISOString().split('T')[0],
        day,
        time:         config.best_time,
        theme:        config.theme,
        cta:          config.cta,
        platforms:    creator.platforms || ['tiktok','instagram'],
        niche:        creator.niche,
        content_type: pickContentType(week, day),
        hook_template: generateHook(creator.niche, config.theme),
        caption_template: generateCaption(creator, config),
        hashtags:     generateHashtags(creator.niche),
        status:       'scheduled',
        auto_generate: true,
        auto_post:    true,
        creator_id:   creator.id,
        creator_name: creator.name
      });
    });

    calendar.push(weekData);
  }

  return calendar;
}

function pickContentType(week, day) {
  const types = ['tutorial','storytime','trend','pov','before_after','challenge','reveal'];
  return types[(week * 7 + ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].indexOf(day)) % types.length];
}

function generateHook(niche, theme) {
  const hooks = {
    fitness:   [`POV: Your ${theme} just hit different 💪`, `Stop doing this in the gym (${theme})`, `Why most people fail at fitness — ${theme} edition`],
    beauty:    [`The ${theme} hack no one talks about ✨`, `POV: You finally found your ${theme} routine`, `I tested 10 products for ${theme} — here's the truth`],
    finance:   [`How I made $X this week (${theme})`, `The ${theme} mistake costing you thousands`, `Nobody tells you this about money — ${theme}`],
    music:     [`This ${theme} beat goes HARD 🔥`, `POV: You're vibing to my ${theme} edit`, `The ${theme} sound you need rn`],
    gaming:    [`This ${theme} glitch is insane 🎮`, `POV: You discovered the ${theme} secret`, `Nobody knows this ${theme} trick`]
  };
  const nicheHooks = hooks[niche] || [`${theme} energy only today`, `POV: ${theme} just changed everything`, `The truth about ${theme} nobody says`];
  return nicheHooks[Math.floor(Math.random() * nicheHooks.length)];
}

function generateCaption(creator, config) {
  return `${config.theme} energy today! ${creator.tagline || ''}\n\n${config.cta} 👇\n\n${generateHashtags(creator.niche).slice(0,5).join(' ')}`;
}

function generateHashtags(niche) {
  const base = ['#fyp','#foryou','#viral','#trending'];
  const niches = {
    fitness:  ['#fitness','#workout','#gym','#health','#fitnessmotivation','#bodybuilding'],
    beauty:   ['#beauty','#makeup','#skincare','#glowup','#beautytips','#makeuptutorial'],
    finance:  ['#money','#finance','#investing','#wealth','#passiveincome','#sidehustle'],
    music:    ['#music','#newmusic','#artist','#singer','#producer','#musicvideo'],
    gaming:   ['#gaming','#gamer','#games','#twitch','#streamer','#gaminglife'],
    adult:    ['#creator','#exclusive','#subscribe','#fanvue','#contentcreator','#linkbio']
  };
  return [...base, ...(niches[niche] || ['#content','#creator','#follow','#like'])];
}

// ── VIDEO EDITING PIPELINE ────────────────────────────────────────────────────
// Opus Clip style: auto-cut long video into viral shorts
async function processVideoForShorts(videoUrl, options = {}) {
  const { creator, niche, target_duration = 15, platforms = ['tiktok','instagram_reels','youtube_shorts'] } = options;

  // Step 1: Analyze video transcript/captions for key moments
  const keyMoments = await extractKeyMoments(videoUrl);

  // Step 2: Score each moment for viral potential
  const scoredMoments = keyMoments.map(moment => ({
    ...moment,
    viral_score: scoreHook(moment.text) * 0.6 + (moment.energy_level || 0.5) * 0.4
  })).sort((a, b) => b.viral_score - a.viral_score);

  // Step 3: Generate clips
  const clips = scoredMoments.slice(0, 5).map((moment, i) => ({
    clip_number:    i + 1,
    start_time:     moment.start,
    end_time:       Math.min(moment.start + target_duration, moment.end),
    duration:       target_duration,
    viral_score:    Math.round(moment.viral_score * 100),
    hook:           moment.text.slice(0, 100),
    platforms,
    caption:        generateCaption({ niche, tagline: '' }, { theme: 'viral moment', cta: 'Follow for more' }),
    hashtags:       generateHashtags(niche),
    auto_post:      true,
    status:         'ready'
  }));

  return {
    original_url:    videoUrl,
    clips_generated: clips.length,
    clips,
    total_reach_potential: clips.reduce((sum, c) => sum + Math.round(c.viral_score * 500), 0)
  };
}

async function extractKeyMoments(videoUrl) {
  // Uses Replicate Whisper for transcription + energy detection
  if (!process.env.REPLICATE_API_TOKEN) {
    // Return mock moments if no API key
    return [
      { start: 0,   end: 15,  text: 'Opening hook moment', energy_level: 0.9 },
      { start: 30,  end: 45,  text: 'Key insight revealed', energy_level: 0.85 },
      { start: 60,  end: 75,  text: 'Transformation reveal', energy_level: 0.95 },
      { start: 90,  end: 105, text: 'Call to action moment', energy_level: 0.8 },
      { start: 120, end: 135, text: 'Surprise ending', energy_level: 0.88 }
    ];
  }

  try {
    const res = await axios.post('https://api.replicate.com/v1/predictions', {
      version: '4d50797290df275329f202e48c76360b3f22b08d28c196cbc54600319435f8d2', // whisper
      input: { audio: videoUrl, language: 'en', word_timestamps: true }
    }, { headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}` } });

    // Poll for result
    const id = res.data.id;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 3000));
      const poll = await axios.get(`https://api.replicate.com/v1/predictions/${id}`,
        { headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}` } });
      if (poll.data.status === 'succeeded') {
        return parseTranscriptToMoments(poll.data.output);
      }
    }
  } catch(e) { console.log('[videoEngine] transcription failed:', e.message); }

  return [];
}

function parseTranscriptToMoments(transcript) {
  if (!transcript?.segments) return [];
  return transcript.segments.map(seg => ({
    start:        seg.start,
    end:          seg.end,
    text:         seg.text,
    energy_level: Math.min(seg.words?.length / 20 || 0.5, 1.0)
  }));
}

// ── SOCIAL MEDIA SCHEDULER ────────────────────────────────────────────────────
async function schedulePost(post) {
  const { creator_id, platform, content, scheduled_time, media_urls = [] } = post;
  try {
    await pool.query(`
      INSERT INTO scheduled_posts
        (creator_id, platform, content, media_urls, scheduled_time, status, created_at)
      VALUES ($1,$2,$3,$4,$5,'scheduled',NOW())
      ON CONFLICT DO NOTHING
    `, [creator_id, platform, JSON.stringify(content), JSON.stringify(media_urls), scheduled_time]);
    return { success: true, scheduled_time };
  } catch(e) { return { success: false, error: e.message }; }
}

async function getScheduledPosts(creatorId, days = 7) {
  try {
    const r = await pool.query(`
      SELECT * FROM scheduled_posts
      WHERE creator_id=$1
        AND scheduled_time BETWEEN NOW() AND NOW() + INTERVAL '${days} days'
      ORDER BY scheduled_time ASC
    `, [creatorId]);
    return r.rows;
  } catch(e) { return []; }
}

// ── AUTO-POST TO PLATFORMS ────────────────────────────────────────────────────
async function autoPostToTikTok(post) {
  // TikTok Content Posting API
  const { content, video_url, creator_id } = post;
  if (!process.env.TIKTOK_ACCESS_TOKEN) return { success: false, error: 'No TikTok token' };
  try {
    const res = await axios.post('https://open.tiktokapis.com/v2/post/publish/video/init/', {
      post_info: { title: content.caption?.slice(0,150), privacy_level: 'PUBLIC_TO_EVERYONE', disable_duet: false },
      source_info: { source: 'PULL_FROM_URL', video_url }
    }, { headers: { Authorization: `Bearer ${process.env.TIKTOK_ACCESS_TOKEN}` } });
    return { success: true, post_id: res.data.data?.publish_id };
  } catch(e) { return { success: false, error: e.message }; }
}

async function autoPostToInstagram(post) {
  const { content, image_url, creator_id } = post;
  if (!process.env.FB_ACCESS_TOKEN || !process.env.IG_BUSINESS_ID) return { success: false, error: 'No IG credentials' };
  try {
    // Step 1: Create container
    const container = await axios.post(
      `https://graph.facebook.com/v18.0/${process.env.IG_BUSINESS_ID}/media`,
      { image_url, caption: content.caption, access_token: process.env.FB_ACCESS_TOKEN }
    );
    // Step 2: Publish
    const publish = await axios.post(
      `https://graph.facebook.com/v18.0/${process.env.IG_BUSINESS_ID}/media_publish`,
      { creation_id: container.data.id, access_token: process.env.FB_ACCESS_TOKEN }
    );
    return { success: true, post_id: publish.data.id };
  } catch(e) { return { success: false, error: e.message }; }
}

module.exports = {
  analyzeViralPotential, generateContentCalendar, processVideoForShorts,
  schedulePost, getScheduledPosts, autoPostToTikTok, autoPostToInstagram,
  generateHashtags, generateHook, scoreHook
};
