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
from schemas import OptimizeRouteRequest, RouteResponse
from services import route_service

router = APIRouter(tags=["Route"])

ALERT_THRESHOLD = float(os.getenv("ALERT_THRESHOLD", 70.0))


@router.get("/optimize-route", response_model=RouteResponse)
def optimize_route_get(
    threshold: float = Query(
        default=None,
        ge=0,
        le=100,
        description="Override default fill-level threshold (%). Defaults to ALERT_THRESHOLD env var.",
    ),
    use_spillover_prediction: bool = Query(
        default=False,
        alias="useSpilloverPrediction",
        description="Include high spillover-risk bins below threshold (same as POST flag).",
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
    return route_service.compute_route(
        db,
        threshold=effective_threshold,
        use_spillover_prediction=use_spillover_prediction,
    )


@router.post("/optimize-route", response_model=RouteResponse)
def optimize_route_post(
    payload: OptimizeRouteRequest,
    db: Session = Depends(get_db),
):
    """
    Same as GET **optimize-route**, plus optional **trafficZones** so OR-Tools can penalize or
    forbid arcs whose straight bin-to-bin chord crosses a user-drawn congestion segment.
    """
    effective_threshold = payload.threshold if payload.threshold is not None else ALERT_THRESHOLD
    zones = [z.model_dump() for z in payload.traffic_zones] if payload.traffic_zones else None
    return route_service.compute_route(
        db,
        threshold=effective_threshold,
        traffic_zones=zones,
        traffic_mode=payload.traffic_mode,
        use_spillover_prediction=payload.use_spillover_prediction,
    )
