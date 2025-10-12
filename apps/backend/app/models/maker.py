"""
Maker model for 3D printing service providers.
"""
from sqlalchemy import Column, String, Text, Numeric, Integer, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from .base import BaseModel


class Maker(BaseModel):
    """Maker profile for 3D printing service providers."""

    __tablename__ = "makers"

    user_id = Column(UUID(as_uuid=True), ForeignKey(
        "users.id"), nullable=False, unique=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)

    # Location
    location_lat = Column(Numeric(10, 8))
    location_lng = Column(Numeric(11, 8))
    location_address = Column(Text)

    # Ratings and stats
    rating = Column(Numeric(3, 2), default=0.0)
    total_prints = Column(Integer, default=0)

    # Status
    verified = Column(Boolean, default=False)
    available = Column(Boolean, default=True)

    # Relationships
    user = relationship("User", back_populates="maker_profile")
    printers = relationship(
        "Printer", back_populates="maker", cascade="all, delete-orphan")
    maker_orders = relationship(
        "Order", foreign_keys="Order.maker_id", back_populates="maker")

    def __repr__(self):
        return f"<Maker(id={self.id}, name={self.name}, verified={self.verified})>"
