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
  
  // Dynamic color for the filled portion of the track
  const fillColor = pct >= 70 ? "#ef4444" : pct >= 50 ? "#f59e0b" : "#22c55e";
  const trackGrad = `linear-gradient(to right, ${pct < 50 ? '#22c55e' : pct < 70 ? '#f59e0b' : '#ef4444'} 0%, ${fillColor} ${fillPos}%, rgba(255,255,255,0.08) ${fillPos}%)`;

  return (
    <div className="control-card slide-in">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-orange-500 flex items-center justify-center shadow-[0_4px_14px_rgba(249,115,22,0.35)]">
          <SlidersHorizontal size={16} color="#fff" />
        </div>
        <div>
          <p className="text-[13px] font-bold text-white m-0">Mission Control</p>
          <p className="text-[11px] text-gray-500 m-0">Fleet operations & thresholds</p>
        </div>
      </div>

      {/* Divider */}
      <div className="ctrl-divider" />

      {/* Action buttons */}
      <div className="flex flex-col gap-2">

        {/* Refresh */}
        <button
          onClick={onRefresh}
          disabled={loading}
          className="ctrl-btn ctrl-btn--refresh"
        >
          <RefreshCw size={15} color="#4ade80" className={loading ? "spinner" : ""} />
          <span>Refresh Data</span>
          {loading && <span className="ml-auto text-[11px] text-gray-500">Fetching…</span>}
        </button>

        {/* Optimize  */}
        <button
          onClick={onOptimize}
          disabled={optimizing}
          className="ctrl-btn ctrl-btn--optimize group"
        >
          <div className="ctrl-btn__shimmer" />
          <Route size={15} color="#c084fc" />
          <span>{optimizing ? "Computing optimal route…" : "Optimize Route"}</span>
          {optimizing
            ? <div className="ml-auto w-3.5 h-3.5 rounded-full border-2 border-purple-400 border-t-transparent spinner" />
            : <span className="ml-auto text-[10px] bg-purple-500/20 border border-purple-500/30 text-purple-400 rounded-md px-1.5 py-0.5 font-semibold">OR-Tools</span>
          }
        </button>

        {/* Simulate */}
        <button
          onClick={onSimulateAlert}
          className="ctrl-btn ctrl-btn--simulate"
        >
          <Flame size={15} color="#f87171" />
          <span>Simulate Critical Alert</span>
        </button>
      </div>

      {/* Divider */}
      <div className="ctrl-divider" />

      {/* Threshold slider */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <AlertTriangle size={12} color="#f59e0b" />
            <span className="text-[12px] text-gray-400 font-medium">Alert Threshold</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`text-[15px] font-extrabold ${pct >= 70 ? 'text-red-400' : pct >= 50 ? 'text-yellow-400' : 'text-green-400'}`}>{pct}%</span>
          </div>
        </div>
        <input
          type="range" min={30} max={90} value={threshold}
          onChange={e => onThresholdChange(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer outline-none"
          style={{ background: trackGrad }}
        />
        <div className="flex justify-between">
          <span className="text-[10px] text-gray-600">30% — very sensitive</span>
          <span className="text-[10px] text-gray-600">90% — lenient</span>
        </div>
      </div>

      {/* Auto-refresh toggle */}
      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 border border-white/5">
        <div className="flex items-center gap-2">
          <Timer size={13} color={autoRefresh ? "#4ade80" : "#6b7280"} />
          <span className={`text-[12px] font-medium ${autoRefresh ? 'text-gray-300' : 'text-gray-500'}`}>Live polling</span>
          {autoRefresh && <span className="text-[10px] text-green-400 bg-green-500/10 border border-green-500/20 rounded-full px-1.5 py-[1px]">15s</span>}
        </div>
        <button
          onClick={onToggleAutoRefresh}
          className={`ctrl-toggle ${autoRefresh ? 'ctrl-toggle--on' : 'ctrl-toggle--off'}`}
        >
          <span className={`ctrl-toggle__knob ${autoRefresh ? 'ctrl-toggle__knob--on' : 'ctrl-toggle__knob--off'}`} />
        </button>
      </div>
    </div>
  );
}
