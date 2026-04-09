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
  const [activeBin, setActiveBin] = useState(null);  // selected bin ID
  const [statuses, setStatuses] = useState({});     // { bin_id: statusObj }
  const [history, setHistory] = useState([]);
  const [routeData, setRouteData] = useState(null);  // full API response { route, distances, optimized_distance_km, ... }
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [threshold, setThreshold] = useState(60);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState(null);
  const [toastHidden, setToastHidden] = useState(false);
  
  // Hackathon AI Feature
  const [showPredictiveMap, setShowPredictiveMap] = useState(false);
  const [predictiveData, setPredictiveData]       = useState(null);

  // ── 1. Fetch all known bins ───────────────────────────────────────────────
  const fetchAllBins = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/bin/all`);
      const allReturnedBins = res.data;
      
      // Filter out the depot from the list of actionable bins for the UI dropdown, then sort
      const uiBins = allReturnedBins
        .filter(b => !b.toLowerCase().includes("depot"))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
      setAllBins(uiBins);
      
      // If no active bin selected yet, default to first normal bin
      if (uiBins.length > 0) {
        setActiveBin((prev) => prev ?? uiBins[0]);
      }
      
      // Return ALL bins (including depot) so we fetch its coordinates/status
      return allReturnedBins;
    } catch {
      return [];
    }
  }, []);

  // ── 2. Fetch status for every bin ────────────────────────────────────────
  const fetchAllStatuses = useCallback(async (bins) => {
    if (!bins || bins.length === 0) return;
    try {
      const results = await Promise.allSettled(
        bins.map((id) => axios.get(`${API_BASE}/bin/status/${id}`))
      );
      const map = {};
      results.forEach((r, i) => {
        if (r.status === "fulfilled") map[bins[i]] = r.value.data;
      });
      setStatuses(map);
      setIsLive(true);
      setError(null);
    } catch {
      setIsLive(false);
    }
  }, []);

  // ── 3. Fetch history for the active bin ──────────────────────────────────
  const fetchHistory = useCallback(async (binId) => {
    if (!binId) return;
    try {
      const res = await axios.get(`${API_BASE}/bin/history/${binId}?limit=20`);
      const raw = [...res.data].reverse();
      setHistory(
        raw.map((r, i) => ({
          name: `T-${raw.length - 1 - i}`,
          fill: r.fill_pct,
        }))
      );
    } catch {
      setHistory([]);
    }
  }, []);

  // ── Master refresh ────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const bins = await fetchAllBins();
      await Promise.all([
        fetchAllStatuses(bins),
        fetchHistory(activeBin ?? bins[0]),
      ]);
      setLastUpdated(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  }, [fetchAllBins, fetchAllStatuses, fetchHistory, activeBin]);

  // Re-fetch history and reset UI state when active bin changes
  useEffect(() => {
    if (activeBin) {
      fetchHistory(activeBin);
      setToastHidden(false); // bring back toast if navigating back to an alerted bin
    }
  }, [activeBin, fetchHistory]);

  // Initial load
  useEffect(() => { fetchData(); }, []);   // eslint-disable-line

  // Auto-poll
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchData, POLL_MS);
    return () => clearInterval(id);
  }, [autoRefresh, fetchData]);

  // ── Route optimisation ────────────────────────────────────────────────────
  const handleOptimize = async () => {
    setOptimizing(true);
    try {
      const res = await axios.get(
        `${API_BASE}/optimize-route?threshold=${threshold}`
      );
      setRouteData(res.data);   // store full response with distances
      setError(null);
    } catch (err) {
      setError("Route optimisation failed — is the backend running?");
    } finally {
      setOptimizing(false);
    }
  };

  const handleSimulateAlert = async () => {
    if (!activeBin) return;
    setToastHidden(false); // force toast to show
    
    // Optimistic local state update
    setStatuses((prev) => ({
      ...prev,
      [activeBin]: {
        ...(prev[activeBin] ?? { bin_id: activeBin }),
        fill_pct: 87,
        is_alert: true,
        message: "⚠ Collection needed immediately!",
      },
    }));

    // Push to backend to make it stick
    try {
      await axios.post(`${API_BASE}/bin/update`, {
        bin_id: activeBin,
        fill_pct: 87,
        distance_cm: 15
      });
      // Refresh history so the chart shows the spike immediately
      fetchHistory(activeBin);
    } catch (e) {
      console.error("Simulation failed", e);
    }
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

  // Convenience: extract just the ordered bin IDs for map/agent
  const route = routeData?.route ?? null;

  // Derived: active bin status
  const status = activeBin ? (statuses[activeBin] ?? null) : null;

  return (
    <div className="app-shell">
      <Navbar lastUpdated={lastUpdated} isLive={isLive} />

      <div className="app-content">

        {/* Error banner */}
        {error && (
          <div className="slide-in banner banner--error">
            <span>⚠️</span>
            <span className="text-red-300">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Floating Alert Toast */}
        {status?.is_alert && !toastHidden && (
          <div className="banner banner--alert alert-toast slide-in-top-right !fixed top-[80px] right-[24px] z-50 z-index-toast">
            <div className="w-8 h-8 rounded-full flex items-center justify-center border border-red-400/20 bg-red-500/10 shrink-0">
              <span className="text-sm animate-pulse">🚨</span>
            </div>

            <div className="flex flex-col min-w-[120px]">
              <span className="text-white text-xs font-semibold tracking-wide flex items-center gap-1.5">
                Critical
                <strong className="text-red-300 bg-red-500/10 px-1 py-0.5 rounded text-[10px]">{status.bin_id}</strong>
              </span>
              <span className="text-red-300/70 text-[10px] mt-0.5">
                Cap at {status.fill_pct.toFixed(0)}% — Action required
              </span>
            </div>

            <button
              onClick={() => setToastHidden(true)}
              className="alert-toast-close"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        )}

        {/* Bin selector dropdown (if multiple bins) */}
        {allBins.length > 1 && (
          <div className="mt-4 flex items-center gap-3">
            <label className="text-sm font-medium text-gray-400">Select Bin:</label>
            <div className="relative">
              <select
                value={activeBin || ""}
                onChange={(e) => setActiveBin(e.target.value)}
                className="appearance-none bg-[#1f2937]/80 border border-gray-700 text-gray-200 text-sm rounded-lg px-4 py-2 pr-8 focus:outline-none focus:border-green-500/50 transition-all cursor-pointer backdrop-blur-md"
              >
                {allBins.map((id) => {
                  const s = statuses[id];
                  return (
                    <option key={id} value={id}>
                      {id} {s ? `- ${s.fill_pct.toFixed(0)}%` : ""} {s?.is_alert ? " (⚠ Alert)" : ""}
                    </option>
                  );
                })}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* ── Main grid ─────────────────────────────────── */}
        <div className="mt-5 grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">

          {/* LEFT SIDEBAR - 4 columns */}
          <div className="xl:col-span-4 flex flex-col gap-5">
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
              showPredictiveMap={showPredictiveMap}
              onTogglePredict={togglePredictiveMode}
            />

            <AgentPanel route={route} optimizing={optimizing} status={status} />
          </div>

          {/* RIGHT ACTIVE VIEW - 8 columns */}
          <div className="xl:col-span-8 flex flex-col gap-5 h-full">
            <MapView
              route={route}
              optimizing={optimizing}
              statuses={statuses}
              status={status}
              threshold={threshold}
              showPredictiveMap={showPredictiveMap}
              predictiveData={predictiveData}
            />

            <SavingsCard routeData={routeData} />
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-gray-800">
          SafaiChakra · AI-Powered Smart Waste Management · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
