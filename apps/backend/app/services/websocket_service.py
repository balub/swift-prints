"""
WebSocket service for real-time communication.
"""
from typing import Dict, List, Optional, Set
import json
import asyncio
from datetime import datetime
from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
import redis
import logging

from ..core.config import settings
from ..models.user import User, UserRole
from ..services.auth_service import AuthService

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections."""

    def __init__(self):
        # Store active connections by user ID
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # Store connection metadata
        self.connection_metadata: Dict[WebSocket, Dict] = {}
        # Redis client for pub/sub
        self.redis_client = redis.Redis.from_url(settings.redis_url)

    async def connect(self, websocket: WebSocket, user_id: str, user_role: str):
        """Accept a new WebSocket connection."""
        await websocket.accept()

        # Add to active connections
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)

        # Store metadata
        self.connection_metadata[websocket] = {
            "user_id": user_id,
            "user_role": user_role,
            "connected_at": datetime.now(),
            "subscriptions": set()
        }

        logger.info(f"User {user_id} connected via WebSocket")

    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection."""
        if websocket in self.connection_metadata:
            metadata = self.connection_metadata[websocket]
            user_id = metadata["user_id"]

            # Remove from active connections
            if user_id in self.active_connections:
                self.active_connections[user_id].discard(websocket)
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]

            # Remove metadata
            del self.connection_metadata[websocket]

            logger.info(f"User {user_id} disconnected from WebSocket")

    async def send_personal_message(self, message: Dict, user_id: str):
        """Send a message to a specific user."""
        if user_id in self.active_connections:
            disconnected = []
            for websocket in self.active_connections[user_id].copy():
                try:
                    await websocket.send_text(json.dumps(message))
                except Exception as e:
                    logger.error(
                        f"Error sending message to user {user_id}: {e}")
                    disconnected.append(websocket)

            # Clean up disconnected websockets
            for ws in disconnected:
                self.disconnect(ws)

    async def send_to_role(self, message: Dict, role: UserRole):
        """Send a message to all users with a specific role."""
        for websocket, metadata in self.connection_metadata.items():
            if metadata["user_role"] == role.value:
                try:
                    await websocket.send_text(json.dumps(message))
                except Exception as e:
                    logger.error(f"Error sending message to role {role}: {e}")

    async def broadcast(self, message: Dict):
        """Broadcast a message to all connected users."""
        disconnected = []
        for websocket in self.connection_metadata.keys():
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error broadcasting message: {e}")
                disconnected.append(websocket)

        # Clean up disconnected websockets
        for ws in disconnected:
            self.disconnect(ws)

    def subscribe_to_channel(self, websocket: WebSocket, channel: str):
        """Subscribe a connection to a specific channel."""
        if websocket in self.connection_metadata:
            self.connection_metadata[websocket]["subscriptions"].add(channel)

    def unsubscribe_from_channel(self, websocket: WebSocket, channel: str):
        """Unsubscribe a connection from a specific channel."""
        if websocket in self.connection_metadata:
            self.connection_metadata[websocket]["subscriptions"].discard(
                channel)

    async def send_to_channel(self, message: Dict, channel: str):
        """Send a message to all subscribers of a channel."""
        for websocket, metadata in self.connection_metadata.items():
            if channel in metadata["subscriptions"]:
                try:
                    await websocket.send_text(json.dumps(message))
                except Exception as e:
                    logger.error(
                        f"Error sending message to channel {channel}: {e}")

    def get_connected_users(self) -> List[Dict]:
        """Get list of connected users."""
        users = []
        for user_id, connections in self.active_connections.items():
            if connections:  # Only include users with active connections
                # Get metadata from first connection
                first_connection = next(iter(connections))
                metadata = self.connection_metadata.get(first_connection, {})
                users.append({
                    "user_id": user_id,
                    "user_role": metadata.get("user_role"),
                    "connected_at": metadata.get("connected_at"),
                    "connection_count": len(connections)
                })
        return users


# Global connection manager instance
manager = ConnectionManager()


class NotificationService:
    """Service for sending real-time notifications."""

    def __init__(self, connection_manager: ConnectionManager):
        self.manager = connection_manager

    async def send_order_notification(
        self,
        user_id: str,
        order_id: str,
        event_type: str,
        data: Dict
    ):
        """Send order-related notification."""
        message = {
            "type": "order_notification",
            "event": event_type,
            "order_id": order_id,
            "data": data,
            "timestamp": datetime.now().isoformat()
        }
        await self.manager.send_personal_message(message, user_id)

    async def send_pricing_update(
        self,
        user_id: str,
        session_id: str,
        pricing_data: Dict
    ):
        """Send real-time pricing update."""
        message = {
            "type": "pricing_update",
            "session_id": session_id,
            "data": pricing_data,
            "timestamp": datetime.now().isoformat()
        }
        await self.manager.send_personal_message(message, user_id)

    async def send_analysis_update(
        self,
        user_id: str,
        analysis_id: str,
        status: str,
        progress: Optional[int] = None,
        result: Optional[Dict] = None
    ):
        """Send analysis progress update."""
        message = {
            "type": "analysis_update",
            "analysis_id": analysis_id,
            "status": status,
            "progress": progress,
            "result": result,
            "timestamp": datetime.now().isoformat()
        }
        await self.manager.send_personal_message(message, user_id)

    async def send_maker_notification(
        self,
        maker_user_id: str,
        notification_type: str,
        data: Dict
    ):
        """Send notification to maker."""
        message = {
            "type": "maker_notification",
            "notification_type": notification_type,
            "data": data,
            "timestamp": datetime.now().isoformat()
        }
        await self.manager.send_personal_message(message, maker_user_id)

    async def broadcast_system_message(self, message_text: str, level: str = "info"):
        """Broadcast system message to all users."""
        message = {
            "type": "system_message",
            "level": level,
            "message": message_text,
            "timestamp": datetime.now().isoformat()
        }
        await self.manager.broadcast(message)

    async def notify_new_order_to_makers(self, order_data: Dict):
        """Notify all available makers about a new order."""
        message = {
            "type": "new_order_available",
            "data": order_data,
            "timestamp": datetime.now().isoformat()
        }
        await self.manager.send_to_role(message, UserRole.MAKER)


# Global notification service instance
notification_service = NotificationService(manager)


class WebSocketHandler:
    """Handles WebSocket message processing."""

    def __init__(self, db: Session):
        self.db = db
        self.auth_service = AuthService(db)

    async def handle_connection(self, websocket: WebSocket, token: str):
        """Handle new WebSocket connection with authentication."""
        try:
            # Verify token and get user
            user = self.auth_service.verify_token(token)
            if not user:
                await websocket.close(code=4001, reason="Invalid token")
                return

            # Accept connection
            await manager.connect(websocket, str(user.id), user.role.value)

            # Send welcome message
            welcome_message = {
                "type": "connection_established",
                "user_id": str(user.id),
                "user_role": user.role.value,
                "timestamp": datetime.now().isoformat()
            }
            await websocket.send_text(json.dumps(welcome_message))

            # Handle messages
            await self.handle_messages(websocket, user)

        except Exception as e:
            logger.error(f"WebSocket connection error: {e}")
            await websocket.close(code=4000, reason="Connection error")

    async def handle_messages(self, websocket: WebSocket, user: User):
        """Handle incoming WebSocket messages."""
        try:
            while True:
                # Receive message
                data = await websocket.receive_text()
                message = json.loads(data)

                # Process message based on type
                await self.process_message(websocket, user, message)

        except WebSocketDisconnect:
            manager.disconnect(websocket)
        except Exception as e:
            logger.error(f"Error handling WebSocket message: {e}")
            manager.disconnect(websocket)

    async def process_message(self, websocket: WebSocket, user: User, message: Dict):
        """Process incoming message."""
        message_type = message.get("type")

        if message_type == "subscribe":
            # Subscribe to a channel
            channel = message.get("channel")
            if channel:
                manager.subscribe_to_channel(websocket, channel)
                response = {
                    "type": "subscription_confirmed",
                    "channel": channel,
                    "timestamp": datetime.now().isoformat()
                }
                await websocket.send_text(json.dumps(response))

        elif message_type == "unsubscribe":
            # Unsubscribe from a channel
            channel = message.get("channel")
            if channel:
                manager.unsubscribe_from_channel(websocket, channel)
                response = {
                    "type": "unsubscription_confirmed",
                    "channel": channel,
                    "timestamp": datetime.now().isoformat()
                }
                await websocket.send_text(json.dumps(response))

        elif message_type == "ping":
            # Respond to ping
            response = {
                "type": "pong",
                "timestamp": datetime.now().isoformat()
            }
            await websocket.send_text(json.dumps(response))

        elif message_type == "get_status":
            # Send current status
            response = {
                "type": "status",
                "user_id": str(user.id),
                "connected_users": len(manager.active_connections),
                "timestamp": datetime.now().isoformat()
            }
            await websocket.send_text(json.dumps(response))

        else:
            # Unknown message type
            response = {
                "type": "error",
                "message": f"Unknown message type: {message_type}",
                "timestamp": datetime.now().isoformat()
            }
            await websocket.send_text(json.dumps(response))


class WebSocketService:
    """Main WebSocket service."""

    def __init__(self):
        self.manager = manager
        self.notification_service = notification_service

    def get_connection_manager(self) -> ConnectionManager:
        """Get the connection manager."""
        return self.manager

    def get_notification_service(self) -> NotificationService:
        """Get the notification service."""
        return self.notification_service

    async def send_order_update(
        self,
        customer_id: str,
        maker_id: Optional[str],
        order_id: str,
        status: str,
        data: Dict
    ):
        """Send order update to relevant parties."""
        # Notify customer
        await self.notification_service.send_order_notification(
            customer_id, order_id, "status_update", {
                "status": status,
                **data
            }
        )

        # Notify maker if assigned
        if maker_id:
            await self.notification_service.send_order_notification(
                maker_id, order_id, "status_update", {
                    "status": status,
                    **data
                }
            )

    async def send_pricing_update(self, user_id: str, session_id: str, pricing_data: Dict):
        """Send real-time pricing update."""
        await self.notification_service.send_pricing_update(user_id, session_id, pricing_data)

    async def send_analysis_progress(
        self,
        user_id: str,
        analysis_id: str,
        progress: int,
        status: str = "processing"
    ):
        """Send analysis progress update."""
        await self.notification_service.send_analysis_update(
            user_id, analysis_id, status, progress
        )

    async def send_analysis_complete(
        self,
        user_id: str,
        analysis_id: str,
        result: Dict
    ):
        """Send analysis completion notification."""
        await self.notification_service.send_analysis_update(
            user_id, analysis_id, "completed", 100, result
        )

    def get_connected_users_count(self) -> int:
        """Get count of connected users."""
        return len(self.manager.active_connections)

    def get_connected_users(self) -> List[Dict]:
        """Get list of connected users."""
        return self.manager.get_connected_users()


# Global WebSocket service instance
websocket_service = WebSocketService()
