"""
Material model for 3D printing materials.
"""
from sqlalchemy import Column, String, Numeric, Integer, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from .base import BaseModel


class Material(BaseModel):
    """3D printing material available for a specific printer."""

    __tablename__ = "materials"

    printer_id = Column(UUID(as_uuid=True), ForeignKey(
        "printers.id"), nullable=False)

    # Material properties
    type = Column(String(50), nullable=False)  # PLA, ABS, PETG, etc.
    brand = Column(String(100))

    # Color information
    color_name = Column(String(100))
    color_hex = Column(String(7))  # Hex color code

    # Pricing and inventory
    price_per_gram = Column(Numeric(8, 4), nullable=False)
    stock_grams = Column(Integer, default=0)

    # Availability
    available = Column(Boolean, default=True)

    # Relationships
    printer = relationship("Printer", back_populates="materials")

    @property
    def is_in_stock(self):
        """Check if material is in stock."""
        return self.available and self.stock_grams > 0

    def __repr__(self):
        return f"<Material(id={self.id}, type={self.type}, color={self.color_name})>"
