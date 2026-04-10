import { RefreshCw, Route, Flame, AlertTriangle, ChevronDown, Zap } from "lucide-react";

export default function ControlPanel({
  onRefresh, onOptimize, onSimulateAlert,
  autoRefresh, onToggleAutoRefresh,
  threshold, onThresholdChange,
  optimizing, loading,
  showPredictiveMap, onTogglePredict,
  allBins, activeBin, setActiveBin, statuses
}) {
  const pct = threshold;
  const fillPos = ((pct - 30) / (90 - 30)) * 100;
  const fillColor = pct >= 70 ? "var(--color-red)" : pct >= 50 ? "var(--color-amber)" : "var(--color-green)";
  const glowShadow = `0 0 15px ${fillColor}44`;

  return (
    <div className="glass-panel p-5 slide-in flex flex-col gap-6 relative overflow-hidden">
      {/* Background HUD Lines - Swapped to a dynamic dim color */}
      <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
        <Zap size={100} className="text-[var(--color-text)]" />
      </div>

      {/* ── Bin Selector ── */}
      <div className="flex flex-col gap-2 relative z-10">
        <label className="text-[10px] font-black text-[var(--color-text-dim)] uppercase tracking-[0.25em] ml-1">
          Node Focus Command
        </label>
        <div className="relative group">
          <select
            value={activeBin || ""}
            onChange={(e) => setActiveBin(e.target.value)}
            className="w-full appearance-none bg-[var(--color-surface-container)] border border-[var(--color-card-border)] text-[var(--color-text)] text-[11px] font-black uppercase tracking-wider rounded-xl px-4 py-3.5 outline-none focus:border-[var(--color-green)]/40 transition-all cursor-pointer shadow-sm"
          >
            {allBins.map((id) => {
              const s = statuses[id];
              return (
                <option key={id} value={id} className="bg-[var(--color-surface)] text-[var(--color-text)]">
                  {id} {s ? ` — ${s.fill_pct.toFixed(0)}%` : ""} {s?.is_alert ? " ⚠ ALERT" : ""}
                </option>
              );
            })}
          </select>
          <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)] pointer-events-none group-focus-within:rotate-180 transition-transform" />
        </div>
      </div>

      <div className="flex flex-col gap-3 relative z-10">
        {/* Sync Status */}
        <div className="flex items-center justify-between px-1 mb-1">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-[var(--color-green)] animate-pulse shadow-[0_0_8px_var(--color-green)]' : 'bg-[var(--color-text-dim)]/30'}`}></div>
            <span className="text-[9px] font-black text-[var(--color-text-dim)] uppercase tracking-[0.2em]">
              {autoRefresh ? 'Telemetry Active' : 'Static Mode'}
            </span>
          </div>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 hover:bg-[var(--color-text-dim)]/10 rounded-lg text-[var(--color-text-dim)] hover:text-[var(--color-text)] transition-all"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Action Grid: Optimize Route (High Contrast Fix) */}
        <button
          onClick={onOptimize}
          disabled={optimizing}
          className="active:scale-[0.98] transition-all relative overflow-hidden flex items-center justify-between px-4 py-4 rounded-xl bg-[var(--color-green)]/[0.08] border border-[var(--color-green)]/30 hover:bg-[var(--color-green)]/[0.12] hover:border-[var(--color-green)] group"
        >
          <div className="flex items-center gap-3">
            <Route size={18} className="text-[var(--color-green)] group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-black text-[var(--color-text)] uppercase tracking-[0.15em]">
              {optimizing ? "Computing Path..." : "Optimize Route"}
            </span>
          </div>
          <span className="text-[8px] font-black bg-[var(--color-green)] text-white dark:text-black px-2 py-0.5 rounded leading-none">OR-TOOLS</span>
        </button>

        {/* Alert Button */}
        <button
          onClick={onSimulateAlert}
          className="active:scale-[0.98] transition-all flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[var(--color-surface-container)] border border-[var(--color-card-border)] hover:bg-[var(--color-red)]/[0.08] hover:border-[var(--color-red)]/30 group"
        >
          <Flame size={16} className="text-[var(--color-text-dim)] group-hover:text-[var(--color-red)] transition-colors" />
          <span className="text-[10px] font-bold text-[var(--color-text-dim)] group-hover:text-[var(--color-red)] transition-colors uppercase tracking-[0.2em]">Simulate Emergency</span>
        </button>

        {/* Predictive Toggle */}
        <button
          onClick={onTogglePredict}
          className={`active:scale-[0.98] transition-all flex items-center gap-3 px-4 py-3.5 rounded-xl border ${
            showPredictiveMap 
              ? "bg-[var(--color-cyan)]/[0.1] border-[var(--color-cyan)] text-[var(--color-cyan)] shadow-sm" 
              : "bg-[var(--color-surface-container)] border-[var(--color-card-border)] text-[var(--color-text-dim)] hover:bg-[var(--color-text-dim)]/5"
          } group`}
        >
          <span className={`text-[14px] ${showPredictiveMap ? 'animate-bounce' : ''}`}>⚡</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
            {showPredictiveMap ? "Forecast Active" : "Predict Spillover"}
          </span>
          {showPredictiveMap && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--color-cyan)] animate-pulse" />}
        </button>
      </div>

      {/* ── Threshold Slider ── */}
      <div className="bg-[var(--color-surface-container)] border border-[var(--color-card-border)] rounded-2xl p-4 pt-5 relative overflow-hidden group shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-[var(--color-text-dim)]" />
            <span className="text-[10px] font-black text-[var(--color-text-dim)] uppercase tracking-[0.25em]">Global Sensitivity</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black tracking-tighter tabular-nums" style={{ color: fillColor, textShadow: glowShadow }}>
              {pct}
            </span>
            <span className="text-[10px] font-black text-[var(--color-text-dim)]">%</span>
          </div>
        </div>

        <div className="relative h-6 flex items-center">
           <input
            type="range" min={30} max={90} value={threshold}
            onChange={e => onThresholdChange(Number(e.target.value))}
            className="absolute inset-0 w-full h-1.5 rounded-full appearance-none cursor-pointer z-10"
            style={{
              background: `linear-gradient(to right, ${fillColor} 0%, ${fillColor} ${fillPos}%, var(--color-card-border) ${fillPos}%)`
            }}
          />
        </div>
        
        <div className="flex justify-between px-1 mt-1">
          <span className="text-[9px] font-black text-[var(--color-text-dim)] uppercase opacity-70">Conservative</span>
          <span className="text-[9px] font-black text-[var(--color-text-dim)] uppercase opacity-70">Aggressive</span>
        </div>
      </div>
    </div>
  );
}