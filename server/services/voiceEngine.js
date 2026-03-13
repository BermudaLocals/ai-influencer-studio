/**
 * VOICE ENGINE — Text to speech via ElevenLabs
 */
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const DEFAULT_VOICE = 'EXAVITQu4vr4xnSDxMaL'; // Bella — natural female voice

async function generateVoice({ text, voiceId, stability = 0.5, similarityBoost = 0.8 }) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY not set');

  const voice = voiceId || DEFAULT_VOICE;
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'xi-api-key': apiKey },
    body: JSON.stringify({
      text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: { stability, similarity_boost: similarityBoost }
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail?.message || 'ElevenLabs error');
  }

  const buffer = await res.arrayBuffer();
  return Buffer.from(buffer);
}

async function getVoices() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return [];
  const res = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: { 'xi-api-key': apiKey }
  });
  const data = await res.json();
  return data.voices || [];
}

module.exports = { generateVoice, getVoices, DEFAULT_VOICE };
