# Swift Prints Backend

A comprehensive FastAPI backend for the Swift Prints 3D printing marketplace platform. This backend provides STL file processing, maker management, order processing, real-time pricing, and user authentication.

## Features

- **STL File Processing**: Upload and analyze 3D models using PrusaSlicer
- **Two-Phase Upload**: Secure file upload with local and S3 storage support
- **Maker Management**: Registration, verification, and inventory management
- **Order Processing**: Complete order lifecycle management
- **Real-time Pricing**: Dynamic pricing engine with Redis caching
- **Authentication**: Supabase Auth integration with JWT tokens
- **WebSocket Support**: Real-time updates and notifications
- **Database**: SQLAlchemy with SQLite/PostgreSQL support
- **Docker Integration**: Containerized PrusaSlicer for STL analysis

## Quick Start

### Prerequisites

- Python 3.10+
- Redis (for caching)
- PostgreSQL (for production) or SQLite (for development)
- Docker (for PrusaSlicer integration)

### Installation

1. **Clone and navigate to backend directory**:

   ```bash
   cd apps/backend
   ```

2. **Install dependencies**:

   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment**:

   ```bash
   python scripts/dev_setup.py
   ```

4. **Configure environment variables**:

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Start supporting services**:

   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

6. **Run database migrations**:

   ```bash
   alembic upgrade head
   ```

7. **Build PrusaSlicer Docker image**:

   ```bash
   python scripts/build_prusaslicer.py
   ```

8. **Start Celery worker** (in a separate terminal):

   ```bash
   python scripts/start_worker.py
   ```

9. **Start the development server**:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 3001
   ```

The API will be available at `http://localhost:3001` with interactive documentation at `http://localhost:3001/docs`.

## Project Structure

```
apps/backend/
├── app/
│   ├── api/           # API routes and endpoints
│   ├── core/          # Core configuration and utilities
│   ├── models/        # SQLAlchemy database models
│   ├── schemas/       # Pydantic request/response schemas
│   └── services/      # Business logic services
├── alembic/           # Database migration scripts
├── docker/            # Docker configurations
├── scripts/           # Development and deployment scripts
├── tests/             # Test suite
├── main.py            # FastAPI application entry point
└── requirements.txt   # Python dependencies
```

## STL Analysis Service

The backend includes a comprehensive STL analysis service that uses PrusaSlicer in Docker containers:

### Features

- **Asynchronous Processing**: Analysis jobs are queued using Celery for non-blocking operation
- **STL Validation**: Comprehensive validation of STL file format and geometry
- **PrusaSlicer Integration**: Uses PrusaSlicer CLI in Docker for accurate analysis
- **Metrics Extraction**: Extracts filament usage, print time, volume, and complexity scores
- **Job Tracking**: Real-time status updates and progress tracking

### API Endpoints

- `POST /api/analysis/` - Start STL analysis
- `GET /api/analysis/jobs/{job_id}/status` - Get analysis status
- `GET /api/analysis/results/{result_id}` - Get analysis results
- `GET /api/analysis/files/{file_id}/results` - Get all results for a file

### Usage Example

```python
# Start analysis
response = requests.post("/api/analysis/", json={
    "file_id": "your-file-id",
    "settings": {
        "layer_height": 0.2,
        "infill_density": 20,
        "supports": False,
        "material_type": "PLA"
    }
})
job_id = response.json()["job_id"]

# Check status
status = requests.get(f"/api/analysis/jobs/{job_id}/status")
print(status.json())
```

## Configuration

Key environment variables (see `.env.example` for full list):

- `DATABASE_URL`: Database connection string
- `REDIS_URL`: Redis connection for caching
- `CELERY_BROKER_URL`: Celery broker URL (Redis)
- `CELERY_RESULT_BACKEND`: Celery result backend URL (Redis)
- `SUPABASE_URL`: Supabase project URL for authentication
- `SUPABASE_KEY`: Supabase service key
- `STORAGE_BACKEND`: File storage backend ("local" or "s3")
- `PRUSA_SLICER_IMAGE`: Docker image for PrusaSlicer
- `SECRET_KEY`: JWT signing key

## Development

### Running Tests

```bash
pytest
```

### Running Locally

```bash
uvicorn main:app --reload --port 3001
```
