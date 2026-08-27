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
    <div className="glass-panel shrink-0 p-3.5 sm:p-4 slide-in flex flex-col gap-3.5 border-[var(--color-card-border)] relative overflow-hidden">
      
      {/* ── Header ── */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[var(--color-purple)]/10 border border-[var(--color-purple)]/20 flex items-center justify-center shrink-0">
            <Cpu size={14} className="text-[var(--color-purple)]" />
          </div>
          <div>
            <h3 className="text-[14.5px] font-black uppercase tracking-widest text-[var(--color-text)] leading-none">Intelligence</h3>
            <p className="text-[9.5px] font-bold text-[var(--color-text-dim)] uppercase tracking-tight mt-0.5">Automated Pipeline</p>
          </div>
        </div>
        <div className={`text-[9.5px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border transition-colors ${
          optimizing ? 'bg-[var(--color-purple)]/10 border-[var(--color-purple)]/30 text-[var(--color-purple)]' :
          hasRoute ? 'bg-[var(--color-green)]/10 border-[var(--color-green)]/30 text-[var(--color-green)]' :
          'bg-[var(--color-bg)] border-[var(--color-card-border)] text-[var(--color-text-dim)]'
        }`}>
          {optimizing ? "Computing" : hasRoute ? "Optimized" : "Monitoring"}
        </div>
      </div>

      {/* ── Stepper Pipeline (Clean Flow) ── */}
      <div className="relative pt-1 pb-1">
        {/* Background Track */}
        <div className="absolute top-[18px] left-6 right-6 h-[2px] bg-[var(--color-card-border)] z-0 opacity-60"></div>
        
        {/* Active Progress Fill */}
        <div 
          className="absolute top-[18px] left-6 h-[2px] bg-gradient-to-r from-[var(--color-green)] via-[var(--color-amber)] to-[var(--color-purple)] z-0 transition-all duration-700 ease-out"
          style={{ width: `calc(${(activeStepIdx / (STEPS.length - 1)) * 100}% - ${activeStepIdx === 0 ? 0 : 24}px)` }}
        ></div>

        <div className="grid grid-cols-4 items-start gap-1 relative z-10">
          {STEPS.map((step, i) => {
            const isDone = i < activeStepIdx;
            const isActive = i === activeStepIdx;
            const Icon = step.icon;

            return (
              <div key={step.id} className="flex flex-col items-center text-center">
                {/* Node Circle */}
                <div 
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500 shadow-sm ${
                    isDone ? 'bg-[var(--color-green)] border-[var(--color-green)] text-[var(--color-bg)]' : 
                    isActive ? 'bg-[var(--color-surface)] border-[var(--color-purple)] text-[var(--color-purple)]' : 
                    'bg-[var(--color-bg)] border-[var(--color-card-border)] text-[var(--color-text-dim)]'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 size={13} strokeWidth={3} />
                  ) : isActive && optimizing && i === 2 ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Icon size={12} />
                  )}
                </div>

                {/* Step Labels */}
                <span className={`text-[10px] font-black uppercase tracking-wider mt-1.5 leading-tight ${isActive ? 'text-[var(--color-text)]' : isDone ? 'text-[var(--color-green)]' : 'text-[var(--color-text-muted)]'}`}>
                  {step.label}
                </span>
                <span className="text-[8.5px] font-bold text-[var(--color-text-dim)] uppercase tracking-tight mt-0.5 leading-tight">
                  {step.desc}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Dispatch Result chips ── */}
      {hasRoute && !optimizing && (
        <div className="bg-[var(--color-bg)] border border-[var(--color-card-border)] rounded-xl p-2.5 animate-in fade-in slide-in-from-bottom-2 shadow-inner">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[8.5px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Target Sequence</p>
            <span className="text-[8.5px] font-black text-[var(--color-purple)] bg-[var(--color-purple)]/10 px-2 py-0.5 rounded-lg border border-[var(--color-purple)]/20 uppercase tracking-tight">
              {stops.length} Nodes
            </span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar no-scrollbar scroll-smooth">
            {route.map((bin, i) => (
              <div key={i} className="flex items-center gap-1.5 shrink-0">
                <div className={`px-2 py-0.5 rounded-lg text-[9.5px] font-black uppercase border transition-all shadow-sm ${
                  bin === "DEPOT_00" 
                  ? 'bg-[var(--color-cyan)]/10 border-[var(--color-cyan)]/30 text-[var(--color-cyan)] shadow-[0_0_10px_rgba(0,219,233,0.1)]' 
                  : 'bg-[var(--color-surface)] border-[var(--color-card-border)] text-[var(--color-text)]'
                }`}>
                  {bin === "DEPOT_00" ? "HUB" : bin.replace("BIN_", "")}
                </div>
                {i < route.length - 1 && <ArrowRight size={9} className="text-[var(--color-text-dim)] opacity-40 shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}