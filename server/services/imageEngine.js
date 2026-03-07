const axios = require('axios');
const fs = require('fs');

async function stabilityAI(prompt, width = 1024, height = 1024) {
  const res = await axios.post(
    'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
    { text_prompts: [{ text: prompt, weight: 1 }], cfg_scale: 7, height, width, samples: 1, steps: 30 },
    { headers: { 'Authorization': `Bearer ${process.env.STABILITY_API_KEY}`, 'Content-Type': 'application/json' } }
  );
  return Buffer.from(res.data.artifacts[0].base64, 'base64');
}

async function pollinations(prompt, width = 1024, height = 1024) {
  const encoded = encodeURIComponent(prompt);
  const res = await axios.get(
    `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&nologo=true`,
    { responseType: 'arraybuffer', timeout: 30000 }
  );
  return Buffer.from(res.data);
}

async function generateImage(prompt, options = {}) {
  const { width = 1024, height = 1024, type = 'thumbnail' } = options;
  const outputPath = `/tmp/img_${Date.now()}.png`;
  let buffer;
  // Try Stability AI first
  if (process.env.STABILITY_API_KEY) {
    try {
      buffer = await stabilityAI(prompt, width, height);
      console.log('[imageEngine] Stability AI');
    } catch (e) { console.log('[imageEngine] Stability failed:', e.message); }
  }
  // Fallback: Pollinations.ai (free, no key needed)
  if (!buffer) {
    try {
      buffer = await pollinations(prompt, width, height);
      console.log('[imageEngine] Pollinations.ai (free fallback)');
    } catch (e) { throw new Error('All image engines failed: ' + e.message); }
  }
  fs.writeFileSync(outputPath, buffer);
  return outputPath;
}

async function generateThumbnail({ topic, niche }) {
  const prompt = `Professional YouTube thumbnail, ${niche} content creator, topic: ${topic}, bold text overlay, vibrant colors, high contrast, cinematic 16:9`;
  return generateImage(prompt, { width: 1280, height: 720, type: 'thumbnail' });
}

async function generateAvatar({ name, style, niche }) {
  const prompt = `Professional AI influencer portrait, ${style}, ${niche} content creator named ${name}, ultra realistic, 8K, studio lighting, attractive, confident`;
  return generateImage(prompt, { width: 1024, height: 1024, type: 'avatar' });
}

module.exports = { generateImage, generateThumbnail, generateAvatar, stabilityAI, pollinations };
