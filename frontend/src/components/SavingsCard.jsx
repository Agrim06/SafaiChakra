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
      className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col gap-3 slide-in hover:bg-white/[0.04] transition-all"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
          <Icon size={14} style={{ color }} />
        </div>
        <span className="text-[8px] font-black tracking-[0.2em] uppercase opacity-40">Resolved</span>
      </div>
      <div>
        <p className="text-2xl font-black tracking-tighter tabular-nums mb-1">
          {value}
          <span className="text-[10px] font-bold text-[#85967c] ml-1 uppercase">{unit}</span>
        </p>
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#85967c]">{label}</p>
      </div>
    </div>
  );
}

export default function SavingsCard({ routeData }) {
  const s = calcSavings(routeData);

  if (!s) {
    return (
      <div className="glass-panel p-6 flex flex-row items-center justify-between border-white/5 bg-[#1a1b21]/40 border-dashed border-2">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <TrendingDown size={20} className="text-[#85967c]" />
          </div>
          <div>
            <p className="text-sm font-black text-white uppercase tracking-wider">Efficiency Analytics</p>
            <p className="text-[10px] font-bold text-[#85967c] uppercase tracking-widest mt-1">Run <span className="text-[#39ff14]">Optimization</span> to sync data</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2">
           {[...Array(3)].map((_, i) => (
             <div key={i} className="w-24 h-8 rounded-lg bg-white/[0.02] border border-white/5" />
           ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel p-5 slide-in border-white/5 relative overflow-hidden">
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#39ff14]/[0.02] blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-[42px] h-[42px] rounded-xl bg-[#39ff14]/10 border border-[#39ff14]/20 flex items-center justify-center">
            <TrendingDown size={20} className="text-[#39ff14]" />
          </div>
          <div>
            <p className="text-[10px] font-black text-[#85967c] uppercase tracking-[0.25em] mb-0.5">Fleet Performance</p>
            <p className="text-lg font-black text-white leading-none tracking-tight">Efficiency Savings</p>
          </div>
        </div>

        {/* Distance comparison Readout */}
        <div className="flex items-center gap-2 flex-wrap bg-white/[0.03] p-1.5 rounded-xl border border-white/5">
          <div className="px-3 py-2 flex flex-col">
            <span className="text-[8px] font-black text-[#85967c] uppercase mb-0.5 tracking-tighter">Raw Path</span>
            <span className="text-[11px] font-black tabular-nums">{s.eff_unopt} km</span>
          </div>
          <ArrowRight size={14} className="text-[#292a2f]" />
          <div className="px-3 py-2 flex flex-col bg-[#39ff14]/10 border border-[#39ff14]/10 rounded-lg">
            <span className="text-[8px] font-black text-[#39ff14] uppercase mb-0.5 tracking-tighter">Optimized</span>
            <span className="text-[11px] font-black tabular-nums text-white">{s.eff_opt} km</span>
          </div>
          <div className="px-4 py-2 flex flex-col bg-white/5 rounded-lg">
            <span className="text-[8px] font-black text-[#baccb0] uppercase mb-0.5 tracking-tighter">Net Gain</span>
            <span className="text-[11px] font-black text-[#39ff14]">₹{s.costSaved}</span>
          </div>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Metric icon={Clock} label="Operational Time" value={s.timeSaved} unit="min" color="#00dbe9" delay={0} />
        <Metric icon={Fuel} label="Substrate Fuel" value={s.fuelSaved} unit="L" color="#f59e0b" delay={60} />
        <Metric icon={Leaf} label="CO₂ Mitigation" value={s.co2Saved} unit="kg" color="#39ff14" delay={120} />
        <Metric icon={TrendingDown} label="Grid Distance" value={s.eff_saved} unit="km" color="#a855f7" delay={180} />
      </div>

      {/* Efficiency progress bar */}
      <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5 relative overflow-hidden">
        <div className="flex justify-between items-end mb-3">
          <div className="flex flex-col">
             <span className="text-[9px] font-black text-[#85967c] uppercase tracking-[0.2em] mb-1">Route Efficiency Delta</span>
             <span className="text-[11px] font-bold text-[#baccb0]">Real-time OR-Tools analysis active</span>
          </div>
          <div className="text-right">
             <span className="text-2xl font-black text-[#39ff14] tracking-tighter">{s.pct}%</span>
          </div>
        </div>
        <div className="h-1.5 w-full bg-[#121318] rounded-full overflow-hidden border border-white/5">
          <div 
            className="h-full bg-gradient-to-r from-emerald-600 to-[#39ff14] shadow-[0_0_12px_rgba(57,255,20,0.3)] transition-all duration-1000 ease-out"
            style={{ width: `${Math.min(100, parseFloat(s.pct))}%` }} 
          />
        </div>
        <p className="text-[8px] font-black text-[#85967c] mt-3 uppercase tracking-[0.2em] flex items-center gap-2">
          <div className="w-1 h-1 rounded-full bg-[#39ff14]" />
          Engine: {s.hasRealDistances ? "Synchronized GPS Matrix" : "Synthetic Estimation Mode"}
        </p>
      </div>
    </div>
  );
}

