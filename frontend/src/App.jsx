import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { ChevronDown, Zap, ShieldAlert, Loader2 } from "lucide-react";

import Navbar from "./components/Navbar";
import BinCard from "./components/BinCard";
import MapView from "./components/MapView";
import ControlPanel from "./components/ControlPanel";
import AgentPanel from "./components/AgentPanel";
import SavingsCard from "./components/SavingsCard";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";
const POLL_MS = 300000

export default function App() {
  const [allBins, setAllBins] = useState([]);
  const [activeBin, setActiveBin] = useState(null);
  const [statuses, setStatuses] = useState({});
  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [threshold, setThreshold] = useState(60);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState(null);
  const [toastHidden, setToastHidden] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Hackathon AI Feature
  const [showPredictiveMap, setShowPredictiveMap] = useState(false);
  const [predictiveData, setPredictiveData] = useState(null);

  const [trafficStrokes, setTrafficStrokes] = useState([]);
  const [drawTrafficEnabled, setDrawTrafficEnabled] = useState(false);
  const [trafficStrictAvoid, setTrafficStrictAvoid] = useState(false);

  // 1. Fetch all known bins
  const fetchAllBins = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/bin/all`);
      const uiBins = data
        .filter(id => !id.toLowerCase().includes("depot"))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

      setAllBins(uiBins);
      if (uiBins.length > 0) setActiveBin(prev => prev ?? uiBins[0]);
      return data;
    } catch (err) {
      return [];
    }
  }, []);

  // 2. Sync Engine
  const fetchData = useCallback(async (signal) => {
    if (!autoRefresh) setLoading(true);
    try {
      const bins = await fetchAllBins();
      const results = await Promise.allSettled(
        bins.map(id => axios.get(`${API_BASE}/bin/status/${id}`, { signal }))
      );

      const statusMap = {};
      results.forEach((res, i) => {
        if (res.status === "fulfilled") statusMap[bins[i]] = res.value.data;
      });

      setStatuses(statusMap);
      setIsLive(true);
      setError(null);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      if (!axios.isCancel(err)) setIsLive(false);
    } finally {
      setLoading(false);
    }
  }, [fetchAllBins, autoRefresh]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    let intervalId;
    if (autoRefresh) {
      intervalId = setInterval(() => fetchData(controller.signal), POLL_MS);
    }
    return () => {
      controller.abort();
      if (intervalId) clearInterval(intervalId);
    };
  }, [fetchData, autoRefresh]);

  const addTrafficStroke = useCallback((positions) => {
    if (!positions?.length) return;
    setTrafficStrokes((prev) => [...prev, positions]);
  }, []);

  const handleOptimize = useCallback(async () => {
    setOptimizing(true);
    try {
      const trafficZones = [];
      for (const stroke of trafficStrokes) {
        for (let i = 0; i < stroke.length - 1; i += 1) {
          trafficZones.push({
            start: [stroke[i][0], stroke[i][1]],
            end: [stroke[i + 1][0], stroke[i + 1][1]],
            severity: "high",
          });
        }
      }
      const { data } = await axios.post(`${API_BASE}/optimize-route`, {
        threshold,
        trafficZones,
        trafficMode: trafficStrictAvoid ? "avoid" : "penalize",
      });
      setRouteData(data);
      setError(null);
    } catch (err) {
      setError("Routing Engine Offline.");
    } finally {
      setOptimizing(false);
    }
  }, [threshold, trafficStrokes, trafficStrictAvoid]);

  const handleSimulateAlert = async () => {
    if (!activeBin) return;
    setToastHidden(false);
    setStatuses(prev => ({ ...prev, [activeBin]: { ...prev[activeBin], fill_pct: 87, is_alert: true } }));
    try {
      await axios.post(`${API_BASE}/bin/update`, { bin_id: activeBin, fill_pct: 87, distance_cm: 15 });
    } catch (e) { console.error(e); }
  };

  const togglePredictiveMode = async () => {
    if (showPredictiveMap) {
      setShowPredictiveMap(false);
      setPredictiveData(null);
    } else {
      setShowPredictiveMap(true);
      try {
        const res = await axios.get(`${API_BASE}/bin/predict`);
        setPredictiveData(res.data.predictions);
      } catch (err) {
        console.error("Failed to fetch predictions", err);
      }
    }
  };

  // ── 3. Derived Variables (Must be before the return) ──────────────────
  const route = useMemo(() => routeData?.route ?? null, [routeData]);
  const activeStatus = useMemo(() => (activeBin ? statuses[activeBin] : null), [activeBin, statuses]);

  const handleCloseToast = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setToastHidden(true);
      setIsClosing(false);
    }, 400); // sync with CSS duration
  }, []);

  // Handle 5-second auto-close for critical alerts
  useEffect(() => {
    if (activeStatus?.is_alert && !toastHidden && !isClosing) {
      const timer = setTimeout(handleCloseToast, 5000);
      return () => clearTimeout(timer);
    }
  }, [activeStatus?.is_alert, toastHidden, isClosing, activeBin, handleCloseToast]);

  // Reset toast visibility when switching focus between bins
  useEffect(() => {
    setToastHidden(false);
    setIsClosing(false);
  }, [activeBin]);

  return (
    <div className="h-screen flex flex-col bg-[var(--color-bg)] text-[var(--color-text)] selection:bg-[var(--color-green)]/30 font-inter antialiased overflow-hidden transition-colors duration-300">
      <Navbar lastUpdated={lastUpdated} isLive={isLive} />

      <main className="flex-1 overflow-hidden px-8 py-6 flex flex-col mt-16 slide-in">
        {error && (
          <div className="glass-panel border-red-500/20 bg-red-500/5 mb-4 px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <Zap size={16} className="text-red-400" />
              <p className="text-sm font-medium text-red-200">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="hover:bg-white/10 p-1.5 rounded-lg">✕</button>
          </div>
        )}

        {activeStatus?.is_alert && !toastHidden && (
          <div className={`fixed top-24 right-6 z-[1000] glass-panel border-red-500/30 bg-red-500/10 p-4 min-w-[340px] shadow-[var(--glow-neon)] ${isClosing ? 'animate-alert-pop-out' : 'animate-alert-pop-in'}`}>
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
                <p className="text-[11px] mt-1 font-bold opacity-70">Node {activeBin} at {activeStatus.fill_pct.toFixed(0)}%</p>
                <button
                  onClick={handleOptimize}
                  disabled={optimizing}
                  className="mt-3 w-full py-2 bg-red-500/20 hover:bg-red-500/40 border border-red-500/40 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                >
                  {optimizing ? <Loader2 className="animate-spin mx-auto" size={14} /> : "Dispatch Fleet →"}
                </button>
              </div>
              <button onClick={handleCloseToast} className="self-start opacity-20 hover:opacity-100">✕</button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-hidden grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
          <section className="xl:col-span-4 h-full overflow-y-auto space-y-6 pr-2 custom-scrollbar">
            <BinCard status={activeStatus} loading={loading} threshold={threshold} />
            <ControlPanel
              onRefresh={() => fetchData()}
              onOptimize={handleOptimize}
              onSimulateAlert={handleSimulateAlert}
              autoRefresh={autoRefresh}
              onToggleAutoRefresh={() => setAutoRefresh((v) => !v)}
              threshold={threshold}
              onThresholdChange={setThreshold}
              optimizing={optimizing}
              loading={loading}
              showPredictiveMap={showPredictiveMap}
              onTogglePredict={togglePredictiveMode}
              allBins={allBins}
              activeBin={activeBin}
              setActiveBin={setActiveBin}
              statuses={statuses}
              drawTrafficEnabled={drawTrafficEnabled}
              onToggleDrawTraffic={() => setDrawTrafficEnabled((v) => !v)}
              trafficStrokeCount={trafficStrokes.length}
              onClearTraffic={() => setTrafficStrokes([])}
              trafficStrictAvoid={trafficStrictAvoid}
              onTrafficStrictAvoidChange={setTrafficStrictAvoid}
            />
            <AgentPanel route={route} optimizing={optimizing} status={activeStatus} />

            <footer className="pb-6 border-t border-[var(--color-card-border)] pt-6 flex flex-col items-center gap-4">
              <div className="text-center space-y-1">
                <p className="text-[9px] uppercase tracking-[0.4em] text-[var(--color-text-dim)] font-black">SafaiChakra Intelligence System</p>
                <p className="text-[8px] text-[var(--color-text-muted)] font-bold uppercase tracking-widest leading-relaxed">Smart Waste Collection Route Optimizer<br />© {new Date().getFullYear()}</p>
              </div>
            </footer>
          </section>

          <section className="xl:col-span-8 flex flex-col gap-5 h-full overflow-hidden">
            <div className="flex-1 relative min-h-0">
              <MapView
                route={route}
                optimizing={optimizing}
                statuses={statuses}
                threshold={threshold}
                showPredictiveMap={showPredictiveMap}
                predictiveData={predictiveData}
                trafficStrokes={trafficStrokes}
                drawTrafficEnabled={drawTrafficEnabled}
                onAddTrafficStroke={addTrafficStroke}
              />
            </div>
            <div className="shrink-0">
              <SavingsCard routeData={routeData} />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}