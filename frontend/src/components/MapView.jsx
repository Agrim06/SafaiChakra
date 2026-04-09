import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { Map, Maximize2, X } from "lucide-react";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl:       require("leaflet/dist/images/marker-icon.png"),
  shadowUrl:     require("leaflet/dist/images/marker-shadow.png"),
});

/* ── Icons ─────────────────────────────────────────────── */
const makeIcon = (color, pulse = false) =>
  L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:28px;height:28px;">
        ${pulse ? `<div style="
          position:absolute;inset:-6px;border-radius:50%;
          background:${color}33;animation:mapPulse 1.6s ease-in-out infinite;
        "></div>` : ""}
        <div style="
          width:28px;height:28px;
          background:${color};
          border:3px solid rgba(255,255,255,0.9);
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          box-shadow:0 2px 12px ${color}88;
        "></div>
      </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });

const makeDepotIcon = () =>
  L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:34px;height:34px;">
        <div style="
          position:absolute;inset:-8px;border-radius:50%;
          background:rgba(59,130,246,0.25);animation:mapPulse 2s ease-in-out infinite;
        "></div>
        <div style="
          width:34px;height:34px;
          background:#2563eb;
          border:3px solid #fff;
          border-radius:10px;
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 6px 16px rgba(37,99,235,0.5);
          font-size:18px;line-height:1;
        ">🏭</div>
      </div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
  });

const makeTruckIcon = () =>
  L.divIcon({
    className: "",
    html: `<div style="
      font-size:26px;line-height:1;
      filter:drop-shadow(0 4px 8px rgba(0,0,0,0.6));
      animation:truckBounce 0.5s ease-in-out infinite alternate;
    ">🚛</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

/**
 * Build a lookup of { bin_id → [lat, lng] } from the statuses map.
 * Only bins with valid coordinates are included.
 */
function buildLocations(statuses) {
  const locs = {};
  Object.values(statuses || {}).forEach((s) => {
    if (s?.latitude != null && s?.longitude != null) {
      locs[s.bin_id] = [s.latitude, s.longitude];
    }
  });
  return locs;
}

/* ── Auto-fit bounds ────────────────────────────────────── */
function FitBounds({ route, locations }) {
  const map = useMap();
  useEffect(() => {
    if (route && route.length > 1) {
      // Focus on active route
      const coords = route.map((id) => locations[id]).filter(Boolean);
      if (coords.length > 1) map.fitBounds(coords, { padding: [50, 50] });
    } else {
      // Focus on all nodes (including Depot)
      const allCoords = Object.values(locations);
      if (allCoords.length > 1) map.fitBounds(allCoords, { padding: [50, 50] });
    }
  }, [route, locations, map]);
  return null;
}

/* ── Animated truck along route ─────────────────────────── */
function AnimatedTruck({ routeCoords }) {
  const [truckPos, setTruckPos] = useState(routeCoords[0]);
  const stepRef = useRef(0);
  const segRef  = useRef(0); // progress within segment [0,1]

  useEffect(() => {
    if (!routeCoords || routeCoords.length < 2) return;
    stepRef.current = 0;
    segRef.current  = 0;
    setTruckPos(routeCoords[0]);

    const STEPS_PER_SEG = 3;  // low steps per segment since OSRM returns hundreds of micro-segments
    const INTERVAL_MS   = 10; // blazing fast ~60fps tick

    const id = setInterval(() => {
      const seg = stepRef.current;
      if (seg >= routeCoords.length - 1) {
        clearInterval(id);
        return;
      }

      segRef.current += 1;
      const t = segRef.current / STEPS_PER_SEG;

      if (t >= 1) {
        stepRef.current += 1;
        segRef.current   = 0;
        if (stepRef.current >= routeCoords.length - 1) {
          setTruckPos(routeCoords[routeCoords.length - 1]);
          clearInterval(id);
          return;
        }
      }

      const from = routeCoords[stepRef.current];
      const to   = routeCoords[Math.min(stepRef.current + 1, routeCoords.length - 1)];
      const clamped = Math.min(t, 1);
      setTruckPos([
        from[0] + (to[0] - from[0]) * clamped,
        from[1] + (to[1] - from[1]) * clamped,
      ]);
    }, INTERVAL_MS);

    return () => clearInterval(id);
  }, [routeCoords]);

  if (!truckPos) return null;
  return (
    <Marker position={truckPos} icon={makeTruckIcon()} zIndexOffset={1000}>
      <Popup>
        <div style={{ color: "#fff", fontWeight: 700 }}>🚛 Collection Truck</div>
      </Popup>
    </Marker>
  );
}

/* ── Map Legend overlay ─────────────────────────────────── */
function MapLegend() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 24,
        left: 12,
        zIndex: 1000,
        background: "rgba(10,15,30,0.82)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        padding: "10px 14px",
        minWidth: 150,
        pointerEvents: "none",
      }}
    >
      <p style={{ color: "#9ca3af", fontSize: 10, fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>
        LEGEND
      </p>
      {[
        { color: "#3b82f6", label: "Dumpyard Depot" },
        { color: "#22c55e", label: "Normal  (<40%)"   },
        { color: "#f59e0b", label: "Warning (40–70%)" },
        { color: "#ef4444", label: "Critical (>70%)"  },
        { color: "#a855f7", label: "Route path"       },
      ].map(({ color, label }) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
          <span style={{
            width: 10, height: 10, borderRadius: "50%",
            background: color, flexShrink: 0,
            boxShadow: `0 0 5px ${color}88`,
          }} />
          <span style={{ color: "#d1d5db", fontSize: 11 }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Shared map canvas ─────────────────────────────────── */
function MapCanvas({ center, route, optimizing, statuses, locations, routeCoords, bodyH, showPredictiveMap, predictiveData }) {
  return (
    <div className="flex-1 relative" style={{ minHeight: bodyH, height: bodyH }}>
      <style>{`
        @keyframes mapPulse { 0%,100%{transform:scale(1);opacity:0.6} 50%{transform:scale(1.6);opacity:0} }
        @keyframes truckBounce { from{transform:translateY(0)} to{transform:translateY(-3px)} }
        .leaflet-popup-content-wrapper {
          background:#111827!important;
          border:1px solid rgba(255,255,255,0.1)!important;
          border-radius:12px!important;
          box-shadow:0 8px 32px rgba(0,0,0,0.6)!important;
        }
        .leaflet-popup-tip { background:#111827!important; }
        .leaflet-popup-content { color:#fff!important; margin:10px 14px!important; }
      `}</style>

      <MapContainer
        center={center}
        zoom={14}
        style={{ height: "100%", width: "100%", minHeight: bodyH, background: "#0a0f1e" }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/" style="color:#6b7280">CARTO</a>'
        />

        {Object.values(statuses || {}).map((s) => {
          if (!s?.latitude || !s?.longitude) return null;
          const pos     = [s.latitude, s.longitude];
          const pct     = s.fill_pct ?? 0;
          const isDepot = s.bin_id === "DEPOT_00";
          const color   = isDepot ? "#3b82f6" : pct >= 70 ? "#ef4444" : pct >= 40 ? "#f59e0b" : "#22c55e";
          return (
            <Marker key={s.bin_id} position={pos} icon={isDepot ? makeDepotIcon() : makeIcon(color, s.is_alert)}>
              <Popup>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
                    {isDepot ? "Dumpyard Depot" : s.bin_id}
                  </p>
                  {!isDepot && (
                    <>
                      <p style={{ color, fontWeight: 600, fontSize: 12 }}>Fill: {pct.toFixed(1)}%</p>
                      <div style={{ marginTop: 6, height: 4, borderRadius: 4, background: "#374151", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4 }} />
                      </div>
                    </>
                  )}
                  <p style={{ color: "#9ca3af", fontSize: 11, marginTop: 6 }}>
                    {isDepot ? "Truck Start/End Point" : s.is_alert ? "⚠ Collection needed" : "✓ All good"}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {showPredictiveMap && predictiveData && predictiveData.map((p) => {
          if (!p.latitude || !p.longitude) return null;
          const risk = p.spillover_risk;
          const radius = risk > 80 ? 40 : risk > 50 ? 25 : 15;
          const opacity = risk > 80 ? 0.4 : risk > 50 ? 0.3 : 0.2;
          const color = risk > 80 ? "#ef4444" : risk > 50 ? "#f59e0b" : "#3b82f6";
          return (
            <CircleMarker
              key={`pred-${p.bin_id}`}
              center={[p.latitude, p.longitude]}
              radius={radius}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: opacity,
                weight: 0
              }}
            >
              <Popup>
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 700, color: "#fecaca" }}>
                  <span style={{ color: "#f87171" }}>⚡</span> AI Forecast
                </div>
                <div style={{ fontSize: 13, marginTop: 4, fontWeight: 600 }}>Bin: {p.bin_id}</div>
                <div style={{ fontSize: 12, color: color }}>Spillover Risk: {p.spillover_risk}%</div>
                <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 4, paddingBottom: 4 }}>Predicted in next 24h</div>
              </Popup>
            </CircleMarker>
          );
        })}

        {routeCoords.length > 1 && <Polyline positions={routeCoords} color="#a855f7" weight={4} opacity={0.8} dashArray="12 8" />}
        {routeCoords.length > 1 && <Polyline positions={routeCoords} color="#7c3aed" weight={8} opacity={0.25} />}
        {routeCoords.length > 1 && !optimizing && <AnimatedTruck routeCoords={routeCoords} />}

        <FitBounds route={route} locations={locations} />
      </MapContainer>

      <MapLegend />
    </div>
  );
}

/* ── Main component ─────────────────────────────────────── */
export default function MapView({ route, optimizing, status, statuses, showPredictiveMap, predictiveData }) {
  const [expanded, setExpanded] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setExpanded(false); };
    if (expanded) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const locations  = buildLocations(statuses);
  const vals       = Object.values(locations);
  const center     = vals.length > 0
    ? [vals.reduce((s, c) => s + c[0], 0) / vals.length, vals.reduce((s, c) => s + c[1], 0) / vals.length]
    : [12.305, 76.640];
  
  const routeCoords = route ? route.map((id) => locations[id]).filter(Boolean) : [];
  const routeSignature = route ? route.join(",") : "";
  const [roadPath, setRoadPath] = useState(null);

  // Hook to fetch real-world road geometries from OSRM when the route sequence changes
  useEffect(() => {
    if (!route || route.length < 2) {
      setRoadPath(null);
      return;
    }
    const coords = route.map(id => locations[id]).filter(Boolean);
    if (coords.length < 2) return;

    // Use OSRM public API to snap to roads (format: lon,lat;lon,lat...)
    const coordString = coords.map(c => `${c[1]},${c[0]}`).join(";");
    const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`;

    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (data.routes && data.routes[0]) {
          // OSRM returns GeoJSON [lon, lat], Leaflet wants [lat, lon]
          const path = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
          setRoadPath(path);
        } else {
          setRoadPath(coords); // Fallback to straight lines if routing fails
        }
      })
      .catch(e => {
        console.error("OSRM Error:", e);
        setRoadPath(coords);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeSignature]);

  // Use the fetched road path, or fall back to point-to-point lines while loading
  const displayPath = roadPath || routeCoords;

  /* ── Shared header (reused in inline + modal) ─── */
  const Header = ({ modal = false }) => (
    <div
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
        background: "linear-gradient(135deg,#111827,#0d1424)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#7c3aed,#9333ea)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Map size={14} color="#fff" />
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: 0 }}>Live City Map — Mysuru</p>
          <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>Bin locations &amp; optimized route</p>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {optimizing && (
          <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 99, background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.35)", color: "#60a5fa", fontWeight: 500 }}>⚙ Computing…</span>
        )}
        {route && !optimizing && (
          <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 99, background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.35)", color: "#c084fc", fontWeight: 500 }}>
            🚛 {route.filter(b => b !== "DEPOT_00").length} stops dispatched
          </span>
        )}
        {!route && (
          <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 99, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#6b7280" }}>
            {Object.keys(locations).length} bins tracked
          </span>
        )}

        {/* Expand / Close button */}
        <button
          onClick={() => setExpanded(v => !v)}
          title={modal ? "Close fullscreen (Esc)" : "Fullscreen map"}
          style={{
            width: 30, height: 30, borderRadius: 8,
            background: modal ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.05)",
            border: modal ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(255,255,255,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: modal ? "#f87171" : "#9ca3af",
            transition: "all 0.2s", flexShrink: 0,
          }}
        >
          {modal ? <X size={13} /> : <Maximize2 size={13} />}
        </button>
      </div>
    </div>
  );

  /* ── Inline small card ─── */
  const inlineCard = (
    <div
      className="slide-in rounded-2xl overflow-hidden flex flex-col"
      style={{
        border: "1px solid rgba(168,85,247,0.2)",
        background: "linear-gradient(135deg,#111827 0%,#0d1424 100%)",
        boxShadow: route ? "0 0 40px rgba(168,85,247,0.12)" : "none",
        transition: "box-shadow 0.6s ease",
      }}
    >
      <Header modal={false} />
      <MapCanvas
        center={center} route={route} optimizing={optimizing}
        statuses={statuses} locations={locations} routeCoords={displayPath}
        bodyH={480} showPredictiveMap={showPredictiveMap} predictiveData={predictiveData}
      />
    </div>
  );

  /* ── Fullscreen portal modal ─── */
  const modal = expanded ? createPortal(
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(4,7,16,0.88)",
        backdropFilter: "blur(10px)",
        padding: "2vh 2vw",
        animation: "fadeIn 0.2s ease",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) setExpanded(false); }}
    >
      <style>{`@keyframes fadeIn { from { opacity:0; } to { opacity:1; } }`}</style>
      <div
        style={{
          width: "95vw", height: "94vh",
          borderRadius: 20, overflow: "hidden",
          display: "flex", flexDirection: "column",
          border: "1px solid rgba(168,85,247,0.35)",
          boxShadow: "0 0 80px rgba(168,85,247,0.2), 0 40px 120px rgba(0,0,0,0.8)",
          background: "#0d1424",
        }}
      >
        <Header modal={true} />
        <MapCanvas
          center={center} route={route} optimizing={optimizing}
          statuses={statuses} locations={locations} routeCoords={displayPath}
          bodyH="calc(94vh - 56px)" showPredictiveMap={showPredictiveMap} predictiveData={predictiveData}
        />
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      {inlineCard}
      {modal}
    </>
  );
}
