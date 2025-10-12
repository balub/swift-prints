"""
Performance optimization utilities.
"""
import asyncio
import time
import functools
from typing import Any, Callable, Dict, Optional, Union
from datetime import datetime, timedelta
import redis
import json
import hashlib
from sqlalchemy.orm import Session
from sqlalchemy import text

from .config import settings


class CacheManager:
    """Redis-based caching manager."""

    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis_client = redis_client or redis.Redis.from_url(
            settings.redis_url)
        self.default_ttl = 300  # 5 minutes

    def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        try:
            data = self.redis_client.get(key)
            if data:
                return json.loads(data)
        except Exception:
            pass
        return None

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache."""
        try:
            ttl = ttl or self.default_ttl
            serialized = json.dumps(value, default=str)
            return self.redis_client.setex(key, ttl, serialized)
        except Exception:
            return False

    def delete(self, key: str) -> bool:
        """Delete key from cache."""
        try:
            return bool(self.redis_client.delete(key))
        except Exception:
            return False

    def exists(self, key: str) -> bool:
        """Check if key exists in cache."""
        try:
            return bool(self.redis_client.exists(key))
        except Exception:
            return False

    def invalidate_pattern(self, pattern: str) -> int:
        """Invalidate all keys matching pattern."""
        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                return self.redis_client.delete(*keys)
        except Exception:
            pass
        return 0

    def get_or_set(self, key: str, func: Callable, ttl: Optional[int] = None) -> Any:
        """Get from cache or execute function and cache result."""
        # Try to get from cache first
        cached_value = self.get(key)
        if cached_value is not None:
            return cached_value

        # Execute function and cache result
        result = func()
        self.set(key, result, ttl)
        return result


def cache_result(ttl: int = 300, key_prefix: str = ""):
    """
    Decorator to cache function results.

    Args:
        ttl: Time to live in seconds
        key_prefix: Prefix for cache key
    """
    def decorator(func: Callable) -> Callable:
        cache_manager = CacheManager()

        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key from function name and arguments
            key_parts = [key_prefix, func.__name__]

            # Add args to key
            if args:
                args_str = str(hash(str(args)))
                key_parts.append(args_str)

            # Add kwargs to key
            if kwargs:
                kwargs_str = str(hash(str(sorted(kwargs.items()))))
                key_parts.append(kwargs_str)

            cache_key = ":".join(filter(None, key_parts))

            # Try to get from cache
            cached_result = cache_manager.get(cache_key)
            if cached_result is not None:
                return cached_result

            # Execute function and cache result
            result = func(*args, **kwargs)
            cache_manager.set(cache_key, result, ttl)
            return result

        return wrapper
    return decorator


def async_cache_result(ttl: int = 300, key_prefix: str = ""):
    """
    Decorator to cache async function results.

    Args:
        ttl: Time to live in seconds
        key_prefix: Prefix for cache key
    """
    def decorator(func: Callable) -> Callable:
        cache_manager = CacheManager()

        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key
            key_parts = [key_prefix, func.__name__]

            if args:
                args_str = str(hash(str(args)))
                key_parts.append(args_str)

            if kwargs:
                kwargs_str = str(hash(str(sorted(kwargs.items()))))
                key_parts.append(kwargs_str)

            cache_key = ":".join(filter(None, key_parts))

            # Try to get from cache
            cached_result = cache_manager.get(cache_key)
            if cached_result is not None:
                return cached_result

            # Execute function and cache result
            result = await func(*args, **kwargs)
            cache_manager.set(cache_key, result, ttl)
            return result

        return wrapper
    return decorator


class DatabaseOptimizer:
    """Database performance optimization utilities."""

    @staticmethod
    def optimize_query_performance(db: Session):
        """Apply database optimizations."""
        # Enable query plan caching
        db.execute(text("SET shared_preload_libraries = 'pg_stat_statements'"))

        # Set work memory for complex queries
        db.execute(text("SET work_mem = '256MB'"))

        # Enable parallel query execution
        db.execute(text("SET max_parallel_workers_per_gather = 4"))

    @staticmethod
    def analyze_slow_queries(db: Session) -> list:
        """Get slow query statistics."""
        try:
            result = db.execute(text("""
                SELECT query, calls, total_time, mean_time, rows
                FROM pg_stat_statements
                WHERE mean_time > 100
                ORDER BY mean_time DESC
                LIMIT 10
            """))
            return [dict(row) for row in result]
        except Exception:
            return []

    @staticmethod
    def get_table_sizes(db: Session) -> list:
        """Get table sizes for optimization analysis."""
        try:
            result = db.execute(text("""
                SELECT 
                    schemaname,
                    tablename,
                    attname,
                    n_distinct,
                    correlation
                FROM pg_stats
                WHERE schemaname = 'public'
                ORDER BY tablename, attname
            """))
            return [dict(row) for row in result]
        except Exception:
            return []


class PerformanceMonitor:
    """Performance monitoring utilities."""

    def __init__(self):
        self.metrics = {}
        self.cache_manager = CacheManager()

    def record_metric(self, name: str, value: float, tags: Optional[Dict] = None):
        """Record a performance metric."""
        timestamp = time.time()
        metric_data = {
            "value": value,
            "timestamp": timestamp,
            "tags": tags or {}
        }

        # Store in Redis with TTL
        key = f"metrics:{name}:{int(timestamp)}"
        self.cache_manager.set(key, metric_data, ttl=3600)  # 1 hour

    def get_metrics(self, name: str, duration_minutes: int = 60) -> list:
        """Get metrics for the specified duration."""
        end_time = time.time()
        start_time = end_time - (duration_minutes * 60)

        metrics = []
        try:
            # This is a simplified version - in production, use a proper time series DB
            pattern = f"metrics:{name}:*"
            keys = self.cache_manager.redis_client.keys(pattern)

            for key in keys:
                timestamp = int(key.decode().split(':')[-1])
                if start_time <= timestamp <= end_time:
                    metric_data = self.cache_manager.get(key.decode())
                    if metric_data:
                        metrics.append(metric_data)
        except Exception:
            pass

        return sorted(metrics, key=lambda x: x['timestamp'])


def measure_performance(metric_name: str):
    """Decorator to measure function performance."""
    def decorator(func: Callable) -> Callable:
        monitor = PerformanceMonitor()

        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                success = True
            except Exception as e:
                success = False
                raise
            finally:
                duration = time.time() - start_time
                monitor.record_metric(
                    f"{metric_name}_duration",
                    duration,
                    {"function": func.__name__, "success": success}
                )
            return result

        return wrapper
    return decorator


def measure_async_performance(metric_name: str):
    """Decorator to measure async function performance."""
    def decorator(func: Callable) -> Callable:
        monitor = PerformanceMonitor()

        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                success = True
            except Exception as e:
                success = False
                raise
            finally:
                duration = time.time() - start_time
                monitor.record_metric(
                    f"{metric_name}_duration",
                    duration,
                    {"function": func.__name__, "success": success}
                )
            return result

        return wrapper
    return decorator


class ConnectionPool:
    """Database connection pooling utilities."""

    @staticmethod
    def configure_pool_settings():
        """Return optimized connection pool settings."""
        return {
            "pool_size": 20,
            "max_overflow": 30,
            "pool_timeout": 30,
            "pool_recycle": 3600,  # 1 hour
            "pool_pre_ping": True
        }


class QueryOptimizer:
    """SQL query optimization utilities."""

    @staticmethod
    def add_pagination_hints(query, limit: int, offset: int):
        """Add pagination optimization hints."""
        # For large offsets, consider using cursor-based pagination
        if offset > 10000:
            # Log warning about performance
            pass

        return query.limit(limit).offset(offset)

    @staticmethod
    def optimize_joins(query):
        """Optimize query joins."""
        # Add join optimization hints
        return query

    @staticmethod
    def add_index_hints(query, indexes: list):
        """Add index usage hints."""
        # This would be database-specific
        return query


# Global instances
cache_manager = CacheManager()
performance_monitor = PerformanceMonitor()
db_optimizer = DatabaseOptimizer()


# Utility functions for common caching patterns
def cache_user_data(user_id: str, data: Dict, ttl: int = 900):
    """Cache user-specific data."""
    key = f"user:{user_id}:data"
    return cache_manager.set(key, data, ttl)


def get_cached_user_data(user_id: str) -> Optional[Dict]:
    """Get cached user data."""
    key = f"user:{user_id}:data"
    return cache_manager.get(key)


def cache_pricing_data(analysis_id: str, maker_id: str, pricing: Dict, ttl: int = 300):
    """Cache pricing calculation results."""
    key = f"pricing:{analysis_id}:{maker_id}"
    return cache_manager.set(key, pricing, ttl)


def get_cached_pricing(analysis_id: str, maker_id: str) -> Optional[Dict]:
    """Get cached pricing data."""
    key = f"pricing:{analysis_id}:{maker_id}"
    return cache_manager.get(key)


def invalidate_user_cache(user_id: str):
    """Invalidate all cached data for a user."""
    pattern = f"user:{user_id}:*"
    return cache_manager.invalidate_pattern(pattern)


def invalidate_maker_cache(maker_id: str):
    """Invalidate all cached data for a maker."""
    pattern = f"maker:{maker_id}:*"
    return cache_manager.invalidate_pattern(pattern)
