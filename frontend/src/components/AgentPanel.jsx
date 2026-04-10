import { Cpu, ArrowRight, CheckCircle2, Loader2, Radio, Zap, Navigation } from "lucide-react";
import { useMemo } from "react";

const STEPS = [
  { id: "monitor", icon: Radio, label: "Polling", desc: "IoT Data", color: "var(--color-green)" },
  { id: "decide", icon: Zap, label: "Analysis", desc: "Threshold", color: "var(--color-amber)" },
  { id: "optimize", icon: Cpu, label: "Solver", desc: "OR-Tools", color: "var(--color-purple)" },
  { id: "act", icon: Navigation, label: "Dispatch", desc: "Fleet", color: "var(--color-cyan)" },
];

export default function RouteIntelPanel({ route, optimizing, status }) {
  const hasAlert = status?.is_alert;
  const hasRoute = !!route;
  
  const activeStepIdx = optimizing ? 2 : hasRoute ? 3 : hasAlert ? 1 : 0;
  const stops = useMemo(() => route ? route.filter(b => b !== "DEPOT_00") : [], [route]);

  return (
    <div className="glass-panel p-5 pb-14 slide-in flex flex-col gap-10 border-[var(--color-card-border)] relative overflow-hidden">
      
      {/* ── Header ── */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--color-purple)]/10 border border-[var(--color-purple)]/20 flex items-center justify-center">
            <Cpu size={18} className="text-[var(--color-purple)]" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-[var(--color-text)] leading-none">Route Intelligence</h3>
            <p className="text-[10px] font-bold text-[var(--color-text-dim)] uppercase tracking-tighter mt-1">Automated Pipeline</p>
          </div>
        </div>
        <div className={`text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border transition-colors ${
          optimizing ? 'bg-[var(--color-purple)]/10 border-[var(--color-purple)]/30 text-[var(--color-purple)]' :
          hasRoute ? 'bg-[var(--color-green)]/10 border-[var(--color-green)]/30 text-[var(--color-green)]' :
          'bg-[var(--color-bg)] border-[var(--color-card-border)] text-[var(--color-text-dim)]'
        }`}>
          {optimizing ? "Computing" : hasRoute ? "Optimized" : "Monitoring"}
        </div>
      </div>

      {/* ── Progress Pipeline ── */}
      <div className="relative flex items-center justify-between w-full px-4">
        {/* Background Track */}
        <div className="absolute top-1/2 left-4 right-4 h-[2px] bg-[var(--color-card-border)] -translate-y-1/2 z-0 opacity-50"></div>
        
        {/* Active Progress Fill */}
        <div 
          className="absolute top-1/2 left-4 h-[2px] bg-gradient-to-r from-[var(--color-green)] via-[var(--color-amber)] to-[var(--color-purple)] -translate-y-1/2 z-0 transition-all duration-1000 ease-in-out"
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
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 shadow-sm ${
                  isDone ? 'bg-[var(--color-green)] border-[var(--color-green)]' : 
                  isActive ? 'bg-[var(--color-surface)] border-[var(--color-purple)]' : 
                  'bg-[var(--color-bg)] border-[var(--color-card-border)]'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 size={18} className="text-[var(--color-bg)]" strokeWidth={3} />
                ) : isActive && optimizing && i === 2 ? (
                  <Loader2 size={18} className="text-[var(--color-purple)] animate-spin" />
                ) : (
                  <Icon size={16} className={isActive ? 'text-[var(--color-purple)]' : 'text-[var(--color-text-dim)]'} />
                )}
              </div>

              {/* Step Labels */}
              <div className="absolute top-14 flex flex-col items-center text-center w-32">
                <span className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${isActive ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}`}>
                  {step.label}
                </span>
                <span className="text-[9px] font-bold text-[var(--color-text-dim)] uppercase tracking-tighter opacity-80">
                  {step.desc}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Dispatch Result chips ── */}
      {hasRoute && !optimizing && (
        <div className="mt-4 bg-[var(--color-bg)] border-2 border-[var(--color-card-border)] rounded-2xl p-4 animate-in fade-in slide-in-from-bottom-2 shadow-inner">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Target Sequence</p>
            <span className="text-[10px] font-black text-[var(--color-purple)] bg-[var(--color-purple)]/10 px-2.5 py-1 rounded-lg border border-[var(--color-purple)]/20 uppercase tracking-tight">
              {stops.length} Nodes
            </span>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {route.map((bin, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black uppercase border-2 transition-all shadow-sm ${
                  bin === "DEPOT_00" 
                  ? 'bg-[var(--color-cyan)]/10 border-[var(--color-cyan)]/30 text-[var(--color-cyan)]' 
                  : 'bg-[var(--color-surface)] border-[var(--color-card-border)] text-[var(--color-text)]'
                }`}>
                  {bin === "DEPOT_00" ? "HUB" : bin.replace("BIN_", "")}
                </span>
                {i < route.length - 1 && <ArrowRight size={12} className="text-[var(--color-text-dim)] opacity-40" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}