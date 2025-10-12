"""
Rate limiting implementation for API endpoints.
"""
import time
from typing import Dict, Optional
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
import redis
import json
from datetime import datetime, timedelta

from .config import settings


class RateLimiter:
    """Redis-based rate limiter."""

    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis_client = redis_client or redis.Redis.from_url(
            settings.redis_url)

    def is_allowed(
        self,
        key: str,
        limit: int,
        window: int,
        identifier: str = None
    ) -> tuple[bool, Dict]:
        """
        Check if request is allowed based on rate limit.

        Args:
            key: Rate limit key (e.g., "api:user:123")
            limit: Number of requests allowed
            window: Time window in seconds
            identifier: Additional identifier for the request

        Returns:
            Tuple of (is_allowed, info_dict)
        """
        now = time.time()
        pipeline = self.redis_client.pipeline()

        # Use sliding window log approach
        window_start = now - window

        # Remove old entries
        pipeline.zremrangebyscore(key, 0, window_start)

        # Count current requests
        pipeline.zcard(key)

        # Add current request
        pipeline.zadd(key, {f"{now}:{identifier or ''}": now})

        # Set expiration
        pipeline.expire(key, window + 1)

        results = pipeline.execute()
        current_requests = results[1]

        if current_requests >= limit:
            # Remove the request we just added since it's not allowed
            self.redis_client.zrem(key, f"{now}:{identifier or ''}")

            # Calculate retry after
            oldest_request = self.redis_client.zrange(
                key, 0, 0, withscores=True)
            retry_after = window
            if oldest_request:
                retry_after = int(oldest_request[0][1] + window - now)

            return False, {
                "limit": limit,
                "window": window,
                "current": current_requests,
                "retry_after": max(retry_after, 1)
            }

        return True, {
            "limit": limit,
            "window": window,
            "current": current_requests + 1,
            "remaining": limit - current_requests - 1
        }


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting middleware."""

    def __init__(self, app, rate_limiter: RateLimiter = None):
        super().__init__(app)
        self.rate_limiter = rate_limiter or RateLimiter()

        # Define rate limits for different endpoints
        self.rate_limits = {
            # General API endpoints
            "default": {"limit": 100, "window": 60},  # 100 requests per minute

            # Authentication endpoints
            "/api/auth/verify": {"limit": 10, "window": 60},
            "/api/auth/refresh": {"limit": 5, "window": 60},

            # File upload endpoints
            "/api/upload/initiate": {"limit": 10, "window": 60},
            "/api/upload/complete": {"limit": 10, "window": 60},

            # Analysis endpoints
            "/api/analyze": {"limit": 5, "window": 60},

            # Order creation
            "/api/orders": {"limit": 20, "window": 60},

            # Pricing calculations
            "/api/pricing/calculate": {"limit": 30, "window": 60},
            "/api/pricing/compare": {"limit": 10, "window": 60},
        }

    async def dispatch(self, request: Request, call_next):
        """Apply rate limiting to requests."""

        # Skip rate limiting for certain paths
        if self._should_skip_rate_limiting(request.url.path):
            return await call_next(request)

        # Get client identifier
        client_id = self._get_client_identifier(request)

        # Get rate limit for this endpoint
        rate_limit = self._get_rate_limit_for_path(
            request.url.path, request.method)

        # Check rate limit
        rate_limit_key = f"rate_limit:{client_id}:{request.url.path}"
        is_allowed, info = self.rate_limiter.is_allowed(
            rate_limit_key,
            rate_limit["limit"],
            rate_limit["window"],
            f"{request.method}:{int(time.time())}"
        )

        if not is_allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "error": "Rate limit exceeded",
                    "limit": info["limit"],
                    "window": info["window"],
                    "retry_after": info["retry_after"]
                },
                headers={"Retry-After": str(info["retry_after"])}
            )

        # Process request
        response = await call_next(request)

        # Add rate limit headers
        response.headers["X-RateLimit-Limit"] = str(info["limit"])
        response.headers["X-RateLimit-Remaining"] = str(info["remaining"])
        response.headers["X-RateLimit-Window"] = str(rate_limit["window"])

        return response

    def _should_skip_rate_limiting(self, path: str) -> bool:
        """Check if path should skip rate limiting."""
        skip_paths = [
            "/health",
            "/ping",
            "/docs",
            "/redoc",
            "/openapi.json",
            "/favicon.ico"
        ]
        return any(path.startswith(skip_path) for skip_path in skip_paths)

    def _get_client_identifier(self, request: Request) -> str:
        """Get client identifier for rate limiting."""
        # Try to get user ID from auth
        if hasattr(request.state, "user") and request.state.user:
            return f"user:{request.state.user.id}"

        # Fall back to IP address
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        else:
            client_ip = request.client.host if request.client else "unknown"

        return f"ip:{client_ip}"

    def _get_rate_limit_for_path(self, path: str, method: str) -> Dict:
        """Get rate limit configuration for a specific path."""
        # Check for exact path match
        if path in self.rate_limits:
            return self.rate_limits[path]

        # Check for pattern matches
        for pattern, limit in self.rate_limits.items():
            if pattern != "default" and path.startswith(pattern):
                return limit

        # Apply stricter limits for POST/PUT/DELETE
        if method in ["POST", "PUT", "DELETE"]:
            return {"limit": 50, "window": 60}

        # Default rate limit
        return self.rate_limits["default"]


# Global rate limiter instance
rate_limiter = RateLimiter()


def create_rate_limit_decorator(limit: int, window: int):
    """Create a rate limit decorator for specific endpoints."""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # This would be used with dependency injection in FastAPI
            # For now, it's a placeholder for future implementation
            return await func(*args, **kwargs)
        return wrapper
    return decorator


# Rate limit decorators for common use cases
rate_limit_strict = create_rate_limit_decorator(10, 60)  # 10 per minute
rate_limit_moderate = create_rate_limit_decorator(30, 60)  # 30 per minute
rate_limit_lenient = create_rate_limit_decorator(100, 60)  # 100 per minute
