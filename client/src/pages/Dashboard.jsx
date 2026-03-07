import { useState, useEffect } from "react";

const API = "https://ai-influencer-studio-production.up.railway.app/api";

export default function Dashboard({ token }) {
  const [summary, setSummary] = useState(null);
  const [influencers, setInfluencers] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);

  useEffect(() => {
    const h = { Authorization: `Bearer ${token}` };
    fetch(`${API}/monetization/summary`, { headers: h }).then(r => r.json()).then(setSummary);
    fetch(`${API}/avatars`, { headers: h }).then(r => r.json()).then(setInfluencers);
  }, [token]);

  const stats = [
    { label: "Total Revenue", value: `$${summary?.total || "0"}`, icon: "💰", color: "from-green-500 to-emerald-600" },
    { label: "Active Influencers", value: influencers.length, icon: "🤖", color: "from-purple-500 to-violet-600" },
    { label: "Posts This Month", value: "0", icon: "📱", color: "from-blue-500 to-cyan-600" },
    { label: "Leads Pipeline", value: "0", icon: "🎯", color: "from-orange-500 to-amber-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Dashboard</h2>
        <p className="text-gray-400 text-sm mt-1">Welcome back — No Fluff, Max ROI 🔥</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center text-lg mb-3`}>
              {s.icon}
            </div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-gray-400 text-sm mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
        <h3 className="font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Create Influencer", icon: "🤖" },
            { label: "Generate Content", icon: "🎬" },
            { label: "Make Music", icon: "🎵" },
            { label: "Scrape Leads", icon: "🎯" },
          ].map((a) => (
            <button key={a.label} className="flex flex-col items-center gap-2 p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition">
              <span className="text-2xl">{a.icon}</span>
              <span className="text-xs text-gray-300">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Influencers */}
      <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
        <h3 className="font-semibold text-white mb-4">Your AI Influencers</h3>
        {influencers.length === 0 ? (
          <p className="text-gray-500 text-sm">No influencers yet. Create your first AI persona →</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {influencers.map((inf) => (
              <div key={inf.id} className="bg-gray-800 rounded-lg p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xl">
                  {inf.avatar_url ? <img src={inf.avatar_url} className="w-full h-full rounded-full object-cover" /> : "🤖"}
                </div>
                <div>
                  <p className="font-medium text-white">{inf.name}</p>
                  <p className="text-xs text-gray-400">{inf.niche}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
