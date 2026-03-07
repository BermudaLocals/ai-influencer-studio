import { useState, useEffect } from "react";
const API = "https://ai-influencer-studio-production.up.railway.app/api";

export default function PublishingHub({ token }) {
  const [posts, setPosts] = useState([]);
  const h = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch(`${API}/content`, { headers: h }).then(r => r.json()).then(setPosts);
  }, []);

  const platforms = [
    { id: "tiktok", label: "TikTok", color: "from-black to-pink-600", icon: "🎵" },
    { id: "instagram", label: "Instagram", color: "from-purple-600 to-pink-500", icon: "📸" },
    { id: "youtube", label: "YouTube", color: "from-red-600 to-red-800", icon: "▶️" },
  ];

  const statusColor = { ready: "text-green-400", pending: "text-yellow-400", published: "text-blue-400", failed: "text-red-400" };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">📅 Publishing Hub</h2>

      <div className="grid grid-cols-3 gap-4">
        {platforms.map(p => (
          <div key={p.id} className={`bg-gradient-to-br ${p.color} rounded-xl p-5 border border-gray-700`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{p.icon}</span>
              <span className="text-xs bg-black/30 px-2 py-1 rounded-full text-white">Not Connected</span>
            </div>
            <p className="font-semibold text-white">{p.label}</p>
            <button className="mt-3 w-full bg-white/20 hover:bg-white/30 text-white text-sm py-2 rounded-lg transition">
              Connect Account
            </button>
          </div>
        ))}
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800">
          <h3 className="font-semibold">Content Queue</h3>
        </div>
        {posts.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No content yet. Generate from Content Engine →</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-800"><tr>{["Influencer","Topic","Platform","Status","Scheduled"].map(h => <th key={h} className="text-left px-4 py-3 text-gray-400">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-800">
              {posts.map(p => (
                <tr key={p.id} className="hover:bg-gray-800/50">
                  <td className="px-4 py-3 text-white">{p.influencer_name || "—"}</td>
                  <td className="px-4 py-3 text-gray-300 max-w-xs truncate">{p.topic}</td>
                  <td className="px-4 py-3 capitalize text-purple-400">{p.platform}</td>
                  <td className="px-4 py-3 capitalize"><span className={statusColor[p.status]}>{p.status}</span></td>
                  <td className="px-4 py-3 text-gray-400">{p.scheduled_at ? new Date(p.scheduled_at).toLocaleString() : "Immediately"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
