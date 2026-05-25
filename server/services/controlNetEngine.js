const axios = require('axios');
const fs = require('fs');

// Pose control: generate image matching a specific pose
async function poseControl({ poseImagePath, prompt, negativePrompt = 'blurry, bad quality' }) {
  const poseB64 = fs.readFileSync(poseImagePath, 'base64');
  
  const res = await axios.post('https://api.replicate.com/v1/predictions', {
    version: "a0758d4ef4d9cdeba9d46e5c7e0b23e97e40b0c3e7e8d4f8e3c1d2b5a9f7e6c4",
    input: {
      image: `data:image/jpeg;base64,${poseB64}`,
      prompt,
      negative_prompt: negativePrompt,
      num_inference_steps: 20,
      controlnet_conditioning_scale: 1.0
    }
  }, { headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`, 'Content-Type': 'application/json' } });

  const id = res.data.id;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const poll = await axios.get(`https://api.replicate.com/v1/predictions/${id}`,
      { headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}` } });
    if (poll.data.status === 'succeeded') {
      const imgRes = await axios.get(poll.data.output[0], { responseType: 'arraybuffer' });
      const outPath = `/tmp/pose_${Date.now()}.png`;
      fs.writeFileSync(outPath, imgRes.data);
      return outPath;
    }
    if (poll.data.status === 'failed') throw new Error('Pose control failed');
  }
}

// Style transfer: apply one image's style to another
async function styleTransfer({ contentImagePath, stylePrompt, strength = 0.8 }) {
  const contentB64 = fs.readFileSync(contentImagePath, 'base64');
  
  const res = await axios.post('https://api.replicate.com/v1/predictions', {
    version: "8beff3369e81422112d93b89ca01426147de542cd4684c244b673b105188fe5f",
    input: {
      image: `data:image/jpeg;base64,${contentB64}`,
      prompt: stylePrompt,
      denoising_strength: strength,
      num_inference_steps: 25
    }
  }, { headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`, 'Content-Type': 'application/json' } });

  const id = res.data.id;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const poll = await axios.get(`https://api.replicate.com/v1/predictions/${id}`,
      { headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}` } });
    if (poll.data.status === 'succeeded') return poll.data.output;
    if (poll.data.status === 'failed') throw new Error('Style transfer failed');
  }
}

module.exports = { poseControl, styleTransfer };
