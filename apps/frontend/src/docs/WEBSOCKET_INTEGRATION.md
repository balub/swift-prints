# WebSocket Integration Guide

This document explains how to use the real-time WebSocket integration in the Swift Prints frontend application.

## Overview

The WebSocket integration provides real-time updates for:

- Order status changes
- Pricing calculations
- File analysis progress
- Maker availability updates

The system automatically falls back to polling when WebSocket connections fail, ensuring reliable real-time functionality.

## Architecture

### Core Components

1. **useWebSocket Hook** (`/hooks/useWebSocket.ts`)

   - Low-level WebSocket connection management
   - Automatic reconnection with exponential backoff
   - Authentication token handling
   - Connection state management

2. **Real-time Service** (`/services/realTimeService.ts`)

   - High-level real-time functionality
   - Combines WebSocket and polling fallback
   - Manages subscriptions for different data types
   - Integrates with React Query for cache updates

3. **RealTimeContext** (`/contexts/RealTimeContext.tsx`)

   - React context provider for real-time functionality
   - Makes real-time service available throughout the app
   - Provides subscription management methods

4. **Specialized Hooks**
   - `useOrderUpdates` - Order status updates
   - `usePricingUpdates` - Pricing change notifications
   - `useAnalysisUpdates` - File analysis progress

## Setup

### 1. Add RealTimeProvider to App

```tsx
import { RealTimeProvider } from "@/contexts/RealTimeContext";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RealTimeProvider>{/* Your app components */}</RealTimeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
```

### 2. Use Real-time Updates in Components

#### Order Updates

```tsx
import { useRealTime } from "@/contexts/RealTimeContext";
import { useEffect } from "react";

function OrderComponent({ orderId }: { orderId: string }) {
  const { subscribeToOrder, unsubscribeFromOrder } = useRealTime();

  useEffect(() => {
    subscribeToOrder(orderId);
    return () => unsubscribeFromOrder(orderId);
  }, [orderId, subscribeToOrder, unsubscribeFromOrder]);

  // Component will automatically receive updates via React Query cache
  return <div>Order content...</div>;
}
```

#### Pricing Updates

```tsx
import { useRealTime } from "@/contexts/RealTimeContext";
import { PricingParams } from "@/types/api";

function PricingComponent() {
  const { subscribeToPricing, unsubscribeFromPricing } = useRealTime();

  const pricingParams: PricingParams = {
    analysis_id: "analysis-123",
    maker_id: "maker-456",
    settings: {
      /* print settings */
    },
  };

  useEffect(() => {
    subscribeToPricing(pricingParams);
    return () => unsubscribeFromPricing(pricingParams);
  }, [subscribeToPricing, unsubscribeFromPricing]);

  return <div>Pricing content...</div>;
}
```

#### Analysis Progress

```tsx
import { useAnalysisUpdates } from "@/hooks/useAnalysisUpdates";

function AnalysisComponent({ jobId }: { jobId: string }) {
  const { connected } = useAnalysisUpdates({
    jobId,
    onProgressUpdate: (progress) => {
      console.log(`Analysis ${progress}% complete`);
    },
    onAnalysisComplete: (result) => {
      console.log("Analysis completed:", result);
    },
    onAnalysisError: (error) => {
      console.error("Analysis failed:", error);
    },
  });

  return <div>Analysis progress...</div>;
}
```

## Pre-built Components

### RealTimeStatus

Displays the current connection status:

```tsx
import { RealTimeStatus } from "@/components/RealTimeStatus";

// Simple indicator
<RealTimeStatus />

// Detailed status with controls
<RealTimeStatus showDetails={true} />
```

### PricingCalculator

Real-time pricing calculator with WebSocket updates:

```tsx
import { PricingCalculator } from "@/components/PricingCalculator";

<PricingCalculator
  analysisId="analysis-123"
  makerId="maker-456"
  settings={printSettings}
  onPricingUpdate={(pricing) => console.log("New pricing:", pricing)}
/>;
```

### AnalysisProgress

File analysis progress with real-time updates:

```tsx
import { AnalysisProgress } from "@/components/AnalysisProgress";

<AnalysisProgress
  jobId="job-789"
  onComplete={(result) => console.log("Analysis done:", result)}
  onError={(error) => console.error("Analysis error:", error)}
/>;
```

## Configuration

### Environment Variables

```env
# WebSocket endpoint (defaults to current origin with ws/wss protocol)
VITE_WS_BASE_URL=ws://localhost:8000

# Polling fallback interval (milliseconds)
VITE_POLLING_INTERVAL=30000

# Maximum reconnection attempts
VITE_MAX_RECONNECT_ATTEMPTS=10
```

### RealTimeProvider Options

```tsx
<RealTimeProvider
  options={{
    enableWebSocket: true,
    enablePolling: true,
    pollingInterval: 30000,
    maxPollingRetries: 3,
  }}
>
  {children}
</RealTimeProvider>
```

## WebSocket Message Format

### Order Updates

```json
{
  "type": "order_update",
  "data": {
    "order_id": "order-123",
    "status": "in_progress",
    "order": {
      // Full order object
    }
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Pricing Updates

```json
{
  "type": "pricing_update",
  "data": {
    "params": {
      "analysis_id": "analysis-123",
      "maker_id": "maker-456",
      "settings": {
        /* print settings */
      }
    },
    "pricing": {
      "material_cost": 5.5,
      "labor_cost": 8.0,
      "complexity_premium": 2.0,
      "platform_fee": 1.5,
      "total": 17.0,
      "currency": "USD"
    }
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Analysis Updates

```json
{
  "type": "analysis_update",
  "data": {
    "job_id": "job-789",
    "status": "processing",
    "progress": 75,
    "result": null
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Error Handling

The WebSocket integration includes comprehensive error handling:

1. **Connection Failures**: Automatic reconnection with exponential backoff
2. **Authentication Errors**: Token refresh and re-authentication
3. **Network Issues**: Fallback to polling when WebSocket fails
4. **Message Parsing**: Graceful handling of malformed messages
5. **Subscription Errors**: Retry mechanisms for failed subscriptions

## Testing

Use the `WebSocketTest` component to verify integration:

```tsx
import { WebSocketTest } from "@/components/WebSocketTest";

// Add to a test page or development route
<WebSocketTest />;
```

This component provides:

- Connection status monitoring
- Manual subscription testing
- Message sending/receiving verification
- Reconnection testing

## Performance Considerations

1. **Subscription Management**: Only subscribe to data you need
2. **Cleanup**: Always unsubscribe when components unmount
3. **Batching**: Updates are batched to prevent excessive re-renders
4. **Caching**: Integrates with React Query for efficient caching
5. **Fallback**: Polling fallback prevents blocking when WebSocket fails

## Security

1. **Authentication**: JWT tokens are automatically included in WebSocket connections
2. **Authorization**: Server validates permissions for each subscription
3. **Rate Limiting**: Built-in protection against excessive requests
4. **Secure Connections**: Uses WSS in production environments

## Troubleshooting

### Common Issues

1. **Connection Fails**

   - Check network connectivity
   - Verify authentication token
   - Check server WebSocket endpoint

2. **No Updates Received**

   - Verify subscription is active
   - Check server-side message sending
   - Monitor browser network tab

3. **Excessive Reconnections**
   - Check server stability
   - Verify token expiration handling
   - Monitor reconnection backoff

### Debug Mode

Enable debug logging in development:

```tsx
<RealTimeProvider
  options={{
    enableLogging: true, // Shows detailed WebSocket logs
  }}
>
  {children}
</RealTimeProvider>
```

## Backend Integration

The frontend expects the backend to provide:

1. **WebSocket Endpoints**

   - `/ws/orders` - Order updates
   - `/ws/pricing` - Pricing updates
   - `/ws/analysis` - Analysis progress
   - `/ws/realtime` - Combined endpoint

2. **Authentication**

   - JWT token validation via query parameter
   - Session management for WebSocket connections

3. **Message Broadcasting**
   - Order status changes
   - Pricing recalculations
   - Analysis progress updates

See the backend documentation for implementation details.
