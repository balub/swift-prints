"""
Order management API endpoints.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.auth_middleware import get_current_user
from ..models.user import User, UserRole
from ..services.order_service import OrderService
from ..schemas.order import (
    OrderCreate, OrderUpdate, OrderStatusUpdate, OrderResponse,
    OrderSummary, OrderSearchFilters, OrderStats, OrderAssignment,
    OrderCancellation, OrderRating, OrderStatus
)

router = APIRouter(prefix="/api/orders", tags=["orders"])


def get_order_service(db: Session = Depends(get_db)) -> OrderService:
    """Dependency to get order service."""
    return OrderService(db)


@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    order_data: OrderCreate,
    current_user: User = Depends(get_current_user),
    order_service: OrderService = Depends(get_order_service)
):
    """Create a new order."""
    if current_user.role != UserRole.CUSTOMER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only customers can create orders"
        )

    order = order_service.create_order(str(current_user.id), order_data)
    return order_service.convert_to_response(order)


@router.get("/", response_model=List[OrderSummary])
def get_orders(
    status_filter: Optional[List[OrderStatus]] = Query(
        None, description="Filter by status"),
    date_from: Optional[str] = Query(
        None, description="Filter from date (ISO format)"),
    date_to: Optional[str] = Query(
        None, description="Filter to date (ISO format)"),
    limit: int = Query(20, ge=1, le=100, description="Maximum results"),
    offset: int = Query(0, ge=0, description="Results offset"),
    current_user: User = Depends(get_current_user),
    order_service: OrderService = Depends(get_order_service)
):
    """Get orders for the current user."""

    # Parse dates if provided
    date_from_parsed = None
    date_to_parsed = None

    if date_from:
        try:
            from datetime import datetime
            date_from_parsed = datetime.fromisoformat(
                date_from.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date_from format. Use ISO format."
            )

    if date_to:
        try:
            from datetime import datetime
            date_to_parsed = datetime.fromisoformat(
                date_to.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date_to format. Use ISO format."
            )

    filters = OrderSearchFilters(
        status=status_filter,
        date_from=date_from_parsed,
        date_to=date_to_parsed,
        limit=limit,
        offset=offset
    )

    orders, total_count = order_service.get_orders(
        str(current_user.id), current_user.role, filters
    )

    return [order_service.convert_to_summary(order) for order in orders]


@router.get("/stats", response_model=OrderStats)
def get_order_stats(
    current_user: User = Depends(get_current_user),
    order_service: OrderService = Depends(get_order_service)
):
    """Get order statistics for the current user."""
    return order_service.get_order_stats(str(current_user.id), current_user.role)


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: str,
    current_user: User = Depends(get_current_user),
    order_service: OrderService = Depends(get_order_service)
):
    """Get a specific order."""
    order = order_service.get_order_by_id(
        order_id, str(current_user.id), current_user.role)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    return order_service.convert_to_response(order)


@router.put("/{order_id}/status", response_model=OrderResponse)
def update_order_status(
    order_id: str,
    status_update: OrderStatusUpdate,
    current_user: User = Depends(get_current_user),
    order_service: OrderService = Depends(get_order_service)
):
    """Update order status."""
    order = order_service.update_order_status(
        order_id, str(current_user.id), current_user.role, status_update
    )
    return order_service.convert_to_response(order)


@router.post("/{order_id}/assign", response_model=OrderResponse)
def assign_order(
    order_id: str,
    assignment: OrderAssignment,
    current_user: User = Depends(get_current_user),
    order_service: OrderService = Depends(get_order_service)
):
    """Assign order to a maker (admin function)."""
    # For now, allow makers to self-assign pending orders
    if current_user.role not in [UserRole.ADMIN, UserRole.MAKER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to assign orders"
        )

    order = order_service.assign_order(
        order_id, assignment, str(current_user.id))
    return order_service.convert_to_response(order)


@router.post("/{order_id}/cancel", response_model=OrderResponse)
def cancel_order(
    order_id: str,
    cancellation: OrderCancellation,
    current_user: User = Depends(get_current_user),
    order_service: OrderService = Depends(get_order_service)
):
    """Cancel an order."""
    order = order_service.cancel_order(
        order_id, str(current_user.id), current_user.role, cancellation
    )
    return order_service.convert_to_response(order)


@router.post("/{order_id}/rate")
def rate_order(
    order_id: str,
    rating: OrderRating,
    current_user: User = Depends(get_current_user),
    order_service: OrderService = Depends(get_order_service)
):
    """Rate a completed order."""
    if current_user.role != UserRole.CUSTOMER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only customers can rate orders"
        )

    return order_service.rate_order(order_id, str(current_user.id), rating)


# Maker-specific endpoints
@router.get("/maker/pending", response_model=List[OrderSummary])
def get_pending_orders_for_makers(
    limit: int = Query(20, ge=1, le=100, description="Maximum results"),
    offset: int = Query(0, ge=0, description="Results offset"),
    current_user: User = Depends(get_current_user),
    order_service: OrderService = Depends(get_order_service)
):
    """Get pending orders available for makers to accept."""
    if current_user.role != UserRole.MAKER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only makers can view pending orders"
        )

    # Get all pending orders (not assigned to any maker)
    filters = OrderSearchFilters(
        status=[OrderStatus.PENDING],
        limit=limit,
        offset=offset
    )

    # This would need a different query to get unassigned orders
    # For now, return empty list as placeholder
    return []


@router.post("/{order_id}/accept")
def accept_order(
    order_id: str,
    estimated_completion: Optional[str] = Query(
        None, description="Estimated completion date"),
    current_user: User = Depends(get_current_user),
    order_service: OrderService = Depends(get_order_service)
):
    """Accept a pending order (maker function)."""
    if current_user.role != UserRole.MAKER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only makers can accept orders"
        )

    # Get maker ID for current user
    from ..models.maker import Maker
    from ..core.database import get_db

    db = next(get_db())
    maker = db.query(Maker).filter(Maker.user_id == current_user.id).first()
    if not maker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maker profile not found"
        )

    # Parse estimated completion if provided
    estimated_completion_parsed = None
    if estimated_completion:
        try:
            from datetime import datetime
            estimated_completion_parsed = datetime.fromisoformat(
                estimated_completion.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid estimated_completion format. Use ISO format."
            )

    assignment = OrderAssignment(
        order_id=order_id,
        maker_id=str(maker.id),
        estimated_completion=estimated_completion_parsed,
        notes="Order accepted by maker"
    )

    order = order_service.assign_order(
        order_id, assignment, str(current_user.id))
    return {"message": "Order accepted successfully", "order": order_service.convert_to_response(order)}


@router.get("/customer/{customer_id}", response_model=List[OrderSummary])
def get_customer_orders(
    customer_id: str,
    current_user: User = Depends(get_current_user),
    order_service: OrderService = Depends(get_order_service)
):
    """Get orders for a specific customer (admin function)."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can view other users' orders"
        )

    filters = OrderSearchFilters(
        customer_id=customer_id,
        limit=100,
        offset=0
    )

    orders, _ = order_service.get_orders(
        customer_id, UserRole.CUSTOMER, filters)
    return [order_service.convert_to_summary(order) for order in orders]


@router.get("/maker/{maker_id}", response_model=List[OrderSummary])
def get_maker_orders(
    maker_id: str,
    current_user: User = Depends(get_current_user),
    order_service: OrderService = Depends(get_order_service)
):
    """Get orders for a specific maker (admin function)."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can view other users' orders"
        )

    filters = OrderSearchFilters(
        maker_id=maker_id,
        limit=100,
        offset=0
    )

    # This would need the maker's user_id - simplified for now
    orders, _ = order_service.get_orders("", UserRole.MAKER, filters)
    return [order_service.convert_to_summary(order) for order in orders]
