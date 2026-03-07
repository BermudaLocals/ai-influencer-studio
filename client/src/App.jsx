import { useState, useEffect } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AvatarStudio from "./pages/AvatarStudio";
import ContentEngine from "./pages/ContentEngine";
import PublishingHub from "./pages/PublishingHub";
import Monetization from "./pages/Monetization";
import LeadScraper from "./pages/LeadScraper";
import MusicStudio from "./pages/MusicStudio";
import Settings from "./pages/Settings";
import Sidebar from "./components/Sidebar";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [page, setPage] = useState("dashboard");

  useEffect(() => {
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
  }, [token]);

  if (!token) return <Login onLogin={setToken} />;

  const pages = {
    dashboard: <Dashboard token={token} />,
    avatars: <AvatarStudio token={token} />,
    content: <ContentEngine token={token} />,
    publish: <PublishingHub token={token} />,
    monetization: <Monetization token={token} />,
    leads: <LeadScraper token={token} />,
    music: <MusicStudio token={token} />,
    settings: <Settings token={token} onLogout={() => setToken(null)} />,
  };

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      <Sidebar page={page} setPage={setPage} />
      <main className="flex-1 overflow-y-auto p-6">{pages[page]}</main>
    </div>
  );
}
