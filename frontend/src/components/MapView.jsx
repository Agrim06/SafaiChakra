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
import { Map, Maximize2, X, Navigation } from "lucide-react";

// Fix for default Leaflet icon paths in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

/* ── Custom Icons ── */
const makeIcon = (color, pulse = false) =>
  L.divIcon({
    className: "",
    html: `
      <div class="relative w-[28px] h-[28px]">
        ${pulse ? `<div class="absolute -inset-[6px] rounded-full animate-ping opacity-20" style="background:${color};"></div>` : ""}
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
        <div class="absolute -inset-[8px] rounded-full bg-blue-500/25 animate-pulse"></div>
        <div class="w-[34px] h-[34px] bg-blue-600 border-[3px] border-white rounded-[10px] flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.6)] text-[18px]">🏭</div>
      </div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
  });

const makeTruckIcon = () =>
  L.divIcon({
    className: "",
    html: `<div class="text-[26px] drop-shadow-lg animate-bounce">🚛</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

function buildLocations(statuses) {
  const locs = {};
  Object.values(statuses || {}).forEach((s) => {
    if (s?.latitude != null && s?.longitude != null) {
      locs[s.bin_id] = [s.latitude, s.longitude];
    }
  });
  return locs;
}

/* ── Auto-fit bounds logic ── */
function MapController({ route, locations }) {
  const map = useMap();

  useEffect(() => {
    const updateMap = () => {
      map.invalidateSize();
      const coords = route?.map((id) => locations[id]).filter(Boolean) || [];
      
      if (coords.length > 1) {
        map.fitBounds(coords, { padding: [70, 70], animate: true });
      } else {
        const allCoords = Object.values(locations);
        if (allCoords.length > 0) {
          map.fitBounds(allCoords, { padding: [100, 100], animate: true });
        }
      }
    };

    const timer = setTimeout(updateMap, 300);
    return () => clearTimeout(timer);
  }, [route, locations, map]);

  return null;
}

/* ── Animated truck along route ── */
function AnimatedTruck({ routeCoords }) {
  const [truckPos, setTruckPos] = useState(routeCoords[0]);
  const stepRef = useRef(0);
  const segRef = useRef(0);

  useEffect(() => {
    if (!routeCoords || routeCoords.length < 2) return;
    stepRef.current = 0;
    segRef.current = 0;
    setTruckPos(routeCoords[0]);

    const STEPS_PER_SEG = 8;
    const INTERVAL_MS = 30;

    const id = setInterval(() => {
      const seg = stepRef.current;
      if (seg >= routeCoords.length - 1) return clearInterval(id);

      segRef.current += 1;
      const t = segRef.current / STEPS_PER_SEG;

      if (t >= 1) {
        stepRef.current += 1;
        segRef.current = 0;
      }

      const from = routeCoords[stepRef.current];
      const to = routeCoords[Math.min(stepRef.current + 1, routeCoords.length - 1)];
      if(!from || !to) return;

      setTruckPos([
        from[0] + (to[0] - from[0]) * Math.min(t, 1),
        from[1] + (to[1] - from[1]) * Math.min(t, 1),
      ]);
    }, INTERVAL_MS);

    return () => clearInterval(id);
  }, [routeCoords]);

  if (!truckPos) return null;
  return <Marker position={truckPos} icon={makeTruckIcon()} zIndexOffset={1000} />;
}

/* ── Map Legend ── */
function MapLegend({ threshold }) {
  const items = [
    { color: "#3b82f6", label: "Depot", glow: "#3b82f6" },
    { color: "#22c55e", label: `Normal (<${threshold - 30}%)`, glow: "#22c55e" },
    { color: "#f59e0b", label: `Warning (<${threshold}%)`, glow: "#f59e0b" },
    { color: "#ef4444", label: `Critical (>${threshold}%)`, glow: "#ef4444" },
    { color: "#a855f7", label: "Route Path", glow: "#a855f7" },
  ];

  return (
    <div className="absolute bottom-6 left-6 z-[1000] glass-panel bg-slate-950/80 p-4 border-white/10 shadow-2xl pointer-events-none backdrop-blur-md">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Tactical Legend</p>
      <div className="space-y-2.5">
        {items.map((i) => (
          <div key={i.label} className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full" style={{ background: i.color, boxShadow: `0 0 8px ${i.glow}` }} />
            <span className="text-[10px] font-bold text-slate-300 uppercase">{i.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Canvas ── */
function MapCanvas({ route, optimizing, statuses, locations, routeCoords, threshold }) {
  const center = locations["DEPOT_00"] || [12.3106, 76.6450];

  return (
    <div className="relative w-full h-full min-h-[400px]">
      <MapContainer
        center={center}
        zoom={14}
        className="w-full h-full"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

        {Object.values(statuses || {}).map((s) => {
          if (!s?.latitude || !s?.longitude) return null;
          const isDepot = s.bin_id === "DEPOT_00";
          const pct = s.fill_pct ?? 0;
          const isCritical = s.is_alert || pct >= threshold;
          const isWarning = pct >= threshold - 30;
          const color = isDepot ? "#3b82f6" : isCritical ? "#ef4444" : isWarning ? "#f59e0b" : "#22c55e";

          return (
            <Marker key={s.bin_id} position={[s.latitude, s.longitude]} icon={isDepot ? makeDepotIcon() : makeIcon(color, isCritical)}>
              <Popup className="custom-popup">
                <div className="p-1">
                  <p className="font-bold text-slate-900">{isDepot ? "Regional Depot" : `Node ${s.bin_id}`}</p>
                  {!isDepot && <p className="text-xs font-bold" style={{ color }}>Status: {pct.toFixed(1)}% Full</p>}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {routeCoords.length > 1 && (
          <>
            <Polyline positions={routeCoords} color="#a855f7" weight={4} opacity={0.8} dashArray="10 10" />
            <Polyline positions={routeCoords} color="#a855f7" weight={8} opacity={0.15} />
            {!optimizing && <AnimatedTruck routeCoords={routeCoords} />}
          </>
        )}

        <MapController route={route} locations={locations} />
      </MapContainer>
      
      <MapLegend threshold={threshold} />
    </div>
  );
}

export default function MapView({ route, optimizing, statuses, threshold = 70 }) {
  const [expanded, setExpanded] = useState(false);
  const [roadPath, setRoadPath] = useState(null);
  const locations = buildLocations(statuses);
  const routeSignature = route?.join("-") || "none";

  useEffect(() => {
    if (!route || route.length < 2) { setRoadPath(null); return; }
    const coords = route.map(id => locations[id]).filter(Boolean);
    if (coords.length < 2) return;

    fetch(`https://router.project-osrm.org/route/v1/driving/${coords.map(c => `${c[1]},${c[0]}`).join(";")}?overview=full&geometries=geojson`)
      .then(r => r.json())
      .then(data => {
        if (data.routes?.[0]) {
          setRoadPath(data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]));
        } else {
          setRoadPath(coords);
        }
      }).catch(() => setRoadPath(coords));
  }, [routeSignature, JSON.stringify(locations)]);

  const displayPath = roadPath || (route?.map(id => locations[id]).filter(Boolean) || []);

  /* Inside MapView.jsx - Update the Header sub-component */
const Header = ({ isModal }) => (
  <div className="flex items-center justify-between px-5 py-3 bg-slate-900/40 border-b border-white/5 backdrop-blur-xl">
    <div className="flex items-center gap-3">
      {/* Small status dot instead of a big icon box */}
      <div className="relative flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_#a855f7]"></div>
        <div className="absolute w-2 h-2 rounded-full bg-purple-500 animate-ping opacity-40"></div>
      </div>
      <div>
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/90">
          Grid Intelligence Overlay
        </h3>
      </div>
    </div>

    <div className="flex items-center gap-4">
      {optimizing && (
        <span className="flex items-center gap-2 text-[10px] font-black text-purple-400 uppercase tracking-widest">
          <Navigation size={12} className="animate-pulse" /> 
          Pathing...
        </span>
      )}
      <button 
        onClick={() => setExpanded(!isModal)} 
        className="p-1.5 hover:bg-white/10 rounded-md transition-all text-slate-400 hover:text-white border border-transparent hover:border-white/10"
      >
        {isModal ? <X size={16} /> : <Maximize2 size={16} />}
      </button>
    </div>
  </div>
);

  return (
    <>
      <div className="glass-panel flex flex-col overflow-hidden h-full min-h-[500px] border-white/5 shadow-2xl">
        <Header isModal={false} />
        <div className="flex-1 relative">
          <MapCanvas route={route} optimizing={optimizing} statuses={statuses} locations={locations} routeCoords={displayPath} threshold={threshold} />
        </div>
      </div>

      {expanded && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-xl p-6 flex flex-col">
          <div className="w-full max-w-[1800px] mx-auto h-full flex flex-col rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
            <Header isModal={true} />
            <div className="flex-1 relative">
              <MapCanvas route={route} optimizing={optimizing} statuses={statuses} locations={locations} routeCoords={displayPath} threshold={threshold} />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}