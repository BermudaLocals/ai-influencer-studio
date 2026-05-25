/**
 * CAPTION ENGINE — Layer 1: Auto-generate SRT captions
 * Uses Whisper API or builds from scene timecodes
 */
const fs = require('fs');
const axios = require('axios');

async function generateCaptions({ scenes, audioPath }) {
  // Try OpenAI Whisper first if available
  if (audioPath && process.env.OPENAI_API_KEY && fs.existsSync(audioPath)) {
    try {
      const FormData = require('form-data');
      const form = new FormData();
      form.append('file', fs.createReadStream(audioPath), 'audio.wav');
      form.append('model', 'whisper-1');
      form.append('response_format', 'srt');
      const res = await axios.post('https://api.openai.com/v1/audio/transcriptions', form, {
        headers: { ...form.getHeaders(), Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
      });
      const srtPath = `/tmp/captions_${Date.now()}.srt`;
      fs.writeFileSync(srtPath, res.data);
      return srtPath;
    } catch (e) { console.warn('[Captions] Whisper failed:', e.message); }
  }

  // Fallback: build from scene voiceovers + timecodes
  let srt = '', time = 0;
  scenes.forEach((scene, i) => {
    const words = (scene.voiceover || '').split(' ');
    const chunkSize = 7; // words per caption
    let wordTime = time;
    for (let w = 0; w < words.length; w += chunkSize) {
      const chunk = words.slice(w, w + chunkSize).join(' ');
      const chunkDur = (scene.duration || 5) * (chunkSize / Math.max(words.length, 1));
      const start = formatSRT(wordTime);
      wordTime += chunkDur;
      const end = formatSRT(Math.min(wordTime, time + (scene.duration || 5)));
      srt += `${srt.split('\n\n').length}\n${start} --> ${end}\n${chunk}\n\n`;
    }
    time += scene.duration || 5;
  });

  const captionPath = `/tmp/captions_${Date.now()}.srt`;
  fs.writeFileSync(captionPath, srt || '1\n00:00:00,000 --> 00:00:05,000\n \n\n');
  return captionPath;
}

function formatSRT(secs) {
  const h = Math.floor(secs/3600), m = Math.floor((secs%3600)/60), s = Math.floor(secs%60);
  const ms = Math.round((secs%1)*1000);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(ms).padStart(3,'0')}`;
}

module.exports = { generateCaptions };
