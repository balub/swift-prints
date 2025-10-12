"""
Two-phase upload service for secure file uploads.
"""
import uuid
import redis
import json
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from fastapi import HTTPException, status
from pydantic import BaseModel

from app.core.config import settings
from app.core.database import SessionLocal
from app.models import File, User
from app.services.storage.factory import storage_backend


class UploadSession(BaseModel):
    """Upload session data model."""
    session_id: str
    user_id: str
    filename: str
    file_size: int
    content_type: str
    upload_url: str
    expires_at: datetime
    status: str = "initiated"


class UploadService:
    """Service for managing two-phase file uploads."""

    def __init__(self):
        """Initialize upload service."""
        self.storage = storage_backend

        # Initialize Redis for session management
        try:
            self.redis_client = redis.from_url(settings.redis_url)
            self.redis_client.ping()  # Test connection
        except Exception:
            # Fallback to in-memory storage for development
            self.redis_client = None
            self._memory_sessions = {}

    def _get_session_key(self, session_id: str) -> str:
        """Get Redis key for upload session."""
        return f"upload_session:{session_id}"

    def _store_session(self, session: UploadSession, expires_in: int = 3600):
        """Store upload session."""
        if self.redis_client:
            key = self._get_session_key(session.session_id)
            self.redis_client.setex(
                key,
                expires_in,
                session.model_dump_json()
            )
        else:
            # Fallback to memory storage
            self._memory_sessions[session.session_id] = session

    def _get_session(self, session_id: str) -> Optional[UploadSession]:
        """Retrieve upload session."""
        if self.redis_client:
            key = self._get_session_key(session_id)
            session_data = self.redis_client.get(key)
            if session_data:
                return UploadSession.model_validate_json(session_data)
        else:
            # Fallback to memory storage
            return self._memory_sessions.get(session_id)

        return None

    def _delete_session(self, session_id: str):
        """Delete upload session."""
        if self.redis_client:
            key = self._get_session_key(session_id)
            self.redis_client.delete(key)
        else:
            # Fallback to memory storage
            self._memory_sessions.pop(session_id, None)

    def initiate_upload(
        self,
        filename: str,
        file_size: int,
        content_type: str,
        user: User
    ) -> UploadSession:
        """
        Initiate a two-phase upload.

        Args:
            filename: Original filename
            file_size: File size in bytes
            content_type: MIME type
            user: User initiating upload

        Returns:
            UploadSession: Upload session with presigned URL

        Raises:
            HTTPException: If validation fails
        """
        # Validate file size
        if file_size > settings.max_file_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File size exceeds maximum allowed size of {settings.max_file_size / (1024*1024):.1f}MB"
            )

        # Validate file extension
        allowed_extensions = {'.stl', '.STL'}
        if not any(filename.lower().endswith(ext.lower()) for ext in allowed_extensions):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type not allowed. Supported types: {', '.join(allowed_extensions)}"
            )

        # Generate session ID and file key
        session_id = str(uuid.uuid4())
        file_key = f"users/{user.id}/uploads/{session_id}/{filename}"

        try:
            # Generate upload URL
            upload_url = self.storage.generate_upload_url(
                file_key, expires_in=3600)

            # Create upload session
            session = UploadSession(
                session_id=session_id,
                user_id=str(user.id),
                filename=file_key,
                file_size=file_size,
                content_type=content_type,
                upload_url=upload_url,
                expires_at=datetime.utcnow() + timedelta(hours=1)
            )

            # Store session
            self._store_session(session, expires_in=3600)

            return session

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to initiate upload: {str(e)}"
            )

    def complete_upload(self, session_id: str, user: User) -> File:
        """
        Complete a two-phase upload.

        Args:
            session_id: Upload session ID
            user: User completing upload

        Returns:
            File: Created file record

        Raises:
            HTTPException: If session not found or validation fails
        """
        # Get upload session
        session = self._get_session(session_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Upload session not found or expired"
            )

        # Verify user ownership
        if session.user_id != str(user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )

        # Check if session has expired
        if datetime.utcnow() > session.expires_at:
            self._delete_session(session_id)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Upload session has expired"
            )

        try:
            # Verify file was uploaded to storage
            if not self.storage.file_exists(session.filename):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="File not found in storage. Upload may have failed."
                )

            # Get actual file size from storage
            actual_size = self.storage.get_file_size(session.filename)
            if actual_size is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Could not verify file size"
                )

            # Validate file size matches expected
            if abs(actual_size - session.file_size) > 1024:  # Allow 1KB difference
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="File size mismatch. Upload may be corrupted."
                )

            # Create database record
            db = SessionLocal()
            try:
                # Extract original filename from the file key
                original_filename = session.filename.split('/')[-1]

                file_record = File(
                    user_id=user.id,
                    filename=session.filename,
                    original_filename=original_filename,
                    file_size=actual_size,
                    storage_path=session.filename,
                    storage_backend=settings.storage_backend
                )

                db.add(file_record)
                db.commit()
                db.refresh(file_record)

                # Clean up session
                self._delete_session(session_id)

                return file_record

            finally:
                db.close()

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to complete upload: {str(e)}"
            )

    def get_upload_status(self, session_id: str, user: User) -> Dict[str, Any]:
        """
        Get upload session status.

        Args:
            session_id: Upload session ID
            user: User requesting status

        Returns:
            Dict: Upload status information

        Raises:
            HTTPException: If session not found or access denied
        """
        session = self._get_session(session_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Upload session not found or expired"
            )

        # Verify user ownership
        if session.user_id != str(user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )

        # Check if file exists in storage
        file_uploaded = self.storage.file_exists(session.filename)

        return {
            "session_id": session.session_id,
            "status": session.status,
            "filename": session.filename.split('/')[-1],  # Original filename
            "file_size": session.file_size,
            "expires_at": session.expires_at.isoformat(),
            "file_uploaded": file_uploaded,
            "can_complete": file_uploaded and datetime.utcnow() < session.expires_at
        }

    def cancel_upload(self, session_id: str, user: User) -> bool:
        """
        Cancel an upload session.

        Args:
            session_id: Upload session ID
            user: User canceling upload

        Returns:
            bool: True if cancellation was successful

        Raises:
            HTTPException: If session not found or access denied
        """
        session = self._get_session(session_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Upload session not found or expired"
            )

        # Verify user ownership
        if session.user_id != str(user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )

        try:
            # Delete file from storage if it exists
            if self.storage.file_exists(session.filename):
                self.storage.delete_file(session.filename)

            # Delete session
            self._delete_session(session_id)

            return True

        except Exception:
            return False


# Global upload service instance
upload_service = UploadService()
