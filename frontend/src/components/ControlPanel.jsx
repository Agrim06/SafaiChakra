import { SlidersHorizontal, RefreshCw, Route, Flame, AlertTriangle, ChevronDown } from "lucide-react";

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

      <div className="flex flex-col gap-3">
        {/* Sync Status / Manual Refresh */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`}></div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{autoRefresh ? 'Live Sync' : 'Static Mode'}</span>
          </div>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-all active:rotate-180 duration-500"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Action Grid */}
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

        {/* Predictive AI Toggle */}
        <button
          onClick={onTogglePredict}
          className={`active:scale-[0.97] transition-all duration-150 flex items-center gap-3 px-4 py-3.5 rounded-xl border ${
            showPredictiveMap 
              ? "bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.1)]" 
              : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:border-white/10"
          } group`}
        >
          <span className={`text-[16px] ${showPredictiveMap ? 'animate-bounce' : ''}`}>⚡</span>
          <span className="text-xs font-bold uppercase tracking-wider">
            {showPredictiveMap ? "Hide Forecast" : "Predict 24h Spillover"}
          </span>
          {showPredictiveMap && <span className="ml-auto text-[8px] font-black bg-amber-500 text-black px-1.5 py-0.5 rounded">ACTIVE</span>}
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
          className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
          style={{
            background: `linear-gradient(to right, ${fillColor} 0%, ${fillColor} ${fillPos}%, rgba(255,255,255,0.1) ${fillPos}%)`
          }}
        />
        
        <div className="flex justify-between px-1">
          <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">Conservative</span>
          <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">Aggressive</span>
        </div>
      </div>
    </div>
  );
}