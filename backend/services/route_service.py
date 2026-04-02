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


def get_priority_bins(
    db: Session,
    threshold: float = ALERT_THRESHOLD,
) -> List[models.BinReading]:
    """
    Return the *latest* reading for every bin that is at or above `threshold`.

    Uses a subquery to get the most recent reading per bin, then filters
    by fill level. This avoids fetching stale historical rows.
    """
    from sqlalchemy import func

    # Subquery: max created_at per bin_id
    latest_ts_sub = (
        db.query(
            models.BinReading.bin_id,
            func.max(models.BinReading.created_at).label("max_ts"),
        )
        .group_by(models.BinReading.bin_id)
        .subquery()
    )

    # Join back to get full rows at those timestamps
    latest_readings = (
        db.query(models.BinReading)
        .join(
            latest_ts_sub,
            (models.BinReading.bin_id == latest_ts_sub.c.bin_id)
            & (models.BinReading.created_at == latest_ts_sub.c.max_ts),
        )
        .filter(models.BinReading.fill_pct >= threshold)
        .all()
    )

    # Only include bins with known location
    return [r for r in latest_readings if r.latitude is not None and r.longitude is not None]


def compute_route(db: Session, threshold: float = ALERT_THRESHOLD) -> RouteResponse:
    """
    High-level entry point: fetch bins → optimise → return RouteResponse.
    """
    priority_bins = get_priority_bins(db, threshold)

    if not priority_bins:
        return RouteResponse(route=[], total_bins=0, distances=[])

    bin_ids = [b.bin_id for b in priority_bins]
    coords: List[Tuple[float, float]] = [(b.latitude, b.longitude) for b in priority_bins]

    ordered_ids, leg_distances = optimize_route(bin_ids, coords)

    return RouteResponse(
        route=ordered_ids,
        total_bins=len(ordered_ids),
        distances=leg_distances,
    )
