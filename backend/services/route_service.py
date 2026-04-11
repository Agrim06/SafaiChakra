"""
route_service.py
================
Business logic for route planning:
  1. Query priority bins from the DB (above fill threshold).
  2. Hand coordinates to the OR-Tools optimizer.
  3. Return a structured result.
"""

from __future__ import annotations

import os
import re
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

import models
from route_optimizer import _build_distance_matrix, naive_loop_driving_km, optimize_route
from schemas import RouteResponse


ALERT_THRESHOLD = float(os.getenv("ALERT_THRESHOLD", 70.0))


def _get_latest_readings(db: Session) -> List[models.BinReading]:
    """Return the latest reading for EVERY known bin (no fill filter)."""
    from sqlalchemy import func

    latest_ts_sub = (
        db.query(
            models.BinReading.bin_id,
            func.max(models.BinReading.created_at).label("max_ts"),
        )
        .group_by(models.BinReading.bin_id)
        .subquery()
    )
    return (
        db.query(models.BinReading)
        .join(
            latest_ts_sub,
            (models.BinReading.bin_id == latest_ts_sub.c.bin_id)
            & (models.BinReading.created_at == latest_ts_sub.c.max_ts),
        )
        .all()
    )


SPILLOVER_HIGH_RISK = 72  # include below-threshold stops when prediction mode is on


def get_priority_bins(
    db: Session,
    threshold: float = ALERT_THRESHOLD,
    *,
    use_spillover_prediction: bool = False,
) -> List[models.BinReading]:
    all_latest = _get_latest_readings(db)
    priority_bins: List[models.BinReading] = []

    for r in all_latest:
        if r.latitude is None or r.longitude is None:
            continue

        is_priority = r.fill_pct >= threshold

        if not is_priority and use_spillover_prediction:
            from services.bin_service import calculate_predictive_risk

            risk = calculate_predictive_risk(db, r.bin_id, r.fill_pct)
            if risk >= SPILLOVER_HIGH_RISK:
                is_priority = True

        if is_priority:
            priority_bins.append(r)

    return priority_bins


def get_all_bins_with_coords(db: Session) -> List[models.BinReading]:
    """Return the latest reading for every bin that has GPS coordinates."""
    all_latest = _get_latest_readings(db)
    return [r for r in all_latest if r.latitude is not None and r.longitude is not None]


def _natural_bin_id_key(bin_id: str) -> Tuple[Any, ...]:
    parts = re.split(r"(\d+)", bin_id)
    key: List[Any] = []
    for p in parts:
        if not p:
            continue
        if p.isdigit():
            key.append(int(p))
        else:
            key.append(p.lower())
    return tuple(key)


def static_full_city_driving_km(
    depot_lat: float,
    depot_lon: float,
    all_bins: List[models.BinReading],
) -> float:
    """Fixed municipal schedule: realistically efficient route visiting every non-depot bin."""
    if not all_bins:
        return 0.0
    from route_optimizer import optimize_route
    
    bin_ids = ["DEPOT_00"]
    coords = [(depot_lat, depot_lon)]
    
    for b in all_bins:
        bin_ids.append(b.bin_id)
        coords.append((b.latitude, b.longitude))
        
    _, leg_distances = optimize_route(
        bin_ids,
        coords,
        time_limit_seconds=1,
    )
    
    return round(sum(leg_distances), 3)


def compute_route(
    db: Session,
    threshold: float = ALERT_THRESHOLD,
    traffic_zones: Optional[List[Dict[str, Any]]] = None,
    traffic_mode: str = "penalize",
    use_spillover_prediction: bool = False,
) -> RouteResponse:
    """
    High-level entry point: fetch priority bins → optimise → return RouteResponse.

    Savings comparison:
      - baseline_distance_km: fixed static driving tour visiting ALL bins (sorted id)
      - optimized: TSP on priority bins only
    """
    from route_optimizer import _haversine_km

    all_bins_raw = get_all_bins_with_coords(db)

    # Separate depot from regular bins
    depots = [b for b in all_bins_raw if b.bin_id == "DEPOT_00"]
    all_bins = [b for b in all_bins_raw if b.bin_id != "DEPOT_00"]
    
    # Fallback to hardcoded Mysuru Dumpyard coordinates if Depot hasn't sent a reading
    if depots:
        depot_lat, depot_lon = depots[0].latitude, depots[0].longitude
    else:
        # Default Depot (Mysuru Dumpyard area)
        depot_lat, depot_lon = 12.2764, 76.6666
        print("[Route] Warning: DEPOT_00 not found in DB, using fallback coordinates.")

    all_coords: List[Tuple[float, float]] = [(b.latitude, b.longitude) for b in all_bins]

    unoptimized_km = 0.0
    unopt_path = [(depot_lat, depot_lon)]
    unopt_path.extend(all_coords)
    unopt_path.append((depot_lat, depot_lon))

    if len(unopt_path) > 1:
        for i in range(len(unopt_path) - 1):
            unoptimized_km += _haversine_km(
                unopt_path[i][0], unopt_path[i][1],
                unopt_path[i + 1][0], unopt_path[i + 1][1],
            )
    unoptimized_km = round(unoptimized_km, 3)

    static_baseline_km = static_full_city_driving_km(depot_lat, depot_lon, all_bins)

    # Critical bins only (above threshold with GPS)
    priority_bins_raw = get_priority_bins(
        db, threshold, use_spillover_prediction=use_spillover_prediction
    )
    priority_bins = [b for b in priority_bins_raw if b.bin_id != "DEPOT_00"]

    if not priority_bins:
        return RouteResponse(
            route=["DEPOT_00"] if not all_bins else [], # If no bins, just say depot or empty
            total_bins=0,
            total_city_bins=len(all_bins),
            distances=[],
            optimized_distance_km=0.0,
            unoptimized_distance_km=unoptimized_km,
            baseline_distance_km=static_baseline_km,
        )

    # Start with Depot
    bin_ids = ["DEPOT_00"]
    coords = [(depot_lat, depot_lon)]

    # Add priority bins
    bin_ids.extend([b.bin_id for b in priority_bins])
    coords.extend([(b.latitude, b.longitude) for b in priority_bins])

    base_matrix = _build_distance_matrix(coords)

    ordered_ids, leg_distances = optimize_route(
        bin_ids,
        coords,
        traffic_zones=traffic_zones,
        traffic_mode=traffic_mode,
        base_matrix=base_matrix,
    )

    # Optimized: sum of OR-Tools leg distances
    optimized_km = round(sum(d for d in leg_distances), 3)

    # Remove depot from stop count
    num_stops = len([b for b in ordered_ids if b != "DEPOT_00"])

    result = RouteResponse(
        route=ordered_ids,
        total_bins=num_stops,
        total_city_bins=len(all_bins),
        distances=leg_distances,
        optimized_distance_km=optimized_km,
        unoptimized_distance_km=unoptimized_km,
        baseline_distance_km=static_baseline_km,
    )
    print(f"[Route] Optimized Path: {' -> '.join(result.route)}")
    return result
