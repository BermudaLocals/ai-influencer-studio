// GLOWX — platforms.js
// One Push → TikTok + Instagram + Facebook + Snapchat + X + Threads + Reddit
const fetch = require('node-fetch');

// ── Facebook / Instagram Graph API ─────────────────────────────────────────
async function postToFacebook(content, mediaUrl, creatorName) {
  const token   = process.env.FB_ACCESS_TOKEN;
  // Post to ALL 3 Facebook pages simultaneously
  const pageIds = [
    process.env.FB_PAGE_ID,   // 100066670479628
    process.env.FB_PAGE_ID_2, // 61560451151407
    process.env.FB_PAGE_ID_3, // 61578681926426
  ].filter(Boolean);
  if (!pageIds.length || !token) return { platform: 'facebook', status: 'skipped', reason: 'Add FB_PAGE_ID to Railway' };
  const results = [];
  for (const pageId of pageIds) {
    try {
      const caption = `${content}\n\n— ${creatorName} | AI Influencer Studio`;
      let endpoint, body;
      if (mediaUrl && mediaUrl.includes('.mp4')) {
        endpoint = `https://graph.facebook.com/v19.0/${pageId}/videos`;
        body = { file_url: mediaUrl, description: caption, access_token: token };
      } else if (mediaUrl) {
        endpoint = `https://graph.facebook.com/v19.0/${pageId}/photos`;
        body = { url: mediaUrl, caption, access_token: token };
      } else {
        endpoint = `https://graph.facebook.com/v19.0/${pageId}/feed`;
        body = { message: caption, access_token: token };
      }
      const res  = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      results.push({ pageId, status: 'posted', id: data.id });
    } catch (err) {
      results.push({ pageId, status: 'error', error: err.message });
    }
  }
  const posted = results.filter(r => r.status === 'posted').length;
  return { platform: 'facebook', status: posted > 0 ? 'posted' : 'error', pages_posted: posted, pages_total: pageIds.length, results };
}

// ── YOUTUBE (Shorts) ─────────────────────────────────────────────
async function postToYouTube(content, mediaUrl, creatorName) {
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
  const clientId     = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  if (!refreshToken || !clientId || !clientSecret) return { platform: 'youtube', status: 'skipped', reason: 'Add YOUTUBE_REFRESH_TOKEN + CLIENT_ID + CLIENT_SECRET to Railway — see GET_YOUTUBE_KEY.html' };
  if (!mediaUrl || !mediaUrl.includes('.mp4')) return { platform: 'youtube', status: 'skipped', reason: 'YouTube needs mp4 video' };
  try {
    // Get fresh access token using refresh token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' })
    });
    const { access_token } = await tokenRes.json();
    if (!access_token) throw new Error('Could not refresh YouTube token');
    // Initiate resumable upload
    const initRes = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json', 'X-Upload-Content-Type': 'video/mp4' },
      body: JSON.stringify({
        snippet: { title: `${creatorName} 🔥 #Shorts`, description: `${content}\n\n${creatorName} | AI Influencer Studio\n#AIInfluencer #Shorts #PassiveIncome`, tags: ['AIInfluencer','Shorts','PassiveIncome',creatorName], categoryId: '22' },
        status: { privacyStatus: 'public', selfDeclaredMadeForKids: false }
      })
    });
    const uploadUrl = initRes.headers.get('location');
    if (!uploadUrl) throw new Error('No YouTube upload URL returned');
    const videoRes = await fetch(mediaUrl);
    const videoBuffer = await videoRes.buffer();
    const upload = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(videoBuffer.length) }, body: videoBuffer });
    const uploadData = await upload.json();
    if (uploadData.error) throw new Error(uploadData.error.message);
    return { platform: 'youtube', status: 'posted', id: uploadData.id, url: `https://youtube.com/watch?v=${uploadData.id}` };
  } catch (err) { return { platform: 'youtube', status: 'error', error: err.message }; }
}

// ── Instagram via Graph API ─────────────────────────────────────────────────
async function postToInstagram(content, mediaUrl, creatorName) {
  const igId  = process.env.IG_BUSINESS_ID;
  const token = process.env.FB_ACCESS_TOKEN;
  if (!igId || !token) return { platform: 'instagram', status: 'skipped', reason: 'no credentials' };
  try {
    const caption = `${content}\n\n🔥 ${creatorName} | AI Influencer Studio\n#AIInfluencer #CreatorEconomy #PassiveIncome`;
    // Step 1: create container
    const isVideo = mediaUrl && mediaUrl.includes('.mp4');
    const containerBody = isVideo
      ? { media_type: 'REELS', video_url: mediaUrl, caption, access_token: token }
      : { image_url: mediaUrl || 'https://via.placeholder.com/1080', caption, access_token: token };
    const c1  = await fetch(`https://graph.facebook.com/v19.0/${igId}/media`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(containerBody) });
    const container = await c1.json();
    if (container.error) throw new Error(container.error.message);
    // Step 2: publish
    const c2   = await fetch(`https://graph.facebook.com/v19.0/${igId}/media_publish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ creation_id: container.id, access_token: token }) });
    const pub  = await c2.json();
    if (pub.error) throw new Error(pub.error.message);
    return { platform: 'instagram', status: 'posted', id: pub.id };
  } catch (err) {
    return { platform: 'instagram', status: 'error', error: err.message };
  }
}

// ── Snapchat Marketing API ──────────────────────────────────────────────────
async function postToSnapchat(content, mediaUrl, creatorName) {
  const clientId     = process.env.SNAPCHAT_CLIENT_ID;
  const clientSecret = process.env.SNAPCHAT_CLIENT_SECRET;
  const adAccountId  = process.env.SNAPCHAT_AD_ACCOUNT_ID;
  const accessToken  = process.env.SNAPCHAT_ACCESS_TOKEN;
  if (!accessToken || !adAccountId) return { platform: 'snapchat', status: 'skipped', reason: 'no credentials — add SNAPCHAT_ACCESS_TOKEN + SNAPCHAT_AD_ACCOUNT_ID to Railway' };
  try {
    // Snapchat Creative API — create snap ad
    const snapBody = {
      creative: {
        ad_account_id: adAccountId,
        name: `${creatorName} — ${new Date().toISOString().split('T')[0]}`,
        type: mediaUrl && mediaUrl.includes('.mp4') ? 'VIDEO' : 'SNAP_AD',
        headline: creatorName,
        brand_name: 'AI Influencer Studio',
        call_to_action: 'LEARN_MORE',
        top_snap_media_id: mediaUrl || '',
      }
    };
    const res  = await fetch(`https://adsapi.snapchat.com/v1/adaccounts/${adAccountId}/creatives`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
      body: JSON.stringify(snapBody)
    });
    const data = await res.json();
    if (data.request_status === 'ERROR') throw new Error(data.debug_message);
    return { platform: 'snapchat', status: 'posted', id: data.creatives?.[0]?.creative?.id };
  } catch (err) {
    return { platform: 'snapchat', status: 'error', error: err.message };
  }
}

// ── TikTok ──────────────────────────────────────────────────────────────────
async function postToTikTok(content, mediaUrl, creatorName) {
  const token = process.env.TIKTOK_ACCESS_TOKEN;
  if (!token) return { platform: 'tiktok', status: 'skipped', reason: 'no credentials' };
  try {
    const res  = await fetch('https://open.tiktokapis.com/v2/post/publish/content/init/', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({
        post_info: { title: content.substring(0, 150), privacy_level: 'PUBLIC_TO_EVERYONE', disable_duet: false, disable_comment: false, disable_stitch: false },
        source_info: { source: 'PULL_FROM_URL', video_url: mediaUrl, cover_url: '' }
      })
    });
    const data = await res.json();
    if (data.error?.code !== 'ok') throw new Error(data.error?.message);
    return { platform: 'tiktok', status: 'posted', id: data.data?.publish_id };
  } catch (err) {
    return { platform: 'tiktok', status: 'error', error: err.message };
  }
}

// ── X / Twitter ─────────────────────────────────────────────────────────────
async function postToX(content, mediaUrl, creatorName) {
  const token = process.env.X_BEARER_TOKEN || process.env.TWITTER_BEARER_TOKEN;
  if (!token) return { platform: 'x', status: 'skipped', reason: 'no credentials' };
  try {
    const tweet = `${content.substring(0, 240)}\n\n${creatorName} | AI Influencer Studio\n#AIInfluencer #PassiveIncome`;
    const res   = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: tweet })
    });
    const data = await res.json();
    if (data.errors) throw new Error(data.errors[0].message);
    return { platform: 'x', status: 'posted', id: data.data?.id };
  } catch (err) {
    return { platform: 'x', status: 'error', error: err.message };
  }
}

// ── Threads ──────────────────────────────────────────────────────────────────
async function postToThreads(content, mediaUrl, creatorName) {
  const userId = process.env.THREADS_USER_ID;
  const token  = process.env.THREADS_ACCESS_TOKEN || process.env.FB_ACCESS_TOKEN;
  if (!userId || !token) return { platform: 'threads', status: 'skipped', reason: 'no credentials' };
  try {
    const text = `${content}\n\n${creatorName} | AI Influencer Studio`;
    const c1   = await fetch(`https://graph.threads.net/v1.0/${userId}/threads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ media_type: 'TEXT', text, access_token: token })
    });
    const container = await c1.json();
    const c2 = await fetch(`https://graph.threads.net/v1.0/${userId}/threads_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: container.id, access_token: token })
    });
    const pub = await c2.json();
    return { platform: 'threads', status: 'posted', id: pub.id };
  } catch (err) {
    return { platform: 'threads', status: 'error', error: err.message };
  }
}

// ── Reddit ───────────────────────────────────────────────────────────────────
async function postToReddit(content, mediaUrl, creatorName, subreddit = 'AItools') {
  const token = process.env.REDDIT_ACCESS_TOKEN;
  if (!token) return { platform: 'reddit', status: 'skipped', reason: 'no credentials' };
  try {
    const res  = await fetch('https://oauth.reddit.com/api/submit', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'AIInfluencerStudio/1.0' },
      body: new URLSearchParams({ sr: subreddit, kind: 'self', title: `${creatorName} — AI Creator Update`, text: content, nsfw: false, spoiler: false })
    });
    const data = await res.json();
    return { platform: 'reddit', status: 'posted', id: data?.json?.data?.id };
  } catch (err) {
    return { platform: 'reddit', status: 'error', error: err.message };
  }
}

// ── ONE PUSH — All Platforms Simultaneously ──────────────────────────────────
async function onePush(content, mediaUrl, creatorName, platforms = ['facebook', 'instagram', 'snapchat', 'tiktok', 'x', 'threads']) {
  console.log(`[ONE PUSH] ${creatorName} → ${platforms.join(', ')}`);
  const jobs = [];
  if (platforms.includes('facebook'))  jobs.push(postToFacebook(content, mediaUrl, creatorName));
  if (platforms.includes('youtube'))   jobs.push(postToYouTube(content, mediaUrl, creatorName));
  if (platforms.includes('instagram')) jobs.push(postToInstagram(content, mediaUrl, creatorName));
  if (platforms.includes('snapchat'))  jobs.push(postToSnapchat(content, mediaUrl, creatorName));
  if (platforms.includes('tiktok'))    jobs.push(postToTikTok(content, mediaUrl, creatorName));
  if (platforms.includes('x'))         jobs.push(postToX(content, mediaUrl, creatorName));
  if (platforms.includes('threads'))   jobs.push(postToThreads(content, mediaUrl, creatorName));
  if (platforms.includes('reddit'))    jobs.push(postToReddit(content, mediaUrl, creatorName));
  const results = await Promise.allSettled(jobs);
  const output  = results.map(r => r.status === 'fulfilled' ? r.value : { status: 'error', error: r.reason?.message });
  const posted  = output.filter(r => r.status === 'posted').length;
  const failed  = output.filter(r => r.status === 'error').length;
  console.log(`[ONE PUSH] Done — ${posted} posted, ${failed} failed`);
  return { results: output, posted, failed, total: jobs.length };
}

module.exports = { onePush, postToFacebook, postToInstagram, postToYouTube, postToSnapchat, postToTikTok, postToX, postToThreads, postToReddit };
