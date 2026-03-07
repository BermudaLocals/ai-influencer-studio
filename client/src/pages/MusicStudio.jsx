import { useState, useEffect } from "react";
const API = "https://ai-influencer-studio-production.up.railway.app/api";

export default function MusicStudio({ token }) {
  const [tracks, setTracks] = useState([]);
  const [influencers, setInfluencers] = useState([]);
  const [form, setForm] = useState({ prompt: "", genre: "hip-hop", mood: "energetic", duration: 30, influencer_id: "", title: "" });
  const [lyrics, setLyrics] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("generate");
  const h = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  useEffect(() => {
    fetch(`${API}/music`, { headers: h }).then(r => r.json()).then(setTracks);
    fetch(`${API}/avatars`, { headers: h }).then(r => r.json()).then(setInfluencers);
  }, []);

  const generate = async () => {
    setLoading(true);
    const res = await fetch(`${API}/music/generate`, { method: "POST", headers: h, body: JSON.stringify(form) });
    const data = await res.json();
    setTracks([data, ...tracks]);
    setLoading(false);
  };

  const generateLyrics = async () => {
    setLoading(true);
    const res = await fetch(`${API}/music/lyrics`, { method: "POST", headers: h, body: JSON.stringify(form) });
    const data = await res.json();
    setLyrics(data.lyrics);
    setLoading(false);
  };

  const genres = ["hip-hop", "afrobeats", "pop", "rnb", "trap", "lo-fi", "electronic", "reggaeton"];
  const moods = ["energetic", "chill", "hype", "emotional", "motivational", "romantic", "dark", "playful"];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">🎵 Music Studio</h2>
      <p className="text-gray-400 text-sm">Generate original AI music, beats, lyrics and jingles for your influencers.</p>

      <div className="flex gap-2">
        {["generate", "lyrics", "library"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition ${tab === t ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}>{t}</button>
        ))}
      </div>

      {tab === "generate" && (
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-4">
          <h3 className="font-semibold">Generate Music Track</h3>
          <input placeholder="Music description (e.g. viral intro beat for fashion influencer)" value={form.prompt}
            onChange={e => setForm({...form, prompt: e.target.value})}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500" />
          <input placeholder="Track Title" value={form.title}
            onChange={e => setForm({...form, title: e.target.value})}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-2 block">Genre</label>
              <div className="flex flex-wrap gap-2">
                {genres.map(g => (
                  <button key={g} onClick={() => setForm({...form, genre: g})}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition ${form.genre === g ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}>{g}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-2 block">Mood</label>
              <div className="flex flex-wrap gap-2">
                {moods.map(m => (
                  <button key={m} onClick={() => setForm({...form, mood: m})}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition ${form.mood === m ? "bg-pink-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}>{m}</button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Duration: {form.duration}s</label>
            <input type="range" min="10" max="120" value={form.duration}
              onChange={e => setForm({...form, duration: parseInt(e.target.value)})}
              className="w-full accent-purple-500" />
          </div>
          <select value={form.influencer_id} onChange={e => setForm({...form, influencer_id: e.target.value})}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white">
            <option value="">Assign to influencer (optional)</option>
            {influencers.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
          <button onClick={generate} disabled={loading || !form.prompt}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 rounded-lg disabled:opacity-50">
            {loading ? "Generating..." : "🎵 Generate Music"}
          </button>
        </div>
      )}

      {tab === "lyrics" && (
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-4">
          <h3 className="font-semibold">AI Lyric Writer</h3>
          <input placeholder="Song topic (e.g. hustle, love, flexing, motivation)" value={form.prompt}
            onChange={e => setForm({...form, prompt: e.target.value})}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500" />
          <select value={form.influencer_id} onChange={e => setForm({...form, influencer_id: e.target.value})}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white">
            <option value="">Select Influencer Voice</option>
            {influencers.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
          <button onClick={generateLyrics} disabled={loading || !form.prompt}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 rounded-lg disabled:opacity-50">
            {loading ? "Writing Lyrics..." : "✍️ Write Lyrics"}
          </button>
          {lyrics && (
            <textarea value={lyrics} onChange={e => setLyrics(e.target.value)} rows={15}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm resize-none" />
          )}
        </div>
      )}

      {tab === "library" && (
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h3 className="font-semibold mb-4">Music Library ({tracks.length} tracks)</h3>
          {tracks.length === 0 ? (
            <p className="text-gray-500 text-sm">No tracks yet. Generate your first one!</p>
          ) : (
            <div className="space-y-3">
              {tracks.map(t => (
                <div key={t.id} className="bg-gray-800 rounded-lg p-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-lg">🎵</div>
                  <div className="flex-1">
                    <p className="font-medium text-white">{t.title}</p>
                    <p className="text-xs text-gray-400">{t.genre} · {t.mood} · {t.duration}s</p>
                  </div>
                  {t.file_url && <audio controls src={t.file_url} className="h-8" />}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
