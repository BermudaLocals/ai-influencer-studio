const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

function ffmpegRun(cmd) {
  return new Promise((resolve, reject) => {
    exec(`ffmpeg -y ${cmd}`, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve(stdout);
    });
  });
}

async function createSlideVideo({ images, audioPath, outputPath, duration = 30 }) {
  const listFile = `/tmp/slides_${Date.now()}.txt`;
  const perSlide = duration / images.length;
  const lines = images.map(img => `file '${img}'
duration ${perSlide.toFixed(1)}`).join('
');
  fs.writeFileSync(listFile, lines + `
file '${images[images.length-1]}'`);
  const videoOnly = `/tmp/video_${Date.now()}.mp4`;
  await ffmpegRun(`-f concat -safe 0 -i ${listFile} -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1" -c:v libx264 -pix_fmt yuv420p -t ${duration} ${videoOnly}`);
  if (audioPath && fs.existsSync(audioPath)) {
    await ffmpegRun(`-i ${videoOnly} -i ${audioPath} -c:v copy -c:a aac -shortest ${outputPath}`);
    fs.unlinkSync(videoOnly);
  } else {
    fs.renameSync(videoOnly, outputPath);
  }
  fs.unlinkSync(listFile);
  return outputPath;
}

async function addSubtitles({ videoPath, subtitles, outputPath }) {
  const srtPath = `/tmp/subs_${Date.now()}.srt`;
  const srtContent = subtitles.map((s, i) => `${i+1}
${s.start} --> ${s.end}
${s.text}
`).join('
');
  fs.writeFileSync(srtPath, srtContent);
  await ffmpegRun(`-i ${videoPath} -vf "subtitles=${srtPath}:force_style='FontSize=24,PrimaryColour=&Hffffff,OutlineColour=&H000000,Outline=2'" -c:a copy ${outputPath}`);
  fs.unlinkSync(srtPath);
  return outputPath;
}

async function wav2lip({ videoPath, audioPath, outputPath }) {
  return new Promise((resolve, reject) => {
    exec(`python3 /opt/Wav2Lip/inference.py --checkpoint_path /opt/Wav2Lip/checkpoints/wav2lip_gan.pth --face ${videoPath} --audio ${audioPath} --outfile ${outputPath} 2>/dev/null`,
      (err) => err ? reject(err) : resolve(outputPath)
    );
  });
}

async function generateVideo({ script, avatar_url, audio_url, platform }) {
  const outputPath = `/tmp/video_${Date.now()}.mp4`;
  // Try Kling AI if key present
  if (process.env.KLING_API_KEY) {
    try {
      const res = await axios.post('https://api.klingai.com/v1/videos/text2video', {
        prompt: script.substring(0, 500),
        negative_prompt: 'blurry, bad quality',
        cfg_scale: 0.5, mode: 'std',
        duration: platform === 'youtube' ? '10' : '5',
      }, { headers: { 'Authorization': `Bearer ${process.env.KLING_API_KEY}`, 'Content-Type': 'application/json' } });
      return res.data?.data?.task_id || null;
    } catch {}
  }
  // Fallback: placeholder response (real video needs avatar image)
  return { task_id: null, status: 'pending', message: 'Configure KLING_API_KEY for video generation' };
}

module.exports = { createSlideVideo, addSubtitles, wav2lip, generateVideo, ffmpegRun };
