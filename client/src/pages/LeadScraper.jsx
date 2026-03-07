import { useState, useEffect } from "react";
const API = "https://ai-influencer-studio-production.up.railway.app/api";

export default function LeadScraper({ token }) {
  const [leads, setLeads] = useState([]);
  const [form, setForm] = useState({ niche: "", location: "", limit: 20 });
  const [loading, setLoading] = useState(false);
  const [pitch, setPitch] = useState({ id: null, text: "" });
  const [filter, setFilter] = useState("all");
  const h = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  useEffect(() => {
    fetch(`${API}/leads`, { headers: h }).then(r => r.json()).then(setLeads);
  }, []);

  const scrape = async () => {
    setLoading(true);
    const res = await fetch(`${API}/leads/scrape`, { method: "POST", headers: h, body: JSON.stringify(form) });
    const data = await res.json();
    setLeads(prev => [...data.leads, ...prev]);
    setLoading(false);
  };

  const updateStatus = async (id, status) => {
    await fetch(`${API}/leads/${id}`, { method: "PUT", headers: h, body: JSON.stringify({ status }) });
    setLeads(leads.map(l => l.id === id ? { ...l, status } : l));
  };

  const generatePitch = async (lead) => {
    const res = await fetch(`${API}/leads/${lead.id}/pitch`, { method: "POST", headers: h });
    const data = await res.json();
    setPitch({ id: lead.id, text: data.pitch });
  };

  const statuses = ["new", "contacted", "interested", "closed"];
  const filtered = filter === "all" ? leads : leads.filter(l => l.status === filter);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">🎯 Lead Scraper</h2>

      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <h3 className="font-semibold mb-4">Find New Leads</h3>
        <div className="flex gap-3">
          <input placeholder="Niche (e.g. restaurants, fashion brands)" value={form.niche}
            onChange={e => setForm({...form, niche: e.target.value})}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500" />
          <input placeholder="Location (e.g. Lagos Nigeria)" value={form.location}
            onChange={e => setForm({...form, location: e.target.value})}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500" />
          <select value={form.limit} onChange={e => setForm({...form, limit: parseInt(e.target.value)})}
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white">
            {[10,20,50,100].map(n => <option key={n} value={n}>{n} leads</option>)}
          </select>
          <button onClick={scrape} disabled={loading || !form.niche || !form.location}
            className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-6 py-3 rounded-lg disabled:opacity-50 whitespace-nowrap">
            {loading ? "Scraping..." : "🔍 Scrape"}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {["all", ...statuses].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm capitalize font-medium transition ${filter === s ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}>
              {s} {s === "all" ? `(${leads.length})` : `(${leads.filter(l => l.status === s).length})`}
            </button>
          ))}
        </div>
        <a href={`${API}/leads/export/csv`} className="bg-green-700 hover:bg-green-600 text-white text-sm px-4 py-2 rounded-lg transition">
          ⬇️ Export CSV
        </a>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-800">
            <tr>
              {["Business", "Contact", "Niche", "Location", "Status", "Actions"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-gray-400 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {filtered.map(lead => (
              <tr key={lead.id} className="hover:bg-gray-800/50 transition">
                <td className="px-4 py-3">
                  <p className="font-medium text-white">{lead.business_name}</p>
                  {lead.website && <a href={lead.website} target="_blank" className="text-xs text-purple-400 hover:underline">{lead.website}</a>}
                </td>
                <td className="px-4 py-3">
                  <p className="text-gray-300">{lead.email || "—"}</p>
                  <p className="text-gray-500 text-xs">{lead.phone || ""}</p>
                </td>
                <td className="px-4 py-3 text-gray-400">{lead.niche}</td>
                <td className="px-4 py-3 text-gray-400">{lead.location}</td>
                <td className="px-4 py-3">
                  <select value={lead.status} onChange={e => updateStatus(lead.id, e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white">
                    {statuses.map(s => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => generatePitch(lead)}
                    className="bg-purple-700 hover:bg-purple-600 text-white text-xs px-3 py-1.5 rounded transition">
                    ✉️ Pitch
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center text-gray-500 py-8">No leads found. Start scraping!</p>}
      </div>

      {pitch.text && (
        <div className="bg-gray-900 rounded-xl p-6 border border-purple-700">
          <div className="flex justify-between mb-3">
            <h3 className="font-semibold text-purple-400">AI Generated Pitch Email</h3>
            <button onClick={() => setPitch({ id: null, text: "" })} className="text-gray-500 hover:text-white">✕</button>
          </div>
          <pre className="text-sm text-gray-300 whitespace-pre-wrap">{pitch.text}</pre>
          <button onClick={() => navigator.clipboard.writeText(pitch.text)}
            className="mt-3 bg-gray-800 hover:bg-gray-700 text-white text-sm px-4 py-2 rounded-lg">
            📋 Copy
          </button>
        </div>
      )}
    </div>
  );
}
