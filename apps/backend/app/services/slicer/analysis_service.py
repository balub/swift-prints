"""
STL Analysis Service

Handles STL file analysis using PrusaSlicer in Docker containers.
Provides asynchronous analysis with job queuing and result caching.
"""

import asyncio
import json
import logging
import os
import tempfile
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.core.celery_app import celery_app
from app.core.config import get_settings
from app.core.database import get_db
from app.models.analysis import AnalysisResult
from app.models.file import File
from app.schemas.analysis import AnalysisRequest, AnalysisStatus, PrintMetrics
from app.services.slicer.prusa_runner import PrusaSlicerRunner
from app.services.slicer.stl_validator import STLValidator

logger = logging.getLogger(__name__)
settings = get_settings()


class AnalysisService:
    """Service for managing STL file analysis operations."""

    def __init__(self):
        self.validator = STLValidator()
        self.slicer = PrusaSlicerRunner()
        self.temp_dir = Path(tempfile.gettempdir()) / "stl_analysis"
        self.temp_dir.mkdir(exist_ok=True)

    async def analyze_stl(
        self,
        file_id: str,
        settings_dict: Dict,
        user_id: str
    ) -> str:
        """
        Start asynchronous STL analysis.

        Args:
            file_id: ID of the uploaded STL file
            settings_dict: Print settings for analysis
            user_id: ID of the user requesting analysis

        Returns:
            Job ID for tracking analysis progress
        """
        job_id = str(uuid.uuid4())

        # Queue the analysis job
        analyze_stl_task.delay(job_id, file_id, settings_dict, user_id)

        logger.info(f"Queued STL analysis job {job_id} for file {file_id}")
        return job_id

    async def get_analysis_status(self, job_id: str) -> AnalysisStatus:
        """Get the status of an analysis job."""
        result = celery_app.AsyncResult(job_id)

        if result.state == "PENDING":
            return AnalysisStatus(
                job_id=job_id,
                status="pending",
                progress=0,
                message="Analysis queued"
            )
        elif result.state == "PROGRESS":
            return AnalysisStatus(
                job_id=job_id,
                status="processing",
                progress=result.info.get("progress", 0),
                message=result.info.get("message", "Processing...")
            )
        elif result.state == "SUCCESS":
            return AnalysisStatus(
                job_id=job_id,
                status="completed",
                progress=100,
                message="Analysis completed",
                result_id=result.result
            )
        else:  # FAILURE
            return AnalysisStatus(
                job_id=job_id,
                status="failed",
                progress=0,
                message=str(result.info),
                error=str(result.info)
            )

    async def get_analysis_result(self, result_id: str, db: Session) -> Optional[AnalysisResult]:
        """Get analysis result by ID."""
        return db.query(AnalysisResult).filter(
            AnalysisResult.id == result_id
        ).first()

    def _validate_stl_file(self, file_path: Path) -> Tuple[bool, Optional[str]]:
        """Validate STL file format and content."""
        try:
            return self.validator.validate_file(file_path)
        except Exception as e:
            logger.error(f"STL validation error: {e}")
            return False, f"Validation error: {str(e)}"

    def _prepare_analysis_workspace(self, file_path: Path, job_id: str) -> Path:
        """Prepare isolated workspace for analysis."""
        workspace = self.temp_dir / job_id
        workspace.mkdir(exist_ok=True)

        # Copy STL file to workspace
        stl_file = workspace / "input.stl"
        stl_file.write_bytes(file_path.read_bytes())

        return workspace


@celery_app.task(bind=True)
def analyze_stl_task(self, job_id: str, file_id: str, settings_dict: Dict, user_id: str):
    """
    Celery task for processing STL analysis.

    This runs in a separate worker process to avoid blocking the main application.
    """
    try:
        # Update progress
        self.update_state(
            state="PROGRESS",
            meta={"progress": 10, "message": "Initializing analysis..."}
        )

        # Get database session
        db = next(get_db())

        # Get file information
        file_record = db.query(File).filter(File.id == file_id).first()
        if not file_record:
            raise Exception(f"File {file_id} not found")

        # Initialize services
        service = AnalysisService()

        # Update progress
        self.update_state(
            state="PROGRESS",
            meta={"progress": 20, "message": "Validating STL file..."}
        )

        # Get file path from storage
        file_path = Path(file_record.storage_path)
        if not file_path.exists():
            raise Exception(f"File not found at {file_path}")

        # Validate STL file
        is_valid, error_msg = service._validate_stl_file(file_path)
        if not is_valid:
            raise Exception(f"Invalid STL file: {error_msg}")

        # Update progress
        self.update_state(
            state="PROGRESS",
            meta={"progress": 30, "message": "Preparing analysis workspace..."}
        )

        # Prepare workspace
        workspace = service._prepare_analysis_workspace(file_path, job_id)

        # Update progress
        self.update_state(
            state="PROGRESS",
            meta={"progress": 50, "message": "Running PrusaSlicer analysis..."}
        )

        # Run PrusaSlicer analysis
        stl_file = workspace / "input.stl"
        analysis_result = service.slicer.analyze_stl(stl_file, settings_dict)

        # Update progress
        self.update_state(
            state="PROGRESS",
            meta={"progress": 80, "message": "Saving analysis results..."}
        )

        # Save results to database
        db_result = AnalysisResult(
            id=str(uuid.uuid4()),
            file_id=file_id,
            settings=settings_dict,
            filament_grams=analysis_result.filament_grams,
            print_time_hours=analysis_result.print_time_hours,
            volume_mm3=analysis_result.volume_mm3,
            complexity_score=analysis_result.complexity_score,
            supports_required=analysis_result.supports_required,
            analyzed_at=datetime.utcnow()
        )

        db.add(db_result)
        db.commit()

        # Cleanup workspace
        import shutil
        shutil.rmtree(workspace, ignore_errors=True)

        # Update progress
        self.update_state(
            state="PROGRESS",
            meta={"progress": 100, "message": "Analysis completed"}
        )

        logger.info(f"STL analysis completed for job {job_id}")
        return db_result.id

    except Exception as e:
        logger.error(f"STL analysis failed for job {job_id}: {e}")
        # Cleanup on error
        try:
            workspace = service.temp_dir / job_id
            if workspace.exists():
                import shutil
                shutil.rmtree(workspace, ignore_errors=True)
        except:
            pass

        raise Exception(f"Analysis failed: {str(e)}")
    finally:
        db.close()
