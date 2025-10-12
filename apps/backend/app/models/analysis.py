"""
Analysis result model for STL file processing.
"""
from sqlalchemy import Column, Numeric, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from .base import BaseModel


class AnalysisResult(BaseModel):
    """STL file analysis results from PrusaSlicer."""

    __tablename__ = "analysis_results"

    file_id = Column(UUID(as_uuid=True), ForeignKey(
        "files.id"), nullable=False)

    # Print settings used for analysis (stored as JSON)
    settings = Column(JSONB)

    # Analysis results
    filament_grams = Column(Numeric(8, 2))  # Filament weight in grams
    print_time_hours = Column(Numeric(8, 2))  # Print time in hours
    volume_mm3 = Column(Numeric(12, 2))  # Volume in cubic millimeters
    complexity_score = Column(Numeric(4, 2))  # Complexity rating 0-10
    supports_required = Column(Boolean)

    # Relationships
    file = relationship("File", back_populates="analysis_results")
    orders = relationship("Order", back_populates="analysis")

    @property
    def print_time_minutes(self):
        """Get print time in minutes."""
        if self.print_time_hours:
            return int(self.print_time_hours * 60)
        return None

    @property
    def volume_cm3(self):
        """Get volume in cubic centimeters."""
        if self.volume_mm3:
            return round(float(self.volume_mm3) / 1000, 2)
        return None

    def __repr__(self):
        return f"<AnalysisResult(id={self.id}, filament={self.filament_grams}g, time={self.print_time_hours}h)>"
