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
  
  // Logic to determine current active step index (0-3)
  const activeStepIdx = optimizing ? 2 : hasRoute ? 3 : hasAlert ? 1 : 0;
  const stops = route ? route.filter(b => b !== "DEPOT_00") : [];

  return (
    <div className="glass-panel p-5 slide-in flex flex-col gap-8">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <Cpu size={18} className="text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-white">Route Intelligence</h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Automated Pipeline</p>
          </div>
        </div>
        <div className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border ${
          optimizing ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' :
          hasRoute ? 'bg-green-500/10 border-green-500/30 text-green-400' :
          'bg-slate-500/10 border-white/10 text-slate-400'
        }`}>
          {optimizing ? "Computing" : hasRoute ? "Optimized" : "Monitoring"}
        </div>
      </div>

      {/* ── Amazon-Style Progress Bar ── */}
      <div className="relative flex items-center justify-between w-full px-2 py-4">
        {/* The Background Track */}
        <div className="absolute top-1/2 left-0 w-full h-[2px] bg-white/5 -translate-y-1/2 z-0"></div>
        
        {/* The Active Progress Fill */}
        <div 
          className="absolute top-1/2 left-0 h-[2px] bg-gradient-to-r from-green-500 via-amber-500 to-purple-500 -translate-y-1/2 z-0 transition-all duration-700 ease-in-out"
          style={{ width: `${(activeStepIdx / (STEPS.length - 1)) * 100}%` }}
        ></div>

        {STEPS.map((step, i) => {
          const isDone = i < activeStepIdx;
          const isActive = i === activeStepIdx;
          const Icon = step.icon;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center">
              {/* Step Node (The Circle) */}
              <div 
                className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                  isDone ? 'bg-green-500 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 
                  isActive ? 'bg-slate-900 border-purple-500 shadow-[0_0_20px_rgba(112,0,255,0.4)]' : 
                  'bg-slate-950 border-white/10'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 size={16} className="text-slate-950" strokeWidth={3} />
                ) : isActive && optimizing && i === 2 ? (
                  <Loader2 size={16} className="text-purple-400 spinner" />
                ) : (
                  <Icon size={14} className={isActive ? 'text-purple-400' : 'text-slate-600'} />
                )}
              </div>

              {/* Labels (Positioned Absolutely below) */}
              <div className="absolute top-12 flex flex-col items-center text-center min-w-[80px]">
                <span className={`text-[9px] font-black uppercase tracking-tighter mb-0.5 ${isActive ? 'text-white' : 'text-slate-500'}`}>
                  {step.label}
                </span>
                <span className="text-[8px] font-bold text-slate-600 uppercase opacity-60">
                  {step.desc}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Route Result Chips ── */}
      {hasRoute && !optimizing && (
        <div className="mt-8 bg-white/[0.02] border border-white/5 rounded-2xl p-4 slide-in">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Optimized Dispatch Sequence</p>
            <span className="text-[10px] font-black text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
              {stops.length} STOPS
            </span>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {route.map((bin, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight border ${
                  bin === "DEPOT_00" 
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
                  : 'bg-white/5 border-white/10 text-slate-300'
                }`}>
                  {bin === "DEPOT_00" ? "🏭 DEPOT" : bin}
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