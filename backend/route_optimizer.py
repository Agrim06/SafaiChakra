

from __future__ import annotations

import math
from typing import List, Tuple

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


import requests

def _intersects(p1, p2, p3, p4):
    def ccw(A, B, C):
        return (C[1]-A[1]) * (B[0]-A[0]) > (B[1]-A[1]) * (C[0]-A[0])
    return ccw(p1, p3, p4) != ccw(p2, p3, p4) and ccw(p1, p2, p3) != ccw(p1, p2, p4)

def _dist_km(p1, p2):
    return _haversine_km(p1[0], p1[1], p2[0], p2[1])

def _dist_to_segment(p, a, b):
    # Minimum distance from point p to segment a-b in km
    lat_p, lon_p = p
    lat_a, lon_a = a
    lat_b, lon_b = b
    
    # 2D projection approach (approximate for city scale)
    l2 = (lat_b - lat_a)**2 + (lon_b - lon_a)**2
    if l2 == 0: return _dist_km(p, a)
    t = max(0, min(1, ((lat_p - lat_a) * (lat_b - lat_a) + (lon_p - lon_a) * (lon_b - lon_a)) / l2))
    projection = (lat_a + t * (lat_b - lat_a), lon_a + t * (lon_b - lon_a))
    return _dist_km(p, projection)

def _leg_intersects_traffic(start_coord, end_coord, traffic_lines, buffer_km=0.15):
    """
    Returns the cumulative penalty for a leg.
       - Each exact intersection: +2,000,000 (2000 km penalty)
       - Proximity to any segment: +5,000 (5 km penalty)
    """
    if not traffic_lines:
        return 0
        
    p1 = (start_coord[0], start_coord[1])
    p2 = (end_coord[0], end_coord[1])
    
    # Pre-calculate leg bounding box for early exit
    leg_min_lat, leg_max_lat = min(p1[0], p2[0]), max(p1[0], p2[0])
    leg_min_lon, leg_max_lon = min(p1[1], p2[1]), max(p1[1], p2[1])
    # Add small buffer to leg box for "NEAR" check
    leg_min_lat -= 0.002; leg_max_lat += 0.002
    leg_min_lon -= 0.002; leg_max_lon += 0.002

    total_penalty = 0
    
    for line in traffic_lines:
        pts = line
        if len(pts) < 2: continue
        
        # Bounding box filter for the whole scribble
        lats = [p[0] for p in pts]
        lons = [p[1] for p in pts]
        # Add 0.001 buffer to the scribble box to catch "NEAR" cases correctly
        line_min_lat, line_max_lat = min(lats) - 0.001, max(lats) + 0.001
        line_min_lon, line_max_lon = min(lons) - 0.001, max(lons) + 0.001
        
        if (leg_max_lat < line_min_lat or leg_min_lat > line_max_lat or
            leg_max_lon < line_min_lon or leg_min_lon > line_max_lon):
            continue # Scribble is nowhere near this leg, skip expensive math

        line_has_buffer_penalty = False
        
        for i in range(len(pts) - 1):
            p3, p4 = pts[i], pts[i+1]
            
            # 1. Exact Intersection check
            if _intersects(p1, p2, p3, p4):
                total_penalty += 2000000 
                
            # 2. Buffer check (150m)
            if not line_has_buffer_penalty:
                mid = ((p1[0]+p2[0])/2, (p1[1]+p2[1])/2)
                if (_dist_to_segment(p1, p3, p4) < buffer_km or 
                    _dist_to_segment(p2, p3, p4) < buffer_km or 
                    _dist_to_segment(mid, p3, p4) < buffer_km):
                    total_penalty += 5000
                    line_has_buffer_penalty = True

    return total_penalty

def _build_haversine_matrix(coords: List[Tuple[float, float]], traffic_lines: List[List[List[float]]] = None) -> List[List[int]]:
    n = len(coords)
    matrix: List[List[int]] = []
    for i in range(n):
        row: List[int] = []
        for j in range(n):
            if i == j:
                row.append(0)
            else:
                km = _haversine_km(coords[i][0], coords[i][1], coords[j][0], coords[j][1])
                cost = int(km * 1000)
                if traffic_lines:
                    penalty = _leg_intersects_traffic(coords[i], coords[j], traffic_lines)
                    if penalty > 0:
                        cost += penalty
                        label = "CROSS" if penalty >= 2000000 else "NEAR"
                        print(f"[TSP] {label} weight applied.")
                row.append(cost)
        matrix.append(row)
    return matrix

def _build_distance_matrix(coords: List[Tuple[float, float]], traffic_lines: List[List[List[float]]] = None) -> List[List[int]]:
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
            for i, row in enumerate(data["distances"]):
                modified_row = []
                # the OSRM table API returns distances in float meters
                for j, d in enumerate(row):
                    cost = int(d)
                    if i != j and traffic_lines:
                        penalty = _leg_intersects_traffic(coords[i], coords[j], traffic_lines)
                        if penalty > 0:
                            cost += penalty
                            label = "CROSS" if penalty >= 2000000 else "NEAR"
                            print(f"[TSP] {label} weight applied for leg {i}->{j} ({bin_ids[i]} to {bin_ids[j]}).")
                    modified_row.append(cost)
                matrix.append(modified_row)
            print("[TSP] Using real-world OSRM driving distance matrix (with traffic penalties).")
            return matrix
    except Exception as e:
        print("[TSP] OSRM Table API failed, falling back to Haversine:", e)
        
    return _build_haversine_matrix(coords, traffic_lines)


# ── public API ───────────────────────────────────────────────────────────────

def optimize_route(
    bin_ids: List[str],
    coords:  List[Tuple[float, float]],   # (latitude, longitude) per bin
    time_limit_seconds: int = 10,
    traffic_lines: List[List[List[float]]] = None,
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

    if n > 15:
        time_limit_seconds = max(time_limit_seconds, 20)
    elif n > 10:
        time_limit_seconds = max(time_limit_seconds, 15)

    distance_matrix = _build_distance_matrix(coords, traffic_lines)

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
        return distance_matrix[from_node][to_node]

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

        # Distance from current node to next node
        dist_m = distance_matrix[node][next_node]
        leg_distances.append(round(dist_m / 1000.0, 4))

        index = next_index

    # Add the final closing node (node 0) to complete the loop
    # In OR-Tools for single vehicle TSP, index at this point is the end node index
    ordered_ids.append(bin_ids[0])

    return ordered_ids, leg_distances
