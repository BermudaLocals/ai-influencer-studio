const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

async function removeBackground(imagePath) {
  // Primary: remove.bg API
  if (process.env.REMOVE_BG_API_KEY) {
    try {
      const formData = new FormData();
      formData.append('image_file', fs.createReadStream(imagePath));
      formData.append('size', 'auto');
      const res = await axios.post('https://api.remove.bg/v1.0/removebg', formData, {
        headers: { ...formData.getHeaders(), 'X-Api-Key': process.env.REMOVE_BG_API_KEY },
        responseType: 'arraybuffer'
      });
      const outPath = `/tmp/nobg_${Date.now()}.png`;
      fs.writeFileSync(outPath, res.data);
      return outPath;
    } catch (e) { console.log('[bgRemoval] remove.bg failed:', e.message); }
  }

  // Fallback: Replicate BRIA RMBG model (free tier)
  const b64 = fs.readFileSync(imagePath, 'base64');
  const res = await axios.post('https://api.replicate.com/v1/predictions', {
    version: "a3d49f7e-7cc8-4786-b8a2-b1e6f7e9c6d3",
    input: { image: `data:image/jpeg;base64,${b64}` }
  }, { headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`, 'Content-Type': 'application/json' } });

  const id = res.data.id;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const poll = await axios.get(`https://api.replicate.com/v1/predictions/${id}`,
      { headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}` } });
    if (poll.data.status === 'succeeded') {
      // Download result
      const imgRes = await axios.get(poll.data.output, { responseType: 'arraybuffer' });
      const outPath = `/tmp/nobg_${Date.now()}.png`;
      fs.writeFileSync(outPath, imgRes.data);
      return outPath;
    }
    if (poll.data.status === 'failed') throw new Error('BG removal failed');
  }
  throw new Error('BG removal timeout');
}

async function replaceBackground(imagePath, backgroundPrompt) {
  // Remove BG then composite with AI-generated background
  const noBgPath = await removeBackground(imagePath);
  return { noBgPath, backgroundPrompt, message: 'Background removed — composite with your chosen background' };
}

module.exports = { removeBackground, replaceBackground };
