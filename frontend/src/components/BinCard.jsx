import { useState } from "react";
import { AlertTriangle, CheckCircle, Trash2, Wifi } from "lucide-react";

function FillGauge({ pct }) {
  const color  = pct >= 70 ? "#ef4444" : pct >= 40 ? "#f59e0b" : "#22c55e";
  const shadow = pct >= 70 ? "0 0 20px rgba(239,68,68,0.4)" : pct >= 40 ? "0 0 20px rgba(245,158,11,0.4)" : "0 0 20px rgba(34,197,94,0.4)";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginTop: 12 }}>
      <div style={{ position: "relative", width: 60, height: 88 }}>
        {/* Lid */}
        <div style={{ position: "absolute", top: -7, left: "50%", transform: "translateX(-50%)", width: 66, height: 8, background: "#374151", borderRadius: "3px 3px 0 0", zIndex: 10 }} />
        {/* Handle */}
        <div style={{ position: "absolute", top: -13, left: "50%", marginLeft: -9, width: 18, height: 7, border: "2.5px solid #4b5563", borderBottom: "none", borderRadius: "6px 6px 0 0", zIndex: 20 }} />
        {/* Body */}
        <div style={{ position: "absolute", inset: 0, borderRadius: "0 0 10px 10px", overflow: "hidden", border: `2px solid ${color}44`, background: "#080d1a", boxShadow: shadow, transition: "box-shadow 0.6s" }}>
          <div className="fill-bar" style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: `${pct}%`, background: `linear-gradient(to top, ${color}, ${color}66)` }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(to bottom, ${color}ff, transparent)` }} />
          </div>
          {[25, 50, 75].map(y => <div key={y} style={{ position: "absolute", left: 0, right: 0, bottom: `${y}%`, height: 1, background: "rgba(255,255,255,0.06)" }} />)}
        </div>
      </div>
      <span style={{ fontSize: 28, fontWeight: 900, color, textShadow: shadow, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
        {pct.toFixed(0)}<span style={{ fontSize: 14, fontWeight: 600, color: "#6b7280" }}>%</span>
      </span>
    </div>
  );
}

export default function BinCard({ status, loading }) {
  if (loading || !status) {
    return (
      <div style={{ borderRadius: 20, padding: "1.5rem", minHeight: 140, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.06)", background: "linear-gradient(135deg,#111827,#0d1424)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          <span style={{ color: "#6b7280", fontSize: 13 }}>Loading…</span>
        </div>
      </div>
    );
  }

  const { bin_id, fill_pct, is_alert, message, created_at } = status;
  const color = fill_pct >= 70 ? "#ef4444" : fill_pct >= 40 ? "#f59e0b" : "#22c55e";
  const label = fill_pct >= 70 ? "CRITICAL" : fill_pct >= 40 ? "WARNING" : "NORMAL";

  return (
    <div
      className="slide-in"
      style={{
        borderRadius: 20,
        padding: "1.5rem",
        border: `1px solid ${is_alert ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.06)"}`,
        background: is_alert ? "linear-gradient(135deg,#150a0a,#1a0d0d)" : "linear-gradient(135deg,#111827,#0d1424)",
        boxShadow: is_alert ? "0 0 30px rgba(239,68,68,0.07)" : "none",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Trash2 size={16} color="#4ade80" />
          </div>
          <div>
            <p style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, margin: 0, marginBottom: 2 }}>Active Bin</p>
            <p style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: 0, lineHeight: 1 }}>{bin_id}</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 99, background: is_alert ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.08)", border: `1px solid ${is_alert ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.2)"}` }}>
          {is_alert ? <AlertTriangle size={12} color="#f87171" /> : <CheckCircle size={12} color="#4ade80" />}
          <span style={{ fontSize: 11, fontWeight: 700, color: is_alert ? "#f87171" : "#4ade80", letterSpacing: "0.05em" }}>{label}</span>
        </div>
      </div>

      {/* Gauge + stats row */}
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <FillGauge pct={fill_pct} />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Fill bar */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: "#6b7280" }}>Fill level</span>
              <span style={{ fontSize: 11, fontWeight: 700, color }}>{fill_pct.toFixed(1)}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${fill_pct}%`, background: `linear-gradient(to right, ${fill_pct >= 70 ? "#dc2626,#ef4444" : fill_pct >= 40 ? "#d97706,#f59e0b" : "#16a34a,#22c55e"})`, borderRadius: 99, transition: "width 1.2s ease", boxShadow: `0 0 6px ${color}88` }} />
            </div>
          </div>

          {/* 3 mini stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            {[
              { label: "Status", val: is_alert ? "Alert" : "OK", color: is_alert ? "#f87171" : "#4ade80" },
              { label: "Capacity", val: `${(100 - fill_pct).toFixed(0)}%`, color: "#60a5fa" },
              { label: "Last sync", val: created_at ? new Date(created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--", color: "#a78bfa" },
            ].map(({ label, val, color: c }) => (
              <div key={label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, padding: "6px 8px", textAlign: "center" }}>
                <p style={{ fontSize: 9, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{label}</p>
                <p style={{ fontSize: 12, fontWeight: 700, color: c, margin: 0 }}>{val}</p>
              </div>
            ))}
          </div>

          {/* Message */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
            <Wifi size={11} color={is_alert ? "#f87171" : "#4ade80"} />
            <span style={{ fontSize: 11, color: "#9ca3af" }}>{message}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
