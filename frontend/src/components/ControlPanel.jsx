import { RefreshCw, Route, AlertTriangle, Timer, SlidersHorizontal, Flame } from "lucide-react";

export default function ControlPanel({
  onRefresh, onOptimize, onSimulateAlert,
  autoRefresh, onToggleAutoRefresh,
  threshold, onThresholdChange,
  optimizing, loading,
}) {
  const pct = threshold;
  // Normalize the 30-90 range to a 0-100% position for the background gradient
  const fillPos = ((pct - 30) / (90 - 30)) * 100;
  const trackGrad = `linear-gradient(to right, #22c55e 0%, #f59e0b ${fillPos}%, rgba(255,255,255,0.08) ${fillPos}%)`;

  return (
    <div
      className="slide-in"
      style={{
        borderRadius: 20,
        border: "1px solid rgba(255,255,255,0.07)",
        background: "linear-gradient(160deg,#111827 0%,#0d1424 100%)",
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#ea580c,#f97316)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(249,115,22,0.35)" }}>
          <SlidersHorizontal size={16} color="#fff" />
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: 0 }}>Mission Control</p>
          <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>Fleet operations & thresholds</p>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />

      {/* Action buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

        {/* Refresh */}
        <button
          onClick={onRefresh}
          disabled={loading}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 14px", borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.04)",
            color: "#e5e7eb", fontSize: 13, fontWeight: 500,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.5 : 1,
            transition: "all 0.2s",
            width: "100%", textAlign: "left",
          }}
          onMouseOver={e => !loading && (e.currentTarget.style.background = "rgba(34,197,94,0.08)", e.currentTarget.style.borderColor = "rgba(34,197,94,0.3)")}
          onMouseOut={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)", e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
        >
          <RefreshCw size={15} color="#4ade80" style={{ animation: loading ? "spin 0.7s linear infinite" : "none" }} />
          <span>Refresh Data</span>
          {loading && <span style={{ marginLeft: "auto", fontSize: 11, color: "#6b7280" }}>Fetching…</span>}
        </button>

        {/* Optimize  */}
        <button
          onClick={onOptimize}
          disabled={optimizing}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 14px", borderRadius: 12,
            border: "1px solid rgba(168,85,247,0.35)",
            background: "rgba(168,85,247,0.1)",
            color: "#e5e7eb", fontSize: 13, fontWeight: 500,
            cursor: optimizing ? "not-allowed" : "pointer",
            opacity: optimizing ? 0.7 : 1,
            transition: "all 0.2s", position: "relative", overflow: "hidden",
            width: "100%", textAlign: "left",
          }}
          onMouseOver={e => !optimizing && (e.currentTarget.style.background = "rgba(168,85,247,0.2)", e.currentTarget.style.borderColor = "rgba(168,85,247,0.6)")}
          onMouseOut={e => (e.currentTarget.style.background = "rgba(168,85,247,0.1)", e.currentTarget.style.borderColor = "rgba(168,85,247,0.35)")}
        >
          <Route size={15} color="#c084fc" />
          <span>{optimizing ? "Computing optimal route…" : "Optimize Route"}</span>
          {optimizing
            ? <div style={{ marginLeft: "auto", width: 14, height: 14, borderRadius: "50%", border: "2px solid #c084fc", borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
            : <span style={{ marginLeft: "auto", fontSize: 10, background: "rgba(168,85,247,0.2)", border: "1px solid rgba(168,85,247,0.3)", color: "#c084fc", borderRadius: 6, padding: "2px 6px", fontWeight: 600 }}>OR-Tools</span>
          }
        </button>

        {/* Simulate */}
        <button
          onClick={onSimulateAlert}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 14px", borderRadius: 12,
            border: "1px solid rgba(239,68,68,0.2)",
            background: "rgba(239,68,68,0.04)",
            color: "#e5e7eb", fontSize: 13, fontWeight: 500,
            cursor: "pointer", transition: "all 0.2s",
            width: "100%", textAlign: "left",
          }}
          onMouseOver={e => (e.currentTarget.style.background = "rgba(239,68,68,0.12)", e.currentTarget.style.borderColor = "rgba(239,68,68,0.4)")}
          onMouseOut={e => (e.currentTarget.style.background = "rgba(239,68,68,0.04)", e.currentTarget.style.borderColor = "rgba(239,68,68,0.2)")}
        >
          <Flame size={15} color="#f87171" />
          <span>Simulate Critical Alert</span>
        </button>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />

      {/* Threshold slider */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <AlertTriangle size={13} color="#f59e0b" />
            <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 500 }}>Alert Threshold</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: pct >= 70 ? "#f87171" : pct >= 50 ? "#fbbf24" : "#4ade80" }}>{pct}%</span>
          </div>
        </div>
        <input
          type="range" min={30} max={90} value={threshold}
          onChange={e => onThresholdChange(Number(e.target.value))}
          style={{ width: "100%", height: 6, borderRadius: 99, appearance: "none", background: trackGrad, cursor: "pointer", outline: "none" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 10, color: "#4b5563" }}>30% — very sensitive</span>
          <span style={{ fontSize: 10, color: "#4b5563" }}>90% — lenient</span>
        </div>
      </div>

      {/* Auto-refresh toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Timer size={13} color={autoRefresh ? "#4ade80" : "#6b7280"} />
          <span style={{ fontSize: 12, color: autoRefresh ? "#d1d5db" : "#6b7280", fontWeight: 500 }}>Live polling</span>
          {autoRefresh && <span style={{ fontSize: 10, color: "#4ade80", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 99, padding: "1px 6px" }}>15s</span>}
        </div>
        <button
          onClick={onToggleAutoRefresh}
          style={{
            position: "relative", width: 40, height: 22, borderRadius: 99,
            background: autoRefresh ? "#22c55e" : "#374151",
            border: "none", cursor: "pointer", transition: "background 0.3s", flexShrink: 0,
          }}
        >
          <span style={{
            position: "absolute", top: 3, left: 3,
            width: 16, height: 16, borderRadius: "50%",
            background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
            transition: "transform 0.3s",
            transform: autoRefresh ? "translateX(18px)" : "translateX(0)",
          }} />
        </button>
      </div>
    </div>
  );
}
