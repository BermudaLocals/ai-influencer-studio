const { exec } = require('child_process');
const axios = require('axios');
const fs = require('fs');

async function audioCraft(prompt, duration = 30) {
  const outputPath = `/tmp/music_${Date.now()}.wav`;
  return new Promise((resolve, reject) => {
    exec(`python3 -c "from audiocraft.models import MusicGen; m=MusicGen.get_pretrained('small'); m.set_generation_params(duration=${duration}); import torchaudio; wav=m.generate(['${prompt.replace(/'/g,"'"'"'")}'])[0]; torchaudio.save('${outputPath}',wav.cpu(),32000)" 2>/dev/null`,
      (err) => err ? reject(err) : resolve(outputPath)
    );
  });
}

async function musicGen(prompt, duration = 30) {
  const outputPath = `/tmp/music_${Date.now()}.wav`;
  return new Promise((resolve, reject) => {
    const scriptPath = '/a0/python/tools/musicgen.py';
    if (fs.existsSync(scriptPath)) {
      exec(`python3 ${scriptPath} "${prompt}" ${duration} ${outputPath}`,
        (err) => err ? reject(err) : resolve(outputPath)
      );
    } else { reject(new Error('MusicGen script not found')); }
  });
}

const ROYALTY_FREE_TRACKS = [
  { genre: 'hip-hop', url: 'https://cdn.pixabay.com/audio/2023/03/24/audio_2ba6759735.mp3', title: 'Hip Hop Beat' },
  { genre: 'pop', url: 'https://cdn.pixabay.com/audio/2023/02/28/audio_bb6e4e95e5.mp3', title: 'Upbeat Pop' },
  { genre: 'lo-fi', url: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3', title: 'Lo-Fi Chill' },
  { genre: 'electronic', url: 'https://cdn.pixabay.com/audio/2023/01/13/audio_2b3b3b5b5b.mp3', title: 'Electronic Pulse' },
];

async function generateTrack({ prompt, genre, mood, duration = 30 }) {
  // Try AudioCraft (local)
  try {
    const path = await audioCraft(`${prompt} ${genre} ${mood}`, duration);
    if (fs.existsSync(path)) { console.log('[musicEngine] AudioCraft'); return { path, source: 'audiocraft' }; }
  } catch {}
  // Try MusicGen script
  try {
    const path = await musicGen(prompt, duration);
    if (fs.existsSync(path)) { console.log('[musicEngine] MusicGen'); return { path, source: 'musicgen' }; }
  } catch {}
  // Fallback: royalty-free library
  const match = ROYALTY_FREE_TRACKS.find(t => t.genre === genre) || ROYALTY_FREE_TRACKS[0];
  console.log('[musicEngine] Royalty-free fallback');
  return { path: null, url: match.url, title: match.title, source: 'royalty_free' };
}

module.exports = { generateTrack, audioCraft, musicGen, ROYALTY_FREE_TRACKS };
