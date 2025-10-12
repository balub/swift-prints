"""
Local filesystem storage backend.
"""
import os
import shutil
from typing import Optional, BinaryIO
from pathlib import Path
from urllib.parse import urljoin

from app.core.config import settings
from .base import StorageBackend


class LocalStorageBackend(StorageBackend):
    """Local filesystem storage implementation."""

    def __init__(self, base_path: str = None):
        """
        Initialize local storage backend.

        Args:
            base_path: Base directory for file storage
        """
        self.base_path = Path(base_path or settings.upload_dir)
        self.base_path.mkdir(parents=True, exist_ok=True)

        # Base URL for serving files (in production, use a web server)
        self.base_url = "http://localhost:3001/files/"

    def _get_file_path(self, key: str) -> Path:
        """Get full file path for a key."""
        return self.base_path / key

    def store_file(self, key: str, file_data: BinaryIO, content_type: Optional[str] = None) -> str:
        """Store file to local filesystem."""
        file_path = self._get_file_path(key)

        # Create directory if it doesn't exist
        file_path.parent.mkdir(parents=True, exist_ok=True)

        # Write file data
        with open(file_path, 'wb') as f:
            shutil.copyfileobj(file_data, f)

        return str(file_path)

    def get_file_url(self, key: str, expires_in: int = 3600) -> str:
        """Get URL to access the file."""
        # For local storage, return a direct URL
        # In production, this should be served by a web server (nginx, etc.)
        return urljoin(self.base_url, key)

    def delete_file(self, key: str) -> bool:
        """Delete file from local filesystem."""
        try:
            file_path = self._get_file_path(key)
            if file_path.exists():
                file_path.unlink()
                return True
            return False
        except Exception:
            return False

    def file_exists(self, key: str) -> bool:
        """Check if file exists."""
        return self._get_file_path(key).exists()

    def get_file_size(self, key: str) -> Optional[int]:
        """Get file size in bytes."""
        try:
            file_path = self._get_file_path(key)
            if file_path.exists():
                return file_path.stat().st_size
            return None
        except Exception:
            return None

    def generate_upload_url(self, key: str, expires_in: int = 3600) -> str:
        """
        Generate upload URL for local storage.
        For local storage, this returns the API endpoint for upload.
        """
        # Return the API endpoint that will handle the upload
        return f"http://localhost:3001/api/upload/local/{key}"

    def get_file_stream(self, key: str) -> Optional[BinaryIO]:
        """
        Get file as a binary stream.

        Args:
            key: File key

        Returns:
            Optional[BinaryIO]: File stream or None if not found
        """
        try:
            file_path = self._get_file_path(key)
            if file_path.exists():
                return open(file_path, 'rb')
            return None
        except Exception:
            return None
