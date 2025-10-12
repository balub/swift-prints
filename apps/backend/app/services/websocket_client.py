"""
WebSocket client integration patterns for frontend.
"""
from typing import Dict, Callable, Optional
import json
import asyncio
import websockets
from datetime import datetime


class WebSocketClient:
    """WebSocket client for frontend integration."""

    def __init__(self, base_url: str, token: str):
        self.base_url = base_url
        self.token = token
        self.websocket = None
        self.is_connected = False
        self.message_handlers: Dict[str, Callable] = {}
        self.subscriptions = set()

    async def connect(self):
        """Connect to WebSocket server."""
        try:
            ws_url = f"{self.base_url}/api/ws/connect?token={self.token}"
            self.websocket = await websockets.connect(ws_url)
            self.is_connected = True

            # Start message handler
            asyncio.create_task(self._handle_messages())

            print(f"Connected to WebSocket at {ws_url}")

        except Exception as e:
            print(f"Failed to connect to WebSocket: {e}")
            self.is_connected = False

    async def disconnect(self):
        """Disconnect from WebSocket server."""
        if self.websocket:
            await self.websocket.close()
            self.is_connected = False
            print("Disconnected from WebSocket")

    async def _handle_messages(self):
        """Handle incoming messages."""
        try:
            async for message in self.websocket:
                data = json.loads(message)
                message_type = data.get("type")

                # Call registered handler if exists
                if message_type in self.message_handlers:
                    await self.message_handlers[message_type](data)
                else:
                    # Default handler
                    await self._default_message_handler(data)

        except websockets.exceptions.ConnectionClosed:
            self.is_connected = False
            print("WebSocket connection closed")
        except Exception as e:
            print(f"Error handling WebSocket message: {e}")

    async def _default_message_handler(self, data: Dict):
        """Default message handler."""
        print(f"Received WebSocket message: {data}")

    def register_handler(self, message_type: str, handler: Callable):
        """Register a message handler for a specific message type."""
        self.message_handlers[message_type] = handler

    async def send_message(self, message: Dict):
        """Send a message to the server."""
        if self.websocket and self.is_connected:
            await self.websocket.send(json.dumps(message))

    async def subscribe(self, channel: str):
        """Subscribe to a channel."""
        if channel not in self.subscriptions:
            await self.send_message({
                "type": "subscribe",
                "channel": channel
            })
            self.subscriptions.add(channel)

    async def unsubscribe(self, channel: str):
        """Unsubscribe from a channel."""
        if channel in self.subscriptions:
            await self.send_message({
                "type": "unsubscribe",
                "channel": channel
            })
            self.subscriptions.discard(channel)

    async def ping(self):
        """Send a ping message."""
        await self.send_message({"type": "ping"})

    async def get_status(self):
        """Request current status."""
        await self.send_message({"type": "get_status"})


# Example usage patterns for frontend integration
class SwiftPrintsWebSocketClient(WebSocketClient):
    """Specialized WebSocket client for Swift Prints application."""

    def __init__(self, base_url: str, token: str):
        super().__init__(base_url, token)
        self._setup_handlers()

    def _setup_handlers(self):
        """Setup message handlers for Swift Prints events."""
        self.register_handler("connection_established",
                              self._handle_connection_established)
        self.register_handler("order_notification",
                              self._handle_order_notification)
        self.register_handler("pricing_update", self._handle_pricing_update)
        self.register_handler("analysis_update", self._handle_analysis_update)
        self.register_handler("maker_notification",
                              self._handle_maker_notification)
        self.register_handler("new_order_available",
                              self._handle_new_order_available)
        self.register_handler("system_message", self._handle_system_message)

    async def _handle_connection_established(self, data: Dict):
        """Handle connection established message."""
        print(
            f"Connected as user {data.get('user_id')} with role {data.get('user_role')}")

        # Subscribe to relevant channels based on user role
        user_role = data.get("user_role")
        if user_role == "customer":
            await self.subscribe("customer_updates")
        elif user_role == "maker":
            await self.subscribe("maker_updates")
            await self.subscribe("new_orders")

    async def _handle_order_notification(self, data: Dict):
        """Handle order notification."""
        event = data.get("event")
        order_id = data.get("order_id")
        order_data = data.get("data", {})

        print(f"Order {order_id} event: {event}")

        # Trigger UI updates based on event type
        if event == "status_update":
            # Update order status in UI
            pass
        elif event == "assigned":
            # Show assignment notification
            pass
        elif event == "completed":
            # Show completion notification and request rating
            pass

    async def _handle_pricing_update(self, data: Dict):
        """Handle real-time pricing update."""
        session_id = data.get("session_id")
        pricing_data = data.get("data", {})

        print(
            f"Pricing update for session {session_id}: ${pricing_data.get('total', 0)}")

        # Update pricing display in UI
        # This would typically trigger a React state update

    async def _handle_analysis_update(self, data: Dict):
        """Handle analysis progress update."""
        analysis_id = data.get("analysis_id")
        status = data.get("status")
        progress = data.get("progress")
        result = data.get("result")

        if status == "processing":
            print(f"Analysis {analysis_id} progress: {progress}%")
            # Update progress bar
        elif status == "completed":
            print(f"Analysis {analysis_id} completed")
            # Show results and enable next steps
        elif status == "failed":
            print(f"Analysis {analysis_id} failed")
            # Show error message

    async def _handle_maker_notification(self, data: Dict):
        """Handle maker-specific notification."""
        notification_type = data.get("notification_type")
        notification_data = data.get("data", {})

        print(f"Maker notification: {notification_type}")

        if notification_type == "order_assigned":
            # Show new order assignment
            pass
        elif notification_type == "payment_received":
            # Show payment confirmation
            pass

    async def _handle_new_order_available(self, data: Dict):
        """Handle new order availability notification."""
        order_data = data.get("data", {})

        print("New order available for makers")

        # Show notification to maker about new order opportunity
        # Update available orders list

    async def _handle_system_message(self, data: Dict):
        """Handle system-wide message."""
        level = data.get("level", "info")
        message = data.get("message")

        print(f"System message ({level}): {message}")

        # Show system notification in UI
        # Could be maintenance notice, feature announcement, etc.


# JavaScript/TypeScript equivalent for frontend
FRONTEND_WEBSOCKET_EXAMPLE = """
// TypeScript/JavaScript WebSocket client example
class SwiftPrintsWebSocket {
    private ws: WebSocket | null = null;
    private token: string;
    private baseUrl: string;
    private handlers: Map<string, Function> = new Map();
    
    constructor(baseUrl: string, token: string) {
        this.baseUrl = baseUrl;
        this.token = token;
        this.setupHandlers();
    }
    
    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            const wsUrl = `${this.baseUrl}/api/ws/connect?token=${this.token}`;
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('Connected to WebSocket');
                resolve();
            };
            
            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            };
            
            this.ws.onclose = () => {
                console.log('WebSocket connection closed');
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                reject(error);
            };
        });
    }
    
    private handleMessage(data: any) {
        const messageType = data.type;
        const handler = this.handlers.get(messageType);
        
        if (handler) {
            handler(data);
        } else {
            console.log('Unhandled message:', data);
        }
    }
    
    private setupHandlers() {
        this.handlers.set('order_notification', (data) => {
            // Update order status in React state
            // dispatch(updateOrderStatus(data.order_id, data.data.status));
        });
        
        this.handlers.set('pricing_update', (data) => {
            // Update pricing in real-time
            // setPricing(data.data);
        });
        
        this.handlers.set('analysis_update', (data) => {
            // Update analysis progress
            // setAnalysisProgress(data.progress);
        });
    }
    
    send(message: any) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }
    
    subscribe(channel: string) {
        this.send({ type: 'subscribe', channel });
    }
    
    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
    }
}

// React hook example
function useWebSocket(token: string) {
    const [ws, setWs] = useState<SwiftPrintsWebSocket | null>(null);
    const [connected, setConnected] = useState(false);
    
    useEffect(() => {
        if (token) {
            const websocket = new SwiftPrintsWebSocket('ws://localhost:8000', token);
            websocket.connect().then(() => {
                setConnected(true);
                setWs(websocket);
            });
            
            return () => {
                websocket.disconnect();
                setConnected(false);
            };
        }
    }, [token]);
    
    return { ws, connected };
}
"""
