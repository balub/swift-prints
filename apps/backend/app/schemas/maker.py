"""
Pydantic schemas for maker-related operations.
"""
from typing import List, Optional
from decimal import Decimal
from pydantic import BaseModel, Field, validator
from datetime import datetime

from .auth import UserResponse


class LocationBase(BaseModel):
    """Base location schema."""
    lat: Optional[float] = Field(None, ge=-90, le=90, description="Latitude")
    lng: Optional[float] = Field(
        None, ge=-180, le=180, description="Longitude")
    address: Optional[str] = Field(None, max_length=500, description="Address")


class PrinterBase(BaseModel):
    """Base printer schema."""
    name: str = Field(..., max_length=255, description="Printer name")
    model: Optional[str] = Field(
        None, max_length=255, description="Printer model")
    build_volume_x: Optional[int] = Field(
        None, gt=0, description="Build volume X (mm)")
    build_volume_y: Optional[int] = Field(
        None, gt=0, description="Build volume Y (mm)")
    build_volume_z: Optional[int] = Field(
        None, gt=0, description="Build volume Z (mm)")
    hourly_rate: Optional[Decimal] = Field(
        None, ge=0, description="Hourly rate")
    active: bool = Field(True, description="Printer active status")


class PrinterCreate(PrinterBase):
    """Schema for creating a printer."""
    pass


class PrinterUpdate(BaseModel):
    """Schema for updating a printer."""
    name: Optional[str] = Field(None, max_length=255)
    model: Optional[str] = Field(None, max_length=255)
    build_volume_x: Optional[int] = Field(None, gt=0)
    build_volume_y: Optional[int] = Field(None, gt=0)
    build_volume_z: Optional[int] = Field(None, gt=0)
    hourly_rate: Optional[Decimal] = Field(None, ge=0)
    active: Optional[bool] = None


class MaterialBase(BaseModel):
    """Base material schema."""
    type: str = Field(..., max_length=50,
                      description="Material type (PLA, ABS, etc.)")
    brand: Optional[str] = Field(
        None, max_length=100, description="Material brand")
    color_name: Optional[str] = Field(
        None, max_length=100, description="Color name")
    color_hex: Optional[str] = Field(
        None, regex=r"^#[0-9A-Fa-f]{6}$", description="Hex color code")
    price_per_gram: Decimal = Field(..., ge=0, description="Price per gram")
    stock_grams: int = Field(0, ge=0, description="Stock in grams")
    available: bool = Field(True, description="Material availability")


class MaterialCreate(MaterialBase):
    """Schema for creating a material."""
    pass


class MaterialUpdate(BaseModel):
    """Schema for updating a material."""
    type: Optional[str] = Field(None, max_length=50)
    brand: Optional[str] = Field(None, max_length=100)
    color_name: Optional[str] = Field(None, max_length=100)
    color_hex: Optional[str] = Field(None, regex=r"^#[0-9A-Fa-f]{6}$")
    price_per_gram: Optional[Decimal] = Field(None, ge=0)
    stock_grams: Optional[int] = Field(None, ge=0)
    available: Optional[bool] = None


class MaterialResponse(MaterialBase):
    """Schema for material response."""
    id: str
    printer_id: str
    is_in_stock: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PrinterResponse(PrinterBase):
    """Schema for printer response."""
    id: str
    maker_id: str
    build_volume_mm3: Optional[int]
    materials: List[MaterialResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MakerBase(BaseModel):
    """Base maker schema."""
    name: str = Field(..., max_length=255, description="Maker name")
    description: Optional[str] = Field(None, description="Maker description")
    location_lat: Optional[float] = Field(
        None, ge=-90, le=90, description="Latitude")
    location_lng: Optional[float] = Field(
        None, ge=-180, le=180, description="Longitude")
    location_address: Optional[str] = Field(None, description="Address")


class MakerCreate(MakerBase):
    """Schema for creating a maker profile."""
    pass


class MakerUpdate(BaseModel):
    """Schema for updating a maker profile."""
    name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    location_lat: Optional[float] = Field(None, ge=-90, le=90)
    location_lng: Optional[float] = Field(None, ge=-180, le=180)
    location_address: Optional[str] = None
    available: Optional[bool] = None


class MakerResponse(MakerBase):
    """Schema for maker response."""
    id: str
    user_id: str
    rating: Decimal
    total_prints: int
    verified: bool
    available: bool
    printers: List[PrinterResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MakerPublicResponse(BaseModel):
    """Schema for public maker information (for search results)."""
    id: str
    name: str
    description: Optional[str]
    location_lat: Optional[float]
    location_lng: Optional[float]
    location_address: Optional[str]
    rating: Decimal
    total_prints: int
    verified: bool
    available: bool
    printer_count: int
    material_types: List[str]

    class Config:
        from_attributes = True


class MakerSearchFilters(BaseModel):
    """Schema for maker search filters."""
    location_lat: Optional[float] = Field(None, ge=-90, le=90)
    location_lng: Optional[float] = Field(None, ge=-180, le=180)
    radius_km: Optional[float] = Field(
        None, gt=0, le=1000, description="Search radius in kilometers")
    material_types: Optional[List[str]] = Field(
        None, description="Required material types")
    min_rating: Optional[float] = Field(
        None, ge=0, le=5, description="Minimum rating")
    verified_only: Optional[bool] = Field(
        False, description="Only verified makers")
    available_only: Optional[bool] = Field(
        True, description="Only available makers")
    limit: int = Field(20, ge=1, le=100, description="Maximum results")
    offset: int = Field(0, ge=0, description="Results offset")


class CapacityInfo(BaseModel):
    """Schema for maker capacity information."""
    total_printers: int
    active_printers: int
    total_materials: int
    available_materials: int
    current_orders: int
    estimated_capacity: str  # "low", "medium", "high"


class MakerStats(BaseModel):
    """Schema for maker statistics."""
    total_orders: int
    completed_orders: int
    average_rating: Decimal
    total_revenue: Decimal
    completion_rate: float
    average_delivery_time: Optional[float]  # in days


class MakerVerificationRequest(BaseModel):
    """Schema for maker verification request."""
    business_license: Optional[str] = Field(
        None, description="Business license number")
    tax_id: Optional[str] = Field(None, description="Tax ID")
    portfolio_images: Optional[List[str]] = Field(
        None, description="Portfolio image URLs")
    additional_info: Optional[str] = Field(
        None, description="Additional verification info")
