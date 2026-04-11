

from __future__ import annotations

import math
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict, List, Optional, Tuple

import requests
from ortools.constraint_solver import pywrapcp, routing_enums_pb2


# ── helpers ──────────────────────────────────────────────────────────────────

def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Great-circle distance between two geographic points (Haversine formula).
    Returns distance in kilometres.
    """
    R = 6371.0  # Earth's radius in km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi  = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def _build_haversine_matrix(coords: List[Tuple[float, float]]) -> List[List[int]]:
    n = len(coords)
    matrix: List[List[int]] = []
    for i in range(n):
        row: List[int] = []
        for j in range(n):
            if i == j:
                row.append(0)
            else:
                km = _haversine_km(coords[i][0], coords[i][1], coords[j][0], coords[j][1])
                row.append(int(km * 1000))
        matrix.append(row)
    return matrix

def _build_distance_matrix(coords: List[Tuple[float, float]]) -> List[List[int]]:
    """
    Build an integer distance matrix (in metres) from a list of (lat, lon) tuples.
    Attempts to fetch real-world driving distances from OSRM. 
    Falls back to straight-line Haversine if the API fails.
    """
    n = len(coords)
    if n < 2:
        return [[0]]
        
    # OSRM expects lon,lat format
    coord_string = ";".join([f"{lon},{lat}" for lat, lon in coords])
    url = f"http://router.project-osrm.org/table/v1/driving/{coord_string}?annotations=distance"
    
    try:
        resp = requests.get(url, timeout=5)
        data = resp.json()
        if data.get("code") == "Ok" and "distances" in data:
            matrix = []
            for row in data["distances"]:
                # the OSRM table API returns distances in float meters
                matrix.append([int(d) for d in row])
            print("[TSP] Using real-world OSRM driving distance matrix.")
            return matrix
    except Exception as e:
        print("[TSP] OSRM Table API failed, falling back to Haversine:", e)
        
    return _build_haversine_matrix(coords)


# ── traffic geometry (straight bin-to-bin edges vs traffic segments) ───────

_TRAFFIC_LARGE = 10**9


def _segments_intersect(
    a: Tuple[float, float],
    b: Tuple[float, float],
    c: Tuple[float, float],
    d: Tuple[float, float],
) -> bool:
    """Whether open segments AB and CD intersect (including proper colinear overlap)."""

    def orient(p: Tuple[float, float], q: Tuple[float, float], r: Tuple[float, float]) -> float:
        return (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])

    def on_segment(p: Tuple[float, float], q: Tuple[float, float], r: Tuple[float, float]) -> bool:
        return (
            min(p[0], r[0]) - 1e-12 <= q[0] <= max(p[0], r[0]) + 1e-12
            and min(p[1], r[1]) - 1e-12 <= q[1] <= max(p[1], r[1]) + 1e-12
        )

    o1 = orient(a, b, c)
    o2 = orient(a, b, d)
    o3 = orient(c, d, a)
    o4 = orient(c, d, b)

    eps = 1e-9
    if (o1 > eps and o2 > eps) or (o1 < -eps and o2 < -eps):
        return False
    if (o3 > eps and o4 > eps) or (o3 < -eps and o4 < -eps):
        return False

    if abs(o1) <= eps and on_segment(a, c, b):
        return True
    if abs(o2) <= eps and on_segment(a, d, b):
        return True
    if abs(o3) <= eps and on_segment(c, a, d):
        return True
    if abs(o4) <= eps and on_segment(c, b, d):
        return True

    return (o1 > eps) != (o2 > eps) and (o3 > eps) != (o4 > eps)


def _zone_to_segment(zone: Dict[str, Any]) -> Optional[Tuple[Tuple[float, float], Tuple[float, float]]]:
    try:
        s = zone["start"]
        e = zone["end"]
        a = (float(s[0]), float(s[1]))
        b = (float(e[0]), float(e[1]))
        return a, b
    except (KeyError, TypeError, ValueError, IndexError):
        return None


def _dist_m_point_to_segment(
    p: Tuple[float, float],
    a: Tuple[float, float],
    b: Tuple[float, float],
) -> float:
    """Approximate distance in metres from point p to segment ab (local equirectangular plane)."""
    lat_m = 111_320.0
    lon_m = 111_320.0 * math.cos(math.radians(p[0]))
    px, py = p[1] * lon_m, p[0] * lat_m
    ax, ay = a[1] * lon_m, a[0] * lat_m
    bx, by = b[1] * lon_m, b[0] * lat_m
    vx, vy = bx - ax, by - ay
    L2 = vx * vx + vy * vy
    if L2 < 1e-3:
        return _haversine_km(p[0], p[1], a[0], a[1]) * 1000.0
    wx, wy = px - ax, py - ay
    t = max(0.0, min(1.0, (wx * vx + wy * vy) / L2))
    qx, qy = ax + t * vx, ay + t * vy
    return float(math.hypot(px - qx, py - qy))


def _min_dist_segment_to_segment_m(
    a: Tuple[float, float],
    b: Tuple[float, float],
    c: Tuple[float, float],
    d: Tuple[float, float],
) -> float:
    best = min(
        _dist_m_point_to_segment(a, c, d),
        _dist_m_point_to_segment(b, c, d),
        _dist_m_point_to_segment(c, a, b),
        _dist_m_point_to_segment(d, a, b),
    )
    for k in range(1, 12):
        u = k / 12.0
        px = a[0] + u * (b[0] - a[0])
        py = a[1] + u * (b[1] - a[1])
        best = min(best, _dist_m_point_to_segment((px, py), c, d))
    for k in range(1, 12):
        u = k / 12.0
        px = c[0] + u * (d[0] - c[0])
        py = c[1] + u * (d[1] - c[1])
        best = min(best, _dist_m_point_to_segment((px, py), a, b))
    return float(best)


def _zone_touches_edge(
    p1: Tuple[float, float],
    p2: Tuple[float, float],
    z: Dict[str, Any],
    corridor_m: float = 320.0,
) -> bool:
    """Chord crosses traffic segment, or comes within corridor_m of it (driving often follows chord neighborhood)."""
    seg = _zone_to_segment(z)
    if not seg:
        return False
    za, zb = seg
    if _segments_intersect(p1, p2, za, zb):
        return True
    return _min_dist_segment_to_segment_m(p1, p2, za, zb) < corridor_m


def edge_affects_traffic(
    p1: Tuple[float, float],
    p2: Tuple[float, float],
    traffic_zones: Optional[List[Dict[str, Any]]],
) -> bool:
    if not traffic_zones:
        return False
    return any(_zone_touches_edge(p1, p2, z) for z in traffic_zones)


def _osrm_driving_arc_hits_traffic(
    lat1: float, lon1: float, lat2: float, lon2: float, traffic_zones: List[Dict[str, Any]]
) -> bool:
    """True if OSRM driving geometry between two bins uses a road overlapping drawn traffic."""
    url = (
        "https://router.project-osrm.org/route/v1/driving/"
        f"{lon1},{lat1};{lon2},{lat2}?overview=simplified&geometries=geojson&steps=false"
    )
    try:
        r = requests.get(url, timeout=7)
        data = r.json()
        if data.get("code") != "Ok" or not data.get("routes"):
            return False
        coords = data["routes"][0].get("geometry", {}).get("coordinates")
        if not coords or len(coords) < 2:
            return False
        latlons = [(float(c[1]), float(c[0])) for c in coords]
        step = max(1, len(latlons) // 35)
        for idx in range(0, len(latlons), step):
            p = latlons[idx]
            for z in traffic_zones:
                seg = _zone_to_segment(z)
                if not seg:
                    continue
                za, zb = seg
                if _dist_m_point_to_segment(p, za, zb) < 40.0:
                    return True
        for idx in range(len(latlons) - 1):
            p1, p2 = latlons[idx], latlons[idx + 1]
            for z in traffic_zones:
                seg = _zone_to_segment(z)
                if not seg:
                    continue
                za, zb = seg
                if _segments_intersect(p1, p2, za, zb) or _min_dist_segment_to_segment_m(p1, p2, za, zb) < 35.0:
                    return True
        return False
    except Exception:
        return False


def _pair_blocked_by_traffic(
    args: Tuple[int, int, List[Tuple[float, float]], List[Dict[str, Any]]],
) -> Tuple[int, int, bool]:
    i, j, coords, traffic_zones = args
    a, b = coords[i], coords[j]
    if edge_affects_traffic(a, b, traffic_zones):
        return i, j, True
    if _osrm_driving_arc_hits_traffic(a[0], a[1], b[0], b[1], traffic_zones):
        return i, j, True
    return i, j, False


def build_traffic_aware_cost_matrix(
    base_matrix: List[List[int]],
    coords: List[Tuple[float, float]],
    traffic_zones: Optional[List[Dict[str, Any]]],
    traffic_mode: str = "penalize",
) -> List[List[int]]:
    """
    Copy base driving-distance matrix and forbid arcs whose OSRM driving path hits traffic polylines.
    """
    n = len(coords)
    out = [row[:] for row in base_matrix]
    if not traffic_zones:
        return out

    pairs: List[Tuple[int, int, List[Tuple[float, float]], List[Dict[str, Any]]]] = [
        (i, j, coords, traffic_zones) for i in range(n) for j in range(n) if i != j
    ]
    workers = min(12, max(4, len(pairs) // 8 or 1))
    if len(pairs) > 280:
        for i in range(n):
            for j in range(n):
                if i != j and edge_affects_traffic(coords[i], coords[j], traffic_zones):
                    out[i][j] = _TRAFFIC_LARGE
        return out

    with ThreadPoolExecutor(max_workers=workers) as ex:
        for i, j, bad in ex.map(_pair_blocked_by_traffic, pairs, chunksize=4):
            if bad:
                out[i][j] = _TRAFFIC_LARGE
    return out


# ── public API ───────────────────────────────────────────────────────────────

def optimize_route(
    bin_ids: List[str],
    coords:  List[Tuple[float, float]],   # (latitude, longitude) per bin
    time_limit_seconds: int = 10,
    traffic_zones: Optional[List[Dict[str, Any]]] = None,
    traffic_mode: str = "penalize",
) -> Tuple[List[str], List[float]]:
    """
    Solve TSP and return:
      - ordered list of bin_ids
      - list of leg distances in km (same order as the route)

    If fewer than 2 bins are provided the list is returned as-is.
    """
    n = len(bin_ids)

    if n == 0:
        return [], []
    if n == 1:
        return bin_ids, [0.0]

    base_matrix = _build_distance_matrix(coords)
    cost_matrix = (
        build_traffic_aware_cost_matrix(base_matrix, coords, traffic_zones, traffic_mode)
        if traffic_zones
        else base_matrix
    )

    # ── OR-Tools setup ───────────────────────────────────────────────────────
    manager = pywrapcp.RoutingIndexManager(
        n,   # number of nodes
        1,   # number of vehicles
        0,   # depot index
    )
    routing = pywrapcp.RoutingModel(manager)

    def distance_callback(from_index: int, to_index: int) -> int:
        from_node = manager.IndexToNode(from_index)
        to_node   = manager.IndexToNode(to_index)
        return cost_matrix[from_node][to_node]

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    search_params = pywrapcp.DefaultRoutingSearchParameters()
    search_params.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    search_params.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    search_params.time_limit.seconds = time_limit_seconds

    # ── Solve ────────────────────────────────────────────────────────────────
    solution = routing.SolveWithParameters(search_params)

    if not solution:
        # Fallback: return original order if solver fails
        return bin_ids, [0.0] * n

    # ── Extract route ────────────────────────────────────────────────────────
    ordered_ids: List[str]   = []
    leg_distances: List[float] = []

    index = routing.Start(0)

    # Standard traversal: from start to just before the end node
    while not routing.IsEnd(index):
        node = manager.IndexToNode(index)
        ordered_ids.append(bin_ids[node])

        next_index = solution.Value(routing.NextVar(index))
        # Note: IndexToNode on the End index will return Node 0 (depot)
        next_node  = manager.IndexToNode(next_index)

        # Report real driving distance (not traffic-inflated cost)
        dist_m = base_matrix[node][next_node]
        leg_distances.append(round(dist_m / 1000.0, 4))

        index = next_index

    # Add the final closing node (node 0) to complete the loop
    # In OR-Tools for single vehicle TSP, index at this point is the end node index
    ordered_ids.append(bin_ids[0])

    return ordered_ids, leg_distances
