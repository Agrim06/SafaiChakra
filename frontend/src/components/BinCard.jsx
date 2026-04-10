import { AlertTriangle, CheckCircle, Trash2, Zap } from "lucide-react";

function FillGauge({ pct, threshold }) {
  const isCritical = pct >= threshold;
  const isWarning = pct >= threshold - 30;
  
  // Using theme-aware deep accents for soothing mode
  const color = isCritical ? "var(--color-red)" : isWarning ? "var(--color-amber)" : "var(--color-green)";
  const shadow = `0 4px 12px ${color}33`;

  return (
    <div className="flex flex-col items-center gap-3 mt-1">
      <div className="relative w-[50px] h-[90px]">
        {/* Lid (Tactical HUD Style) */}
        <div className="absolute -top-[4px] left-1/2 -translate-x-1/2 w-[40px] h-1.5 bg-[var(--color-card-border)] rounded-full z-10" />
        
        {/* Body (Solid Modern Cylinder) */}
        <div 
          className="absolute inset-0 rounded-[12px] overflow-hidden bg-[var(--color-bg)] border-2 border-[var(--color-card-border)] shadow-inner"
        >
          {/* Fill Layer */}
          <div 
            className="absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-out" 
            style={{ 
              height: `${pct}%`, 
              background: `linear-gradient(to top, ${color}, ${color}cc)`,
            }} 
          >
            {/* Liquid Surface Shine */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-white/30" />
          </div>
          
          {/* Subtle Measurement Notches */}
          {[25, 50, 75].map(y => (
            <div 
              key={y} 
              className="absolute left-0 right-0 h-px transition-colors duration-500" 
              style={{ 
                bottom: `${y}%`, 
                background: pct >= y ? "rgba(255,255,255,0.2)" : "var(--color-card-border)" 
              }} 
            />
          ))}
        </div>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-[26px] font-black leading-none tabular-nums tracking-tighter" style={{ color }}>
          {pct.toFixed(0)}<span className="text-[12px] font-bold text-[var(--color-text-dim)] ml-0.5">%</span>
        </span>
      </div>
    </div>
  );
}

export default function BinCard({ status, loading, threshold = 70 }) {
  if (loading || !status) {
    return (
      <div className="glass-panel p-6 flex items-center justify-center animate-pulse border-[var(--color-card-border)] bg-[var(--color-surface)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-t-[var(--color-green)] border-[var(--color-card-border)] animate-spin" />
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-text-dim)]">Syncing Node...</span>
        </div>
      </div>
    );
  }

  const { bin_id, fill_pct, is_alert, message, created_at } = status;
  const isCritical = is_alert || fill_pct >= threshold;
  const isWarning = !isCritical && fill_pct >= threshold - 30;
  const label = isCritical ? "CRITICAL" : isWarning ? "WARNING" : "OPERATIONAL";
  const accentColor = isCritical ? "var(--color-red)" : isWarning ? "var(--color-amber)" : "var(--color-green)";

  return (
    <div className={`glass-panel p-5 relative overflow-hidden transition-all duration-500 border-[var(--color-card-border)] ${isCritical ? 'ring-2 ring-red-500/20' : ''}`}>
      
      {/* Structural Corner Icon */}
      <div className="absolute -top-4 -right-4 opacity-[0.03] text-[var(--color-text)]">
        <Zap size={120} />
      </div>

      {/* Header row */}
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-[46px] h-[46px] rounded-2xl flex items-center justify-center bg-[var(--color-bg)] border border-[var(--color-card-border)] shadow-sm">
             <Trash2 size={20} style={{ color: accentColor }} />
          </div>
          <div>
            <p className="text-[10px] text-[var(--color-text-dim)] uppercase tracking-[0.25em] font-black mb-1">Focus Node</p>
            <p className="text-2xl font-black text-[var(--color-text)] leading-none tracking-tight">{bin_id}</p>
          </div>
        </div>
        
        <div 
          className="px-4 py-2 rounded-xl border-2 flex items-center gap-2 shadow-sm"
          style={{ 
            borderColor: `${accentColor}44`, 
            backgroundColor: `var(--color-surface)`,
            color: accentColor 
          }}
        >
          {isCritical ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
          <span className="text-[11px] font-black tracking-widest uppercase">{label}</span>
        </div>
      </div>

      {/* Gauge + stats row */}
      <div className="flex items-start gap-10 relative z-10">
        <FillGauge pct={fill_pct} threshold={threshold} />

        <div className="flex-1 flex flex-col gap-6 pt-1">
          {/* Progress Section */}
          <div>
            <div className="flex justify-between items-end mb-3">
              <span className="text-[11px] font-black uppercase tracking-widest text-[var(--color-text-dim)]">Substrate Level</span>
              <span className="text-lg font-black tabular-nums" style={{ color: accentColor }}>
                {fill_pct.toFixed(1)}%
              </span>
            </div>
            <div className="h-2.5 w-full bg-[var(--color-bg)] rounded-full overflow-hidden border border-[var(--color-card-border)] shadow-inner">
              <div 
                className="h-full transition-all duration-1000 ease-out"
                style={{ 
                  width: `${fill_pct}%`,
                  backgroundColor: accentColor,
                  boxShadow: `2px 0 8px ${accentColor}44`
                }} 
              />
            </div>
          </div>

          {/* Grid Stats - Deep Soothing Cards */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "State", val: is_alert ? "ALERT" : "STABLE", color: is_alert ? "var(--color-red)" : "var(--color-green)" },
              { label: "Free", val: `${(100 - fill_pct).toFixed(0)}%`, color: "var(--color-cyan)" },
              { label: "Latency", val: created_at ? "0.4s" : "--", color: "var(--color-purple)" },
            ].map(({ label, val, color }) => (
              <div key={label} className="bg-[var(--color-bg)] border border-[var(--color-card-border)] rounded-2xl p-2.5 text-center shadow-sm">
                <p className="text-[9px] text-[var(--color-text-dim)] uppercase tracking-[0.2em] font-black mb-1.5">{label}</p>
                <p className="text-[12px] font-black tracking-wider" style={{ color }}>{val}</p>
              </div>
            ))}
          </div>

          {/* Status Message */}
          <div className="flex items-center gap-2 mt-2">
            <div className={`w-2 h-2 rounded-full ${isCritical ? 'bg-[var(--color-red)]' : 'bg-[var(--color-green)]'} animate-pulse`} />
            <span className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wide">
              {message || "Telemetry Stream: Synced"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}