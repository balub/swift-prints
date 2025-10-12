"""
Caching service for performance optimization.
"""
import json
import pickle
import hashlib
from typing import Any, Optional, Union, Dict, List
from datetime import datetime, timedelta
import redis
import logging
from functools import wraps

from .config import settings

logger = logging.getLogger(__name__)


class CacheService:
    """Redis-based caching service with multiple serialization options."""

    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis_client = redis_client or redis.Redis.from_url(
            settings.redis_url, decode_responses=False
        )
        self.default_ttl = 3600  # 1 hour default TTL

    def get(self, key: str, use_json: bool = True) -> Optional[Any]:
        """
        Get value from cache.

        Args:
            key: Cache key
            use_json: Whether to use JSON serialization (vs pickle)

        Returns:
            Cached value or None if not found
        """
        try:
            value = self.redis_client.get(key)
            if value is None:
                return None

            if use_json:
                return json.loads(value.decode('utf-8'))
            else:
                return pickle.loads(value)

        except Exception as e:
            logger.error(f"Cache get error for key {key}: {e}")
            return None

    def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None,
        use_json: bool = True
    ) -> bool:
        """
        Set value in cache.

        Args:
            key: Cache key
            value: Value to cache
            ttl: Time to live in seconds
            use_json: Whether to use JSON serialization (vs pickle)

        Returns:
            True if successful
        """
        try:
            ttl = ttl or self.default_ttl

            if use_json:
                serialized_value = json.dumps(value, default=str)
            else:
                serialized_value = pickle.dumps(value)

            return self.redis_client.setex(key, ttl, serialized_value)

        except Exception as e:
            logger.error(f"Cache set error for key {key}: {e}")
            return False

    def delete(self, key: str) -> bool:
        """
        Delete value from cache.

        Args:
            key: Cache key to delete

        Returns:
            True if key was deleted
        """
        try:
            return bool(self.redis_client.delete(key))
        except Exception as e:
            logger.error(f"Cache delete error for key {key}: {e}")
            return False

    def exists(self, key: str) -> bool:
        """
        Check if key exists in cache.

        Args:
            key: Cache key to check

        Returns:
            True if key exists
        """
        try:
            return bool(self.redis_client.exists(key))
        except Exception as e:
            logger.error(f"Cache exists error for key {key}: {e}")
            return False

    def increment(self, key: str, amount: int = 1, ttl: Optional[int] = None) -> int:
        """
        Increment a numeric value in cache.

        Args:
            key: Cache key
            amount: Amount to increment by
            ttl: Time to live for new keys

        Returns:
            New value after increment
        """
        try:
            pipeline = self.redis_client.pipeline()
            pipeline.incrby(key, amount)
            if ttl:
                pipeline.expire(key, ttl)
            results = pipeline.execute()
            return results[0]
        except Exception as e:
            logger.error(f"Cache increment error for key {key}: {e}")
            return 0

    def get_many(self, keys: List[str], use_json: bool = True) -> Dict[str, Any]:
        """
        Get multiple values from cache.

        Args:
            keys: List of cache keys
            use_json: Whether to use JSON serialization

        Returns:
            Dictionary of key-value pairs
        """
        try:
            values = self.redis_client.mget(keys)
            result = {}

            for key, value in zip(keys, values):
                if value is not None:
                    try:
                        if use_json:
                            result[key] = json.loads(value.decode('utf-8'))
                        else:
                            result[key] = pickle.loads(value)
                    except Exception as e:
                        logger.error(
                            f"Error deserializing cached value for key {key}: {e}")

            return result

        except Exception as e:
            logger.error(f"Cache get_many error: {e}")
            return {}

    def set_many(
        self,
        mapping: Dict[str, Any],
        ttl: Optional[int] = None,
        use_json: bool = True
    ) -> bool:
        """
        Set multiple values in cache.

        Args:
            mapping: Dictionary of key-value pairs
            ttl: Time to live in seconds
            use_json: Whether to use JSON serialization

        Returns:
            True if successful
        """
        try:
            ttl = ttl or self.default_ttl
            pipeline = self.redis_client.pipeline()

            for key, value in mapping.items():
                if use_json:
                    serialized_value = json.dumps(value, default=str)
                else:
                    serialized_value = pickle.dumps(value)

                pipeline.setex(key, ttl, serialized_value)

            pipeline.execute()
            return True

        except Exception as e:
            logger.error(f"Cache set_many error: {e}")
            return False

    def clear_pattern(self, pattern: str) -> int:
        """
        Clear all keys matching a pattern.

        Args:
            pattern: Redis pattern (e.g., "user:*")

        Returns:
            Number of keys deleted
        """
        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                return self.redis_client.delete(*keys)
            return 0
        except Exception as e:
            logger.error(
                f"Cache clear_pattern error for pattern {pattern}: {e}")
            return 0

    def get_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics.

        Returns:
            Dictionary with cache stats
        """
        try:
            info = self.redis_client.info()
            return {
                "connected_clients": info.get("connected_clients", 0),
                "used_memory": info.get("used_memory", 0),
                "used_memory_human": info.get("used_memory_human", "0B"),
                "keyspace_hits": info.get("keyspace_hits", 0),
                "keyspace_misses": info.get("keyspace_misses", 0),
                "total_commands_processed": info.get("total_commands_processed", 0),
                "uptime_in_seconds": info.get("uptime_in_seconds", 0)
            }
        except Exception as e:
            logger.error(f"Error getting cache stats: {e}")
            return {}


class CacheManager:
    """High-level cache manager with domain-specific methods."""

    def __init__(self, cache_service: Optional[CacheService] = None):
        self.cache = cache_service or CacheService()

    def cache_pricing_calculation(
        self,
        analysis_id: str,
        maker_id: str,
        settings: Dict,
        result: Dict,
        ttl: int = 1800  # 30 minutes
    ) -> bool:
        """Cache pricing calculation result."""
        key = self._generate_pricing_key(analysis_id, maker_id, settings)
        return self.cache.set(key, result, ttl=ttl)

    def get_cached_pricing(
        self,
        analysis_id: str,
        maker_id: str,
        settings: Dict
    ) -> Optional[Dict]:
        """Get cached pricing calculation."""
        key = self._generate_pricing_key(analysis_id, maker_id, settings)
        return self.cache.get(key)

    def cache_maker_search(
        self,
        search_params: Dict,
        results: List[Dict],
        ttl: int = 600  # 10 minutes
    ) -> bool:
        """Cache maker search results."""
        key = self._generate_search_key("makers", search_params)
        return self.cache.set(key, results, ttl=ttl)

    def get_cached_maker_search(self, search_params: Dict) -> Optional[List[Dict]]:
        """Get cached maker search results."""
        key = self._generate_search_key("makers", search_params)
        return self.cache.get(key)

    def cache_analysis_result(
        self,
        file_id: str,
        settings: Dict,
        result: Dict,
        ttl: int = 86400  # 24 hours
    ) -> bool:
        """Cache STL analysis result."""
        key = f"analysis:{file_id}:{self._hash_dict(settings)}"
        return self.cache.set(key, result, ttl=ttl)

    def get_cached_analysis(self, file_id: str, settings: Dict) -> Optional[Dict]:
        """Get cached STL analysis result."""
        key = f"analysis:{file_id}:{self._hash_dict(settings)}"
        return self.cache.get(key)

    def cache_user_session(
        self,
        user_id: str,
        session_data: Dict,
        ttl: int = 3600  # 1 hour
    ) -> bool:
        """Cache user session data."""
        key = f"session:{user_id}"
        return self.cache.set(key, session_data, ttl=ttl)

    def get_user_session(self, user_id: str) -> Optional[Dict]:
        """Get cached user session data."""
        key = f"session:{user_id}"
        return self.cache.get(key)

    def invalidate_user_cache(self, user_id: str) -> int:
        """Invalidate all cache entries for a user."""
        pattern = f"*:{user_id}:*"
        return self.cache.clear_pattern(pattern)

    def invalidate_maker_cache(self, maker_id: str) -> int:
        """Invalidate all cache entries for a maker."""
        patterns = [
            f"pricing:*:{maker_id}:*",
            f"maker:{maker_id}:*",
            "makers:search:*"  # Clear all maker searches
        ]
        total_deleted = 0
        for pattern in patterns:
            total_deleted += self.cache.clear_pattern(pattern)
        return total_deleted

    def _generate_pricing_key(self, analysis_id: str, maker_id: str, settings: Dict) -> str:
        """Generate cache key for pricing calculations."""
        settings_hash = self._hash_dict(settings)
        return f"pricing:{analysis_id}:{maker_id}:{settings_hash}"

    def _generate_search_key(self, entity_type: str, params: Dict) -> str:
        """Generate cache key for search results."""
        params_hash = self._hash_dict(params)
        return f"{entity_type}:search:{params_hash}"

    def _hash_dict(self, data: Dict) -> str:
        """Generate consistent hash for dictionary data."""
        # Sort keys to ensure consistent hashing
        sorted_data = json.dumps(data, sort_keys=True, default=str)
        return hashlib.md5(sorted_data.encode()).hexdigest()


# Decorator for caching function results
def cached(
    ttl: int = 3600,
    key_prefix: str = "",
    use_json: bool = True,
    cache_service: Optional[CacheService] = None
):
    """
    Decorator to cache function results.

    Args:
        ttl: Time to live in seconds
        key_prefix: Prefix for cache keys
        use_json: Whether to use JSON serialization
        cache_service: Cache service instance
    """
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            cache = cache_service or CacheService()

            # Generate cache key from function name and arguments
            key_parts = [key_prefix, func.__name__]
            if args:
                key_parts.extend(str(arg) for arg in args)
            if kwargs:
                key_parts.append(hashlib.md5(
                    json.dumps(kwargs, sort_keys=True, default=str).encode()
                ).hexdigest())

            cache_key = ":".join(filter(None, key_parts))

            # Try to get from cache
            cached_result = cache.get(cache_key, use_json=use_json)
            if cached_result is not None:
                return cached_result

            # Execute function and cache result
            result = await func(*args, **kwargs)
            cache.set(cache_key, result, ttl=ttl, use_json=use_json)
            return result

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            cache = cache_service or CacheService()

            # Generate cache key from function name and arguments
            key_parts = [key_prefix, func.__name__]
            if args:
                key_parts.extend(str(arg) for arg in args)
            if kwargs:
                key_parts.append(hashlib.md5(
                    json.dumps(kwargs, sort_keys=True, default=str).encode()
                ).hexdigest())

            cache_key = ":".join(filter(None, key_parts))

            # Try to get from cache
            cached_result = cache.get(cache_key, use_json=use_json)
            if cached_result is not None:
                return cached_result

            # Execute function and cache result
            result = func(*args, **kwargs)
            cache.set(cache_key, result, ttl=ttl, use_json=use_json)
            return result

        # Return appropriate wrapper based on function type
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper

    return decorator


# Global cache instances
cache_service = CacheService()
cache_manager = CacheManager(cache_service)
