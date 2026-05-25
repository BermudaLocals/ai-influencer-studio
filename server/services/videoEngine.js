/**
 * VIDEO ENGINE — Assembles images + voice into video via Replicate
 */
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
const fs = require('fs');
const path = require('path');
const os = require('os');

async function generateVideo({ imageUrl, audioBuffer, duration = 30 }) {
  const apiKey = process.env.REPLICATE_API_TOKEN;
  if (!apiKey) throw new Error('REPLICATE_API_TOKEN not set');

  // Use Stable Video Diffusion for image-to-video
  const res = await fetch('https://api.replicate.com/v1/models/stability-ai/stable-video-diffusion/predictions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      input: {
        input_image: imageUrl,
        frames_per_second: 6,
        motion_bucket_id: 127,
        noise_aug_strength: 0.1
      }
    })
  });

  const prediction = await res.json();
  if (!res.ok) throw new Error(prediction.detail || 'Video generation error');

  // Poll for result
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const poll = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    const result = await poll.json();
    if (result.status === 'succeeded') return result.output;
    if (result.status === 'failed') throw new Error('Video generation failed: ' + result.error);
  }
  throw new Error('Video generation timed out');
}

async function assembleVideo({ scenes, audioBuffer, creator }) {
  // For now return first scene image as placeholder until full FFmpeg pipeline
  if (!scenes || !scenes.length) throw new Error('No scenes provided');
  const firstImage = scenes[0].imageUrl;
  if (!firstImage) throw new Error('No image URL in scene');
  return await generateVideo({ imageUrl: firstImage, audioBuffer });
}

module.exports = { generateVideo, assembleVideo };
