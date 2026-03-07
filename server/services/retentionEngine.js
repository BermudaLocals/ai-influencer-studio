// retentionEngine.js — Chapter markers, retention drop detection
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const BENCHMARKS = {
  short_video: { q25:90, q50:75, q75:55, q100:35 },
  long_video:  { q25:70, q50:50, q75:35, q100:20 },
  reel:        { q25:88, q50:72, q75:52, q100:30 },
  story:       { q25:85, q50:70, q75:50, q100:25 },
};

function formatTime(seconds) {
  const m = Math.floor(seconds/60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2,'0')}`;
}

function generateChapterMarkers(durationSeconds) {
  if (durationSeconds < 60) return [];
  return [
    { time:0,                                label:'🎯 Intro — What You Will Learn' },
    { time:Math.round(durationSeconds*0.15), label:'❓ The Problem' },
    { time:Math.round(durationSeconds*0.35), label:'💡 The Solution' },
    { time:Math.round(durationSeconds*0.60), label:'📊 Proof and Examples' },
    { time:Math.round(durationSeconds*0.80), label:'🚀 How To Apply This' },
    { time:Math.round(durationSeconds*0.92), label:'✅ Summary and Next Steps' },
  ].map(c => ({ ...c, timestamp: formatTime(c.time) }));
}

function detectRetentionDrops(retentionData) {
  const drops = [];
  for (let i=1; i<retentionData.length; i++) {
    const prev = retentionData[i-1].percent_retained;
    const curr = retentionData[i].percent_retained;
    const drop = prev - curr;
    if (drop > 8) {
      drops.push({
        at_second: retentionData[i].second,
        at_time: formatTime(retentionData[i].second),
        drop_percent: drop,
        severity: drop > 20 ? 'critical' : drop > 12 ? 'high' : 'medium',
        suggestion: dropSuggestion(retentionData[i].second, drop),
      });
    }
  }
  return drops;
}

function dropSuggestion(second, dropPercent) {
  if (second < 5)  return 'Hook is too weak — rewrite the first 3 seconds to be more shocking or provocative';
  if (second < 15) return 'Early drop — add a pattern interrupt (music change, cut, on-screen text) in first 15 seconds';
  if (second < 30) return 'Mid-hook drop — tease the payoff earlier to keep viewers watching';
  return 'Retention drop at ' + formatTime(second) + ' — add a re-engagement hook: wait for the end or here is the twist';
}

function analyseRetentionScore(retentionData, contentType='short_video') {
  if (!retentionData || !retentionData.length) return { score:0, grade:'N/A' };
  const bench = BENCHMARKS[contentType] || BENCHMARKS.short_video;
  const len = retentionData.length;
  const actual = {
    q25: retentionData[Math.round(len*0.25)]?.percent_retained || 0,
    q50: retentionData[Math.round(len*0.50)]?.percent_retained || 0,
    q75: retentionData[Math.round(len*0.75)]?.percent_retained || 0,
    q100: retentionData[len-1]?.percent_retained || 0,
  };
  const score = Math.round(
    (actual.q25/bench.q25*25) + (actual.q50/bench.q50*25) +
    (actual.q75/bench.q75*25) + (actual.q100/bench.q100*25)
  );
  const grade = score>=90?'A+':score>=80?'A':score>=70?'B':score>=60?'C':'D';
  return { score:Math.min(100,score), grade, actual, benchmark:bench };
}

module.exports = { generateChapterMarkers, detectRetentionDrops, analyseRetentionScore };

