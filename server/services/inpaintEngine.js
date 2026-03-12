const axios = require('axios');
const fs = require('fs');

// Inpainting: edit specific regions of an image using a mask
async function inpaintImage({ imagePath, maskPath, prompt, negativePrompt = '' }) {
  const imageB64 = fs.readFileSync(imagePath, 'base64');
  const maskB64 = fs.readFileSync(maskPath, 'base64');

  const res = await axios.post('https://api.replicate.com/v1/predictions', {
    version: "95b7223104132402a9ae91cc677285bc5eb997834bd2349fa486f53910fd68b3",
    input: {
      image: `data:image/jpeg;base64,${imageB64}`,
      mask: `data:image/png;base64,${maskB64}`,
      prompt,
      negative_prompt: negativePrompt,
      num_inference_steps: 25,
      guidance_scale: 7.5
    }
  }, { headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`, 'Content-Type': 'application/json' } });

  const id = res.data.id;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const poll = await axios.get(`https://api.replicate.com/v1/predictions/${id}`,
      { headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}` } });
    if (poll.data.status === 'succeeded') {
      const imgRes = await axios.get(poll.data.output[0], { responseType: 'arraybuffer' });
      const outPath = `/tmp/inpaint_${Date.now()}.png`;
      fs.writeFileSync(outPath, imgRes.data);
      return outPath;
    }
    if (poll.data.status === 'failed') throw new Error('Inpaint failed: ' + poll.data.error);
  }
  throw new Error('Inpaint timeout');
}

// Outpainting: extend image beyond its borders
async function outpaintImage({ imagePath, prompt, direction = 'all', pixels = 256 }) {
  const imageB64 = fs.readFileSync(imagePath, 'base64');
  const res = await axios.post('https://api.replicate.com/v1/predictions', {
    version: "34b3f5be55e642d4a0f7b21b9bcca5b50db3c50c85a4e7c79d5ccca68e4bc56d",
    input: {
      image: `data:image/jpeg;base64,${imageB64}`,
      prompt,
      pixels,
      mask_type: direction
    }
  }, { headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`, 'Content-Type': 'application/json' } });

  const id = res.data.id;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const poll = await axios.get(`https://api.replicate.com/v1/predictions/${id}`,
      { headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}` } });
    if (poll.data.status === 'succeeded') return poll.data.output;
    if (poll.data.status === 'failed') throw new Error('Outpaint failed');
  }
}

module.exports = { inpaintImage, outpaintImage };
