import { useState } from "react";
import { AlertTriangle, CheckCircle, Trash2, Wifi } from "lucide-react";

function FillGauge({ pct, threshold }) {
  const isCritical = pct >= threshold;
  const isWarning = pct >= threshold - 30;
  const color = isCritical ? "#ef4444" : isWarning ? "#f59e0b" : "#22c55e";
  const shadow = isCritical ? "0 0 20px rgba(239,68,68,0.4)" : isWarning ? "0 0 20px rgba(245,158,11,0.4)" : "0 0 20px rgba(34,197,94,0.4)";
  return (
    <div className="flex flex-col items-center gap-3.5 mt-3">
      <div className="relative w-[60px] h-[88px]">
        {/* Lid */}
        <div className="absolute -top-[7px] left-1/2 -translate-x-1/2 w-[66px] h-2 bg-gray-700 rounded-t-[3px] z-10" />
        {/* Handle */}
        <div className="absolute -top-[13px] left-1/2 -ml-[9px] w-[18px] h-[7px] border-[2.5px] border-gray-600 border-b-0 rounded-t-[6px] z-20" />
        {/* Body */}
        <div 
          className="absolute inset-0 rounded-b-[10px] overflow-hidden bg-[#080d1a] transition-shadow duration-700"
          style={{ border: `2px solid ${color}44`, boxShadow: shadow }}
        >
          <div className="fill-bar absolute bottom-0 left-0 right-0 bg-gradient-to-t" style={{ height: `${pct}%`, backgroundImage: `linear-gradient(to top, ${color}, ${color}66)` }}>
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(to bottom, ${color}ff, transparent)` }} />
          </div>
          {[25, 50, 75].map(y => <div key={y} className="absolute left-0 right-0 h-px bg-white/5" style={{ bottom: `${y}%` }} />)}
        </div>
      </div>
      <span className="text-[28px] font-black leading-none tabular-nums" style={{ color, textShadow: shadow }}>
        {pct.toFixed(0)}<span className="text-[14px] font-semibold text-gray-500">%</span>
      </span>
    </div>
  );
}

export default function BinCard({ status, loading, threshold = 70 }) {
  if (loading || !status) {
    return (
      <div className="bin-card bin-card--normal bin-card__loading">
        <div className="flex items-center gap-2.5">
          <div className="loading-ring" />
          <span className="text-[13px] text-gray-500">Loading…</span>
        </div>
      </div>
    );
  }

  const { bin_id, fill_pct, is_alert, message, created_at } = status;
  // Use either the actual alert flag from backend, or check against threshold
  const isCritical = is_alert || fill_pct >= threshold;
  const label = isCritical ? "CRITICAL" : fill_pct >= threshold - 30 ? "WARNING" : "NORMAL";

  return (
    <div className={`bin-card slide-in ${is_alert ? 'bin-card--alert' : 'bin-card--normal'}`}>
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="sc-card__icon-wrap border border-green-500/20 bg-green-500/10 w-[38px] h-[38px] rounded-[10px]">
            <Trash2 size={16} className="text-green-400" />
          </div>
          <div>
            <p className="text-[11px] text-gray-500 uppercase tracking-widest font-semibold m-0 mb-0.5">Active Bin</p>
            <p className="text-[18px] font-extrabold text-white m-0 leading-none">{bin_id}</p>
          </div>
        </div>
        <div className={`bin-card__badge ${is_alert ? 'bin-card__badge--alert' : 'bin-card__badge--normal'}`}>
          {is_alert ? <AlertTriangle size={12} className="text-red-400" /> : <CheckCircle size={12} className="text-green-400" />}
          <span className={`text-[11px] font-bold tracking-wider ${is_alert ? 'text-red-400' : 'text-green-400'}`}>{label}</span>
        </div>
      </div>

      {/* Gauge + stats row */}
      <div className="flex items-center gap-6">
        <FillGauge pct={fill_pct} threshold={threshold} />

        <div className="flex-1 flex flex-col gap-3">
          {/* Fill bar */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-[11px] text-gray-500">Fill level</span>
              <span className={`text-[11px] font-bold ${fill_pct >= threshold ? 'text-red-500' : fill_pct >= threshold - 30 ? 'text-yellow-500' : 'text-green-500'}`}>
                {fill_pct.toFixed(1)}%
              </span>
            </div>
            <div className="bin-card__progress-track">
              <div 
                className="bin-card__progress-fill shadow-[0_0_6px_currentColor]"
                style={{ 
                  width: `${fill_pct}%`,
                  backgroundImage: `linear-gradient(to right, ${fill_pct >= threshold ? "#dc2626,#ef4444" : fill_pct >= threshold - 30 ? "#d97706,#f59e0b" : "#16a34a,#22c55e"})` 
                }} 
              />
            </div>
          </div>

          {/* 3 mini stats */}
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { label: "Status", val: is_alert ? "Alert" : "OK", colorClass: is_alert ? "text-red-400" : "text-green-400" },
              { label: "Capacity", val: `${(100 - fill_pct).toFixed(0)}%`, colorClass: "text-blue-400" },
              { label: "Last sync", val: created_at ? new Date(created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--", colorClass: "text-purple-400" },
            ].map(({ label, val, colorClass }) => (
              <div key={label} className="bg-white/5 border border-white/5 rounded-lg p-1.5 text-center">
                <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-0.5 m-0">{label}</p>
                <p className={`text-[12px] font-bold m-0 ${colorClass}`}>{val}</p>
              </div>
            ))}
          </div>

          {/* Message */}
          <div className="bin-card__status-row">
            <Wifi size={11} className={is_alert ? "text-red-400" : "text-green-400"} />
            <span className="text-[11px] text-gray-400">{message}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
