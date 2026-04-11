"""
sensor_router.py
================
Endpoints for sensor-health monitoring and failure simulation.
"""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from schemas import (
    SensorHealthItem,
    SensorHealthResponse,
    SensorSimulateRequest,
    SensorSimulateResponse,
)
from services import sensor_service

router = APIRouter(prefix="/sensor", tags=["Sensor Health"])


@router.get("/health", response_model=SensorHealthResponse)
def sensor_health_all(db: Session = Depends(get_db)):
    """
    Diagnostic scan of every bin's sensor health.

    Returns a list of per-bin verdicts: OK / WARNING / FAILURE with
    human-readable issue descriptions.
    """
    diagnostics = sensor_service.diagnose_all(db)
    items = [SensorHealthItem(**d) for d in diagnostics]

    total = len(items)
    healthy  = sum(1 for i in items if i.severity == "OK")
    warnings = sum(1 for i in items if i.severity == "WARNING")
    failures = sum(1 for i in items if i.severity == "FAILURE")

    return SensorHealthResponse(
        sensors=items,
        summary={
            "total": total,
            "healthy": healthy,
            "warnings": warnings,
            "failures": failures,
        },
    )


@router.get("/health/{bin_id}", response_model=SensorHealthItem)
def sensor_health_single(bin_id: str, db: Session = Depends(get_db)):
    """Diagnostic check on a single bin's sensor."""
    result = sensor_service.diagnose_single(db, bin_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Bin '{bin_id}' not found")
    return SensorHealthItem(**result)


@router.post("/simulate-failure", response_model=SensorSimulateResponse)
def simulate_sensor_failure(
    payload: SensorSimulateRequest,
    db: Session = Depends(get_db),
):
    """
    Inject a synthetic sensor fault for demo/hackathon purposes.

    **Scenarios:**
    - `stale`       — push timestamp 30 min into the past
    - `frozen`      — 6 identical readings at 54.0%
    - `out_of_range` — fill_pct = -12%, distance_cm = 999
    - `erratic`     — spike fill by +60%
    - `disconnect`  — distance_cm = -1 (wiring fault)
    """
    result = sensor_service.simulate_failure(db, payload.bin_id, payload.scenario)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return SensorSimulateResponse(**result)


@router.post("/reset/{bin_id}")
def reset_sensor(bin_id: str, db: Session = Depends(get_db)):
    """Reset a bin's sensor reading to healthy defaults after a simulation."""
    result = sensor_service.reset_sensor(db, bin_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.post("/reset-all")
def reset_all_sensors(db: Session = Depends(get_db)):
    """Reset all bins to healthy defaults."""
    return sensor_service.reset_all_sensors(db)


@router.get("/scenarios")
def list_scenarios():
    """Return the available simulation scenarios with descriptions."""
    return sensor_service.FAILURE_SCENARIOS
