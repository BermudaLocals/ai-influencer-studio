/**
 * CREATOR ROUTES
 * POST /api/creators/process-all  â€” bulk process all creators (images + GlowX + Fanvue)
 * GET  /api/creators              â€” list all creators
 * GET  /api/creators/:id          â€” get single creator with full profile
 * POST /api/creators/generate-images/:id  â€” regenerate images for one creator
 * GET  /api/creators/schedule     â€” full posting schedule for all creators
 * GET  /api/creators/fanvue-export â€” export all Fanvue setup data as JSON
 * POST /api/creators/load-folder  â€” load creators from C:\ADULT_CREATORS_70_COMPLETE
 */
const router  = require('express').Router();
const jwt     = require('jsonwebtoken');
const { Pool } = require('pg');
const pool    = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const {
  generateCreatorImages, uploadToGlowX, buildFanvueProfile,
  buildPostingSchedule, processAllCreators, loadCreatorsFromFolder
} = require('../services/creatorEngine');
const fs   = require('fs');
const path = require('path');

function auth(req, res, next) {
  try { req.user = jwt.verify((req.headers.authorization||'').replace('Bearer ',''), process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Unauthorized' }); }
}
function adminAuth(req, res, next) {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (key === process.env.AGENT_ZERO_KEY || key === 'AgentZero2025!') { next(); return; }
  try { const u = jwt.verify((req.headers.authorization||'').replace('Bearer ',''), process.env.JWT_SECRET); if(u.role==='admin'){next();}else{res.status(403).json({error:'Admin only'});} }
  catch { res.status(401).json({ error: 'Unauthorized' }); }
}

// â”€â”€ GET ALL CREATORS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/', async (req, res) => {
  try {
    const { content_type, niche, status = 'active' } = req.query;
    let q = 'SELECT id, name, niche, content_type, status, image_urls, created_at FROM creators WHERE 1=1';
    const params = [];
    if (status)       { params.push(status);       q += ` AND status=$${params.length}`; }
    if (content_type) { params.push(content_type); q += ` AND content_type=$${params.length}`; }
    if (niche)        { params.push(`%${niche}%`); q += ` AND niche ILIKE $${params.length}`; }
    q += ' ORDER BY name ASC';
    const result = await pool.query(q, params);
    res.json({ count: result.rows.length, creators: result.rows });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// â”€â”€ GET SINGLE CREATOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM creators WHERE id=$1', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Creator not found' });
        const c = r.rows[0];
    function safeParse(val, fallback) {
      if (val === null || val === undefined) return fallback;
      if (typeof val === "object") return val;
      try { return JSON.parse(val); } catch { return fallback; }
    }
    res.json({
      ...c,
      profile_data:     safeParse(c.profile_data, {}),
      image_urls:       safeParse(c.image_urls, []),
      fanvue_profile:   safeParse(c.fanvue_profile, {}),
      posting_schedule: safeParse(c.posting_schedule, null)
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// â”€â”€ LOAD CREATORS FROM LOCAL FOLDER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// POST /api/creators/load-folder
// body: { folder: "C:\\ADULT_CREATORS_70_COMPLETE", content_type: "adult" }
router.post('/load-folder', adminAuth, async (req, res) => {
  const { folder, content_type = 'sfw' } = req.body;
  if (!folder) return res.status(400).json({ error: 'folder required' });

  // This endpoint is called from local machine â€” expects creators JSON array
  // When called from Railway, creators are passed in body directly
  const { creators } = req.body;
  if (creators && Array.isArray(creators)) {
    let saved = 0;
    for (const c of creators) {
      try {
        await pool.query(`
          INSERT INTO creators (id, name, niche, content_type, profile_data, image_urls, fanvue_profile, status, created_at)
          VALUES ($1,$2,$3,$4,$5,'[]','{}','active',NOW())
          ON CONFLICT (id) DO UPDATE SET
            profile_data=$5, content_type=$4, status='active', updated_at=NOW()
        `, [
          c.id || c.name?.toLowerCase().replace(/\s+/g,'_'),
          c.name, c.niche || c.category,
          c.content_type || content_type,
          JSON.stringify(c)
        ]);
        saved++;
      } catch(e) { console.log('[load]', c.name, e.message); }
    }
    return res.json({ loaded: saved, total: creators.length });
  }
  res.json({ message: 'Pass creators array in body', example: '{ creators: [...], content_type: "adult" }' });
});

// â”€â”€ PROCESS ALL CREATORS (images + GlowX + Fanvue) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// POST /api/creators/process-all
// body: { content_type: "all"|"sfw"|"adult", generate_images: true, upload_glowx: true, concurrency: 2 }
router.post('/process-all', adminAuth, async (req, res) => {
  const { content_type = 'all', generate_images = true, upload_glowx = true, concurrency = 2 } = req.body;

  // Stream progress via SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    let q = 'SELECT * FROM creators WHERE status=$1';
    const params = ['active'];
    if (content_type !== 'all') { q += ' AND content_type=$2'; params.push(content_type); }
    const dbCreators = await pool.query(q, params);
    const creators = dbCreators.rows.map(r => ({
      ...JSON.parse(r.profile_data || '{}'),
      id: r.id, name: r.name, niche: r.niche, content_type: r.content_type
    }));

    send({ status: 'started', total: creators.length });

    let completed = 0;
    for (let i = 0; i < creators.length; i += concurrency) {
      const batch = creators.slice(i, i + concurrency);
      await Promise.allSettled(batch.map(async creator => {
        try {
          send({ status: 'processing', creator: creator.name, step: 'images' });

          // Generate images
          let imageUrls = [];
          if (generate_images) {
            const imgs = await generateCreatorImages(creator, 6);
            imageUrls = imgs.filter(x => x.url).map(x => x.url);
            await pool.query('UPDATE creators SET image_urls=$1 WHERE id=$2', [JSON.stringify(imageUrls), creator.id]);
          } else {
            // Use existing images
            const r = await pool.query('SELECT image_urls FROM creators WHERE id=$1', [creator.id]);
            imageUrls = JSON.parse(r.rows[0]?.image_urls || '[]');
          }

          send({ status: 'processing', creator: creator.name, step: 'fanvue' });

          // Build Fanvue profile
          const fanvueProfile = buildFanvueProfile(creator, imageUrls);
          await pool.query('UPDATE creators SET fanvue_profile=$1 WHERE id=$2', [JSON.stringify(fanvueProfile), creator.id]);

          // Upload to GlowX
          if (upload_glowx) {
            send({ status: 'processing', creator: creator.name, step: 'glowx' });
            const glowxResult = await uploadToGlowX(creator, imageUrls);
            await pool.query('UPDATE creators SET glowx_id=$1, glowx_status=$2 WHERE id=$3',
              [glowxResult.glowxId, glowxResult.success ? 'live' : 'failed', creator.id]);
          }

          completed++;
          send({ status: 'creator_done', creator: creator.name, completed, total: creators.length, images: imageUrls.length });
        } catch(e) {
          send({ status: 'creator_error', creator: creator.name, error: e.message });
        }
      }));
    }

    // Build posting schedule for all
    const allCreators = (await pool.query('SELECT * FROM creators')).rows.map(r => ({
      ...JSON.parse(r.profile_data || '{}'), id: r.id, name: r.name, niche: r.niche
    }));
    const schedule = buildPostingSchedule(allCreators);
    // Save schedule to DB
    for (const [creatorId, sched] of Object.entries(schedule)) {
      await pool.query('UPDATE creators SET posting_schedule=$1 WHERE id=$2',
        [JSON.stringify(sched), creatorId]).catch(() => {});
    }

    send({ status: 'complete', completed, total: creators.length, schedule_built: true });
    res.end();
  } catch(e) {
    send({ status: 'error', error: e.message });
    res.end();
  }
});

// â”€â”€ GENERATE IMAGES FOR ONE CREATOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/generate-images/:id', adminAuth, async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM creators WHERE id=$1', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Creator not found' });
    const creator = { ...JSON.parse(r.rows[0].profile_data || '{}'), id: r.rows[0].id, content_type: r.rows[0].content_type };
    const count = req.body.count || 6;
    const imgs = await generateCreatorImages(creator, count);
    const urls = imgs.filter(x => x.url).map(x => x.url);
    await pool.query('UPDATE creators SET image_urls=$1 WHERE id=$2', [JSON.stringify(urls), req.params.id]);
    res.json({ success: true, images: urls, count: urls.length });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// â”€â”€ GET POSTING SCHEDULE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/schedule/all', async (req, res) => {
  try {
    const r = await pool.query('SELECT id, name, niche, posting_schedule FROM creators WHERE status=\'active\'');
    const schedule = {};
    r.rows.forEach(row => {
      schedule[row.id] = {
        name: row.name, niche: row.niche,
        schedule: JSON.parse(row.posting_schedule || '{}')
      };
    });
    res.json({ total_creators: r.rows.length, schedule });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// â”€â”€ EXPORT ALL FANVUE PROFILES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/fanvue-export/all', adminAuth, async (req, res) => {
  try {
    const r = await pool.query('SELECT id, name, niche, content_type, image_urls, fanvue_profile FROM creators WHERE status=\'active\' ORDER BY name');
    const profiles = r.rows.map(row => ({
      id: row.id, name: row.name, niche: row.niche, content_type: row.content_type,
      images: JSON.parse(row.image_urls || '[]'),
      fanvue: JSON.parse(row.fanvue_profile || '{}')
    }));
    res.json({ count: profiles.length, profiles });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// â”€â”€ GET REVENUE SUMMARY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/revenue/summary', adminAuth, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT
        COUNT(*) as total_creators,
        COUNT(*) FILTER (WHERE content_type='adult') as adult_creators,
        COUNT(*) FILTER (WHERE content_type='sfw') as sfw_creators,
        COUNT(*) FILTER (WHERE glowx_status='live') as live_on_glowx,
        SUM((profile_data->>'subscription')::numeric) as total_sub_value
      FROM creators WHERE status='active'
    `);
    const stats = r.rows[0];
    res.json({
      ...stats,
      projected_monthly_100fans: stats.total_sub_value * 100,
      projected_monthly_1000fans: stats.total_sub_value * 1000,
      platform_cut_55pct: stats.total_sub_value * 1000 * 0.55
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;


