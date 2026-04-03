import { Fuel, Clock, Leaf, TrendingDown } from "lucide-react";

/**
 * Savings constants — typical Indian municipal garbage truck figures
 * Fuel economy : ~4.5 km/L (diesel garbage truck)  → 0.222 L/km
 * Diesel price : ₹93/L (national average 2024)
 * CO₂ factor   : 2.68 kg CO₂ per litre of diesel (IPCC)
 * Avg city speed: 25 km/h
 */
const L_PER_KM    = 1 / 4.5;          // litres consumed per km
const DIESEL_PRICE = 93;              // ₹ per litre
const CO2_PER_L   = 2.68;            // kg CO₂ per litre
const SPEED_KMH   = 25;              // average city speed (km/h)

function calcSavings(routeData) {
  if (!routeData || !routeData.route || routeData.route.length < 2) return null;

  const optimized_km    = routeData.optimized_distance_km   ?? 0;
  const unoptimized_km  = routeData.unoptimized_distance_km ?? 0;
  const saved_km        = Math.max(0, unoptimized_km - optimized_km);

  // If distances are real (backend returned them), use them.
  // Otherwise fall back to a stop-count estimate so the card is never blank.
  const hasRealDistances = unoptimized_km > 0;
  const effective_saved  = hasRealDistances ? saved_km : routeData.route.length * 0.8;
  const effective_opt    = hasRealDistances ? optimized_km : routeData.route.length * 1.5;
  const effective_unopt  = hasRealDistances ? unoptimized_km : routeData.route.length * 2.3;

  const fuelSaved = effective_saved * L_PER_KM;
  const co2Saved  = fuelSaved * CO2_PER_L;
  const costSaved = fuelSaved * DIESEL_PRICE;
  const timeSaved = (effective_saved / SPEED_KMH) * 60;

  const pctImprovement = effective_unopt > 0
    ? ((effective_saved / effective_unopt) * 100)
    : 0;

  return {
    stops:           routeData.route.length,
    saved_km:        effective_saved.toFixed(2),
    optimized_km:    effective_opt.toFixed(2),
    unoptimized_km:  effective_unopt.toFixed(2),
    fuelSaved:       fuelSaved.toFixed(1),
    co2Saved:        co2Saved.toFixed(1),
    costSaved:       Math.round(costSaved),
    timeSaved:       Math.round(timeSaved),
    pctImprovement:  pctImprovement.toFixed(1),
    hasRealDistances,
  };
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

export default function SavingsCard({ routeData }) {
  const savings = calcSavings(routeData);

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
          <p className="text-sm text-gray-500">Click <strong className="text-gray-300">Optimize Route</strong> to calculate real fuel &amp; time savings</p>
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
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#059669,#10b981)" }}
          >
            <TrendingDown size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Efficiency Savings</p>
            <p className="text-gray-500 text-xs">
              {savings.stops} critical bins collected out of {routeData.total_city_bins ?? savings.stops} total
            </p>
          </div>
        </div>

        {/* Distance comparison badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-xs px-2.5 py-1 rounded-full font-medium tabular-nums"
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
              color: "#f87171",
            }}
          >
            All bins: {savings.unoptimized_km} km
          </span>
          <span className="text-gray-700 text-xs">→</span>
          <span
            className="text-xs px-2.5 py-1 rounded-full font-medium tabular-nums"
            style={{
              background: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.2)",
              color: "#4ade80",
            }}
          >
            Critical only: {savings.optimized_km} km
          </span>
          <span
            className="text-xs px-2.5 py-1 rounded-full font-semibold"
            style={{
              background: "rgba(16,185,129,0.12)",
              border: "1px solid rgba(16,185,129,0.3)",
              color: "#34d399",
            }}
          >
            ₹{savings.costSaved} saved · {savings.pctImprovement}% shorter
          </span>
        </div>
      </div>

      {/* 4 real metrics */}
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
          label="Distance saved"
          value={savings.saved_km}
          unit="km"
          color="#c084fc"
          bg="rgba(192,132,252,0.06)"
          delay={240}
        />
      </div>

      {/* Route efficiency bar — based on real % improvement */}
      <div className="pt-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-600">Route efficiency gain</span>
          <span className="text-xs font-semibold text-emerald-400">
            {savings.pctImprovement}%
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-gray-800 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(100, parseFloat(savings.pctImprovement))}%`,
              background: "linear-gradient(to right, #059669, #34d399)",
              transition: "width 1s ease",
            }}
          />
        </div>
        <p className="text-xs text-gray-700 mt-1.5">
          {savings.hasRealDistances
            ? "Based on real OR-Tools route vs. unoptimized baseline · assumes 4.5 km/L diesel truck at ₹93/L"
            : "Estimated from stop count — seed GPS coordinates into bins for real distance calculations"}
        </p>
      </div>
    </div>
  );
}
