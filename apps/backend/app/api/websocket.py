"""
WebSocket API endpoints for real-time communication.
"""
from typing import Dict, List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
import logging

from ..core.database import get_db
from ..core.auth_middleware import get_current_user
from ..models.user import User, UserRole
from ..services.websocket_service import WebSocketHandler, websocket_service
from ..services.auth_service import AuthService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ws", tags=["websocket"])


@router.websocket("/connect")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(..., description="Authentication token"),
    db: Session = Depends(get_db)
):
    """WebSocket endpoint for real-time communication."""
    handler = WebSocketHandler(db)
    await handler.handle_connection(websocket, token)


@router.get("/status")
def get_websocket_status(
    current_user: User = Depends(get_current_user)
):
    """Get WebSocket service status."""
    return {
        "connected_users": websocket_service.get_connected_users_count(),
        "service_status": "active",
        "user_id": str(current_user.id),
        "user_role": current_user.role.value
    }


@router.get("/connected-users")
def get_connected_users(
    current_user: User = Depends(get_current_user)
):
    """Get list of connected users (admin only)."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can view connected users"
        )

    return {
        "connected_users": websocket_service.get_connected_users(),
        "total_count": websocket_service.get_connected_users_count()
    }


@router.post("/broadcast")
async def broadcast_message(
    message: str,
    level: str = "info",
    current_user: User = Depends(get_current_user)
):
    """Broadcast a system message to all connected users (admin only)."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can broadcast messages"
        )

    await websocket_service.notification_service.broadcast_system_message(message, level)

    return {
        "message": "Message broadcasted successfully",
        "recipients": websocket_service.get_connected_users_count()
    }


@router.post("/notify-user/{user_id}")
async def notify_user(
    user_id: str,
    notification_type: str,
    data: Dict,
    current_user: User = Depends(get_current_user)
):
    """Send a notification to a specific user (admin only)."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can send direct notifications"
        )

    message = {
        "type": "admin_notification",
        "notification_type": notification_type,
        "data": data,
        "from_admin": str(current_user.id)
    }

    await websocket_service.manager.send_personal_message(message, user_id)

    return {"message": f"Notification sent to user {user_id}"}


@router.post("/test-order-notification")
async def test_order_notification(
    order_id: str,
    event_type: str,
    test_data: Dict,
    current_user: User = Depends(get_current_user)
):
    """Test order notification (development/testing only)."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can send test notifications"
        )

    await websocket_service.notification_service.send_order_notification(
        str(current_user.id), order_id, event_type, test_data
    )

    return {"message": "Test order notification sent"}


@router.post("/test-pricing-update")
async def test_pricing_update(
    session_id: str,
    pricing_data: Dict,
    current_user: User = Depends(get_current_user)
):
    """Test pricing update notification (development/testing only)."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can send test notifications"
        )

    await websocket_service.send_pricing_update(
        str(current_user.id), session_id, pricing_data
    )

    return {"message": "Test pricing update sent"}


@router.post("/test-analysis-progress")
async def test_analysis_progress(
    analysis_id: str,
    progress: int,
    current_user: User = Depends(get_current_user)
):
    """Test analysis progress notification (development/testing only)."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can send test notifications"
        )

    await websocket_service.send_analysis_progress(
        str(current_user.id), analysis_id, progress
    )

    return {"message": "Test analysis progress sent"}


# Integration functions for other services to use
class WebSocketIntegration:
    """Integration class for other services to send WebSocket notifications."""

    @staticmethod
    async def notify_order_created(customer_id: str, order_id: str, order_data: Dict):
        """Notify about new order creation."""
        await websocket_service.send_order_update(
            customer_id, None, order_id, "created", order_data
        )

        # Also notify makers about new order availability
        await websocket_service.notification_service.notify_new_order_to_makers(order_data)

    @staticmethod
    async def notify_order_status_change(
        customer_id: str,
        maker_user_id: str,
        order_id: str,
        old_status: str,
        new_status: str,
        additional_data: Dict = None
    ):
        """Notify about order status change."""
        data = {
            "old_status": old_status,
            "new_status": new_status,
            **(additional_data or {})
        }

        await websocket_service.send_order_update(
            customer_id, maker_user_id, order_id, new_status, data
        )

    @staticmethod
    async def notify_order_assigned(customer_id: str, maker_user_id: str, order_id: str, maker_name: str):
        """Notify about order assignment."""
        # Notify customer
        await websocket_service.notification_service.send_order_notification(
            customer_id, order_id, "assigned", {
                "maker_name": maker_name,
                "message": f"Your order has been assigned to {maker_name}"
            }
        )

        # Notify maker
        await websocket_service.notification_service.send_maker_notification(
            maker_user_id, "order_assigned", {
                "order_id": order_id,
                "message": "You have been assigned a new order"
            }
        )

    @staticmethod
    async def notify_pricing_update(user_id: str, session_id: str, pricing_data: Dict):
        """Notify about real-time pricing update."""
        await websocket_service.send_pricing_update(user_id, session_id, pricing_data)

    @staticmethod
    async def notify_analysis_progress(user_id: str, analysis_id: str, progress: int, status: str = "processing"):
        """Notify about analysis progress."""
        await websocket_service.send_analysis_progress(user_id, analysis_id, progress, status)

    @staticmethod
    async def notify_analysis_complete(user_id: str, analysis_id: str, result: Dict):
        """Notify about analysis completion."""
        await websocket_service.send_analysis_complete(user_id, analysis_id, result)

    @staticmethod
    async def notify_maker_new_order(order_data: Dict):
        """Notify all makers about a new order."""
        await websocket_service.notification_service.notify_new_order_to_makers(order_data)


# Export integration for use in other modules
websocket_integration = WebSocketIntegration()
