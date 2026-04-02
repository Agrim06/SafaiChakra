import { useState, useEffect, useCallback } from "react";
import axios from "axios";

import Navbar         from "./components/Navbar";
import BinCard        from "./components/BinCard";
import AnalyticsChart from "./components/AnalyticsChart";
import MapView        from "./components/MapView";
import ControlPanel   from "./components/ControlPanel";
import AgentPanel     from "./components/AgentPanel";
import SavingsCard    from "./components/SavingsCard";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";
const POLL_MS  = 15000;

export default function App() {
  const [allBins,     setAllBins]     = useState([]);
  const [activeBin,   setActiveBin]   = useState(null);  // selected bin ID
  const [statuses,    setStatuses]    = useState({});     // { bin_id: statusObj }
  const [history,     setHistory]     = useState([]);
  const [route,       setRoute]       = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [optimizing,  setOptimizing]  = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [threshold,   setThreshold]   = useState(70);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLive,      setIsLive]      = useState(false);
  const [error,       setError]       = useState(null);

  // ── 1. Fetch all known bins ───────────────────────────────────────────────
  const fetchAllBins = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/bin/all`);
      const bins = res.data;
      setAllBins(bins);
      // If no active bin selected yet, default to first
      if (bins.length > 0) {
        setActiveBin((prev) => prev ?? bins[0]);
      }
      return bins;
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

  // Re-fetch history when active bin changes
  useEffect(() => {
    if (activeBin) fetchHistory(activeBin);
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
      setRoute(res.data.route);
      setError(null);
    } catch (err) {
      setError("Route optimisation failed — is the backend running?");
    } finally {
      setOptimizing(false);
    }
  };

  const handleSimulateAlert = () => {
    if (!activeBin) return;
    setStatuses((prev) => ({
      ...prev,
      [activeBin]: {
        ...(prev[activeBin] ?? { bin_id: activeBin }),
        fill_pct: 87,
        is_alert: true,
        message: "⚠ Collection needed immediately!",
      },
    }));
  };

  // Derived: active bin status
  const status = activeBin ? (statuses[activeBin] ?? null) : null;

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(ellipse at 20% 0%, rgba(34,197,94,0.04) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(168,85,247,0.05) 0%, transparent 60%), #080c18",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <Navbar lastUpdated={lastUpdated} isLive={isLive} />

      <div className="pt-20 px-4 md:px-6 pb-10 max-w-screen-2xl mx-auto">

        {/* Error banner */}
        {error && (
          <div
            className="slide-in mt-2 flex items-center gap-3 px-5 py-3 rounded-2xl text-sm"
            style={{
              background: "rgba(127,29,29,0.5)",
              border: "1px solid rgba(239,68,68,0.3)",
            }}
          >
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

        {/* Alert banner */}
        {status?.is_alert && (
          <div
            className="slide-in mt-2 flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-medium"
            style={{
              background: "linear-gradient(135deg,rgba(127,29,29,0.6),rgba(153,27,27,0.4))",
              border: "1px solid rgba(239,68,68,0.4)",
              backdropFilter: "blur(8px)",
              boxShadow: "0 4px 24px rgba(239,68,68,0.15)",
            }}
          >
            <span className="text-xl">🚨</span>
            <div>
              <span className="text-white">
                <strong>{status.bin_id}</strong> is at{" "}
                <strong className="text-red-300">{status.fill_pct.toFixed(1)}%</strong> capacity
              </span>
              <span className="text-red-300/70 ml-2">— Collection crew dispatched</span>
            </div>
            <div className="ml-auto text-red-400 text-xs border border-red-500/30 px-2 py-1 rounded-lg">
              ALERT ACTIVE
            </div>
          </div>
        )}

        {/* Bin selector tabs (if multiple bins) */}
        {allBins.length > 1 && (
          <div className="mt-4 flex gap-2 flex-wrap">
            {allBins.map((id) => {
              const s = statuses[id];
              const isAlert = s?.is_alert;
              const isActive = id === activeBin;
              return (
                <button
                  key={id}
                  onClick={() => setActiveBin(id)}
                  className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200"
                  style={{
                    background: isActive
                      ? isAlert
                        ? "rgba(239,68,68,0.2)"
                        : "rgba(34,197,94,0.15)"
                      : "rgba(255,255,255,0.04)",
                    border: isActive
                      ? `1px solid ${isAlert ? "rgba(239,68,68,0.5)" : "rgba(34,197,94,0.4)"}`
                      : "1px solid rgba(255,255,255,0.08)",
                    color: isActive
                      ? isAlert ? "#f87171" : "#4ade80"
                      : "#6b7280",
                  }}
                >
                  {id}
                  {s && (
                    <span className="ml-1.5 opacity-70">{s.fill_pct.toFixed(0)}%</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Main grid ─────────────────────────────────── */}
        <div className="mt-5 grid grid-cols-1 xl:grid-cols-2 gap-5">

          {/* LEFT */}
          <div className="flex flex-col gap-5">
            <BinCard status={status} loading={loading} />
            <AnalyticsChart history={history} loading={loading} />
          </div>

          {/* RIGHT */}
          <div className="flex flex-col gap-5">
            <MapView
              route={route}
              optimizing={optimizing}
              statuses={statuses}
              status={status}
            />

            {/* Bottom row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
              <AgentPanel route={route} optimizing={optimizing} status={status} />
            </div>
          </div>
        </div>

        {/* ── Savings row (full width) ───────────────────── */}
        <div className="mt-5">
          <SavingsCard route={route} />
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-gray-800">
          SafaiChakra · AI-Powered Smart Waste Management · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
