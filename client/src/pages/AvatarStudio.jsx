import { useState, useEffect } from "react";
const API = "https://ai-influencer-studio-production.up.railway.app/api";

export default function AvatarStudio({ token }) {
  const [influencers, setInfluencers] = useState([]);
  const [form, setForm] = useState({ name: "", niche: "", personality_prompt: "", avatar_url: "", voice_id: "" });
  const [loading, setLoading] = useState(false);
  const h = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  useEffect(() => {
    fetch(`${API}/avatars`, { headers: h }).then(r => r.json()).then(setInfluencers);
  }, []);

  const create = async () => {
    setLoading(true);
    const res = await fetch(`${API}/avatars`, { method: "POST", headers: h, body: JSON.stringify(form) });
    const data = await res.json();
    setInfluencers([data, ...influencers]);
    setForm({ name: "", niche: "", personality_prompt: "", avatar_url: "", voice_id: "" });
    setLoading(false);
  };

  const niches = ["Fashion", "Tech", "Finance", "Fitness", "Food", "Travel", "Gaming", "Beauty", "Music", "Education"];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Avatar Studio</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-4">
          <h3 className="font-semibold text-white">Create AI Influencer</h3>
          <input placeholder="Influencer Name (e.g. Zara AI)" value={form.name}
            onChange={e => setForm({...form, name: e.target.value})}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
          <select value={form.niche} onChange={e => setForm({...form, niche: e.target.value})}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500">
            <option value="">Select Niche</option>
            {niches.map(n => <option key={n}>{n}</option>)}
          </select>
          <textarea placeholder="Personality (e.g. Confident, funny, speaks in Gen Z slang, loves streetwear...)"
            value={form.personality_prompt} onChange={e => setForm({...form, personality_prompt: e.target.value})}
            rows={3} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none" />
          <input placeholder="Avatar Image URL (or upload coming soon)" value={form.avatar_url}
            onChange={e => setForm({...form, avatar_url: e.target.value})}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
          <input placeholder="ElevenLabs Voice ID" value={form.voice_id}
            onChange={e => setForm({...form, voice_id: e.target.value})}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
          <button onClick={create} disabled={loading || !form.name}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50">
            {loading ? "Creating..." : "Create Influencer"}
          </button>
        </div>
        <div className="space-y-4">
          <h3 className="font-semibold text-white">Your Influencers ({influencers.length})</h3>
          {influencers.map(inf => (
            <div key={inf.id} className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl flex-shrink-0">
                {inf.avatar_url ? <img src={inf.avatar_url} className="w-full h-full rounded-full object-cover" /> : "🤖"}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white">{inf.name}</p>
                <p className="text-sm text-purple-400">{inf.niche}</p>
                <p className="text-xs text-gray-500 mt-1 line-clamp-1">{inf.personality_prompt}</p>
              </div>
            </div>
          ))}
          {influencers.length === 0 && <p className="text-gray-500 text-sm">No influencers yet. Create one!</p>}
        </div>
      </div>
    </div>
  );
}
