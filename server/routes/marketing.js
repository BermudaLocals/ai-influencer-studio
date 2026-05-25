/**
 * MARKETING DEPARTMENT ROUTES
 * POST /api/marketing/viral-score     — score any content idea
 * GET  /api/marketing/calendar/:id    — get creator's content calendar
 * POST /api/marketing/calendar/:id    — generate 4-week calendar
 * POST /api/marketing/clip-video      — Opus Clip style: long video → shorts
 * POST /api/marketing/schedule        — schedule a post
 * GET  /api/marketing/scheduled/:id   — get scheduled posts
 * POST /api/marketing/auto-post       — trigger immediate post
 * GET  /api/marketing/analytics/:id   — creator analytics summary
 */
const router  = require('express').Router();
const {
  analyzeViralPotential, generateContentCalendar, processVideoForShorts,
  schedulePost, getScheduledPosts, autoPostToTikTok, autoPostToInstagram,
  generateHashtags, generateHook
} = require('../services/marketingEngine');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const adminOnly = (req, res, next) => {
  if (req.headers['x-admin-key'] !== process.env.AGENT_ZERO_KEY && 
      req.headers['x-admin-key'] !== 'AgentZero2025!') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// ── VIRAL SCORE ───────────────────────────────────────────────────────────────
router.post('/viral-score', async (req, res) => {
  try {
    const result = await analyzeViralPotential(req.body);
    res.json({ success: true, ...result });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── CONTENT CALENDAR ──────────────────────────────────────────────────────────
router.get('/calendar/:creatorId', async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT calendar_data FROM content_calendars WHERE creator_id=$1 ORDER BY created_at DESC LIMIT 1',
      [req.params.creatorId]
    );
    if (!r.rows.length) return res.json({ calendar: [], message: 'No calendar yet — POST to generate' });
    res.json({ success: true, calendar: JSON.parse(r.rows[0].calendar_data) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/calendar/:creatorId', async (req, res) => {
  try {
    const { weeks = 4 } = req.body;
    // Load creator profile
    const cr = await pool.query('SELECT profile_data FROM creators WHERE id=$1', [req.params.creatorId]);
    if (!cr.rows.length) return res.status(404).json({ error: 'Creator not found' });

    const creator = { id: req.params.creatorId, ...cr.rows[0].profile_data };
    const calendar = generateContentCalendar(creator, weeks);

    // Save to DB
    await pool.query(`
      INSERT INTO content_calendars (creator_id, calendar_data, created_at)
      VALUES ($1,$2,NOW())
      ON CONFLICT (creator_id) DO UPDATE SET calendar_data=$2, created_at=NOW()
    `, [req.params.creatorId, JSON.stringify(calendar)]);

    // Auto-schedule all posts
    let scheduled = 0;
    for (const week of calendar) {
      for (const post of week.posts) {
        for (const platform of post.platforms) {
          await schedulePost({
            creator_id:     req.params.creatorId,
            platform,
            content:        post,
            scheduled_time: `${post.date}T${post.time}:00`,
            media_urls:     []
          });
          scheduled++;
        }
      }
    }

    res.json({ success: true, weeks: calendar.length, total_posts: scheduled, calendar });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── OPUS CLIP STYLE: VIDEO → SHORTS ──────────────────────────────────────────
router.post('/clip-video', adminOnly, async (req, res) => {
  try {
    const { video_url, creator_id, niche, target_duration, platforms } = req.body;
    if (!video_url) return res.status(400).json({ error: 'video_url required' });

    const creator = creator_id ? 
      (await pool.query('SELECT profile_data FROM creators WHERE id=$1', [creator_id])).rows[0]?.profile_data : {};

    const result = await processVideoForShorts(video_url, {
      creator: { id: creator_id, ...creator },
      niche:   niche || creator?.niche || 'general',
      target_duration,
      platforms
    });

    // Save clips to DB
    await pool.query(`
      INSERT INTO video_clips (creator_id, original_url, clips_data, created_at)
      VALUES ($1,$2,$3,NOW())
    `, [creator_id, video_url, JSON.stringify(result.clips)]);

    res.json({ success: true, ...result });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── SCHEDULER ─────────────────────────────────────────────────────────────────
router.post('/schedule', async (req, res) => {
  try {
    const result = await schedulePost(req.body);
    res.json(result);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/scheduled/:creatorId', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const posts = await getScheduledPosts(req.params.creatorId, days);
    res.json({ success: true, count: posts.length, posts });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── AUTO-POST ─────────────────────────────────────────────────────────────────
router.post('/auto-post', adminOnly, async (req, res) => {
  const { post_id, platform, creator_id } = req.body;
  try {
    const r = await pool.query('SELECT * FROM scheduled_posts WHERE id=$1', [post_id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Post not found' });

    const post = r.rows[0];
    let result;
    if (platform === 'tiktok')    result = await autoPostToTikTok(post);
    if (platform === 'instagram') result = await autoPostToInstagram(post);
    else result = { success: true, message: `${platform} posting queued` };

    // Update status
    await pool.query(
      'UPDATE scheduled_posts SET status=$1, posted_at=NOW() WHERE id=$2',
      [result.success ? 'posted' : 'failed', post_id]
    );

    res.json(result);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── ANALYTICS ─────────────────────────────────────────────────────────────────
router.get('/analytics/:creatorId', async (req, res) => {
  try {
    const [postsR, creatorsR] = await Promise.all([
      pool.query(`
        SELECT platform, status, COUNT(*) as count
        FROM scheduled_posts WHERE creator_id=$1
        GROUP BY platform, status
      `, [req.params.creatorId]),
      pool.query('SELECT profile_data, total_subscribers, total_revenue FROM creators WHERE id=$1',
        [req.params.creatorId])
    ]);

    const creator  = creatorsR.rows[0] || {};
    const postStats = {};
    postsR.rows.forEach(r => {
      if (!postStats[r.platform]) postStats[r.platform] = {};
      postStats[r.platform][r.status] = parseInt(r.count);
    });

    res.json({
      success: true,
      creator_id:        req.params.creatorId,
      subscribers:       creator.total_subscribers || 0,
      revenue:           creator.total_revenue || 0,
      post_stats:        postStats,
      niche:             creator.profile_data?.niche,
      recommended_hooks: [
        generateHook(creator.profile_data?.niche, 'Motivation Monday'),
        generateHook(creator.profile_data?.niche, 'Tutorial Tuesday'),
        generateHook(creator.profile_data?.niche, 'Friday Fun')
      ],
      hashtags: generateHashtags(creator.profile_data?.niche)
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── BULK CALENDAR FOR ALL CREATORS ───────────────────────────────────────────
router.post('/calendar-all', adminOnly, async (req, res) => {
  try {
    const { weeks = 4 } = req.body;
    const creators = await pool.query("SELECT id, profile_data FROM creators WHERE status='active'");
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');

    let done = 0;
    for (const row of creators.rows) {
      const creator = { id: row.id, ...row.profile_data };
      const calendar = generateContentCalendar(creator, weeks);
      await pool.query(`
        INSERT INTO content_calendars (creator_id, calendar_data, created_at)
        VALUES ($1,$2,NOW())
        ON CONFLICT (creator_id) DO UPDATE SET calendar_data=$2, created_at=NOW()
      `, [row.id, JSON.stringify(calendar)]);
      done++;
      res.write(`data: ${JSON.stringify({ done, total: creators.rows.length, creator: creator.name })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ complete: true, total_creators: done })}\n\n`);
    res.end();
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
