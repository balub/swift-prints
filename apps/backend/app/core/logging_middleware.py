"""
Request logging and monitoring middleware.
"""
import time
import uuid
import logging
import psutil
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import json
from datetime import datetime

from .performance import monitor, RequestMetrics

logger = logging.getLogger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for logging HTTP requests and responses."""

    def __init__(self, app, log_level: str = "INFO"):
        super().__init__(app)
        self.log_level = getattr(logging, log_level.upper())

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request and log details."""

        # Generate request ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        # Start timing and memory tracking
        start_time = time.time()
        start_memory = psutil.Process().memory_info().rss / (1024 * 1024)  # MB

        # Log request
        await self._log_request(request, request_id)

        # Process request
        try:
            response = await call_next(request)

            # Calculate processing time and memory usage
            process_time = time.time() - start_time
            end_memory = psutil.Process().memory_info().rss / (1024 * 1024)  # MB
            memory_usage = end_memory - start_memory

            # Add headers
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Process-Time"] = str(round(process_time, 4))
            response.headers["X-Memory-Usage"] = str(round(memory_usage, 2))

            # Record performance metrics
            user_id = getattr(request.state, 'user_id', None) if hasattr(
                request.state, 'user_id') else None
            metrics = RequestMetrics(
                endpoint=request.url.path,
                method=request.method,
                status_code=response.status_code,
                duration=process_time,
                memory_usage=memory_usage,
                cpu_usage=psutil.cpu_percent(),
                timestamp=datetime.utcnow(),
                user_id=user_id
            )
            monitor.add_request_metric(metrics)

            # Log response
            await self._log_response(request, response, process_time, request_id)

            return response

        except Exception as e:
            # Log error and record metrics
            process_time = time.time() - start_time
            end_memory = psutil.Process().memory_info().rss / (1024 * 1024)  # MB
            memory_usage = end_memory - start_memory

            user_id = getattr(request.state, 'user_id', None) if hasattr(
                request.state, 'user_id') else None
            metrics = RequestMetrics(
                endpoint=request.url.path,
                method=request.method,
                status_code=500,
                duration=process_time,
                memory_usage=memory_usage,
                cpu_usage=psutil.cpu_percent(),
                timestamp=datetime.utcnow(),
                user_id=user_id,
                error=str(e)
            )
            monitor.add_request_metric(metrics)

            await self._log_error(request, e, process_time, request_id)
            raise

    async def _log_request(self, request: Request, request_id: str):
        """Log incoming request."""

        # Get client IP
        client_ip = self._get_client_ip(request)

        # Get user agent
        user_agent = request.headers.get("user-agent", "Unknown")

        # Log basic request info
        log_data = {
            "request_id": request_id,
            "method": request.method,
            "url": str(request.url),
            "path": request.url.path,
            "query_params": dict(request.query_params),
            "client_ip": client_ip,
            "user_agent": user_agent,
            "content_type": request.headers.get("content-type"),
            "content_length": request.headers.get("content-length")
        }

        # Skip logging for health checks and static files
        if self._should_skip_logging(request.url.path):
            return

        logger.log(
            self.log_level,
            f"Request {request.method} {request.url.path}",
            extra=log_data
        )

    async def _log_response(self, request: Request, response: Response, process_time: float, request_id: str):
        """Log response details."""

        log_data = {
            "request_id": request_id,
            "status_code": response.status_code,
            "process_time": round(process_time, 4),
            "response_size": response.headers.get("content-length"),
            "content_type": response.headers.get("content-type")
        }

        # Skip logging for health checks and static files
        if self._should_skip_logging(request.url.path):
            return

        # Determine log level based on status code
        if response.status_code >= 500:
            log_level = logging.ERROR
        elif response.status_code >= 400:
            log_level = logging.WARNING
        else:
            log_level = self.log_level

        logger.log(
            log_level,
            f"Response {response.status_code} for {request.method} {request.url.path} in {process_time:.4f}s",
            extra=log_data
        )

    async def _log_error(self, request: Request, error: Exception, process_time: float, request_id: str):
        """Log request error."""

        log_data = {
            "request_id": request_id,
            "error_type": type(error).__name__,
            "error_message": str(error),
            "process_time": round(process_time, 4)
        }

        logger.error(
            f"Error processing {request.method} {request.url.path}: {str(error)}",
            extra=log_data,
            exc_info=True
        )

    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address."""
        # Check for forwarded headers (when behind proxy)
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()

        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip

        # Fallback to direct connection
        if hasattr(request, "client") and request.client:
            return request.client.host

        return "unknown"

    def _should_skip_logging(self, path: str) -> bool:
        """Determine if request should be skipped from logging."""
        skip_paths = [
            "/health",
            "/ping",
            "/favicon.ico",
            "/robots.txt",
            "/static/",
            "/docs",
            "/redoc",
            "/openapi.json"
        ]

        return any(path.startswith(skip_path) for skip_path in skip_paths)


class MetricsMiddleware(BaseHTTPMiddleware):
    """Middleware for collecting request metrics."""

    def __init__(self, app):
        super().__init__(app)
        self.request_count = 0
        self.error_count = 0
        self.total_process_time = 0.0
        self.status_code_counts = {}
        self.endpoint_metrics = {}

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Collect metrics for requests."""

        start_time = time.time()

        try:
            response = await call_next(request)

            # Update metrics
            process_time = time.time() - start_time
            self._update_metrics(request, response.status_code, process_time)

            return response

        except Exception as e:
            # Update error metrics
            process_time = time.time() - start_time
            self._update_error_metrics(request, process_time)
            raise

    def _update_metrics(self, request: Request, status_code: int, process_time: float):
        """Update request metrics."""
        self.request_count += 1
        self.total_process_time += process_time

        # Status code counts
        self.status_code_counts[status_code] = self.status_code_counts.get(
            status_code, 0) + 1

        # Endpoint metrics
        endpoint = f"{request.method} {request.url.path}"
        if endpoint not in self.endpoint_metrics:
            self.endpoint_metrics[endpoint] = {
                "count": 0,
                "total_time": 0.0,
                "avg_time": 0.0,
                "min_time": float('inf'),
                "max_time": 0.0
            }

        metrics = self.endpoint_metrics[endpoint]
        metrics["count"] += 1
        metrics["total_time"] += process_time
        metrics["avg_time"] = metrics["total_time"] / metrics["count"]
        metrics["min_time"] = min(metrics["min_time"], process_time)
        metrics["max_time"] = max(metrics["max_time"], process_time)

    def _update_error_metrics(self, request: Request, process_time: float):
        """Update error metrics."""
        self.error_count += 1
        self.total_process_time += process_time

    def get_metrics(self) -> dict:
        """Get collected metrics."""
        avg_process_time = (
            self.total_process_time / self.request_count
            if self.request_count > 0 else 0
        )

        return {
            "total_requests": self.request_count,
            "total_errors": self.error_count,
            "error_rate": self.error_count / self.request_count if self.request_count > 0 else 0,
            "avg_process_time": round(avg_process_time, 4),
            "total_process_time": round(self.total_process_time, 4),
            "status_code_counts": self.status_code_counts,
            "endpoint_metrics": self.endpoint_metrics
        }


# Global metrics instance
metrics_middleware = MetricsMiddleware(None)


def get_request_metrics() -> dict:
    """Get current request metrics."""
    return metrics_middleware.get_metrics()


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Middleware for adding comprehensive security headers."""

    def __init__(self, app):
        super().__init__(app)
        self.csp_policy = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self' wss: ws:; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Add comprehensive security headers to response."""

        response = await call_next(request)

        # Core security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Content Security Policy
        response.headers["Content-Security-Policy"] = self.csp_policy

        # Permissions Policy (Feature Policy)
        response.headers["Permissions-Policy"] = (
            "geolocation=(), "
            "microphone=(), "
            "camera=(), "
            "payment=(), "
            "usb=(), "
            "magnetometer=(), "
            "gyroscope=(), "
            "speaker=()"
        )

        # Additional security headers
        response.headers["X-Permitted-Cross-Domain-Policies"] = "none"
        response.headers["Cross-Origin-Embedder-Policy"] = "require-corp"
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
        response.headers["Cross-Origin-Resource-Policy"] = "same-origin"

        # Add HSTS header for HTTPS
        if request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )

        # Cache control for sensitive endpoints
        if self._is_sensitive_endpoint(request.url.path):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"

        return response

    def _is_sensitive_endpoint(self, path: str) -> bool:
        """Check if endpoint contains sensitive data."""
        sensitive_patterns = [
            "/api/auth/",
            "/api/users/",
            "/api/orders/",
            "/api/upload/",
            "/api/files/"
        ]
        return any(path.startswith(pattern) for pattern in sensitive_patterns)
