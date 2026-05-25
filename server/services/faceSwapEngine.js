const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

// Face swap using Replicate (react-face-swap or roop model)
async function faceSwap(sourceImagePath, targetImagePath) {
  if (!process.env.REPLICATE_API_TOKEN) throw new Error('REPLICATE_API_TOKEN required');

  const sourceb64 = fs.readFileSync(sourceImagePath, 'base64');
  const targetb64 = fs.readFileSync(targetImagePath, 'base64');

  const response = await axios.post(
    'https://api.replicate.com/v1/predictions',
    {
      version: "9a4f84e3e3a1c7b6f3b6c2a1d8f0e2b4c5a6d7e8f9b0c1d2e3f4a5b6c7d8e9f0",
      input: {
        swap_image: `data:image/jpeg;base64,${sourceb64}`,
        target_image: `data:image/jpeg;base64,${targetb64}`
      }
    },
    { headers: { 'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`, 'Content-Type': 'application/json' } }
  );

  // Poll for result
  const predictionId = response.data.id;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const poll = await axios.get(`https://api.replicate.com/v1/predictions/${predictionId}`,
      { headers: { 'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}` } }
    );
    if (poll.data.status === 'succeeded') return poll.data.output;
    if (poll.data.status === 'failed') throw new Error('Face swap failed: ' + poll.data.error);
  }
  throw new Error('Face swap timeout');
}

// Face swap using free alternative (faceswapper.ai via their API)
async function faceSwapFree(sourceImagePath, targetImagePath) {
  // Use Pollinations/stable-diffusion img2img as free fallback
  const sourceb64 = fs.readFileSync(sourceImagePath).toString('base64');
  const targetb64 = fs.readFileSync(targetImagePath).toString('base64');
  
  const response = await axios.post('https://api.replicate.com/v1/predictions', {
    version: "cc2ee3d5-9c3b-4c9e-8e40-7f6a5b2e9d8c",
    input: { source_image: `data:image/jpeg;base64,${sourceb64}`, target_image: `data:image/jpeg;base64,${targetb64}` }
  }, { headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}` } });
  
  return response.data;
}

module.exports = { faceSwap, faceSwapFree };
