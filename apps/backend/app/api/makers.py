"""
Maker management API endpoints.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.auth_middleware import get_current_user
from ..models.user import User
from ..services.maker_service import MakerService
from ..schemas.maker import (
    MakerCreate, MakerUpdate, MakerResponse, MakerPublicResponse,
    PrinterCreate, PrinterUpdate, PrinterResponse,
    MaterialCreate, MaterialUpdate, MaterialResponse,
    MakerSearchFilters, CapacityInfo, MakerStats
)

router = APIRouter(prefix="/api/makers", tags=["makers"])


def get_maker_service(db: Session = Depends(get_db)) -> MakerService:
    """Dependency to get maker service."""
    return MakerService(db)


@router.post("/", response_model=MakerResponse, status_code=status.HTTP_201_CREATED)
def create_maker_profile(
    maker_data: MakerCreate,
    current_user: User = Depends(get_current_user),
    maker_service: MakerService = Depends(get_maker_service)
):
    """Create a new maker profile for the current user."""
    maker = maker_service.create_maker_profile(
        str(current_user.id), maker_data)
    return maker


@router.get("/search", response_model=List[MakerPublicResponse])
def search_makers(
    location_lat: float = Query(None, description="Search center latitude"),
    location_lng: float = Query(None, description="Search center longitude"),
    radius_km: float = Query(None, description="Search radius in kilometers"),
    material_types: List[str] = Query(
        None, description="Required material types"),
    min_rating: float = Query(None, description="Minimum rating"),
    verified_only: bool = Query(False, description="Only verified makers"),
    available_only: bool = Query(True, description="Only available makers"),
    limit: int = Query(20, description="Maximum results"),
    offset: int = Query(0, description="Results offset"),
    maker_service: MakerService = Depends(get_maker_service)
):
    """Search for makers with various filters."""
    filters = MakerSearchFilters(
        location_lat=location_lat,
        location_lng=location_lng,
        radius_km=radius_km,
        material_types=material_types,
        min_rating=min_rating,
        verified_only=verified_only,
        available_only=available_only,
        limit=limit,
        offset=offset
    )

    makers, total_count = maker_service.search_makers(filters)

    # Convert to public response format
    public_makers = [maker_service.convert_to_public_response(
        maker) for maker in makers]

    return public_makers


@router.get("/me", response_model=MakerResponse)
def get_my_maker_profile(
    current_user: User = Depends(get_current_user),
    maker_service: MakerService = Depends(get_maker_service)
):
    """Get the current user's maker profile."""
    maker = maker_service.get_maker_by_user_id(str(current_user.id))
    if not maker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maker profile not found"
        )
    return maker


@router.get("/{maker_id}", response_model=MakerPublicResponse)
def get_maker_public(
    maker_id: str,
    maker_service: MakerService = Depends(get_maker_service)
):
    """Get public maker information."""
    maker = maker_service.get_maker_by_id(maker_id)
    if not maker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maker not found"
        )

    return maker_service.convert_to_public_response(maker)


@router.put("/{maker_id}", response_model=MakerResponse)
def update_maker_profile(
    maker_id: str,
    update_data: MakerUpdate,
    current_user: User = Depends(get_current_user),
    maker_service: MakerService = Depends(get_maker_service)
):
    """Update maker profile."""
    maker = maker_service.update_maker_profile(
        maker_id, str(current_user.id), update_data)
    return maker


@router.put("/{maker_id}/availability")
def update_maker_availability(
    maker_id: str,
    available: bool,
    current_user: User = Depends(get_current_user),
    maker_service: MakerService = Depends(get_maker_service)
):
    """Update maker availability status."""
    maker = maker_service.update_availability(
        maker_id, str(current_user.id), available)
    return {"message": "Availability updated successfully", "available": maker.available}


@router.get("/{maker_id}/capacity", response_model=CapacityInfo)
def get_maker_capacity(
    maker_id: str,
    maker_service: MakerService = Depends(get_maker_service)
):
    """Get maker capacity information."""
    return maker_service.get_maker_capacity(maker_id)


@router.get("/{maker_id}/stats", response_model=MakerStats)
def get_maker_stats(
    maker_id: str,
    current_user: User = Depends(get_current_user),
    maker_service: MakerService = Depends(get_maker_service)
):
    """Get maker statistics (only for the maker themselves)."""
    # Verify the user owns this maker profile
    maker = maker_service.get_maker_by_id(maker_id, include_printers=False)
    if not maker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maker not found"
        )

    if maker.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view these statistics"
        )

    return maker_service.get_maker_stats(maker_id)


# Printer management endpoints
@router.post("/{maker_id}/printers", response_model=PrinterResponse, status_code=status.HTTP_201_CREATED)
def add_printer(
    maker_id: str,
    printer_data: PrinterCreate,
    current_user: User = Depends(get_current_user),
    maker_service: MakerService = Depends(get_maker_service)
):
    """Add a printer to the maker's inventory."""
    printer = maker_service.add_printer(
        maker_id, str(current_user.id), printer_data)
    return printer


@router.put("/printers/{printer_id}", response_model=PrinterResponse)
def update_printer(
    printer_id: str,
    update_data: PrinterUpdate,
    current_user: User = Depends(get_current_user),
    maker_service: MakerService = Depends(get_maker_service)
):
    """Update a printer."""
    printer = maker_service.update_printer(
        printer_id, str(current_user.id), update_data)
    return printer


@router.delete("/printers/{printer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_printer(
    printer_id: str,
    current_user: User = Depends(get_current_user),
    maker_service: MakerService = Depends(get_maker_service)
):
    """Delete a printer."""
    maker_service.delete_printer(printer_id, str(current_user.id))


# Material management endpoints
@router.post("/printers/{printer_id}/materials", response_model=MaterialResponse, status_code=status.HTTP_201_CREATED)
def add_material(
    printer_id: str,
    material_data: MaterialCreate,
    current_user: User = Depends(get_current_user),
    maker_service: MakerService = Depends(get_maker_service)
):
    """Add a material to a printer."""
    material = maker_service.add_material(
        printer_id, str(current_user.id), material_data)
    return material


@router.put("/materials/{material_id}", response_model=MaterialResponse)
def update_material(
    material_id: str,
    update_data: MaterialUpdate,
    current_user: User = Depends(get_current_user),
    maker_service: MakerService = Depends(get_maker_service)
):
    """Update a material."""
    material = maker_service.update_material(
        material_id, str(current_user.id), update_data)
    return material


@router.delete("/materials/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_material(
    material_id: str,
    current_user: User = Depends(get_current_user),
    maker_service: MakerService = Depends(get_maker_service)
):
    """Delete a material."""
    maker_service.delete_material(material_id, str(current_user.id))
