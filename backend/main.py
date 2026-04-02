import os
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from database import get_db, engine
import models

load_dotenv()
models.Base.metadata.create_all(bind=engine)

ALERT_THRESHOLD = float(os.getenv("ALERT_THRESHOLD", 70.0))

app = FastAPI(title="SafaiChakra API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # restrict to your frontend URL in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Pydantic schemas ──────────────────────────────────────
class BinUpdateRequest(BaseModel):
    bin_id:      str
    fill_pct:    float
    distance_cm: float = None

class BinStatusResponse(BaseModel):
    bin_id:     str
    fill_pct:   float
    is_alert:   bool
    message:    str
    created_at: str

# ── POST /bin/update ──────────────────────────────────────
@app.post("/bin/update")
def update_bin(payload: BinUpdateRequest, db: Session = Depends(get_db)):
    is_alert = payload.fill_pct >= ALERT_THRESHOLD

    reading = models.BinReading(
        bin_id      = payload.bin_id,
        fill_pct    = payload.fill_pct,
        distance_cm = payload.distance_cm,
        is_alert    = is_alert,
    )
    db.add(reading)
    db.commit()
    db.refresh(reading)

    return {
        "status":   "ok",
        "bin_id":   reading.bin_id,
        "fill_pct": reading.fill_pct,
        "is_alert": reading.is_alert,
        "id":       reading.id,
    }

# ── GET /bin/status ───────────────────────────────────────
@app.get("/bin/status/{bin_id}")
def get_bin_status(bin_id: str, db: Session = Depends(get_db)):
    reading = (
        db.query(models.BinReading)
        .filter(models.BinReading.bin_id == bin_id)
        .order_by(models.BinReading.created_at.desc())
        .first()
    )
    if not reading:
        raise HTTPException(status_code=404, detail="Bin not found")

    return {
        "bin_id":     reading.bin_id,
        "fill_pct":   reading.fill_pct,
        "is_alert":   reading.is_alert,
        "message":    "Collection needed!" if reading.is_alert else "All good.",
        "created_at": str(reading.created_at),
    }

# ── GET /bin/history ──────────────────────────────────────
@app.get("/bin/history/{bin_id}")
def get_bin_history(bin_id: str, limit: int = 20, db: Session = Depends(get_db)):
    readings = (
        db.query(models.BinReading)
        .filter(models.BinReading.bin_id == bin_id)
        .order_by(models.BinReading.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "fill_pct":   r.fill_pct,
            "is_alert":   r.is_alert,
            "created_at": str(r.created_at),
        }
        for r in readings
    ]

# ── Health check ──────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "running"}