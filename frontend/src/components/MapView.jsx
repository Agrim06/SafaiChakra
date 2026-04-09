import { useEffect, useRef, useState, useCallback, useMemo } from "react";
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
import { Map, Maximize2, X, PenTool, Eraser } from "lucide-react";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

/**
 * Resilient OSRM fetching with protocol fallback and retry.
 * Helps overcome ConnectionResetErrors and rate-limiting.
 */
async function fetchOSRM(coordString, retry = true) {
  const protocols = ['https', 'http'];
  for (const protocol of protocols) {
    try {
      const url = `${protocol}://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`;
      const r = await fetch(url);
      if (!r.ok) throw new Error(`OSRM Status ${r.status}`);
      const data = await r.json();
      if (data.code === 'Ok' && data.routes && data.routes[0]) return data;
      throw new Error(data.code || 'No routes found');
    } catch (err) {
      console.warn(`[OSRM] ${protocol} attempt failed:`, err.message);
    }
  }
  if (retry) {
    await new Promise(res => setTimeout(res, 1000));
    return fetchOSRM(coordString, false);
  }
  throw new Error('OSRM mapping failed after fallback and retry');
}

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
function FitBounds({ route, locations, scribbleMode }) {
  const map = useMap();
  const lastFitSignature = useRef("");

  useEffect(() => {
    // If user is drawing traffic, NEVER fight their zoom/pan
    if (scribbleMode) return;

    // Timeout ensures Flexbox/Grid layouts have fully resolved their dimensions
    const timer = setTimeout(() => {
      map.invalidateSize();
      
      const routeSignature = route ? route.join("-") : "no-route";
      const locationsCount = Object.keys(locations).length;
      const currentSignature = `${routeSignature}_${locationsCount}`;

      // Only auto-fit if the route or bin list actually changed
      if (currentSignature === lastFitSignature.current) return;
      lastFitSignature.current = currentSignature;

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
    }, 300); // Slightly longer delay for stability
    return () => clearTimeout(timer);
  }, [route, locations, map, scribbleMode]);
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

    const STEPS_PER_SEG = 5;  // slower, more fluid animation
    const INTERVAL_MS = 20;   // ~50fps for smoother motion

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

/* ── Map Scribbler (Traffic Area Drawing) ───────────────── */
function MapScribbler({ scribbleMode, onScribble, onScribbleEnd }) {
  const map = useMap();
  const stateRef = useRef({ isDrawing: false, mode: scribbleMode, onScribble, onScribbleEnd });

  useEffect(() => {
    stateRef.current.mode = scribbleMode;
    stateRef.current.onScribble = onScribble;
    stateRef.current.onScribbleEnd = onScribbleEnd;
    if (!scribbleMode) {
      map.dragging.enable();
      stateRef.current.isDrawing = false;
    }
  }, [scribbleMode, onScribble, onScribbleEnd, map]);

  useEffect(() => {
    const handleDown = (e) => {
      // Leaflet mousedown bypasses normal react limits
      if (!stateRef.current.mode) return;
      map.dragging.disable();
      stateRef.current.isDrawing = true;
      stateRef.current.onScribble([e.latlng.lat, e.latlng.lng], true);
    };

    const handleMove = (e) => {
      if (!stateRef.current.mode || !stateRef.current.isDrawing) return;
      stateRef.current.onScribble([e.latlng.lat, e.latlng.lng], false);
    };

    const handleUp = () => {
      if (!stateRef.current.mode) return;
      if (stateRef.current.isDrawing && stateRef.current.onScribbleEnd) {
        stateRef.current.onScribbleEnd();
      }
      map.dragging.enable();
      stateRef.current.isDrawing = false;
    };

    // Use native leaflet listener events which are highly stable
    map.on('mousedown', handleDown);
    map.on('mousemove', handleMove);
    map.on('mouseup', handleUp);

    return () => {
      map.off('mousedown', handleDown);
      map.off('mousemove', handleMove);
      map.off('mouseup', handleUp);
    };
  }, [map]);

  return null;
}

/* ── Route stop number marker ───────────────────────────── */
function makeStopIcon(num, isTrafficAware) {
  const bg = isTrafficAware ? '#b91c1c' : '#7c3aed';
  const html = `<div style="
    background:${bg};color:white;border-radius:50%;width:22px;height:22px;
    display:flex;align-items:center;justify-content:center;
    font-size:11px;font-weight:800;border:2px solid white;
    box-shadow:0 0 6px rgba(0,0,0,0.5);">${num}</div>`;
  return L.divIcon({ html, className: '', iconSize: [22, 22], iconAnchor: [11, 11] });
}

/* ── Shared map canvas ─────────────────────────────────── */
function MapCanvas({ center, route, optimizing, statuses, locations, routeCoords, bodyH, threshold, showPredictiveMap, predictiveData, trafficLines, scribbleMode, onScribble, onScribbleEnd }) {
  const hasTraffic = trafficLines && trafficLines.length > 0;
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

        {/* Numbered stop order markers — visible route sequence */}
        {route && route.map((id, idx) => {
          const pos = locations[id];
          if (!pos || id === 'DEPOT_00') return null;
          return (
            <Marker key={`stop-${id}`} position={pos} icon={makeStopIcon(idx, hasTraffic)} zIndexOffset={500}>
              <Popup>
                <div>
                  <p className="font-bold text-[13px]">Stop #{idx}: {id}</p>
                  {hasTraffic && <p className="text-red-400 text-[11px] mt-1">🚦 Traffic-aware sequence</p>}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Render Traffic Lines */}
        {trafficLines && trafficLines.map((line, idx) => (
          <Polyline
            key={`traffic-${idx}`}
            positions={line.positions}
            color="#8B0000"
            weight={10}
            opacity={0.9}
          />
        ))}
        {/* Event interceptor for drawing traffic */}
        <MapScribbler scribbleMode={scribbleMode} onScribble={onScribble} onScribbleEnd={onScribbleEnd} />

        <FitBounds route={route} locations={locations} scribbleMode={scribbleMode} />
      </MapContainer>

      <MapLegend threshold={threshold} />
    </div>
  );
}

/* ── Main component ─────────────────────────────────────── */
export default function MapView({ route, optimizing, status, statuses, threshold = 70, showPredictiveMap, predictiveData, trafficLines, setTrafficLines }) {
  const [expanded, setExpanded] = useState(false);
  const [scribbleMode, setScribbleMode] = useState(false);

  const handleScribble = useCallback((coord, isNewStroke) => {
    setTrafficLines(prev => {
      if (isNewStroke) {
        return [...prev, { positions: [coord], status: 'drawing' }];
      } else {
        if (prev.length === 0) return prev;
        const newLines = [...prev];
        const lastLine = newLines[newLines.length - 1];
        newLines[newLines.length - 1] = { ...lastLine, positions: [...lastLine.positions, coord] };
        return newLines;
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScribbleEnd = useCallback(() => {
    setTrafficLines(prev => {
      if (prev.length === 0) return prev;
      const targetIdx = prev.length - 1;
      const strokeObj = prev[targetIdx];
      const stroke = strokeObj.positions;

      if (stroke.length < 2) return prev;

      const maxPoints = 20;
      let sampled = [];
      const step = Math.max(1, Math.floor(stroke.length / maxPoints));
      for (let i = 0; i < stroke.length; i += step) sampled.push(stroke[i]);
      if (sampled[sampled.length - 1] !== stroke[stroke.length - 1]) sampled.push(stroke[stroke.length - 1]);

      const coordString = sampled.map(c => `${c[1]},${c[0]}`).join(";");
      
      fetchOSRM(coordString)
        .then(data => {
          const snappedPath = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
          setTrafficLines(current => {
            const newLines = [...current];
            if (newLines[targetIdx]) {
              newLines[targetIdx] = { ...newLines[targetIdx], positions: snappedPath, status: 'snapped' };
            }
            return newLines;
          });
        })
        .catch(err => {
          console.error("[Traffic Snap Error]", err);
          setTrafficLines(current => {
            const newLines = [...current];
            if (newLines[targetIdx]) {
              newLines[targetIdx] = { ...newLines[targetIdx], status: 'snapped' }; // Keep raw if failed
            }
            return newLines;
          });
        });

      return prev;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close on Escape key
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setExpanded(false); };
    if (expanded) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const locations = useMemo(() => buildLocations(statuses), [statuses]);
  // Default map position directly centered at the Dumpyard Depot
  const center = locations["DEPOT_00"] || [12.3106, 76.6450];

  const routeCoords = route ? route.map((id) => locations[id]).filter(Boolean) : [];
  const routeSignature = route ? route.join("-") : "no-route";
  // Only re-trigger road fetch when fully snapped lines change (never during mouse-move drawing)
  const trafficSignature = trafficLines
    ? trafficLines.filter(l => l.status === 'snapped').map(l => l.positions.length).join('|')
    : '0';
  const [roadPath, setRoadPath] = useState(null);

  // ── Helpers for detour calculation ─────────────────────────────────────────
  function segmentsIntersect(p1, p2, p3, p4) {
    const ccw = (A, B, C) => (C[1]-A[1])*(B[0]-A[0]) > (B[1]-A[1])*(C[0]-A[0]);
    return ccw(p1,p3,p4) !== ccw(p2,p3,p4) && ccw(p1,p2,p3) !== ccw(p1,p2,p4);
  }

  function getDetourWaypoint(from, to, trafficSegs) {
    for (const seg of trafficSegs) {
      if (segmentsIntersect(from, to, seg[0], seg[1])) {
        // Perpendicular vector to the traffic segment
        const dx = seg[1][0] - seg[0][0];
        const dy = seg[1][1] - seg[0][1];
        const len = Math.sqrt(dx*dx + dy*dy) || 1;
        const perpLat = -dy / len;
        const perpLon =  dx / len;
        // Tight 300m offset to signal OSRM without causing hallucinations
        const offset = 0.003;
        // Use the midpoint of the route LEG (or specific intersection) as basis
        const midLat = (from[0] + to[0]) / 2;
        const midLon = (from[1] + to[1]) / 2;
        // Two candidate detour points (either side of the traffic line)
        const cand1 = [midLat + perpLat * offset, midLon + perpLon * offset];
        const cand2 = [midLat - perpLat * offset, midLon - perpLon * offset];
        // Pick the candidate that does NOT re-cross the traffic line from `from`
        const cross1 = segmentsIntersect(from, cand1, seg[0], seg[1]);
        const chosen = cross1 ? cand2 : cand1;
        return chosen;
      }
    }
    return null;
  }

  // Check if a detailed road path intersects any traffic segments
  function pathIntersects(path, trafficSegs) {
    if (!path || path.length < 2 || !trafficSegs || trafficSegs.length === 0) return false;
    for (let i = 0; i < path.length - 1; i++) {
      for (const seg of trafficSegs) {
        if (segmentsIntersect(path[i], path[i+1], seg[0], seg[1])) return true;
      }
    }
    return false;
  }

  // Hook to fetch real-world road geometries from OSRM when the route or traffic changes
  useEffect(() => {
    if (!route || route.length < 2) {
      setRoadPath(null);
      return;
    }
    const binCoords = route.map(id => locations[id]).filter(Boolean);
    if (binCoords.length < 2) return;

    // Build all traffic line segments (pairs of consecutive points)
    const trafficSegs = [];
    if (trafficLines) {
      for (const line of trafficLines) {
        const pts = line.positions || line;
        if (!pts || pts.length < 2) continue;
        for (let i = 0; i < pts.length - 1; i++) {
          trafficSegs.push([pts[i], pts[i+1]]);
        }
      }
    }

    console.log('[Route] Traffic segs:', trafficSegs.length, '| Bin coords:', binCoords.length);

    // Build waypoint list, prioritizing bin locations (up to 25 total)
    const waypointCoords = [];
    const maxWaypoints = 25;
    
    // First, identify all primary bin locations
    const primaryBins = binCoords;
    
    if (primaryBins.length >= maxWaypoints) {
      // If we have >25 bins, we MUST only send bins (OSRM limit)
      waypointCoords.push(...primaryBins.slice(0, maxWaypoints));
      console.warn("[Route] Exceeded OSRM 25-point limit with BINS ONLY. No detours possible.");
    } else {
      // Calculate how many detour points we can afford
      let availableDetours = maxWaypoints - primaryBins.length;
      
      for (let i = 0; i < primaryBins.length; i++) {
        waypointCoords.push(primaryBins[i]);
        if (i < primaryBins.length - 1 && availableDetours > 0) {
          const detour = getDetourWaypoint(primaryBins[i], primaryBins[i+1], trafficSegs);
          if (detour) {
            waypointCoords.push(detour);
            availableDetours--;
          }
        }
      }
    }
    
    console.log('[Route] Final OSRM points:', waypointCoords.length, '(', binCoords.length, 'bins +', waypointCoords.length - binCoords.length, 'detours)');

    // Final safety clip
    const limited = waypointCoords.slice(0, maxWaypoints);

    // Use resilient OSRM fetcher
    const coordString = limited.map(c => `${c[1]},${c[0]}`).join(";");
    
    fetchOSRM(coordString)
      .then(data => {
        const path = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
        
        // --- NEW: Stable Road-Aware Detour Pass ---
        // If the ACTUAL road path still crosses traffic, we need to inject more detours
        let needsMoreDetours = false;
        const newWaypoints = [...limited];
        let offsetCount = 1;

        if (pathIntersects(path, trafficSegs)) {
          // Check each bin-to-bin leg in the OSRM result
          for (let i = 0; i < data.waypoints.length - 1; i++) {
            const startNode = data.waypoints[i].location; // [lon, lat]
            const endNode = data.waypoints[i+1].location;
            const p1 = [startNode[1], startNode[0]];
            const p2 = [endNode[1], endNode[0]];
            
            // If this specific leg still crosses, inject a detour
            const detour = getDetourWaypoint(p1, p2, trafficSegs);
            if (detour) {
              // Deduplicate: Don't add if too close to neighbors
              const lastPt = newWaypoints[i + offsetCount - 1];
              const dist = Math.sqrt((lastPt[0]-detour[0])**2 + (lastPt[1]-detour[1])**2);
              if (dist > 0.001) {
                newWaypoints.splice(i + offsetCount, 0, detour);
                offsetCount++;
                needsMoreDetours = true;
              }
            }
          }
        }

        if (needsMoreDetours) {
          console.log("[Route] Visual intersection detected! Applying stable detour...");
          const newCoordString = newWaypoints.slice(0, 25).map(c => `${c[1]},${c[0]}`).join(";");
          fetchOSRM(newCoordString)
            .then(data2 => {
              const finalPath = data2.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
              setRoadPath(finalPath);
            })
            .catch(() => setRoadPath(path)); // Fallback
        } else {
          setRoadPath(path);
        }
      })
      .catch(err => {
        console.warn("[Route OSRM Error]:", err.message);
        setRoadPath(binCoords);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeSignature, trafficSignature]);

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
          <p className="text-[11px] text-gray-500 m-0">
            Bin locations &amp; optimized route
            {trafficLines && trafficLines.length > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-red-400 font-bold animate-pulse">
                🚦 Traffic-Aware
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setScribbleMode(v => !v)}
          title="Draw Traffic Zones"
          className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded shadow-sm transition-all border ${scribbleMode ? 'bg-red-500 text-white border-red-600' : 'bg-[#1f2937] text-gray-300 border-gray-600 hover:bg-gray-700'}`}
        >
          <PenTool size={12} />
          {scribbleMode ? "Traffic Mode: ON" : "Draw Traffic"}
        </button>
        {trafficLines.length > 0 && (
          <button
            onClick={() => setTrafficLines([])}
            className="flex items-center justify-center p-1.5 rounded bg-[#1f2937] text-gray-300 border border-gray-600 hover:bg-gray-700 hover:text-white"
            title="Clear Traffic"
          >
            <Eraser size={12} />
          </button>
        )}

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
          className={`flex items-center justify-center w-7.5 h-7.5 rounded-lg border transition-all shrink-0 ${modal
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
        bodyH={480} threshold={threshold} showPredictiveMap={showPredictiveMap} predictiveData={predictiveData}
        trafficLines={trafficLines} scribbleMode={scribbleMode} onScribble={handleScribble} onScribbleEnd={handleScribbleEnd}
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
          bodyH="calc(94vh - 56px)" threshold={threshold} showPredictiveMap={showPredictiveMap} predictiveData={predictiveData}
          trafficLines={trafficLines} scribbleMode={scribbleMode} onScribble={handleScribble} onScribbleEnd={handleScribbleEnd}
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
