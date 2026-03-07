import { useState, useEffect } from "react";
const API = "https://ai-influencer-studio-production.up.railway.app/api";

export default function Monetization({ token }) {
  const [summary, setSummary] = useState(null);
  const [deals, setDeals] = useState([]);
  const [affiliates, setAffiliates] = useState([]);
  const [tab, setTab] = useState("overview");
  const [dealForm, setDealForm] = useState({ brand_name: "", contact_email: "", value: "", deadline: "", notes: "" });
  const [affForm, setAffForm] = useState({ label: "", url: "" });
  const h = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  useEffect(() => {
    fetch(`${API}/monetization/summary`, { headers: h }).then(r => r.json()).then(setSummary);
    fetch(`${API}/monetization/deals`, { headers: h }).then(r => r.json()).then(setDeals);
    fetch(`${API}/monetization/affiliates`, { headers: h }).then(r => r.json()).then(setAffiliates);
  }, []);

  const addDeal = async () => {
    const res = await fetch(`${API}/monetization/deals`, { method: "POST", headers: h, body: JSON.stringify(dealForm) });
    const data = await res.json();
    setDeals([data, ...deals]);
    setDealForm({ brand_name: "", contact_email: "", value: "", deadline: "", notes: "" });
  };

  const addAffiliate = async () => {
    const res = await fetch(`${API}/monetization/affiliates`, { method: "POST", headers: h, body: JSON.stringify(affForm) });
    const data = await res.json();
    setAffiliates([data, ...affiliates]);
    setAffForm({ label: "", url: "" });
  };

  const statusColors = { pending: "text-yellow-400", active: "text-blue-400", paid: "text-green-400", cancelled: "text-red-400" };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">💰 Monetization</h2>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Revenue", value: `$${summary.total}`, color: "from-green-500 to-emerald-600" },
            { label: "Brand Deals", value: `$${summary.deals_revenue}`, color: "from-blue-500 to-cyan-600" },
            { label: "Affiliates", value: `$${summary.affiliate_revenue}`, color: "from-purple-500 to-violet-600" },
            { label: "Post Revenue", value: `$${summary.posts_revenue}`, color: "from-orange-500 to-amber-600" },
          ].map(s => (
            <div key={s.label} className="bg-gray-900 rounded-xl p-5 border border-gray-800">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${s.color} mb-3`} />
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-gray-400 text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        {["overview", "deals", "affiliates"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${tab === t ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}>{t}</button>
        ))}
      </div>

      {tab === "deals" && (
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-3">
            <h3 className="font-semibold">Add Brand Deal</h3>
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Brand Name" value={dealForm.brand_name} onChange={e => setDealForm({...dealForm, brand_name: e.target.value})}
                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 w-full" />
              <input placeholder="Contact Email" value={dealForm.contact_email} onChange={e => setDealForm({...dealForm, contact_email: e.target.value})}
                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 w-full" />
              <input placeholder="Value ($)" type="number" value={dealForm.value} onChange={e => setDealForm({...dealForm, value: e.target.value})}
                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 w-full" />
              <input placeholder="Deadline" type="date" value={dealForm.deadline} onChange={e => setDealForm({...dealForm, deadline: e.target.value})}
                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white w-full" />
            </div>
            <button onClick={addDeal} className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-6 py-2 rounded-lg">Add Deal</button>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-800"><tr>{["Brand","Contact","Value","Status","Deadline"].map(h => <th key={h} className="text-left px-4 py-3 text-gray-400">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-800">
                {deals.map(d => (
                  <tr key={d.id} className="hover:bg-gray-800/50">
                    <td className="px-4 py-3 font-medium text-white">{d.brand_name}</td>
                    <td className="px-4 py-3 text-gray-400">{d.contact_email}</td>
                    <td className="px-4 py-3 text-green-400 font-semibold">${d.value}</td>
                    <td className="px-4 py-3 capitalize"><span className={statusColors[d.status]}>{d.status}</span></td>
                    <td className="px-4 py-3 text-gray-400">{d.deadline ? new Date(d.deadline).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "affiliates" && (
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-3">
            <h3 className="font-semibold">Add Affiliate Link</h3>
            <div className="flex gap-3">
              <input placeholder="Label (e.g. Amazon Fashion)" value={affForm.label} onChange={e => setAffForm({...affForm, label: e.target.value})}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500" />
              <input placeholder="URL" value={affForm.url} onChange={e => setAffForm({...affForm, url: e.target.value})}
                className="flex-2 flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500" />
              <button onClick={addAffiliate} className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-6 py-3 rounded-lg">Add</button>
            </div>
          </div>
          <div className="space-y-3">
            {affiliates.map(a => (
              <div key={a.id} className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">{a.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">/track/{a.short_code}</p>
                </div>
                <div className="flex gap-6 text-center">
                  <div><p className="text-lg font-bold text-white">{a.clicks}</p><p className="text-xs text-gray-400">Clicks</p></div>
                  <div><p className="text-lg font-bold text-white">{a.conversions}</p><p className="text-xs text-gray-400">Conv.</p></div>
                  <div><p className="text-lg font-bold text-green-400">${a.earnings}</p><p className="text-xs text-gray-400">Earned</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
