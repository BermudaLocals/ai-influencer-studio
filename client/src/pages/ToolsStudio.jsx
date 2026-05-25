import { useState, useEffect, useRef } from "react";

const PLANS = [
  {
    id: "starter", name: "Starter", price: 97, period: "/mo",
    tag: "SFW ONLY", tagColor: "#3B8BFF",
    earn: "Perfect for mainstream creators & businesses",
    features: ["SFW avatars only","Lifestyle / fitness / food / fashion niches","10 UGC videos/mo","5 ad scripts/mo","Basic analytics","Email support"],
    cost: "YOUR COST: ~$2/mo | MARGIN: 97%",
    adult: false, color: "#3B8BFF"
  },
  {
    id: "fanvue_pro", name: "Fanvue Pro", price: 197, period: "/mo",
    tag: "MOST POPULAR", tagColor: "#C9A84C",
    earn: "Clients earn $3,000–5,000/mo. No one cancels this.",
    features: ["Adult avatar unlock (18+ verified)","Full Fanvue pipeline automated","AI DM system included","Unlimited UGC videos","Daily content + scheduling","Whale relationship management","Priority support"],
    cost: "YOUR COST: ~$8/mo | MARGIN: 96%",
    adult: true, color: "#C9A84C", hero: true
  },
  {
    id: "empire", name: "Fanvue Empire", price: 497, period: "/mo",
    tag: "10 CREATORS", tagColor: "#00D46A",
    earn: "Run an entire agency from one dashboard",
    features: ["Everything in Fanvue Pro","10 AI creator personas","Cross-platform posting","Brand deal marketplace","Revenue split tracking","Dedicated account manager","Monthly strategy call"],
    cost: "YOUR COST: ~$25/mo | MARGIN: 95%",
    adult: true, color: "#00D46A"
  },
  {
    id: "dfy", name: "Done For You", price: 2500, period: " setup",
    tag: "FULL SERVICE", tagColor: "#8B5CF6",
    earn: "We build everything. You collect revenue.",
    features: ["Complete setup & configuration","All creators built for you","30-day managed launch","$997/mo ongoing management","Brand deal negotiation","Weekly performance reports","Revenue split available"],
    cost: "ONGOING: $997/mo | YOUR MARGIN: $2,420 setup + $917/mo",
    adult: true, color: "#8B5CF6"
  }
];

const UGC_PRICES = [
  { name: "Single UGC video (15–30 sec)", price: "$97", cost: "~$2", margin: "95%" },
  { name: "UGC pack — 5 videos", price: "$397", cost: "~$8", margin: "98%" },
  { name: "UGC pack — 10 videos", price: "$697", cost: "~$15", margin: "98%" },
  { name: "Ad video — 30 sec", price: "$297", cost: "~$5", margin: "98%" },
  { name: "Ad video — 60 sec", price: "$497", cost: "~$8", margin: "99%" },
  { name: "3 ad variations (A/B/C)", price: "$797", cost: "~$12", margin: "98%" },
  { name: "Monthly UGC retainer (8 videos)", price: "$597/mo", cost: "~$25/mo", margin: "96%" },
  { name: "Monthly ad retainer (4 ads)", price: "$997/mo", cost: "~$30/mo", margin: "97%" },
];

const NICHES = ["Lifestyle","Fitness","Food","Fashion","Tech","Finance","Gaming","Travel","Beauty","Music"];
const AD_STYLES = ["TikTok Hook","Instagram Reel","YouTube Pre-roll","Facebook Ad","UGC Authentic","Before/After","Testimonial","POV Style"];
const DURATIONS = ["15 seconds","30 seconds","60 seconds","90 seconds"];

const CLAUDE_MODEL = "claude-sonnet-4-6";

const injectStyles = () => {
  if (document.getElementById("ais-styles")) return;
  const s = document.createElement("style");
  s.id = "ais-styles";
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@300;400;500&family=Lora:ital,wght@0,400;0,600;1,400&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#050505;color:#E0E0E0;font-family:'Syne',sans-serif}
    ::-webkit-scrollbar{width:4px}
    ::-webkit-scrollbar-track{background:#0C0C0C}
    ::-webkit-scrollbar-thumb{background:#1A1A1A;border-radius:2px}
    @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
    @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
    @keyframes shimmer{0%{background-position:0% 50%}100%{background-position:200% 50%}}
    .ais-btn{font-family:'Syne',sans-serif;font-weight:700;border:none;cursor:pointer;border-radius:8px;transition:all 0.2s;letter-spacing:0.03em}
    .ais-btn-gold{background:#C9A84C;color:#000;padding:14px 28px;font-size:14px}
    .ais-btn-gold:hover{background:#E8C86A;transform:translateY(-1px)}
    .ais-btn-ghost{background:transparent;border:1px solid #1A1A1A;color:#888;padding:10px 20px;font-size:13px}
    .ais-btn-ghost:hover{border-color:#C9A84C;color:#C9A84C}
    .ais-btn-ghost.active{border-color:#C9A84C;color:#C9A84C;background:rgba(201,168,76,0.08)}
    .ais-input{background:#0C0C0C;border:1px solid #1A1A1A;border-radius:8px;padding:12px 16px;color:#E0E0E0;font-family:'Syne',sans-serif;font-size:14px;width:100%;transition:border-color 0.2s;resize:vertical}
    .ais-input:focus{outline:none;border-color:#C9A84C}
    .ais-input::placeholder{color:#444}
    .ais-card{background:#0C0C0C;border:1px solid #1A1A1A;border-radius:12px;transition:border-color 0.2s}
    .ais-card:hover{border-color:#2A2A2A}
    .ais-nav-btn{background:transparent;border:none;color:#4A4A4A;font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:2px;cursor:pointer;padding:10px 16px;border-radius:6px;transition:all 0.2s;text-transform:uppercase}
    .ais-nav-btn:hover{color:#E0E0E0;background:#0C0C0C}
    .ais-nav-btn.active{color:#C9A84C;background:#0C0C0C;border:1px solid #1A1A1A}
    select.ais-input{cursor:pointer}
    option{background:#0C0C0C}
  `;
  document.head.appendChild(s);
};

function Spinner() {
  return <div style={{ width:20, height:20, border:"2px solid #1A1A1A", borderTop:"2px solid #C9A84C", borderRadius:"50%", animation:"spin 0.8s linear infinite", display:"inline-block" }} />;
}

function Tag({ children, color = "#C9A84C" }) {
  return (
    <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, letterSpacing:3, color, border:`1px solid ${color}33`, background:`${color}11`, padding:"3px 10px", borderRadius:4, textTransform:"uppercase" }}>
      {children}
    </span>
  );
}

// ── VIDEO AD GENERATOR ──────────────────────────────────────────────────────
function VideoAdGenerator() {
  const [form, setForm] = useState({ product:"", niche:"Lifestyle", style:"TikTok Hook", duration:"30 seconds", tone:"Energetic and aspirational", cta:"Link in bio" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(null);

  const generate = async () => {
    if (!form.product.trim()) { setError("Enter a product or creator description"); return; }
    setLoading(true); setError(null); setResult(null);

    try {
      const resp = await fetch("/api/claude", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens:1500,
          system:`You are a viral video ad scriptwriter for the AI Influencer Studio platform. You write scripts that get results. Always respond with valid JSON only. No markdown, no backticks, no explanation outside the JSON.`,
          messages:[{ role:"user", content:`Write a complete ${form.duration} ${form.style} video ad script for:\n\nPRODUCT/CREATOR: ${form.product}\nNICHE: ${form.niche}\nTONE: ${form.tone}\nCTA: ${form.cta}\n\nReturn JSON with exactly these fields:\n{\n  "hook": "First 3-5 words spoken on screen — must stop the scroll",\n  "hook_visual": "Exactly what the viewer sees in frame at second 0",\n  "script": "Full word-for-word voiceover script",\n  "scene_breakdown": [{"second":"0-3","visual":"what's on screen","audio":"what's said or heard"}],\n  "caption": "Social media caption with hashtags (under 150 chars)",\n  "cta_line": "The exact call to action line spoken",\n  "viral_reason": "One sentence — why this will perform",\n  "estimated_cpm_improvement": "e.g. 40% higher CTR than average"\n}` }]
        })
      });

      const data = await resp.json();
      const raw = data.content[0].text.trim().replace(/```json|```/g,"").trim();
      setResult(JSON.parse(raw));
    } catch(e) {
      setError("Generation failed. Check your API connection.");
    }
    setLoading(false);
  };

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div style={{ display:"grid", gridTemplateColumns: result ? "1fr 1fr" : "1fr", gap:24, animation:"fadeUp 0.4s ease" }}>
      <div>
        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, letterSpacing:3, color:"#C9A84C", marginBottom:16 }}>// INPUT</div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div>
            <div style={{ fontSize:12, color:"#888", marginBottom:6, fontFamily:"'JetBrains Mono',monospace" }}>PRODUCT OR CREATOR DESCRIPTION *</div>
            <textarea className="ais-input" rows={3} placeholder="e.g. Luna AI — lifestyle creator on Fanvue, sells fitness tips and exclusive content to 5K subscribers" value={form.product} onChange={e => setForm(f => ({...f, product:e.target.value}))} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <div style={{ fontSize:12, color:"#888", marginBottom:6, fontFamily:"'JetBrains Mono',monospace" }}>NICHE</div>
              <select className="ais-input" value={form.niche} onChange={e => setForm(f => ({...f, niche:e.target.value}))}>
                {NICHES.map(n => <option key={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize:12, color:"#888", marginBottom:6, fontFamily:"'JetBrains Mono',monospace" }}>AD STYLE</div>
              <select className="ais-input" value={form.style} onChange={e => setForm(f => ({...f, style:e.target.value}))}>
                {AD_STYLES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize:12, color:"#888", marginBottom:6, fontFamily:"'JetBrains Mono',monospace" }}>DURATION</div>
              <select className="ais-input" value={form.duration} onChange={e => setForm(f => ({...f, duration:e.target.value}))}>
                {DURATIONS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize:12, color:"#888", marginBottom:6, fontFamily:"'JetBrains Mono',monospace" }}>TONE</div>
              <input className="ais-input" value={form.tone} onChange={e => setForm(f => ({...f, tone:e.target.value}))} placeholder="e.g. Energetic, aspirational" />
            </div>
          </div>
          <div>
            <div style={{ fontSize:12, color:"#888", marginBottom:6, fontFamily:"'JetBrains Mono',monospace" }}>CALL TO ACTION</div>
            <input className="ais-input" value={form.cta} onChange={e => setForm(f => ({...f, cta:e.target.value}))} placeholder="e.g. Link in bio, DM me NOW, Subscribe today" />
          </div>
          {error && <div style={{ background:"rgba(255,59,59,0.1)", border:"1px solid #FF3B3B33", borderRadius:8, padding:"10px 14px", fontSize:13, color:"#FF3B3B" }}>{error}</div>}
          <button className="ais-btn ais-btn-gold" onClick={generate} disabled={loading} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, opacity:loading?0.7:1 }}>
            {loading ? <><Spinner /> Generating Script...</> : "Generate Video Ad Script →"}
          </button>
        </div>
      </div>

      {result && (
        <div style={{ animation:"fadeUp 0.4s ease" }}>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, letterSpacing:3, color:"#00D46A", marginBottom:16 }}>// OUTPUT READY</div>
          <div style={{ background:"rgba(201,168,76,0.06)", border:"1px solid #C9A84C33", borderRadius:12, padding:20, marginBottom:16 }}>
            <div style={{ fontSize:11, color:"#C9A84C", fontFamily:"'JetBrains Mono',monospace", marginBottom:8 }}>SCROLL-STOPPING HOOK</div>
            <div style={{ fontSize:22, fontWeight:800, color:"#E0E0E0", marginBottom:8 }}>"{result.hook}"</div>
            <div style={{ fontSize:12, color:"#888", fontFamily:"'Lora',serif", fontStyle:"italic" }}>Visual: {result.hook_visual}</div>
          </div>
          <div className="ais-card" style={{ padding:20, marginBottom:12, position:"relative" }}>
            <div style={{ fontSize:11, color:"#888", fontFamily:"'JetBrains Mono',monospace", marginBottom:10 }}>FULL SCRIPT</div>
            <div style={{ fontSize:14, color:"#CCC", lineHeight:1.8, fontFamily:"'Lora',serif", whiteSpace:"pre-wrap" }}>{result.script}</div>
            <button onClick={() => copy(result.script, "script")} className="ais-btn ais-btn-ghost" style={{ marginTop:12, fontSize:11 }}>
              {copied==="script" ? "✓ Copied" : "Copy Script"}
            </button>
          </div>
          {result.scene_breakdown && result.scene_breakdown.length > 0 && (
            <div className="ais-card" style={{ padding:20, marginBottom:12 }}>
              <div style={{ fontSize:11, color:"#888", fontFamily:"'JetBrains Mono',monospace", marginBottom:12 }}>SCENE BREAKDOWN</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {result.scene_breakdown.map((scene, i) => (
                  <div key={i} style={{ display:"grid", gridTemplateColumns:"60px 1fr 1fr", gap:10, fontSize:12, borderBottom:"1px solid #1A1A1A", paddingBottom:8 }}>
                    <div style={{ color:"#C9A84C", fontFamily:"'JetBrains Mono',monospace", fontSize:10 }}>{scene.second}s</div>
                    <div style={{ color:"#888" }}>{scene.visual}</div>
                    <div style={{ color:"#CCC" }}>{scene.audio}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="ais-card" style={{ padding:20, marginBottom:12 }}>
            <div style={{ fontSize:11, color:"#888", fontFamily:"'JetBrains Mono',monospace", marginBottom:8 }}>CAPTION + HASHTAGS</div>
            <div style={{ fontSize:13, color:"#CCC", lineHeight:1.7 }}>{result.caption}</div>
            <button onClick={() => copy(result.caption, "caption")} className="ais-btn ais-btn-ghost" style={{ marginTop:10, fontSize:11 }}>
              {copied==="caption" ? "✓ Copied" : "Copy Caption"}
            </button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div className="ais-card" style={{ padding:16 }}>
              <div style={{ fontSize:10, color:"#888", fontFamily:"'JetBrains Mono',monospace", marginBottom:6 }}>WHY IT WORKS</div>
              <div style={{ fontSize:12, color:"#CCC", lineHeight:1.6 }}>{result.viral_reason}</div>
            </div>
            <div className="ais-card" style={{ padding:16, background:"rgba(0,212,106,0.05)", borderColor:"#00D46A33" }}>
              <div style={{ fontSize:10, color:"#00D46A", fontFamily:"'JetBrains Mono',monospace", marginBottom:6 }}>PERFORMANCE EST.</div>
              <div style={{ fontSize:12, color:"#CCC", lineHeight:1.6 }}>{result.estimated_cpm_improvement}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── UGC BATCH GENERATOR ─────────────────────────────────────────────────────
function UGCGenerator() {
  const [brand, setBrand] = useState("");
  const [count, setCount] = useState(5);
  const [platform, setPlatform] = useState("TikTok / Instagram Reels");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);

  const generate = async () => {
    if (!brand.trim()) { setError("Enter a brand or product description"); return; }
    setLoading(true); setError(null); setResults([]);
    try {
      const resp = await fetch("/api/claude", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens:2000,
          system:"You are a UGC content strategist. Write authentic, high-converting UGC video scripts. JSON only. No markdown.",
          messages:[{ role:"user", content:`Create ${count} different UGC video scripts for:\n\nBRAND/PRODUCT: ${brand}\nPLATFORM: ${platform}\n\nEach script must use a DIFFERENT angle: testimonial, unboxing, transformation, comparison, lifestyle, how-to, reaction, storytelling.\n\nReturn a JSON array of ${count} objects:\n[{\n  "angle": "script angle name",\n  "hook": "opening hook (under 10 words)",\n  "script": "full 15-30 second script",\n  "caption": "caption with hashtags",\n  "cta": "call to action"\n}]` }]
        })
      });
      const data = await resp.json();
      const raw = data.content[0].text.trim().replace(/```json|```/g,"").trim();
      setResults(JSON.parse(raw));
    } catch(e) {
      setError("Generation failed. Try again.");
    }
    setLoading(false);
  };

  return (
    <div style={{ animation:"fadeUp 0.4s ease" }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr auto auto auto", gap:12, alignItems:"end", marginBottom:20 }}>
        <div>
          <div style={{ fontSize:12, color:"#888", marginBottom:6, fontFamily:"'JetBrains Mono',monospace" }}>BRAND / PRODUCT</div>
          <input className="ais-input" value={brand} onChange={e => setBrand(e.target.value)} placeholder="e.g. Shopify store selling minimalist watches, $89 price point" />
        </div>
        <div>
          <div style={{ fontSize:12, color:"#888", marginBottom:6, fontFamily:"'JetBrains Mono',monospace" }}>VIDEOS</div>
          <select className="ais-input" value={count} onChange={e => setCount(Number(e.target.value))} style={{ width:80 }}>
            {[3,5,10].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize:12, color:"#888", marginBottom:6, fontFamily:"'JetBrains Mono',monospace" }}>PLATFORM</div>
          <select className="ais-input" value={platform} onChange={e => setPlatform(e.target.value)} style={{ width:160 }}>
            {["TikTok / Instagram Reels","YouTube Shorts","Facebook Ads","LinkedIn"].map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
        <button className="ais-btn ais-btn-gold" onClick={generate} disabled={loading} style={{ height:44, display:"flex", alignItems:"center", gap:8, whiteSpace:"nowrap" }}>
          {loading ? <><Spinner /> Generating...</> : `Generate ${count} Scripts →`}
        </button>
      </div>
      {error && <div style={{ background:"rgba(255,59,59,0.1)", border:"1px solid #FF3B3B33", borderRadius:8, padding:"10px 14px", fontSize:13, color:"#FF3B3B", marginBottom:16 }}>{error}</div>}
      {results.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))", gap:16 }}>
          {results.map((r, i) => (
            <div key={i} className="ais-card" style={{ padding:20, animation:`fadeUp 0.4s ${i*0.06}s ease both` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <Tag>{r.angle}</Tag>
                <span style={{ fontSize:11, color:"#444", fontFamily:"'JetBrains Mono',monospace" }}>#{i+1}</span>
              </div>
              <div style={{ fontSize:16, fontWeight:700, color:"#E0E0E0", marginBottom:10, lineHeight:1.3 }}>"{r.hook}"</div>
              <div style={{ fontSize:13, color:"#888", lineHeight:1.7, marginBottom:12, fontFamily:"'Lora',serif" }}>{r.script}</div>
              <div style={{ fontSize:12, color:"#C9A84C", marginBottom:8, lineHeight:1.5 }}>{r.caption}</div>
              <div style={{ fontSize:12, color:"#00D46A", fontFamily:"'JetBrains Mono',monospace" }}>CTA: {r.cta}</div>
              <button onClick={() => { navigator.clipboard.writeText(`${r.hook}\n\n${r.script}\n\n${r.caption}\n\nCTA: ${r.cta}`); }} className="ais-btn ais-btn-ghost" style={{ marginTop:12, fontSize:11, width:"100%" }}>
                Copy All
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── CREATOR MANAGER ─────────────────────────────────────────────────────────
function CreatorManager() {
  const [name, setName] = useState("");
  const [niche, setNiche] = useState("Lifestyle");
  const [platform, setPlatform] = useState("Fanvue");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const buildCreator = async () => {
    if (!name.trim()) return;
    setLoading(true); setResult(null);
    try {
      const resp = await fetch("/api/claude", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens:2000,
          system:"You are an AI creator agency strategist. Build complete creator personas and content strategies. JSON only.",
          messages:[{ role:"user", content:`Build a complete AI creator persona and 30-day content strategy for:\n\nNAME: ${name}\nNICHE: ${niche}\nPLATFORM: ${platform}\n\nReturn JSON:\n{\n  "persona": {\n    "full_name": "${name}",\n    "age": number,\n    "backstory": "2-3 sentence compelling backstory",\n    "personality": "3-4 personality traits",\n    "voice": "how they speak and write",\n    "visual_style": "appearance and aesthetic description for image generation",\n    "content_pillars": ["pillar1","pillar2","pillar3"]\n  },\n  "month1_targets": {\n    "subscribers": number,\n    "revenue_estimate": "$X-$Y",\n    "posts_per_week": number,\n    "dms_per_day": number\n  },\n  "week1_content": [\n    {"day":1,"type":"post type","hook":"opening hook","topic":"what it's about"}\n  ],\n  "dm_opener": "first DM sent to new subscribers",\n  "bio": "platform bio under 150 chars",\n  "pricing_recommendation": {\n    "subscription": "$X/mo",\n    "ppv": "$X-$Y per post",\n    "custom_content": "$X"\n  }\n}` }]
        })
      });
      const data = await resp.json();
      const raw = data.content[0].text.trim().replace(/```json|```/g,"").trim();
      setResult(JSON.parse(raw));
    } catch(e) {}
    setLoading(false);
  };

  return (
    <div style={{ animation:"fadeUp 0.4s ease" }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr auto auto auto", gap:12, alignItems:"end", marginBottom:24 }}>
        <div>
          <div style={{ fontSize:12, color:"#888", marginBottom:6, fontFamily:"'JetBrains Mono',monospace" }}>CREATOR NAME</div>
          <input className="ais-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Luna Voss, Jade Tokyo, Marcus Fit" />
        </div>
        <div>
          <div style={{ fontSize:12, color:"#888", marginBottom:6, fontFamily:"'JetBrains Mono',monospace" }}>NICHE</div>
          <select className="ais-input" value={niche} onChange={e => setNiche(e.target.value)} style={{ width:140 }}>
            {NICHES.map(n => <option key={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize:12, color:"#888", marginBottom:6, fontFamily:"'JetBrains Mono',monospace" }}>PLATFORM</div>
          <select className="ais-input" value={platform} onChange={e => setPlatform(e.target.value)} style={{ width:120 }}>
            {["Fanvue","OnlyFans","NVME","Instagram","TikTok"].map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
        <button className="ais-btn ais-btn-gold" onClick={buildCreator} disabled={loading} style={{ height:44, display:"flex", alignItems:"center", gap:8 }}>
          {loading ? <><Spinner /> Building...</> : "Build Creator →"}
        </button>
      </div>

      {result && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, animation:"fadeUp 0.4s ease" }}>
          <div className="ais-card" style={{ padding:24 }}>
            <Tag color="#C9A84C">PERSONA</Tag>
            <div style={{ marginTop:16 }}>
              <div style={{ fontSize:24, fontWeight:800, marginBottom:4 }}>{result.persona.full_name}</div>
              <div style={{ fontSize:13, color:"#888", fontFamily:"'JetBrains Mono',monospace", marginBottom:12 }}>Age {result.persona.age} · {niche} · {platform}</div>
              <div style={{ fontSize:13, color:"#CCC", lineHeight:1.7, marginBottom:12, fontFamily:"'Lora',serif", fontStyle:"italic" }}>{result.persona.backstory}</div>
              <div style={{ fontSize:12, color:"#888", marginBottom:8 }}>Personality: <span style={{ color:"#CCC" }}>{result.persona.personality}</span></div>
              <div style={{ fontSize:12, color:"#888", marginBottom:8 }}>Voice: <span style={{ color:"#CCC" }}>{result.persona.voice}</span></div>
              <div style={{ fontSize:12, color:"#C9A84C", marginBottom:4, fontFamily:"'JetBrains Mono',monospace" }}>// CONTENT PILLARS</div>
              {result.persona.content_pillars?.map((p,i) => (
                <div key={i} style={{ fontSize:12, color:"#888", padding:"4px 0", borderBottom:"1px solid #1A1A1A" }}>→ {p}</div>
              ))}
            </div>
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div className="ais-card" style={{ padding:20, background:"rgba(0,212,106,0.04)", borderColor:"#00D46A22" }}>
              <Tag color="#00D46A">MONTH 1 TARGETS</Tag>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:14 }}>
                {[
                  { label:"Est. Revenue", val:result.month1_targets?.revenue_estimate },
                  { label:"Subscribers", val:result.month1_targets?.subscribers },
                  { label:"Posts/Week", val:result.month1_targets?.posts_per_week },
                  { label:"DMs/Day", val:result.month1_targets?.dms_per_day },
                ].map((s,i) => (
                  <div key={i} style={{ background:"#0C0C0C", borderRadius:8, padding:12 }}>
                    <div style={{ fontSize:10, color:"#4A4A4A", fontFamily:"'JetBrains Mono',monospace", marginBottom:4 }}>{s.label}</div>
                    <div style={{ fontSize:18, fontWeight:800, color:"#00D46A" }}>{s.val}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="ais-card" style={{ padding:20 }}>
              <Tag color="#3B8BFF">PRICING</Tag>
              <div style={{ marginTop:12, display:"flex", flexDirection:"column", gap:8 }}>
                {Object.entries(result.pricing_recommendation || {}).map(([k,v]) => (
                  <div key={k} style={{ display:"flex", justifyContent:"space-between", fontSize:13, borderBottom:"1px solid #1A1A1A", paddingBottom:8 }}>
                    <span style={{ color:"#888", textTransform:"capitalize" }}>{k.replace("_"," ")}</span>
                    <span style={{ color:"#C9A84C", fontWeight:700 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="ais-card" style={{ padding:20 }}>
              <Tag color="#8B5CF6">DM OPENER</Tag>
              <div style={{ fontSize:13, color:"#CCC", lineHeight:1.7, marginTop:12, fontFamily:"'Lora',serif", fontStyle:"italic" }}>
                "{result.dm_opener}"
              </div>
              <button onClick={() => navigator.clipboard.writeText(result.dm_opener)} className="ais-btn ais-btn-ghost" style={{ marginTop:10, fontSize:11 }}>Copy DM</button>
            </div>
          </div>

          {result.week1_content && (
            <div className="ais-card" style={{ padding:20, gridColumn:"1/-1" }}>
              <Tag>WEEK 1 CONTENT PLAN</Tag>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(180px, 1fr))", gap:10, marginTop:14 }}>
                {result.week1_content.slice(0,7).map((d,i) => (
                  <div key={i} style={{ background:"#050505", border:"1px solid #1A1A1A", borderRadius:8, padding:12 }}>
                    <div style={{ fontSize:10, color:"#C9A84C", fontFamily:"'JetBrains Mono',monospace", marginBottom:6 }}>DAY {d.day} — {d.type}</div>
                    <div style={{ fontSize:12, fontWeight:700, marginBottom:4 }}>"{d.hook}"</div>
                    <div style={{ fontSize:11, color:"#666" }}>{d.topic}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── PRICING PAGE ─────────────────────────────────────────────────────────────
function PricingPage() {
  return (
    <div style={{ animation:"fadeUp 0.4s ease" }}>
      <div style={{ textAlign:"center", marginBottom:48 }}>
        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, letterSpacing:4, color:"#C9A84C", marginBottom:16 }}>// 001 — PRICING TIERS</div>
        <h2 style={{ fontSize:"clamp(32px,5vw,64px)", fontWeight:800, lineHeight:0.95, marginBottom:16 }}>
          No fluff.<br /><em style={{ fontFamily:"'Lora',serif", color:"#C9A84C" }}>Max ROI.</em>
        </h2>
        <p style={{ fontFamily:"'Lora',serif", fontSize:15, color:"#666", maxWidth:500, margin:"0 auto" }}>
          The Influencer AI charges $19–$99 for image generation only. You deliver a complete automated Fanvue pipeline that earns clients $3,000–5,000/month. At $197 that's a 15–25x ROI. No one cancels a subscription that makes them money.
        </p>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(240px, 1fr))", gap:12, marginBottom:48 }}>
        {PLANS.map((plan, i) => (
          <div key={plan.id} style={{
            background: plan.hero ? "linear-gradient(135deg,#0C0C0C,#100E00)" : "#0C0C0C",
            border: `1px solid ${plan.hero ? plan.color : "#1A1A1A"}`,
            borderRadius:12, padding:28, position:"relative",
            boxShadow: plan.hero ? `0 0 40px ${plan.color}11` : "none",
            animation:`fadeUp 0.4s ${i*0.08}s ease both`
          }}>
            {plan.hero && (
              <div style={{ position:"absolute", top:-1, left:"50%", transform:"translateX(-50%)", background:plan.color, color:"#000", fontFamily:"'JetBrains Mono',monospace", fontSize:8, letterSpacing:2, padding:"3px 14px", borderRadius:"0 0 6px 6px", fontWeight:500 }}>
                RECOMMENDED
              </div>
            )}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <Tag color={plan.color}>{plan.tag}</Tag>
              {plan.adult && <span style={{ fontSize:10, color:"#FF3B3B", fontFamily:"'JetBrains Mono',monospace" }}>18+ GATE</span>}
            </div>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, letterSpacing:3, color:"#4A4A4A", marginBottom:8 }}>{plan.name.toUpperCase()}</div>
            <div style={{ display:"flex", alignItems:"baseline", gap:4, marginBottom:4 }}>
              <span style={{ fontSize:48, fontWeight:800, color:plan.color, lineHeight:1 }}>${plan.price.toLocaleString()}</span>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:"#4A4A4A" }}>{plan.period}</span>
            </div>
            <div style={{ fontSize:12, color:"#00D46A", fontFamily:"'Lora',serif", fontStyle:"italic", marginBottom:20, padding:"8px 12px", background:"rgba(0,212,106,0.05)", borderRadius:6, border:"1px solid rgba(0,212,106,0.1)" }}>
              {plan.earn}
            </div>
            <ul style={{ listStyle:"none", marginBottom:20 }}>
              {plan.features.map((f,j) => (
                <li key={j} style={{ fontSize:12, color:"#888", padding:"5px 0", borderBottom:"1px solid #1A1A1A", display:"flex", gap:8, alignItems:"center" }}>
                  <span style={{ color:plan.color }}>→</span>{f}
                </li>
              ))}
            </ul>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:"#2A2A2A", paddingTop:12, borderTop:"1px solid #1A1A1A" }}>{plan.cost}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom:48 }}>
        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, letterSpacing:4, color:"#C9A84C", marginBottom:16 }}>// 002 — UGC + AD VIDEO PRICING</div>
        <div style={{ background:"#0C0C0C", border:"1px solid #1A1A1A", borderRadius:12, overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:"#0A0A0A" }}>
                {["DELIVERABLE","YOUR PRICE","YOUR COST","MARGIN"].map(h => (
                  <th key={h} style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, letterSpacing:3, color:"#C9A84C", padding:"14px 16px", textAlign:"left", borderBottom:"1px solid #1A1A1A" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {UGC_PRICES.map((row, i) => (
                <tr key={i} style={{ borderBottom:"1px solid #1A1A1A" }}>
                  <td style={{ padding:"12px 16px", fontSize:13, color:"#AAA" }}>{row.name}</td>
                  <td style={{ padding:"12px 16px", fontSize:13, color:"#C9A84C", fontWeight:700 }}>{row.price}</td>
                  <td style={{ padding:"12px 16px", fontSize:13, color:"#444" }}>{row.cost}</td>
                  <td style={{ padding:"12px 16px", fontSize:13, color:"#00D46A" }}>{row.margin}</td>
                </tr>
              ))}
              <tr style={{ background:"rgba(201,168,76,0.04)" }}>
                <td style={{ padding:"12px 16px", fontSize:13, fontWeight:700, color:"#C9A84C" }}>FULL UGC EMPIRE PACKAGE</td>
                <td style={{ padding:"12px 16px", fontSize:13, color:"#C9A84C", fontWeight:700 }}>$2,997/mo</td>
                <td style={{ padding:"12px 16px", fontSize:13, color:"#444" }}>~$100/mo</td>
                <td style={{ padding:"12px 16px", fontSize:13, color:"#00D46A" }}>97%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ background:"linear-gradient(135deg,#0A0A00,#050500)", border:"1px solid #C9A84C33", borderRadius:16, padding:40 }}>
        <h3 style={{ fontSize:28, fontWeight:800, marginBottom:16 }}>
          Target: <span style={{ color:"#C9A84C" }}>50 clients</span> @ avg $250/mo = <span style={{ color:"#00D46A" }}>$12,500/mo</span>
        </h3>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", gap:12 }}>
          {[
            { label:"10 Starter clients", val:"$970/mo" },
            { label:"20 Fanvue Pro clients", val:"$3,940/mo" },
            { label:"10 Empire clients", val:"$4,970/mo" },
            { label:"5 UGC retainers", val:"$2,985/mo" },
            { label:"5 DFY setups", val:"$12,500 + $4,985/mo" },
            { label:"TOTAL RECURRING", val:"$12,385/mo", gold:true },
          ].map((s,i) => (
            <div key={i} style={{ background:"#0C0C0C", borderRadius:8, padding:16, border: s.gold ? "1px solid #C9A84C33" : "1px solid #1A1A1A" }}>
              <div style={{ fontSize:10, color:"#4A4A4A", fontFamily:"'JetBrains Mono',monospace", marginBottom:6 }}>{s.label}</div>
              <div style={{ fontSize:16, fontWeight:800, color: s.gold ? "#C9A84C" : "#00D46A" }}>{s.val}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── MAIN APP ─────────────────────────────────────────────────────────────────
const TABS = [
  { id:"video", label:"Video Ad Generator" },
  { id:"ugc", label:"UGC Batch Creator" },
  { id:"creator", label:"Creator Builder" },
  { id:"pricing", label:"Pricing & Plans" },
];

export default function ToolsStudio() {
  const [tab, setTab] = useState("video");

  useEffect(() => { injectStyles(); }, []);

  return (
    <div style={{ background:"#050505", minHeight:"100vh", fontFamily:"'Syne',sans-serif" }}>
      <div style={{ borderBottom:"1px solid #1A1A1A", padding:"24px 40px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <div style={{ width:36, height:36, background:"#C9A84C", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:18, color:"#000" }}>A</div>
          <div>
            <div style={{ fontWeight:800, fontSize:18, letterSpacing:"-0.02em" }}>AI Influencer Studio</div>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, letterSpacing:3, color:"#4A4A4A" }}>DOLLAR DOUBLE EMPIRE · AIGROWTHHQ.COM</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:4 }}>
          {TABS.map(t => (
            <button key={t.id} className={`ais-nav-btn ${tab===t.id?"active":""}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding:"32px 40px 0", borderBottom:"1px solid #1A1A1A", marginBottom:0 }}>
        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, letterSpacing:3, color:"#C9A84C", marginBottom:8 }}>
          // {TABS.find(t=>t.id===tab)?.label.toUpperCase()}
        </div>
        {tab === "video" && <p style={{ fontFamily:"'Lora',serif", fontSize:14, color:"#666", marginBottom:20 }}>Enter any product or creator description. Get a complete, ready-to-film video ad script in seconds.</p>}
        {tab === "ugc" && <p style={{ fontFamily:"'Lora',serif", fontSize:14, color:"#666", marginBottom:20 }}>Generate a full batch of UGC scripts for any brand. Each uses a different proven angle.</p>}
        {tab === "creator" && <p style={{ fontFamily:"'Lora',serif", fontSize:14, color:"#666", marginBottom:20 }}>Build a complete AI creator persona with backstory, pricing, 30-day content plan, and DM strategy.</p>}
        {tab === "pricing" && <p style={{ fontFamily:"'Lora',serif", fontSize:14, color:"#666", marginBottom:20 }}>Your complete price list. $97 to $2,997. 97–99% margins across every product.</p>}
      </div>

      <div style={{ padding:"32px 40px 80px" }}>
        {tab === "video" && <VideoAdGenerator />}
        {tab === "ugc" && <UGCGenerator />}
        {tab === "creator" && <CreatorManager />}
        {tab === "pricing" && <PricingPage />}
      </div>

      <div style={{ borderTop:"1px solid #1A1A1A", padding:"20px 40px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, letterSpacing:2, color:"#2A2A2A" }}>DOLLAR DOUBLE MARKETING · AI PROFIT HUSTLE · NVME.LIVE</div>
        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, letterSpacing:2, color:"#2A2A2A" }}>NO FLUFF. MAX ROI.</div>
      </div>
    </div>
  );
}
