import { Bot, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

const STEPS = [
  { id: "monitor",  label: "Monitoring",  desc: "Reading IoT sensor data from bins",       color: "text-green-400",  border: "border-green-500/30",  bg: "bg-green-500/10"  },
  { id: "decide",   label: "Deciding",    desc: "Analysing fill levels & alert thresholds", color: "text-yellow-400", border: "border-yellow-500/30", bg: "bg-yellow-500/10" },
  { id: "optimize", label: "Optimizing",  desc: "Running OR-Tools route solver",            color: "text-blue-400",   border: "border-blue-500/30",   bg: "bg-blue-500/10"   },
  { id: "act",      label: "Acting",      desc: "Dispatching collection crew",              color: "text-purple-400", border: "border-purple-500/30", bg: "bg-purple-500/10" },
];

export default function AgentPanel({ route, optimizing, status }) {
  const hasAlert  = status?.is_alert;
  const hasRoute  = !!route;

  const activeStep = optimizing ? 2 : hasRoute ? 3 : hasAlert ? 1 : 0;

  return (
    <div className="slide-in rounded-2xl border border-gray-800 bg-gray-900/60 p-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-900/40">
          <Bot size={17} className="text-white" />
        </div>
        <div>
          <p className="text-white font-semibold text-sm">AI Agent Status</p>
          <p className="text-gray-500 text-xs">Monitor → Decide → Optimize → Act</p>
        </div>
        <div className="ml-auto">
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
            optimizing
              ? "bg-blue-500/10 border border-blue-500/30 text-blue-400"
              : hasAlert
              ? "bg-red-500/10 border border-red-500/30 text-red-400"
              : "bg-green-500/10 border border-green-500/30 text-green-400"
          }`}>
            {optimizing ? "Running..." : hasAlert ? "Alert" : "Idle"}
          </span>
        </div>
      </div>

      {/* Pipeline steps */}
      <div className="flex flex-col gap-2">
        {STEPS.map((step, i) => {
          const isDone   = i < activeStep;
          const isActive = i === activeStep;
          return (
            <div
              key={step.id}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-500 ${
                isActive
                  ? `${step.border} ${step.bg}`
                  : isDone
                  ? "border-gray-700 bg-gray-800/40"
                  : "border-transparent bg-transparent opacity-40"
              }`}
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                isDone ? "bg-green-500/20" : isActive ? step.bg : "bg-gray-800"
              }`}>
                {isDone ? (
                  <CheckCircle2 size={14} className="text-green-400" />
                ) : isActive && optimizing && i === 2 ? (
                  <Loader2 size={14} className={`${step.color} animate-spin`} />
                ) : (
                  <span className={`text-xs font-bold ${isActive ? step.color : "text-gray-600"}`}>
                    {i + 1}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${isActive ? step.color : isDone ? "text-gray-300" : "text-gray-600"}`}>
                  {step.label}
                </p>
                <p className={`text-xs truncate ${isActive ? "text-gray-400" : "text-gray-600"}`}>
                  {step.desc}
                </p>
              </div>
              {i < STEPS.length - 1 && (
                <ArrowRight size={14} className={isDone || isActive ? "text-gray-500" : "text-gray-800"} />
              )}
            </div>
          );
        })}
      </div>

      {/* Route result */}
      {hasRoute && !optimizing && (
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3">
          <p className="text-xs text-gray-500 mb-2">Optimized Route</p>
          <div className="flex flex-wrap gap-1.5">
            {route.map((bin, i) => (
              <span key={i} className="text-xs px-2 py-1 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 font-medium">
                {bin === "DEPOT_00" ? "Dumpyard" : bin}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
