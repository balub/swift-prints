"""
System API endpoints for health checks, status, and monitoring.
"""
from typing import Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
import redis
import psutil
import os
from datetime import datetime, timedelta

from ..core.database import get_db
from ..core.config import settings
from ..core.auth_middleware import get_current_user
from ..models.user import User, UserRole
from ..services.websocket_service import websocket_service
from ..core.logging_middleware import get_request_metrics
from ..core.performance import monitor, profiler
from ..core.cache import cache_service, cache_manager

router = APIRouter(prefix="/api/system", tags=["system"])


@router.get("/health")
def health_check():
    """Comprehensive health check endpoint."""
    health_status = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": settings.app_version,
        "environment": "development" if settings.debug else "production",
        "checks": {}
    }

    # Database health check
    try:
        db = next(get_db())
        db.execute(text("SELECT 1"))
        health_status["checks"]["database"] = {
            "status": "healthy", "message": "Database connection successful"}
    except Exception as e:
        health_status["checks"]["database"] = {
            "status": "unhealthy", "message": f"Database error: {str(e)}"}
        health_status["status"] = "unhealthy"

    # Redis health check
    try:
        redis_client = redis.Redis.from_url(settings.redis_url)
        redis_client.ping()
        health_status["checks"]["redis"] = {
            "status": "healthy", "message": "Redis connection successful"}
    except Exception as e:
        health_status["checks"]["redis"] = {
            "status": "unhealthy", "message": f"Redis error: {str(e)}"}
        health_status["status"] = "degraded"

    # WebSocket service health check
    try:
        connected_users = websocket_service.get_connected_users_count()
        health_status["checks"]["websocket"] = {
            "status": "healthy",
            "message": f"WebSocket service active with {connected_users} connected users"
        }
    except Exception as e:
        health_status["checks"]["websocket"] = {
            "status": "unhealthy", "message": f"WebSocket error: {str(e)}"}

    # File system health check
    try:
        upload_dir = settings.upload_dir
        if os.path.exists(upload_dir) and os.access(upload_dir, os.W_OK):
            health_status["checks"]["filesystem"] = {
                "status": "healthy", "message": "Upload directory accessible"}
        else:
            health_status["checks"]["filesystem"] = {
                "status": "unhealthy", "message": "Upload directory not accessible"}
            health_status["status"] = "degraded"
    except Exception as e:
        health_status["checks"]["filesystem"] = {
            "status": "unhealthy", "message": f"Filesystem error: {str(e)}"}

    return health_status


@router.get("/status")
def get_system_status(
    current_user: User = Depends(get_current_user)
):
    """Get detailed system status (authenticated users only)."""

    # System metrics
    cpu_percent = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')

    status_info = {
        "system": {
            "cpu_usage_percent": cpu_percent,
            "memory_usage_percent": memory.percent,
            "memory_available_gb": round(memory.available / (1024**3), 2),
            "disk_usage_percent": disk.percent,
            "disk_free_gb": round(disk.free / (1024**3), 2)
        },
        "application": {
            "version": settings.app_version,
            "debug_mode": settings.debug,
            "connected_websocket_users": websocket_service.get_connected_users_count(),
            "uptime": "N/A"  # Would need to track startup time
        },
        "database": {
            "url": settings.database_url.split('@')[-1] if '@' in settings.database_url else "local",
            "connection_status": "connected"
        },
        "storage": {
            "backend": settings.storage_backend,
            "upload_directory": settings.upload_dir if settings.storage_backend == "local" else "S3"
        }
    }

    # Add admin-only information
    if current_user.role == UserRole.ADMIN:
        status_info["admin"] = {
            "redis_url": settings.redis_url,
            "supabase_configured": bool(settings.supabase_url and settings.supabase_key),
            "aws_configured": bool(settings.aws_access_key and settings.aws_secret_key),
            "celery_broker": settings.celery_broker_url
        }

    return status_info


@router.get("/metrics")
def get_system_metrics(
    current_user: User = Depends(get_current_user)
):
    """Get system metrics (admin only)."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access system metrics"
        )

    # Database metrics
    db = next(get_db())

    try:
        # Count records in main tables
        from ..models.user import User
        from ..models.maker import Maker
        from ..models.order import Order
        from ..models.file import File
        from ..models.analysis import AnalysisResult

        metrics = {
            "database": {
                "total_users": db.query(User).count(),
                "total_makers": db.query(Maker).count(),
                "total_orders": db.query(Order).count(),
                "total_files": db.query(File).count(),
                "total_analyses": db.query(AnalysisResult).count()
            },
            "orders": {
                "pending_orders": db.query(Order).filter(Order.status == "pending").count(),
                "in_progress_orders": db.query(Order).filter(Order.status == "in_progress").count(),
                "completed_orders": db.query(Order).filter(Order.status == "completed").count()
            },
            "files": {
                "total_size_mb": 0,  # Would need to calculate from file sizes
                "avg_file_size_mb": 0
            },
            "websocket": {
                "connected_users": websocket_service.get_connected_users_count(),
                "active_connections": len(websocket_service.manager.connection_metadata)
            }
        }

        return metrics

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving metrics: {str(e)}"
        )


@router.get("/info")
def get_api_info():
    """Get API information and available endpoints."""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "description": "Swift Prints 3D Printing Marketplace API",
        "documentation": {
            "swagger_ui": "/docs",
            "redoc": "/redoc",
            "openapi_spec": "/openapi.json"
        },
        "endpoints": {
            "authentication": "/api/auth",
            "file_upload": "/api/upload",
            "file_management": "/api/files",
            "stl_analysis": "/api/analyze",
            "maker_management": "/api/makers",
            "pricing": "/api/pricing",
            "orders": "/api/orders",
            "websocket": "/api/ws",
            "system": "/api/system"
        },
        "features": [
            "STL file upload and analysis",
            "Real-time pricing calculation",
            "Maker marketplace",
            "Order management",
            "WebSocket real-time updates",
            "Supabase authentication",
            "Multi-storage backend support"
        ],
        "supported_file_types": ["stl"],
        "max_file_size_mb": settings.max_file_size / (1024 * 1024),
        "storage_backends": ["local", "s3"]
    }


@router.get("/config")
def get_public_config():
    """Get public configuration information."""
    return {
        "max_file_size_mb": settings.max_file_size / (1024 * 1024),
        "supported_file_types": ["stl"],
        "storage_backend": settings.storage_backend,
        "websocket_enabled": True,
        "real_time_pricing": True,
        "supabase_auth": bool(settings.supabase_url),
        "features": {
            "file_upload": True,
            "stl_analysis": True,
            "maker_marketplace": True,
            "order_management": True,
            "real_time_updates": True,
            "pricing_engine": True
        }
    }


@router.post("/maintenance")
def toggle_maintenance_mode(
    enabled: bool,
    message: str = "System is under maintenance. Please try again later.",
    current_user: User = Depends(get_current_user)
):
    """Toggle maintenance mode (admin only)."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can toggle maintenance mode"
        )

    # This would typically set a flag in Redis or database
    # For now, just return the status
    return {
        "maintenance_mode": enabled,
        "message": message,
        "enabled_by": str(current_user.id),
        "timestamp": datetime.now().isoformat()
    }


@router.get("/logs")
def get_system_logs(
    lines: int = 100,
    level: str = "INFO",
    current_user: User = Depends(get_current_user)
):
    """Get system logs (admin only)."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access system logs"
        )

    # This would typically read from log files
    # For now, return a placeholder
    return {
        "logs": [
            {
                "timestamp": datetime.now().isoformat(),
                "level": "INFO",
                "message": "System log entry placeholder",
                "module": "system"
            }
        ],
        "total_lines": lines,
        "level_filter": level
    }


@router.get("/database/stats")
def get_database_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get database statistics (admin only)."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access database statistics"
        )

    try:
        # Get table sizes and row counts
        stats = {}

        # This would be database-specific
        # For SQLite, we can get basic info
        tables = [
            "users", "makers", "printers", "materials",
            "files", "analysis_results", "orders"
        ]

        for table in tables:
            try:
                result = db.execute(
                    text(f"SELECT COUNT(*) FROM {table}")).scalar()
                stats[table] = {"row_count": result}
            except Exception:
                stats[table] = {"row_count": 0,
                                "error": "Table not accessible"}

        return {
            "database_type": "SQLite" if "sqlite" in settings.database_url else "PostgreSQL",
            "tables": stats,
            "total_tables": len(tables),
            "connection_url": settings.database_url.split('@')[-1] if '@' in settings.database_url else "local"
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving database stats: {str(e)}"
        )


@router.get("/request-metrics")
def get_request_metrics_endpoint(
    current_user: User = Depends(get_current_user)
):
    """Get request metrics (admin only)."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access request metrics"
        )

    return get_request_metrics()


@router.get("/performance")
def get_performance_metrics(
    minutes: int = 60,
    current_user: User = Depends(get_current_user)
):
    """Get detailed performance metrics (admin only)."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access performance metrics"
        )

    return {
        "summary": monitor.get_performance_summary(),
        "system_metrics": monitor.get_system_metrics(minutes=minutes),
        "request_metrics": monitor.get_request_metrics(minutes=minutes),
        "cache_stats": cache_service.get_stats() if settings.enable_caching else None,
        "profiler_stats": profiler.get_all_profiles(),
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/performance/endpoint/{endpoint:path}")
def get_endpoint_performance(
    endpoint: str,
    minutes: int = 60,
    current_user: User = Depends(get_current_user)
):
    """Get performance metrics for a specific endpoint (admin only)."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access endpoint performance metrics"
        )

    # Ensure endpoint starts with /
    if not endpoint.startswith('/'):
        endpoint = '/' + endpoint

    return monitor.get_endpoint_performance(endpoint, minutes=minutes)


@router.get("/cache/stats")
def get_cache_stats(
    current_user: User = Depends(get_current_user)
):
    """Get cache statistics (admin only)."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access cache statistics"
        )

    if not settings.enable_caching:
        return {"error": "Caching is disabled"}

    return cache_service.get_stats()


@router.post("/cache/clear")
def clear_cache(
    pattern: str = "*",
    current_user: User = Depends(get_current_user)
):
    """Clear cache entries matching pattern (admin only)."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can clear cache"
        )

    if not settings.enable_caching:
        return {"error": "Caching is disabled"}

    cleared_count = cache_service.clear_pattern(pattern)
    return {
        "pattern": pattern,
        "cleared_entries": cleared_count,
        "timestamp": datetime.utcnow().isoformat()
    }


@router.post("/profiler/clear")
def clear_profiler_data(
    profile_name: str = None,
    current_user: User = Depends(get_current_user)
):
    """Clear profiler data (admin only)."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can clear profiler data"
        )

    profiler.clear_profiles(profile_name)
    return {
        "cleared_profile": profile_name or "all",
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/security/validation-stats")
def get_validation_stats(
    current_user: User = Depends(get_current_user)
):
    """Get input validation statistics (admin only)."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access validation statistics"
        )

    # This would typically come from the validation middleware
    # For now, return placeholder data
    return {
        "total_requests_validated": 0,
        "validation_failures": 0,
        "sanitization_actions": 0,
        "blocked_requests": 0,
        "common_validation_errors": [],
        "timestamp": datetime.utcnow().isoformat()
    }
