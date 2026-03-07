const axios = require('axios');

async function generateVideo({ script, avatar_url, audio_url, platform }) {
  if (!process.env.KLING_API_KEY) return `https://placeholder-video.mp4`;
  const res = await axios.post('https://api.klingai.com/v1/videos/text2video', {
    prompt: script.substring(0, 500),
    negative_prompt: 'blurry, bad quality',
    cfg_scale: 0.5,
    mode: 'std',
    duration: platform === 'youtube' ? '10' : '5',
  }, {
    headers: {
      'Authorization': `Bearer ${process.env.KLING_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  return res.data?.data?.task_id || null;
}

async function checkStatus(task_id) {
  const res = await axios.get(`https://api.klingai.com/v1/videos/text2video/${task_id}`, {
    headers: { 'Authorization': `Bearer ${process.env.KLING_API_KEY}` }
  });
  return res.data?.data;
}

module.exports = { generateVideo, checkStatus };
