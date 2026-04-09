

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


# ── public API ───────────────────────────────────────────────────────────────

def optimize_route(
    bin_ids: List[str],
    coords:  List[Tuple[float, float]],   # (latitude, longitude) per bin
    time_limit_seconds: int = 10,
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

    distance_matrix = _build_distance_matrix(coords)

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
