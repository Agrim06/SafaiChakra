import { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { Map } from "lucide-react";

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
    if (!route?.length) return;
    const coords = route.map((id) => locations[id]).filter(Boolean);
    if (coords.length > 1) map.fitBounds(coords, { padding: [50, 50] });
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

    const STEPS_PER_SEG = 40; // smoothness
    const INTERVAL_MS   = 80; // ms between steps

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

/* ── Main component ─────────────────────────────────────── */
export default function MapView({ route, optimizing, status, statuses }) {
  // Build location map from live API data
  const locations = buildLocations(statuses);
  const hasLocations = Object.keys(locations).length > 0;

  // Default center: mean of known coords, or fallback
  const center = hasLocations
    ? (() => {
        const vals = Object.values(locations);
        return [
          vals.reduce((s, c) => s + c[0], 0) / vals.length,
          vals.reduce((s, c) => s + c[1], 0) / vals.length,
        ];
      })()
    : [28.614, 77.235];

  const routeCoords = route
    ? route.map((id) => locations[id]).filter(Boolean)
    : [];

  return (
    <div
      className="slide-in rounded-2xl overflow-hidden flex flex-col"
      style={{
        minHeight: 400,
        border: "1px solid rgba(168,85,247,0.2)",
        background: "linear-gradient(135deg,#111827 0%,#0d1424 100%)",
        boxShadow: route ? "0 0 40px rgba(168,85,247,0.12)" : "none",
        transition: "box-shadow 0.6s ease",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#7c3aed,#9333ea)" }}
          >
            <Map size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Live City Map</p>
            <p className="text-gray-500 text-xs">Bin locations & optimized route</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {optimizing && (
            <span
              className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{
                background: "rgba(59,130,246,0.12)",
                border: "1px solid rgba(59,130,246,0.35)",
                color: "#60a5fa",
              }}
            >
              ⚙ Computing route…
            </span>
          )}
          {route && !optimizing && (
            <span
              className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{
                background: "rgba(168,85,247,0.12)",
                border: "1px solid rgba(168,85,247,0.35)",
                color: "#c084fc",
              }}
            >
              🚛 {route.length} stops · Truck dispatched
            </span>
          )}
          {!route && (
            <span
              className="text-xs px-2.5 py-1 rounded-full"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#6b7280",
              }}
            >
              {Object.keys(locations).length} bins tracked
            </span>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative" style={{ minHeight: 340 }}>
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
          style={{ height: "100%", width: "100%", minHeight: 340, background: "#0a0f1e" }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/" style="color:#6b7280">CARTO</a>'
          />

          {/* Live bin markers — driven entirely from API data */}
          {Object.values(statuses || {}).map((s) => {
            if (!s?.latitude || !s?.longitude) return null;
            const pos   = [s.latitude, s.longitude];
            const pct   = s.fill_pct ?? 0;
            const color = pct >= 70 ? "#ef4444" : pct >= 40 ? "#f59e0b" : "#22c55e";
            return (
              <Marker key={s.bin_id} position={pos} icon={makeIcon(color, s.is_alert)}>
                <Popup>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{s.bin_id}</p>
                    <p style={{ color, fontWeight: 600, fontSize: 12 }}>
                      Fill: {pct.toFixed(1)}%
                    </p>
                    <div style={{
                      marginTop: 6, height: 4, borderRadius: 4, background: "#374151", overflow: "hidden",
                    }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4 }} />
                    </div>
                    <p style={{ color: "#9ca3af", fontSize: 11, marginTop: 6 }}>
                      {s.is_alert ? "⚠ Collection needed" : "✓ All good"}
                    </p>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Route trail (dashed) */}
          {routeCoords.length > 1 && (
            <Polyline positions={routeCoords} color="#a855f7" weight={3} opacity={0.7} dashArray="10 5" />
          )}
          {routeCoords.length > 1 && (
            <Polyline positions={routeCoords} color="#7c3aed" weight={6} opacity={0.18} />
          )}

          {/* Animated truck */}
          {routeCoords.length > 1 && !optimizing && (
            <AnimatedTruck routeCoords={routeCoords} />
          )}

          <FitBounds route={route} locations={locations} />
        </MapContainer>

        {/* Legend overlay */}
        <MapLegend />
      </div>
    </div>
  );
}
