import { AlertTriangle, CheckCircle, Trash2, Wifi } from "lucide-react";

function FillGauge({ pct, threshold }) {
  const isCritical = pct >= threshold;
  const isWarning = pct >= threshold - 30;
  const color = isCritical ? "#ff4d4d" : isWarning ? "#f59e0b" : "#39ff14";
  const dimColor = isCritical ? "rgba(255, 77, 77, 0.15)" : isWarning ? "rgba(245, 158, 11, 0.15)" : "rgba(57, 255, 20, 0.15)";
  const shadow = `0 0 20px ${color}33`;

  return (
    <div className="flex flex-col items-center gap-3 mt-1">
      <div className="relative w-[50px] h-[80px]">
        {/* Lid (HUD Style) */}
        <div className="absolute -top-[4px] left-1/2 -translate-x-1/2 w-[40px] h-1 bg-white/20 rounded-full z-10" />
        
        {/* Body (Glass Cylinder) */}
        <div 
          className="absolute inset-0 rounded-[10px] overflow-hidden bg-[#121318] border border-white/10 shadow-2xl backdrop-blur-sm"
          style={{ boxShadow: shadow }}
        >
          {/* Fill Layer */}
          <div 
            className="absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-out" 
            style={{ 
              height: `${pct}%`, 
              background: `linear-gradient(to top, ${color}, ${color}88)`,
              boxShadow: `inset 0 4px 12px ${color}88`
            }} 
          >
            {/* Glossy Reflection */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-transparent pointer-events-none" />
          </div>
          
          {/* Grid Lines */}
          {[25, 50, 75].map(y => (
            <div 
              key={y} 
              className="absolute left-0 right-0 h-px transition-colors duration-500" 
              style={{ bottom: `${y}%`, background: pct >= y ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.05)" }} 
            />
          ))}
        </div>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-[24px] font-black leading-none tabular-nums tracking-tighter" style={{ color, textShadow: shadow }}>
          {pct.toFixed(0)}<span className="text-[12px] font-bold text-[#85967c] ml-0.5">%</span>
        </span>
      </div>
    </div>
  );
}

export default function BinCard({ status, loading, threshold = 70 }) {
  if (loading || !status) {
    return (
      <div className="glass-panel p-6 flex items-center justify-center animate-pulse border-white/5 bg-white/[0.02]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-t-[#39ff14] border-white/5 animate-spin" />
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#85967c]">Syncing Node...</span>
        </div>
      </div>
    );
  }

  const { bin_id, fill_pct, is_alert, message, created_at } = status;
  const isCritical = is_alert || fill_pct >= threshold;
  const isWarning = !isCritical && fill_pct >= threshold - 30;
  const label = isCritical ? "CRITICAL" : isWarning ? "WARNING" : "OPERATIONAL";
  const accentColor = isCritical ? "#ff4d4d" : isWarning ? "#f59e0b" : "#39ff14";

  return (
    <div className={`glass-panel p-5 relative overflow-hidden transition-all duration-500 border-white/5 ${isCritical ? 'bg-red-500/[0.03]' : ''}`}>
      {/* Background Accent Glow */}
      <div 
        className="absolute top-0 right-0 w-32 h-32 blur-[80px] rounded-full -mr-16 -mt-16 transition-colors duration-700"
        style={{ background: `${accentColor}11` }}
      />

      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-[42px] h-[42px] rounded-xl flex items-center justify-center relative overflow-hidden bg-white/[0.03] border border-white/10 group">
             <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent group-hover:opacity-100 opacity-0 transition-opacity" />
             <Trash2 size={18} className="text-[#39ff14] relative z-10" />
          </div>
          <div>
            <p className="text-[10px] text-[#85967c] uppercase tracking-[0.25em] font-black mb-0.5">Focus Node</p>
            <p className="text-xl font-black text-white leading-none tracking-tight">{bin_id}</p>
          </div>
        </div>
        
        <div 
          className="px-3 py-1.5 rounded-lg border flex items-center gap-2 backdrop-blur-md"
          style={{ 
            borderColor: `${accentColor}33`, 
            backgroundColor: `${accentColor}11`,
            color: accentColor 
          }}
        >
          {isCritical ? <AlertTriangle size={12} /> : <CheckCircle size={12} />}
          <span className="text-[10px] font-black tracking-widest uppercase">{label}</span>
        </div>
      </div>

      {/* Gauge + stats row */}
      <div className="flex items-start gap-8">
        <FillGauge pct={fill_pct} threshold={threshold} />

        <div className="flex-1 flex flex-col gap-5 pt-1">
          {/* Fill level readout */}
          <div>
            <div className="flex justify-between items-end mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#85967c]">Substrate Level</span>
              <span className="text-sm font-black tabular-nums" style={{ color: accentColor }}>
                {fill_pct.toFixed(1)}%
              </span>
            </div>
            <div className="h-1.5 w-full bg-white/[0.05] rounded-full overflow-hidden border border-white/5">
              <div 
                className="h-full transition-all duration-1000 ease-out shadow-[0_0_12px_currentColor]"
                style={{ 
                  width: `${fill_pct}%`,
                  backgroundColor: accentColor,
                  boxShadow: `0 0 15px ${accentColor}44`
                }} 
              />
            </div>
          </div>

          {/* Grid Stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "State", val: is_alert ? "ALERT" : "STABLE", color: is_alert ? "#ff4d4d" : "#39ff14" },
              { label: "Free", val: `${(100 - fill_pct).toFixed(0)}%`, color: "#00dbe9" },
              { label: "Latency", val: created_at ? "0.4s" : "--", color: "#a855f7" },
            ].map(({ label, val, color }) => (
              <div key={label} className="bg-white/[0.02] border border-white/5 rounded-xl p-2 text-center transition-all hover:bg-white/[0.04]">
                <p className="text-[8px] text-[#85967c] uppercase tracking-[0.2em] font-black mb-1">{label}</p>
                <p className="text-[11px] font-black tracking-wider" style={{ color }}>{val}</p>
              </div>
            ))}
          </div>

          {/* Message / Status Link */}
          <div className="flex items-center gap-2 mt-auto pb-1">
            <div className={`w-1.5 h-1.5 rounded-full ${isCritical ? 'bg-red-500' : 'bg-[#39ff14]'} shadow-[0_0_8px_currentColor] animate-pulse`} />
            <span className="text-[10px] font-bold text-[#baccb0] uppercase tracking-wide truncate">
              {message || "Telemetry stream active"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
