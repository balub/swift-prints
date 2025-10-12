"""
API client generator for frontend integration.
"""
from typing import Dict, List, Any
import json
from pathlib import Path


class APIClientGenerator:
    """Generate API client code for frontend integration."""

    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.endpoints = self._define_endpoints()

    def _define_endpoints(self) -> Dict[str, Dict]:
        """Define all API endpoints with their specifications."""
        return {
            "auth": {
                "verify": {"method": "POST", "path": "/api/auth/verify", "auth": False},
                "me": {"method": "GET", "path": "/api/auth/me", "auth": True},
                "refresh": {"method": "POST", "path": "/api/auth/refresh", "auth": True}
            },
            "upload": {
                "initiate": {"method": "POST", "path": "/api/upload/initiate", "auth": True},
                "complete": {"method": "POST", "path": "/api/upload/complete", "auth": True}
            },
            "files": {
                "list": {"method": "GET", "path": "/api/files", "auth": True},
                "get": {"method": "GET", "path": "/api/files/{file_id}", "auth": True},
                "delete": {"method": "DELETE", "path": "/api/files/{file_id}", "auth": True}
            },
            "analysis": {
                "analyze": {"method": "POST", "path": "/api/analyze", "auth": True},
                "status": {"method": "GET", "path": "/api/analyze/{job_id}", "auth": True},
                "result": {"method": "GET", "path": "/api/analyze/{job_id}/result", "auth": True}
            },
            "makers": {
                "create": {"method": "POST", "path": "/api/makers", "auth": True},
                "search": {"method": "GET", "path": "/api/makers/search", "auth": False},
                "me": {"method": "GET", "path": "/api/makers/me", "auth": True},
                "get": {"method": "GET", "path": "/api/makers/{maker_id}", "auth": False},
                "update": {"method": "PUT", "path": "/api/makers/{maker_id}", "auth": True},
                "capacity": {"method": "GET", "path": "/api/makers/{maker_id}/capacity", "auth": False},
                "stats": {"method": "GET", "path": "/api/makers/{maker_id}/stats", "auth": True}
            },
            "pricing": {
                "calculate": {"method": "POST", "path": "/api/pricing/calculate", "auth": True},
                "rates": {"method": "GET", "path": "/api/pricing/rates", "auth": False},
                "compare": {"method": "POST", "path": "/api/pricing/compare", "auth": True},
                "quote": {"method": "POST", "path": "/api/pricing/quote", "auth": True},
                "session": {"method": "POST", "path": "/api/pricing/session", "auth": True}
            },
            "orders": {
                "create": {"method": "POST", "path": "/api/orders", "auth": True},
                "list": {"method": "GET", "path": "/api/orders", "auth": True},
                "get": {"method": "GET", "path": "/api/orders/{order_id}", "auth": True},
                "updateStatus": {"method": "PUT", "path": "/api/orders/{order_id}/status", "auth": True},
                "cancel": {"method": "POST", "path": "/api/orders/{order_id}/cancel", "auth": True},
                "rate": {"method": "POST", "path": "/api/orders/{order_id}/rate", "auth": True},
                "stats": {"method": "GET", "path": "/api/orders/stats", "auth": True}
            },
            "websocket": {
                "connect": {"method": "WS", "path": "/api/ws/connect", "auth": True},
                "status": {"method": "GET", "path": "/api/ws/status", "auth": True}
            },
            "system": {
                "health": {"method": "GET", "path": "/api/system/health", "auth": False},
                "info": {"method": "GET", "path": "/api/system/info", "auth": False},
                "config": {"method": "GET", "path": "/api/system/config", "auth": False}
            }
        }

    def generate_typescript_client(self) -> str:
        """Generate TypeScript API client."""

        client_code = f'''
// Generated API Client for Swift Prints
// Base URL: {self.base_url}

export interface ApiResponse<T = any> {{
  data?: T;
  error?: {{
    code: string;
    message: string;
    details?: any;
    request_id: string;
    timestamp: string;
  }};
}}

export interface RequestConfig {{
  headers?: Record<string, string>;
  params?: Record<string, any>;
  timeout?: number;
}}

export class SwiftPrintsApiClient {{
  private baseUrl: string;
  private token: string | null = null;
  private defaultTimeout = 30000;

  constructor(baseUrl: string = "{self.base_url}") {{
    this.baseUrl = baseUrl;
  }}

  setToken(token: string) {{
    this.token = token;
  }}

  private async request<T>(
    method: string,
    path: string,
    data?: any,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {{
    const url = `${{this.baseUrl}}${{path}}`;
    const headers: Record<string, string> = {{
      'Content-Type': 'application/json',
      ...config?.headers
    }};

    if (this.token) {{
      headers['Authorization'] = `Bearer ${{this.token}}`;
    }}

    try {{
      const response = await fetch(url, {{
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        signal: AbortSignal.timeout(config?.timeout || this.defaultTimeout)
      }});

      const responseData = await response.json();

      if (!response.ok) {{
        return {{ error: responseData.error || {{ code: 'HTTP_ERROR', message: 'Request failed' }} }};
      }}

      return {{ data: responseData }};
    }} catch (error) {{
      return {{
        error: {{
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network error',
          request_id: '',
          timestamp: new Date().toISOString()
        }}
      }};
    }}
  }}

  // Authentication methods
  async verifyToken(token: string): Promise<ApiResponse<any>> {{
    return this.request('POST', '/api/auth/verify', {{ token }});
  }}

  async getCurrentUser(): Promise<ApiResponse<any>> {{
    return this.request('GET', '/api/auth/me');
  }}

  async refreshToken(): Promise<ApiResponse<any>> {{
    return this.request('POST', '/api/auth/refresh');
  }}

  // File upload methods
  async initiateUpload(filename: string, size: number): Promise<ApiResponse<any>> {{
    return this.request('POST', '/api/upload/initiate', {{ filename, size }});
  }}

  async completeUpload(sessionId: string): Promise<ApiResponse<any>> {{
    return this.request('POST', '/api/upload/complete', {{ session_id: sessionId }});
  }}

  // File management methods
  async getFiles(): Promise<ApiResponse<any[]>> {{
    return this.request('GET', '/api/files');
  }}

  async getFile(fileId: string): Promise<ApiResponse<any>> {{
    return this.request('GET', `/api/files/${{fileId}}`);
  }}

  async deleteFile(fileId: string): Promise<ApiResponse<any>> {{
    return this.request('DELETE', `/api/files/${{fileId}}`);
  }}

  // Analysis methods
  async analyzeFile(fileId: string, settings?: any): Promise<ApiResponse<any>> {{
    return this.request('POST', '/api/analyze', {{ file_id: fileId, settings }});
  }}

  async getAnalysisStatus(jobId: string): Promise<ApiResponse<any>> {{
    return this.request('GET', `/api/analyze/${{jobId}}`);
  }}

  async getAnalysisResult(jobId: string): Promise<ApiResponse<any>> {{
    return this.request('GET', `/api/analyze/${{jobId}}/result`);
  }}

  // Maker methods
  async createMakerProfile(data: any): Promise<ApiResponse<any>> {{
    return this.request('POST', '/api/makers', data);
  }}

  async searchMakers(params?: any): Promise<ApiResponse<any[]>> {{
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request('GET', `/api/makers/search${{queryString}}`);
  }}

  async getMyMakerProfile(): Promise<ApiResponse<any>> {{
    return this.request('GET', '/api/makers/me');
  }}

  async getMaker(makerId: string): Promise<ApiResponse<any>> {{
    return this.request('GET', `/api/makers/${{makerId}}`);
  }}

  async updateMakerProfile(makerId: string, data: any): Promise<ApiResponse<any>> {{
    return this.request('PUT', `/api/makers/${{makerId}}`, data);
  }}

  async getMakerCapacity(makerId: string): Promise<ApiResponse<any>> {{
    return this.request('GET', `/api/makers/${{makerId}}/capacity`);
  }}

  // Pricing methods
  async calculatePricing(data: any): Promise<ApiResponse<any>> {{
    return this.request('POST', '/api/pricing/calculate', data);
  }}

  async getMarketRates(materialType: string, lat: number, lng: number): Promise<ApiResponse<any>> {{
    const params = new URLSearchParams({{
      material_type: materialType,
      location_lat: lat.toString(),
      location_lng: lng.toString()
    }});
    return this.request('GET', `/api/pricing/rates?${{params}}`);
  }}

  async comparePrices(data: any): Promise<ApiResponse<any[]>> {{
    return this.request('POST', '/api/pricing/compare', data);
  }}

  async generateQuote(data: any): Promise<ApiResponse<any>> {{
    return this.request('POST', '/api/pricing/quote', data);
  }}

  async createPricingSession(analysisId: string): Promise<ApiResponse<any>> {{
    return this.request('POST', '/api/pricing/session', {{ analysis_id: analysisId }});
  }}

  // Order methods
  async createOrder(data: any): Promise<ApiResponse<any>> {{
    return this.request('POST', '/api/orders', data);
  }}

  async getOrders(params?: any): Promise<ApiResponse<any[]>> {{
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request('GET', `/api/orders${{queryString}}`);
  }}

  async getOrder(orderId: string): Promise<ApiResponse<any>> {{
    return this.request('GET', `/api/orders/${{orderId}}`);
  }}

  async updateOrderStatus(orderId: string, data: any): Promise<ApiResponse<any>> {{
    return this.request('PUT', `/api/orders/${{orderId}}/status`, data);
  }}

  async cancelOrder(orderId: string, data: any): Promise<ApiResponse<any>> {{
    return this.request('POST', `/api/orders/${{orderId}}/cancel`, data);
  }}

  async rateOrder(orderId: string, data: any): Promise<ApiResponse<any>> {{
    return this.request('POST', `/api/orders/${{orderId}}/rate`, data);
  }}

  async getOrderStats(): Promise<ApiResponse<any>> {{
    return this.request('GET', '/api/orders/stats');
  }}

  // System methods
  async getHealth(): Promise<ApiResponse<any>> {{
    return this.request('GET', '/api/system/health');
  }}

  async getSystemInfo(): Promise<ApiResponse<any>> {{
    return this.request('GET', '/api/system/info');
  }}

  async getSystemConfig(): Promise<ApiResponse<any>> {{
    return this.request('GET', '/api/system/config');
  }}

  // WebSocket connection
  connectWebSocket(token: string): WebSocket {{
    const wsUrl = this.baseUrl.replace('http', 'ws') + `/api/ws/connect?token=${{token}}`;
    return new WebSocket(wsUrl);
  }}
}}

// Default client instance
export const apiClient = new SwiftPrintsApiClient();

// React hooks for API integration
export const useApiClient = () => {{
  return apiClient;
}};

// Error handling utilities
export const isApiError = (response: ApiResponse): response is {{ error: any }} => {{
  return 'error' in response && response.error !== undefined;
}};

export const getErrorMessage = (response: ApiResponse): string => {{
  if (isApiError(response)) {{
    return response.error.message || 'An error occurred';
  }}
  return '';
}};
'''

        return client_code

    def generate_react_hooks(self) -> str:
        """Generate React hooks for API integration."""

        hooks_code = '''
// React hooks for Swift Prints API integration
import { useState, useEffect, useCallback } from 'react';
import { apiClient, ApiResponse, isApiError } from './api-client';

// Generic API hook
export function useApi<T>(
  apiCall: () => Promise<ApiResponse<T>>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiCall();
      
      if (isApiError(response)) {
        setError(response.error.message);
      } else {
        setData(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    execute();
  }, [execute]);

  return { data, loading, error, refetch: execute };
}

// File upload hook
export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = async (file: File) => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      // Initiate upload
      const initResponse = await apiClient.initiateUpload(file.name, file.size);
      
      if (isApiError(initResponse)) {
        throw new Error(initResponse.error.message);
      }

      const { session_id, upload_url } = initResponse.data;

      // Upload file
      const uploadResponse = await fetch(upload_url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type
        }
      });

      if (!uploadResponse.ok) {
        throw new Error('File upload failed');
      }

      setProgress(100);

      // Complete upload
      const completeResponse = await apiClient.completeUpload(session_id);
      
      if (isApiError(completeResponse)) {
        throw new Error(completeResponse.error.message);
      }

      return completeResponse.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      throw err;
    } finally {
      setUploading(false);
    }
  };

  return { uploadFile, uploading, progress, error };
}

// WebSocket hook
export function useWebSocket(token: string | null) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    if (!token) return;

    const ws = apiClient.connectWebSocket(token);
    
    ws.onopen = () => {
      setConnected(true);
      setSocket(ws);
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setMessages(prev => [...prev, message]);
    };

    ws.onclose = () => {
      setConnected(false);
      setSocket(null);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [token]);

  const sendMessage = useCallback((message: any) => {
    if (socket && connected) {
      socket.send(JSON.stringify(message));
    }
  }, [socket, connected]);

  return { socket, connected, messages, sendMessage };
}

// Analysis progress hook
export function useAnalysisProgress(jobId: string | null) {
  const [status, setStatus] = useState<string>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;

    const checkStatus = async () => {
      try {
        const response = await apiClient.getAnalysisStatus(jobId);
        
        if (isApiError(response)) {
          setError(response.error.message);
          return;
        }

        const { status: newStatus, progress: newProgress } = response.data;
        setStatus(newStatus);
        setProgress(newProgress || 0);

        if (newStatus === 'completed') {
          const resultResponse = await apiClient.getAnalysisResult(jobId);
          if (!isApiError(resultResponse)) {
            setResult(resultResponse.data);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Status check failed');
      }
    };

    const interval = setInterval(checkStatus, 2000);
    checkStatus(); // Initial check

    return () => clearInterval(interval);
  }, [jobId]);

  return { status, progress, result, error };
}

// Pricing session hook
export function usePricingSession(analysisId: string | null) {
  const [session, setSession] = useState<any>(null);
  const [pricing, setPricing] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSession = useCallback(async () => {
    if (!analysisId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.createPricingSession(analysisId);
      
      if (isApiError(response)) {
        setError(response.error.message);
      } else {
        setSession(response.data);
        setPricing(response.data.current_pricing);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Session creation failed');
    } finally {
      setLoading(false);
    }
  }, [analysisId]);

  useEffect(() => {
    createSession();
  }, [createSession]);

  return { session, pricing, loading, error, refetch: createSession };
}
'''

        return hooks_code

    def generate_integration_guide(self) -> str:
        """Generate integration guide for frontend developers."""

        guide = f'''
# Swift Prints API Integration Guide

## Overview
This guide helps you integrate the Swift Prints backend API with your frontend application.

## Base URL
- Development: {self.base_url}
- Production: https://api.swiftprints.com

## Authentication
All authenticated endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Quick Start

### 1. Install the API Client
```typescript
import {{ apiClient }} from './api-client';

// Set the authentication token
apiClient.setToken('your-jwt-token');
```

### 2. Basic Usage
```typescript
// Get user files
const filesResponse = await apiClient.getFiles();
if (!isApiError(filesResponse)) {{
  console.log('Files:', filesResponse.data);
}}

// Upload a file
const {{ uploadFile }} = useFileUpload();
const result = await uploadFile(selectedFile);
```

### 3. React Integration
```tsx
import {{ useApi, useWebSocket }} from './api-hooks';

function MyComponent() {{
  const {{ data: files, loading, error }} = useApi(() => apiClient.getFiles());
  const {{ connected, messages }} = useWebSocket(token);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {{error}}</div>;

  return (
    <div>
      {{files?.map(file => (
        <div key={{file.id}}>{{file.filename}}</div>
      ))}}
    </div>
  );
}}
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
interface ApiResponse<T> {{
  data?: T;
  error?: {{
    code: string;
    message: string;
    details?: any;
    request_id: string;
    timestamp: string;
  }};
}}
```

Use `isApiError()` to check for errors:
```typescript
const response = await apiClient.getFiles();
if (isApiError(response)) {{
  console.error('Error:', response.error.message);
}} else {{
  console.log('Success:', response.data);
}}
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
if (response.error?.code === 'RATE_LIMIT_EXCEEDED') {{
  const retryAfter = response.error.details?.retry_after;
  // Wait and retry
}}
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
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.swiftprints.com'
  : 'http://localhost:8000';

const apiClient = new SwiftPrintsApiClient(API_BASE_URL);
```
'''

        return guide

    def save_client_files(self, output_dir: str = "./frontend-integration"):
        """Save generated client files to directory."""

        output_path = Path(output_dir)
        output_path.mkdir(exist_ok=True)

        # Save TypeScript client
        client_file = output_path / "api-client.ts"
        with open(client_file, 'w') as f:
            f.write(self.generate_typescript_client())

        # Save React hooks
        hooks_file = output_path / "api-hooks.ts"
        with open(hooks_file, 'w') as f:
            f.write(self.generate_react_hooks())

        # Save integration guide
        guide_file = output_path / "INTEGRATION_GUIDE.md"
        with open(guide_file, 'w') as f:
            f.write(self.generate_integration_guide())

        # Save endpoint reference
        endpoints_file = output_path / "endpoints.json"
        with open(endpoints_file, 'w') as f:
            json.dump(self.endpoints, f, indent=2)

        print(f"Generated frontend integration files in {output_path}")
        return output_path


if __name__ == "__main__":
    generator = APIClientGenerator()
    generator.save_client_files()
