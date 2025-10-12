"""
Analysis schemas for STL file processing.
"""

from datetime import datetime
from decimal import Decimal
from typing import Dict, Optional

from pydantic import BaseModel, Field


class PrintSettings(BaseModel):
    """Print settings for STL analysis."""

    layer_height: float = Field(
        default=0.2, ge=0.1, le=0.5, description="Layer height in mm")
    infill_density: int = Field(
        default=20, ge=0, le=100, description="Infill density percentage")
    infill_pattern: str = Field(default="grid", description="Infill pattern")
    supports: bool = Field(
        default=False, description="Enable support material")
    bed_adhesion: str = Field(default="skirt", description="Bed adhesion type")
    material_type: str = Field(default="PLA", description="Material type")
    nozzle_temperature: int = Field(
        default=210, ge=180, le=300, description="Nozzle temperature in Celsius")
    bed_temperature: int = Field(
        default=60, ge=0, le=120, description="Bed temperature in Celsius")
    print_speed: int = Field(default=50, ge=10, le=200,
                             description="Print speed in mm/s")

    class Config:
        json_schema_extra = {
            "example": {
                "layer_height": 0.2,
                "infill_density": 20,
                "infill_pattern": "grid",
                "supports": False,
                "bed_adhesion": "skirt",
                "material_type": "PLA",
                "nozzle_temperature": 210,
                "bed_temperature": 60,
                "print_speed": 50
            }
        }


class AnalysisRequest(BaseModel):
    """Request for STL file analysis."""

    file_id: str = Field(description="ID of the uploaded STL file")
    settings: PrintSettings = Field(description="Print settings for analysis")

    class Config:
        json_schema_extra = {
            "example": {
                "file_id": "123e4567-e89b-12d3-a456-426614174000",
                "settings": {
                    "layer_height": 0.2,
                    "infill_density": 20,
                    "supports": False,
                    "material_type": "PLA"
                }
            }
        }


class PrintMetrics(BaseModel):
    """Metrics from STL analysis."""

    filament_grams: float = Field(description="Filament weight in grams")
    print_time_hours: float = Field(
        description="Estimated print time in hours")
    volume_mm3: float = Field(description="Object volume in cubic millimeters")
    complexity_score: float = Field(description="Complexity score (0-10)")
    supports_required: bool = Field(
        description="Whether supports are required")

    @property
    def print_time_minutes(self) -> int:
        """Get print time in minutes."""
        return int(self.print_time_hours * 60)

    @property
    def volume_cm3(self) -> float:
        """Get volume in cubic centimeters."""
        return round(self.volume_mm3 / 1000, 2)

    class Config:
        json_schema_extra = {
            "example": {
                "filament_grams": 25.5,
                "print_time_hours": 2.5,
                "volume_mm3": 15000.0,
                "complexity_score": 3.2,
                "supports_required": False
            }
        }


class AnalysisStatus(BaseModel):
    """Status of an analysis job."""

    job_id: str = Field(description="Analysis job ID")
    status: str = Field(
        description="Job status: pending, processing, completed, failed")
    progress: int = Field(ge=0, le=100, description="Progress percentage")
    message: str = Field(description="Status message")
    result_id: Optional[str] = Field(
        default=None, description="Result ID when completed")
    error: Optional[str] = Field(
        default=None, description="Error message if failed")

    class Config:
        json_schema_extra = {
            "example": {
                "job_id": "123e4567-e89b-12d3-a456-426614174000",
                "status": "processing",
                "progress": 75,
                "message": "Running PrusaSlicer analysis...",
                "result_id": None,
                "error": None
            }
        }


class AnalysisResultResponse(BaseModel):
    """Complete analysis result response."""

    id: str = Field(description="Analysis result ID")
    file_id: str = Field(description="Source file ID")
    settings: Dict = Field(description="Print settings used")
    metrics: PrintMetrics = Field(description="Analysis metrics")
    analyzed_at: datetime = Field(description="Analysis timestamp")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "file_id": "456e7890-e89b-12d3-a456-426614174000",
                "settings": {
                    "layer_height": 0.2,
                    "infill_density": 20,
                    "material_type": "PLA"
                },
                "metrics": {
                    "filament_grams": 25.5,
                    "print_time_hours": 2.5,
                    "volume_mm3": 15000.0,
                    "complexity_score": 3.2,
                    "supports_required": False
                },
                "analyzed_at": "2024-01-15T10:30:00Z"
            }
        }


class AnalysisJobResponse(BaseModel):
    """Response when starting an analysis job."""

    job_id: str = Field(description="Analysis job ID for tracking")
    message: str = Field(description="Success message")

    class Config:
        json_schema_extra = {
            "example": {
                "job_id": "123e4567-e89b-12d3-a456-426614174000",
                "message": "Analysis job started successfully"
            }
        }
