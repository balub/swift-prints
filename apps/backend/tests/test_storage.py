"""
Tests for storage backends.
"""
import pytest
import tempfile
import shutil
from pathlib import Path
from io import BytesIO
from unittest.mock import patch, MagicMock

from app.services.storage.local import LocalStorageBackend
from app.services.storage.s3 import S3StorageBackend
from app.services.storage.factory import get_storage_backend


class TestLocalStorageBackend:
    """Test local storage backend."""

    def setup_method(self):
        """Set up test environment."""
        self.temp_dir = tempfile.mkdtemp()
        self.storage = LocalStorageBackend(self.temp_dir)

    def teardown_method(self):
        """Clean up test environment."""
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_store_file(self):
        """Test file storage."""
        file_data = BytesIO(b"test file content")
        key = "test/file.txt"

        storage_path = self.storage.store_file(key, file_data)

        assert storage_path == str(Path(self.temp_dir) / key)
        assert self.storage.file_exists(key)

    def test_get_file_url(self):
        """Test file URL generation."""
        key = "test/file.txt"
        url = self.storage.get_file_url(key)

        assert key in url
        assert url.startswith("http://")

    def test_delete_file(self):
        """Test file deletion."""
        file_data = BytesIO(b"test file content")
        key = "test/file.txt"

        # Store file first
        self.storage.store_file(key, file_data)
        assert self.storage.file_exists(key)

        # Delete file
        result = self.storage.delete_file(key)
        assert result is True
        assert not self.storage.file_exists(key)

    def test_get_file_size(self):
        """Test file size retrieval."""
        content = b"test file content"
        file_data = BytesIO(content)
        key = "test/file.txt"

        self.storage.store_file(key, file_data)
        size = self.storage.get_file_size(key)

        assert size == len(content)

    def test_generate_upload_url(self):
        """Test upload URL generation."""
        key = "test/file.txt"
        url = self.storage.generate_upload_url(key)

        assert key in url
        assert "upload" in url


class TestS3StorageBackend:
    """Test S3 storage backend."""

    @patch('boto3.client')
    def test_s3_initialization(self, mock_boto_client):
        """Test S3 backend initialization."""
        mock_client = MagicMock()
        mock_boto_client.return_value = mock_client

        with patch('app.core.settings') as mock_settings:
            mock_settings.aws_access_key = "test_key"
            mock_settings.aws_secret_key = "test_secret"
            mock_settings.aws_bucket = "test_bucket"
            mock_settings.aws_region = "us-east-1"

            storage = S3StorageBackend()

            assert storage.bucket_name == "test_bucket"
            assert storage.region == "us-east-1"

    @patch('boto3.client')
    def test_store_file(self, mock_boto_client):
        """Test S3 file storage."""
        mock_client = MagicMock()
        mock_boto_client.return_value = mock_client

        with patch('app.core.settings') as mock_settings:
            mock_settings.aws_access_key = "test_key"
            mock_settings.aws_secret_key = "test_secret"
            mock_settings.aws_bucket = "test_bucket"
            mock_settings.aws_region = "us-east-1"

            storage = S3StorageBackend()
            file_data = BytesIO(b"test content")
            key = "test/file.txt"

            result = storage.store_file(key, file_data)

            assert result == f"s3://test_bucket/{key}"
            mock_client.upload_fileobj.assert_called_once()


class TestStorageFactory:
    """Test storage factory."""

    @patch('app.core.settings')
    def test_get_local_storage(self, mock_settings):
        """Test getting local storage backend."""
        mock_settings.storage_backend = "local"
        mock_settings.upload_dir = "/tmp/test"

        backend = get_storage_backend()

        assert isinstance(backend, LocalStorageBackend)

    @patch('app.core.settings')
    def test_get_s3_storage(self, mock_settings):
        """Test getting S3 storage backend."""
        mock_settings.storage_backend = "s3"
        mock_settings.aws_access_key = "test_key"
        mock_settings.aws_secret_key = "test_secret"
        mock_settings.aws_bucket = "test_bucket"
        mock_settings.aws_region = "us-east-1"

        with patch('boto3.client'):
            backend = get_storage_backend()
            assert isinstance(backend, S3StorageBackend)

    @patch('app.core.settings')
    def test_unsupported_backend(self, mock_settings):
        """Test unsupported storage backend."""
        mock_settings.storage_backend = "unsupported"

        with pytest.raises(ValueError, match="Unsupported storage backend"):
            get_storage_backend()
