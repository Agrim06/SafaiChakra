import { RefreshCw, Route, AlertTriangle, Timer, SlidersHorizontal, Flame, ChevronDown, database } from "lucide-react";

export default function ControlPanel({
  onRefresh, onOptimize, onSimulateAlert,
  autoRefresh, onToggleAutoRefresh,
  threshold, onThresholdChange,
  optimizing, loading,
  allBins, activeBin, setActiveBin, statuses // Added these props for the selector
}) {
  const pct = threshold;
  const fillPos = ((pct - 30) / (90 - 30)) * 100;
  const fillColor = pct >= 70 ? "var(--color-red)" : pct >= 50 ? "var(--color-amber)" : "var(--color-green)";
  const glowShadow = pct >= 70 ? "var(--glow-red)" : pct >= 50 ? "0 0 15px rgba(245, 158, 11, 0.2)" : "var(--glow-green)";

  return (
    <div className="glass-panel p-5 slide-in flex flex-col gap-6">
      
      {/* ── Bin Selector: Tactical Dropdown ── */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Focus Node Selection</label>
        <div className="relative group">
          <select
            value={activeBin || ""}
            onChange={(e) => setActiveBin(e.target.value)}
            className="w-full appearance-none bg-slate-900/50 border border-white/5 text-white text-xs font-bold rounded-xl px-4 py-3 outline-none focus:border-purple-500/50 focus:ring-4 ring-purple-500/10 transition-all cursor-pointer backdrop-blur-md"
          >
            {allBins.map((id) => {
              const s = statuses[id];
              return (
                <option key={id} value={id} className="bg-slate-900 text-white">
                  {id} {s ? `— ${s.fill_pct.toFixed(0)}%` : ""} {s?.is_alert ? "⚠ ALERT" : ""}
                </option>
              );
            })}
          </select>
          <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-focus-within:rotate-180 transition-transform" />
        </div>
      </div>

      <div className="h-px bg-white/5 w-full" />

      {/* ── Action Grid: Tactile Buttons ── */}
      <div className="grid grid-cols-1 gap-3">
        
        {/* Sync Button */}
        <button
          onClick={onRefresh}
          disabled={loading}
          className="active:scale-[0.97] transition-all duration-150 flex items-center gap-3 px-4 py-3.5 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-green-500/30 hover:shadow-[0_0_20px_rgba(0,245,160,0.1)] group disabled:opacity-50"
        >
          <RefreshCw size={16} className={`text-green-400 ${loading ? "spinner" : "group-hover:rotate-180 transition-transform duration-700"}`} />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Sync Telemetry</span>
        </button>

        {/* Optimize Button */}
        <button
          onClick={onOptimize}
          disabled={optimizing}
          className="active:scale-[0.97] transition-all duration-150 relative overflow-hidden flex items-center gap-3 px-4 py-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 hover:border-purple-500/50 hover:shadow-[0_0_25px_rgba(112,0,255,0.2)] group"
        >
          <Route size={16} className="text-purple-400 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            {optimizing ? "Solving..." : "Optimize Grid"}
          </span>
          <div className="ml-auto flex items-center gap-2">
             <span className="text-[9px] font-black bg-purple-500 text-white px-2 py-0.5 rounded shadow-lg">AI</span>
          </div>
        </button>

        {/* Alert Button */}
        <button
          onClick={onSimulateAlert}
          className="active:scale-[0.97] transition-all duration-150 flex items-center gap-3 px-4 py-3.5 rounded-xl bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 hover:border-red-500/40 hover:shadow-[0_0_20px_rgba(255,77,77,0.15)] group"
        >
          <Flame size={16} className="text-red-500 group-hover:animate-pulse" />
          <span className="text-xs font-bold text-slate-400 group-hover:text-red-400 transition-colors uppercase tracking-wider">Simulate Emergency</span>
        </button>
      </div>

      {/* ── Threshold Slider ── */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-500" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Global Threshold</span>
          </div>
          <span className="text-lg font-black tracking-tighter" style={{ color: fillColor, textShadow: glowShadow }}>
            {pct}%
          </span>
        </div>

        <input
          type="range" min={30} max={90} value={threshold}
          onChange={e => onThresholdChange(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer outline-none"
          style={{ 
            background: `linear-gradient(to right, ${fillColor} ${fillPos}%, rgba(255,255,255,0.05) ${fillPos}%)` 
          }}
        />
      </div>

      {/* ── Live Polling Toggle ── */}
      <button 
        onClick={onToggleAutoRefresh}
        className={`active:scale-[0.98] transition-all flex items-center justify-between p-3 rounded-xl border ${autoRefresh ? 'bg-green-500/5 border-green-500/20' : 'bg-black/20 border-white/5'}`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${autoRefresh ? 'bg-green-500/20 text-green-400' : 'bg-slate-800 text-slate-600'}`}>
            <Timer size={16} />
          </div>
          <p className={`text-[11px] font-black uppercase tracking-widest ${autoRefresh ? 'text-slate-200' : 'text-slate-600'}`}>Live Polling</p>
        </div>
        <div className={`w-10 h-5 rounded-full relative transition-colors ${autoRefresh ? 'bg-green-500' : 'bg-slate-700'}`}>
          <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${autoRefresh ? 'left-6' : 'left-1'}`} />
        </div>
      </button>

    </div>
  );
}