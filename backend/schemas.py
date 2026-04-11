from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ─────────────────────────────────────────────
#  Bin – Request / Response schemas
# ─────────────────────────────────────────────

class BinUpdateRequest(BaseModel):
    bin_id:      str   = Field(..., example="BIN_01")
    fill_pct:    float = Field(..., ge=0, le=100, example=75.5)
    distance_cm: Optional[float] = Field(None, example=10.0)
    latitude:    Optional[float] = Field(None, example=12.97)
    longitude:   Optional[float] = Field(None, example=77.59)


class BinUpdateResponse(BaseModel):
    status:   str
    bin_id:   str
    fill_pct: float
    is_alert: bool
    id:       int


class BinStatusResponse(BaseModel):
    bin_id:     str
    fill_pct:   float
    distance_cm: Optional[float]
    latitude:   Optional[float]
    longitude:  Optional[float]
    is_alert:   bool
    message:    str
    created_at: datetime
    spillover_risk: Optional[int] = None

    model_config = {"from_attributes": True}


class BinHistoryItem(BaseModel):
    id:         int
    fill_pct:   float
    distance_cm: Optional[float]
    is_alert:   bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────
#  Route Optimization schemas
# ─────────────────────────────────────────────

class RouteResponse(BaseModel):
    route:                    List[str]
    total_bins:               int    # critical bins being collected this run
    total_city_bins:          int    # total bins in the city (with GPS)
    distances:                List[float]  # per-leg distances (km) for the optimised route
    optimized_distance_km:    float        # TSP-optimal distance (critical bins only)
    unoptimized_distance_km:  float        # naive sequential distance (ALL city bins)


class TrafficZoneItem(BaseModel):
    """One road segment the fleet should treat as congested (from snapped freehand draw)."""

    start: List[float] = Field(..., min_length=2, max_length=2, description="[latitude, longitude]")
    end: List[float] = Field(..., min_length=2, max_length=2, description="[latitude, longitude]")
    severity: str = Field(default="high", description='Severity: "low" | "medium" | "high"')


class OptimizeRouteRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    threshold: Optional[float] = Field(
        default=None,
        ge=0,
        le=100,
        description="Fill-level threshold (%). When omitted, server uses ALERT_THRESHOLD.",
    )
    traffic_zones: List[TrafficZoneItem] = Field(
        default_factory=list,
        alias="trafficZones",
        description="Congestion segments used to inflate TSP arc costs.",
    )
    traffic_mode: str = Field(
        default="penalize",
        alias="trafficMode",
        description='How to use traffic: "penalize" (multiply cost) or "avoid" (near-infinite cost).',
    )

    @field_validator("traffic_mode")
    @classmethod
    def normalize_traffic_mode(cls, v: object) -> str:
        s = str(v or "penalize").strip().lower()
        return s if s in ("penalize", "avoid") else "penalize"


# ─────────────────────────────────────────────
#  AI Predictive Heuristics schemas
# ─────────────────────────────────────────────

class BinPredictItem(BaseModel):
    bin_id: str
    fill_pct: float
    latitude: Optional[float]
    longitude: Optional[float]
    spillover_risk: int  # 0 to 100 percentage


class BinPredictResponse(BaseModel):
    predictions: List[BinPredictItem]
