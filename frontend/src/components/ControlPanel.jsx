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
  const fillColor = pct >= 70 ? "#ff4d4d" : pct >= 50 ? "#f59e0b" : "#39ff14";
  const glowShadow = `0 0 15px ${fillColor}44`;

  return (
    <div className="glass-panel p-5 slide-in flex flex-col gap-6 border-white/5 relative overflow-hidden">
      {/* Background HUD Lines */}
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <Zap size={100} />
      </div>

      {/* ── Bin Selector: Tactical Dropdown ── */}
      <div className="flex flex-col gap-2 relative z-10">
        <label className="text-[9px] font-black text-[#85967c] uppercase tracking-[0.25em] ml-1">Node Focus Command</label>
        <div className="relative group">
          <select
            value={activeBin || ""}
            onChange={(e) => setActiveBin(e.target.value)}
            className="w-full appearance-none bg-white/[0.03] border border-white/10 text-[#e3e1e9] text-[11px] font-black uppercase tracking-wider rounded-xl px-4 py-3.5 outline-none focus:border-[#39ff14]/40 focus:bg-white/[0.06] transition-all cursor-pointer backdrop-blur-md"
          >
            {allBins.map((id) => {
              const s = statuses[id];
              return (
                <option key={id} value={id} className="bg-[#121318] text-white">
                  {id} {s ? ` — ${s.fill_pct.toFixed(0)}%` : ""} {s?.is_alert ? " ⚠ ALERT" : ""}
                </option>
              );
            })}
          </select>
          <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#85967c] pointer-events-none group-focus-within:rotate-180 transition-transform" />
        </div>
      </div>

      <div className="flex flex-col gap-3 relative z-10">
        {/* Sync Status / Manual Refresh */}
        <div className="flex items-center justify-between px-1 mb-1">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-[#39ff14] animate-pulse shadow-[0_0_8px_#39ff14]' : 'bg-[#292a2f]'}`}></div>
            <span className="text-[9px] font-black text-[#85967c] uppercase tracking-[0.2em]">{autoRefresh ? 'Telemetry Active' : 'Static Mode'}</span>
          </div>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 hover:bg-white/5 rounded-lg text-[#85967c] hover:text-white transition-all active:rotate-180 duration-500"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Action Grid */}
        <button
          onClick={onOptimize}
          disabled={optimizing}
          className="active:scale-[0.98] transition-all duration-150 relative overflow-hidden flex items-center justify-between px-4 py-4 rounded-xl bg-[#39ff14]/[0.08] border border-[#39ff14]/20 hover:bg-[#39ff14]/[0.15] hover:border-[#39ff14]/50 hover:shadow-[0_0_20px_rgba(57,255,20,0.15)] group"
        >
          <div className="flex items-center gap-3">
            <Route size={18} className="text-[#39ff14] group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-black text-white uppercase tracking-[0.15em]">
              {optimizing ? "Computing Path..." : "Optimize Route"}
            </span>
          </div>
          <span className="text-[8px] font-black bg-[#39ff14] text-black px-2 py-0.5 rounded leading-none">OR-TOOLS</span>
          {/* Glossy overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-transparent opacity-50" />
        </button>

        {/* Alert Button */}
        <button
          onClick={onSimulateAlert}
          className="active:scale-[0.98] transition-all duration-150 relative overflow-hidden flex items-center gap-3 px-4 py-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-red-500/[0.08] hover:border-red-500/30 group"
        >
          <Flame size={16} className="text-[#85967c] group-hover:text-[#ff4d4d] transition-colors" />
          <span className="text-[10px] font-bold text-[#85967c] group-hover:text-[#ff4d4d] transition-colors uppercase tracking-[0.2em]">Simulate Emergency</span>
        </button>

        {/* Predictive AI Toggle */}
        <button
          onClick={onTogglePredict}
          className={`active:scale-[0.98] transition-all duration-150 relative overflow-hidden flex items-center gap-3 px-4 py-3.5 rounded-xl border ${
            showPredictiveMap 
              ? "bg-[#00dbe9]/[0.08] border-[#00dbe9]/30 text-[#00dbe9] shadow-[0_0_20px_rgba(0,219,233,0.1)]" 
              : "bg-white/[0.02] border-white/5 text-[#85967c] hover:bg-white/[0.05]"
          } group`}
        >
          <span className={`text-[14px] ${showPredictiveMap ? 'animate-bounce' : ''}`}>⚡</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
            {showPredictiveMap ? "Forecast Active" : "Predict Spillover"}
          </span>
          {showPredictiveMap && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#00dbe9] animate-pulse" />}
        </button>
      </div>

      {/* ── Threshold Slider ── */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 pt-5 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-[#85967c]" />
            <span className="text-[9px] font-black text-[#85967c] uppercase tracking-[0.25em]">Global Sensitivity</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black tracking-tighter tabular-nums" style={{ color: fillColor, textShadow: glowShadow }}>
              {pct}
            </span>
            <span className="text-[10px] font-black text-[#85967c]">%</span>
          </div>
        </div>

        <div className="relative h-6 flex items-center">
           <input
            type="range" min={30} max={90} value={threshold}
            onChange={e => onThresholdChange(Number(e.target.value))}
            className="absolute inset-0 w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer z-10"
            style={{
              background: `linear-gradient(to right, ${fillColor} 0%, ${fillColor} ${fillPos}%, rgba(255,255,255,0.05) ${fillPos}%)`
            }}
          />
        </div>
        
        <div className="flex justify-between px-1 mt-1 opacity-40">
          <span className="text-[8px] font-black text-[#baccb0] uppercase tracking-tighter">Conservative</span>
          <span className="text-[8px] font-black text-[#baccb0] uppercase tracking-tighter">Aggressive</span>
        </div>
      </div>
    </div>
  );
}