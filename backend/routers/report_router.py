"""
report_router.py
================
Endpoints for citizen-driven overflowing bin reports.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas

router = APIRouter(prefix="/reports", tags=["Citizen Reports"])

@router.post("", response_model=schemas.BinReportResponse)
def create_report(payload: schemas.BinReportRequest, db: Session = Depends(get_db)):
    """Submit a new overflowing bin report from a citizen."""
    report = models.BinReport(
        location_name=payload.location_name,
        latitude=payload.latitude,
        longitude=payload.longitude,
        image_data=payload.image_data,
        status="PENDING"
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report

@router.get("", response_model=List[schemas.BinReportResponse])
def get_all_reports(db: Session = Depends(get_db)):
    """Fetch all citizen reports sorted by latest first."""
    return db.query(models.BinReport).order_by(models.BinReport.created_at.desc()).all()

@router.delete("/{report_id}")
def delete_report(report_id: int, db: Session = Depends(get_db)):
    """Delete a report (e.g. after validation)."""
    report = db.query(models.BinReport).filter(models.BinReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    db.delete(report)
    db.commit()
    return {"status": "success", "message": f"Report {report_id} deleted"}
