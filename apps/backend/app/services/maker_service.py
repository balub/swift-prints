"""
Maker service for business logic related to maker management.
"""
from typing import List, Optional, Tuple
from decimal import Decimal
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, text
from fastapi import HTTPException, status
import math

from ..models.user import User, UserRole
from ..models.maker import Maker
from ..models.printer import Printer
from ..models.material import Material
from ..models.order import Order
from ..schemas.maker import (
    MakerCreate, MakerUpdate, MakerResponse, MakerPublicResponse,
    PrinterCreate, PrinterUpdate, MaterialCreate, MaterialUpdate,
    MakerSearchFilters, CapacityInfo, MakerStats
)


class MakerService:
    """Service for maker-related operations."""

    def __init__(self, db: Session):
        self.db = db

    def create_maker_profile(self, user_id: str, maker_data: MakerCreate) -> Maker:
        """Create a new maker profile for a user."""
        # Check if user exists and is a maker
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        if user.role != UserRole.MAKER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User must have maker role to create maker profile"
            )

        # Check if maker profile already exists
        existing_maker = self.db.query(Maker).filter(
            Maker.user_id == user_id).first()
        if existing_maker:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Maker profile already exists for this user"
            )

        # Create maker profile
        maker = Maker(
            user_id=user_id,
            **maker_data.dict()
        )

        self.db.add(maker)
        self.db.commit()
        self.db.refresh(maker)

        return maker

    def get_maker_by_id(self, maker_id: str, include_printers: bool = True) -> Optional[Maker]:
        """Get maker by ID with optional printer/material loading."""
        query = self.db.query(Maker).filter(Maker.id == maker_id)

        if include_printers:
            query = query.options(
                joinedload(Maker.printers).joinedload(Printer.materials)
            )

        return query.first()

    def get_maker_by_user_id(self, user_id: str, include_printers: bool = True) -> Optional[Maker]:
        """Get maker by user ID."""
        query = self.db.query(Maker).filter(Maker.user_id == user_id)

        if include_printers:
            query = query.options(
                joinedload(Maker.printers).joinedload(Printer.materials)
            )

        return query.first()

    def update_maker_profile(self, maker_id: str, user_id: str, update_data: MakerUpdate) -> Maker:
        """Update maker profile."""
        maker = self.get_maker_by_id(maker_id, include_printers=False)
        if not maker:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Maker not found"
            )

        # Check ownership
        if maker.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this maker profile"
            )

        # Update fields
        update_dict = update_data.dict(exclude_unset=True)
        for field, value in update_dict.items():
            setattr(maker, field, value)

        self.db.commit()
        self.db.refresh(maker)

        return maker

    def search_makers(self, filters: MakerSearchFilters) -> Tuple[List[Maker], int]:
        """Search makers with filters and return results with total count."""
        query = self.db.query(Maker).options(
            joinedload(Maker.printers).joinedload(Printer.materials)
        )

        # Apply filters
        if filters.available_only:
            query = query.filter(Maker.available == True)

        if filters.verified_only:
            query = query.filter(Maker.verified == True)

        if filters.min_rating is not None:
            query = query.filter(Maker.rating >= filters.min_rating)

        # Location-based filtering
        if filters.location_lat and filters.location_lng and filters.radius_km:
            # Use Haversine formula for distance calculation
            # This is a simplified version - in production, consider using PostGIS
            lat_rad = math.radians(filters.location_lat)
            lng_rad = math.radians(filters.location_lng)

            # Convert radius to degrees (approximate)
            lat_range = filters.radius_km / 111.0  # 1 degree lat ≈ 111 km
            lng_range = filters.radius_km / (111.0 * math.cos(lat_rad))

            query = query.filter(
                and_(
                    Maker.location_lat.between(
                        filters.location_lat - lat_range,
                        filters.location_lat + lat_range
                    ),
                    Maker.location_lng.between(
                        filters.location_lng - lng_range,
                        filters.location_lng + lng_range
                    )
                )
            )

        # Material type filtering
        if filters.material_types:
            query = query.join(Maker.printers).join(Printer.materials).filter(
                Material.type.in_(filters.material_types),
                Material.available == True
            ).distinct()

        # Get total count before pagination
        total_count = query.count()

        # Apply pagination
        query = query.offset(filters.offset).limit(filters.limit)

        # Order by rating and total prints
        query = query.order_by(Maker.rating.desc(), Maker.total_prints.desc())

        makers = query.all()
        return makers, total_count

    def get_maker_capacity(self, maker_id: str) -> CapacityInfo:
        """Get maker capacity information."""
        maker = self.get_maker_by_id(maker_id)
        if not maker:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Maker not found"
            )

        # Count printers and materials
        total_printers = len(maker.printers)
        active_printers = sum(1 for p in maker.printers if p.active)

        total_materials = sum(len(p.materials) for p in maker.printers)
        available_materials = sum(
            1 for p in maker.printers
            for m in p.materials
            if m.available and m.stock_grams > 0
        )

        # Count current orders (assuming we have order status)
        current_orders = self.db.query(Order).filter(
            Order.maker_id == maker_id,
            Order.status.in_(["pending", "in_progress", "printing"])
        ).count()

        # Estimate capacity based on various factors
        if active_printers == 0 or available_materials == 0:
            estimated_capacity = "none"
        elif current_orders >= active_printers * 2:
            estimated_capacity = "low"
        elif current_orders >= active_printers:
            estimated_capacity = "medium"
        else:
            estimated_capacity = "high"

        return CapacityInfo(
            total_printers=total_printers,
            active_printers=active_printers,
            total_materials=total_materials,
            available_materials=available_materials,
            current_orders=current_orders,
            estimated_capacity=estimated_capacity
        )

    def get_maker_stats(self, maker_id: str) -> MakerStats:
        """Get maker statistics."""
        maker = self.get_maker_by_id(maker_id, include_printers=False)
        if not maker:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Maker not found"
            )

        # Get order statistics
        orders_query = self.db.query(Order).filter(Order.maker_id == maker_id)
        total_orders = orders_query.count()
        completed_orders = orders_query.filter(
            Order.status == "completed").count()

        completion_rate = (completed_orders / total_orders *
                           100) if total_orders > 0 else 0

        # Calculate total revenue (this would need order pricing data)
        # For now, using a placeholder
        total_revenue = Decimal("0.00")

        return MakerStats(
            total_orders=total_orders,
            completed_orders=completed_orders,
            average_rating=maker.rating,
            total_revenue=total_revenue,
            completion_rate=completion_rate,
            average_delivery_time=None  # Would need delivery tracking
        )

    def update_availability(self, maker_id: str, user_id: str, available: bool) -> Maker:
        """Update maker availability status."""
        maker = self.get_maker_by_id(maker_id, include_printers=False)
        if not maker:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Maker not found"
            )

        # Check ownership
        if maker.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this maker"
            )

        maker.available = available
        self.db.commit()
        self.db.refresh(maker)

        return maker

    def update_rating(self, maker_id: str, new_rating: float, total_ratings: int):
        """Update maker rating (called after order completion)."""
        maker = self.get_maker_by_id(maker_id, include_printers=False)
        if not maker:
            return

        # Calculate new average rating
        current_total = maker.rating * maker.total_prints
        new_total = current_total + new_rating
        maker.total_prints += 1
        maker.rating = new_total / maker.total_prints

        self.db.commit()

    # Printer management methods
    def add_printer(self, maker_id: str, user_id: str, printer_data: PrinterCreate) -> Printer:
        """Add a printer to a maker's inventory."""
        maker = self.get_maker_by_id(maker_id, include_printers=False)
        if not maker:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Maker not found"
            )

        # Check ownership
        if maker.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to add printers to this maker"
            )

        printer = Printer(
            maker_id=maker_id,
            **printer_data.dict()
        )

        self.db.add(printer)
        self.db.commit()
        self.db.refresh(printer)

        return printer

    def update_printer(self, printer_id: str, user_id: str, update_data: PrinterUpdate) -> Printer:
        """Update a printer."""
        printer = self.db.query(Printer).options(joinedload(Printer.maker)).filter(
            Printer.id == printer_id
        ).first()

        if not printer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Printer not found"
            )

        # Check ownership
        if printer.maker.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this printer"
            )

        # Update fields
        update_dict = update_data.dict(exclude_unset=True)
        for field, value in update_dict.items():
            setattr(printer, field, value)

        self.db.commit()
        self.db.refresh(printer)

        return printer

    def delete_printer(self, printer_id: str, user_id: str):
        """Delete a printer."""
        printer = self.db.query(Printer).options(joinedload(Printer.maker)).filter(
            Printer.id == printer_id
        ).first()

        if not printer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Printer not found"
            )

        # Check ownership
        if printer.maker.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this printer"
            )

        self.db.delete(printer)
        self.db.commit()

    # Material management methods
    def add_material(self, printer_id: str, user_id: str, material_data: MaterialCreate) -> Material:
        """Add a material to a printer."""
        printer = self.db.query(Printer).options(joinedload(Printer.maker)).filter(
            Printer.id == printer_id
        ).first()

        if not printer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Printer not found"
            )

        # Check ownership
        if printer.maker.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to add materials to this printer"
            )

        material = Material(
            printer_id=printer_id,
            **material_data.dict()
        )

        self.db.add(material)
        self.db.commit()
        self.db.refresh(material)

        return material

    def update_material(self, material_id: str, user_id: str, update_data: MaterialUpdate) -> Material:
        """Update a material."""
        material = self.db.query(Material).options(
            joinedload(Material.printer).joinedload(Printer.maker)
        ).filter(Material.id == material_id).first()

        if not material:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Material not found"
            )

        # Check ownership
        if material.printer.maker.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this material"
            )

        # Update fields
        update_dict = update_data.dict(exclude_unset=True)
        for field, value in update_dict.items():
            setattr(material, field, value)

        self.db.commit()
        self.db.refresh(material)

        return material

    def delete_material(self, material_id: str, user_id: str):
        """Delete a material."""
        material = self.db.query(Material).options(
            joinedload(Material.printer).joinedload(Printer.maker)
        ).filter(Material.id == material_id).first()

        if not material:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Material not found"
            )

        # Check ownership
        if material.printer.maker.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this material"
            )

        self.db.delete(material)
        self.db.commit()

    def convert_to_public_response(self, maker: Maker) -> MakerPublicResponse:
        """Convert maker to public response format."""
        material_types = list(set(
            material.type
            for printer in maker.printers
            for material in printer.materials
            if material.available
        ))

        return MakerPublicResponse(
            id=str(maker.id),
            name=maker.name,
            description=maker.description,
            location_lat=float(
                maker.location_lat) if maker.location_lat else None,
            location_lng=float(
                maker.location_lng) if maker.location_lng else None,
            location_address=maker.location_address,
            rating=maker.rating,
            total_prints=maker.total_prints,
            verified=maker.verified,
            available=maker.available,
            printer_count=len(maker.printers),
            material_types=material_types
        )
