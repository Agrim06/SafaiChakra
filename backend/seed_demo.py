"""Insert demo depot + 10 bins (3 critical, 2 medium, 5 easy) when DB has no readings."""

from __future__ import annotations

import os

from sqlalchemy import func

import models
from database import SessionLocal

ALERT_THRESHOLD = float(os.getenv("ALERT_THRESHOLD", "70.0"))

# (bin_id, lat, lon, fill_pct) — Mysuru-ish spread
_DEMO_BINS: list[tuple[str, float, float, float]] = [
    # 3 critical (at/above typical alert threshold)
    ("BIN_01", 12.3120, 76.6480, 88.0),
    ("BIN_02", 12.3050, 76.6520, 85.0),
    ("BIN_03", 12.3180, 76.6400, 92.0),
    # 2 medium (between “easy” and critical — not alert, not empty)
    ("BIN_04", 12.3100, 76.6500, 52.0),
    ("BIN_05", 12.3140, 76.6420, 48.0),
    # 5 easy (low fill)
    ("BIN_06", 12.3020, 76.6440, 22.0),
    ("BIN_07", 12.3160, 76.6550, 18.0),
    ("BIN_08", 12.3070, 76.6380, 25.0),
    ("BIN_09", 12.3200, 76.6500, 15.0),
    ("BIN_10", 12.3040, 76.6480, 20.0),
]

_DEPOT = ("DEPOT_00", 12.3080, 76.6460, 0.0)


def seed_demo_bins_if_empty() -> None:
    if os.getenv("SKIP_DEMO_SEED", "").lower() in ("1", "true", "yes"):
        return
    db = SessionLocal()
    try:
        n = db.query(func.count(models.BinReading.id)).scalar() or 0
        if n > 0:
            return

        rows = [_DEPOT] + _DEMO_BINS
        for bin_id, lat, lon, fill in rows:
            is_alert = fill >= ALERT_THRESHOLD
            db.add(
                models.BinReading(
                    bin_id=bin_id,
                    fill_pct=fill,
                    distance_cm=40.0 * (1.0 - fill / 100.0) if fill > 0 else 40.0,
                    latitude=lat,
                    longitude=lon,
                    is_alert=is_alert,
                )
            )
        db.commit()
        print("[Seed] Demo data: DEPOT_00 + 10 bins (3 critical, 2 medium, 5 easy).")
    except Exception as e:  # pragma: no cover
        db.rollback()
        print("[Seed] Skipped:", e)
    finally:
        db.close()
