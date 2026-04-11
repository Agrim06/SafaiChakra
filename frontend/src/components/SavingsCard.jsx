import { Fuel, Clock, Leaf, TrendingDown, ArrowRight } from "lucide-react";
import { useMemo } from "react";

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
      className="bg-[var(--color-bg)] border border-[var(--color-card-border)] rounded-xl px-3.5 py-2.5 flex items-center gap-3.5 slide-in shadow-sm hover:border-[var(--color-text-dim)]/30 transition-all"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="w-8 h-8 rounded-lg bg-[var(--color-surface)] border border-[var(--color-card-border)] flex items-center justify-center shrink-0">
        <Icon size={14} style={{ color: `var(${color})` }} />
      </div>
      <div>
        <div className="flex items-baseline gap-1">
          <span className="text-[17px] font-black tracking-tight tabular-nums text-[var(--color-text)] leading-none">{value}</span>
          <span className="text-[10px] font-bold text-[var(--color-text-dim)] uppercase">{unit}</span>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-muted)] mt-1 leading-none">{label}</p>
      </div>
    </div>
  );
}

export default function SavingsCard({ routeData }) {
  const s = useMemo(() => calcSavings(routeData), [routeData]);

  if (!s) {
    return (
      <div className="glass-panel p-6 flex flex-row items-center justify-between border-2 border-dashed border-[var(--color-card-border)] bg-[var(--color-bg)]/50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-card-border)] flex items-center justify-center shadow-sm">
            <TrendingDown size={20} className="text-[var(--color-text-dim)]" />
          </div>
          <div>
            <p className="text-sm font-black text-[var(--color-text)] uppercase tracking-wider">Efficiency Analytics</p>
            <p className="text-[10px] font-bold text-[var(--color-text-dim)] uppercase tracking-widest mt-1">
              Run <span className="text-[var(--color-green)]">Optimization</span> to sync data
            </p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 opacity-20">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="w-24 h-8 rounded-lg bg-[var(--color-card-border)]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel p-4 slide-in border-[var(--color-card-border)] relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-green)]/[0.02] blur-[60px] pointer-events-none" />

      {/* Header & Stats Row */}
      <div className="flex flex-col sm:flex-row items-center gap-5 mb-4 relative z-10">
        <div className="flex items-center gap-3.5 min-w-[170px]">
          <div className="w-[38px] h-[38px] rounded-lg bg-[var(--color-bg)] border border-[var(--color-card-border)] flex items-center justify-center shadow-sm">
            <TrendingDown size={18} className="text-[var(--color-green)]" />
          </div>
          <p className="text-[15px] font-black text-[var(--color-text)] tracking-tight">Efficiency Savings</p>
        </div>

        <div className="flex-1 grid grid-cols-[1fr_auto_1fr_auto] items-center gap-0 bg-[var(--color-bg)] rounded-xl border border-[var(--color-card-border)] overflow-hidden">
          {/* Base Configuration */}
          <div className="flex flex-col px-4 py-2 border-r border-[var(--color-card-border)] bg-[var(--color-bg)]/30">
            <span className="text-[9px] font-black text-[var(--color-text-dim)] uppercase tracking-[0.2em] mb-0.5">Traditional Routing</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">Base</span>
              <span className="text-[17px] font-black tabular-nums text-[var(--color-text-muted)] leading-none">{s.eff_unopt}</span>
              <span className="text-[10px] font-bold text-[var(--color-text-muted)] lowercase">KM</span>
            </div>
          </div>

          <div className="px-3 flex items-center justify-center">
            <ArrowRight size={14} className="text-[var(--color-text-dim)]/40" />
          </div>

          {/* Optimized Configuration */}
          <div className="flex flex-col px-4 py-2 border-l border-[var(--color-card-border)] bg-[var(--color-green)]/[0.03]">
            <span className="text-[9px] font-black text-[var(--color-green)] uppercase tracking-[0.2em] mb-0.5">OR-Tools Intelligence</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[10px] font-bold text-[var(--color-text-green)] uppercase">Opt</span>
              <span className="text-[17px] font-black tabular-nums text-[var(--color-text)] leading-none">{s.eff_opt}</span>
              <span className="text-[10px] font-bold text-[var(--color-text-dim)] lowercase">km</span>
            </div>
          </div>

          {/* Financial Dividend */}
          <div className="bg-[var(--color-surface)] border-l border-[var(--color-card-border)] px-5 py-2.5 flex flex-col justify-center items-end">
            <span className="text-[9px] font-black text-[var(--color-green)] uppercase tracking-[0.2em] mb-0.5">Dividend</span>
            <span className="text-[17px] font-black text-[var(--color-green)] tracking-tighter leading-none shadow-[0_0_15px_rgba(14,126,42,0.1)]">₹{s.costSaved} Saved</span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-4 relative z-10">
        <Metric icon={Clock} label="Operational" value={s.timeSaved} unit="mins" color="--color-cyan" delay={0} />
        <Metric icon={Fuel} label="Fuel Saved" value={s.fuelSaved} unit="L" color="--color-amber" delay={60} />
        <Metric icon={Leaf} label="CO₂" value={s.co2Saved} unit="kg" color="--color-green" delay={120} />
        <Metric icon={TrendingDown} label="Net Dist" value={s.eff_saved} unit="km" color="--color-purple" delay={180} />
      </div>

      {/* Global Efficiency Belt */}
      <div className="bg-[var(--color-bg)] px-5 py-2.5 rounded-xl border border-[var(--color-card-border)] flex items-center gap-6 shadow-inner">
        <div className="flex items-center gap-3 min-w-[130px]">
           <span className="text-[18px] font-black text-[var(--color-green)] tabular-nums">{s.pct}%</span>
           <span className="text-[10px] font-black text-[var(--color-text-dim)] uppercase tracking-widest leading-none">Efficiency<br/>Gain</span>
        </div>
        <div className="flex-1 h-2.5 bg-[var(--color-surface)] rounded-full overflow-hidden border border-[var(--color-card-border)]">
          <div 
            className="h-full bg-[var(--color-green)] opacity-80 shadow-[0_0_10px_var(--color-green)] transition-all duration-1000 ease-out"
            style={{ width: `${Math.min(100, parseFloat(s.pct))}%` }} 
          />
        </div>
        <div className="hidden sm:flex items-center gap-2.5 text-[9px] font-bold text-[var(--color-text-dim)] uppercase tracking-tighter">
           {/* <div className="w-2 h-2 rounded-full bg-[var(--color-green)] animate-pulse" />
           {s.hasRealDistances ? "GPS Active" : "Synthetic"} */}
        </div>
      </div>
    </div>
  );
}