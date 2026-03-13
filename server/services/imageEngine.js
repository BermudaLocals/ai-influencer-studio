/**
 * IMAGE ENGINE — AI image generation via Replicate
 */
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

async function generateImage({ prompt, width = 768, height = 1024, model = 'black-forest-labs/flux-schnell' }) {
  const apiKey = process.env.REPLICATE_API_TOKEN;
  if (!apiKey) throw new Error('REPLICATE_API_TOKEN not set');

  const res = await fetch('https://api.replicate.com/v1/models/' + model + '/predictions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ input: { prompt, width, height, num_outputs: 1 } })
  });
  const prediction = await res.json();
  if (!res.ok) throw new Error(prediction.detail || 'Replicate error');

  // Poll for result
  const predId = prediction.id;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const poll = await fetch(`https://api.replicate.com/v1/predictions/${predId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    const result = await poll.json();
    if (result.status === 'succeeded') return result.output[0];
    if (result.status === 'failed') throw new Error('Image generation failed: ' + result.error);
  }
  throw new Error('Image generation timed out');
}

async function generateCreatorImage({ creator, scene }) {
  const prompt = scene.image_prompt || `${creator.name}, ${scene.visual_description}, ultra-realistic, 8K, photorealistic portrait`;
  return await generateImage({ prompt });
}

module.exports = { generateImage, generateCreatorImage };
