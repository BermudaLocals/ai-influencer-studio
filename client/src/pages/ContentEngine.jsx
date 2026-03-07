import { useState, useEffect } from "react";
const API = "https://ai-influencer-studio-production.up.railway.app/api";

export default function ContentEngine({ token }) {
  const [step, setStep] = useState(1);
  const [influencers, setInfluencers] = useState([]);
  const [form, setForm] = useState({ influencer_id: "", topic: "", platform: "tiktok" });
  const [script, setScript] = useState("");
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(false);
  const h = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  useEffect(() => {
    fetch(`${API}/avatars`, { headers: h }).then(r => r.json()).then(setInfluencers);
  }, []);

  const generateScript = async () => {
    setLoading(true);
    const res = await fetch(`${API}/content/script`, { method: "POST", headers: h, body: JSON.stringify(form) });
    const data = await res.json();
    setScript(data.script);
    setStep(2);
    setLoading(false);
  };

  const generateVideo = async () => {
    setLoading(true);
    const res = await fetch(`${API}/content/video`, { method: "POST", headers: h, body: JSON.stringify({ ...form, script }) });
    const data = await res.json();
    setJob(data);
    setStep(3);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Content Engine</h2>
      <div className="flex gap-2">
        {["1. Pick Influencer", "2. Write Script", "3. Generate Video"].map((s, i) => (
          <div key={s} className={`flex-1 text-center py-2 rounded-lg text-sm font-medium ${step === i+1 ? "bg-purple-600 text-white" : step > i+1 ? "bg-green-700 text-white" : "bg-gray-800 text-gray-400"}`}>{s}</div>
        ))}
      </div>

      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Step 1: Choose Influencer & Topic</h3>
            <select value={form.influencer_id} onChange={e => setForm({...form, influencer_id: e.target.value})}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white">
              <option value="">Select AI Influencer</option>
              {influencers.map(i => <option key={i.id} value={i.id}>{i.name} — {i.niche}</option>)}
            </select>
            <input placeholder="Content topic (e.g. 5 ways to save money in 2026)" value={form.topic}
              onChange={e => setForm({...form, topic: e.target.value})}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500" />
            <div className="flex gap-2">
              {["tiktok", "instagram", "youtube"].map(p => (
                <button key={p} onClick={() => setForm({...form, platform: p})}
                  className={`flex-1 py-2 rounded-lg text-sm capitalize font-medium transition ${form.platform === p ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}>{p}</button>
              ))}
            </div>
            <button onClick={generateScript} disabled={loading || !form.influencer_id || !form.topic}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 rounded-lg disabled:opacity-50">
              {loading ? "Writing Script..." : "✍️ Generate Script with AI"}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Step 2: Review & Edit Script</h3>
            <textarea value={script} onChange={e => setScript(e.target.value)} rows={12}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm resize-none" />
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 bg-gray-800 text-white py-3 rounded-lg">← Back</button>
              <button onClick={generateVideo} disabled={loading}
                className="flex-2 flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 rounded-lg disabled:opacity-50">
                {loading ? "Generating Video..." : "🎬 Generate Video"}
              </button>
            </div>
          </div>
        )}

        {step === 3 && job && (
          <div className="space-y-4 text-center">
            <div className="text-6xl">🎬</div>
            <h3 className="font-semibold text-green-400">Video Ready!</h3>
            <p className="text-gray-400 text-sm">Your content has been generated and is ready to publish.</p>
            {job.video_url && <video src={job.video_url} controls className="w-full rounded-lg mt-4" />}
            {job.thumbnail_url && <img src={job.thumbnail_url} alt="Thumbnail" className="w-full rounded-lg" />}
            <div className="flex gap-3">
              <button onClick={() => { setStep(1); setJob(null); setScript(""); }}
                className="flex-1 bg-gray-800 text-white py-3 rounded-lg">New Content</button>
              <a href={job.video_url} download className="flex-1 bg-green-600 text-white py-3 rounded-lg text-center">⬇️ Download</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
