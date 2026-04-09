from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


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

class RouteRequest(BaseModel):
    threshold: Optional[float] = Field(None, ge=0, le=100, json_schema_extra={"example": 70.0})
    traffic_lines: List[List[List[float]]] = Field(default_factory=list, json_schema_extra={"example": [[[12.9, 77.5], [12.91, 77.51]]]})

class RouteResponse(BaseModel):
    route:                    List[str]
    total_bins:               int    # critical bins being collected this run
    total_city_bins:          int    # total bins in the city (with GPS)
    distances:                List[float]  # per-leg distances (km) for the optimised route
    optimized_distance_km:    float        # TSP-optimal distance (critical bins only)
    unoptimized_distance_km:  float        # naive sequential distance (ALL city bins)


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
