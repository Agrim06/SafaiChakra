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
import { Map, Maximize2, X, Navigation, LocateFixed } from "lucide-react";

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
    className: "custom-div-icon",
    html: `
      <div style="position:relative;width:14px;height:14px;display:flex;items-center:center;justify-content:center;">
        ${pulse ? `<div style="position:absolute;inset:-4px;border-radius:2px;transform:rotate(45deg);background:${color};opacity:0.25;animation:ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>` : ""}
        <div style="width:14px;height:14px;transform:rotate(45deg);border:1px solid rgba(255,255,255,0.4);border-radius:2px;background:${color};box-shadow:0 0 10px ${color}88;"></div>
        <div style="position:absolute;width:4px;height:4px;background:white;border-radius:50%;opacity:0.8;"></div>
      </div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

const makeDepotIcon = () =>
  L.divIcon({
    className: "custom-div-icon",
    html: `
      <div style="position:relative;width:24px;height:24px;">
        <div style="position:absolute;inset:-3px;border-radius:6px;transform:rotate(45deg);background:rgba(0,219,233,0.15);animation:pulse 2s infinite;"></div>
        <div style="width:24px;height:24px;background:#121318;border:1.5px solid #00dbe9;transform:rotate(45deg);border-radius:6px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 15px rgba(0,219,233,0.3);">
          <div style="transform:rotate(-45deg);font-size:12px;">🏭</div>
        </div>
      </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

const makeTruckIcon = () =>
  L.divIcon({
    className: "custom-div-icon",
    html: `
      <div style="filter:drop-shadow(0 0 10px rgba(57,255,20,0.4));">
        <div style="font-size:24px;animation:bounce 1.5s infinite;">🚛</div>
      </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

function buildLocations(statuses) {
  const locs = {};
  if (!statuses) return locs;
  Object.values(statuses).forEach((s) => {
    if (s?.latitude != null && s?.longitude != null) {
      locs[s.bin_id] = [s.latitude, s.longitude];
    }
  });
  return locs;
}

/* ── Auto-fit bounds logic ── */
function MapController({ route, locations, recenterTrigger }) {
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
  }, [route, locations, map, recenterTrigger]);

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

    const STEPS_PER_SEG = 5;
    const INTERVAL_MS = 7;

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
      if (!from || !to) return;

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
    { color: "#00dbe9", label: "Depot", glow: "#00dbe9" },
    { color: "#39ff14", label: `Normal (<${threshold - 30}%)`, glow: "#39ff14" },
    { color: "#f59e0b", label: `Warning (<${threshold}%)`, glow: "#f59e0b" },
    { color: "#ff4d4d", label: `Critical (>${threshold}%)`, glow: "#ff4d4d" },
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
function MapCanvas({ route, optimizing, statuses, locations, routeCoords, threshold, showPredictiveMap, predictiveData, recenterTrigger }) {
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

        {/* ── Predictive AI Layer ── */}
        {showPredictiveMap && predictiveData && predictiveData.map((p) => {
          if (!p.latitude || !p.longitude) return null;
          const risk = p.spillover_risk;
          const radius = risk > 80 ? 25 : risk > 50 ? 18 : 12;
          const opacity = risk > 80 ? 0.3 : risk > 50 ? 0.2 : 0.15;
          const color = risk > 80 ? "#ff4d4d" : risk > 50 ? "#f59e0b" : "#00dbe9";
          return (
            <CircleMarker
              key={`pred-${p.bin_id}`}
              center={[p.latitude, p.longitude]}
              radius={radius}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: opacity,
                weight: 1,
                dashArray: "2, 4"
              }}
            >
              <Popup className="custom-popup">
                <div className="relative w-full h-full flex flex-col items-center justify-center">
                  <div 
                    className="kinetic-ring" 
                    style={{ '--ring-gradient': `conic-gradient(${color} ${p.spillover_risk}%, transparent 0%)` }} 
                  />
                  <span className="kinetic-id">{p.bin_id.replace("BIN_", "")}</span>
                  <span className="kinetic-value">{p.spillover_risk}%</span>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {Object.values(statuses || {}).map((s) => {
          if (!s?.latitude || !s?.longitude) return null;
          const isDepot = s.bin_id === "DEPOT_00";
          const pct = s.fill_pct ?? 0;
          const isCritical = s.is_alert || pct >= threshold;
          const isWarning = pct >= threshold - 30;
          const color = isDepot ? "#00dbe9" : isCritical ? "#ff4d4d" : isWarning ? "#f59e0b" : "#39ff14";

          return (
            <Marker key={s.bin_id} position={[s.latitude, s.longitude]} icon={isDepot ? makeDepotIcon() : makeIcon(color, isCritical)}>
              <Popup className="custom-popup">
                <div className="relative w-full h-full flex flex-col items-center justify-center">
                  {!isDepot && (
                    <div 
                      className="kinetic-ring" 
                      style={{ '--ring-gradient': `conic-gradient(${color} ${pct}%, transparent 0%)` }} 
                    />
                  )}
                  <span className="kinetic-id">{isDepot ? "HUB" : s.bin_id.replace("BIN_", "")}</span>
                  <span className="kinetic-value">{isDepot ? "DEP" : `${pct.toFixed(0)}%`}</span>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {routeCoords.length > 1 && (
          <>
            <Polyline positions={routeCoords} color="#a855f7" weight={4} opacity={0.6} dashArray="8 8" />
            <Polyline positions={routeCoords} color="#a855f7" weight={10} opacity={0.1} />
            {!optimizing && <AnimatedTruck routeCoords={routeCoords} />}
          </>
        )}

        <MapController route={route} locations={locations} recenterTrigger={recenterTrigger} />
      </MapContainer>

      <MapLegend threshold={threshold} />
    </div>
  );
}

export default function MapView({ route, optimizing, statuses, threshold = 70, showPredictiveMap, predictiveData }) {
  const [expanded, setExpanded] = useState(false);
  const [roadPath, setRoadPath] = useState(null);
  const [recenterCount, setRecenterCount] = useState(0);
  const locations = buildLocations(statuses);
  const routeSignature = route?.join("-") || "none";

  useEffect(() => {
    if (!route || route.length < 2) { setRoadPath(null); return; }
    const coords = route.map(id => locations[id]).filter(Boolean);
    if (coords.length < 2) return;

    // Show straight lines immediately while fetching road-following path
    setRoadPath(coords);

    fetch(`https://router.project-osrm.org/route/v1/driving/${coords.map(c => `${c[1]},${c[0]}`).join(";")}?overview=full&geometries=geojson`)
      .then(r => r.json())
      .then(data => {
        if (data.routes?.[0]) {
          const lats = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
          setRoadPath(lats);
        }
      }).catch(() => {});
  }, [routeSignature, JSON.stringify(locations)]);

  const displayPath = roadPath || (route?.map(id => locations[id]).filter(Boolean) || []);

  const Header = ({ isModal }) => (
    <div className="flex items-center justify-between px-5 py-3 bg-[#1a1b21]/40 border-b border-white/5 backdrop-blur-xl">
      <div className="flex items-center gap-3">
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

      <div className="flex items-center gap-2">
        {optimizing && (
          <span className="flex items-center gap-2 text-[10px] font-black text-purple-400 uppercase tracking-widest mr-2">
            <Navigation size={12} className="animate-pulse" />
            Pathing...
          </span>
        )}
        
        <button
          onClick={() => setRecenterCount(v => v + 1)}
          className="p-1.5 hover:bg-white/10 rounded-md transition-all text-slate-400 hover:text-white border border-transparent hover:border-white/10 group flex items-center gap-2 pr-3"
          title="Recenter Map"
        >
          <LocateFixed size={16} className="group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-bold uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded">Recenter</span>
        </button>

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
      <div className="glass-panel flex flex-col overflow-hidden h-full border-white/5 shadow-2xl">
        <Header isModal={false} />
        <div className="flex-1 relative">
          <MapCanvas
            route={route}
            optimizing={optimizing}
            statuses={statuses}
            locations={locations}
            routeCoords={displayPath}
            threshold={threshold}
            showPredictiveMap={showPredictiveMap}
            predictiveData={predictiveData}
            recenterTrigger={recenterCount}
          />
        </div>
      </div>

      {expanded && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-xl p-6 flex flex-col">
          <div className="w-full max-w-[1800px] mx-auto h-full flex flex-col rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
            <Header isModal={true} />
            <div className="flex-1 relative">
              <MapCanvas
                route={route}
                optimizing={optimizing}
                statuses={statuses}
                locations={locations}
                routeCoords={displayPath}
                threshold={threshold}
                showPredictiveMap={showPredictiveMap}
                predictiveData={predictiveData}
                recenterTrigger={recenterCount}
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}