import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const STREAM_COLORS = {
  fanvue:       '#C9A84C',
  subscriptions:'#4da6ff',
  ppv:          '#00ff88',
  brand_deals:  '#ff9f1c',
  tips:         '#ff6b9d',
  affiliate:    '#a855f7',
  digital:      '#06b6d4',
  other:        '#666',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background:'#1a1a1a', border:'1px solid #C9A84C',
      borderRadius:8, padding:'10px 14px'
    }}>
      <p style={{ color:'#C9A84C', fontWeight:700, margin:'0 0 6px' }}>{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color:p.fill, margin:'2px 0', fontSize:12 }}>
          {p.name}: £{Number(p.value||0).toFixed(2)}
        </p>
      ))}
    </div>
  );
};

export default function RevenueChart({ data = [], streams = [] }) {
  // data: [{date, fanvue, ppv, brand_deals, ...}]
  const activeStreams = streams.length ? streams : Object.keys(STREAM_COLORS);

  if (!data.length) return (
    <div style={{
      height:280, display:'flex', alignItems:'center', justifyContent:'center',
      color:'#444', fontSize:14, background:'#111', borderRadius:12
    }}>
      📊 No revenue data yet — keep posting!
    </div>
  );

  return (
    <div style={{ background:'#111', borderRadius:12, padding:16 }}>
      <ResponsiveContainer width='100%' height={280}>
        <BarChart data={data} margin={{ top:5, right:10, left:0, bottom:5 }}>
          <CartesianGrid strokeDasharray='3 3' stroke='#1f1f1f' />
          <XAxis dataKey='date' tick={{ fill:'#666', fontSize:11 }} />
          <YAxis tick={{ fill:'#666', fontSize:11 }} tickFormatter={v=>`£${v}`} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize:11, paddingTop:8 }} />
          {activeStreams.map(stream => (
            <Bar
              key={stream}
              dataKey={stream}
              name={stream.replace(/_/g,' ')}
              stackId='revenue'
              fill={STREAM_COLORS[stream]||'#888'}
              radius={stream===activeStreams[activeStreams.length-1] ? [4,4,0,0] : [0,0,0,0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
