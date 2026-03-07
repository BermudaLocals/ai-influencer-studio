const axios = require('axios');

async function textToSpeech(text, voice_id) {
  if (!process.env.ELEVENLABS_API_KEY) return null;
  const vid = voice_id || 'EXAVITQu4vr4xnSDxMaL';
  const res = await axios.post(
    `https://api.elevenlabs.io/v1/text-to-speech/${vid}`,
    { text, model_id: 'eleven_monolingual_v1', voice_settings: { stability: 0.5, similarity_boost: 0.75 } },
    { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY }, responseType: 'arraybuffer' }
  );
  const path = `/tmp/voice_${Date.now()}.mp3`;
  require('fs').writeFileSync(path, res.data);
  return path;
}

async function getVoices() {
  const res = await axios.get('https://api.elevenlabs.io/v1/voices', {
    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY }
  });
  return res.data.voices;
}

module.exports = { textToSpeech, getVoices };
