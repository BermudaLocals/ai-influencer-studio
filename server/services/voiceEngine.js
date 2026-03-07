const axios = require('axios');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

async function kokoroTTS(text, voice = 'af_heart', outputPath) {
  return new Promise((resolve, reject) => {
    const cmd = `python3 -c "import kokoro; import soundfile as sf; audio,sr=kokoro.generate('${text.replace(/'/g,"'\"'\"'")}', voice='${voice}'); sf.write('${outputPath}',audio,sr)" 2>/dev/null`;
    exec(cmd, (err) => {
      if (err) reject(err);
      else resolve(outputPath);
    });
  });
}

async function gtts(text, outputPath) {
  return new Promise((resolve, reject) => {
    const escaped = text.replace(/"/g, '\"');
    exec(`python3 -c "from gtts import gTTS; t=gTTS('${escaped.substring(0,500)}'); t.save('${outputPath}')" 2>/dev/null`, (err) => {
      if (err) reject(err);
      else resolve(outputPath);
    });
  });
}

async function elevenLabs(text, voice_id) {
  if (!process.env.ELEVENLABS_API_KEY) throw new Error('No ElevenLabs key');
  const vid = voice_id || 'EXAVITQu4vr4xnSDxMaL';
  const res = await axios.post(
    `https://api.elevenlabs.io/v1/text-to-speech/${vid}`,
    { text, model_id: 'eleven_monolingual_v1', voice_settings: { stability: 0.5, similarity_boost: 0.75 } },
    { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY }, responseType: 'arraybuffer' }
  );
  return res.data;
}

async function textToSpeech(text, voice_id) {
  const outputPath = `/tmp/voice_${Date.now()}.mp3`;
  // Try Kokoro first (local, free)
  try {
    await kokoroTTS(text, 'af_heart', outputPath);
    if (fs.existsSync(outputPath)) { console.log('[voiceEngine] Kokoro TTS'); return outputPath; }
  } catch {}
  // Try ElevenLabs
  try {
    const audio = await elevenLabs(text, voice_id);
    fs.writeFileSync(outputPath, audio);
    console.log('[voiceEngine] ElevenLabs TTS');
    return outputPath;
  } catch {}
  // Fallback: gTTS (always available)
  try {
    await gtts(text, outputPath);
    console.log('[voiceEngine] gTTS fallback');
    return outputPath;
  } catch (e) { throw new Error('All TTS engines failed: ' + e.message); }
}

module.exports = { textToSpeech, elevenLabs, kokoroTTS, gtts };
