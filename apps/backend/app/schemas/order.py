"""
Pydantic schemas for order-related operations.
"""
from typing import Dict, List, Optional
from decimal import Decimal
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum

from .pricing import PricingBreakdownResponse


class OrderStatus(str, Enum):
    """Order status enumeration."""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    PRINTING = "printing"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    DISPUTED = "disputed"


class OrderPriority(str, Enum):
    """Order priority enumeration."""
    STANDARD = "standard"
    RUSH = "rush"
    URGENT = "urgent"


class PrintSettings(BaseModel):
    """Print settings schema."""
    layer_height: float = Field(
        0.2, ge=0.1, le=0.4, description="Layer height in mm")
    infill_density: int = Field(
        20, ge=0, le=100, description="Infill density percentage")
    infill_pattern: str = Field("grid", description="Infill pattern")
    supports: bool = Field(False, description="Enable supports")
    bed_adhesion: str = Field("skirt", description="Bed adhesion type")
    material_type: str = Field("PLA", description="Material type")
    nozzle_temperature: int = Field(
        210, ge=180, le=300, description="Nozzle temperature")
    bed_temperature: int = Field(
        60, ge=0, le=120, description="Bed temperature")
    print_speed: int = Field(50, ge=10, le=200, description="Print speed mm/s")


class OrderCreate(BaseModel):
    """Schema for creating an order."""
    file_id: str = Field(..., description="File ID to print")
    analysis_id: str = Field(..., description="Analysis result ID")
    maker_id: str = Field(..., description="Selected maker ID")
    material_type: str = Field(..., description="Material type")
    quantity: int = Field(1, ge=1, le=1000, description="Quantity to print")
    print_settings: PrintSettings = Field(..., description="Print settings")
    delivery_address: str = Field(..., description="Delivery address")
    special_instructions: Optional[str] = Field(
        None, description="Special instructions")
    priority: OrderPriority = Field(
        OrderPriority.STANDARD, description="Order priority")
    discount_code: Optional[str] = Field(None, description="Discount code")


class OrderUpdate(BaseModel):
    """Schema for updating an order."""
    status: Optional[OrderStatus] = Field(None, description="Order status")
    delivery_address: Optional[str] = Field(
        None, description="Delivery address")
    special_instructions: Optional[str] = Field(
        None, description="Special instructions")
    tracking_number: Optional[str] = Field(
        None, description="Shipping tracking number")
    estimated_completion: Optional[datetime] = Field(
        None, description="Estimated completion date")


class OrderStatusUpdate(BaseModel):
    """Schema for status updates."""
    status: OrderStatus = Field(..., description="New order status")
    notes: Optional[str] = Field(None, description="Status update notes")
    estimated_completion: Optional[datetime] = Field(
        None, description="Updated completion estimate")


class OrderResponse(BaseModel):
    """Schema for order response."""
    id: str = Field(..., description="Order ID")
    customer_id: str = Field(..., description="Customer ID")
    maker_id: Optional[str] = Field(None, description="Maker ID")
    file_id: str = Field(..., description="File ID")
    analysis_id: Optional[str] = Field(None, description="Analysis ID")

    # Order details
    settings: Dict = Field(..., description="Print settings")
    pricing: Dict = Field(..., description="Pricing breakdown")
    quantity: int = Field(..., description="Quantity")

    # Status and delivery
    status: OrderStatus = Field(..., description="Order status")
    priority: str = Field(..., description="Order priority")
    delivery_address: Optional[str] = Field(
        None, description="Delivery address")
    special_instructions: Optional[str] = Field(
        None, description="Special instructions")
    tracking_number: Optional[str] = Field(None, description="Tracking number")

    # Timestamps
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    estimated_completion: Optional[datetime] = Field(
        None, description="Estimated completion")
    completed_at: Optional[datetime] = Field(
        None, description="Completion timestamp")

    # Relationships
    customer_name: Optional[str] = Field(None, description="Customer name")
    maker_name: Optional[str] = Field(None, description="Maker name")
    file_name: Optional[str] = Field(None, description="File name")

    class Config:
        from_attributes = True


class OrderSummary(BaseModel):
    """Schema for order summary (list view)."""
    id: str = Field(..., description="Order ID")
    status: OrderStatus = Field(..., description="Order status")
    total_price: Decimal = Field(..., description="Total price")
    quantity: int = Field(..., description="Quantity")
    created_at: datetime = Field(..., description="Creation timestamp")
    estimated_completion: Optional[datetime] = Field(
        None, description="Estimated completion")
    customer_name: Optional[str] = Field(None, description="Customer name")
    maker_name: Optional[str] = Field(None, description="Maker name")
    file_name: Optional[str] = Field(None, description="File name")

    class Config:
        from_attributes = True


class OrderHistory(BaseModel):
    """Schema for order history entry."""
    id: str = Field(..., description="History entry ID")
    order_id: str = Field(..., description="Order ID")
    status: OrderStatus = Field(..., description="Status")
    notes: Optional[str] = Field(None, description="Notes")
    created_at: datetime = Field(..., description="Timestamp")
    created_by: str = Field(..., description="User who made the change")

    class Config:
        from_attributes = True


class OrderSearchFilters(BaseModel):
    """Schema for order search filters."""
    status: Optional[List[OrderStatus]] = Field(
        None, description="Filter by status")
    customer_id: Optional[str] = Field(None, description="Filter by customer")
    maker_id: Optional[str] = Field(None, description="Filter by maker")
    date_from: Optional[datetime] = Field(None, description="Filter from date")
    date_to: Optional[datetime] = Field(None, description="Filter to date")
    min_price: Optional[Decimal] = Field(
        None, description="Minimum price filter")
    max_price: Optional[Decimal] = Field(
        None, description="Maximum price filter")
    priority: Optional[OrderPriority] = Field(
        None, description="Filter by priority")
    limit: int = Field(20, ge=1, le=100, description="Maximum results")
    offset: int = Field(0, ge=0, description="Results offset")


class OrderStats(BaseModel):
    """Schema for order statistics."""
    total_orders: int = Field(..., description="Total number of orders")
    pending_orders: int = Field(..., description="Pending orders")
    in_progress_orders: int = Field(..., description="In progress orders")
    completed_orders: int = Field(..., description="Completed orders")
    cancelled_orders: int = Field(..., description="Cancelled orders")
    total_revenue: Decimal = Field(..., description="Total revenue")
    average_order_value: Decimal = Field(...,
                                         description="Average order value")
    completion_rate: float = Field(...,
                                   description="Completion rate percentage")


class OrderAssignment(BaseModel):
    """Schema for order assignment."""
    order_id: str = Field(..., description="Order ID")
    maker_id: str = Field(..., description="Maker ID")
    estimated_completion: Optional[datetime] = Field(
        None, description="Estimated completion")
    notes: Optional[str] = Field(None, description="Assignment notes")


class OrderCancellation(BaseModel):
    """Schema for order cancellation."""
    reason: str = Field(..., description="Cancellation reason")
    refund_amount: Optional[Decimal] = Field(None, description="Refund amount")
    notes: Optional[str] = Field(None, description="Additional notes")


class OrderDispute(BaseModel):
    """Schema for order dispute."""
    reason: str = Field(..., description="Dispute reason")
    description: str = Field(..., description="Detailed description")
    evidence_files: Optional[List[str]] = Field(
        None, description="Evidence file IDs")


class OrderRating(BaseModel):
    """Schema for order rating."""
    rating: int = Field(..., ge=1, le=5, description="Rating (1-5 stars)")
    review: Optional[str] = Field(None, description="Review text")
    quality_rating: int = Field(..., ge=1, le=5,
                                description="Print quality rating")
    communication_rating: int = Field(..., ge=1,
                                      le=5, description="Communication rating")
    delivery_rating: int = Field(..., ge=1, le=5,
                                 description="Delivery rating")


class OrderNotification(BaseModel):
    """Schema for order notifications."""
    order_id: str = Field(..., description="Order ID")
    recipient_id: str = Field(..., description="Recipient user ID")
    type: str = Field(..., description="Notification type")
    title: str = Field(..., description="Notification title")
    message: str = Field(..., description="Notification message")
    read: bool = Field(False, description="Read status")
    created_at: datetime = Field(..., description="Creation timestamp")

    class Config:
        from_attributes = True
