"""
Order service for managing 3D printing orders.
"""
from typing import List, Optional, Tuple, Dict
from decimal import Decimal
from datetime import datetime, timedelta
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, desc
from fastapi import HTTPException, status
import uuid

from ..models.user import User, UserRole
from ..models.maker import Maker
from ..models.order import Order, OrderStatus
from ..models.file import File
from ..models.analysis import AnalysisResult
from ..services.pricing_service import PricingService
from ..services.maker_service import MakerService
from ..schemas.order import (
    OrderCreate, OrderUpdate, OrderStatusUpdate, OrderResponse,
    OrderSummary, OrderSearchFilters, OrderStats, OrderAssignment,
    OrderCancellation, OrderDispute, OrderRating, PrintSettings
)


class OrderService:
    """Service for order-related operations."""

    def __init__(self, db: Session):
        self.db = db

    def create_order(self, customer_id: str, order_data: OrderCreate) -> Order:
        """Create a new order."""

        # Validate customer
        customer = self.db.query(User).filter(User.id == customer_id).first()
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found"
            )

        # Validate file ownership
        file = self.db.query(File).filter(
            File.id == order_data.file_id,
            File.user_id == customer_id
        ).first()
        if not file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found or not owned by customer"
            )

        # Validate analysis result
        analysis = self.db.query(AnalysisResult).filter(
            AnalysisResult.id == order_data.analysis_id,
            AnalysisResult.file_id == order_data.file_id
        ).first()
        if not analysis:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Analysis result not found for this file"
            )

        # Validate maker
        maker = self.db.query(Maker).filter(
            Maker.id == order_data.maker_id,
            Maker.available == True
        ).first()
        if not maker:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Maker not found or not available"
            )

        # Calculate pricing
        pricing_service = PricingService(self.db)
        pricing = pricing_service.calculate_price(
            analysis,
            maker,
            order_data.material_type,
            order_data.quantity,
            order_data.priority == "rush"
        )

        # Apply discount if provided
        if order_data.discount_code:
            try:
                pricing = pricing_service.apply_discount_code(
                    pricing, order_data.discount_code, customer_id
                )
            except HTTPException:
                # Continue without discount if invalid
                pass

        # Create order
        order = Order(
            customer_id=customer_id,
            maker_id=order_data.maker_id,
            file_id=order_data.file_id,
            analysis_id=order_data.analysis_id,
            settings={
                **order_data.print_settings.dict(),
                "material_type": order_data.material_type,
                "quantity": order_data.quantity,
                "priority": order_data.priority
            },
            pricing=pricing.dict(),
            status=OrderStatus.PENDING,
            delivery_address=order_data.delivery_address,
            special_instructions=order_data.special_instructions
        )

        self.db.add(order)
        self.db.commit()
        self.db.refresh(order)

        # Create order history entry
        self._create_history_entry(
            order.id, OrderStatus.PENDING, "Order created", customer_id
        )

        # Send notifications
        self._send_order_notification(order, "created")

        return order

    def get_order_by_id(self, order_id: str, user_id: str, user_role: UserRole) -> Optional[Order]:
        """Get order by ID with access control."""
        query = self.db.query(Order).options(
            joinedload(Order.customer),
            joinedload(Order.maker),
            joinedload(Order.file),
            joinedload(Order.analysis)
        ).filter(Order.id == order_id)

        # Apply access control
        if user_role == UserRole.CUSTOMER:
            query = query.filter(Order.customer_id == user_id)
        elif user_role == UserRole.MAKER:
            # Get maker ID for this user
            maker = self.db.query(Maker).filter(
                Maker.user_id == user_id).first()
            if maker:
                query = query.filter(Order.maker_id == maker.id)
            else:
                return None

        return query.first()

    def get_orders(
        self,
        user_id: str,
        user_role: UserRole,
        filters: OrderSearchFilters
    ) -> Tuple[List[Order], int]:
        """Get orders with filters and access control."""

        query = self.db.query(Order).options(
            joinedload(Order.customer),
            joinedload(Order.maker),
            joinedload(Order.file)
        )

        # Apply access control
        if user_role == UserRole.CUSTOMER:
            query = query.filter(Order.customer_id == user_id)
        elif user_role == UserRole.MAKER:
            maker = self.db.query(Maker).filter(
                Maker.user_id == user_id).first()
            if maker:
                query = query.filter(Order.maker_id == maker.id)
            else:
                return [], 0

        # Apply filters
        if filters.status:
            query = query.filter(Order.status.in_(filters.status))

        if filters.customer_id:
            query = query.filter(Order.customer_id == filters.customer_id)

        if filters.maker_id:
            query = query.filter(Order.maker_id == filters.maker_id)

        if filters.date_from:
            query = query.filter(Order.created_at >= filters.date_from)

        if filters.date_to:
            query = query.filter(Order.created_at <= filters.date_to)

        if filters.min_price or filters.max_price:
            # This would require extracting price from JSON - simplified for now
            pass

        # Get total count
        total_count = query.count()

        # Apply pagination and ordering
        query = query.order_by(desc(Order.created_at))
        query = query.offset(filters.offset).limit(filters.limit)

        orders = query.all()
        return orders, total_count

    def update_order_status(
        self,
        order_id: str,
        user_id: str,
        user_role: UserRole,
        status_update: OrderStatusUpdate
    ) -> Order:
        """Update order status."""

        order = self.get_order_by_id(order_id, user_id, user_role)
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )

        # Validate status transition
        if not self._is_valid_status_transition(order.status, status_update.status):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status transition from {order.status} to {status_update.status}"
            )

        # Update order
        old_status = order.status
        order.status = status_update.status

        if status_update.estimated_completion:
            # Store in settings for now (could be separate field)
            settings = order.settings or {}
            settings["estimated_completion"] = status_update.estimated_completion.isoformat()
            order.settings = settings

        if status_update.status == OrderStatus.COMPLETED:
            settings = order.settings or {}
            settings["completed_at"] = datetime.now().isoformat()
            order.settings = settings

        self.db.commit()
        self.db.refresh(order)

        # Create history entry
        self._create_history_entry(
            order_id, status_update.status, status_update.notes, user_id
        )

        # Send notifications
        self._send_status_notification(order, old_status, status_update.status)

        # Update maker statistics if completed
        if status_update.status == OrderStatus.COMPLETED and order.maker_id:
            self._update_maker_stats(order.maker_id)

        return order

    def assign_order(
        self,
        order_id: str,
        assignment: OrderAssignment,
        admin_user_id: str
    ) -> Order:
        """Assign order to a maker (admin function)."""

        order = self.db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )

        if order.status != OrderStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only assign pending orders"
            )

        # Validate maker
        maker = self.db.query(Maker).filter(
            Maker.id == assignment.maker_id,
            Maker.available == True
        ).first()
        if not maker:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Maker not found or not available"
            )

        # Update order
        order.maker_id = assignment.maker_id
        order.status = OrderStatus.CONFIRMED

        if assignment.estimated_completion:
            settings = order.settings or {}
            settings["estimated_completion"] = assignment.estimated_completion.isoformat()
            order.settings = settings

        self.db.commit()
        self.db.refresh(order)

        # Create history entry
        self._create_history_entry(
            order_id, OrderStatus.CONFIRMED,
            f"Order assigned to maker. {assignment.notes or ''}",
            admin_user_id
        )

        # Send notifications
        self._send_assignment_notification(order)

        return order

    def cancel_order(
        self,
        order_id: str,
        user_id: str,
        user_role: UserRole,
        cancellation: OrderCancellation
    ) -> Order:
        """Cancel an order."""

        order = self.get_order_by_id(order_id, user_id, user_role)
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )

        if order.status in [OrderStatus.COMPLETED, OrderStatus.CANCELLED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot cancel completed or already cancelled order"
            )

        # Update order
        order.status = OrderStatus.CANCELLED

        # Store cancellation details
        settings = order.settings or {}
        settings["cancellation"] = {
            "reason": cancellation.reason,
            "refund_amount": float(cancellation.refund_amount) if cancellation.refund_amount else None,
            "notes": cancellation.notes,
            "cancelled_by": user_id,
            "cancelled_at": datetime.now().isoformat()
        }
        order.settings = settings

        self.db.commit()
        self.db.refresh(order)

        # Create history entry
        self._create_history_entry(
            order_id, OrderStatus.CANCELLED,
            f"Order cancelled: {cancellation.reason}",
            user_id
        )

        # Send notifications
        self._send_cancellation_notification(order, cancellation)

        return order

    def rate_order(
        self,
        order_id: str,
        customer_id: str,
        rating: OrderRating
    ) -> Dict:
        """Rate a completed order."""

        order = self.db.query(Order).filter(
            Order.id == order_id,
            Order.customer_id == customer_id,
            Order.status == OrderStatus.COMPLETED
        ).first()

        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Completed order not found"
            )

        # Store rating in order settings
        settings = order.settings or {}
        settings["rating"] = {
            "overall_rating": rating.rating,
            "review": rating.review,
            "quality_rating": rating.quality_rating,
            "communication_rating": rating.communication_rating,
            "delivery_rating": rating.delivery_rating,
            "rated_at": datetime.now().isoformat()
        }
        order.settings = settings

        self.db.commit()

        # Update maker rating
        if order.maker_id:
            maker_service = MakerService(self.db)
            maker_service.update_rating(order.maker_id, rating.rating, 1)

        return {"message": "Rating submitted successfully"}

    def get_order_stats(self, user_id: str, user_role: UserRole) -> OrderStats:
        """Get order statistics for user."""

        query = self.db.query(Order)

        # Apply access control
        if user_role == UserRole.CUSTOMER:
            query = query.filter(Order.customer_id == user_id)
        elif user_role == UserRole.MAKER:
            maker = self.db.query(Maker).filter(
                Maker.user_id == user_id).first()
            if maker:
                query = query.filter(Order.maker_id == maker.id)
            else:
                return OrderStats(
                    total_orders=0, pending_orders=0, in_progress_orders=0,
                    completed_orders=0, cancelled_orders=0, total_revenue=Decimal("0"),
                    average_order_value=Decimal("0"), completion_rate=0.0
                )

        # Calculate statistics
        total_orders = query.count()
        pending_orders = query.filter(
            Order.status == OrderStatus.PENDING).count()
        in_progress_orders = query.filter(
            Order.status.in_([OrderStatus.CONFIRMED, OrderStatus.IN_PROGRESS])
        ).count()
        completed_orders = query.filter(
            Order.status == OrderStatus.COMPLETED).count()
        cancelled_orders = query.filter(
            Order.status == OrderStatus.CANCELLED).count()

        # Calculate revenue (simplified - would need proper pricing extraction)
        total_revenue = Decimal("0")
        average_order_value = Decimal("0")

        completed_query = query.filter(Order.status == OrderStatus.COMPLETED)
        if completed_orders > 0:
            # This is simplified - in reality we'd extract from pricing JSON
            average_order_value = Decimal("50.00")  # Placeholder
            total_revenue = average_order_value * completed_orders

        completion_rate = (completed_orders / total_orders *
                           100) if total_orders > 0 else 0

        return OrderStats(
            total_orders=total_orders,
            pending_orders=pending_orders,
            in_progress_orders=in_progress_orders,
            completed_orders=completed_orders,
            cancelled_orders=cancelled_orders,
            total_revenue=total_revenue,
            average_order_value=average_order_value,
            completion_rate=completion_rate
        )

    def _is_valid_status_transition(self, current_status: OrderStatus, new_status: OrderStatus) -> bool:
        """Validate status transition."""
        valid_transitions = {
            OrderStatus.PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
            OrderStatus.CONFIRMED: [OrderStatus.IN_PROGRESS, OrderStatus.CANCELLED],
            OrderStatus.IN_PROGRESS: [OrderStatus.COMPLETED, OrderStatus.CANCELLED, OrderStatus.DISPUTED],
            OrderStatus.COMPLETED: [OrderStatus.DISPUTED],
            OrderStatus.CANCELLED: [],
            OrderStatus.DISPUTED: [
                OrderStatus.COMPLETED, OrderStatus.CANCELLED]
        }

        return new_status in valid_transitions.get(current_status, [])

    def _create_history_entry(self, order_id: str, status: OrderStatus, notes: str, user_id: str):
        """Create order history entry."""
        # This would typically be stored in a separate order_history table
        # For now, we'll skip the implementation
        pass

    def _send_order_notification(self, order: Order, event_type: str):
        """Send order notification."""
        # This would integrate with notification service
        # For now, we'll skip the implementation
        pass

    def _send_status_notification(self, order: Order, old_status: OrderStatus, new_status: OrderStatus):
        """Send status change notification."""
        # This would integrate with notification service
        pass

    def _send_assignment_notification(self, order: Order):
        """Send order assignment notification."""
        # This would integrate with notification service
        pass

    def _send_cancellation_notification(self, order: Order, cancellation: OrderCancellation):
        """Send cancellation notification."""
        # This would integrate with notification service
        pass

    def _update_maker_stats(self, maker_id: str):
        """Update maker statistics after order completion."""
        maker = self.db.query(Maker).filter(Maker.id == maker_id).first()
        if maker:
            maker.total_prints += 1
            self.db.commit()

    def convert_to_response(self, order: Order) -> OrderResponse:
        """Convert order to response format."""
        # Extract quantity from settings
        quantity = 1
        if order.settings and isinstance(order.settings, dict):
            quantity = order.settings.get("quantity", 1)

        return OrderResponse(
            id=str(order.id),
            customer_id=str(order.customer_id),
            maker_id=str(order.maker_id) if order.maker_id else None,
            file_id=str(order.file_id),
            analysis_id=str(order.analysis_id) if order.analysis_id else None,
            settings=order.settings or {},
            pricing=order.pricing or {},
            quantity=quantity,
            status=order.status,
            priority=order.settings.get(
                "priority", "standard") if order.settings else "standard",
            delivery_address=order.delivery_address,
            special_instructions=order.special_instructions,
            tracking_number=None,  # Would be in settings
            created_at=order.created_at,
            updated_at=order.updated_at,
            estimated_completion=None,  # Would be extracted from settings
            completed_at=None,  # Would be extracted from settings
            customer_name=order.customer.email if order.customer else None,
            maker_name=order.maker.name if order.maker else None,
            file_name=order.file.filename if order.file else None
        )

    def convert_to_summary(self, order: Order) -> OrderSummary:
        """Convert order to summary format."""
        total_price = Decimal("0")
        if order.pricing and isinstance(order.pricing, dict):
            total_price = Decimal(str(order.pricing.get("total", 0)))

        quantity = 1
        if order.settings and isinstance(order.settings, dict):
            quantity = order.settings.get("quantity", 1)

        return OrderSummary(
            id=str(order.id),
            status=order.status,
            total_price=total_price,
            quantity=quantity,
            created_at=order.created_at,
            estimated_completion=None,  # Would be extracted from settings
            customer_name=order.customer.email if order.customer else None,
            maker_name=order.maker.name if order.maker else None,
            file_name=order.file.filename if order.file else None
        )
