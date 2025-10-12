"""
Swift Prints Backend - Main FastAPI Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from datetime import datetime

from app.core.config import settings
from app.core.database import create_tables
from app.api import auth, upload, files, analysis, makers, pricing, orders, websocket, system
from app.core.error_handlers import register_error_handlers
from app.core.logging_middleware import RequestLoggingMiddleware, MetricsMiddleware, SecurityHeadersMiddleware
from app.core.rate_limiter import RateLimitMiddleware
from app.core.validation_middleware import InputValidationMiddleware, RequestSizeMiddleware
from app.core.performance import monitor
from app.core.cache import cache_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    create_tables()
    yield
    # Shutdown
    pass


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Swift Prints - 3D Printing Marketplace API",
    debug=settings.debug,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    contact={
        "name": "Swift Prints API Support",
        "email": "api-support@swiftprints.com",
    },
    license_info={
        "name": "MIT License",
        "url": "https://opensource.org/licenses/MIT",
    },
    servers=[
        {
            "url": "http://localhost:8000",
            "description": "Development server"
        },
        {
            "url": "https://api.swiftprints.com",
            "description": "Production server"
        }
    ]
)

# Add middleware in correct order (last added = first executed)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestSizeMiddleware,
                   max_request_size=settings.max_file_size)
app.add_middleware(InputValidationMiddleware)
if settings.rate_limit_enabled:
    app.add_middleware(RateLimitMiddleware)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(MetricsMiddleware)

# Add CORS middleware with enhanced configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=[
        "Accept",
        "Accept-Language",
        "Content-Language",
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "X-Request-ID"
    ],
    expose_headers=["X-Request-ID", "X-Process-Time", "X-Memory-Usage"],
    max_age=settings.cors_max_age,
)

# Register error handlers
register_error_handlers(app)

# Include routers
app.include_router(auth.router)
app.include_router(upload.router)
app.include_router(files.router)
app.include_router(analysis.router)
app.include_router(makers.router)
app.include_router(pricing.router)
app.include_router(orders.router)
app.include_router(websocket.router)
app.include_router(system.router)


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "app": settings.app_name,
        "version": settings.app_version,
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/ping")
def ping():
    """Simple ping endpoint."""
    return {"message": "pong"}


@app.get("/metrics")
def get_metrics():
    """Get performance metrics."""
    return {
        "performance": monitor.get_performance_summary(),
        "cache": cache_service.get_stats() if settings.enable_caching else None,
        "timestamp": datetime.utcnow().isoformat()
    }
