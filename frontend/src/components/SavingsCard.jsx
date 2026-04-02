import { Fuel, Clock, Leaf, TrendingDown } from "lucide-react";

/* Mock savings calculation based on route size */
function calcSavings(route) {
  if (!route || route.length < 2) return null;
  const stops      = route.length;
  const timeSaved  = Math.round(stops * 4.2);   // minutes
  const fuelSaved  = (stops * 0.6).toFixed(1);  // litres
  const co2Saved   = (stops * 1.4).toFixed(1);  // kg
  const costSaved  = (stops * 22).toFixed(0);   // ₹
  return { timeSaved, fuelSaved, co2Saved, costSaved, stops };
}

const Metric = ({ icon: Icon, label, value, unit, color, bg, delay = 0 }) => (
  <div
    className="slide-in flex flex-col gap-2 rounded-xl p-4"
    style={{
      background: bg,
      border: `1px solid ${color}22`,
      animationDelay: `${delay}ms`,
    }}
  >
    <div className="flex items-center justify-between">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: `${color}18` }}
      >
        <Icon size={15} style={{ color }} />
      </div>
      <span className="text-xs font-medium" style={{ color }}>↓ saved</span>
    </div>
    <div>
      <p className="text-2xl font-extrabold text-white tabular-nums">
        {value}
        <span className="text-sm font-medium text-gray-500 ml-1">{unit}</span>
      </p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  </div>
);

export default function SavingsCard({ route }) {
  const savings = calcSavings(route);

  if (!savings) {
    return (
      <div
        className="slide-in rounded-2xl p-5 flex flex-col gap-3"
        style={{
          background: "linear-gradient(135deg,#111827 0%,#0d1424 100%)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#059669,#10b981)" }}
          >
            <TrendingDown size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Efficiency Savings</p>
            <p className="text-gray-600 text-xs">Run route optimization to see projections</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.08)" }}>
          <span className="text-2xl">🧠</span>
          <p className="text-sm text-gray-500">Click <strong className="text-gray-300">Optimize Route</strong> to calculate fuel &amp; time savings</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="slide-in rounded-2xl p-5 flex flex-col gap-4"
      style={{
        background: "linear-gradient(135deg,#111827 0%,#0d1424 100%)",
        border: "1px solid rgba(16,185,129,0.2)",
        boxShadow: "0 0 30px rgba(16,185,129,0.06)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#059669,#10b981)" }}
          >
            <TrendingDown size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Efficiency Savings</p>
            <p className="text-gray-500 text-xs">vs. unoptimized route · {savings.stops} stops</p>
          </div>
        </div>
        <span
          className="text-xs px-2.5 py-1 rounded-full font-semibold"
          style={{
            background: "rgba(16,185,129,0.12)",
            border: "1px solid rgba(16,185,129,0.3)",
            color: "#34d399",
          }}
        >
          ₹{savings.costSaved} saved
        </span>
      </div>

      {/* 4 metrics */}
      <div className="grid grid-cols-2 gap-3">
        <Metric
          icon={Clock}
          label="Time saved"
          value={savings.timeSaved}
          unit="min"
          color="#60a5fa"
          bg="rgba(59,130,246,0.06)"
          delay={0}
        />
        <Metric
          icon={Fuel}
          label="Fuel saved"
          value={savings.fuelSaved}
          unit="L"
          color="#f59e0b"
          bg="rgba(245,158,11,0.06)"
          delay={80}
        />
        <Metric
          icon={Leaf}
          label="CO₂ reduced"
          value={savings.co2Saved}
          unit="kg"
          color="#34d399"
          bg="rgba(52,211,153,0.06)"
          delay={160}
        />
        <Metric
          icon={TrendingDown}
          label="Cost reduction"
          value={`₹${savings.costSaved}`}
          unit=""
          color="#c084fc"
          bg="rgba(192,132,252,0.06)"
          delay={240}
        />
      </div>

      {/* Route stops bar */}
      <div className="pt-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-600">Route efficiency</span>
          <span className="text-xs font-semibold text-emerald-400">
            {Math.min(100, Math.round(60 + savings.stops * 5))}%
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-gray-800 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(100, 60 + savings.stops * 5)}%`,
              background: "linear-gradient(to right, #059669, #34d399)",
              transition: "width 1s ease",
            }}
          />
        </div>
      </div>
    </div>
  );
}
