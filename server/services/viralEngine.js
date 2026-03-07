// viralEngine.js — Analyze hooks, pacing, trending sounds score 1-100
const { chat } = require('./openrouter');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const VIRAL_HOOKS = [
  /^(this|here's|wait|stop|POV|nobody|watch|why|how|the real|i never)/i,
  /\d+\s*(reasons|ways|tips|secrets|mistakes|things)/i,
  /(you won't believe|nobody talks about|everyone is wrong|the truth about)/i,
  /(\$\d+|£\d+|\d+k|\d+,\d{3})/,
];

const TRENDING_SOUNDS_SCORE = {
  original_audio: 40,
  trending_sound: 85,
  viral_remix: 90,
  popular_song: 75,
  viral_voice_effect: 80,
};

function scoreHook(text) {
  if (!text) return 30;
  let score = 30;
  for (const pattern of VIRAL_HOOKS) {
    if (pattern.test(text)) { score += 15; break; }
  }
  const words = text.trim().split(/\s+/).length;
  if (words >= 5 && words <= 12) score += 15;
  else if (words > 12 && words <= 18) score += 8;
  const powerWords = ['secret','never','always','viral','exposed','truth','real','actually','finally'];
  if (powerWords.some(w => text.toLowerCase().includes(w))) score += 10;
  if (text.includes('?')) score += 8;
  return Math.min(100, score);
}

function scoreCaption(text) {
  if (!text) return 20;
  let score = 20;
  if (text.length >= 100 && text.length <= 300) score += 20;
  const hashtags = (text.match(/#\w+/g) || []).length;
  if (hashtags >= 5 && hashtags <= 15) score += 15;
  else if (hashtags > 0) score += 8;
  if (/(comment|share|follow|save|link in bio|dm me|click)/i.test(text)) score += 15;
  if (text.includes('\n')) score += 10;
  return Math.min(100, score);
}

async function analyzeViralPotential(content) {
  const hookScore    = scoreHook(content.hook || content.title || '');
  const captionScore = scoreCaption(content.caption || '');
  const soundScore   = TRENDING_SOUNDS_SCORE[content.audio_type || 'original_audio'];
  let formatBonus = 0;
  if (content.type === 'short_video') formatBonus = 15;
  else if (content.type === 'reel') formatBonus = 12;
  else if (content.type === 'story') formatBonus = 5;

  const overallScore = Math.round(
    hookScore * 0.35 + captionScore * 0.25 + soundScore * 0.25 + formatBonus * 0.15
  );

  return {
    overall: Math.min(100, overallScore),
    breakdown: { hook: hookScore, caption: captionScore, sound: soundScore, format: formatBonus },
    verdict: overallScore >= 80 ? 'HIGH VIRAL POTENTIAL 🔥' :
             overallScore >= 60 ? 'GOOD — will perform well ✅' :
             overallScore >= 40 ? 'AVERAGE — needs improvement ⚠️' : 'LOW — rewrite recommended ❌',
    suggestions: buildSuggestions(hookScore, captionScore, soundScore),
  };
}

function buildSuggestions(hook, caption, sound) {
  const tips = [];
  if (hook < 60) tips.push('Start with a stronger hook — use a number, question, or shock statement');
  if (caption < 50) tips.push('Add 8-12 hashtags and a clear call-to-action to your caption');
  if (sound < 70) tips.push('Use a trending sound — check TikTok Discover for current trending audio');
  if (tips.length === 0) tips.push('Content looks great! Post at 9am, 1pm, or 7pm for best reach');
  return tips;
}

async function generateViralHooks(topic, niche, count=5) {
  const prompt = `Generate ${count} viral TikTok/Instagram Reel opening hooks for a ${niche} creator posting about: "${topic}".
Each hook must be under 15 words. Make them scroll-stopping. Use patterns like:
- Shocking stats, surprising facts, controversial opinions, relatable problems, FOMO triggers.
Return as a numbered list only. No explanations.`;
  const result = await chat([{ role:'user', content:prompt }]);
  return result.split('\n').filter(l=>l.match(/^\d/)).map(l=>l.replace(/^\d+\.\s*/,'').trim());
}

module.exports = { analyzeViralPotential, generateViralHooks, scoreHook, scoreCaption };

