

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


def _build_distance_matrix(coords: List[Tuple[float, float]]) -> List[List[int]]:
    """
    Build an integer distance matrix (in metres) from a list of (lat, lon) tuples.
    OR-Tools requires integer distances.
    """
    n = len(coords)
    matrix: List[List[int]] = []
    for i in range(n):
        row: List[int] = []
        for j in range(n):
            if i == j:
                row.append(0)
            else:
                km = _haversine_km(coords[i][0], coords[i][1], coords[j][0], coords[j][1])
                row.append(int(km * 1000))  # convert to metres
        matrix.append(row)
    return matrix


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
    prev_node: int | None = None

    while not routing.IsEnd(index):
        node = manager.IndexToNode(index)
        ordered_ids.append(bin_ids[node])

        if prev_node is not None:
            leg_km = distance_matrix[prev_node][node] / 1000.0
            leg_distances.append(round(leg_km, 4))

        prev_node = node
        index = solution.Value(routing.NextVar(index))

    # Last leg back to depot (closed-loop; omit if you want open route)
    # We return an open route – no return-to-depot leg appended.
    if prev_node is not None and len(ordered_ids) > 1:
        leg_distances.append(0.0)  # sentinel for last stop

    return ordered_ids, leg_distances
