# Swift Prints API Documentation

## Overview

The Swift Prints API provides a comprehensive set of endpoints for managing a 3D printing marketplace. This RESTful API supports file uploads, STL analysis, maker management, order processing, and real-time pricing.

## Base URL

- Development: `http://localhost:8000`
- Production: `https://api.swiftprints.com`

## Authentication

All protected endpoints require a valid JWT token from Supabase Auth.

### Headers

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

## API Endpoints

### Authentication

#### Verify Token

```http
POST /auth/verify
```

**Request Body:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**

```json
{
  "valid": true,
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "role": "customer"
  }
}
```

#### Get Current User

```http
GET /auth/me
```

**Response:**

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "role": "customer",
  "profile": {
    "name": "John Doe",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### File Upload

#### Initiate Upload

```http
POST /api/upload/initiate
```

**Request Body:**

```json
{
  "filename": "model.stl",
  "size": 1048576,
  "content_type": "application/octet-stream"
}
```

**Response:**

```json
{
  "session_id": "upload_123456",
  "upload_url": "https://storage.example.com/upload/...",
  "expires_at": "2024-01-01T01:00:00Z"
}
```

#### Complete Upload

```http
POST /api/upload/complete
```

**Request Body:**

```json
{
  "session_id": "upload_123456"
}
```

**Response:**

```json
{
  "file_id": "file_789012",
  "filename": "model.stl",
  "size": 1048576,
  "download_url": "https://storage.example.com/files/..."
}
```

### STL Analysis

#### Analyze STL File

```http
POST /api/analyze
```

**Request Body:**

```json
{
  "file_id": "file_789012",
  "settings": {
    "layer_height": 0.2,
    "infill_density": 20,
    "material_type": "PLA",
    "supports": false
  }
}
```

**Response:**

```json
{
  "job_id": "analysis_345678",
  "status": "queued",
  "estimated_completion": "2024-01-01T00:05:00Z"
}
```

#### Get Analysis Status

```http
GET /api/analyze/{job_id}
```

**Response:**

```json
{
  "job_id": "analysis_345678",
  "status": "completed",
  "progress": 100,
  "started_at": "2024-01-01T00:00:00Z",
  "completed_at": "2024-01-01T00:03:45Z"
}
```

#### Get Analysis Results

```http
GET /api/analyze/{job_id}/result
```

**Response:**

```json
{
  "analysis_id": "result_901234",
  "file_id": "file_789012",
  "settings": {
    "layer_height": 0.2,
    "infill_density": 20,
    "material_type": "PLA",
    "supports": false
  },
  "results": {
    "filament_grams": 25.5,
    "print_time_hours": 3.5,
    "volume_mm3": 12500.0,
    "complexity_score": 2.3,
    "supports_required": false,
    "layer_count": 175
  }
}
```

### Maker Management

#### Register Maker

```http
POST /api/makers
```

**Request Body:**

```json
{
  "name": "John's 3D Printing",
  "description": "Professional 3D printing services",
  "location": {
    "address": "123 Main St, City, State 12345",
    "latitude": 40.7128,
    "longitude": -74.006
  },
  "printers": [
    {
      "name": "Prusa i3 MK3S+",
      "model": "Prusa i3 MK3S+",
      "build_volume": {
        "x": 250,
        "y": 210,
        "z": 210
      },
      "hourly_rate": 15.0
    }
  ],
  "materials": [
    {
      "type": "PLA",
      "brand": "Prusament",
      "color_name": "Galaxy Black",
      "color_hex": "#1a1a1a",
      "price_per_gram": 0.025,
      "stock_grams": 1000
    }
  ]
}
```

**Response:**

```json
{
  "id": "maker_567890",
  "name": "John's 3D Printing",
  "verified": false,
  "rating": 0.0,
  "total_prints": 0,
  "available": true,
  "created_at": "2024-01-01T00:00:00Z"
}
```

#### Search Makers

```http
GET /api/makers?location=40.7128,-74.0060&radius=50&material=PLA
```

**Response:**

```json
{
  "makers": [
    {
      "id": "maker_567890",
      "name": "John's 3D Printing",
      "distance_km": 12.5,
      "rating": 4.8,
      "total_prints": 150,
      "available": true,
      "hourly_rate_range": {
        "min": 15.0,
        "max": 25.0
      },
      "materials": ["PLA", "PETG", "ABS"]
    }
  ],
  "total": 1,
  "page": 1,
  "per_page": 20
}
```

### Order Management

#### Create Order

```http
POST /api/orders
```

**Request Body:**

```json
{
  "file_id": "file_789012",
  "analysis_id": "result_901234",
  "maker_id": "maker_567890",
  "settings": {
    "material_type": "PLA",
    "color": "Galaxy Black",
    "quantity": 1,
    "priority": "standard"
  },
  "delivery_address": "456 Oak Ave, City, State 12345",
  "special_instructions": "Please package carefully"
}
```

**Response:**

```json
{
  "id": "order_123456",
  "status": "pending",
  "pricing": {
    "material_cost": 0.64,
    "labor_cost": 52.5,
    "platform_fee": 5.31,
    "total": 58.45
  },
  "estimated_delivery": "2024-01-05T00:00:00Z",
  "created_at": "2024-01-01T00:00:00Z"
}
```

#### List Orders

```http
GET /api/orders?status=active&page=1&per_page=10
```

**Response:**

```json
{
  "orders": [
    {
      "id": "order_123456",
      "status": "in_progress",
      "file": {
        "filename": "model.stl",
        "download_url": "https://storage.example.com/files/..."
      },
      "maker": {
        "name": "John's 3D Printing",
        "rating": 4.8
      },
      "pricing": {
        "total": 58.45
      },
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-02T10:30:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "per_page": 10
}
```

### Pricing

#### Calculate Pricing

```http
POST /api/pricing/calculate
```

**Request Body:**

```json
{
  "analysis_id": "result_901234",
  "maker_id": "maker_567890",
  "settings": {
    "material_type": "PLA",
    "quantity": 1,
    "priority": "standard"
  }
}
```

**Response:**

```json
{
  "breakdown": {
    "material_cost": 0.64,
    "labor_cost": 52.5,
    "complexity_premium": 0.0,
    "platform_fee": 5.31,
    "total": 58.45
  },
  "details": {
    "material_grams": 25.5,
    "material_rate": 0.025,
    "print_hours": 3.5,
    "hourly_rate": 15.0,
    "platform_fee_rate": 0.1
  },
  "valid_until": "2024-01-01T01:00:00Z"
}
```

## WebSocket Events

### Connection

```javascript
const ws = new WebSocket("ws://localhost:8000/ws");
```

### Authentication

```javascript
ws.send(
  JSON.stringify({
    type: "auth",
    token: "your_jwt_token",
  })
);
```

### Event Types

#### Order Status Updates

```json
{
  "type": "order_status",
  "order_id": "order_123456",
  "status": "in_progress",
  "message": "Printing started",
  "timestamp": "2024-01-02T10:30:00Z"
}
```

#### Analysis Progress

```json
{
  "type": "analysis_progress",
  "job_id": "analysis_345678",
  "progress": 75,
  "message": "Slicing model...",
  "timestamp": "2024-01-01T00:02:30Z"
}
```

## Error Responses

All errors follow a consistent format:

```json
{
  "error": "validation_error",
  "message": "Invalid file format",
  "details": {
    "field": "file_type",
    "allowed_types": ["stl", "obj", "3mf"]
  },
  "timestamp": "2024-01-01T00:00:00Z",
  "request_id": "req_789012"
}
```

### Common Error Codes

- `400` - Bad Request: Invalid input data
- `401` - Unauthorized: Missing or invalid authentication
- `403` - Forbidden: Insufficient permissions
- `404` - Not Found: Resource not found
- `409` - Conflict: Resource already exists
- `422` - Unprocessable Entity: File processing error
- `429` - Too Many Requests: Rate limit exceeded
- `500` - Internal Server Error: System error

## Rate Limits

- **File Upload**: 10 uploads per hour per user
- **Analysis**: 5 concurrent analyses per user
- **API Calls**: 1000 requests per hour per user
- **WebSocket**: 100 connections per user

## SDKs and Examples

### Python Client Example

```python
import requests

class SwiftPrintsClient:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }

    def upload_file(self, file_path):
        # Initiate upload
        with open(file_path, 'rb') as f:
            file_size = len(f.read())

        response = requests.post(
            f'{self.base_url}/api/upload/initiate',
            json={
                'filename': file_path.split('/')[-1],
                'size': file_size,
                'content_type': 'application/octet-stream'
            },
            headers=self.headers
        )

        upload_data = response.json()

        # Upload file
        with open(file_path, 'rb') as f:
            requests.put(upload_data['upload_url'], data=f)

        # Complete upload
        response = requests.post(
            f'{self.base_url}/api/upload/complete',
            json={'session_id': upload_data['session_id']},
            headers=self.headers
        )

        return response.json()

# Usage
client = SwiftPrintsClient('http://localhost:8000', 'your_token')
file_info = client.upload_file('model.stl')
```

### JavaScript Client Example

```javascript
class SwiftPrintsClient {
  constructor(baseUrl, token) {
    this.baseUrl = baseUrl;
    this.headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  async analyzeFile(fileId, settings = {}) {
    const response = await fetch(`${this.baseUrl}/api/analyze`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        file_id: fileId,
        settings: {
          layer_height: 0.2,
          infill_density: 20,
          material_type: "PLA",
          supports: false,
          ...settings,
        },
      }),
    });

    return response.json();
  }

  async getAnalysisResult(jobId) {
    const response = await fetch(
      `${this.baseUrl}/api/analyze/${jobId}/result`,
      {
        headers: this.headers,
      }
    );

    return response.json();
  }
}

// Usage
const client = new SwiftPrintsClient("http://localhost:8000", "your_token");
const analysis = await client.analyzeFile("file_123", { infill_density: 30 });
```

## Testing the API

### Using curl

```bash
# Get current user
curl -X GET "http://localhost:8000/auth/me" \
  -H "Authorization: Bearer your_token"

# Upload file (initiate)
curl -X POST "http://localhost:8000/api/upload/initiate" \
  -H "Authorization: Bearer your_token" \
  -H "Content-Type: application/json" \
  -d '{"filename": "test.stl", "size": 1024, "content_type": "application/octet-stream"}'

# Search makers
curl -X GET "http://localhost:8000/api/makers?location=40.7128,-74.0060&radius=50" \
  -H "Authorization: Bearer your_token"
```

### Using Postman

Import the provided Postman collection from `docs/postman/SwiftPrints.postman_collection.json` for interactive API testing.

## Changelog

### v1.0.0 (2024-01-01)

- Initial API release
- File upload and analysis
- Maker management
- Order processing
- Real-time pricing
- WebSocket support
