import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { ChevronDown, AlertCircle, Zap, ShieldAlert } from "lucide-react";

import Navbar from "./components/Navbar";
import BinCard from "./components/BinCard";
import MapView from "./components/MapView";
import ControlPanel from "./components/ControlPanel";
import AgentPanel from "./components/AgentPanel";
import SavingsCard from "./components/SavingsCard";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";
const POLL_MS = 15000;

export default function App() {
  const [allBins, setAllBins] = useState([]);
  const [activeBin, setActiveBin] = useState(null);
  const [statuses, setStatuses] = useState({});
  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [threshold, setThreshold] = useState(70); 
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState(null);
  const [toastHidden, setToastHidden] = useState(false);

  // ── 1. Fetch Bins (UI & Depot logic) ──────────────────────────────────────
  const fetchAllBins = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/bin/all`);
      const allReturnedBins = res.data;
      const uiBins = allReturnedBins
        .filter(b => !b.toLowerCase().includes("depot"))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
      
      setAllBins(uiBins);
      if (uiBins.length > 0) setActiveBin((prev) => prev ?? uiBins[0]);
      return allReturnedBins;
    } catch { return []; }
  }, []);

  // ── 2. Master Sync Function ───────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const bins = await fetchAllBins();
      const results = await Promise.allSettled(bins.map((id) => axios.get(`${API_BASE}/bin/status/${id}`)));
      
      const map = {};
      results.forEach((r, i) => { if (r.status === "fulfilled") map[bins[i]] = r.value.data; });
      
      setStatuses(map);
      setIsLive(true);
      setError(null);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (e) {
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  }, [fetchAllBins]);

  // Initial Load & Polling
  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchData, POLL_MS);
    return () => clearInterval(id);
  }, [autoRefresh, fetchData]);

  // ── 3. Optimized Actions ──────────────────────────────────────────────────
  const handleOptimize = async () => {
    setOptimizing(true);
    try {
      const res = await axios.get(`${API_BASE}/optimize-route?threshold=${threshold}`);
      setRouteData(res.data);
      setError(null);
    } catch (err) {
      setError("Routing server offline. Using fallback cache.");
    } finally { setOptimizing(false); }
  };

  const handleSimulateAlert = async () => {
    if (!activeBin) return;
    setToastHidden(false);
    setStatuses(prev => ({ ...prev, [activeBin]: { ...prev[activeBin], fill_pct: 87, is_alert: true } }));
    try {
      await axios.post(`${API_BASE}/bin/update`, { bin_id: activeBin, fill_pct: 87, distance_cm: 15 });
    } catch (e) { console.error(e); }
  };

  const status = activeBin ? (statuses[activeBin] ?? null) : null;

  return (
    <div className="min-h-screen bg-[#05070a] text-white selection:bg-green-500/30 font-inter">
      <Navbar lastUpdated={lastUpdated} isLive={isLive} />

      <main className="max-w-[1600px] mx-auto px-6 py-8">
        
        {/* Modern Error Banner */}
        {error && (
          <div className="glass-panel border-red-500/20 bg-red-500/5 mb-6 px-4 py-3 flex items-center justify-between slide-in">
            <div className="flex items-center gap-3">
              <Zap size={16} className="text-red-400" />
              <p className="text-sm font-medium text-red-200">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="hover:bg-white/10 p-1.5 rounded-lg transition-colors">✕</button>
          </div>
        )}

        {/* Floating AI Notification */}
        {status?.is_alert && !toastHidden && (
          <div className="fixed top-24 right-6 z-[1000] glass-panel border-red-500/30 bg-red-500/10 p-4 min-w-[340px] shadow-[0_0_40px_rgba(239,68,68,0.2)] slide-in">
            <div className="flex gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center text-2xl">🚨</div>
                <div className="absolute inset-0 rounded-2xl border-2 border-red-500 animate-ping opacity-20"></div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                   <ShieldAlert size={14} className="text-red-400" />
                   <h3 className="text-xs font-black tracking-widest uppercase">Critical Overflow</h3>
                </div>
                <p className="text-[11px] text-red-200/60 mt-1 font-bold">Node {activeBin} at {status.fill_pct.toFixed(0)}%</p>
                <button 
                  onClick={handleOptimize} 
                  className="mt-3 w-full py-2 bg-red-500/20 hover:bg-red-500/40 border border-red-500/40 rounded-lg text-[10px] font-black uppercase tracking-widest text-red-100 transition-all active:scale-95"
                >
                  Dispatch Fleet →
                </button>
              </div>
              <button onClick={() => setToastHidden(true)} className="self-start text-white/20 hover:text-white transition-colors">✕</button>
            </div>
          </div>
        )}

        {/* Header Section */}
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-10">
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-gradient leading-none">COMMAND CENTER</h1>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]"></div>
              <p className="text-[11px] text-slate-500 font-black uppercase tracking-[0.2em]">Global Grid Synchronized</p>
            </div>
          </div>

          {/* Tactical Node Selector */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Active Intelligence Node</label>
            <div className="flex items-center gap-4 bg-slate-900/40 p-1.5 rounded-2xl border border-white/5 backdrop-blur-xl group hover:border-purple-500/30 transition-all">
              <div className="relative flex-1 min-w-[260px]">
                <select
                  value={activeBin || ""}
                  onChange={(e) => setActiveBin(e.target.value)}
                  className="w-full bg-slate-800/80 appearance-none border-none text-xs font-black uppercase tracking-widest rounded-xl px-5 py-3 outline-none cursor-pointer focus:ring-2 ring-purple-500/40 transition-all pr-12"
                >
                  {allBins.map((id) => (
                    <option key={id} value={id} className="bg-slate-900 font-sans">
                      {id} {statuses[id] ? `(${statuses[id].fill_pct.toFixed(0)}%)` : ""}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover:text-purple-400 transition-colors" />
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          
          {/* Column Left: Mission Control Hub */}
          <section className="xl:col-span-4 space-y-8">
            <BinCard status={status} loading={loading} threshold={threshold} />
            <ControlPanel
              onRefresh={fetchData}
              onOptimize={handleOptimize}
              onSimulateAlert={handleSimulateAlert}
              autoRefresh={autoRefresh}
              onToggleAutoRefresh={() => setAutoRefresh((v) => !v)}
              threshold={threshold}
              onThresholdChange={setThreshold}
              optimizing={optimizing}
              loading={loading}
              allBins={allBins}
              activeBin={activeBin}
              setActiveBin={setActiveBin}
              statuses={statuses}
            />
            <AgentPanel route={routeData?.route} optimizing={optimizing} status={status} />
          </section>

          {/* Column Right: Geographic Visualization */}
          <section className="xl:col-span-8 space-y-8 h-full">
            <div className="glass-panel overflow-hidden border-white/5 h-[500px] lg:h-[700px] shadow-2xl relative group">
              <MapView
                route={routeData?.route}
                optimizing={optimizing}
                statuses={statuses}
                status={status}
                threshold={threshold}
              />
              
              {/* Map Floating Detail */}
              <div className="absolute top-6 left-6 z-[500] pointer-events-none">
                 <div className="glass-panel bg-slate-950/60 backdrop-blur-md px-4 py-2 border-white/10 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-purple-500 animate-ping"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Live Mysuru Grid Overlay</span>
                 </div>
              </div>
            </div>

            <SavingsCard routeData={routeData} />
          </section>
        </div>

        {/* High-Fidelity Footer */}
        <footer className="mt-20 pb-10 border-t border-white/5 pt-10 flex flex-col items-center gap-6">
          <div className="flex items-center gap-8 opacity-20 grayscale transition-all hover:opacity-50 cursor-default">
             <div className="h-6 w-6 rounded-lg bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)]"></div>
             <div className="h-4 w-12 rounded-full bg-white"></div>
             <div className="h-6 w-6 rounded-lg border-2 border-white"></div>
          </div>
          <div className="text-center space-y-1">
            <p className="text-[10px] uppercase tracking-[0.4em] text-slate-600 font-black">
              SafaiChakra Intelligence System · v1.0.4
            </p>
            <p className="text-[9px] text-slate-800 font-bold uppercase tracking-widest">
              Automated Waste Management & Logic Engine · {new Date().getFullYear()}
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}