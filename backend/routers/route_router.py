"""
route_router.py
===============
Endpoint(s) for route optimisation.
"""

from __future__ import annotations

import os

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from schemas import RouteResponse
from services import route_service

router = APIRouter(tags=["Route"])

ALERT_THRESHOLD = float(os.getenv("ALERT_THRESHOLD", 70.0))


@router.get("/optimize-route", response_model=RouteResponse)
def optimize_route(
    threshold: float = Query(
        default=None,
        ge=0,
        le=100,
        description="Override default fill-level threshold (%). Defaults to ALERT_THRESHOLD env var.",
    ),
    db: Session = Depends(get_db),
):
    """
    **Route Optimisation**

    1. Fetches all bins whose **latest** `fill_pct ≥ threshold`.
    2. Runs a TSP solver (OR-Tools) on their GPS coordinates.
    3. Returns the optimal visit order and leg distances.
    """
    effective_threshold = threshold if threshold is not None else ALERT_THRESHOLD
    return route_service.compute_route(db, threshold=effective_threshold)
