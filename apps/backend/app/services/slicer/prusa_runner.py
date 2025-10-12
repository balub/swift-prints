"""
PrusaSlicer Docker Runner

Handles running PrusaSlicer in Docker containers for STL analysis.
Provides CLI wrapper and result parsing functionality.
"""

import json
import logging
import subprocess
import tempfile
from pathlib import Path
from typing import Dict, Optional

from app.core.config import get_settings
from app.schemas.analysis import PrintMetrics

logger = logging.getLogger(__name__)
settings = get_settings()


class PrusaSlicerRunner:
    """Wrapper for running PrusaSlicer in Docker containers."""

    def __init__(self):
        self.docker_image = settings.prusa_slicer_image
        self.default_config = self._get_default_config()

    def analyze_stl(self, stl_file: Path, print_settings: Dict) -> PrintMetrics:
        """
        Analyze STL file using PrusaSlicer.

        Args:
            stl_file: Path to the STL file to analyze
            print_settings: Dictionary of print settings

        Returns:
            PrintMetrics object with analysis results
        """
        try:
            # Create temporary directory for analysis
            with tempfile.TemporaryDirectory() as temp_dir:
                temp_path = Path(temp_dir)

                # Copy STL file to temp directory
                input_stl = temp_path / "input.stl"
                input_stl.write_bytes(stl_file.read_bytes())

                # Generate configuration file
                config_file = self._create_config_file(
                    temp_path, print_settings)

                # Run PrusaSlicer in Docker
                gcode_file = self._run_slicer(
                    temp_path, input_stl, config_file)

                # Parse results
                metrics = self._parse_gcode_metrics(gcode_file)

                # Add STL-specific metrics
                stl_metrics = self._analyze_stl_geometry(input_stl)
                metrics.volume_mm3 = stl_metrics.get("volume_mm3", 0)
                metrics.complexity_score = stl_metrics.get(
                    "complexity_score", 1.0)

                return metrics

        except Exception as e:
            logger.error(f"PrusaSlicer analysis failed: {e}")
            raise Exception(f"Slicer analysis error: {str(e)}")

    def _create_config_file(self, temp_path: Path, print_settings: Dict) -> Path:
        """Create PrusaSlicer configuration file from print settings."""
        config = self.default_config.copy()

        # Update config with user settings
        if "layer_height" in print_settings:
            config["layer_height"] = print_settings["layer_height"]
        if "infill_density" in print_settings:
            config["fill_density"] = f"{print_settings['infill_density']}%"
        if "infill_pattern" in print_settings:
            config["fill_pattern"] = print_settings["infill_pattern"]
        if "supports" in print_settings:
            config["support_material"] = "1" if print_settings["supports"] else "0"
        if "nozzle_temperature" in print_settings:
            config["temperature"] = print_settings["nozzle_temperature"]
        if "bed_temperature" in print_settings:
            config["bed_temperature"] = print_settings["bed_temperature"]

        # Write config file
        config_file = temp_path / "config.ini"
        with open(config_file, "w") as f:
            f.write("[print_settings]\n")
            for key, value in config.items():
                f.write(f"{key} = {value}\n")

        return config_file

    def _run_slicer(self, temp_path: Path, stl_file: Path, config_file: Path) -> Path:
        """Run PrusaSlicer in Docker container."""
        output_file = temp_path / "output.gcode"

        # Build Docker command
        docker_cmd = [
            "docker", "run", "--rm",
            "-v", f"{temp_path}:/workspace",
            self.docker_image,
            "--load-config", "/workspace/config.ini",
            "--output", "/workspace/output.gcode",
            "--export-gcode",
            "/workspace/input.stl"
        ]

        logger.info(f"Running PrusaSlicer: {' '.join(docker_cmd)}")

        try:
            result = subprocess.run(
                docker_cmd,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )

            if result.returncode != 0:
                logger.error(f"PrusaSlicer error: {result.stderr}")
                raise Exception(f"PrusaSlicer failed: {result.stderr}")

            if not output_file.exists():
                raise Exception("PrusaSlicer did not generate output file")

            return output_file

        except subprocess.TimeoutExpired:
            raise Exception("PrusaSlicer analysis timed out")
        except Exception as e:
            raise Exception(f"Docker execution failed: {str(e)}")

    def _parse_gcode_metrics(self, gcode_file: Path) -> PrintMetrics:
        """Parse metrics from generated G-code file."""
        metrics = PrintMetrics(
            filament_grams=0.0,
            print_time_hours=0.0,
            volume_mm3=0.0,
            complexity_score=1.0,
            supports_required=False
        )

        try:
            with open(gcode_file, "r") as f:
                content = f.read()

            # Parse PrusaSlicer comments for metrics
            lines = content.split("\n")
            for line in lines:
                line = line.strip()

                # Filament usage (in mm, convert to grams assuming PLA density)
                if line.startswith("; filament used [mm] ="):
                    filament_mm = float(line.split("=")[1].strip())
                    # Convert mm to grams (PLA density ~1.24 g/cm³, 1.75mm filament)
                    filament_volume_cm3 = (
                        filament_mm * 3.14159 * (1.75/2)**2) / 1000
                    metrics.filament_grams = filament_volume_cm3 * 1.24

                # Print time
                elif line.startswith("; estimated printing time"):
                    time_str = line.split("=")[1].strip()
                    metrics.print_time_hours = self._parse_time_string(
                        time_str)

                # Support detection
                elif "support" in line.lower() and "enable" in line.lower():
                    metrics.supports_required = True

            return metrics

        except Exception as e:
            logger.error(f"Failed to parse G-code metrics: {e}")
            # Return default metrics if parsing fails
            return metrics

    def _analyze_stl_geometry(self, stl_file: Path) -> Dict:
        """Analyze STL geometry for volume and complexity."""
        try:
            # Simple STL analysis using Docker
            temp_dir = stl_file.parent

            # Use a simple Python script in Docker to analyze STL
            analysis_script = temp_dir / "analyze_stl.py"
            with open(analysis_script, "w") as f:
                f.write("""
import struct
import sys

def analyze_stl(filename):
    with open(filename, 'rb') as f:
        # Skip header
        f.read(80)
        
        # Read triangle count
        triangle_count = struct.unpack('<I', f.read(4))[0]
        
        # Simple complexity based on triangle count
        complexity = min(triangle_count / 10000.0, 5.0)  # Scale 0-5
        
        # Rough volume estimation (very basic)
        volume = triangle_count * 0.1  # Placeholder calculation
        
        print(f"{{\"triangle_count\": {triangle_count}, \"complexity_score\": {complexity}, \"volume_mm3\": {volume}}}")

if __name__ == "__main__":
    analyze_stl(sys.argv[1])
""")

            # Run analysis in Python container
            docker_cmd = [
                "docker", "run", "--rm",
                "-v", f"{temp_dir}:/workspace",
                "python:3.10-slim",
                "python", "/workspace/analyze_stl.py", "/workspace/input.stl"
            ]

            result = subprocess.run(
                docker_cmd,
                capture_output=True,
                text=True,
                timeout=60
            )

            if result.returncode == 0:
                return json.loads(result.stdout.strip())
            else:
                logger.warning(
                    f"STL geometry analysis failed: {result.stderr}")
                return {"volume_mm3": 1000, "complexity_score": 1.0}

        except Exception as e:
            logger.warning(f"STL geometry analysis error: {e}")
            return {"volume_mm3": 1000, "complexity_score": 1.0}

    def _parse_time_string(self, time_str: str) -> float:
        """Parse time string to hours."""
        try:
            # Handle formats like "1h 30m 45s" or "45m 30s" or "30s"
            hours = 0
            minutes = 0
            seconds = 0

            parts = time_str.lower().replace(",", "").split()
            for part in parts:
                if "h" in part:
                    hours = float(part.replace("h", ""))
                elif "m" in part:
                    minutes = float(part.replace("m", ""))
                elif "s" in part:
                    seconds = float(part.replace("s", ""))

            return hours + (minutes / 60) + (seconds / 3600)

        except Exception:
            logger.warning(f"Failed to parse time string: {time_str}")
            return 1.0  # Default to 1 hour

    def _get_default_config(self) -> Dict:
        """Get default PrusaSlicer configuration."""
        return {
            "layer_height": "0.2",
            "first_layer_height": "0.2",
            "fill_density": "20%",
            "fill_pattern": "grid",
            "support_material": "0",
            "support_material_auto": "1",
            "temperature": "210",
            "bed_temperature": "60",
            "nozzle_diameter": "0.4",
            "filament_diameter": "1.75",
            "print_speed": "50",
            "travel_speed": "120",
            "retraction_length": "0.8",
            "retraction_speed": "35"
        }
