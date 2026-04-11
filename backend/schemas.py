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
    unoptimized_distance_km:  float        # straight-line tour all bins (Haversine), secondary reference
    baseline_distance_km:     float = 0.0  # OSRM driving: fixed static route depot → every bin → depot (sorted bin_id)


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
    use_spillover_prediction: bool = Field(
        default=False,
        alias="useSpilloverPrediction",
        description="If true, include below-threshold bins with high ML spillover risk (after user ran predict).",
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


# ─────────────────────────────────────────────
#  Sensor Health / Failure Detection schemas
# ─────────────────────────────────────────────

class SensorHealthItem(BaseModel):
    bin_id:                str
    severity:              str       # "OK" | "WARNING" | "FAILURE"
    issues:                List[str]
    fill_pct:              Optional[float]
    distance_cm:           Optional[float]
    latitude:              Optional[float]
    longitude:             Optional[float]
    last_seen_seconds_ago: Optional[int]


class SensorHealthResponse(BaseModel):
    sensors: List[SensorHealthItem]
    summary: dict  # {total, healthy, warnings, failures}


class SensorSimulateRequest(BaseModel):
    bin_id:   str   = Field(..., example="BIN_01")
    scenario: str   = Field(
        default="stale",
        description='One of: stale, frozen, out_of_range, erratic, disconnect',
        example="stale",
    )


class SensorSimulateResponse(BaseModel):
    bin_id:      str
    scenario:    str
    description: str
    injected:    str


# ─────────────────────────────────────────────
#  Citizen Report schemas
# ─────────────────────────────────────────────

class BinReportRequest(BaseModel):
    location_name: str
    latitude:      float
    longitude:     float
    image_data:    Optional[str] = None # Base64

class BinReportResponse(BaseModel):
    id:            int
    location_name: str
    status:        str
    created_at:    datetime

    model_config = {"from_attributes": True}
