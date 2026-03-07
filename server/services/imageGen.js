const axios = require('axios');

async function generateThumbnail({ topic, niche }) {
  if (!process.env.STABILITY_API_KEY) return null;
  const prompt = `Professional YouTube thumbnail, ${niche} content, topic: ${topic}, bold text overlay, vibrant colors, high contrast, 16:9 ratio`;
  const res = await axios.post('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
    text_prompts: [{ text: prompt, weight: 1 }],
    cfg_scale: 7,
    height: 576,
    width: 1024,
    samples: 1,
    steps: 30,
  }, {
    headers: { 'Authorization': `Bearer ${process.env.STABILITY_API_KEY}`, 'Content-Type': 'application/json' },
    responseType: 'json'
  });
  const b64 = res.data.artifacts[0].base64;
  const path = `/tmp/thumb_${Date.now()}.png`;
  require('fs').writeFileSync(path, Buffer.from(b64, 'base64'));
  return path;
}

module.exports = { generateThumbnail };
