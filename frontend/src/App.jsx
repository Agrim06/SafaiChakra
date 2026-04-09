import { useState, useEffect, useCallback } from "react";
import axios from "axios";

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
  const [history, setHistory] = useState([]);
  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [threshold, setThreshold] = useState(70); // Default to standard 70%
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
    <div className="min-h-screen bg-[#05070a] text-white selection:bg-green-500/30">
      <Navbar lastUpdated={lastUpdated} isLive={isLive} />

      <main className="max-w-[1600px] mx-auto px-6 py-8">
        
        {/* Modern Error Banner */}
        {error && (
          <div className="glass-panel border-red-500/20 bg-red-500/5 mb-6 px-4 py-3 flex items-center justify-between slide-in">
            <div className="flex items-center gap-3">
              <span className="text-red-400">⚡</span>
              <p className="text-sm font-medium text-red-200">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="hover:bg-white/10 p-1.5 rounded-lg transition-colors">✕</button>
          </div>
        )}

        {/* Floating AI Notification */}
        {status?.is_alert && !toastHidden && (
          <div className="fixed top-24 right-6 z-[1000] glass-panel border-red-500/30 bg-red-500/10 p-4 min-w-[320px] shadow-[0_0_40px_rgba(239,68,68,0.15)] slide-in">
            <div className="flex gap-4">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-xl">🚨</div>
                <div className="absolute inset-0 rounded-xl border-2 border-red-500 animate-ping opacity-20"></div>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold tracking-tight">CRITICAL OVERFLOW</h3>
                <p className="text-xs text-red-200/60 mt-0.5">{activeBin} reached {status.fill_pct.toFixed(0)}% capacity</p>
                <button onClick={handleOptimize} className="mt-3 text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-300">Dispatch Fleet Now →</button>
              </div>
              <button onClick={() => setToastHidden(true)} className="self-start text-white/20 hover:text-white">✕</button>
            </div>
          </div>
        )}

        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tighter text-gradient">COMMAND CENTER</h1>
            <p className="text-sm text-slate-500 font-medium mt-1">Real-time bin telemetry & fleet synchronization</p>
          </div>

          <div className="flex items-center gap-4 bg-slate-900/40 p-1.5 rounded-2xl border border-white/5 backdrop-blur-xl">
            <span className="pl-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Active Node</span>
            <select
              value={activeBin || ""}
              onChange={(e) => setActiveBin(e.target.value)}
              className="bg-slate-800 border-none text-sm font-bold rounded-xl px-4 py-2.5 outline-none cursor-pointer focus:ring-2 ring-green-500/40 transition-all min-w-[200px]"
            >
              {allBins.map((id) => (
                <option key={id} value={id}>
                  {id} {statuses[id] ? `(${statuses[id].fill_pct.toFixed(0)}%)` : ""}
                </option>
              ))}
            </select>
          </div>
        </header>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          
          {/* Column Left: Intelligence Hub */}
          <section className="xl:col-span-4 space-y-8">
            <div className="space-y-6">
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
               />
               <AgentPanel route={routeData?.route} optimizing={optimizing} status={status} />
            </div>
          </section>

          {/* Column Right: Geographic Visualization */}
          <section className="xl:col-span-8 space-y-8 h-full">
            <div className="glass-panel overflow-hidden border-white/5 h-[500px] lg:h-[600px] shadow-2xl relative">
              <MapView
                route={routeData?.route}
                optimizing={optimizing}
                statuses={statuses}
                status={status}
                threshold={threshold}
              />
            </div>

            <SavingsCard routeData={routeData} />
          </section>
        </div>

        {/* Footer */}
        <footer className="mt-16 pb-8 border-t border-white/5 pt-8 flex flex-col items-center gap-2">
          <div className="flex items-center gap-3 opacity-30 grayscale contrast-125">
             <div className="h-4 w-4 rounded bg-white"></div>
             <div className="h-4 w-4 rounded bg-white"></div>
             <div className="h-4 w-4 rounded bg-white"></div>
          </div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-600 font-black">
            SafaiChakra System v1.0.4 · Mysuru Grid
          </p>
        </footer>
      </main>
    </div>
  );
}