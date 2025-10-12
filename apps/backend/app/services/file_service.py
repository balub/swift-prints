"""
File management service.
"""
import uuid
import magic
from typing import Optional, BinaryIO, Tuple
from pathlib import Path
from fastapi import HTTPException, status, UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.models import File, User
from app.services.storage.factory import storage_backend


class FileService:
    """Service for file management operations."""

    ALLOWED_EXTENSIONS = {'.stl', '.STL'}
    ALLOWED_MIME_TYPES = {
        'application/octet-stream',  # STL files are often detected as this
        'model/stl',
        'application/sla'  # Some systems use this for STL
    }

    def __init__(self):
        """Initialize file service."""
        self.storage = storage_backend

    def validate_file(self, file: UploadFile) -> Tuple[bool, str]:
        """
        Validate uploaded file.

        Args:
            file: Uploaded file

        Returns:
            Tuple[bool, str]: (is_valid, error_message)
        """
        # Check file size
        if hasattr(file, 'size') and file.size > settings.max_file_size:
            return False, f"File size exceeds maximum allowed size of {settings.max_file_size / (1024*1024):.1f}MB"

        # Check file extension
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in self.ALLOWED_EXTENSIONS:
            return False, f"File type not allowed. Supported types: {', '.join(self.ALLOWED_EXTENSIONS)}"

        return True, ""

    def validate_file_content(self, file_data: bytes) -> Tuple[bool, str]:
        """
        Validate file content using python-magic.

        Args:
            file_data: File content bytes

        Returns:
            Tuple[bool, str]: (is_valid, error_message)
        """
        try:
            # Detect MIME type
            mime_type = magic.from_buffer(file_data, mime=True)

            # STL files might be detected as various MIME types
            if mime_type not in self.ALLOWED_MIME_TYPES:
                # Check if it's a binary STL file by looking for STL header
                if file_data.startswith(b'solid ') or len(file_data) > 80:
                    # Could be ASCII or binary STL
                    return True, ""
                else:
                    return False, f"Invalid file content. Detected MIME type: {mime_type}"

            return True, ""

        except Exception as e:
            return False, f"Error validating file content: {str(e)}"

    def generate_file_key(self, user_id: str, original_filename: str) -> str:
        """
        Generate unique file key for storage.

        Args:
            user_id: User ID
            original_filename: Original filename

        Returns:
            str: Unique file key
        """
        file_ext = Path(original_filename).suffix.lower()
        unique_id = str(uuid.uuid4())
        return f"users/{user_id}/files/{unique_id}{file_ext}"

    def store_file(self, file: UploadFile, user: User) -> File:
        """
        Store uploaded file and create database record.

        Args:
            file: Uploaded file
            user: User uploading the file

        Returns:
            File: Created file record

        Raises:
            HTTPException: If file validation or storage fails
        """
        # Validate file
        is_valid, error_msg = self.validate_file(file)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )

        # Read file content for validation
        file_content = file.file.read()
        file.file.seek(0)  # Reset file pointer

        # Validate file content
        is_valid, error_msg = self.validate_file_content(file_content)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )

        # Generate file key
        file_key = self.generate_file_key(str(user.id), file.filename)

        try:
            # Store file
            file.file.seek(0)  # Reset file pointer
            storage_path = self.storage.store_file(
                file_key,
                file.file,
                content_type=file.content_type
            )

            # Create database record
            db = SessionLocal()
            try:
                file_record = File(
                    user_id=user.id,
                    filename=file_key,
                    original_filename=file.filename,
                    file_size=len(file_content),
                    storage_path=storage_path,
                    storage_backend=settings.storage_backend
                )

                db.add(file_record)
                db.commit()
                db.refresh(file_record)

                return file_record

            finally:
                db.close()

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to store file: {str(e)}"
            )

    def get_file_url(self, file_id: str, user: User) -> str:
        """
        Get download URL for a file.

        Args:
            file_id: File ID
            user: User requesting the file

        Returns:
            str: File download URL

        Raises:
            HTTPException: If file not found or access denied
        """
        db = SessionLocal()
        try:
            file_record = db.query(File).filter(File.id == file_id).first()

            if not file_record:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="File not found"
                )

            # Check access permissions
            if file_record.user_id != user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied"
                )

            # Generate download URL
            return self.storage.get_file_url(file_record.filename)

        finally:
            db.close()

    def delete_file(self, file_id: str, user: User) -> bool:
        """
        Delete a file.

        Args:
            file_id: File ID
            user: User requesting deletion

        Returns:
            bool: True if deletion was successful

        Raises:
            HTTPException: If file not found or access denied
        """
        db = SessionLocal()
        try:
            file_record = db.query(File).filter(File.id == file_id).first()

            if not file_record:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="File not found"
                )

            # Check access permissions
            if file_record.user_id != user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied"
                )

            # Delete from storage
            storage_deleted = self.storage.delete_file(file_record.filename)

            # Delete from database
            db.delete(file_record)
            db.commit()

            return storage_deleted

        finally:
            db.close()

    def get_user_files(self, user: User, limit: int = 50, offset: int = 0) -> list[File]:
        """
        Get files for a user.

        Args:
            user: User
            limit: Maximum number of files to return
            offset: Number of files to skip

        Returns:
            list[File]: List of user files
        """
        db = SessionLocal()
        try:
            files = db.query(File).filter(
                File.user_id == user.id
            ).offset(offset).limit(limit).all()

            return files

        finally:
            db.close()


# Global file service instance
file_service = FileService()
