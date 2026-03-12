/**
 * CREATOR ENGINE
 * Handles: image generation, GlowX upload, Fanvue profile setup,
 *          automated posting schedule for ALL 75+ creators
 */
const axios   = require('axios');
const fs      = require('fs');
const path    = require('path');
const { Pool } = require('pg');
const pool    = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// ── IMAGE GENERATION ─────────────────────────────────────────────────────────
// Uses Replicate (RealVisXL for realistic humans) with negative prompts
// for adult creators, standard prompts for SFW

const NEGATIVE_PROMPT_SFW = [
  'deformed', 'ugly', 'blurry', 'low quality', 'bad anatomy',
  'extra limbs', 'watermark', 'text', 'logo'
].join(', ');

const NEGATIVE_PROMPT_ADULT = [
  'deformed', 'ugly', 'blurry', 'low quality', 'bad anatomy',
  'extra limbs', 'watermark', 'text', 'logo', 'cartoon', 'anime',
  'childlike', 'underage', 'minor', 'young looking'
].join(', ');

async function generateCreatorImages(creator, count = 6) {
  const isAdult = creator.content_type === 'adult' || creator.adult === true;
  const negPrompt = isAdult ? NEGATIVE_PROMPT_ADULT : NEGATIVE_PROMPT_SFW;

  // Build style-varied prompts for 6 images per creator
  const styleVariants = [
    'professional portrait, studio lighting, neutral background',
    'lifestyle photo, natural light, candid smile',
    'content creator setup, ring light, home studio',
    'outdoor golden hour, warm tones, relaxed pose',
    'fashion editorial, high contrast, confident pose',
    'close-up portrait, shallow depth of field, expressive'
  ];

  const baseDesc = creator.avatar_description || creator.visual_description || 
    `${creator.age || 24} year old ${creator.nationality || ''} woman, ${creator.visual_style || 'attractive, professional'}`;

  const results = [];
  for (let i = 0; i < Math.min(count, styleVariants.length); i++) {
    const prompt = `${baseDesc}, ${styleVariants[i]}, ultra realistic, 8K, photographic`;
    try {
      const url = await generateWithReplicate(prompt, negPrompt, isAdult);
      results.push({ index: i, url, prompt, style: styleVariants[i] });
      console.log(`[creatorEngine] Generated image ${i+1}/${count} for ${creator.name}`);
    } catch(e) {
      console.error(`[creatorEngine] Image ${i+1} failed for ${creator.name}:`, e.message);
      // Fallback to Pollinations (free, no key)
      try {
        const url = await generateWithPollinations(prompt);
        results.push({ index: i, url, prompt, style: styleVariants[i], fallback: true });
      } catch(e2) {
        results.push({ index: i, error: e2.message });
      }
    }
  }
  return results;
}

async function generateWithReplicate(prompt, negativePrompt, adult = false) {
  if (!process.env.REPLICATE_API_TOKEN) throw new Error('No REPLICATE_API_TOKEN');

  // RealVisXL v4 — best for photorealistic humans
  const version = adult
    ? 'a07f252abbbd832009640b27f063ea52d87d7a23ce5e251de21b4941a7ef00a' // uncensored variant
    : 'a07f252abbbd832009640b27f063ea52d87d7a23ce5e251de21b4941a7ef00a'; // RealVisXL

  const res = await axios.post('https://api.replicate.com/v1/predictions', {
    version,
    input: {
      prompt,
      negative_prompt: negativePrompt,
      width: 832, height: 1216, // portrait ratio
      num_inference_steps: 30,
      guidance_scale: 7,
      scheduler: 'DPMSolverMultistep'
    }
  }, { headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}` } });

  const id = res.data.id;
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const poll = await axios.get(`https://api.replicate.com/v1/predictions/${id}`,
      { headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}` } });
    if (poll.data.status === 'succeeded') return poll.data.output[0];
    if (poll.data.status === 'failed') throw new Error(poll.data.error || 'Replicate failed');
  }
  throw new Error('Replicate timeout');
}

async function generateWithPollinations(prompt) {
  const encoded = encodeURIComponent(prompt);
  return `https://image.pollinations.ai/prompt/${encoded}?width=832&height=1216&nologo=true&seed=${Date.now()}`;
}

// ── UPLOAD CREATOR TO GLOWX ───────────────────────────────────────────────────
async function uploadToGlowX(creator, imageUrls) {
  const glowxUrl = process.env.GLOWX_URL || 'https://glowx-backend-production.up.railway.app';
  const adminToken = process.env.GLOWX_ADMIN_TOKEN || process.env.JWT_SECRET;

  // Create creator profile on GlowX
  const profile = {
    username:    creator.id || creator.name.toLowerCase().replace(/\s+/g, '_'),
    display_name: creator.name,
    bio:         creator.bio,
    tagline:     creator.tagline,
    niche:       creator.niche,
    age:         creator.age,
    nationality: creator.nationality,
    personality: creator.personality,
    voice_style: creator.voice_style,
    visual_style: creator.visual_style,
    content_type: creator.content_type || 'sfw',
    platforms:   creator.platforms || ['glowx'],
    pricing: {
      subscription:           creator.pricing?.subscription || 19,
      ppv_min:                creator.pricing?.ppv_min || 5,
      ppv_max:                creator.pricing?.ppv_max || 35,
      custom_video:           creator.pricing?.custom_video || 80,
      phone_per_min:          creator.pricing?.phone_per_min || 1.49,
      whatsapp_monthly:       creator.pricing?.whatsapp_access_monthly || 15
    },
    posting_schedule: creator.posting_schedule || { times: ['09:00','14:00','20:00'], frequency: '3x daily' },
    welcome_message: creator.welcome_message,
    dm_style:        creator.dm_style,
    upsell_script:   creator.upsell_script,
    avatar_images:   imageUrls,
    avatar_prompt:   creator.avatar_description || creator.visual_description,
    is_ai:           true,
    auto_post:       true,
    status:          'active'
  };

  try {
    const res = await axios.post(`${glowxUrl}/api/creators/register`, profile, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
        'x-admin-key': process.env.AGENT_ZERO_KEY || 'AgentZero2025!'
      }
    });
    console.log(`[GlowX] ✅ ${creator.name} uploaded`);
    return { success: true, glowxId: res.data.id, profile };
  } catch(e) {
    console.error(`[GlowX] ❌ ${creator.name}:`, e.response?.data || e.message);
    return { success: false, error: e.message, profile };
  }
}

// ── FANVUE PROFILE SETUP ──────────────────────────────────────────────────────
// Generates ready-to-copy Fanvue setup data for each creator
function buildFanvueProfile(creator, imageUrls) {
  const isAdult = creator.content_type === 'adult';
  return {
    // Fanvue registration fields
    display_name:    creator.name,
    username:        (creator.id || creator.name.toLowerCase().replace(/\s+/g, '')).slice(0, 30),
    bio:             `${creator.bio}\n\n${creator.tagline}`,
    category:        mapNicheToFanvueCategory(creator.niche),
    subscription_price: creator.pricing?.subscription || 19,
    profile_image:   imageUrls[0] || null,
    cover_image:     imageUrls[1] || null,
    welcome_message: creator.welcome_message,

    // Content settings
    content_type:    isAdult ? '18+' : 'General',
    auto_approve_subs: true,
    dm_price:        0, // free DMs included in sub

    // Pricing tiers
    bundles: [
      { months: 1, price: creator.pricing?.subscription || 19, discount: 0 },
      { months: 3, price: Math.round((creator.pricing?.subscription || 19) * 3 * 0.85), discount: 15 },
      { months: 6, price: Math.round((creator.pricing?.subscription || 19) * 6 * 0.75), discount: 25 }
    ],

    // PPV pricing
    ppv_range: `$${creator.pricing?.ppv_min || 5} - $${creator.pricing?.ppv_max || 35}`,

    // First 5 posts to create immediately
    launch_posts: buildLaunchPosts(creator, imageUrls),

    // DM scripts
    dm_scripts: {
      welcome:  creator.welcome_message,
      upsell:   creator.upsell_script,
      inactive: `Hey! I just posted something I think you'll love — come check it out 👀`,
      ppv_tease: `I have something special for you... interested? 😏`
    },

    // Referral link
    fanvue_signup_url: `https://fanvue.com/sign-up?referralCode=${process.env.FANVUE_REF_CODE || 'AIGROWTH'}`
  };
}

function mapNicheToFanvueCategory(niche) {
  const map = {
    'beauty': 'Lifestyle', 'makeup': 'Lifestyle', 'fitness': 'Fitness',
    'bodybuilding': 'Fitness', 'music': 'Entertainment', 'gaming': 'Gaming',
    'cooking': 'Lifestyle', 'travel': 'Travel', 'finance': 'Education',
    'crypto': 'Education', 'fashion': 'Fashion', 'wellness': 'Wellness',
    'adult': 'Adult', 'asmr': 'Relaxation'
  };
  for (const [key, cat] of Object.entries(map)) {
    if (niche?.toLowerCase().includes(key)) return cat;
  }
  return 'Lifestyle';
}

function buildLaunchPosts(creator, imageUrls) {
  const posts = [
    {
      type: 'free',
      caption: `${creator.welcome_message} ${creator.tagline}`,
      image: imageUrls[0],
      post_time: 'immediately'
    },
    {
      type: 'free',
      caption: `A little about me — ${creator.bio}`,
      image: imageUrls[1],
      post_time: '+2 hours'
    },
    {
      type: 'subscriber_only',
      caption: `Exclusive for my subscribers ❤️ ${creator.upsell_script}`,
      image: imageUrls[2],
      post_time: '+6 hours'
    },
    {
      type: 'ppv',
      caption: `Something special 👀 Only for those who really want to know me...`,
      price: creator.pricing?.ppv_min || 10,
      image: imageUrls[3],
      post_time: '+24 hours'
    },
    {
      type: 'subscriber_only',
      caption: `Good morning! Starting the day right. What are you up to today? 💬`,
      image: imageUrls[4] || imageUrls[0],
      post_time: '+48 hours'
    }
  ];
  return posts;
}

// ── BUILD POSTING SCHEDULE ────────────────────────────────────────────────────
function buildPostingSchedule(creators) {
  const schedule = {};
  const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

  creators.forEach((creator, idx) => {
    const times = creator.posting_schedule?.times || ['09:00','14:00','20:00'];
    const creatorSchedule = {};

    days.forEach(day => {
      creatorSchedule[day] = times.map(time => ({
        time,
        platform: creator.platforms?.[0] || 'glowx',
        content_type: pickContentType(day, time),
        prompt_seed: `${creator.niche} ${day} ${time} content for ${creator.name}`,
        auto_generate: true,
        auto_post: true
      }));
    });

    schedule[creator.id || creator.name] = {
      creator_name:   creator.name,
      niche:          creator.niche,
      platforms:      creator.platforms || ['glowx', 'fanvue'],
      weekly_schedule: creatorSchedule,
      total_posts_per_week: times.length * 7,
      content_rotation: buildContentRotation(creator)
    };
  });

  return schedule;
}

function pickContentType(day, time) {
  const hour = parseInt(time.split(':')[0]);
  if (hour < 12) return 'morning_motivation';
  if (hour < 17) return 'lifestyle_content';
  if (hour < 21) return 'engagement_post';
  return 'exclusive_tease';
}

function buildContentRotation(creator) {
  return [
    { day: 'monday',    theme: 'new week energy',      cta: 'Subscribe for more' },
    { day: 'tuesday',   theme: creator.niche + ' tips', cta: 'Like if this helped' },
    { day: 'wednesday', theme: 'behind the scenes',     cta: 'Comment your thoughts' },
    { day: 'thursday',  theme: 'throwback / story',     cta: 'Share this' },
    { day: 'friday',    theme: 'weekend vibes',         cta: 'Tag a friend' },
    { day: 'saturday',  theme: 'exclusive content',     cta: 'Subscribers only' },
    { day: 'sunday',    theme: 'personal + reflective', cta: 'DM me your thoughts' }
  ];
}

// ── BULK PROCESS ALL CREATORS ─────────────────────────────────────────────────
async function processAllCreators(creators, options = {}) {
  const { generateImages = true, uploadGlowX = true, buildFanvue = true, concurrency = 3 } = options;
  const results = [];

  console.log(`[creatorEngine] Processing ${creators.length} creators...`);

  // Process in batches to avoid rate limits
  for (let i = 0; i < creators.length; i += concurrency) {
    const batch = creators.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(batch.map(async creator => {
      const result = { id: creator.id, name: creator.name };

      // 1. Generate images
      let imageUrls = [];
      if (generateImages) {
        console.log(`[creatorEngine] Generating images for ${creator.name}...`);
        const imgs = await generateCreatorImages(creator, 6);
        imageUrls = imgs.filter(i => i.url).map(i => i.url);
        result.images = imageUrls;
        result.image_count = imageUrls.length;
      }

      // 2. Upload to GlowX
      if (uploadGlowX) {
        result.glowx = await uploadToGlowX(creator, imageUrls);
      }

      // 3. Build Fanvue profile data
      if (buildFanvue) {
        result.fanvue = buildFanvueProfile(creator, imageUrls);
      }

      // 4. Save to DB
      await pool.query(`
        INSERT INTO creators (id, name, niche, content_type, profile_data, image_urls, fanvue_profile, status, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,'active',NOW())
        ON CONFLICT (id) DO UPDATE SET
          profile_data=$5, image_urls=$6, fanvue_profile=$7, status='active', updated_at=NOW()
      `, [
        creator.id || creator.name.toLowerCase().replace(/\s+/g,'_'),
        creator.name, creator.niche,
        creator.content_type || 'sfw',
        JSON.stringify(creator),
        JSON.stringify(imageUrls),
        JSON.stringify(result.fanvue || {})
      ]).catch(e => console.log('[DB] creator save:', e.message));

      console.log(`[creatorEngine] ✅ ${creator.name} complete`);
      return result;
    }));

    batchResults.forEach(r => {
      if (r.status === 'fulfilled') results.push(r.value);
      else results.push({ error: r.reason?.message });
    });

    // Small delay between batches
    if (i + concurrency < creators.length) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  return results;
}

// ── LOAD CREATORS FROM FOLDER ─────────────────────────────────────────────────
function loadCreatorsFromFolder(folderPath) {
  const creators = [];
  if (!fs.existsSync(folderPath)) return creators;
  const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.json'));
  files.forEach(f => {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(folderPath, f), 'utf8'));
      creators.push(data);
    } catch(e) { console.log(`[load] Failed ${f}:`, e.message); }
  });
  return creators;
}

module.exports = {
  generateCreatorImages, uploadToGlowX, buildFanvueProfile,
  buildPostingSchedule, processAllCreators, loadCreatorsFromFolder,
  buildLaunchPosts, NEGATIVE_PROMPT_SFW, NEGATIVE_PROMPT_ADULT
};
