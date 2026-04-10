import { Leaf, Activity, ChevronRight } from "lucide-react";

export default function Navbar({ lastUpdated, isLive }) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-[1000] px-8 py-3">
      <div className="max-w-[1800px] mx-auto glass-panel border-white/5 bg-[#1a1b21]/60 backdrop-blur-2xl flex items-center justify-between px-6 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative overflow-hidden">
        {/* Animated HUD line at the top */}
        <div className="absolute top-0 left-0 h-[1px] w-full bg-gradient-to-r from-transparent via-[#39ff14]/40 to-transparent" />

        {/* Logo Section */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#39ff14]/10 border border-[#39ff14]/20 flex items-center justify-center shadow-[0_0_15px_rgba(57,255,20,0.15)] group transition-all hover:bg-[#39ff14]/20">
            <Leaf size={18} className="text-[#39ff14] group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-baseline leading-none">
              <span className="text-[18px] font-black tracking-tight text-white">Safai</span>
              <span className="text-[18px] font-black tracking-tight text-[#39ff14]">Chakra</span>
            </div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#85967c] mt-0.5">
              Operations Center V1.2.4
            </p>
          </div>
        </div>

        {/* Mission Pipeline (HUD Style) */}
        <div className="hidden lg:flex items-center gap-6 px-8 py-1.5 rounded-full bg-white/[0.02] border border-white/5">
          {[
            { label: "Monitor", color: "#39ff14" },
            { label: "Decide", color: "#f59e0b" },
            { label: "Optimize", color: "#00dbe9" },
            { label: "Act", color: "#a855f7" },
          ].map(({ label, color }, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2 py-0.5">
                <div className={`w-1 h-1 rounded-full ${i === 0 ? 'animate-pulse' : ''}`} style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />
                <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: i === 0 ? "#e3e1e9" : "#64748b" }}>{label}</span>
              </div>
              {i < 3 && <ChevronRight size={10} className="text-[#292a2f]" />}
            </div>
          ))}
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-5">
          {/* Live Heartbeat */}
          <div className={`flex items-center gap-3 px-3 py-1.5 rounded-lg border transition-all duration-500 ${isLive ? 'bg-[#39ff14]/[0.05] border-[#39ff14]/20 text-[#39ff14]' : 'bg-red-500/5 border-red-500/20 text-red-500'}`}>
            <div className={`w-2 h-2 rounded-full ${isLive ? 'animate-pulse shadow-[0_0_8px_#39ff14]' : ''} bg-current`} />
            <span className="text-[10px] font-black uppercase tracking-[0.25em]">{isLive ? "LIVE" : "OFFLINE"}</span>
          </div>

          {/* Activity Readout */}
          <div className="flex items-center gap-2.5 text-[#85967c] border-l border-white/5 pl-5">
            <Activity size={14} className="animate-pulse" />
            <span className="text-[11px] font-black tabular-nums tracking-widest">{lastUpdated || "--:--:--"}</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
