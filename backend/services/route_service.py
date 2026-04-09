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
from typing import List, Tuple

from sqlalchemy.orm import Session

import models
from route_optimizer import optimize_route
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


def get_priority_bins(
    db: Session,
    threshold: float = ALERT_THRESHOLD,
) -> List[models.BinReading]:
    """
    Return the *latest* reading for every bin that is EITHER 
    at or above `threshold` OR has a high 24h predictive spillover risk.
    """
    from services.bin_service import calculate_predictive_risk

    all_latest = _get_latest_readings(db)
    priority_bins = []

    for r in all_latest:
        if r.latitude is None or r.longitude is None:
            continue
            
        # 1. Base rule: currently over Threshold
        is_priority = (r.fill_pct >= threshold)
        
        # 2. Hackathon predictive rule: simulated high spillover risk
        if not is_priority:
            risk = calculate_predictive_risk(r.bin_id, r.fill_pct)
            if risk >= 80:
                is_priority = True

        if is_priority:
            priority_bins.append(r)

    return priority_bins


def get_all_bins_with_coords(db: Session) -> List[models.BinReading]:
    """Return the latest reading for every bin that has GPS coordinates."""
    all_latest = _get_latest_readings(db)
    return [r for r in all_latest if r.latitude is not None and r.longitude is not None]


def compute_route(db: Session, threshold: float = ALERT_THRESHOLD) -> RouteResponse:
    """
    High-level entry point: fetch priority bins → optimise → return RouteResponse.

    Savings comparison:
      - Unoptimized baseline: visit ALL city bins sequentially (naive approach)
      - Optimized result:     visit only critical (above threshold) bins via TSP
    """
    from route_optimizer import _haversine_km

    all_bins_raw = get_all_bins_with_coords(db)

    # Separate depot from regular bins for counting
    depots = [b for b in all_bins_raw if b.bin_id == "DEPOT_00"]
    depot = depots[0] if depots else None
    all_bins = [b for b in all_bins_raw if b.bin_id != "DEPOT_00"]

    all_coords: List[Tuple[float, float]] = [(b.latitude, b.longitude) for b in all_bins]

    # Sequential distance of visiting ALL bins + start at depot (the naive, unoptimized scenario)
    unoptimized_km = 0.0
    unopt_path = []
    if depot:
        unopt_path.append((depot.latitude, depot.longitude))
    unopt_path.extend(all_coords)

    if len(unopt_path) > 1:
        for i in range(len(unopt_path) - 1):
            unoptimized_km += _haversine_km(
                unopt_path[i][0], unopt_path[i][1],
                unopt_path[i + 1][0], unopt_path[i + 1][1],
            )
    unoptimized_km = round(unoptimized_km, 3)

    # Critical bins only (above threshold with GPS)
    priority_bins_raw = get_priority_bins(db, threshold)
    priority_bins = [b for b in priority_bins_raw if b.bin_id != "DEPOT_00"]

    if not priority_bins:
        return RouteResponse(
            route=[],
            total_bins=0,
            total_city_bins=len(all_bins),
            distances=[],
            optimized_distance_km=0.0,
            unoptimized_distance_km=unoptimized_km,
        )

    # Ensure depot is at index 0 for OR-Tools
    active_nodes = []
    if depot:
        active_nodes.append(depot)
    active_nodes.extend(priority_bins)

    bin_ids = [b.bin_id for b in active_nodes]
    coords: List[Tuple[float, float]] = [(b.latitude, b.longitude) for b in active_nodes]

    ordered_ids, leg_distances = optimize_route(bin_ids, coords)

    # Optimized: sum of OR-Tools leg distances (exclude the sentinel 0.0 at last stop)
    optimized_km = round(sum(d for d in leg_distances if d > 0), 3)

    # Remove depot from stop count
    num_stops = len([b for b in ordered_ids if b != "DEPOT_00"])

    return RouteResponse(
        route=ordered_ids,
        total_bins=num_stops,
        total_city_bins=len(all_bins),
        distances=leg_distances,
        optimized_distance_km=optimized_km,
        unoptimized_distance_km=unoptimized_km,
    )
