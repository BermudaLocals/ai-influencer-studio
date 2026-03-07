import { useState } from "react";
const API = "https://ai-influencer-studio-production.up.railway.app/api";

export default function Settings({ token, onLogout }) {
  const [keys, setKeys] = useState({ openrouter: "", elevenlabs: "", kling: "", stability: "", stripe: "", google_maps: "" });
  const [saved, setSaved] = useState(false);

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const plans = [
    { id: "starter", name: "Starter", price: "$29/mo", features: ["1 AI Influencer", "30 posts/month", "100 leads/month", "Basic analytics"] },
    { id: "pro", name: "Pro", price: "$97/mo", features: ["5 AI Influencers", "Unlimited posts", "500 leads/month", "Advanced analytics", "Music Studio"] },
    { id: "agency", name: "Agency", price: "$297/mo", features: ["Unlimited Influencers", "White-label dashboard", "Unlimited leads", "Client billing", "Priority support"] },
  ];

  const upgrade = async (plan) => {
    const res = await fetch(`${API}/billing/checkout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ plan })
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">⚙️ Settings</h2>

      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-4">
        <h3 className="font-semibold">API Keys</h3>
        {[
          { key: "openrouter", label: "OpenRouter API Key", placeholder: "sk-or-..." },
          { key: "elevenlabs", label: "ElevenLabs API Key", placeholder: "el-..." },
          { key: "kling", label: "Kling AI API Key", placeholder: "kling-..." },
          { key: "stability", label: "Stability AI API Key", placeholder: "sk-..." },
          { key: "stripe", label: "Stripe Secret Key", placeholder: "sk_..." },
          { key: "google_maps", label: "Google Maps API Key", placeholder: "AIza..." },
        ].map(f => (
          <div key={f.key}>
            <label className="text-sm text-gray-400 mb-1 block">{f.label}</label>
            <input type="password" placeholder={f.placeholder} value={keys[f.key]}
              onChange={e => setKeys({...keys, [f.key]: e.target.value})}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
          </div>
        ))}
        <button onClick={save} className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-6 py-2 rounded-lg transition">
          {saved ? "✅ Saved!" : "Save Keys"}
        </button>
      </div>

      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <h3 className="font-semibold mb-4">Subscription Plans</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map(p => (
            <div key={p.id} className={`rounded-xl p-5 border ${p.id === "pro" ? "border-purple-500 bg-purple-900/20" : "border-gray-700 bg-gray-800"}`}>
              {p.id === "pro" && <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full mb-2 inline-block">Most Popular</span>}
              <h4 className="font-bold text-white text-lg">{p.name}</h4>
              <p className="text-2xl font-bold text-purple-400 my-2">{p.price}</p>
              <ul className="space-y-1 mb-4">
                {p.features.map(f => <li key={f} className="text-sm text-gray-400 flex items-center gap-2"><span className="text-green-400">✓</span>{f}</li>)}
              </ul>
              <button onClick={() => upgrade(p.id)}
                className={`w-full py-2 rounded-lg text-sm font-semibold transition ${p.id === "pro" ? "bg-purple-600 hover:bg-purple-500 text-white" : "bg-gray-700 hover:bg-gray-600 text-white"}`}>
                Upgrade to {p.name}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <h3 className="font-semibold mb-4 text-red-400">Danger Zone</h3>
        <button onClick={onLogout} className="bg-red-900 hover:bg-red-800 text-red-300 font-semibold px-6 py-2 rounded-lg transition">
          Sign Out
        </button>
      </div>
    </div>
  );
}
