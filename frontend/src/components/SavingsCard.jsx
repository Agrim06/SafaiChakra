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

function Metric({ icon: Icon, label, value, unit, colorClass, borderClass, bgClass, textClass, delay = 0 }) {
  return (
    <div
      className={`savings-metric slide-in border ${borderClass} ${bgClass}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <div className={`savings-metric__icon bg-white/5`}>
          <Icon size={13} className={colorClass} />
        </div>
        <span className={`savings-metric__tag ${colorClass} opacity-80 tracking-widest`}>SAVED</span>
      </div>
      <div>
        <p className="savings-metric__value m-0">
          {value}
          <span className="savings-metric__unit">{unit}</span>
        </p>
        <p className="savings-metric__label m-0 mt-1">{label}</p>
      </div>
    </div>
  );
}

export default function SavingsCard({ routeData }) {
  const s = calcSavings(routeData);

  if (!s) {
    return (
      <div className="savings-card savings-card--empty slide-in !flex-row items-center justify-center gap-4 py-8">
        <div className="savings-card__icon shrink-0">
          <TrendingDown size={18} className="text-white" />
        </div>
        <div>
          <p className="text-[14px] font-bold text-white m-0">Efficiency Savings</p>
          <p className="text-[12px] text-gray-500 m-0 mt-1">Run <strong className="text-purple-400">Optimize Route</strong> to compute fuel, time & CO₂ savings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="savings-card savings-card--active slide-in">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="savings-card__icon shrink-0">
            <TrendingDown size={16} className="text-white" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-white m-0">Efficiency Savings</p>
            <p className="text-[11px] text-gray-500 m-0">
              {s.stops} critical bins · <strong>Closed-loop City Circuit</strong> (incl. return)
            </p>
          </div>
        </div>

        {/* Distance comparison */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="savings-dist-badge savings-dist-badge--before">
            All bins: {s.eff_unopt} km
          </span>
          <ArrowRight size={12} className="text-gray-700" />
          <span className="savings-dist-badge savings-dist-badge--after">
            Critical only: {s.eff_opt} km
          </span>
          <span className="savings-dist-badge savings-dist-badge--total">
            ₹{s.costSaved} saved · {s.pct}% shorter
          </span>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-2.5 my-2">
        <Metric icon={Clock} label="Time saved" value={s.timeSaved} unit="min" colorClass="text-blue-400" borderClass="border-blue-400/20" bgClass="bg-blue-400/5" delay={0} />
        <Metric icon={Fuel} label="Fuel saved" value={s.fuelSaved} unit="L" colorClass="text-amber-500" borderClass="border-amber-500/20" bgClass="bg-amber-500/5" delay={60} />
        <Metric icon={Leaf} label="CO₂ reduced" value={s.co2Saved} unit="kg" colorClass="text-emerald-400" borderClass="border-emerald-400/20" bgClass="bg-emerald-400/5" delay={120} />
        <Metric icon={TrendingDown} label="Distance saved" value={s.eff_saved} unit="km" colorClass="text-purple-400" borderClass="border-purple-400/20" bgClass="bg-purple-400/5" delay={180} />
      </div>

      {/* Efficiency progress bar */}
      <div>
        <div className="flex justify-between mb-1.5">
          <span className="text-[11px] text-gray-500">Route efficiency improvement</span>
          <span className="text-[11px] font-bold text-emerald-400">{s.pct}%</span>
        </div>
        <div className="savings-progress-track">
          <div 
            className="savings-progress-fill"
            style={{ width: `${Math.min(100, parseFloat(s.pct))}%` }} 
          />
        </div>
        <p className="text-[10px] text-gray-600 mt-1.5">
          {s.hasRealDistances
            ? "Real OR-Tools distances · 4.5 km/L diesel truck @ ₹93/L"
            : "Estimated from stop count — add GPS coords for real figures"}
        </p>
      </div>
    </div>
  );
}
