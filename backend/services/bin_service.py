"""
bin_service.py
==============
Data-access layer for bin readings.
All DB queries are isolated here to keep routers thin.
"""

from __future__ import annotations

import os
from typing import List, Optional

from sqlalchemy.orm import Session

import models
from schemas import BinUpdateRequest


ALERT_THRESHOLD = float(os.getenv("ALERT_THRESHOLD", 70.0))


def create_reading(db: Session, payload: BinUpdateRequest) -> models.BinReading:
    """Persist a new bin reading or update if it exists, and return the ORM object."""
    is_alert = payload.fill_pct >= ALERT_THRESHOLD

    latest = get_latest_reading(db, payload.bin_id)
    
    lat = payload.latitude if payload.latitude is not None else (latest.latitude if latest else None)
    lon = payload.longitude if payload.longitude is not None else (latest.longitude if latest else None)

    reading = models.BinReading(
        bin_id      = payload.bin_id,
        fill_pct    = payload.fill_pct,
        distance_cm = payload.distance_cm,
        latitude    = lat,
        longitude   = lon,
        is_alert    = is_alert,
    )
    db.add(reading)
    db.commit()
    db.refresh(reading)
    return reading


def get_latest_reading(db: Session, bin_id: str) -> Optional[models.BinReading]:
    """Return the most recent reading for a given bin, or None."""
    return (
        db.query(models.BinReading)
        .filter(models.BinReading.bin_id == bin_id)
        .order_by(models.BinReading.created_at.desc())
        .first()
    )


def get_history(db: Session, bin_id: str, limit: int = 20) -> List[models.BinReading]:
    """Return the last `limit` readings for a bin, newest first."""
    return (
        db.query(models.BinReading)
        .filter(models.BinReading.bin_id == bin_id)
        .order_by(models.BinReading.created_at.desc())
        .limit(limit)
        .all()
    )


def get_all_bins(db: Session) -> List[str]:
    """Return a de-duplicated list of all known bin IDs."""
    rows = db.query(models.BinReading.bin_id).distinct().all()
    return [r.bin_id for r in rows]

def calculate_predictive_risk(bin_id: str, current_fill: float) -> int:
    """
    Hackathon Feature: Calculates a deterministic simulated 24h risk
    so the optimizer and the frontend heatmap always agree.
    """
    import random
    if current_fill >= 90:
        return 99

    # Use bin_id to seed deterministic randomness so the heatmap doesn't flicker
    random.seed(bin_id)
    velocity = random.uniform(5, 35)
    random.seed() # reset to completely random

    projected = current_fill + velocity
    return int(min(projected, 99))
