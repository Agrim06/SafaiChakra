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

    existing = db.query(models.BinReading).filter(models.BinReading.bin_id == payload.bin_id).first()

    if existing:
        existing.fill_pct = payload.fill_pct
        existing.distance_cm = payload.distance_cm
        existing.is_alert = is_alert
        if payload.latitude is not None:
            existing.latitude = payload.latitude
        if payload.longitude is not None:
            existing.longitude = payload.longitude
        db.commit()
        db.refresh(existing)
        return existing
    else:
        reading = models.BinReading(
            bin_id      = payload.bin_id,
            fill_pct    = payload.fill_pct,
            distance_cm = payload.distance_cm,
            latitude    = payload.latitude,
            longitude   = payload.longitude,
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
