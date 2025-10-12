#!/usr/bin/env python3
"""
Simple test script to verify security and performance implementations.
"""
import sys
import os
sys.path.append('.')


def test_security_utils():
    """Test security utilities."""
    print("Testing Security Utils...")

    try:
        from app.core.security_utils import SecurityValidator, InputValidator

        validator = SecurityValidator()
        input_validator = InputValidator()

        # Test filename validation
        assert validator.is_safe_filename("test.stl") == True
        assert validator.is_safe_filename("../test.stl") == False
        print("✓ Filename validation works")

        # Test input sanitization
        dirty_input = "<script>alert('xss')</script>Hello"
        clean_input = validator.sanitize_input(dirty_input)
        assert "<script>" not in clean_input
        assert "Hello" in clean_input
        print("✓ Input sanitization works")

        # Test email validation
        assert validator.validate_email("test@example.com") == True
        assert validator.validate_email("invalid-email") == False
        print("✓ Email validation works")

        # Test coordinate validation
        assert input_validator.validate_coordinates(40.7128, -74.0060) == True
        assert input_validator.validate_coordinates(91, 0) == False
        print("✓ Coordinate validation works")

        print("✅ Security Utils: All tests passed!")
        return True

    except Exception as e:
        print(f"❌ Security Utils: Error - {e}")
        return False


def test_cache_service():
    """Test cache service."""
    print("\nTesting Cache Service...")

    try:
        from app.core.cache import CacheService, CacheManager
        from unittest.mock import Mock
        import json

        # Mock Redis client
        mock_redis = Mock()
        mock_redis.get.return_value = json.dumps({"test": "value"}).encode()
        mock_redis.setex.return_value = True
        mock_redis.delete.return_value = 1
        mock_redis.exists.return_value = True

        cache = CacheService(mock_redis)

        # Test basic operations
        assert cache.set("test_key", {"test": "value"}) == True
        assert cache.get("test_key") == {"test": "value"}
        assert cache.delete("test_key") == True
        assert cache.exists("test_key") == True
        print("✓ Basic cache operations work")

        # Test cache manager
        manager = CacheManager(cache)
        result = manager.cache_pricing_calculation(
            "analysis_123", "maker_456", {"material": "PLA"}, {"total": 25.50}
        )
        assert result == True
        print("✓ Cache manager works")

        print("✅ Cache Service: All tests passed!")
        return True

    except Exception as e:
        print(f"❌ Cache Service: Error - {e}")
        return False


def test_performance_monitor():
    """Test performance monitoring."""
    print("\nTesting Performance Monitor...")

    try:
        from app.core.performance import PerformanceMonitor, PerformanceProfiler, RequestMetrics
        from datetime import datetime

        monitor = PerformanceMonitor()
        profiler = PerformanceProfiler()

        # Test adding request metrics
        metrics = RequestMetrics(
            endpoint="/api/test",
            method="GET",
            status_code=200,
            duration=0.5,
            memory_usage=10.0,
            cpu_usage=5.0,
            timestamp=datetime.utcnow()
        )

        monitor.add_request_metric(metrics)
        recent_metrics = monitor.get_request_metrics(minutes=60)
        assert len(recent_metrics) >= 1
        print("✓ Request metrics collection works")

        # Test performance summary
        summary = monitor.get_performance_summary()
        assert "system" in summary
        assert "requests" in summary
        print("✓ Performance summary works")

        # Test profiler
        with profiler.profile("test_operation"):
            import time
            time.sleep(0.001)  # Simulate work

        stats = profiler.get_profile_stats("test_operation")
        assert stats["count"] == 1
        assert stats["avg_duration"] > 0
        print("✓ Performance profiler works")

        print("✅ Performance Monitor: All tests passed!")
        return True

    except Exception as e:
        print(f"❌ Performance Monitor: Error - {e}")
        return False


def test_rate_limiter():
    """Test rate limiting."""
    print("\nTesting Rate Limiter...")

    try:
        from app.core.rate_limiter import RateLimiter
        from unittest.mock import Mock

        # Mock Redis client
        mock_redis = Mock()
        mock_redis.pipeline.return_value = mock_redis
        mock_redis.zremrangebyscore.return_value = None
        mock_redis.zcard.return_value = 5  # Current request count
        mock_redis.zadd.return_value = None
        mock_redis.expire.return_value = None
        mock_redis.execute.return_value = [None, 5, None, None]

        limiter = RateLimiter(mock_redis)

        # Test allowed request
        is_allowed, info = limiter.is_allowed("test_key", 10, 60)
        assert is_allowed == True
        assert info["current"] == 6  # 5 + 1
        print("✓ Rate limiting allows valid requests")

        # Test rate limit exceeded
        mock_redis.execute.return_value = [None, 10, None, None]  # At limit
        mock_redis.zrem.return_value = None
        mock_redis.zrange.return_value = [(b"request", 1234567890)]

        is_allowed, info = limiter.is_allowed("test_key", 10, 60)
        assert is_allowed == False
        assert "retry_after" in info
        print("✓ Rate limiting blocks excessive requests")

        print("✅ Rate Limiter: All tests passed!")
        return True

    except Exception as e:
        print(f"❌ Rate Limiter: Error - {e}")
        return False


def test_validation_middleware():
    """Test validation middleware."""
    print("\nTesting Validation Middleware...")

    try:
        from app.core.validation_middleware import InputValidationMiddleware

        middleware = InputValidationMiddleware(None)

        # Test string sanitization
        dirty_string = "<script>alert('xss')</script>Hello"
        clean_string = middleware._sanitize_string(dirty_string)
        assert "<script>" not in clean_string
        assert "Hello" in clean_string
        print("✓ String sanitization works")

        # Test coordinate validation
        valid_data = {"lat": 40.7128, "lng": -74.0060}
        middleware._validate_coordinates_in_data(
            valid_data)  # Should not raise
        print("✓ Coordinate validation in data works")

        print("✅ Validation Middleware: All tests passed!")
        return True

    except Exception as e:
        print(f"❌ Validation Middleware: Error - {e}")
        return False


def main():
    """Run all tests."""
    print("🚀 Testing Security and Performance Implementation")
    print("=" * 60)

    tests = [
        test_security_utils,
        test_cache_service,
        test_performance_monitor,
        test_rate_limiter,
        test_validation_middleware
    ]

    passed = 0
    total = len(tests)

    for test in tests:
        if test():
            passed += 1

    print("\n" + "=" * 60)
    print(f"📊 Test Results: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 All security and performance features implemented successfully!")
        return True
    else:
        print("⚠️  Some tests failed. Please check the implementation.")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
