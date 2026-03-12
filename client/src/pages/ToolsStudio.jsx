import { useState, useRef, useCallback } from "react";

const TOOLS = [
  { id: "faceswap", icon: "🎭", label: "Face Swap", desc: "Swap faces between images instantly", badge: "HOT" },
  { id: "remove-bg", icon: "✂️", label: "Remove BG", desc: "Remove background with AI precision", badge: null },
  { id: "upscale", icon: "🔭", label: "Upscale 4x", desc: "Enhance resolution up to 4x with Real-ESRGAN", badge: null },
  { id: "enhance-face", icon: "✨", label: "Face Enhance", desc: "Restore and enhance facial details", badge: null },
  { id: "inpaint", icon: "🖌️", label: "Inpaint", desc: "Edit specific regions with AI", badge: "NEW" },
  { id: "pose", icon: "🕺", label: "Pose Control", desc: "Generate images matching a pose", badge: null },
  { id: "style-transfer", icon: "🎨", label: "Style Transfer", desc: "Apply any style to your images", badge: null },
  { id: "bulk", icon: "⚡", label: "Bulk Generate", desc: "Generate 10+ images at once", badge: "NEW" },
  { id: "variations", icon: "🔀", label: "Variations", desc: "Create 6 variations from one prompt", badge: null },
  { id: "models", icon: "🤖", label: "Model Gallery", desc: "Browse all available AI models", badge: null },
];

const MODELS_LIST = [
  { id: "flux-pro", name: "FLUX Pro", category: "Premium", rating: 4.9, badge: "BEST", color: "#FF00FF" },
  { id: "realvisxl", name: "RealVisXL", category: "Photorealistic", rating: 4.9, badge: "TOP", color: "#00F2EA" },
  { id: "sdxl", name: "Stable Diffusion XL", category: "Photorealistic", rating: 4.8, badge: null, color: "#FF4500" },
  { id: "flux-schnell", name: "FLUX Schnell", category: "Fast", rating: 4.6, badge: "FAST", color: "#FFD700" },
  { id: "epicrealism", name: "epiCRealism", category: "Cinematic", rating: 4.7, badge: null, color: "#9B59B6" },
  { id: "dreamshaper", name: "DreamShaper XL", category: "Artistic", rating: 4.4, badge: null, color: "#2ECC71" },
  { id: "animagine", name: "Animagine XL", category: "Anime", rating: 4.5, badge: null, color: "#E74C3C" },
  { id: "pollinations", name: "Pollinations FREE", category: "Free", rating: 4.2, badge: "FREE", color: "#00F2EA" },
];

function DropZone({ label, onFile, accept = "image/*", preview, icon = "📁" }) {
  const ref = useRef();
  const [drag, setDrag] = useState(false);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }, [onFile]);

  return (
    <div
      onClick={() => ref.current.click()}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      style={{
        border: `2px dashed ${drag ? "#FF00FF" : "#333"}`,
        borderRadius: 12,
        padding: 20,
        textAlign: "center",
        cursor: "pointer",
        background: drag ? "rgba(255,0,255,0.05)" : "rgba(255,255,255,0.02)",
        transition: "all 0.2s",
        minHeight: 120,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
      }}
    >
      <input ref={ref} type="file" accept={accept} style={{ display: "none" }}
        onChange={(e) => e.target.files[0] && onFile(e.target.files[0])} />
      {preview ? (
        <img src={preview} alt="preview" style={{ maxHeight: 100, maxWidth: "100%", borderRadius: 8 }} />
      ) : (
        <>
          <span style={{ fontSize: 28 }}>{icon}</span>
          <span style={{ color: "#888", fontSize: 13 }}>{label}</span>
        </>
      )}
    </div>
  );
}

function StatusBar({ status, progress }) {
  if (!status) return null;
  const colors = { processing: "#FF00FF", success: "#00F2EA", error: "#FF4500" };
  return (
    <div style={{
      background: `rgba(${status === "success" ? "0,242,234" : status === "error" ? "255,69,0" : "255,0,255"},0.1)`,
      border: `1px solid ${colors[status]}`,
      borderRadius: 8, padding: "10px 16px",
      color: colors[status], fontSize: 14, marginTop: 12,
      display: "flex", alignItems: "center", gap: 10
    }}>
      {status === "processing" && (
        <div style={{
          width: 14, height: 14, borderRadius: "50%",
          border: "2px solid #FF00FF", borderTopColor: "transparent",
          animation: "spin 0.8s linear infinite"
        }} />
      )}
      {status === "processing" ? `Processing${progress ? ` (${progress})` : "..."}` :
       status === "success" ? "✅ Complete!" :
       `❌ Error: ${progress}`}
    </div>
  );
}

function ResultImage({ url, label }) {
  if (!url) return null;
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ color: "#888", fontSize: 12, marginBottom: 8 }}>{label || "Result"}</div>
      <img src={url} alt="result" style={{ width: "100%", borderRadius: 10, border: "1px solid #222" }} />
      <a href={url} download style={{
        display: "block", marginTop: 8, textAlign: "center",
        background: "linear-gradient(135deg, #FF00FF, #00F2EA)",
        color: "#000", fontWeight: 700, borderRadius: 8,
        padding: "8px 0", fontSize: 13, textDecoration: "none"
      }}>⬇ Download</a>
    </div>
  );
}

// ── Tool Panels ──────────────────────────────────────────────────

function FaceSwapPanel({ token }) {
  const [sourceFile, setSourceFile] = useState(null);
  const [targetFile, setTargetFile] = useState(null);
  const [sourcePreview, setSourcePreview] = useState(null);
  const [targetPreview, setTargetPreview] = useState(null);
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);
  const [msg, setMsg] = useState("");

  const setFile = (setter, previewSetter) => (file) => {
    setter(file);
    const reader = new FileReader();
    reader.onload = (e) => previewSetter(e.target.result);
    reader.readAsDataURL(file);
  };

  const run = async () => {
    if (!sourceFile || !targetFile) return setMsg("Upload both images");
    setStatus("processing"); setResult(null); setMsg("");
    try {
      const fd = new FormData();
      fd.append("source", sourceFile);
      fd.append("target", targetFile);
      const res = await fetch("/api/tools/faceswap", {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd
      });
      const data = await res.json();
      if (data.url) { setResult(data.url); setStatus("success"); }
      else throw new Error(data.error);
    } catch (e) { setStatus("error"); setMsg(e.message); }
  };

  return (
    <div>
      <div style={{ color: "#aaa", fontSize: 13, marginBottom: 16 }}>
        Upload a <b style={{ color: "#FF00FF" }}>face image</b> and a <b style={{ color: "#00F2EA" }}>target scene</b> — AI swaps the face seamlessly.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <DropZone label="Drop FACE image here" onFile={setFile(setSourceFile, setSourcePreview)} preview={sourcePreview} icon="🧑" />
        <DropZone label="Drop TARGET image here" onFile={setFile(setTargetFile, setTargetPreview)} preview={targetPreview} icon="🖼️" />
      </div>
      {msg && <div style={{ color: "#FF4500", fontSize: 13, marginTop: 8 }}>{msg}</div>}
      <button onClick={run} style={btnStyle}>🎭 Swap Face</button>
      <StatusBar status={status} progress={msg} />
      <ResultImage url={result} label="Face Swapped Result" />
    </div>
  );
}

function RemoveBgPanel({ token }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);
  const [msg, setMsg] = useState("");

  const handleFile = (f) => {
    setFile(f);
    const r = new FileReader();
    r.onload = (e) => setPreview(e.target.result);
    r.readAsDataURL(f);
  };

  const run = async () => {
    if (!file) return;
    setStatus("processing"); setResult(null); setMsg("");
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/tools/remove-bg", {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd
      });
      if (!res.ok) throw new Error("Processing failed");
      const blob = await res.blob();
      setResult(URL.createObjectURL(blob));
      setStatus("success");
    } catch (e) { setStatus("error"); setMsg(e.message); }
  };

  return (
    <div>
      <div style={{ color: "#aaa", fontSize: 13, marginBottom: 16 }}>
        Remove image background instantly. Perfect for product shots, creator portraits, and compositing.
      </div>
      <DropZone label="Drop image here to remove background" onFile={handleFile} preview={preview} />
      <button onClick={run} style={btnStyle} disabled={!file}>✂️ Remove Background</button>
      <StatusBar status={status} progress={msg} />
      <ResultImage url={result} label="Background Removed" />
    </div>
  );
}

function UpscalePanel({ token }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [scale, setScale] = useState(4);
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);
  const [msg, setMsg] = useState("");
  const [mode, setMode] = useState("upscale");

  const handleFile = (f) => {
    setFile(f);
    const r = new FileReader();
    r.onload = (e) => setPreview(e.target.result);
    r.readAsDataURL(f);
  };

  const run = async () => {
    if (!file) return;
    setStatus("processing"); setResult(null); setMsg("");
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("scale", scale);
      const endpoint = mode === "face" ? "/api/tools/enhance-face" : "/api/tools/upscale";
      const res = await fetch(endpoint, {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd
      });
      if (!res.ok) throw new Error("Processing failed");
      const blob = await res.blob();
      setResult(URL.createObjectURL(blob));
      setStatus("success");
    } catch (e) { setStatus("error"); setMsg(e.message); }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[["upscale", "🔭 Upscale Image"], ["face", "✨ Face Enhance"]].map(([id, label]) => (
          <button key={id} onClick={() => setMode(id)} style={{
            ...tabBtnStyle, background: mode === id ? "linear-gradient(135deg,#FF00FF,#00F2EA)" : "transparent",
            color: mode === id ? "#000" : "#888"
          }}>{label}</button>
        ))}
      </div>
      {mode === "upscale" && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {[2, 4].map(s => (
            <button key={s} onClick={() => setScale(s)} style={{
              ...scaleBtn, border: scale === s ? "1px solid #FF00FF" : "1px solid #333",
              color: scale === s ? "#FF00FF" : "#888"
            }}>{s}x</button>
          ))}
        </div>
      )}
      <DropZone label="Drop image to enhance" onFile={handleFile} preview={preview} />
      <button onClick={run} style={btnStyle} disabled={!file}>
        {mode === "face" ? "✨ Enhance Face" : `🔭 Upscale ${scale}x`}
      </button>
      <StatusBar status={status} progress={msg} />
      <ResultImage url={result} label="Enhanced Result" />
    </div>
  );
}

function BulkPanel({ token }) {
  const [prompts, setPrompts] = useState("A beautiful AI influencer in Paris, golden hour\nFashion shoot, luxury lifestyle, NYC rooftop\nFitness content, sunrise beach workout\nBeauty tutorial setup, ring light, glamorous");
  const [status, setStatus] = useState(null);
  const [results, setResults] = useState([]);
  const [progress, setProgress] = useState("");

  const run = async () => {
    const lines = prompts.split("\n").filter(p => p.trim());
    if (!lines.length) return;
    setStatus("processing"); setResults([]); setProgress(`0/${lines.length}`);
    try {
      const res = await fetch("/api/tools/bulk-generate", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ prompts: lines.map(p => ({ prompt: p })), concurrency: 3 })
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        chunk.split("\n").filter(l => l.startsWith("data:")).forEach(line => {
          try {
            const data = JSON.parse(line.slice(5));
            if (data.done) { setStatus("success"); setProgress(`${data.succeeded}/${data.total} generated`); }
            else if (data.result) { setResults(r => [...r, data.result]); setProgress(`${data.completed}/${lines.length}`); }
          } catch {}
        });
      }
    } catch (e) { setStatus("error"); setProgress(e.message); }
  };

  return (
    <div>
      <div style={{ color: "#aaa", fontSize: 13, marginBottom: 12 }}>
        Enter one prompt per line. All images generated in parallel.
      </div>
      <textarea
        value={prompts}
        onChange={e => setPrompts(e.target.value)}
        rows={6}
        style={{
          width: "100%", background: "#111", border: "1px solid #333",
          borderRadius: 8, padding: 12, color: "#fff", fontSize: 13,
          resize: "vertical", boxSizing: "border-box"
        }}
        placeholder="One prompt per line..."
      />
      <div style={{ color: "#555", fontSize: 12, marginTop: 4 }}>
        {prompts.split("\n").filter(p => p.trim()).length} prompts
      </div>
      <button onClick={run} style={btnStyle}>⚡ Generate All</button>
      <StatusBar status={status} progress={progress} />
      {results.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 16 }}>
          {results.map((r, i) => (
            <div key={i} style={{ position: "relative" }}>
              <img src={r.path || r.url} alt={`result ${i}`}
                style={{ width: "100%", borderRadius: 8, border: "1px solid #222" }} />
              <div style={{ fontSize: 11, color: "#555", marginTop: 4, noWrap: true, overflow: "hidden", textOverflow: "ellipsis" }}>
                {r.prompt?.slice(0, 40)}...
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VariationsPanel({ token }) {
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState(6);
  const [status, setStatus] = useState(null);
  const [results, setResults] = useState([]);
  const [msg, setMsg] = useState("");

  const run = async () => {
    if (!prompt.trim()) return;
    setStatus("processing"); setResults([]); setMsg("");
    try {
      const res = await fetch("/api/tools/variations", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, count })
      });
      const data = await res.json();
      if (data.results) { setResults(data.results); setStatus("success"); }
      else throw new Error(data.error);
    } catch (e) { setStatus("error"); setMsg(e.message); }
  };

  return (
    <div>
      <div style={{ color: "#aaa", fontSize: 13, marginBottom: 12 }}>
        Enter a base prompt — get {count} unique style variations automatically.
      </div>
      <input
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        placeholder="e.g. AI influencer Bella Rose in a luxury setting"
        style={inputStyle}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
        <span style={{ color: "#888", fontSize: 13 }}>Variations:</span>
        {[4, 6, 9].map(n => (
          <button key={n} onClick={() => setCount(n)} style={{
            ...scaleBtn, border: count === n ? "1px solid #FF00FF" : "1px solid #333",
            color: count === n ? "#FF00FF" : "#888"
          }}>{n}</button>
        ))}
      </div>
      <button onClick={run} style={btnStyle} disabled={!prompt.trim()}>🔀 Generate Variations</button>
      <StatusBar status={status} progress={msg} />
      {results.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 16 }}>
          {results.map((r, i) => (
            <img key={i} src={r.path || r.url} alt={`v${i+1}`}
              style={{ width: "100%", borderRadius: 8, border: "1px solid #222", aspectRatio: "1" }} />
          ))}
        </div>
      )}
    </div>
  );
}

function ModelsPanel() {
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("all");

  const categories = ["all", "Premium", "Photorealistic", "Fast", "Free", "Artistic", "Anime"];
  const filtered = filter === "all" ? MODELS_LIST : MODELS_LIST.filter(m => m.category === filter);

  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {categories.map(c => (
          <button key={c} onClick={() => setFilter(c)} style={{
            padding: "4px 12px", borderRadius: 20, fontSize: 12, cursor: "pointer",
            background: filter === c ? "linear-gradient(135deg,#FF00FF,#00F2EA)" : "transparent",
            border: filter === c ? "none" : "1px solid #333",
            color: filter === c ? "#000" : "#888", fontWeight: filter === c ? 700 : 400
          }}>{c}</button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {filtered.map(m => (
          <div key={m.id} onClick={() => setSelected(m.id === selected ? null : m.id)}
            style={{
              background: selected === m.id ? `rgba(${m.color === "#FF00FF" ? "255,0,255" : "0,242,234"},0.08)` : "#111",
              border: `1px solid ${selected === m.id ? m.color : "#222"}`,
              borderRadius: 10, padding: 14, cursor: "pointer",
              transition: "all 0.2s", position: "relative", overflow: "hidden"
            }}>
            {m.badge && (
              <span style={{
                position: "absolute", top: 8, right: 8,
                background: m.badge === "FREE" ? "#00F2EA" : m.badge === "BEST" || m.badge === "TOP" ? "#FF00FF" : "#FF4500",
                color: "#000", fontSize: 9, fontWeight: 900, padding: "2px 6px", borderRadius: 4
              }}>{m.badge}</span>
            )}
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{m.name}</div>
            <div style={{ color: m.color, fontSize: 11, marginTop: 2 }}>{m.category}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6 }}>
              {"★★★★★".slice(0, Math.round(m.rating)).split("").map((s, i) => (
                <span key={i} style={{ color: "#FFD700", fontSize: 12 }}>★</span>
              ))}
              <span style={{ color: "#555", fontSize: 11 }}>{m.rating}</span>
            </div>
          </div>
        ))}
      </div>
      {selected && (
        <div style={{ marginTop: 16, background: "#111", border: "1px solid #333", borderRadius: 10, padding: 14 }}>
          <div style={{ color: "#888", fontSize: 13 }}>Selected: <b style={{ color: "#FF00FF" }}>{selected}</b></div>
          <div style={{ color: "#555", fontSize: 12, marginTop: 4 }}>Use model ID in generation requests via API</div>
          <div style={{
            background: "#0a0a0a", borderRadius: 6, padding: 10, marginTop: 8,
            fontFamily: "monospace", fontSize: 12, color: "#00F2EA"
          }}>
            {`POST /api/generate/image\n{ "prompt": "...", "model": "${selected}" }`}
          </div>
        </div>
      )}
    </div>
  );
}

function InpaintPanel({ token }) {
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState(null);
  const [msg, setMsg] = useState("");

  const handleFile = (f) => {
    setImageFile(f);
    const r = new FileReader();
    r.onload = (e) => setImagePreview(e.target.result);
    r.readAsDataURL(f);
  };

  return (
    <div>
      <div style={{ color: "#aaa", fontSize: 13, marginBottom: 12 }}>
        Upload an image and describe what to change in a specific area.
      </div>
      <DropZone label="Drop image to edit" onFile={handleFile} preview={imagePreview} />
      <input value={prompt} onChange={e => setPrompt(e.target.value)}
        placeholder="What to add/change e.g. 'replace background with tropical beach'" style={{ ...inputStyle, marginTop: 12 }} />
      <div style={{
        background: "#111", border: "1px solid #333", borderRadius: 8,
        padding: 12, marginTop: 12, color: "#555", fontSize: 12
      }}>
        💡 <b style={{ color: "#FF00FF" }}>Pro tip:</b> For precise inpainting, use the mask endpoint via API — draw a white mask over the area you want to edit.
      </div>
      <button onClick={() => setStatus("processing")} style={btnStyle} disabled={!imageFile || !prompt}>
        🖌️ Inpaint Region
      </button>
      <StatusBar status={status} progress={msg} />
    </div>
  );
}

function StylePanel({ token }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [strength, setStrength] = useState(0.8);
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);
  const [msg, setMsg] = useState("");

  const handleFile = (f) => {
    setFile(f);
    const r = new FileReader();
    r.onload = (e) => setPreview(e.target.result);
    r.readAsDataURL(f);
  };

  const run = async () => {
    if (!file || !prompt) return;
    setStatus("processing"); setResult(null); setMsg("");
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("prompt", prompt);
      fd.append("strength", strength);
      const res = await fetch("/api/tools/style-transfer", {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd
      });
      const data = await res.json();
      if (data.output) { setResult(data.output[0]); setStatus("success"); }
      else throw new Error(data.error);
    } catch (e) { setStatus("error"); setMsg(e.message); }
  };

  const STYLES = ["Anime", "Oil Painting", "Watercolor", "Cyberpunk", "Studio Ghibli", "Comic Book"];

  return (
    <div>
      <DropZone label="Drop content image" onFile={handleFile} preview={preview} />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
        {STYLES.map(s => (
          <button key={s} onClick={() => setPrompt(s + " style, highly detailed")} style={{
            padding: "4px 10px", borderRadius: 16, fontSize: 12, cursor: "pointer",
            background: prompt.startsWith(s) ? "linear-gradient(135deg,#FF00FF,#00F2EA)" : "#111",
            border: prompt.startsWith(s) ? "none" : "1px solid #333",
            color: prompt.startsWith(s) ? "#000" : "#888"
          }}>{s}</button>
        ))}
      </div>
      <input value={prompt} onChange={e => setPrompt(e.target.value)}
        placeholder="Style description e.g. 'anime, studio ghibli, painterly'" style={{ ...inputStyle, marginTop: 12 }} />
      <div style={{ marginTop: 10 }}>
        <span style={{ color: "#888", fontSize: 12 }}>Strength: {strength}</span>
        <input type="range" min="0.3" max="1" step="0.1" value={strength}
          onChange={e => setStrength(parseFloat(e.target.value))}
          style={{ width: "100%", marginTop: 4, accentColor: "#FF00FF" }} />
      </div>
      <button onClick={run} style={btnStyle} disabled={!file || !prompt}>🎨 Apply Style</button>
      <StatusBar status={status} progress={msg} />
      <ResultImage url={result} label="Style Transfer Result" />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────

const PANEL_COMPONENTS = {
  "faceswap": FaceSwapPanel,
  "remove-bg": RemoveBgPanel,
  "upscale": UpscalePanel,
  "enhance-face": UpscalePanel,
  "inpaint": InpaintPanel,
  "pose": InpaintPanel,
  "style-transfer": StylePanel,
  "bulk": BulkPanel,
  "variations": VariationsPanel,
  "models": ModelsPanel,
};

export default function ToolsStudio({ token }) {
  const [activeTool, setActiveTool] = useState("faceswap");
  const ActivePanel = PANEL_COMPONENTS[activeTool] || ModelsPanel;

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0a0a0a", color: "#fff", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;900&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #333; }
        button:disabled { opacity: 0.4; cursor: not-allowed; }
      `}</style>

      {/* Sidebar */}
      <div style={{
        width: 220, background: "#0d0d0d", borderRight: "1px solid #1a1a1a",
        padding: "20px 0", overflowY: "auto", flexShrink: 0
      }}>
        <div style={{ padding: "0 16px 20px", borderBottom: "1px solid #1a1a1a" }}>
          <div style={{
            fontSize: 11, fontWeight: 900, letterSpacing: 3,
            background: "linear-gradient(135deg,#FF00FF,#00F2EA)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
          }}>TOOLS STUDIO</div>
          <div style={{ color: "#444", fontSize: 11, marginTop: 2 }}>SeaArt-level features</div>
        </div>
        <div style={{ padding: "12px 8px" }}>
          {TOOLS.map(tool => (
            <button key={tool.id} onClick={() => setActiveTool(tool.id)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", borderRadius: 8, cursor: "pointer",
              background: activeTool === tool.id ? "rgba(255,0,255,0.1)" : "transparent",
              border: activeTool === tool.id ? "1px solid rgba(255,0,255,0.3)" : "1px solid transparent",
              color: activeTool === tool.id ? "#fff" : "#666",
              textAlign: "left", marginBottom: 2, transition: "all 0.15s"
            }}>
              <span style={{ fontSize: 18 }}>{tool.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: activeTool === tool.id ? 700 : 400, display: "flex", alignItems: "center", gap: 6 }}>
                  {tool.label}
                  {tool.badge && (
                    <span style={{
                      fontSize: 8, fontWeight: 900, padding: "1px 5px", borderRadius: 3,
                      background: tool.badge === "NEW" ? "#00F2EA" : "#FF00FF", color: "#000"
                    }}>{tool.badge}</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Panel */}
      <div style={{ flex: 1, overflowY: "auto", padding: 28 }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 32 }}>{TOOLS.find(t => t.id === activeTool)?.icon}</span>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 900 }}>
                {TOOLS.find(t => t.id === activeTool)?.label}
              </h1>
              <div style={{ color: "#555", fontSize: 13, marginTop: 2 }}>
                {TOOLS.find(t => t.id === activeTool)?.desc}
              </div>
            </div>
          </div>
          <div style={{ height: 1, background: "linear-gradient(to right, #FF00FF22, transparent)", marginTop: 16 }} />
        </div>

        {/* Active Tool Panel */}
        <div style={{ maxWidth: 560 }}>
          <ActivePanel token={token} />
        </div>
      </div>
    </div>
  );
}

// ── Shared Styles ─────────────────────────────────────────────────

const btnStyle = {
  width: "100%", marginTop: 14, padding: "12px 0",
  background: "linear-gradient(135deg, #FF00FF, #00F2EA)",
  border: "none", borderRadius: 10, color: "#000",
  fontWeight: 900, fontSize: 14, cursor: "pointer",
  letterSpacing: 0.5, transition: "opacity 0.2s"
};

const tabBtnStyle = {
  padding: "7px 16px", borderRadius: 8, border: "1px solid #333",
  cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all 0.15s"
};

const scaleBtn = {
  padding: "4px 14px", borderRadius: 6, background: "transparent",
  cursor: "pointer", fontSize: 13, fontWeight: 600
};

const inputStyle = {
  width: "100%", background: "#111", border: "1px solid #333",
  borderRadius: 8, padding: "10px 14px", color: "#fff",
  fontSize: 13, outline: "none"
};
