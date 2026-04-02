from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from sqlalchemy.sql import func
from database import Base

class BinReading(Base):
    __tablename__ = "bin_readings"

    id          = Column(Integer, primary_key=True, index=True)
    bin_id      = Column(String, nullable=False)
    fill_pct    = Column(Float, nullable=False)
    distance_cm = Column(Float)
    is_alert    = Column(Boolean, default=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())