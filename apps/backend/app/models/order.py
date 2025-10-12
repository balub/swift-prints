"""
Order model for 3D printing orders.
"""
from sqlalchemy import Column, String, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from enum import Enum

from .base import BaseModel


class OrderStatus(str, Enum):
    """Order status enumeration."""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    DISPUTED = "disputed"


class Order(BaseModel):
    """3D printing order."""

    __tablename__ = "orders"

    # Participants
    customer_id = Column(UUID(as_uuid=True),
                         ForeignKey("users.id"), nullable=False)
    maker_id = Column(UUID(as_uuid=True), ForeignKey("makers.id"))

    # Order content
    file_id = Column(UUID(as_uuid=True), ForeignKey(
        "files.id"), nullable=False)
    analysis_id = Column(UUID(as_uuid=True), ForeignKey("analysis_results.id"))

    # Order details (stored as JSON)
    settings = Column(JSONB)  # Print settings
    pricing = Column(JSONB)   # Pricing breakdown

    # Status and delivery
    status = Column(SQLEnum(OrderStatus),
                    default=OrderStatus.PENDING, nullable=False)
    delivery_address = Column(Text)
    special_instructions = Column(Text)

    # Relationships
    customer = relationship("User", foreign_keys=[
                            customer_id], back_populates="customer_orders")
    maker = relationship("Maker", foreign_keys=[
                         maker_id], back_populates="maker_orders")
    file = relationship("File", back_populates="orders")
    analysis = relationship("AnalysisResult", back_populates="orders")

    @property
    def total_price(self):
        """Get total price from pricing JSON."""
        if self.pricing and isinstance(self.pricing, dict):
            return self.pricing.get("total", 0)
        return 0

    @property
    def is_active(self):
        """Check if order is in an active state."""
        return self.status in [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.IN_PROGRESS]

    def __repr__(self):
        return f"<Order(id={self.id}, status={self.status}, total=${self.total_price})>"
