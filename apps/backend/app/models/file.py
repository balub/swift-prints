"""
File model for uploaded STL files.
"""
from sqlalchemy import Column, String, BigInteger, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from .base import BaseModel


class File(BaseModel):
    """Uploaded file metadata."""

    __tablename__ = "files"

    user_id = Column(UUID(as_uuid=True), ForeignKey(
        "users.id"), nullable=False)

    # File information
    filename = Column(String(255), nullable=False)  # Generated filename
    # User's original filename
    original_filename = Column(String(255), nullable=False)
    file_size = Column(BigInteger)  # Size in bytes

    # Storage information
    storage_path = Column(String(500))  # Path in storage backend
    storage_backend = Column(String(20))  # 'local' or 's3'

    # Relationships
    user = relationship("User", back_populates="files")
    analysis_results = relationship(
        "AnalysisResult", back_populates="file", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="file")

    @property
    def file_size_mb(self):
        """Get file size in megabytes."""
        if self.file_size:
            return round(self.file_size / (1024 * 1024), 2)
        return None

    def __repr__(self):
        return f"<File(id={self.id}, filename={self.filename}, size={self.file_size_mb}MB)>"
