const axios = require('axios');
const fs = require('fs');

async function upscaleImage(imagePath, scale = 4) {
  const b64 = fs.readFileSync(imagePath, 'base64');
  const ext = imagePath.split('.').pop();
  const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

  // Replicate Real-ESRGAN upscaler
  const res = await axios.post('https://api.replicate.com/v1/predictions', {
    version: "42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b",
    input: {
      image: `data:${mimeType};base64,${b64}`,
      scale,
      face_enhance: true
    }
  }, { headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`, 'Content-Type': 'application/json' } });

  const id = res.data.id;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const poll = await axios.get(`https://api.replicate.com/v1/predictions/${id}`,
      { headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}` } });
    if (poll.data.status === 'succeeded') {
      const imgRes = await axios.get(poll.data.output, { responseType: 'arraybuffer' });
      const outPath = `/tmp/upscaled_${Date.now()}.png`;
      fs.writeFileSync(outPath, imgRes.data);
      return outPath;
    }
    if (poll.data.status === 'failed') throw new Error('Upscale failed: ' + poll.data.error);
  }
  throw new Error('Upscale timeout');
}

async function enhanceFace(imagePath) {
  const b64 = fs.readFileSync(imagePath, 'base64');
  // GFPGAN face restoration
  const res = await axios.post('https://api.replicate.com/v1/predictions', {
    version: "0fbacf7afc6aa69352f051b14d3675c22ffcb4d3626f5d303c91d3d1d5b39c46",
    input: { img: `data:image/jpeg;base64,${b64}`, version: 'v1.4', scale: 2 }
  }, { headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`, 'Content-Type': 'application/json' } });

  const id = res.data.id;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const poll = await axios.get(`https://api.replicate.com/v1/predictions/${id}`,
      { headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}` } });
    if (poll.data.status === 'succeeded') {
      const imgRes = await axios.get(poll.data.output, { responseType: 'arraybuffer' });
      const outPath = `/tmp/enhanced_${Date.now()}.png`;
      fs.writeFileSync(outPath, imgRes.data);
      return outPath;
    }
  }
  throw new Error('Face enhance timeout');
}

module.exports = { upscaleImage, enhanceFace };
