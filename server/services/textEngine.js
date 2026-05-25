/**
 * TEXT ENGINE — Script + caption generation via OpenRouter
 */
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

async function generateText(prompt, system = 'You are a helpful AI assistant.') {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'mistralai/mistral-7b-instruct',
      messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
      max_tokens: 2000
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'OpenRouter error');
  return data.choices[0].message.content;
}

async function generateScript({ prompt, creator, platform }) {
  const text = await generateText(
    `Write a ${platform} video script for AI influencer "${creator.name}" about: "${prompt}". Return JSON with: title, hook, duration_seconds, scenes (array with voiceover, visual_description, on_screen_text, image_prompt), cta`,
    'You are a viral content scriptwriter. Always return valid JSON only, no markdown.'
  );
  try {
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return { title: prompt, hook: prompt, duration_seconds: 30, scenes: [{ scene_num: 1, duration: 30, voiceover: prompt, visual_description: prompt, on_screen_text: '', image_prompt: `${creator.name}, ${prompt}, photorealistic, 8K` }], cta: 'Follow for more' };
  }
}

async function generateCaption({ title, platform, creator }) {
  return await generateText(
    `Write a ${platform} caption for a video titled "${title}" by AI influencer ${creator.name}. Include hashtags. Keep it engaging and under 200 chars.`,
    'You are a social media expert. Return only the caption text.'
  );
}

module.exports = { generateText, generateScript, generateCaption };
