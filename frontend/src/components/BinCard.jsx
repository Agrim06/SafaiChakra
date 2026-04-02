import { AlertTriangle, CheckCircle, Trash2, Zap } from "lucide-react";

function FillGauge({ pct }) {
  const color  = pct >= 70 ? "#ef4444" : pct >= 40 ? "#f59e0b" : "#22c55e";
  const shadow = pct >= 70
    ? "0 0 24px rgba(239,68,68,0.35)"
    : pct >= 40
    ? "0 0 24px rgba(245,158,11,0.35)"
    : "0 0 24px rgba(34,197,94,0.35)";

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Bin body */}
      <div className="relative" style={{ width: 88, height: 130 }}>
        {/* Lid */}
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-t-sm z-10"
          style={{ top: -10, width: 96, height: 12, background: "#374151", borderRadius: "4px 4px 0 0" }}
        />
        {/* Handle */}
        <div
          className="absolute left-1/2 z-20"
          style={{
            top: -18, width: 28, height: 10, marginLeft: -14,
            border: "3px solid #4b5563",
            borderBottom: "none",
            borderRadius: "8px 8px 0 0",
          }}
        />
        {/* Body */}
        <div
          className="absolute inset-0 rounded-b-2xl overflow-hidden"
          style={{
            border: `2px solid ${color}44`,
            background: "#080d1a",
            boxShadow: shadow,
            transition: "box-shadow 0.6s ease, border-color 0.4s",
          }}
        >
          {/* Fill */}
          <div
            className="fill-bar absolute bottom-0 left-0 right-0"
            style={{
              height: `${pct}%`,
              background: `linear-gradient(to top, ${color}, ${color}66)`,
              transition: "height 1.2s cubic-bezier(.4,0,.2,1)",
            }}
          >
            {/* Surface ripple */}
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0,
              height: 6,
              background: `linear-gradient(to bottom, ${color}ff, ${color}00)`,
            }} />
          </div>
          {/* Glare */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 60%)",
            }}
          />
          {/* Grid lines */}
          {[25, 50, 75].map((y) => (
            <div
              key={y}
              className="absolute left-0 right-0"
              style={{
                bottom: `${y}%`, height: 1,
                background: "rgba(255,255,255,0.05)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Percentage */}
      <div className="text-center">
        <span className="text-5xl font-black tabular-nums" style={{ color, textShadow: shadow }}>
          {pct.toFixed(1)}
        </span>
        <span className="text-2xl font-bold text-gray-500 ml-1">%</span>
      </div>
    </div>
  );
}

export default function BinCard({ status, loading }) {
  if (loading || !status) {
    return (
      <div
        className="rounded-2xl p-6 flex items-center justify-center"
        style={{
          minHeight: 300,
          border: "1px solid rgba(255,255,255,0.06)",
          background: "linear-gradient(135deg,#111827,#0d1424)",
        }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600 text-sm">Loading bin data…</span>
        </div>
      </div>
    );
  }

  const { bin_id, fill_pct, is_alert, message } = status;

  return (
    <div
      className="slide-in rounded-2xl p-6 flex flex-col gap-5"
      style={{
        border: `1px solid ${is_alert ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.06)"}`,
        background: is_alert
          ? "linear-gradient(135deg,#150a0a,#1a0d0d)"
          : "linear-gradient(135deg,#111827,#0d1424)",
        boxShadow: is_alert ? "0 0 40px rgba(239,68,68,0.08)" : "none",
        transition: "box-shadow 0.6s, border-color 0.4s",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}
          >
            <Trash2 size={18} className="text-green-400" />
          </div>
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-widest font-medium">Bin ID</p>
            <p className="text-white font-bold text-xl leading-tight">{bin_id}</p>
          </div>
        </div>

        {is_alert ? (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.35)",
            }}
          >
            <AlertTriangle size={13} className="text-red-400" />
            <span className="text-red-400 text-xs font-bold tracking-wide">CRITICAL</span>
          </div>
        ) : (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{
              background: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.2)",
            }}
          >
            <CheckCircle size={13} className="text-green-400" />
            <span className="text-green-400 text-xs font-bold tracking-wide">NORMAL</span>
          </div>
        )}
      </div>

      {/* Gauge */}
      <div className="flex-1 flex items-center justify-center py-2">
        <FillGauge pct={fill_pct} />
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-gray-600 mb-1.5">
          <span>Fill level</span>
          <span>{fill_pct.toFixed(1)}%</span>
        </div>
        <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${fill_pct}%`,
              background:
                fill_pct >= 70
                  ? "linear-gradient(to right,#dc2626,#ef4444)"
                  : fill_pct >= 40
                  ? "linear-gradient(to right,#d97706,#f59e0b)"
                  : "linear-gradient(to right,#16a34a,#22c55e)",
              transition: "width 1.2s ease",
              boxShadow:
                fill_pct >= 70
                  ? "0 0 8px rgba(239,68,68,0.6)"
                  : fill_pct >= 40
                  ? "0 0 8px rgba(245,158,11,0.6)"
                  : "0 0 8px rgba(34,197,94,0.6)",
            }}
          />
        </div>
      </div>

      {/* Status message */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
      >
        <Zap size={13} className={is_alert ? "text-red-400" : "text-green-400"} />
        <p className="text-sm text-gray-400">{message}</p>
      </div>
    </div>
  );
}
