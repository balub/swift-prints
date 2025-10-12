"""
Pricing service for calculating real-time print job pricing.
"""
from typing import Dict, List, Optional, Tuple
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timedelta
import json
import redis
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from ..models.maker import Maker
from ..models.printer import Printer
from ..models.material import Material
from ..models.analysis import AnalysisResult
from ..core.config import settings


class PricingService:
    """Service for calculating real-time pricing."""

    def __init__(self, db: Session, redis_client: Optional[redis.Redis] = None):
        self.db = db
        self.redis_client = redis_client or redis.Redis.from_url(
            settings.redis_url)

        # Pricing configuration
        self.base_labor_rate = Decimal("15.00")  # Base hourly rate
        self.platform_fee_percentage = Decimal("0.10")  # 10% platform fee
        self.complexity_multipliers = {
            "low": Decimal("1.0"),
            "medium": Decimal("1.2"),
            "high": Decimal("1.5"),
            "extreme": Decimal("2.0")
        }

        # Cache TTL in seconds
        self.cache_ttl = 300  # 5 minutes

    def calculate_price(
        self,
        analysis_result: AnalysisResult,
        maker: Maker,
        material_type: str,
        quantity: int = 1,
        rush_order: bool = False
    ) -> "PricingBreakdown":
        """Calculate comprehensive pricing for a print job."""

        # Get material pricing
        material = self._get_material_for_maker(maker, material_type)
        if not material:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Material type {material_type} not available from this maker"
            )

        # Calculate base costs
        material_cost = self._calculate_material_cost(
            analysis_result, material, quantity)
        labor_cost = self._calculate_labor_cost(
            analysis_result, maker, quantity)

        # Apply complexity premium
        complexity_premium = self._calculate_complexity_premium(
            analysis_result, labor_cost + material_cost
        )

        # Calculate subtotal
        subtotal = material_cost + labor_cost + complexity_premium

        # Apply rush order premium
        rush_premium = Decimal("0")
        if rush_order:
            rush_premium = subtotal * Decimal("0.25")  # 25% rush premium

        # Apply quantity discounts
        quantity_discount = self._calculate_quantity_discount(
            subtotal, quantity)

        # Calculate platform fee
        adjusted_subtotal = subtotal + rush_premium - quantity_discount
        platform_fee = adjusted_subtotal * self.platform_fee_percentage

        # Calculate total
        total = adjusted_subtotal + platform_fee

        return PricingBreakdown(
            material_cost=material_cost,
            labor_cost=labor_cost,
            complexity_premium=complexity_premium,
            rush_premium=rush_premium,
            quantity_discount=quantity_discount,
            platform_fee=platform_fee,
            subtotal=subtotal,
            total=total,
            per_unit_cost=total / quantity if quantity > 0 else total,
            estimated_delivery_days=self._estimate_delivery_time(
                analysis_result, maker, quantity, rush_order
            ),
            breakdown_details={
                "material_type": material_type,
                "material_brand": material.brand,
                "material_color": material.color_name,
                "print_time_hours": float(analysis_result.print_time_hours),
                "filament_grams": float(analysis_result.filament_grams),
                "complexity_score": float(analysis_result.complexity_score),
                "maker_hourly_rate": float(self._get_maker_hourly_rate(maker)),
                "quantity": quantity,
                "rush_order": rush_order
            }
        )

    def get_market_rates(self, material_type: str, location_lat: float, location_lng: float) -> "MarketRates":
        """Get current market rates for a material type in a location."""
        cache_key = f"market_rates:{material_type}:{location_lat:.2f}:{location_lng:.2f}"

        # Try to get from cache
        cached_rates = self._get_from_cache(cache_key)
        if cached_rates:
            return MarketRates(**cached_rates)

        # Calculate market rates from database
        rates = self._calculate_market_rates(
            material_type, location_lat, location_lng)

        # Cache the results
        self._set_cache(cache_key, rates.dict(), self.cache_ttl)

        return rates

    def compare_prices(
        self,
        analysis_result: AnalysisResult,
        makers: List[Maker],
        material_type: str,
        quantity: int = 1
    ) -> List["MakerPriceComparison"]:
        """Compare prices across multiple makers."""
        comparisons = []

        for maker in makers:
            try:
                pricing = self.calculate_price(
                    analysis_result, maker, material_type, quantity
                )

                comparison = MakerPriceComparison(
                    maker_id=str(maker.id),
                    maker_name=maker.name,
                    total_price=pricing.total,
                    per_unit_price=pricing.per_unit_cost,
                    estimated_delivery_days=pricing.estimated_delivery_days,
                    rating=maker.rating,
                    total_prints=maker.total_prints,
                    verified=maker.verified,
                    available=maker.available,
                    pricing_breakdown=pricing
                )
                comparisons.append(comparison)

            except Exception as e:
                # Skip makers that can't fulfill the order
                continue

        # Sort by total price
        comparisons.sort(key=lambda x: x.total_price)

        return comparisons

    def apply_discount_code(
        self,
        pricing: "PricingBreakdown",
        discount_code: str,
        user_id: str
    ) -> "PricingBreakdown":
        """Apply a discount code to pricing."""
        discount = self._validate_discount_code(discount_code, user_id)
        if not discount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired discount code"
            )

        # Calculate discount amount
        if discount["type"] == "percentage":
            discount_amount = pricing.subtotal * \
                (Decimal(str(discount["value"])) / 100)
        else:  # fixed amount
            discount_amount = Decimal(str(discount["value"]))

        # Apply discount
        new_total = max(pricing.total - discount_amount, Decimal("0"))

        return PricingBreakdown(
            material_cost=pricing.material_cost,
            labor_cost=pricing.labor_cost,
            complexity_premium=pricing.complexity_premium,
            rush_premium=pricing.rush_premium,
            quantity_discount=pricing.quantity_discount + discount_amount,
            platform_fee=pricing.platform_fee,
            subtotal=pricing.subtotal,
            total=new_total,
            per_unit_cost=new_total /
            (pricing.breakdown_details.get("quantity", 1)),
            estimated_delivery_days=pricing.estimated_delivery_days,
            breakdown_details=pricing.breakdown_details,
            applied_discount={
                "code": discount_code,
                "type": discount["type"],
                "value": discount["value"],
                "amount": float(discount_amount)
            }
        )

    def _calculate_material_cost(
        self,
        analysis_result: AnalysisResult,
        material: Material,
        quantity: int
    ) -> Decimal:
        """Calculate material cost based on filament usage."""
        total_grams = analysis_result.filament_grams * quantity
        return material.price_per_gram * total_grams

    def _calculate_labor_cost(
        self,
        analysis_result: AnalysisResult,
        maker: Maker,
        quantity: int
    ) -> Decimal:
        """Calculate labor cost based on print time and maker rates."""
        total_hours = analysis_result.print_time_hours * quantity
        hourly_rate = self._get_maker_hourly_rate(maker)
        return hourly_rate * total_hours

    def _calculate_complexity_premium(
        self,
        analysis_result: AnalysisResult,
        base_cost: Decimal
    ) -> Decimal:
        """Calculate complexity premium based on analysis results."""
        complexity_score = analysis_result.complexity_score

        if complexity_score <= 2.0:
            multiplier = self.complexity_multipliers["low"]
        elif complexity_score <= 4.0:
            multiplier = self.complexity_multipliers["medium"]
        elif complexity_score <= 6.0:
            multiplier = self.complexity_multipliers["high"]
        else:
            multiplier = self.complexity_multipliers["extreme"]

        # Premium is the additional cost above base
        return base_cost * (multiplier - Decimal("1.0"))

    def _calculate_quantity_discount(self, subtotal: Decimal, quantity: int) -> Decimal:
        """Calculate quantity discounts."""
        if quantity >= 100:
            return subtotal * Decimal("0.15")  # 15% discount
        elif quantity >= 50:
            return subtotal * Decimal("0.10")  # 10% discount
        elif quantity >= 10:
            return subtotal * Decimal("0.05")  # 5% discount
        else:
            return Decimal("0")

    def _get_maker_hourly_rate(self, maker: Maker) -> Decimal:
        """Get effective hourly rate for a maker."""
        # Use average of printer hourly rates, or base rate if none set
        printer_rates = [
            p.hourly_rate for p in maker.printers
            if p.active and p.hourly_rate is not None
        ]

        if printer_rates:
            avg_rate = sum(printer_rates) / len(printer_rates)
            return avg_rate
        else:
            # Apply maker rating multiplier to base rate
            rating_multiplier = Decimal(
                "1.0") + (maker.rating - Decimal("3.0")) * Decimal("0.1")
            return self.base_labor_rate * rating_multiplier

    def _get_material_for_maker(self, maker: Maker, material_type: str) -> Optional[Material]:
        """Find available material of specified type for maker."""
        for printer in maker.printers:
            if not printer.active:
                continue
            for material in printer.materials:
                if (material.type.lower() == material_type.lower() and
                        material.available and material.stock_grams > 0):
                    return material
        return None

    def _estimate_delivery_time(
        self,
        analysis_result: AnalysisResult,
        maker: Maker,
        quantity: int,
        rush_order: bool
    ) -> int:
        """Estimate delivery time in days."""
        # Base print time
        total_print_hours = analysis_result.print_time_hours * quantity

        # Assume 8 hours of printing per day
        print_days = int(
            (total_print_hours / 8).quantize(Decimal('1'), rounding=ROUND_HALF_UP))

        # Add processing and shipping time
        processing_days = 1 if rush_order else 2
        shipping_days = 2

        # Factor in maker capacity (simplified)
        capacity_multiplier = 1.0
        if hasattr(maker, 'current_orders'):
            if maker.current_orders > len(maker.printers) * 2:
                capacity_multiplier = 1.5

        total_days = int((print_days + processing_days +
                         shipping_days) * capacity_multiplier)

        return max(total_days, 1)  # Minimum 1 day

    def _calculate_market_rates(
        self,
        material_type: str,
        location_lat: float,
        location_lng: float
    ) -> "MarketRates":
        """Calculate market rates from database."""
        # Query materials within radius
        materials = self.db.query(Material).join(Material.printer).join(Printer.maker).filter(
            Material.type.ilike(f"%{material_type}%"),
            Material.available == True,
            Material.stock_grams > 0,
            Maker.available == True
        ).all()

        if not materials:
            return MarketRates(
                material_type=material_type,
                min_price_per_gram=Decimal("0"),
                max_price_per_gram=Decimal("0"),
                avg_price_per_gram=Decimal("0"),
                sample_size=0
            )

        prices = [m.price_per_gram for m in materials]

        return MarketRates(
            material_type=material_type,
            min_price_per_gram=min(prices),
            max_price_per_gram=max(prices),
            avg_price_per_gram=sum(prices) / len(prices),
            sample_size=len(prices)
        )

    def _validate_discount_code(self, code: str, user_id: str) -> Optional[Dict]:
        """Validate discount code (placeholder implementation)."""
        # This would typically check a database table
        # For now, return a sample discount for testing
        if code.upper() == "WELCOME10":
            return {
                "type": "percentage",
                "value": 10,
                "expires_at": datetime.now() + timedelta(days=30)
            }
        return None

    def _get_from_cache(self, key: str) -> Optional[Dict]:
        """Get data from Redis cache."""
        try:
            data = self.redis_client.get(key)
            if data:
                return json.loads(data)
        except Exception:
            pass
        return None

    def _set_cache(self, key: str, data: Dict, ttl: int):
        """Set data in Redis cache."""
        try:
            self.redis_client.setex(key, ttl, json.dumps(data, default=str))
        except Exception:
            pass


class PricingBreakdown:
    """Pricing breakdown data class."""

    def __init__(
        self,
        material_cost: Decimal,
        labor_cost: Decimal,
        complexity_premium: Decimal,
        rush_premium: Decimal,
        quantity_discount: Decimal,
        platform_fee: Decimal,
        subtotal: Decimal,
        total: Decimal,
        per_unit_cost: Decimal,
        estimated_delivery_days: int,
        breakdown_details: Dict,
        applied_discount: Optional[Dict] = None
    ):
        self.material_cost = material_cost
        self.labor_cost = labor_cost
        self.complexity_premium = complexity_premium
        self.rush_premium = rush_premium
        self.quantity_discount = quantity_discount
        self.platform_fee = platform_fee
        self.subtotal = subtotal
        self.total = total
        self.per_unit_cost = per_unit_cost
        self.estimated_delivery_days = estimated_delivery_days
        self.breakdown_details = breakdown_details
        self.applied_discount = applied_discount

    def dict(self):
        """Convert to dictionary."""
        return {
            "material_cost": float(self.material_cost),
            "labor_cost": float(self.labor_cost),
            "complexity_premium": float(self.complexity_premium),
            "rush_premium": float(self.rush_premium),
            "quantity_discount": float(self.quantity_discount),
            "platform_fee": float(self.platform_fee),
            "subtotal": float(self.subtotal),
            "total": float(self.total),
            "per_unit_cost": float(self.per_unit_cost),
            "estimated_delivery_days": self.estimated_delivery_days,
            "breakdown_details": self.breakdown_details,
            "applied_discount": self.applied_discount
        }


class MarketRates:
    """Market rates data class."""

    def __init__(
        self,
        material_type: str,
        min_price_per_gram: Decimal,
        max_price_per_gram: Decimal,
        avg_price_per_gram: Decimal,
        sample_size: int
    ):
        self.material_type = material_type
        self.min_price_per_gram = min_price_per_gram
        self.max_price_per_gram = max_price_per_gram
        self.avg_price_per_gram = avg_price_per_gram
        self.sample_size = sample_size

    def dict(self):
        """Convert to dictionary."""
        return {
            "material_type": self.material_type,
            "min_price_per_gram": float(self.min_price_per_gram),
            "max_price_per_gram": float(self.max_price_per_gram),
            "avg_price_per_gram": float(self.avg_price_per_gram),
            "sample_size": self.sample_size
        }


class MakerPriceComparison:
    """Maker price comparison data class."""

    def __init__(
        self,
        maker_id: str,
        maker_name: str,
        total_price: Decimal,
        per_unit_price: Decimal,
        estimated_delivery_days: int,
        rating: Decimal,
        total_prints: int,
        verified: bool,
        available: bool,
        pricing_breakdown: PricingBreakdown
    ):
        self.maker_id = maker_id
        self.maker_name = maker_name
        self.total_price = total_price
        self.per_unit_price = per_unit_price
        self.estimated_delivery_days = estimated_delivery_days
        self.rating = rating
        self.total_prints = total_prints
        self.verified = verified
        self.available = available
        self.pricing_breakdown = pricing_breakdown

    def dict(self):
        """Convert to dictionary."""
        return {
            "maker_id": self.maker_id,
            "maker_name": self.maker_name,
            "total_price": float(self.total_price),
            "per_unit_price": float(self.per_unit_price),
            "estimated_delivery_days": self.estimated_delivery_days,
            "rating": float(self.rating),
            "total_prints": self.total_prints,
            "verified": self.verified,
            "available": self.available,
            "pricing_breakdown": self.pricing_breakdown.dict()
        }
