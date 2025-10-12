"""
Tests for STL analysis service.
"""

import pytest
from pathlib import Path
from unittest.mock import Mock, patch

from app.services.slicer.stl_validator import STLValidator
from app.services.slicer.prusa_runner import PrusaSlicerRunner
from app.schemas.analysis import PrintSettings


class TestSTLValidator:
    """Test STL file validation."""

    def test_validate_file_not_exists(self):
        """Test validation of non-existent file."""
        validator = STLValidator()
        is_valid, error = validator.validate_file(Path("nonexistent.stl"))

        assert not is_valid
        assert "does not exist" in error

    def test_validate_file_wrong_extension(self, tmp_path):
        """Test validation of file with wrong extension."""
        validator = STLValidator()
        test_file = tmp_path / "test.txt"
        test_file.write_text("test content")

        is_valid, error = validator.validate_file(test_file)

        assert not is_valid
        assert "must have .stl extension" in error

    def test_validate_file_too_small(self, tmp_path):
        """Test validation of file that's too small."""
        validator = STLValidator()
        test_file = tmp_path / "test.stl"
        test_file.write_bytes(b"small")

        is_valid, error = validator.validate_file(test_file)

        assert not is_valid
        assert "too small" in error


class TestPrusaSlicerRunner:
    """Test PrusaSlicer runner."""

    def test_default_config(self):
        """Test default configuration generation."""
        runner = PrusaSlicerRunner()
        config = runner._get_default_config()

        assert "layer_height" in config
        assert "fill_density" in config
        assert config["layer_height"] == "0.2"

    def test_create_config_file(self, tmp_path):
        """Test configuration file creation."""
        runner = PrusaSlicerRunner()
        settings = {
            "layer_height": 0.3,
            "infill_density": 30,
            "supports": True
        }

        config_file = runner._create_config_file(tmp_path, settings)

        assert config_file.exists()
        content = config_file.read_text()
        assert "layer_height = 0.3" in content
        assert "fill_density = 30%" in content
        assert "support_material = 1" in content

    def test_parse_time_string(self):
        """Test time string parsing."""
        runner = PrusaSlicerRunner()

        # Test various time formats
        assert runner._parse_time_string("1h 30m 45s") == 1.5125
        assert runner._parse_time_string("45m 30s") == 0.7583333333333333
        assert runner._parse_time_string("30s") == 0.008333333333333333
        assert runner._parse_time_string("2h") == 2.0


@pytest.fixture
def mock_print_settings():
    """Mock print settings for testing."""
    return PrintSettings(
        layer_height=0.2,
        infill_density=20,
        infill_pattern="grid",
        supports=False,
        material_type="PLA"
    )


class TestAnalysisIntegration:
    """Integration tests for analysis workflow."""

    @patch("app.services.slicer.analysis_service.analyze_stl_task.delay")
    async def test_analyze_stl_queues_job(self, mock_delay):
        """Test that analyze_stl properly queues a job."""
        from app.services.slicer.analysis_service import AnalysisService

        mock_delay.return_value = None
        service = AnalysisService()

        job_id = await service.analyze_stl(
            file_id="test-file-id",
            settings_dict={"layer_height": 0.2},
            user_id="test-user-id"
        )

        assert job_id is not None
        assert len(job_id) > 0
        mock_delay.assert_called_once()

    async def test_get_analysis_status_pending(self):
        """Test getting status of pending analysis."""
        from app.services.slicer.analysis_service import AnalysisService

        service = AnalysisService()

        with patch("app.services.slicer.analysis_service.celery_app.AsyncResult") as mock_result:
            mock_result.return_value.state = "PENDING"

            status = await service.get_analysis_status("test-job-id")

            assert status.job_id == "test-job-id"
            assert status.status == "pending"
            assert status.progress == 0
