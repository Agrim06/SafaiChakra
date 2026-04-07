import { Fuel, Clock, Leaf, TrendingDown, ArrowRight } from "lucide-react";

const L_PER_KM = 1 / 4.5;
const DIESEL_PRICE = 93;
const CO2_PER_L = 2.68;
const SPEED_KMH = 25;

function calcSavings(routeData) {
  if (!routeData || !routeData.route || routeData.route.length < 2) return null;

  const optimized_km = routeData.optimized_distance_km ?? 0;
  const unoptimized_km = routeData.unoptimized_distance_km ?? 0;
  const saved_km = Math.max(0, unoptimized_km - optimized_km);

  const hasRealDistances = unoptimized_km > 0;
  const eff_saved = hasRealDistances ? saved_km : routeData.route.length * 0.8;
  const eff_opt = hasRealDistances ? optimized_km : routeData.route.length * 1.5;
  const eff_unopt = hasRealDistances ? unoptimized_km : routeData.route.length * 2.3;

  const fuelSaved = eff_saved * L_PER_KM;
  const co2Saved = fuelSaved * CO2_PER_L;
  const costSaved = fuelSaved * DIESEL_PRICE;
  const timeSaved = (eff_saved / SPEED_KMH) * 60;
  const pct = eff_unopt > 0 ? (eff_saved / eff_unopt) * 100 : 0;

  return {
    stops: routeData.route.filter(b => b !== "DEPOT_00").length,
    totalCityBins: routeData.total_city_bins ?? routeData.route.length,
    eff_saved: eff_saved.toFixed(2),
    eff_opt: eff_opt.toFixed(2),
    eff_unopt: eff_unopt.toFixed(2),
    fuelSaved: fuelSaved.toFixed(1),
    co2Saved: co2Saved.toFixed(1),
    costSaved: Math.round(costSaved),
    timeSaved: Math.round(timeSaved),
    pct: pct.toFixed(1),
    hasRealDistances,
  };
}

function Metric({ icon: Icon, label, value, unit, color, delay = 0 }) {
  return (
    <div
      className="slide-in"
      style={{
        borderRadius: 12,
        border: `1px solid ${color}18`,
        background: `${color}07`,
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        animationDelay: `${delay}ms`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={13} color={color} />
        </div>
        <span style={{ fontSize: 9, fontWeight: 600, color, opacity: 0.7, letterSpacing: "0.06em" }}>SAVED</span>
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#fff", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
          {value}
          <span style={{ fontSize: 11, fontWeight: 500, color: "#6b7280", marginLeft: 3 }}>{unit}</span>
        </p>
        <p style={{ margin: 0, fontSize: 10, color: "#6b7280", marginTop: 3 }}>{label}</p>
      </div>
    </div>
  );
}

export default function SavingsCard({ routeData }) {
  const s = calcSavings(routeData);

  if (!s) {
    return (
      <div
        className="slide-in"
        style={{
          borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.06)",
          background: "linear-gradient(135deg,#111827,#0d1424)",
          padding: "1.25rem",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#059669,#10b981)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <TrendingDown size={18} color="#fff" />
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: 0 }}>Efficiency Savings</p>
          <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>Run <strong style={{ color: "#c4b5fd" }}>Optimize Route</strong> to compute fuel, time & CO₂ savings vs. naive full-city run</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="slide-in"
      style={{
        borderRadius: 20,
        border: "1px solid rgba(16,185,129,0.2)",
        background: "linear-gradient(135deg,#111827,#0d1424)",
        boxShadow: "0 0 40px rgba(16,185,129,0.05)",
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#059669,#10b981)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <TrendingDown size={16} color="#fff" />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: 0 }}>Efficiency Savings</p>
            <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>
              {s.stops} critical of {s.totalCityBins} total bins · OR-Tools TSP
            </p>
          </div>
        </div>

        {/* Distance comparison */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 99, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", fontWeight: 600 }}>
            All bins: {s.eff_unopt} km
          </span>
          <ArrowRight size={12} color="#374151" />
          <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 99, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", color: "#4ade80", fontWeight: 600 }}>
            Critical only: {s.eff_opt} km
          </span>
          <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 99, background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", color: "#34d399", fontWeight: 700 }}>
            ₹{s.costSaved} saved · {s.pct}% shorter
          </span>
        </div>
      </div>

      {/* Metrics grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, margin: "8px 0" }}>
        <Metric icon={Clock} label="Time saved" value={s.timeSaved} unit="min" color="#60a5fa" delay={0} />
        <Metric icon={Fuel} label="Fuel saved" value={s.fuelSaved} unit="L" color="#f59e0b" delay={60} />
        <Metric icon={Leaf} label="CO₂ reduced" value={s.co2Saved} unit="kg" color="#34d399" delay={120} />
        <Metric icon={TrendingDown} label="Distance saved" value={s.eff_saved} unit="km" color="#c084fc" delay={180} />
      </div>

      {/* Efficiency progress bar */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: "#6b7280" }}>Route efficiency improvement</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#34d399" }}>{s.pct}%</span>
        </div>
        <div style={{ height: 5, borderRadius: 99, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 99,
            width: `${Math.min(100, parseFloat(s.pct))}%`,
            background: "linear-gradient(to right,#059669,#34d399)",
            transition: "width 1.2s ease",
          }} />
        </div>
        <p style={{ fontSize: 10, color: "#4b5563", marginTop: 5 }}>
          {s.hasRealDistances
            ? "Real OR-Tools distances · 4.5 km/L diesel truck @ ₹93/L"
            : "Estimated from stop count — add GPS coords for real figures"}
        </p>
      </div>
    </div>
  );
}
