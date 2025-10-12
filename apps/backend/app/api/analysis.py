"""
Analysis API endpoints for STL file processing.
"""

import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.analysis import AnalysisResult
from app.models.file import File
from app.models.user import User
from app.schemas.analysis import (
    AnalysisJobResponse,
    AnalysisRequest,
    AnalysisResultResponse,
    AnalysisStatus,
    PrintMetrics
)
from app.services.auth_service import get_current_user
from app.services.slicer.analysis_service import AnalysisService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/analysis", tags=["analysis"])


@router.post("/", response_model=AnalysisJobResponse)
async def start_analysis(
    request: AnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Start STL file analysis.

    Initiates asynchronous analysis of an uploaded STL file using PrusaSlicer.
    Returns a job ID for tracking progress.
    """
    try:
        # Verify file exists and belongs to user
        file_record = db.query(File).filter(
            File.id == request.file_id,
            File.user_id == current_user.id
        ).first()

        if not file_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found or access denied"
            )

        # Check if file is STL
        if not file_record.filename.lower().endswith('.stl'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be an STL file"
            )

        # Start analysis
        analysis_service = AnalysisService()
        job_id = await analysis_service.analyze_stl(
            file_id=request.file_id,
            settings_dict=request.settings.dict(),
            user_id=current_user.id
        )

        logger.info(
            f"Started analysis job {job_id} for file {request.file_id}")

        return AnalysisJobResponse(
            job_id=job_id,
            message="Analysis job started successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to start analysis: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start analysis"
        )


@router.get("/jobs/{job_id}/status", response_model=AnalysisStatus)
async def get_analysis_status(
    job_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get analysis job status.

    Returns the current status and progress of an analysis job.
    """
    try:
        analysis_service = AnalysisService()
        status_info = await analysis_service.get_analysis_status(job_id)

        return status_info

    except Exception as e:
        logger.error(f"Failed to get analysis status for job {job_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get analysis status"
        )


@router.get("/results/{result_id}", response_model=AnalysisResultResponse)
async def get_analysis_result(
    result_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get analysis result by ID.

    Returns the complete analysis result including metrics and settings.
    """
    try:
        # Get analysis result
        analysis_service = AnalysisService()
        result = await analysis_service.get_analysis_result(result_id, db)

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Analysis result not found"
            )

        # Verify user has access to the file
        file_record = db.query(File).filter(
            File.id == result.file_id,
            File.user_id == current_user.id
        ).first()

        if not file_record:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )

        # Build response
        metrics = PrintMetrics(
            filament_grams=float(result.filament_grams or 0),
            print_time_hours=float(result.print_time_hours or 0),
            volume_mm3=float(result.volume_mm3 or 0),
            complexity_score=float(result.complexity_score or 0),
            supports_required=result.supports_required or False
        )

        return AnalysisResultResponse(
            id=result.id,
            file_id=result.file_id,
            settings=result.settings or {},
            metrics=metrics,
            analyzed_at=result.analyzed_at
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get analysis result {result_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get analysis result"
        )


@router.get("/files/{file_id}/results", response_model=List[AnalysisResultResponse])
async def get_file_analysis_results(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all analysis results for a file.

    Returns all analysis results for a specific file, useful when
    the same file has been analyzed with different settings.
    """
    try:
        # Verify file exists and belongs to user
        file_record = db.query(File).filter(
            File.id == file_id,
            File.user_id == current_user.id
        ).first()

        if not file_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found or access denied"
            )

        # Get all analysis results for the file
        results = db.query(AnalysisResult).filter(
            AnalysisResult.file_id == file_id
        ).order_by(AnalysisResult.analyzed_at.desc()).all()

        # Build response list
        response_list = []
        for result in results:
            metrics = PrintMetrics(
                filament_grams=float(result.filament_grams or 0),
                print_time_hours=float(result.print_time_hours or 0),
                volume_mm3=float(result.volume_mm3 or 0),
                complexity_score=float(result.complexity_score or 0),
                supports_required=result.supports_required or False
            )

            response_list.append(AnalysisResultResponse(
                id=result.id,
                file_id=result.file_id,
                settings=result.settings or {},
                metrics=metrics,
                analyzed_at=result.analyzed_at
            ))

        return response_list

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get analysis results for file {file_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get analysis results"
        )


@router.delete("/results/{result_id}")
async def delete_analysis_result(
    result_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete an analysis result.

    Removes an analysis result from the database. The user must own
    the file associated with the analysis.
    """
    try:
        # Get analysis result
        result = db.query(AnalysisResult).filter(
            AnalysisResult.id == result_id
        ).first()

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Analysis result not found"
            )

        # Verify user has access to the file
        file_record = db.query(File).filter(
            File.id == result.file_id,
            File.user_id == current_user.id
        ).first()

        if not file_record:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )

        # Delete the result
        db.delete(result)
        db.commit()

        logger.info(f"Deleted analysis result {result_id}")

        return {"message": "Analysis result deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete analysis result {result_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete analysis result"
        )
