"""
Tests for authentication system.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

from app.services.auth_service import AuthService
from app.models import User, UserRole
from app.core.security import SecurityUtils


class TestAuthService:
    """Test authentication service."""

    def test_create_local_token(self, sample_user_data):
        """Test local token creation."""
        auth_service = AuthService()
        token = auth_service.create_local_token(sample_user_data)

        assert isinstance(token, str)
        assert len(token) > 0

    def test_verify_token_local(self, sample_user_data):
        """Test local token verification."""
        auth_service = AuthService()

        # Create token
        token = SecurityUtils.create_access_token(sample_user_data)

        # Verify token
        payload = auth_service.verify_supabase_token(token)

        assert payload["sub"] == sample_user_data["sub"]
        assert payload["email"] == sample_user_data["email"]

    def test_check_permissions(self):
        """Test permission checking."""
        auth_service = AuthService()

        # Create test users
        customer = User(email="customer@test.com", role=UserRole.CUSTOMER)
        maker = User(email="maker@test.com", role=UserRole.MAKER)
        admin = User(email="admin@test.com", role=UserRole.ADMIN)

        # Test customer permissions
        assert auth_service.check_permissions(customer, UserRole.CUSTOMER)
        assert not auth_service.check_permissions(customer, UserRole.MAKER)
        assert not auth_service.check_permissions(customer, UserRole.ADMIN)

        # Test maker permissions
        assert auth_service.check_permissions(maker, UserRole.CUSTOMER)
        assert auth_service.check_permissions(maker, UserRole.MAKER)
        assert not auth_service.check_permissions(maker, UserRole.ADMIN)

        # Test admin permissions
        assert auth_service.check_permissions(admin, UserRole.CUSTOMER)
        assert auth_service.check_permissions(admin, UserRole.MAKER)
        assert auth_service.check_permissions(admin, UserRole.ADMIN)


class TestAuthAPI:
    """Test authentication API endpoints."""

    def test_health_check(self, client: TestClient):
        """Test health check endpoint."""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"

    @patch('app.services.auth_service.auth_service.verify_supabase_token')
    @patch('app.services.auth_service.auth_service.get_or_create_user')
    def test_verify_token_endpoint(self, mock_get_user, mock_verify, client: TestClient, sample_user_data):
        """Test token verification endpoint."""
        # Mock the auth service methods
        mock_verify.return_value = sample_user_data
        mock_user = User(
            id=sample_user_data["sub"],
            email=sample_user_data["email"],
            role=UserRole.CUSTOMER
        )
        mock_get_user.return_value = mock_user

        response = client.post("/auth/verify", json={"token": "test-token"})

        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True
        assert data["email"] == sample_user_data["email"]
        assert data["role"] == "customer"

    def test_verify_token_invalid(self, client: TestClient):
        """Test token verification with invalid token."""
        response = client.post("/auth/verify", json={"token": "invalid-token"})

        assert response.status_code == 401

    @patch('app.core.auth_middleware.auth_service.verify_supabase_token')
    @patch('app.core.auth_middleware.auth_service.get_or_create_user')
    def test_get_current_user_profile(self, mock_get_user, mock_verify, client: TestClient, sample_user_data):
        """Test get current user profile endpoint."""
        # Mock the auth service methods
        mock_verify.return_value = sample_user_data
        mock_user = User(
            id=sample_user_data["sub"],
            email=sample_user_data["email"],
            role=UserRole.CUSTOMER
        )
        mock_get_user.return_value = mock_user

        headers = {"Authorization": "Bearer test-token"}
        response = client.get("/auth/me", headers=headers)

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == sample_user_data["email"]
        assert data["role"] == "customer"

    def test_get_current_user_profile_unauthorized(self, client: TestClient):
        """Test get current user profile without authentication."""
        response = client.get("/auth/me")

        assert response.status_code == 403  # No authorization header

    def test_create_development_token(self, client: TestClient, sample_user_data):
        """Test development token creation."""
        # This should work in debug mode
        response = client.post("/auth/dev/create-token", json=sample_user_data)

        if response.status_code == 200:
            data = response.json()
            assert "access_token" in data
            assert data["token_type"] == "bearer"
        else:
            # Endpoint not available in production mode
            assert response.status_code == 404
