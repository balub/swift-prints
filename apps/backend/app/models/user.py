"""
User model for authentication and user management.
"""
from sqlalchemy import Column, String, Enum as SQLEnum
from sqlalchemy.orm import relationship
from enum import Enum

from .base import BaseModel


class UserRole(str, Enum):
    """User role enumeration."""
    CUSTOMER = "customer"
    MAKER = "maker"
    ADMIN = "admin"


class User(BaseModel):
    """User model synced with Supabase Auth."""

    __tablename__ = "users"

    email = Column(String(255), unique=True, nullable=False, index=True)
    role = Column(SQLEnum(UserRole), default=UserRole.CUSTOMER, nullable=False)

    # Relationships
    maker_profile = relationship("Maker", back_populates="user", uselist=False)
    files = relationship("File", back_populates="user")
    customer_orders = relationship(
        "Order", foreign_keys="Order.customer_id", back_populates="customer")

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"
