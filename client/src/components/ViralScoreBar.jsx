import { useEffect, useRef } from 'react';

export default function ViralScoreBar({ score = 0, label = '', showLabel = true }) {
  const barRef = useRef(null);

  const getColor = (s) => {
    if (s >= 80) return '#00ff88';   // green — viral
    if (s >= 60) return '#C9A84C';   // gold — good
    if (s >= 40) return '#ff9f1c';   // orange — average
    return '#ff4d4d';                 // red — low
  };

  const getVerdict = (s) => {
    if (s >= 80) return '🔥 HIGH VIRAL';
    if (s >= 60) return '✅ GOOD';
    if (s >= 40) return '⚠️ AVERAGE';
    return '❌ LOW';
  };

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    bar.style.width = '0%';
    const t = setTimeout(() => {
      bar.style.transition = 'width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)';
      bar.style.width = `${Math.min(100, score)}%`;
    }, 100);
    return () => clearTimeout(t);
  }, [score]);

  const color = getColor(score);

  return (
    <div style={{ width: '100%', fontFamily: 'sans-serif' }}>
      {showLabel && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ color: '#aaa', fontSize: 12 }}>{label || 'Viral Score'}</span>
          <span style={{ color, fontWeight: 700, fontSize: 13 }}>
            {score}/100 — {getVerdict(score)}
          </span>
        </div>
      )}
      <div style={{
        background: '#1a1a1a', borderRadius: 8, height: 14,
        overflow: 'hidden', border: '1px solid #333'
      }}>
        <div
          ref={barRef}
          style={{
            height: '100%', background: color, borderRadius: 8,
            boxShadow: `0 0 12px ${color}88`, width: '0%',
          }}
        />
      </div>
    </div>
  );
}
