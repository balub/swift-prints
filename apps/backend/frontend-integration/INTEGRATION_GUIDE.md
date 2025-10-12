# Swift Prints API Integration Guide

## Overview

This guide helps you integrate the Swift Prints backend API with your frontend application.

## Base URL

- Development: http://localhost:8000
- Production: https://api.swiftprints.com

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Quick Start

### 1. Install the API Client

```typescript
import { apiClient } from "./api-client";

// Set the authentication token
apiClient.setToken("your-jwt-token");
```

### 2. Basic Usage

```typescript
// Get user files
const filesResponse = await apiClient.getFiles();
if (!isApiError(filesResponse)) {
  console.log("Files:", filesResponse.data);
}

// Upload a file
const { uploadFile } = useFileUpload();
const result = await uploadFile(selectedFile);
```

### 3. React Integration

```tsx
import { useApi, useWebSocket } from "./api-hooks";

function MyComponent() {
  const { data: files, loading, error } = useApi(() => apiClient.getFiles());
  const { connected, messages } = useWebSocket(token);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {files?.map((file) => (
        <div key={file.id}>{file.filename}</div>
      ))}
    </div>
  );
}
```

## Key Workflows

### File Upload and Analysis

1. Upload file using `useFileUpload` hook
2. Analyze file with `apiClient.analyzeFile()`
3. Monitor progress with `useAnalysisProgress` hook
4. Get results when analysis completes

### Order Creation

1. Get pricing with `apiClient.calculatePricing()`
2. Create order with `apiClient.createOrder()`
3. Monitor status updates via WebSocket

### Real-time Updates

Use the WebSocket connection to receive real-time updates:

- Order status changes
- Analysis progress
- Pricing updates
- System notifications

## Error Handling

All API responses follow this format:

```typescript
interface ApiResponse<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    request_id: string;
    timestamp: string;
  };
}
```

Use `isApiError()` to check for errors:

```typescript
const response = await apiClient.getFiles();
if (isApiError(response)) {
  console.error("Error:", response.error.message);
} else {
  console.log("Success:", response.data);
}
```

## WebSocket Events

Subscribe to these event types:

- `order_notification`: Order status updates
- `pricing_update`: Real-time pricing changes
- `analysis_update`: File analysis progress
- `system_message`: System announcements

## Rate Limiting

The API implements rate limiting. Handle 429 responses appropriately:

```typescript
if (response.error?.code === "RATE_LIMIT_EXCEEDED") {
  const retryAfter = response.error.details?.retry_after;
  // Wait and retry
}
```

## Best Practices

1. Always handle loading and error states
2. Use WebSocket for real-time updates
3. Implement proper error boundaries
4. Cache responses when appropriate
5. Handle network failures gracefully
6. Show progress indicators for long operations

## Environment Configuration

```typescript
// Configure for different environments
const API_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://api.swiftprints.com"
    : "http://localhost:8000";

const apiClient = new SwiftPrintsApiClient(API_BASE_URL);
```

## Example Components

### File Upload Component

```tsx
import React, { useState } from "react";
import { useFileUpload } from "./api-hooks";

export function FileUploadComponent() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { uploadFile, uploading, progress, error } = useFileUpload();

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      const result = await uploadFile(selectedFile);
      console.log("Upload successful:", result);
    } catch (err) {
      console.error("Upload failed:", err);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept=".stl"
        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
      />
      <button onClick={handleUpload} disabled={!selectedFile || uploading}>
        {uploading ? `Uploading... ${progress}%` : "Upload"}
      </button>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
```

### Order Status Component

```tsx
import React from "react";
import { useApi, useWebSocket } from "./api-hooks";
import { apiClient } from "./api-client";

export function OrderStatusComponent({ orderId }: { orderId: string }) {
  const {
    data: order,
    loading,
    error,
  } = useApi(() => apiClient.getOrder(orderId));
  const { messages } = useWebSocket(token);

  // Listen for order updates
  React.useEffect(() => {
    const orderUpdates = messages.filter(
      (msg) => msg.type === "order_notification" && msg.order_id === orderId
    );

    if (orderUpdates.length > 0) {
      // Handle real-time order updates
      const latestUpdate = orderUpdates[orderUpdates.length - 1];
      console.log("Order update:", latestUpdate);
    }
  }, [messages, orderId]);

  if (loading) return <div>Loading order...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!order) return <div>Order not found</div>;

  return (
    <div>
      <h3>Order {order.id}</h3>
      <p>Status: {order.status}</p>
      <p>Total: ${order.pricing?.total || 0}</p>
    </div>
  );
}
```

### Maker Search Component

```tsx
import React, { useState } from "react";
import { useApi } from "./api-hooks";
import { apiClient } from "./api-client";

export function MakerSearchComponent() {
  const [searchParams, setSearchParams] = useState({
    location_lat: 37.7749,
    location_lng: -122.4194,
    radius_km: 50,
    material_types: ["PLA"],
  });

  const {
    data: makers,
    loading,
    error,
  } = useApi(() => apiClient.searchMakers(searchParams), [searchParams]);

  return (
    <div>
      <h3>Find Makers</h3>
      {/* Search filters */}
      <div>
        <input
          type="number"
          placeholder="Latitude"
          value={searchParams.location_lat}
          onChange={(e) =>
            setSearchParams((prev) => ({
              ...prev,
              location_lat: parseFloat(e.target.value),
            }))
          }
        />
        <input
          type="number"
          placeholder="Longitude"
          value={searchParams.location_lng}
          onChange={(e) =>
            setSearchParams((prev) => ({
              ...prev,
              location_lng: parseFloat(e.target.value),
            }))
          }
        />
      </div>

      {/* Results */}
      {loading && <div>Searching...</div>}
      {error && <div>Error: {error}</div>}
      {makers && (
        <div>
          {makers.map((maker) => (
            <div key={maker.id}>
              <h4>{maker.name}</h4>
              <p>Rating: {maker.rating}/5</p>
              <p>Prints: {maker.total_prints}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## Testing

### Unit Tests

```typescript
import { apiClient, isApiError } from "./api-client";

// Mock fetch for testing
global.fetch = jest.fn();

describe("API Client", () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  test("should handle successful response", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "1", name: "Test File" }),
    });

    const response = await apiClient.getFiles();

    expect(isApiError(response)).toBe(false);
    expect(response.data).toEqual([{ id: "1", name: "Test File" }]);
  });

  test("should handle error response", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: {
          code: "NOT_FOUND",
          message: "File not found",
        },
      }),
    });

    const response = await apiClient.getFile("invalid-id");

    expect(isApiError(response)).toBe(true);
    expect(response.error?.message).toBe("File not found");
  });
});
```

### Integration Tests

```typescript
import { render, screen, waitFor } from "@testing-library/react";
import { FileUploadComponent } from "./FileUploadComponent";

// Mock the API client
jest.mock("./api-client");

describe("FileUploadComponent", () => {
  test("should upload file successfully", async () => {
    render(<FileUploadComponent />);

    const fileInput = screen.getByRole("file-input");
    const uploadButton = screen.getByRole("button", { name: /upload/i });

    // Simulate file selection and upload
    // ... test implementation
  });
});
```

## Deployment Considerations

### Environment Variables

```typescript
// .env.development
REACT_APP_API_BASE_URL=http://localhost:8000
REACT_APP_WS_BASE_URL=ws://localhost:8000

// .env.production
REACT_APP_API_BASE_URL=https://api.swiftprints.com
REACT_APP_WS_BASE_URL=wss://api.swiftprints.com
```

### Build Configuration

```typescript
// Configure API client based on environment
const apiClient = new SwiftPrintsApiClient(
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8000"
);
```

### Error Monitoring

```typescript
// Integrate with error monitoring service
import * as Sentry from "@sentry/react";

// In your error handling
if (isApiError(response)) {
  Sentry.captureException(new Error(response.error.message), {
    extra: {
      errorCode: response.error.code,
      requestId: response.error.request_id,
    },
  });
}
```
