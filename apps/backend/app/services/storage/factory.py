"""
Storage backend factory.
"""
from typing import Union

from app.core.config import settings
from .base import StorageBackend
from .local import LocalStorageBackend
from .s3 import S3StorageBackend


def get_storage_backend() -> StorageBackend:
    """
    Get the configured storage backend.

    Returns:
        StorageBackend: Configured storage backend instance

    Raises:
        ValueError: If storage backend is not supported
    """
    backend_type = settings.storage_backend.lower()

    if backend_type == "local":
        return LocalStorageBackend()
    elif backend_type == "s3":
        return S3StorageBackend()
    else:
        raise ValueError(f"Unsupported storage backend: {backend_type}")


# Global storage backend instance
storage_backend = get_storage_backend()
