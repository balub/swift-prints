"""
File upload API endpoints.
"""
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File as FastAPIFile
from pydantic import BaseModel

from app.core.auth_middleware import get_current_active_user
from app.models import User
from app.services.upload_service import upload_service, UploadSession
from app.services.file_service import file_service

router = APIRouter(prefix="/api/upload", tags=["file-upload"])


class InitiateUploadRequest(BaseModel):
    """Request model for initiating upload."""
    filename: str
    file_size: int
    content_type: str


class InitiateUploadResponse(BaseModel):
    """Response model for upload initiation."""
    session_id: str
    upload_url: str
    expires_at: str
    max_file_size: int


class CompleteUploadRequest(BaseModel):
    """Request model for completing upload."""
    session_id: str


class CompleteUploadResponse(BaseModel):
    """Response model for upload completion."""
    file_id: str
    filename: str
    file_size: int
    upload_completed_at: str


class UploadStatusResponse(BaseModel):
    """Response model for upload status."""
    session_id: str
    status: str
    filename: str
    file_size: int
    expires_at: str
    file_uploaded: bool
    can_complete: bool


@router.post("/initiate", response_model=InitiateUploadResponse)
async def initiate_upload(
    request: InitiateUploadRequest,
    current_user: User = Depends(get_current_active_user)
):
    """
    Initiate a two-phase file upload.

    Args:
        request: Upload initiation request
        current_user: Current authenticated user

    Returns:
        InitiateUploadResponse: Upload session information
    """
    session = upload_service.initiate_upload(
        filename=request.filename,
        file_size=request.file_size,
        content_type=request.content_type,
        user=current_user
    )

    return InitiateUploadResponse(
        session_id=session.session_id,
        upload_url=session.upload_url,
        expires_at=session.expires_at.isoformat(),
        max_file_size=50 * 1024 * 1024  # 50MB
    )


@router.post("/complete", response_model=CompleteUploadResponse)
async def complete_upload(
    request: CompleteUploadRequest,
    current_user: User = Depends(get_current_active_user)
):
    """
    Complete a two-phase file upload.

    Args:
        request: Upload completion request
        current_user: Current authenticated user

    Returns:
        CompleteUploadResponse: Completed file information
    """
    file_record = upload_service.complete_upload(
        session_id=request.session_id,
        user=current_user
    )

    return CompleteUploadResponse(
        file_id=str(file_record.id),
        filename=file_record.original_filename,
        file_size=file_record.file_size,
        upload_completed_at=file_record.created_at.isoformat()
    )


@router.get("/status/{session_id}", response_model=UploadStatusResponse)
async def get_upload_status(
    session_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Get upload session status.

    Args:
        session_id: Upload session ID
        current_user: Current authenticated user

    Returns:
        UploadStatusResponse: Upload status information
    """
    status_info = upload_service.get_upload_status(session_id, current_user)

    return UploadStatusResponse(**status_info)


@router.delete("/cancel/{session_id}")
async def cancel_upload(
    session_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Cancel an upload session.

    Args:
        session_id: Upload session ID
        current_user: Current authenticated user

    Returns:
        Dict: Cancellation result
    """
    success = upload_service.cancel_upload(session_id, current_user)

    return {
        "success": success,
        "message": "Upload cancelled successfully" if success else "Failed to cancel upload"
    }


# Direct upload endpoint for local storage
@router.post("/direct")
async def direct_upload(
    file: UploadFile = FastAPIFile(...),
    current_user: User = Depends(get_current_active_user)
):
    """
    Direct file upload (single-phase) for development/testing.

    Args:
        file: Uploaded file
        current_user: Current authenticated user

    Returns:
        Dict: Upload result
    """
    file_record = file_service.store_file(file, current_user)

    return {
        "file_id": str(file_record.id),
        "filename": file_record.original_filename,
        "file_size": file_record.file_size,
        "upload_completed_at": file_record.created_at.isoformat()
    }


# Local storage upload endpoint (used by local storage backend)
@router.put("/local/{file_key:path}")
async def local_storage_upload(
    file_key: str,
    file: UploadFile = FastAPIFile(...),
    current_user: User = Depends(get_current_active_user)
):
    """
    Upload endpoint for local storage backend.
    This is called by the presigned URL for local storage.

    Args:
        file_key: File storage key
        file: Uploaded file
        current_user: Current authenticated user

    Returns:
        Dict: Upload result
    """
    try:
        # Store file using the provided key
        from app.services.storage.factory import storage_backend

        storage_path = storage_backend.store_file(
            file_key,
            file.file,
            content_type=file.content_type
        )

        return {
            "success": True,
            "storage_path": storage_path,
            "message": "File uploaded successfully"
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload failed: {str(e)}"
        )
