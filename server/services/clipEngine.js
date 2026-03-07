const { exec } = require('child_process');
const fs = require('fs');

function ffmpegRun(cmd) {
  return new Promise((resolve, reject) => {
    exec(`ffmpeg -y ${cmd} 2>&1`, (err, out) => err ? reject(new Error(out)) : resolve(out));
  });
}

async function getDuration(videoPath) {
  return new Promise((resolve, reject) => {
    exec(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${videoPath}"`,
      (err, out) => err ? reject(err) : resolve(parseFloat(out.trim()))
    );
  });
}

async function cutClip({ inputPath, startTime, duration, outputPath }) {
  await ffmpegRun(`-ss ${startTime} -i "${inputPath}" -t ${duration} -c:v libx264 -c:a aac -preset fast "${outputPath}"`);
  return outputPath;
}

async function autoReformat({ inputPath, targetFormat = '9:16', outputPath }) {
  const filters = {
    '9:16': 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920',
    '1:1':  'scale=1080:1080:force_original_aspect_ratio=increase,crop=1080:1080',
    '16:9': 'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080',
  };
  const vf = filters[targetFormat] || filters['9:16'];
  await ffmpegRun(`-i "${inputPath}" -vf "${vf},setsar=1" -c:a copy "${outputPath}"`);
  return outputPath;
}

async function generateClips({ videoPath, durations = [15, 30, 60] }) {
  const totalDuration = await getDuration(videoPath);
  const clips = [];
  for (const dur of durations) {
    if (totalDuration < dur) continue;
    const start = Math.max(0, (totalDuration - dur) / 2);
    const out = `/tmp/clip_${dur}s_${Date.now()}.mp4`;
    await cutClip({ inputPath: videoPath, startTime: start, duration: dur, outputPath: out });
    const reformatted = `/tmp/clip_${dur}s_vertical_${Date.now()}.mp4`;
    await autoReformat({ inputPath: out, targetFormat: '9:16', outputPath: reformatted });
    clips.push({ duration: dur, path: reformatted });
    fs.unlinkSync(out);
  }
  return clips;
}

module.exports = { cutClip, autoReformat, generateClips, getDuration };
