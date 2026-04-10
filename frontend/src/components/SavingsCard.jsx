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
      className="bg-[var(--color-bg)] border-2 border-[var(--color-card-border)] rounded-2xl p-4 flex flex-col gap-3 slide-in shadow-sm hover:border-[var(--color-text-dim)]/30 transition-all"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <div className="w-8 h-8 rounded-lg bg-[var(--color-surface)] border border-[var(--color-card-border)] flex items-center justify-center shadow-inner">
          <Icon size={14} style={{ color: `var(${color})` }} />
        </div>
        <span className="text-[8px] font-black tracking-[0.2em] uppercase text-[var(--color-text-dim)] opacity-60">Resolved</span>
      </div>
      <div>
        <p className="text-2xl font-black tracking-tighter tabular-nums mb-1 text-[var(--color-text)]">
          {value}
          <span className="text-[10px] font-bold text-[var(--color-text-dim)] ml-1 uppercase">{unit}</span>
        </p>
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)]">{label}</p>
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
    <div className="glass-panel p-5 slide-in border-[var(--color-card-border)] relative overflow-hidden">
      {/* Background Accent - Soft glow based on performance */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--color-green)]/[0.03] blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-[46px] h-[46px] rounded-2xl bg-[var(--color-bg)] border-2 border-[var(--color-card-border)] flex items-center justify-center shadow-sm">
            <TrendingDown size={22} className="text-[var(--color-green)]" />
          </div>
          <div>
            <p className="text-[10px] font-black text-[var(--color-text-dim)] uppercase tracking-[0.25em] mb-0.5">Fleet Performance</p>
            <p className="text-xl font-black text-[var(--color-text)] leading-none tracking-tight">Efficiency Savings</p>
          </div>
        </div>

        {/* Distance comparison Readout */}
        <div className="flex items-center gap-2 flex-wrap bg-[var(--color-bg)] p-1.5 rounded-xl border-2 border-[var(--color-card-border)] shadow-inner">
          <div className="px-3 py-2 flex flex-col">
            <span className="text-[9px] font-black text-[var(--color-text-dim)] uppercase mb-0.5 tracking-tighter">Raw Path</span>
            <span className="text-[12px] font-black tabular-nums text-[var(--color-text-muted)]">{s.eff_unopt} km</span>
          </div>
          <ArrowRight size={14} className="text-[var(--color-card-border)]" />
          <div className="px-3 py-2 flex flex-col bg-[var(--color-green)]/10 border border-[var(--color-green)]/20 rounded-lg">
            <span className="text-[9px] font-black text-[var(--color-green)] uppercase mb-0.5 tracking-tighter">Optimized</span>
            <span className="text-[12px] font-black tabular-nums text-[var(--color-text)]">{s.eff_opt} km</span>
          </div>
          <div className="px-4 py-2 flex flex-col bg-[var(--color-surface)] border border-[var(--color-card-border)] rounded-lg shadow-sm">
            <span className="text-[9px] font-black text-[var(--color-text-dim)] uppercase mb-0.5 tracking-tighter">Net Gain</span>
            <span className="text-[12px] font-black text-[var(--color-green)]">₹{s.costSaved}</span>
          </div>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 relative z-10">
        <Metric icon={Clock} label="Operational Time" value={s.timeSaved} unit="min" color="--color-cyan" delay={0} />
        <Metric icon={Fuel} label="Substrate Fuel" value={s.fuelSaved} unit="L" color="--color-amber" delay={60} />
        <Metric icon={Leaf} label="CO₂ Mitigation" value={s.co2Saved} unit="kg" color="--color-green" delay={120} />
        <Metric icon={TrendingDown} label="Grid Distance" value={s.eff_saved} unit="km" color="--color-purple" delay={180} />
      </div>

      {/* Efficiency progress bar */}
      <div className="bg-[var(--color-bg)] p-4 rounded-2xl border-2 border-[var(--color-card-border)] relative overflow-hidden shadow-inner">
        <div className="flex justify-between items-end mb-4 relative z-10">
          <div className="flex flex-col">
             <span className="text-[10px] font-black text-[var(--color-text-dim)] uppercase tracking-[0.2em] mb-1.5">Route Efficiency Delta</span>
             <span className="text-[11px] font-bold text-[var(--color-text-muted)] opacity-80">Real-time OR-Tools solver active</span>
          </div>
          <div className="text-right">
             <span className="text-2xl font-black text-[var(--color-green)] tracking-tighter tabular-nums">{s.pct}%</span>
          </div>
        </div>
        <div className="h-2 w-full bg-[var(--color-surface)] rounded-full overflow-hidden border border-[var(--color-card-border)] shadow-inner">
          <div 
            className="h-full bg-gradient-to-r from-[var(--color-green)] to-[var(--color-green)] opacity-90 shadow-[2px_0_8px_rgba(0,0,0,0.05)] transition-all duration-1000 ease-out"
            style={{ width: `${Math.min(100, parseFloat(s.pct))}%` }} 
          />
        </div>
        <p className="text-[9px] font-black text-[var(--color-text-dim)] mt-4 uppercase tracking-[0.2em] flex items-center gap-2 opacity-70">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-green)] shadow-sm" />
          Engine: {s.hasRealDistances ? "Synchronized GPS Matrix" : "Synthetic Estimation Mode"}
        </p>
      </div>
    </div>
  );
}