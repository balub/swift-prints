"""
Pricing API endpoints.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
import redis
from datetime import datetime, timedelta
import uuid

from ..core.database import get_db
from ..core.auth_middleware import get_current_user
from ..core.config import settings
from ..models.user import User
from ..models.analysis import AnalysisResult
from ..models.maker import Maker
from ..services.pricing_service import PricingService
from ..services.maker_service import MakerService
from ..schemas.pricing import (
    PricingRequest, PricingBreakdownResponse, MarketRatesResponse,
    PriceComparisonRequest, MakerPriceComparisonResponse,
    QuoteRequest, QuoteResponse, DiscountCodeRequest,
    PricingConfigResponse, PricingUpdateRequest, PricingSessionResponse
)
from ..schemas.maker import MakerSearchFilters

router = APIRouter(prefix="/api/pricing", tags=["pricing"])


def get_pricing_service(db: Session = Depends(get_db)) -> PricingService:
    """Dependency to get pricing service."""
    redis_client = redis.Redis.from_url(settings.redis_url)
    return PricingService(db, redis_client)


def get_maker_service(db: Session = Depends(get_db)) -> MakerService:
    """Dependency to get maker service."""
    return MakerService(db)


@router.post("/calculate", response_model=PricingBreakdownResponse)
def calculate_pricing(
    request: PricingRequest,
    current_user: User = Depends(get_current_user),
    pricing_service: PricingService = Depends(get_pricing_service),
    db: Session = Depends(get_db)
):
    """Calculate pricing for a specific maker and analysis result."""

    # Get analysis result
    analysis = db.query(AnalysisResult).filter(
        AnalysisResult.id == request.analysis_id
    ).first()

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis result not found"
        )

    # Verify user owns the analysis (through file ownership)
    if analysis.file.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this analysis"
        )

    # Get maker
    maker = db.query(Maker).filter(Maker.id == request.maker_id).first()
    if not maker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maker not found"
        )

    # Calculate pricing
    pricing = pricing_service.calculate_price(
        analysis, maker, request.material_type, request.quantity, request.rush_order
    )

    return PricingBreakdownResponse(**pricing.dict())


@router.get("/rates", response_model=MarketRatesResponse)
def get_market_rates(
    material_type: str = Query(..., description="Material type"),
    location_lat: float = Query(..., description="Location latitude"),
    location_lng: float = Query(..., description="Location longitude"),
    pricing_service: PricingService = Depends(get_pricing_service)
):
    """Get current market rates for a material type in a location."""

    rates = pricing_service.get_market_rates(
        material_type, location_lat, location_lng)
    return MarketRatesResponse(**rates.dict())


@router.post("/compare", response_model=List[MakerPriceComparisonResponse])
def compare_prices(
    request: PriceComparisonRequest,
    current_user: User = Depends(get_current_user),
    pricing_service: PricingService = Depends(get_pricing_service),
    maker_service: MakerService = Depends(get_maker_service),
    db: Session = Depends(get_db)
):
    """Compare prices across multiple makers for a print job."""

    # Get analysis result
    analysis = db.query(AnalysisResult).filter(
        AnalysisResult.id == request.analysis_id
    ).first()

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis result not found"
        )

    # Verify user owns the analysis
    if analysis.file.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this analysis"
        )

    # Search for makers
    search_filters = MakerSearchFilters(
        location_lat=request.location_lat,
        location_lng=request.location_lng,
        radius_km=request.radius_km,
        material_types=[request.material_type],
        available_only=True,
        limit=request.max_results,
        offset=0
    )

    makers, _ = maker_service.search_makers(search_filters)

    # Compare prices
    comparisons = pricing_service.compare_prices(
        analysis, makers, request.material_type, request.quantity
    )

    return [MakerPriceComparisonResponse(**comp.dict()) for comp in comparisons]


@router.post("/quote", response_model=QuoteResponse)
def generate_quote(
    request: QuoteRequest,
    current_user: User = Depends(get_current_user),
    pricing_service: PricingService = Depends(get_pricing_service),
    db: Session = Depends(get_db)
):
    """Generate a detailed quote for a print job."""

    # Get analysis result
    analysis = db.query(AnalysisResult).filter(
        AnalysisResult.id == request.analysis_id
    ).first()

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis result not found"
        )

    # Verify user owns the analysis
    if analysis.file.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this analysis"
        )

    # Get maker
    maker = db.query(Maker).filter(Maker.id == request.maker_id).first()
    if not maker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maker not found"
        )

    # Calculate pricing
    pricing = pricing_service.calculate_price(
        analysis, maker, request.material_type, request.quantity, request.rush_order
    )

    # Apply discount if provided
    if request.discount_code:
        try:
            pricing = pricing_service.apply_discount_code(
                pricing, request.discount_code, str(current_user.id)
            )
        except HTTPException:
            # Continue without discount if invalid
            pass

    # Generate quote
    quote_id = str(uuid.uuid4())
    completion_date = datetime.now() + timedelta(days=pricing.estimated_delivery_days)
    valid_until = datetime.now() + timedelta(days=7)  # Quote valid for 7 days

    # Get material info
    material = pricing_service._get_material_for_maker(
        maker, request.material_type)
    material_info = {
        "type": material.type,
        "brand": material.brand,
        "color_name": material.color_name,
        "color_hex": material.color_hex,
        "price_per_gram": float(material.price_per_gram)
    } if material else {}

    quote = QuoteResponse(
        quote_id=quote_id,
        analysis_id=request.analysis_id,
        maker_id=request.maker_id,
        maker_name=maker.name,
        pricing=PricingBreakdownResponse(**pricing.dict()),
        material_info=material_info,
        print_settings=analysis.settings or {},
        estimated_completion_date=completion_date.isoformat(),
        valid_until=valid_until.isoformat(),
        terms_and_conditions="Standard terms and conditions apply. Payment due upon order confirmation."
    )

    # Cache the quote for later retrieval
    cache_key = f"quote:{quote_id}"
    pricing_service._set_cache(
        cache_key, quote.dict(), 7 * 24 * 3600)  # 7 days

    return quote


@router.post("/apply-discount")
def apply_discount_code(
    request: DiscountCodeRequest,
    current_user: User = Depends(get_current_user),
    pricing_service: PricingService = Depends(get_pricing_service)
):
    """Apply a discount code to an existing quote."""

    # Get quote from cache
    cache_key = f"quote:{request.quote_id}"
    quote_data = pricing_service._get_from_cache(cache_key)

    if not quote_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote not found or expired"
        )

    # Reconstruct pricing from quote
    pricing_data = quote_data["pricing"]
    pricing = pricing_service.PricingBreakdown(**pricing_data)

    # Apply discount
    updated_pricing = pricing_service.apply_discount_code(
        pricing, request.discount_code, str(current_user.id)
    )

    # Update quote in cache
    quote_data["pricing"] = updated_pricing.dict()
    pricing_service._set_cache(cache_key, quote_data, 7 * 24 * 3600)

    return {
        "message": "Discount applied successfully",
        "updated_pricing": PricingBreakdownResponse(**updated_pricing.dict())
    }


@router.get("/config", response_model=PricingConfigResponse)
def get_pricing_config(
    pricing_service: PricingService = Depends(get_pricing_service)
):
    """Get current pricing configuration."""

    return PricingConfigResponse(
        base_labor_rate=pricing_service.base_labor_rate,
        platform_fee_percentage=pricing_service.platform_fee_percentage,
        complexity_multipliers=pricing_service.complexity_multipliers,
        quantity_discount_tiers=[
            {"min_quantity": 10, "discount": 0.05},
            {"min_quantity": 50, "discount": 0.10},
            {"min_quantity": 100, "discount": 0.15}
        ],
        rush_order_premium=0.25
    )


@router.post("/session", response_model=PricingSessionResponse)
def create_pricing_session(
    analysis_id: str,
    current_user: User = Depends(get_current_user),
    pricing_service: PricingService = Depends(get_pricing_service),
    maker_service: MakerService = Depends(get_maker_service),
    db: Session = Depends(get_db)
):
    """Create a pricing session for real-time updates."""

    # Get analysis result
    analysis = db.query(AnalysisResult).filter(
        AnalysisResult.id == analysis_id
    ).first()

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis result not found"
        )

    # Verify user owns the analysis
    if analysis.file.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this analysis"
        )

    # Create session
    session_id = str(uuid.uuid4())
    expires_at = datetime.now() + timedelta(hours=1)  # Session expires in 1 hour

    # Get available materials and makers (simplified)
    search_filters = MakerSearchFilters(
        available_only=True,
        limit=10,
        offset=0
    )
    makers, _ = maker_service.search_makers(search_filters)

    # Get available material types
    available_materials = list(set(
        material.type
        for maker in makers
        for printer in maker.printers
        for material in printer.materials
        if material.available
    ))

    # Calculate initial pricing with first available maker and material
    initial_pricing = None
    maker_options = []

    if makers and available_materials:
        first_maker = makers[0]
        first_material = available_materials[0]

        try:
            initial_pricing = pricing_service.calculate_price(
                analysis, first_maker, first_material, 1, False
            )

            # Get price comparisons
            comparisons = pricing_service.compare_prices(
                analysis, makers[:5], first_material, 1
            )
            maker_options = [MakerPriceComparisonResponse(
                **comp.dict()) for comp in comparisons]

        except Exception:
            pass

    session_data = {
        "session_id": session_id,
        "analysis_id": analysis_id,
        "user_id": str(current_user.id),
        "expires_at": expires_at.isoformat(),
        "available_materials": available_materials,
        "maker_options": [opt.dict() for opt in maker_options]
    }

    # Cache session data
    cache_key = f"pricing_session:{session_id}"
    pricing_service._set_cache(cache_key, session_data, 3600)  # 1 hour

    return PricingSessionResponse(
        session_id=session_id,
        analysis_id=analysis_id,
        current_pricing=PricingBreakdownResponse(
            **initial_pricing.dict()) if initial_pricing else None,
        available_materials=available_materials,
        maker_options=maker_options,
        expires_at=expires_at.isoformat()
    )


@router.put("/session/{session_id}", response_model=PricingBreakdownResponse)
def update_pricing_session(
    session_id: str,
    request: PricingUpdateRequest,
    current_user: User = Depends(get_current_user),
    pricing_service: PricingService = Depends(get_pricing_service),
    db: Session = Depends(get_db)
):
    """Update pricing session with new parameters."""

    # Get session from cache
    cache_key = f"pricing_session:{session_id}"
    session_data = pricing_service._get_from_cache(cache_key)

    if not session_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pricing session not found or expired"
        )

    # Verify session ownership
    if session_data["user_id"] != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this session"
        )

    # Get analysis result
    analysis = db.query(AnalysisResult).filter(
        AnalysisResult.id == session_data["analysis_id"]
    ).first()

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis result not found"
        )

    # Use updated parameters or defaults
    material_type = request.material_type or session_data["available_materials"][0]
    quantity = request.quantity or 1
    rush_order = request.rush_order or False

    # Get first available maker for pricing
    maker_options = session_data.get("maker_options", [])
    if not maker_options:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No makers available for pricing"
        )

    maker = db.query(Maker).filter(
        Maker.id == maker_options[0]["maker_id"]).first()
    if not maker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maker not found"
        )

    # Calculate updated pricing
    pricing = pricing_service.calculate_price(
        analysis, maker, material_type, quantity, rush_order
    )

    return PricingBreakdownResponse(**pricing.dict())


@router.get("/quote/{quote_id}", response_model=QuoteResponse)
def get_quote(
    quote_id: str,
    current_user: User = Depends(get_current_user),
    pricing_service: PricingService = Depends(get_pricing_service)
):
    """Retrieve a previously generated quote."""

    cache_key = f"quote:{quote_id}"
    quote_data = pricing_service._get_from_cache(cache_key)

    if not quote_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote not found or expired"
        )

    return QuoteResponse(**quote_data)
