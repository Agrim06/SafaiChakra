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
    <div
      className="slide-in"
      style={{
        borderRadius: 20,
        border: "1px solid rgba(255,255,255,0.07)",
        background: "linear-gradient(160deg,#0c1220 0%,#0a0f1a 100%)",
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg,#2563eb,#7c3aed)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 16px rgba(124,58,237,0.4)",
          }}>
            <Cpu size={16} color="#fff" />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: 0 }}>Route Intelligence</p>
            <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>Automated decision pipeline</p>
          </div>
        </div>
        <div style={{
          fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 99,
          ...(optimizing
            ? { background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.3)", color: "#a78bfa" }
            : hasRoute
              ? { background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.25)", color: "#38bdf8" }
              : hasAlert
                ? { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }
                : { background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", color: "#4ade80" }),
        }}>
          {optimizing ? "⚙ Computing…" : hasRoute ? "✓ Route ready" : hasAlert ? "⚠ Alert" : "● Monitoring"}
        </div>
      </div>

      {/* Pipeline steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {STEPS.map((step, i) => {
          const isDone = i < activeStep;
          const isActive = i === activeStep;
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", borderRadius: 12,
                border: isActive ? `1px solid ${step.color}44` : isDone ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent",
                background: isActive ? step.glow : isDone ? "rgba(255,255,255,0.02)" : "transparent",
                opacity: !isActive && !isDone ? 0.35 : 1,
                transition: "all 0.4s ease",
              }}
            >
              {/* Icon bubble */}
              <div style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: isDone ? "rgba(34,197,94,0.15)" : isActive ? `${step.glow}` : "rgba(255,255,255,0.04)",
              }}>
                {isDone
                  ? <CheckCircle2 size={14} color="#22c55e" />
                  : isActive && optimizing && i === 2
                    ? <Loader2 size={14} color={step.color} style={{ animation: "spin 0.7s linear infinite" }} />
                    : <Icon size={14} color={isActive ? step.color : "#4b5563"} />
                }
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, margin: 0, color: isDone ? "#d1d5db" : isActive ? step.color : "#4b5563" }}>{step.label}</p>
                <p style={{ fontSize: 10, margin: 0, color: isActive ? "#9ca3af" : "#374151", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{step.desc}</p>
              </div>

              {/* Step number */}
              <span style={{ fontSize: 10, fontWeight: 700, color: isDone ? "#22c55e" : isActive ? step.color : "#374151", flexShrink: 0 }}>
                {isDone ? "✓" : `0${i + 1}`}
              </span>
            </div>
          );
        })}
      </div>

      {/* Route result */}
      {hasRoute && !optimizing && (
        <div style={{
          borderRadius: 12, border: "1px solid rgba(167,139,250,0.2)",
          background: "rgba(167,139,250,0.04)", padding: "10px 12px",
          display: "flex", flexDirection: "column", gap: 8,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontSize: 10, color: "#6b7280", fontWeight: 600, letterSpacing: "0.08em", margin: 0 }}>OPTIMIZED ROUTE</p>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#a78bfa", background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)", borderRadius: 99, padding: "2px 8px" }}>
              {stops.length} stops
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            {route.map((bin, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{
                  fontSize: 11, padding: "3px 8px", borderRadius: 7, fontWeight: 600,
                  ...(bin === "DEPOT_00"
                    ? { background: "rgba(37,99,235,0.2)", border: "1px solid rgba(37,99,235,0.4)", color: "#93c5fd" }
                    : { background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)", color: "#c4b5fd" }),
                }}>
                  {bin === "DEPOT_00" ? "🏭 Depot" : bin}
                </span>
                {i < route.length - 1 && <ArrowRight size={10} color="#374151" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
