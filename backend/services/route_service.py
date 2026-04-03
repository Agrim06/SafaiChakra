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
    Return the *latest* reading for every bin at or above `threshold` with GPS.
    """
    all_latest = _get_latest_readings(db)
    return [
        r for r in all_latest
        if r.fill_pct >= threshold
        and r.latitude is not None
        and r.longitude is not None
    ]


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

    # All bins with GPS — used for the unoptimized baseline
    all_bins = get_all_bins_with_coords(db)
    all_coords: List[Tuple[float, float]] = [(b.latitude, b.longitude) for b in all_bins]

    # Sequential distance of visiting ALL bins (the naive, unoptimized scenario)
    unoptimized_km = 0.0
    if len(all_coords) > 1:
        for i in range(len(all_coords) - 1):
            unoptimized_km += _haversine_km(
                all_coords[i][0], all_coords[i][1],
                all_coords[i + 1][0], all_coords[i + 1][1],
            )
    unoptimized_km = round(unoptimized_km, 3)

    # Critical bins only (above threshold with GPS)
    priority_bins = get_priority_bins(db, threshold)

    if not priority_bins:
        return RouteResponse(
            route=[],
            total_bins=0,
            total_city_bins=len(all_bins),
            distances=[],
            optimized_distance_km=0.0,
            unoptimized_distance_km=unoptimized_km,
        )

    bin_ids = [b.bin_id for b in priority_bins]
    coords: List[Tuple[float, float]] = [(b.latitude, b.longitude) for b in priority_bins]

    ordered_ids, leg_distances = optimize_route(bin_ids, coords)

    # Optimized: sum of OR-Tools leg distances (exclude the sentinel 0.0 at last stop)
    optimized_km = round(sum(d for d in leg_distances if d > 0), 3)

    return RouteResponse(
        route=ordered_ids,
        total_bins=len(ordered_ids),
        total_city_bins=len(all_bins),
        distances=leg_distances,
        optimized_distance_km=optimized_km,
        unoptimized_distance_km=unoptimized_km,
    )
