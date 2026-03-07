const axios = require('axios');
const { exec } = require('child_process');

async function ollamaAvailable() {
  return new Promise(resolve => {
    exec('curl -s http://localhost:11434/api/tags', (err) => resolve(!err));
  });
}

async function ollamaChat(prompt, model = 'llama3') {
  const res = await axios.post('http://localhost:11434/api/generate', {
    model, prompt, stream: false
  }, { timeout: 30000 });
  return res.data.response;
}

async function openrouterChat(prompt) {
  const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
    model: process.env.OPENROUTER_MODEL || 'minimax/minimax-m2.5',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 2000
  }, {
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  return res.data.choices[0].message.content;
}

async function generate(prompt) {
  try {
    const useOllama = await ollamaAvailable();
    if (useOllama) {
      console.log('[textEngine] Using Ollama (local)');
      return await ollamaChat(prompt);
    }
  } catch (e) { console.log('[textEngine] Ollama failed, falling back to OpenRouter'); }
  return await openrouterChat(prompt);
}

async function generateScript({ topic, platform, niche, personality }) {
  return generate(`You are a viral ${niche} content creator. Personality: ${personality}.
Write a ${platform} video script about: "${topic}"
HOOK (3 sec):
MAIN CONTENT:
CTA:
CAPTION (with hashtags):`);
}

async function generateCaption({ topic, niche, platform }) {
  return generate(`Write 5 viral captions for a ${niche} ${platform} post about: ${topic}
Make them punchy, emoji-rich, with hashtags. Number them 1-5.`);
}

async function generatePitch({ business_name, niche, location }) {
  return generate(`Write a cold email pitch to ${business_name} (${niche} in ${location}).
We offer AI influencer marketing. Under 150 words. Include subject line.`);
}

async function generateMusicPrompt({ niche, mood, platform }) {
  return generate(`Music prompt for AI generator. Creator niche: ${niche}. Mood: ${mood}. Platform: ${platform}.
Include: genre, BPM, instruments, energy. Return only the prompt.`);
}

async function generateLyrics({ topic, genre, mood, influencer_name }) {
  return generate(`Write song lyrics for AI influencer ${influencer_name}.
Topic: ${topic}. Genre: ${genre}. Mood: ${mood}.
Format: Verse 1, Chorus, Verse 2, Chorus, Bridge, Outro.`);
}

module.exports = { generate, generateScript, generateCaption, generatePitch, generateMusicPrompt, generateLyrics };
