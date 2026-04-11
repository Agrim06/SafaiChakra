"""
sensor_service.py
=================
Sensor-health diagnostics layer.

Detects four classes of failure:
  1. STALE     – no reading received in > STALE_THRESHOLD_SECONDS
  2. FROZEN    – sensor stuck at identical value across multiple readings
  3. OUT_OF_RANGE – fill_pct or distance_cm physically impossible
  4. ERRATIC   – sudden spikes / drops that exceed plausible physics

Each bin gets a health verdict: OK | WARNING | FAILURE, plus detail text.

The `simulate_failure` helper injects a synthetic bad reading so the
dashboard can demo the feature without real hardware faults.
"""

from __future__ import annotations

import os
import random
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

import models
from services.bin_service import get_latest_reading, get_history


# ── Configurable knobs (env-overridable) ────────────────────────────────────
STALE_THRESHOLD_SECONDS = int(os.getenv("STALE_THRESHOLD_SECONDS", 86400)) # 24 hours for demo
FROZEN_WINDOW           = int(os.getenv("FROZEN_WINDOW", 5))              # readings
FROZEN_TOLERANCE        = float(os.getenv("FROZEN_TOLERANCE", 0.1))       # ±0.1%
ERRATIC_JUMP_THRESHOLD  = float(os.getenv("ERRATIC_JUMP_THRESHOLD", 40))  # >40% swing
DISTANCE_MIN_CM         = float(os.getenv("DISTANCE_MIN_CM", 0))
DISTANCE_MAX_CM         = float(os.getenv("DISTANCE_MAX_CM", 500))


# ── Health verdict enum-like strings ────────────────────────────────────────
OK      = "OK"
WARNING = "WARNING"
FAILURE = "FAILURE"


def _diagnose_single_bin(
    latest: models.BinReading,
    history: List[models.BinReading],
    now: datetime,
) -> Dict[str, Any]:
    """
    Run every heuristic on one bin and return a diagnostic dict.
    """
    issues: List[str] = []
    severity = OK

    # 1. Stale?
    ts = latest.created_at
    if ts.tzinfo is None:
        # Naive timestamp from DB — assume UTC
        reading_age = (now - ts.replace(tzinfo=timezone.utc)).total_seconds()
    else:
        reading_age = (now - ts).total_seconds()
    # Guard against negative ages (clock skew / future timestamps)
    reading_age = max(0, reading_age)
    if reading_age > STALE_THRESHOLD_SECONDS:
        issues.append(f"No data for {int(reading_age)}s (threshold {STALE_THRESHOLD_SECONDS}s)")
        severity = FAILURE

    # 2. Out-of-range?
    if latest.fill_pct < 0 or latest.fill_pct > 100:
        issues.append(f"Fill {latest.fill_pct:.1f}% out of [0-100]")
        severity = FAILURE

    if latest.distance_cm is not None:
        if latest.distance_cm < DISTANCE_MIN_CM or latest.distance_cm > DISTANCE_MAX_CM:
            issues.append(f"Distance {latest.distance_cm:.1f}cm out of range")
            severity = FAILURE
        if latest.distance_cm < 0:
            issues.append("Negative distance — sensor wiring fault")
            severity = FAILURE

    # 3. Frozen? (identical fill across last N readings)
    if len(history) >= FROZEN_WINDOW:
        window = history[:FROZEN_WINDOW]
        fills = [r.fill_pct for r in window]
        if max(fills) - min(fills) <= FROZEN_TOLERANCE:
            issues.append(f"Fill stuck at {fills[0]:.1f}% across {FROZEN_WINDOW} readings")
            if severity != FAILURE:
                severity = WARNING

    # 4. Erratic jump? (compare latest to previous)
    if len(history) >= 2:
        prev_fill = history[1].fill_pct
        delta = abs(latest.fill_pct - prev_fill)
        if delta >= ERRATIC_JUMP_THRESHOLD:
            issues.append(f"Fill jumped {delta:.1f}% (prev {prev_fill:.1f}% → now {latest.fill_pct:.1f}%)")
            if severity != FAILURE:
                severity = WARNING

    return {
        "bin_id": latest.bin_id,
        "severity": severity,
        "issues": issues,
        "fill_pct": latest.fill_pct,
        "distance_cm": latest.distance_cm,
        "latitude": latest.latitude,
        "longitude": latest.longitude,
        "last_seen_seconds_ago": int(reading_age),
    }


def diagnose_all(db: Session) -> List[Dict[str, Any]]:
    """
    Perform a health check on every bin.
    Uses a subquery to ensure we only analyze the LATEST reading per bin.
    """
    from sqlalchemy import func
    
    # Subquery to find max timestamp for each bin
    subq = (
        db.query(models.BinReading.bin_id, func.max(models.BinReading.created_at).label("latest_ts"))
        .group_by(models.BinReading.bin_id)
        .subquery()
    )

    # Join with the readings table to get the actual full records
    latest_readings = (
        db.query(models.BinReading)
        .join(subq, (models.BinReading.bin_id == subq.c.bin_id) & (models.BinReading.created_at == subq.c.latest_ts))
        .all()
    )

    results = []
    for r in latest_readings:
        # Re-use diagnose_single logic for consistency
        diag = diagnose_single(db, r.bin_id)
        if diag:
            results.append(diag)
    
    return results


def diagnose_single(db: Session, bin_id: str) -> Optional[Dict[str, Any]]:
    """Run health diagnostics on a single bin."""
    now = datetime.now(timezone.utc)
    latest = get_latest_reading(db, bin_id)
    if latest is None:
        return None
    history = get_history(db, bin_id, limit=max(FROZEN_WINDOW + 1, 10))
    return _diagnose_single_bin(latest, history, now)


# ── Simulation helpers ──────────────────────────────────────────────────────

FAILURE_SCENARIOS = {
    "stale":      "Simulate stale sensor (timestamp pushed far into the past)",
    "frozen":     "Inject N identical readings at fill 54.0%",
    "out_of_range": "Set fill to -12% (impossible value)",
    "erratic":    "Spike fill from current to +60%",
    "disconnect": "Set distance_cm to -1 (sensor wiring fault)",
}


def simulate_failure(
    db: Session,
    bin_id: str,
    scenario: str = "stale",
) -> Dict[str, Any]:
    """
    Inject a synthetic fault into the database for demo purposes.
    Returns a summary of what was injected.
    """
    from sqlalchemy.sql import func as sqlfunc

    latest = get_latest_reading(db, bin_id)
    if latest is None:
        return {"error": f"Bin '{bin_id}' not found"}

    summary: Dict[str, Any] = {
        "bin_id": bin_id,
        "scenario": scenario,
        "description": FAILURE_SCENARIOS.get(scenario, "unknown"),
    }

    if scenario == "stale":
        # Push the timestamp 30 minutes into the past
        latest.created_at = datetime.now(timezone.utc) - timedelta(minutes=30)
        db.commit()
        summary["injected"] = "Moved last reading timestamp 30 min back"

    elif scenario == "frozen":
        # Write 6 identical readings at exactly 54.0%
        frozen_fill = 54.0
        for _ in range(6):
            reading = models.BinReading(
                bin_id=bin_id,
                fill_pct=frozen_fill,
                distance_cm=latest.distance_cm,
                latitude=latest.latitude,
                longitude=latest.longitude,
                is_alert=False,
            )
            db.add(reading)
        db.commit()
        summary["injected"] = f"6 identical readings at {frozen_fill}%"

    elif scenario == "out_of_range":
        # Insert a new row with impossible values (keeps old reading as history)
        bad = models.BinReading(
            bin_id=bin_id,
            fill_pct=-12.0,
            distance_cm=999.0,
            latitude=latest.latitude,
            longitude=latest.longitude,
            is_alert=False,
        )
        db.add(bad)
        db.commit()
        summary["injected"] = "fill_pct=-12, distance_cm=999"

    elif scenario == "erratic":
        # Insert a new row that spikes +60% from current — history still has old reading
        prev_fill = latest.fill_pct
        spike = min(prev_fill + 60, 160)
        spiked = models.BinReading(
            bin_id=bin_id,
            fill_pct=spike,
            distance_cm=latest.distance_cm,
            latitude=latest.latitude,
            longitude=latest.longitude,
            is_alert=spike >= 70,
        )
        db.add(spiked)
        db.commit()
        summary["injected"] = f"fill_pct spiked {prev_fill:.0f}% → {spike:.1f}%"

    elif scenario == "disconnect":
        # Insert a new row with negative distance (wiring fault)
        bad = models.BinReading(
            bin_id=bin_id,
            fill_pct=0.0,
            distance_cm=-1.0,
            latitude=latest.latitude,
            longitude=latest.longitude,
            is_alert=False,
        )
        db.add(bad)
        db.commit()
        summary["injected"] = "distance_cm=-1 (sensor wiring fault)"

    else:
        summary["injected"] = "Unknown scenario, nothing changed"

    db.refresh(latest)
    return summary


def reset_sensor(db: Session, bin_id: str) -> Dict[str, Any]:
    """
    Reset a simulated failure: put the bin back to a healthy 25% fill.
    """
    from sqlalchemy.sql import func as sqlfunc

    latest = get_latest_reading(db, bin_id)
    if latest is None:
        return {"error": f"Bin '{bin_id}' not found"}

    latest.fill_pct = 25.0
    latest.distance_cm = 30.0
    latest.is_alert = False
    latest.created_at = sqlfunc.now()
    db.commit()
    db.refresh(latest)

    return {"bin_id": bin_id, "status": "reset", "fill_pct": 25.0}


def reset_all_sensors(db: Session) -> Dict[str, Any]:
    """Reset all known bins to healthy defaults."""
    from services.bin_service import get_all_bins
    from sqlalchemy.sql import func as sqlfunc

    bin_ids = get_all_bins(db)
    count = 0
    for bid in bin_ids:
        latest = get_latest_reading(db, bid)
        if latest:
            latest.fill_pct = 25.0
            latest.distance_cm = 30.0
            latest.is_alert = False
            latest.created_at = sqlfunc.now()
            count += 1
    
    db.commit()
    return {"status": "success", "message": f"Reset {count} sensors", "count": count}
