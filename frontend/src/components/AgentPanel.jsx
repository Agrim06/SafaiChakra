import { Cpu, ArrowRight, CheckCircle2, Loader2, Radio, Zap, Navigation } from "lucide-react";

const STEPS = [
  { id: "monitor", icon: Radio, label: "Polling", desc: "IoT Data", color: "#22c55e" },
  { id: "decide", icon: Zap, label: "Analysis", desc: "Threshold", color: "#f59e0b" },
  { id: "optimize", icon: Cpu, label: "Solver", desc: "OR-Tools", color: "#a78bfa" },
  { id: "act", icon: Navigation, label: "Dispatch", desc: "Fleet", color: "#38bdf8" },
];

export default function RouteIntelPanel({ route, optimizing, status }) {
  const hasAlert = status?.is_alert;
  const hasRoute = !!route;
  
  const activeStepIdx = optimizing ? 2 : hasRoute ? 3 : hasAlert ? 1 : 0;
  const stops = route ? route.filter(b => b !== "DEPOT_00") : [];

  return (
    // FIX 1: Added pb-14 to create space for the absolute labels at the bottom
    <div className="glass-panel p-5 pb-14 slide-in flex flex-col gap-10">
      
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <Cpu size={18} className="text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-white leading-none">Route Intelligence</h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mt-1">Automated Pipeline</p>
          </div>
        </div>
        <div className={`text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border transition-colors ${
          optimizing ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' :
          hasRoute ? 'bg-green-500/10 border-green-500/30 text-green-400' :
          'bg-slate-500/10 border-white/10 text-slate-400'
        }`}>
          {optimizing ? "Computing" : hasRoute ? "Optimized" : "Monitoring"}
        </div>
      </div>

      {/* ── Progress Pipeline ── */}
      <div className="relative flex items-center justify-between w-full px-4">
        {/* The Background Track */}
        <div className="absolute top-1/2 left-4 right-4 h-[1px] bg-white/10 -translate-y-1/2 z-0"></div>
        
        {/* The Active Progress Fill */}
        <div 
          className="absolute top-1/2 left-4 h-[1px] bg-gradient-to-r from-green-500 via-amber-500 to-purple-500 -translate-y-1/2 z-0 transition-all duration-1000 ease-in-out"
          style={{ width: `calc(${(activeStepIdx / (STEPS.length - 1)) * 100}% - 32px)` }}
        ></div>

        {STEPS.map((step, i) => {
          const isDone = i < activeStepIdx;
          const isActive = i === activeStepIdx;
          const Icon = step.icon;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center">
              {/* Node Circle */}
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                  isDone ? 'bg-green-500 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 
                  isActive ? 'bg-slate-900 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.4)]' : 
                  'bg-[#0a0c10] border-white/10'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 size={18} className="text-slate-950" strokeWidth={3} />
                ) : isActive && optimizing && i === 2 ? (
                  <Loader2 size={18} className="text-purple-400 animate-spin" />
                ) : (
                  <Icon size={16} className={isActive ? 'text-purple-400' : 'text-slate-600'} />
                )}
              </div>

              {/* Absolute Labels */}
              <div className="absolute top-14 flex flex-col items-center text-center w-32">
                <span className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${isActive ? 'text-white' : 'text-slate-500'}`}>
                  {step.label}
                </span>
                <span className="text-[9px] font-bold text-slate-700 uppercase tracking-tighter">
                  {step.desc}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Dispatch Result chips ── */}
      {hasRoute && !optimizing && (
        <div className="mt-4 bg-white/[0.02] border border-white/5 rounded-2xl p-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Target Sequence</p>
            <span className="text-[9px] font-black text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20 uppercase">
              {stops.length} Nodes
            </span>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {route.map((bin, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border transition-colors ${
                  bin === "DEPOT_00" 
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
                  : 'bg-white/5 border-white/10 text-slate-300'
                }`}>
                  {bin === "DEPOT_00" ? "DEPOT" : bin}
                </span>
                {i < route.length - 1 && <ArrowRight size={10} className="text-slate-700" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}