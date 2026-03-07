const axios = require('axios');

const client = axios.create({
  baseURL: 'https://openrouter.ai/api/v1',
  headers: {
    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

const MODEL = process.env.OPENROUTER_MODEL || 'minimax/minimax-m2.5';

async function chat(messages, max_tokens = 2000) {
  const res = await client.post('/chat/completions', { model: MODEL, messages, max_tokens });
  return res.data.choices[0].message.content;
}

async function generateScript({ topic, platform, niche, personality }) {
  return chat([{
    role: 'user',
    content: `You are a viral content creator specializing in ${niche}. Your personality: ${personality}.
Write a ${platform} video script about: "${topic}"
Format:
HOOK (first 3 seconds to stop scroll):
MAIN CONTENT (key points with timestamps):
CTA (call to action):
CAPTION (with hashtags):
Keep it punchy, engaging, and optimized for ${platform} algorithm.`
  }]);
}

async function generatePitch({ business_name, niche, location }) {
  return chat([{
    role: 'user',
    content: `Write a short, compelling cold email pitch to ${business_name} (${niche} business in ${location}).
We offer AI influencer marketing — our AI personas create viral content promoting their business.
Keep it under 150 words. Subject line + body. Casual but professional tone.`
  }]);
}

async function generateMusicPrompt({ niche, mood, platform }) {
  return chat([{
    role: 'user',
    content: `Generate a detailed music prompt for an AI music generator for a ${niche} content creator.
Mood: ${mood}. Platform: ${platform}.
Include: genre, BPM, instruments, energy level, vibe description.
Return only the prompt, no explanation.`
  }]);
}

async function generateLyrics({ topic, genre, mood, influencer_name }) {
  return chat([{
    role: 'user',
    content: `Write original song lyrics for an AI influencer named ${influencer_name}.
Topic: ${topic}. Genre: ${genre}. Mood: ${mood}.
Format: Verse 1, Chorus, Verse 2, Chorus, Bridge, Outro.
Make it catchy, authentic, and shareable.`
  }]);
}

module.exports = { generateScript, generatePitch, generateMusicPrompt, generateLyrics, chat };
