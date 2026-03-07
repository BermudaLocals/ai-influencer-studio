import ViralScoreBar from './ViralScoreBar';

export default function ContentCard({ post = {} }) {
  const {
    title = 'Untitled Post',
    media_url,
    thumbnail_url,
    views = 0,
    likes = 0,
    comments = 0,
    viral_score = 0,
    platform = 'tiktok',
    post_type = 'video',
    scheduled_at,
    status = 'pending',
  } = post;

  const img = thumbnail_url || media_url || null;
  const statusColors = { posted:'#00ff88', pending:'#C9A84C', failed:'#ff4d4d', processing:'#4da6ff' };
  const platformIcons = { tiktok:'🎵', instagram:'📸', youtube:'▶️', fanvue:'💎', glowx:'✨', onlyfans:'🔞' };

  const fmt = (n) => n >= 1000000 ? (n/1000000).toFixed(1)+'M' :
                     n >= 1000 ? (n/1000).toFixed(1)+'K' : String(n);

  return (
    <div style={{
      background: '#111', border: '1px solid #2a2a2a', borderRadius: 12,
      overflow: 'hidden', transition: 'transform 0.2s, border-color 0.2s',
      cursor: 'pointer',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.borderColor='#C9A84C'; }}
      onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.borderColor='#2a2a2a'; }}
    >
      {/* Thumbnail */}
      <div style={{ position:'relative', paddingTop:'56.25%', background:'#0a0a0a' }}>
        {img ? (
          <img src={img} alt={title}
            style={{ position:'absolute',top:0,left:0,width:'100%',height:'100%',objectFit:'cover' }} />
        ) : (
          <div style={{
            position:'absolute',top:0,left:0,width:'100%',height:'100%',
            display:'flex',alignItems:'center',justifyContent:'center',
            fontSize:32, color:'#333'
          }}>🎬</div>
        )}
        {/* Status badge */}
        <span style={{
          position:'absolute',top:8,right:8,
          background: statusColors[status]||'#666',
          color:'#000', fontSize:10, fontWeight:700,
          padding:'2px 8px', borderRadius:20, textTransform:'uppercase'
        }}>{status}</span>
        {/* Platform badge */}
        <span style={{
          position:'absolute',top:8,left:8,
          background:'rgba(0,0,0,0.7)',
          fontSize:16, padding:'2px 6px', borderRadius:8
        }}>{platformIcons[platform]||'📱'}</span>
      </div>

      {/* Body */}
      <div style={{ padding: '12px 14px' }}>
        <p style={{ color:'#fff', fontWeight:600, fontSize:13, margin:'0 0 8px',
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {title}
        </p>

        {/* Stats row */}
        <div style={{ display:'flex', gap:12, marginBottom:10 }}>
          {[['👁', fmt(views)],['❤️', fmt(likes)],['💬', fmt(comments)]].map(([ic,v]) => (
            <span key={ic} style={{ color:'#888', fontSize:11 }}>{ic} {v}</span>
          ))}
          <span style={{ color:'#555', fontSize:11, marginLeft:'auto' }}>
            {post_type.replace('_',' ')}
          </span>
        </div>

        <ViralScoreBar score={viral_score} label='Viral Score' />

        {scheduled_at && (
          <p style={{ color:'#555', fontSize:10, margin:'8px 0 0' }}>
            🕐 {new Date(scheduled_at).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}
