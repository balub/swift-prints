"""
Base storage backend interface.
"""
from abc import ABC, abstractmethod
from typing import Optional, BinaryIO
from pathlib import Path


class StorageBackend(ABC):
    """Abstract base class for storage backends."""

    @abstractmethod
    def store_file(self, key: str, file_data: BinaryIO, content_type: Optional[str] = None) -> str:
        """
        Store a file and return its storage path.

        Args:
            key: Unique key for the file
            file_data: File data stream
            content_type: MIME type of the file

        Returns:
            str: Storage path or URL
        """
        pass

    @abstractmethod
    def get_file_url(self, key: str, expires_in: int = 3600) -> str:
        """
        Get a URL to access the file.

        Args:
            key: File key
            expires_in: URL expiration time in seconds

        Returns:
            str: File access URL
        """
        pass

    @abstractmethod
    def delete_file(self, key: str) -> bool:
        """
        Delete a file from storage.

        Args:
            key: File key

        Returns:
            bool: True if deletion was successful
        """
        pass

    @abstractmethod
    def file_exists(self, key: str) -> bool:
        """
        Check if a file exists in storage.

        Args:
            key: File key

        Returns:
            bool: True if file exists
        """
        pass

    @abstractmethod
    def get_file_size(self, key: str) -> Optional[int]:
        """
        Get the size of a file in bytes.

        Args:
            key: File key

        Returns:
            Optional[int]: File size in bytes, None if file doesn't exist
        """
        pass

    @abstractmethod
    def generate_upload_url(self, key: str, expires_in: int = 3600) -> str:
        """
        Generate a presigned URL for direct file upload.

        Args:
            key: File key
            expires_in: URL expiration time in seconds

        Returns:
            str: Presigned upload URL
        """
        pass
