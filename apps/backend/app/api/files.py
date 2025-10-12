"""
File management API endpoints.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.core.auth_middleware import get_current_active_user
from app.models import User
from app.services.file_service import file_service

router = APIRouter(prefix="/api/files", tags=["files"])


class FileResponse(BaseModel):
    """Response model for file information."""
    id: str
    filename: str
    original_filename: str
    file_size: int
    file_size_mb: float
    storage_backend: str
    uploaded_at: str


class FileListResponse(BaseModel):
    """Response model for file list."""
    files: List[FileResponse]
    total: int
    limit: int
    offset: int


@router.get("", response_model=FileListResponse)
async def list_files(
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_active_user)
):
    """
    List files for the current user.

    Args:
        limit: Maximum number of files to return
        offset: Number of files to skip
        current_user: Current authenticated user

    Returns:
        FileListResponse: List of user files
    """
    files = file_service.get_user_files(current_user, limit, offset)

    file_responses = [
        FileResponse(
            id=str(file.id),
            filename=file.filename,
            original_filename=file.original_filename,
            file_size=file.file_size,
            file_size_mb=file.file_size_mb or 0,
            storage_backend=file.storage_backend,
            uploaded_at=file.created_at.isoformat()
        )
        for file in files
    ]

    return FileListResponse(
        files=file_responses,
        total=len(file_responses),
        limit=limit,
        offset=offset
    )


@router.get("/{file_id}")
async def get_file_info(
    file_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Get file information.

    Args:
        file_id: File ID
        current_user: Current authenticated user

    Returns:
        FileResponse: File information
    """
    from app.core.database import SessionLocal
    from app.models import File

    db = SessionLocal()
    try:
        file_record = db.query(File).filter(File.id == file_id).first()

        if not file_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )

        # Check access permissions
        if file_record.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )

        return FileResponse(
            id=str(file_record.id),
            filename=file_record.filename,
            original_filename=file_record.original_filename,
            file_size=file_record.file_size,
            file_size_mb=file_record.file_size_mb or 0,
            storage_backend=file_record.storage_backend,
            uploaded_at=file_record.created_at.isoformat()
        )

    finally:
        db.close()


@router.get("/{file_id}/download")
async def download_file(
    file_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Get file download URL.

    Args:
        file_id: File ID
        current_user: Current authenticated user

    Returns:
        Dict: Download URL
    """
    download_url = file_service.get_file_url(file_id, current_user)

    return {
        "download_url": download_url,
        "expires_in": 3600  # 1 hour
    }


@router.get("/{file_id}/stream")
async def stream_file(
    file_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Stream file content directly.

    Args:
        file_id: File ID
        current_user: Current authenticated user

    Returns:
        StreamingResponse: File content stream
    """
    from app.core.database import SessionLocal
    from app.models import File
    from app.services.storage.factory import storage_backend

    db = SessionLocal()
    try:
        file_record = db.query(File).filter(File.id == file_id).first()

        if not file_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )

        # Check access permissions
        if file_record.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )

        # Get file stream from storage
        if hasattr(storage_backend, 'get_file_stream'):
            file_stream = storage_backend.get_file_stream(file_record.filename)
            if file_stream:
                return StreamingResponse(
                    file_stream,
                    media_type="application/octet-stream",
                    headers={
                        "Content-Disposition": f"attachment; filename={file_record.original_filename}"
                    }
                )

        # Fallback to redirect to download URL
        download_url = file_service.get_file_url(file_id, current_user)
        return Response(
            status_code=status.HTTP_302_FOUND,
            headers={"Location": download_url}
        )

    finally:
        db.close()


@router.delete("/{file_id}")
async def delete_file(
    file_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete a file.

    Args:
        file_id: File ID
        current_user: Current authenticated user

    Returns:
        Dict: Deletion result
    """
    success = file_service.delete_file(file_id, current_user)

    return {
        "success": success,
        "message": "File deleted successfully" if success else "Failed to delete file"
    }
