import { Cpu, ArrowRight, CheckCircle2, Loader2, Radio, Zap, Navigation } from "lucide-react";

const STEPS = [
  {
    id: "monitor",
    icon: Radio,
    label: "Sensor polling",
    desc: "IoT bin data ingested via HTTP",
    color: "#22c55e",
    glow: "rgba(34,197,94,0.15)",
  },
  {
    id: "decide",
    icon: Zap,
    label: "Threshold analysis",
    desc: "Fill levels vs alert threshold",
    color: "#f59e0b",
    glow: "rgba(245,158,11,0.15)",
  },
  {
    id: "optimize",
    icon: Cpu,
    label: "OR-Tools solver",
    desc: "TSP route via Guided Local Search",
    color: "#a78bfa",
    glow: "rgba(167,139,250,0.15)",
  },
  {
    id: "act",
    icon: Navigation,
    label: "Fleet dispatch",
    desc: "Truck routed to critical bins",
    color: "#38bdf8",
    glow: "rgba(56,189,248,0.15)",
  },
];

export default function RouteIntelPanel({ route, optimizing, status }) {
  const hasAlert = status?.is_alert;
  const hasRoute = !!route;
  const activeStep = optimizing ? 2 : hasRoute ? 3 : hasAlert ? 1 : 0;

  // Count non-depot stops
  const stops = route ? route.filter(b => b !== "DEPOT_00") : [];

  return (
    <div className="agent-card slide-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="agent-card__icon">
            <Cpu size={16} color="#fff" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-white m-0">Route Intelligence</p>
            <p className="text-[11px] text-gray-500 m-0">Automated decision pipeline</p>
          </div>
        </div>
        <div className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
          optimizing ? 'bg-purple-500/10 border border-purple-500/30 text-purple-400' :
          hasRoute ? 'bg-sky-500/10 border border-sky-500/25 text-sky-400' :
          hasAlert ? 'bg-red-500/10 border border-red-500/25 text-red-400' :
          'bg-green-500/10 border border-green-500/25 text-green-400'
        }`}>
          {optimizing ? "⚙ Computing…" : hasRoute ? "✓ Route ready" : hasAlert ? "⚠ Alert" : "● Monitoring"}
        </div>
      </div>

      {/* Pipeline steps */}
      <div className="flex flex-col gap-1.5">
        {STEPS.map((step, i) => {
          const isDone = i < activeStep;
          const isActive = i === activeStep;
          const Icon = step.icon;
          
          let stepClass = "agent-step";
          if (isDone) stepClass += " agent-step--done";
          if (!isActive && !isDone) stepClass += " agent-step--pending";

          return (
            <div
              key={step.id}
              className={stepClass}
              style={{
                borderColor: isActive ? `${step.color}44` : undefined,
                background: isActive ? step.glow : undefined,
              }}
            >
              {/* Icon bubble */}
              <div 
                className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center bg-white/5"
                style={{
                  background: isDone ? "rgba(34,197,94,0.15)" : isActive ? `${step.glow}` : "rgba(255,255,255,0.04)",
                }}
              >
                {isDone
                  ? <CheckCircle2 size={14} color="#22c55e" />
                  : isActive && optimizing && i === 2
                    ? <Loader2 size={14} color={step.color} className="spinner" />
                    : <Icon size={14} color={isActive ? step.color : "#4b5563"} />
                }
              </div>

              <div className="flex-1 min-w-0">
                <p 
                  className={`text-[12px] font-semibold m-0 ${isDone ? 'text-gray-300' : ''}`}
                  style={{ color: !isDone && isActive ? step.color : undefined }}
                >
                  {step.label}
                </p>
                <p 
                  className={`text-[10px] m-0 whitespace-nowrap overflow-hidden text-ellipsis ${isActive ? 'text-gray-400' : 'text-gray-700'}`}
                >
                  {step.desc}
                </p>
              </div>

              {/* Step number */}
              <span 
                className={`agent-step__num ${isDone ? 'text-green-500' : 'text-gray-700'}`}
                style={{ color: (!isDone && isActive) ? step.color : undefined }}
              >
                {isDone ? "✓" : `0${i + 1}`}
              </span>
            </div>
          );
        })}
      </div>

      {/* Route result */}
      {hasRoute && !optimizing && (
        <div className="agent-route-box flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-gray-500 font-semibold tracking-wider m-0">OPTIMIZED ROUTE</p>
            <span className="text-[10px] font-bold text-purple-400 bg-purple-500/15 border border-purple-500/30 rounded-full px-2 py-0.5">
              {stops.length} stops
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 items-center">
            {route.map((bin, i) => (
              <div key={i} className="flex items-center gap-1">
                <span className={`agent-bin-chip ${bin === "DEPOT_00" ? '!bg-blue-600/20 !border-blue-600/40 !text-blue-300' : ''}`}>
                  {bin === "DEPOT_00" ? "🏭 Depot" : bin}
                </span>
                {i < route.length - 1 && <ArrowRight size={10} className="text-gray-700" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
