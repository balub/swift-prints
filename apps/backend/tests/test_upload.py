"""
Tests for upload system.
"""
import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta
from fastapi.testclient import TestClient

from app.services.upload_service import UploadService, UploadSession
from app.models import User, UserRole


class TestUploadService:
    """Test upload service."""

    def setup_method(self):
        """Set up test environment."""
        self.upload_service = UploadService()
        self.test_user = User(
            id="123e4567-e89b-12d3-a456-426614174000",
            email="test@example.com",
            role=UserRole.CUSTOMER
        )

    @patch('app.services.upload_service.storage_backend')
    def test_initiate_upload(self, mock_storage):
        """Test upload initiation."""
        mock_storage.generate_upload_url.return_value = "https://example.com/upload"

        session = self.upload_service.initiate_upload(
            filename="test.stl",
            file_size=1024,
            content_type="application/octet-stream",
            user=self.test_user
        )

        assert isinstance(session, UploadSession)
        assert session.user_id == str(self.test_user.id)
        assert session.filename.endswith("test.stl")
        assert session.file_size == 1024
        assert session.upload_url == "https://example.com/upload"

    def test_initiate_upload_file_too_large(self):
        """Test upload initiation with file too large."""
        with pytest.raises(Exception) as exc_info:
            self.upload_service.initiate_upload(
                filename="test.stl",
                file_size=100 * 1024 * 1024,  # 100MB
                content_type="application/octet-stream",
                user=self.test_user
            )

        assert "exceeds maximum" in str(exc_info.value)

    def test_initiate_upload_invalid_extension(self):
        """Test upload initiation with invalid file extension."""
        with pytest.raises(Exception) as exc_info:
            self.upload_service.initiate_upload(
                filename="test.txt",
                file_size=1024,
                content_type="text/plain",
                user=self.test_user
            )

        assert "not allowed" in str(exc_info.value)

    @patch('app.services.upload_service.storage_backend')
    @patch('app.services.upload_service.SessionLocal')
    def test_complete_upload(self, mock_session_local, mock_storage):
        """Test upload completion."""
        # Mock storage
        mock_storage.file_exists.return_value = True
        mock_storage.get_file_size.return_value = 1024

        # Mock database
        mock_db = MagicMock()
        mock_session_local.return_value = mock_db

        # Create test session
        session = UploadSession(
            session_id="test-session",
            user_id=str(self.test_user.id),
            filename="users/123/uploads/test-session/test.stl",
            file_size=1024,
            content_type="application/octet-stream",
            upload_url="https://example.com/upload",
            expires_at=datetime.utcnow() + timedelta(hours=1)
        )

        # Store session
        self.upload_service._store_session(session)

        # Complete upload
        file_record = self.upload_service.complete_upload(
            "test-session", self.test_user)

        # Verify database operations
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()

    def test_complete_upload_session_not_found(self):
        """Test upload completion with invalid session."""
        with pytest.raises(Exception) as exc_info:
            self.upload_service.complete_upload(
                "invalid-session", self.test_user)

        assert "not found" in str(exc_info.value)

    def test_get_upload_status(self):
        """Test getting upload status."""
        # Create test session
        session = UploadSession(
            session_id="test-session",
            user_id=str(self.test_user.id),
            filename="users/123/uploads/test-session/test.stl",
            file_size=1024,
            content_type="application/octet-stream",
            upload_url="https://example.com/upload",
            expires_at=datetime.utcnow() + timedelta(hours=1)
        )

        # Store session
        self.upload_service._store_session(session)

        with patch('app.services.upload_service.storage_backend') as mock_storage:
            mock_storage.file_exists.return_value = True

            status = self.upload_service.get_upload_status(
                "test-session", self.test_user)

            assert status["session_id"] == "test-session"
            assert status["file_uploaded"] is True
            assert status["can_complete"] is True


class TestUploadAPI:
    """Test upload API endpoints."""

    @patch('app.api.upload.upload_service.initiate_upload')
    def test_initiate_upload_endpoint(self, mock_initiate, client: TestClient):
        """Test upload initiation endpoint."""
        # Mock upload service
        mock_session = UploadSession(
            session_id="test-session",
            user_id="123",
            filename="test.stl",
            file_size=1024,
            content_type="application/octet-stream",
            upload_url="https://example.com/upload",
            expires_at=datetime.utcnow() + timedelta(hours=1)
        )
        mock_initiate.return_value = mock_session

        # Mock authentication
        with patch('app.core.auth_middleware.auth_service.verify_supabase_token') as mock_verify:
            with patch('app.core.auth_middleware.auth_service.get_or_create_user') as mock_get_user:
                mock_verify.return_value = {
                    "sub": "123", "email": "test@example.com"}
                mock_get_user.return_value = User(
                    id="123",
                    email="test@example.com",
                    role=UserRole.CUSTOMER
                )

                headers = {"Authorization": "Bearer test-token"}
                response = client.post(
                    "/api/upload/initiate",
                    json={
                        "filename": "test.stl",
                        "file_size": 1024,
                        "content_type": "application/octet-stream"
                    },
                    headers=headers
                )

                assert response.status_code == 200
                data = response.json()
                assert data["session_id"] == "test-session"
                assert "upload_url" in data

    def test_initiate_upload_unauthorized(self, client: TestClient):
        """Test upload initiation without authentication."""
        response = client.post(
            "/api/upload/initiate",
            json={
                "filename": "test.stl",
                "file_size": 1024,
                "content_type": "application/octet-stream"
            }
        )

        assert response.status_code == 403  # No authorization header
