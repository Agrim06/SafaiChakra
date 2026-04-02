"""
helpers.py
==========
Shared utility functions used across the application.
"""

from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Optional


def utc_now() -> datetime:
    """Return the current UTC time as a timezone-aware datetime."""
    return datetime.now(tz=timezone.utc)


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Compute great-circle distance between two GPS points using the Haversine formula.

    Args:
        lat1, lon1: Coordinates of point A (degrees).
        lat2, lon2: Coordinates of point B (degrees).

    Returns:
        Distance in kilometres.
    """
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi    = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def priority_score(fill_pct: float, created_at: datetime, weight: float = 0.5) -> float:
    """
    Compute a priority score for a bin reading.

    score = fill_pct + (minutes_since_reading * weight)

    Higher score = collect sooner.
    """
    now = utc_now()
    # Make created_at timezone-aware if naive
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    minutes_elapsed = (now - created_at).total_seconds() / 60.0
    return fill_pct + (minutes_elapsed * weight)
