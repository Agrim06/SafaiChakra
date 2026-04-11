from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Index
from sqlalchemy.sql import func
from database import Base


class BinReading(Base):
    """
    Stores every sensor reading sent by an IoT bin device.
    One row = one reading snapshot.
    """
    __tablename__ = "bin_readings"

    id          = Column(Integer, primary_key=True, index=True)
    bin_id      = Column(String(50), nullable=False, index=True)   # e.g. "BIN_01"
    fill_pct    = Column(Float, nullable=False)                    # 0-100 %
    distance_cm = Column(Float, nullable=True)                     # raw sensor value
    latitude    = Column(Float, nullable=True)
    longitude   = Column(Float, nullable=True)
    is_alert    = Column(Boolean, default=False, nullable=False)
    created_at  = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Composite index for fast "latest reading of a bin" queries
    __table_args__ = (
        Index("ix_bin_readings_bin_id_created_at", "bin_id", "created_at"),
    )


class BinReport(Base):
    """
    Stores citizen reports of overflowing or malfunctioning bins.
    Used for the public-facing 'Citizen Report' feature.
    """
    __tablename__ = "bin_reports"

    id            = Column(Integer, primary_key=True, index=True)
    location_name = Column(String(255), nullable=False)
    latitude      = Column(Float, nullable=False)
    longitude     = Column(Float, nullable=False)
    image_data    = Column(String, nullable=True) # Base64 encoded image
    status        = Column(String(50), default="PENDING") # PENDING, VERIFIED, CLARIFIED
    reports_count = Column(Integer, default=1)
    created_at    = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )