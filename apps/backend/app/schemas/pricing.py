"""
Pydantic schemas for pricing-related operations.
"""
from typing import Dict, List, Optional
from decimal import Decimal
from pydantic import BaseModel, Field


class PricingRequest(BaseModel):
    """Schema for pricing calculation request."""
    analysis_id: str = Field(..., description="Analysis result ID")
    maker_id: str = Field(..., description="Maker ID")
    material_type: str = Field(...,
                               description="Material type (PLA, ABS, etc.)")
    quantity: int = Field(1, ge=1, le=1000, description="Quantity to print")
    rush_order: bool = Field(False, description="Rush order flag")


class PricingBreakdownResponse(BaseModel):
    """Schema for pricing breakdown response."""
    material_cost: Decimal = Field(..., description="Material cost")
    labor_cost: Decimal = Field(..., description="Labor cost")
    complexity_premium: Decimal = Field(..., description="Complexity premium")
    rush_premium: Decimal = Field(..., description="Rush order premium")
    quantity_discount: Decimal = Field(..., description="Quantity discount")
    platform_fee: Decimal = Field(..., description="Platform fee")
    subtotal: Decimal = Field(..., description="Subtotal before fees")
    total: Decimal = Field(..., description="Total cost")
    per_unit_cost: Decimal = Field(..., description="Cost per unit")
    estimated_delivery_days: int = Field(...,
                                         description="Estimated delivery time in days")
    breakdown_details: Dict = Field(...,
                                    description="Detailed breakdown information")
    applied_discount: Optional[Dict] = Field(
        None, description="Applied discount information")

    class Config:
        from_attributes = True


class MarketRatesResponse(BaseModel):
    """Schema for market rates response."""
    material_type: str = Field(..., description="Material type")
    min_price_per_gram: Decimal = Field(...,
                                        description="Minimum price per gram")
    max_price_per_gram: Decimal = Field(...,
                                        description="Maximum price per gram")
    avg_price_per_gram: Decimal = Field(...,
                                        description="Average price per gram")
    sample_size: int = Field(..., description="Number of samples")

    class Config:
        from_attributes = True


class MakerPriceComparisonResponse(BaseModel):
    """Schema for maker price comparison response."""
    maker_id: str = Field(..., description="Maker ID")
    maker_name: str = Field(..., description="Maker name")
    total_price: Decimal = Field(..., description="Total price")
    per_unit_price: Decimal = Field(..., description="Price per unit")
    estimated_delivery_days: int = Field(...,
                                         description="Estimated delivery days")
    rating: Decimal = Field(..., description="Maker rating")
    total_prints: int = Field(..., description="Total completed prints")
    verified: bool = Field(..., description="Maker verification status")
    available: bool = Field(..., description="Maker availability")
    pricing_breakdown: PricingBreakdownResponse = Field(
        ..., description="Detailed pricing breakdown")

    class Config:
        from_attributes = True


class PriceComparisonRequest(BaseModel):
    """Schema for price comparison request."""
    analysis_id: str = Field(..., description="Analysis result ID")
    material_type: str = Field(..., description="Material type")
    quantity: int = Field(1, ge=1, le=1000, description="Quantity")
    location_lat: Optional[float] = Field(
        None, ge=-90, le=90, description="Search center latitude")
    location_lng: Optional[float] = Field(
        None, ge=-180, le=180, description="Search center longitude")
    radius_km: Optional[float] = Field(
        50, gt=0, le=1000, description="Search radius in km")
    max_results: int = Field(10, ge=1, le=50, description="Maximum results")


class QuoteRequest(BaseModel):
    """Schema for detailed quote request."""
    analysis_id: str = Field(..., description="Analysis result ID")
    maker_id: str = Field(..., description="Maker ID")
    material_type: str = Field(..., description="Material type")
    quantity: int = Field(1, ge=1, le=1000, description="Quantity")
    rush_order: bool = Field(False, description="Rush order")
    discount_code: Optional[str] = Field(None, description="Discount code")
    shipping_address: Optional[str] = Field(
        None, description="Shipping address")
    special_instructions: Optional[str] = Field(
        None, description="Special instructions")


class QuoteResponse(BaseModel):
    """Schema for detailed quote response."""
    quote_id: str = Field(..., description="Quote ID")
    analysis_id: str = Field(..., description="Analysis result ID")
    maker_id: str = Field(..., description="Maker ID")
    maker_name: str = Field(..., description="Maker name")
    pricing: PricingBreakdownResponse = Field(...,
                                              description="Pricing breakdown")
    material_info: Dict = Field(..., description="Material information")
    print_settings: Dict = Field(..., description="Print settings")
    estimated_completion_date: str = Field(...,
                                           description="Estimated completion date")
    valid_until: str = Field(..., description="Quote validity date")
    terms_and_conditions: str = Field(..., description="Terms and conditions")

    class Config:
        from_attributes = True


class DiscountCodeRequest(BaseModel):
    """Schema for applying discount code."""
    quote_id: str = Field(..., description="Quote ID")
    discount_code: str = Field(..., description="Discount code")


class PricingConfigResponse(BaseModel):
    """Schema for pricing configuration response."""
    base_labor_rate: Decimal = Field(..., description="Base hourly labor rate")
    platform_fee_percentage: Decimal = Field(...,
                                             description="Platform fee percentage")
    complexity_multipliers: Dict[str,
                                 Decimal] = Field(..., description="Complexity multipliers")
    quantity_discount_tiers: List[Dict] = Field(
        ..., description="Quantity discount tiers")
    rush_order_premium: Decimal = Field(...,
                                        description="Rush order premium percentage")

    class Config:
        from_attributes = True


class PricingUpdateRequest(BaseModel):
    """Schema for real-time pricing updates."""
    session_id: str = Field(..., description="Pricing session ID")
    analysis_id: str = Field(..., description="Analysis result ID")
    material_type: Optional[str] = Field(
        None, description="Updated material type")
    quantity: Optional[int] = Field(
        None, ge=1, le=1000, description="Updated quantity")
    rush_order: Optional[bool] = Field(
        None, description="Updated rush order flag")


class PricingSessionResponse(BaseModel):
    """Schema for pricing session response."""
    session_id: str = Field(..., description="Pricing session ID")
    analysis_id: str = Field(..., description="Analysis result ID")
    current_pricing: PricingBreakdownResponse = Field(
        ..., description="Current pricing")
    available_materials: List[str] = Field(...,
                                           description="Available material types")
    maker_options: List[MakerPriceComparisonResponse] = Field(
        ..., description="Available makers")
    expires_at: str = Field(..., description="Session expiration time")

    class Config:
        from_attributes = True
