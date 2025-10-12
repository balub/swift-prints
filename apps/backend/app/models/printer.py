"""
Printer model for maker equipment.
"""
from sqlalchemy import Column, String, Integer, Numeric, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from .base import BaseModel


class Printer(BaseModel):
    """3D printer owned by a maker."""

    __tablename__ = "printers"

    maker_id = Column(UUID(as_uuid=True), ForeignKey(
        "makers.id"), nullable=False)
    name = Column(String(255), nullable=False)
    model = Column(String(255))

    # Build volume in mm
    build_volume_x = Column(Integer)
    build_volume_y = Column(Integer)
    build_volume_z = Column(Integer)

    # Pricing
    hourly_rate = Column(Numeric(10, 2))

    # Status
    active = Column(Boolean, default=True)

    # Relationships
    maker = relationship("Maker", back_populates="printers")
    materials = relationship(
        "Material", back_populates="printer", cascade="all, delete-orphan")

    @property
    def build_volume_mm3(self):
        """Calculate build volume in cubic millimeters."""
        if all([self.build_volume_x, self.build_volume_y, self.build_volume_z]):
            return self.build_volume_x * self.build_volume_y * self.build_volume_z
        return None

    def __repr__(self):
        return f"<Printer(id={self.id}, name={self.name}, model={self.model})>"
