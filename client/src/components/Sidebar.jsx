export default function Sidebar({ page, setPage }) {
  const nav = [
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    { id: "avatars", icon: "🤖", label: "Avatar Studio" },
    { id: "content", icon: "🎬", label: "Content Engine" },
    { id: "music", icon: "🎵", label: "Music Studio" },
    { id: "publish", icon: "📅", label: "Publishing Hub" },
    { id: "leads", icon: "🎯", label: "Lead Scraper" },
    { id: "monetization", icon: "💰", label: "Monetization" },
    { id: "settings", icon: "⚙️", label: "Settings" },
  ];

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          AI Influencer Studio
        </h1>
        <p className="text-xs text-gray-500 mt-1">@mosthigh_flava</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {nav.map((item) => (
          <button
            key={item.id}
            onClick={() => setPage(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              page === item.id
                ? "bg-purple-600 text-white"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-800">
        <div className="bg-gradient-to-r from-purple-900 to-pink-900 rounded-lg p-3">
          <p className="text-xs font-semibold text-purple-300">Upgrade to Agency</p>
          <p className="text-xs text-gray-400 mt-1">Unlimited influencers + white-label</p>
          <button className="mt-2 w-full bg-purple-500 hover:bg-purple-400 text-white text-xs py-1.5 rounded-md transition">
            Upgrade $297/mo
          </button>
        </div>
      </div>
    </aside>
  );
}
