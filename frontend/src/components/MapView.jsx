import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { Map, Maximize2, Minimize2, X } from "lucide-react";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

/* ── Icons ─────────────────────────────────────────────── */
const makeIcon = (color, pulse = false) =>
  L.divIcon({
    className: "",
    html: `
      <div class="relative w-[28px] h-[28px]">
        ${pulse ? `<div class="absolute -inset-[6px] rounded-full animate-[mapPulse_1.6s_ease-in-out_infinite]" style="background:${color}33;"></div>` : ""}
        <div class="w-[28px] h-[28px] border-[3px] border-white/90 rounded-[50%_50%_50%_0] -rotate-45" style="background:${color};box-shadow:0 2px 12px ${color}88;"></div>
      </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });

const makeDepotIcon = () =>
  L.divIcon({
    className: "",
    html: `
      <div class="relative w-[34px] h-[34px]">
        <div class="absolute -inset-[8px] rounded-full bg-blue-500/25 animate-[mapPulse_2s_ease-in-out_infinite]"></div>
        <div class="w-[34px] h-[34px] bg-blue-600 border-[3px] border-white rounded-[10px] flex items-center justify-center shadow-[0_6px_16px_rgba(37,99,235,0.5)] text-[18px] leading-none">🏭</div>
      </div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
  });

const makeTruckIcon = () =>
  L.divIcon({
    className: "",
    html: `<div class="text-[26px] leading-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)] animate-[truckBounce_0.5s_ease-in-out_infinite_alternate]">🚛</div>`,
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
    // Timeout ensures Flexbox/Grid layouts have fully resolved their dimensions
    // before Leaflet attempts to calculate the center metric, preventing it
    // from pinning off-center.
    const timer = setTimeout(() => {
      map.invalidateSize();
      if (route && route.length > 1) {
        // Focus on active route
        const coords = route.map((id) => locations[id]).filter(Boolean);
        if (coords.length > 1) map.fitBounds(coords, { padding: [50, 50] });
      } else {
        // Focus on all nodes (including Depot) to make sure ALL bins are visible
        const allCoords = Object.values(locations);
        if (allCoords.length > 1) {
          map.fitBounds(allCoords, { padding: [50, 50] });
        } else {
          const depotPos = locations["DEPOT_00"] || [12.3106, 76.6450];
          map.setView(depotPos, 14);
        }
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [route, locations, map]);
  return null;
}

/* ── Animated truck along route ─────────────────────────── */
function AnimatedTruck({ routeCoords }) {
  const [truckPos, setTruckPos] = useState(routeCoords[0]);
  const stepRef = useRef(0);
  const segRef = useRef(0); // progress within segment [0,1]

  useEffect(() => {
    if (!routeCoords || routeCoords.length < 2) return;
    stepRef.current = 0;
    segRef.current = 0;
    setTruckPos(routeCoords[0]);

    const STEPS_PER_SEG = 3;  // low steps per segment since OSRM returns hundreds of micro-segments
    const INTERVAL_MS = 10; // blazing fast ~60fps tick

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
        segRef.current = 0;
        if (stepRef.current >= routeCoords.length - 1) {
          setTruckPos(routeCoords[routeCoords.length - 1]);
          clearInterval(id);
          return;
        }
      }

      const from = routeCoords[stepRef.current];
      const to = routeCoords[Math.min(stepRef.current + 1, routeCoords.length - 1)];
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
        <div className="text-white font-bold">🚛 Collection Truck</div>
      </Popup>
    </Marker>
  );
}

/* ── Map Legend overlay ─────────────────────────────────── */
function MapLegend({ threshold = 70 }) {
  return (
    <div className="map-legend">
      <p className="map-legend__title">
        LEGEND
      </p>
      {[
        { color: "#3b82f6", label: "Dumpyard Depot" },
        { color: "#22c55e", label: `Normal  (<${threshold - 30}%)` },
        { color: "#f59e0b", label: `Warning (${threshold - 30}–${threshold}%)` },
        { color: "#ef4444", label: `Critical (>${threshold}%)` },
        { color: "#a855f7", label: "Route path" },
      ].map(({ color, label }) => (
        <div key={label} className="map-legend__item">
          <span className="map-legend__dot" style={{ background: color, boxShadow: `0 0 5px ${color}88` }} />
          <span className="text-[11px] text-gray-300">{label}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Shared map canvas ─────────────────────────────────── */
function MapCanvas({ center, route, optimizing, statuses, locations, routeCoords, bodyH, threshold }) {
  return (
    <div className="map-card__body h-full" style={{ minHeight: bodyH }}>
      <MapContainer
        center={center}
        zoom={14}
        className="w-full h-full bg-[#0a0f1e]"
        style={{ minHeight: bodyH }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/" className="text-gray-500">CARTO</a>'
        />

        {Object.values(statuses || {}).map((s) => {
          if (!s?.latitude || !s?.longitude) return null;
          const pos = [s.latitude, s.longitude];
          const pct = s.fill_pct ?? 0;
          const isDepot = s.bin_id === "DEPOT_00";
          const isCritical = s.is_alert || pct >= threshold;
          const isWarning = pct >= threshold - 30;
          const color = isDepot ? "#3b82f6" : isCritical ? "#ef4444" : isWarning ? "#f59e0b" : "#22c55e";
          return (
            <Marker key={s.bin_id} position={pos} icon={isDepot ? makeDepotIcon() : makeIcon(color, isCritical)}>
              <Popup>
                <div>
                  <p className="font-bold text-[13px] mb-1">
                    {isDepot ? "Dumpyard Depot" : s.bin_id}
                  </p>
                  {!isDepot && (
                    <>
                      <p className="font-semibold text-[12px]" style={{ color }}>Fill: {pct.toFixed(1)}%</p>
                      <div className="mt-1.5 h-1 rounded bg-gray-700 overflow-hidden">
                        <div className="h-full rounded" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </>
                  )}
                  <p className="text-gray-400 text-[11px] mt-1.5">
                    {isDepot ? "Truck Start/End Point" : s.is_alert ? "⚠ Collection needed" : "✓ All good"}
                  </p>
                </div>
              </Popup>
            </Marker>
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
export default function MapView({ route, optimizing, status, statuses, threshold = 70 }) {
  const [expanded, setExpanded] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setExpanded(false); };
    if (expanded) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const locations = buildLocations(statuses);
  // Default map position directly centered at the Dumpyard Depot
  const center = locations["DEPOT_00"] || [12.3106, 76.6450];

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
    <div className={`map-card__header ${modal ? 'bg-gradient-to-br from-gray-900 to-gray-800' : ''}`}>
      <div className="flex items-center gap-2.5">
        <div className="map-card__icon-wrap">
          <Map size={14} className="text-white" />
        </div>
        <div>
          <p className="text-[13px] font-bold text-white m-0">Live City Map — Mysuru</p>
          <p className="text-[11px] text-gray-500 m-0">Bin locations &amp; optimized route</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {optimizing && (
          <span className="map-badge map-badge--computing">⚙ Computing…</span>
        )}
        {route && !optimizing && (
          <span className="map-badge map-badge--dispatched">
            🚛 {route.filter(b => b !== "DEPOT_00").length} stops dispatched
          </span>
        )}
        {!route && (
          <span className="map-badge map-badge--tracking">
            {Object.keys(locations).length} bins tracked
          </span>
        )}

        {/* Expand / Close button */}
        <button
          onClick={() => setExpanded(v => !v)}
          title={modal ? "Close fullscreen (Esc)" : "Fullscreen map"}
          className={`flex items-center justify-center w-7.5 h-7.5 rounded-lg border transition-all shrink-0 ${
            modal 
              ? 'bg-red-500/10 border-red-500/30 text-red-400' 
              : 'bg-white/5 border-white/10 text-gray-400'
          }`}
        >
          {modal ? <X size={13} /> : <Maximize2 size={13} />}
        </button>
      </div>
    </div>
  );

  /* ── Inline small card ─── */
  const inlineCard = (
    <div className={`map-card slide-in ${route ? 'map-card--active' : ''}`}>
      <Header modal={false} />
      <MapCanvas
        center={center} route={route} optimizing={optimizing}
        statuses={statuses} locations={locations} routeCoords={displayPath}
        bodyH={480} threshold={threshold}
      />
    </div>
  );

  /* ── Fullscreen portal modal ─── */
  const modal = expanded ? createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-[2vh_2vw] animate-[fadeIn_0.2s_ease]"
      onClick={(e) => { if (e.target === e.currentTarget) setExpanded(false); }}
    >
      <div className="w-[95vw] h-[94vh] rounded-[20px] overflow-hidden flex flex-col border border-purple-500/35 shadow-[0_0_80px_rgba(168,85,247,0.2),0_40px_120px_rgba(0,0,0,0.8)] bg-[#0d1424]">
        <Header modal={true} />
        <MapCanvas
          center={center} route={route} optimizing={optimizing}
          statuses={statuses} locations={locations} routeCoords={displayPath}
          bodyH="calc(94vh - 56px)" threshold={threshold}
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
