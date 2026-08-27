import { RefreshCw, Route, Flame, AlertTriangle, ChevronDown, Zap } from "lucide-react";

export default function ControlPanel({
  onRefresh, onOptimize, onSimulateAlert,
  autoRefresh, onToggleAutoRefresh,
  threshold, onThresholdChange,
  optimizing, loading,
  showPredictiveMap, onTogglePredict,
  allBins, activeBin, setActiveBin, statuses,
  trafficStrokeCount = 0,
  onClearTraffic = () => { },
  onSimulateSensorFailure = () => { },
  onResetSensor = () => { },
  sensorHealth = null,
}) {
  const pct = threshold;
  const fillPos = ((pct - 30) / (90 - 30)) * 100;
  const fillColor = pct >= 70 ? "var(--color-red)" : pct >= 50 ? "var(--color-amber)" : "var(--color-green)";

  return (
    <div className="glass-panel shrink-0 p-3.5 sm:p-4 slide-in flex flex-col gap-3.5 border-[var(--color-card-border)] relative overflow-hidden">
      {/* Background HUD Lines - Using extremely low opacity for a watermark effect */}
      <div className="absolute -top-6 -right-6 p-4 opacity-[0.03] pointer-events-none text-[var(--color-text)]">
        <Zap size={120} />
      </div>

      {/* ── Bin Selector: Tactical Dropdown ── */}
      <div className="flex flex-col gap-1.5 relative z-10">
        <label className="text-[10.5px] font-black text-[var(--color-text-dim)] uppercase tracking-[0.2em] ml-1">
          Node Focus Command
        </label>
        <div className="relative group">
          <select
            value={activeBin || ""}
            onChange={(e) => setActiveBin(e.target.value)}
            className="w-full appearance-none bg-[var(--color-bg)] border-2 border-[var(--color-card-border)] text-[var(--color-text)] text-[12px] font-black uppercase tracking-wider rounded-xl px-3.5 py-2.5 outline-none focus:border-[var(--color-green)]/50 transition-all cursor-pointer shadow-sm"
          >
            {allBins.map((id) => {
              const s = statuses[id];
              const isAbnormal = s && (s.is_alert || s.fill_pct >= threshold);
              // Check sensor health
              const sensorItem = sensorHealth?.sensors?.find(sh => sh.bin_id === id);
              const hasSensorIssue = sensorItem && sensorItem.severity !== "OK";
              return (
                <option key={id} value={id} className="bg-[var(--color-surface)] text-[var(--color-text)]">
                  {id === "DEPOT_00" ? "Main HUB" : id} {s ? ` — ${s.fill_pct.toFixed(0)}%` : ""} {isAbnormal ? " ⚠ ALERT" : ""}{hasSensorIssue ? " 🔧 SENSOR" : ""}
                </option>
              );
            })}
          </select>
          <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)] pointer-events-none group-focus-within:rotate-180 transition-transform" />
        </div>
      </div>

      <div className="flex flex-col gap-2.5 relative z-10">
        {/* Sync Status / Manual Refresh */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-[var(--color-green)] animate-pulse shadow-[0_0_8px_var(--color-green)]' : 'bg-[var(--color-card-border)]'}`}></div>
            <span className="text-[9.5px] font-black text-[var(--color-text-dim)] uppercase tracking-[0.2em]">
              {autoRefresh ? 'Telemetry Active' : 'Static Mode'}
            </span>
          </div>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1 hover:bg-[var(--color-bg)] border border-transparent hover:border-[var(--color-card-border)] rounded-lg text-[var(--color-text-dim)] hover:text-[var(--color-text)] transition-all"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Action Grid: Optimize Route (High Contrast "Pop") */}
        <button
          onClick={onOptimize}
          disabled={optimizing}
          className="active:scale-[0.98] transition-all relative overflow-hidden flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[var(--color-green)]/10 border-2 border-[var(--color-green)]/30 hover:border-[var(--color-green)]/60 hover:bg-[var(--color-green)]/20 group shadow-sm"
        >
          <div className="flex items-center gap-2.5">
            <Route size={16} className="text-[var(--color-green)] group-hover:scale-110 transition-transform" />
            <span className="text-[12px] font-black text-[var(--color-text)] uppercase tracking-[0.1em]">
              {optimizing ? "Computing..." : "Optimize Route"}
            </span>
          </div>
          <span className="text-[8.5px] font-black bg-[var(--color-green)] text-[var(--color-bg)] px-2 py-0.5 rounded leading-none">OR-TOOLS</span>
        </button>

        {/* Manual Emergency Trigger */}
        <button
          onClick={onSimulateAlert}
          className="active:scale-[0.98] transition-all flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border-2 border-[var(--color-card-border)] text-[var(--color-text-dim)] hover:text-[var(--color-red)] hover:border-[var(--color-red)]/30 hover:bg-[var(--color-red)]/5 group shadow-sm"
        >
          <Flame size={15} className="transition-colors" />
          <span className="text-[11px] font-bold uppercase tracking-[0.1em]">Simulate Emergency</span>
        </button>

        {/* Predictive AI Toggle */}
        <button
          onClick={onTogglePredict}
          className={`active:scale-[0.98] transition-all flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border-2 shadow-sm ${showPredictiveMap
            ? "bg-[var(--color-cyan)]/10 border-[var(--color-cyan)]/40 text-[var(--color-cyan)]"
            : "bg-[var(--color-bg)] border-[var(--color-card-border)] text-[var(--color-text-dim)] hover:bg-[var(--color-bg)]/80"
            } group`}
        >
          <span className={`text-[13px] ${showPredictiveMap ? 'animate-bounce' : ''}`}>⚡</span>
          <span className="text-[11px] font-bold uppercase tracking-[0.1em]">
            {showPredictiveMap ? "AI Active" : "Predict Spillover"}
          </span>
          {showPredictiveMap && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--color-cyan)] animate-pulse" />}
        </button>

        {/* ── Sensor Management Actions ── */}
        <button
          onClick={onResetSensor}
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--color-green)]/[0.03] border-2 border-[var(--color-green)]/20 hover:bg-[var(--color-green)]/[0.08] hover:border-[var(--color-green)]/40 text-[var(--color-green)]/70 hover:text-[var(--color-green)] transition-all group"
        >
          <RefreshCw size={13} className="group-hover:rotate-180 transition-transform duration-500" />
          <span className="text-[10.5px] font-black uppercase tracking-[0.15em]">Reset Sensor Failure</span>
        </button>
      </div>

      {/* ── Threshold Slider Tile ── */}
      <div className="bg-[var(--color-bg)] border-2 border-[var(--color-card-border)] rounded-2xl p-2.5 pt-3 relative overflow-hidden group shadow-inner">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle size={13} className="text-[var(--color-text-dim)]" />
            <span className="text-[10px] font-black text-[var(--color-text-dim)] uppercase tracking-[0.1em]">Target Threshold</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black tracking-tighter tabular-nums" style={{ color: `var(${fillColor === "var(--color-green)" ? "--color-green" : fillColor === "var(--color-red)" ? "--color-red" : "--color-amber"})` }}>
              {pct}
            </span>
            <span className="text-[10px] font-black text-[var(--color-text-dim)]">%</span>
          </div>
        </div>

        <div className="relative h-5 flex items-center">
          <input
            type="range" min={30} max={90} value={threshold}
            onChange={e => onThresholdChange(Number(e.target.value))}
            className="absolute inset-0 w-full h-1.5 rounded-full appearance-none cursor-pointer z-10 bg-[var(--color-card-border)]"
            style={{
              background: `linear-gradient(to right, ${fillColor} 0%, ${fillColor} ${fillPos}%, transparent ${fillPos}%)`
            }}
          />
        </div>

        <div className="flex justify-between px-1 mt-0.5">
          <span className="text-[8.5px] font-black text-[var(--color-text-muted)] uppercase tracking-tight opacity-80">Conservative</span>
          <span className="text-[8.5px] font-black text-[var(--color-text-muted)] uppercase tracking-tight opacity-80">Aggressive</span>
        </div>
      </div>
    </div>
  );
}