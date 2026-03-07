import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background:'#1a1a1a', border:'1px solid #333',
      borderRadius:8, padding:'8px 12px', fontSize:12
    }}>
      <p style={{ color:'#888', margin:0 }}>{label}s mark</p>
      <p style={{ color:'#C9A84C', fontWeight:700, margin:'2px 0 0' }}>
        {payload[0].value}% still watching
      </p>
    </div>
  );
};

export default function RetentionWidget({ data = [], contentType = 'short_video', score, grade }) {
  // data: [{second, percent_retained}]
  const chartData = data.length ? data : [
    {second:0,  percent_retained:100},
    {second:5,  percent_retained:82},
    {second:10, percent_retained:71},
    {second:15, percent_retained:63},
    {second:20, percent_retained:55},
    {second:25, percent_retained:48},
    {second:30, percent_retained:38},
  ];

  const gradeColor = { 'A+':'#00ff88', A:'#00ff88', B:'#C9A84C', C:'#ff9f1c', D:'#ff4d4d', 'N/A':'#666' };
  const displayGrade = grade || 'N/A';
  const displayScore = score || 0;

  return (
    <div style={{ background:'#111', borderRadius:12, padding:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <div>
          <h4 style={{ color:'#fff', margin:0, fontSize:14 }}>Retention Curve</h4>
          <p style={{ color:'#555', margin:'2px 0 0', fontSize:11 }}>{contentType.replace(/_/g,' ')}</p>
        </div>
        <div style={{ textAlign:'right' }}>
          <span style={{
            fontSize:28, fontWeight:900,
            color: gradeColor[displayGrade]||'#666'
          }}>{displayGrade}</span>
          <p style={{ color:'#555', fontSize:11, margin:0 }}>Score: {displayScore}/100</p>
        </div>
      </div>

      <ResponsiveContainer width='100%' height={160}>
        <AreaChart data={chartData} margin={{ top:5, right:5, left:-20, bottom:0 }}>
          <defs>
            <linearGradient id='retGrad' x1='0' y1='0' x2='0' y2='1'>
              <stop offset='5%'  stopColor='#C9A84C' stopOpacity={0.4} />
              <stop offset='95%' stopColor='#C9A84C' stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray='3 3' stroke='#1a1a1a' />
          <XAxis dataKey='second' tick={{ fill:'#555', fontSize:10 }}
            tickFormatter={v=>`${v}s`} />
          <YAxis tick={{ fill:'#555', fontSize:10 }} tickFormatter={v=>`${v}%`}
            domain={[0,100]} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={50} stroke='#333' strokeDasharray='4 4'
            label={{ value:'50%', fill:'#444', fontSize:10 }} />
          <Area
            type='monotone' dataKey='percent_retained'
            stroke='#C9A84C' strokeWidth={2}
            fill='url(#retGrad)'
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
