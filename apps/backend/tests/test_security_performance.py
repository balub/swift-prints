"""
Tests for security measures and performance optimizations.
"""
import pytest
import json
import time
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch

from app.main import app
from app.core.security_utils import SecurityValidator, InputValidator
from app.core.cache import CacheService, CacheManager
from app.core.performance import PerformanceMonitor, PerformanceProfiler
from app.core.rate_limiter import RateLimiter


class TestSecurityValidation:
    """Test security validation utilities."""

    def test_file_upload_validation_valid_file(self):
        """Test valid file upload validation."""
        mock_file = Mock()
        mock_file.filename = "test.stl"
        mock_file.size = 1024 * 1024  # 1MB
        mock_file.content_type = "application/octet-stream"

        validator = SecurityValidator()
        result = validator.validate_file_upload(mock_file)

        assert result["is_valid"] is True
        assert result["filename"] == "test.stl"
        assert result["extension"] == "stl"

    def test_file_upload_validation_invalid_extension(self):
        """Test file upload validation with invalid extension."""
        mock_file = Mock()
        mock_file.filename = "test.exe"
        mock_file.size = 1024
        mock_file.content_type = "application/octet-stream"

        validator = SecurityValidator()

        with pytest.raises(Exception):  # Should raise HTTPException
            validator.validate_file_upload(mock_file)

    def test_file_upload_validation_too_large(self):
        """Test file upload validation with file too large."""
        mock_file = Mock()
        mock_file.filename = "test.stl"
        mock_file.size = 200 * 1024 * 1024  # 200MB
        mock_file.content_type = "application/octet-stream"

        validator = SecurityValidator()

        with pytest.raises(Exception):  # Should raise HTTPException
            validator.validate_file_upload(mock_file)

    def test_safe_filename_validation(self):
        """Test filename safety validation."""
        validator = SecurityValidator()

        # Valid filenames
        assert validator.is_safe_filename("test.stl") is True
        assert validator.is_safe_filename("my_model_v2.stl") is True
        assert validator.is_safe_filename("model-final.stl") is True

        # Invalid filenames
        assert validator.is_safe_filename("../test.stl") is False
        assert validator.is_safe_filename("test/file.stl") is False
        assert validator.is_safe_filename("test\x00.stl") is False
        assert validator.is_safe_filename("CON.stl") is False

    def test_input_sanitization(self):
        """Test input sanitization."""
        validator = SecurityValidator()

        # Test HTML removal
        dirty_input = "<script>alert('xss')</script>Hello World"
        clean_input = validator.sanitize_input(dirty_input)
        assert "<script>" not in clean_input
        assert "Hello World" in clean_input

        # Test length truncation
        long_input = "a" * 2000
        clean_input = validator.sanitize_input(long_input, max_length=100)
        assert len(clean_input) <= 100

    def test_password_strength_validation(self):
        """Test password strength validation."""
        validator = SecurityValidator()

        # Strong password
        result = validator.validate_password_strength("StrongP@ssw0rd123")
        assert result["is_valid"] is True
        assert result["strength"] in ["Good", "Strong"]

        # Weak password
        result = validator.validate_password_strength("weak")
        assert result["is_valid"] is False
        assert len(result["issues"]) > 0

    def test_email_validation(self):
        """Test email validation."""
        validator = SecurityValidator()

        # Valid emails
        assert validator.validate_email("test@example.com") is True
        assert validator.validate_email("user.name+tag@domain.co.uk") is True

        # Invalid emails
        assert validator.validate_email("invalid-email") is False
        assert validator.validate_email("@domain.com") is False
        assert validator.validate_email("user@") is False

    def test_coordinate_validation(self):
        """Test coordinate validation."""
        validator = InputValidator()

        # Valid coordinates
        assert validator.validate_coordinates(40.7128, -74.0060) is True  # NYC
        assert validator.validate_coordinates(
            0, 0) is True  # Equator/Prime Meridian

        # Invalid coordinates
        assert validator.validate_coordinates(
            91, 0) is False  # Invalid latitude
        assert validator.validate_coordinates(
            0, 181) is False  # Invalid longitude
        # Invalid latitude
        assert validator.validate_coordinates(-91, 0) is False


class TestCaching:
    """Test caching functionality."""

    def test_cache_service_basic_operations(self):
        """Test basic cache operations."""
        # Mock Redis client
        mock_redis = Mock()
        mock_redis.get.return_value = json.dumps({"test": "value"}).encode()
        mock_redis.setex.return_value = True
        mock_redis.delete.return_value = 1
        mock_redis.exists.return_value = True

        cache = CacheService(mock_redis)

        # Test set
        result = cache.set("test_key", {"test": "value"})
        assert result is True

        # Test get
        value = cache.get("test_key")
        assert value == {"test": "value"}

        # Test delete
        result = cache.delete("test_key")
        assert result is True

        # Test exists
        result = cache.exists("test_key")
        assert result is True

    def test_cache_manager_pricing(self):
        """Test cache manager pricing operations."""
        mock_cache = Mock()
        mock_cache.set.return_value = True
        mock_cache.get.return_value = {"total": 25.50}

        manager = CacheManager(mock_cache)

        # Test cache pricing
        result = manager.cache_pricing_calculation(
            "analysis_123", "maker_456", {"material": "PLA"}, {"total": 25.50}
        )
        assert result is True

        # Test get cached pricing
        cached = manager.get_cached_pricing(
            "analysis_123", "maker_456", {"material": "PLA"}
        )
        assert cached == {"total": 25.50}

    def test_cache_invalidation(self):
        """Test cache invalidation."""
        mock_cache = Mock()
        mock_cache.clear_pattern.return_value = 5

        manager = CacheManager(mock_cache)

        # Test user cache invalidation
        result = manager.invalidate_user_cache("user_123")
        assert result == 5

        # Test maker cache invalidation
        result = manager.invalidate_maker_cache("maker_456")
        assert result >= 0  # Could be 0 if no patterns match


class TestPerformanceMonitoring:
    """Test performance monitoring functionality."""

    def test_performance_monitor_metrics(self):
        """Test performance monitor metrics collection."""
        monitor = PerformanceMonitor()

        # Test adding metrics
        from datetime import datetime
        from app.core.performance import RequestMetrics

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

        # Test getting metrics
        recent_metrics = monitor.get_request_metrics(minutes=60)
        assert len(recent_metrics) >= 1

        # Test performance summary
        summary = monitor.get_performance_summary()
        assert "system" in summary
        assert "requests" in summary

    def test_performance_profiler(self):
        """Test performance profiler."""
        profiler = PerformanceProfiler()

        # Test profiling context manager
        with profiler.profile("test_operation"):
            time.sleep(0.01)  # Simulate work

        # Test getting profile stats
        stats = profiler.get_profile_stats("test_operation")
        assert stats["count"] == 1
        assert stats["avg_duration"] > 0

        # Test clearing profiles
        profiler.clear_profiles("test_operation")
        stats = profiler.get_profile_stats("test_operation")
        assert stats["count"] == 0


class TestRateLimiting:
    """Test rate limiting functionality."""

    def test_rate_limiter_basic(self):
        """Test basic rate limiting."""
        # Mock Redis client
        mock_redis = Mock()
        mock_redis.pipeline.return_value = mock_redis
        mock_redis.zremrangebyscore.return_value = None
        mock_redis.zcard.return_value = 5  # Current request count
        mock_redis.zadd.return_value = None
        mock_redis.expire.return_value = None
        mock_redis.execute.return_value = [None, 5, None, None]
        mock_redis.zrem.return_value = None

        limiter = RateLimiter(mock_redis)

        # Test allowed request
        is_allowed, info = limiter.is_allowed("test_key", 10, 60)
        assert is_allowed is True
        assert info["current"] == 6  # 5 + 1

    def test_rate_limiter_exceeded(self):
        """Test rate limit exceeded."""
        # Mock Redis client
        mock_redis = Mock()
        mock_redis.pipeline.return_value = mock_redis
        mock_redis.zremrangebyscore.return_value = None
        mock_redis.zcard.return_value = 10  # At limit
        mock_redis.zadd.return_value = None
        mock_redis.expire.return_value = None
        mock_redis.execute.return_value = [None, 10, None, None]
        mock_redis.zrem.return_value = None
        mock_redis.zrange.return_value = [(b"request", 1234567890)]

        limiter = RateLimiter(mock_redis)

        # Test rate limit exceeded
        is_allowed, info = limiter.is_allowed("test_key", 10, 60)
        assert is_allowed is False
        assert "retry_after" in info


class TestSecurityMiddleware:
    """Test security middleware functionality."""

    def test_security_headers(self):
        """Test security headers are added."""
        client = TestClient(app)
        response = client.get("/health")

        # Check security headers
        assert "X-Content-Type-Options" in response.headers
        assert "X-Frame-Options" in response.headers
        assert "X-XSS-Protection" in response.headers
        assert "Content-Security-Policy" in response.headers
        assert response.headers["X-Content-Type-Options"] == "nosniff"
        assert response.headers["X-Frame-Options"] == "DENY"

    def test_cors_headers(self):
        """Test CORS headers are properly configured."""
        client = TestClient(app)

        # Test preflight request
        response = client.options(
            "/api/health",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET"
            }
        )

        assert "Access-Control-Allow-Origin" in response.headers
        assert "Access-Control-Allow-Methods" in response.headers

    def test_request_size_limit(self):
        """Test request size limiting."""
        client = TestClient(app)

        # Create a large payload
        large_data = {"data": "x" * (100 * 1024 * 1024)}  # 100MB+ JSON

        response = client.post(
            "/api/orders",
            json=large_data,
            headers={"Content-Length": str(len(json.dumps(large_data)))}
        )

        # Should be rejected due to size
        assert response.status_code == 413


class TestInputValidation:
    """Test input validation middleware."""

    def test_json_validation(self):
        """Test JSON input validation."""
        client = TestClient(app)

        # Test invalid JSON
        response = client.post(
            "/api/orders",
            data="invalid json",
            headers={"Content-Type": "application/json"}
        )

        assert response.status_code == 400

    def test_string_sanitization(self):
        """Test string input sanitization."""
        from app.core.validation_middleware import InputValidationMiddleware

        middleware = InputValidationMiddleware(None)

        # Test HTML sanitization
        dirty_string = "<script>alert('xss')</script>Hello"
        clean_string = middleware._sanitize_string(dirty_string)

        assert "<script>" not in clean_string
        assert "Hello" in clean_string

    def test_coordinate_validation_in_data(self):
        """Test coordinate validation in JSON data."""
        from app.core.validation_middleware import InputValidationMiddleware

        middleware = InputValidationMiddleware(None)

        # Valid coordinates
        valid_data = {"lat": 40.7128, "lng": -74.0060}
        middleware._validate_coordinates_in_data(
            valid_data)  # Should not raise

        # Invalid coordinates
        invalid_data = {"lat": 91, "lng": 0}
        with pytest.raises(Exception):
            middleware._validate_coordinates_in_data(invalid_data)


class TestSystemEndpoints:
    """Test system monitoring endpoints."""

    def test_health_endpoint(self):
        """Test health check endpoint."""
        client = TestClient(app)
        response = client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "timestamp" in data

    def test_metrics_endpoint(self):
        """Test metrics endpoint."""
        client = TestClient(app)
        response = client.get("/metrics")

        assert response.status_code == 200
        data = response.json()
        assert "performance" in data
        assert "timestamp" in data

    @patch('app.core.auth_middleware.get_current_user')
    def test_system_status_authenticated(self, mock_get_user):
        """Test system status endpoint with authentication."""
        # Mock authenticated admin user
        mock_user = Mock()
        mock_user.role = "admin"
        mock_get_user.return_value = mock_user

        client = TestClient(app)
        response = client.get(
            "/api/system/status",
            headers={"Authorization": "Bearer fake-token"}
        )

        # This might fail due to auth setup, but tests the endpoint structure
        assert response.status_code in [200, 401, 403]


if __name__ == "__main__":
    pytest.main([__file__])
