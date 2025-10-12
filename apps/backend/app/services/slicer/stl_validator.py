"""
STL File Validator

Validates STL files for format correctness and printability.
Checks file structure, geometry, and common issues.
"""

import logging
import struct
from pathlib import Path
from typing import Tuple, Optional

logger = logging.getLogger(__name__)


class STLValidator:
    """Validator for STL files."""

    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
    MIN_FILE_SIZE = 84  # Minimum STL file size (header + triangle count)

    def validate_file(self, file_path: Path) -> Tuple[bool, Optional[str]]:
        """
        Validate STL file format and content.

        Args:
            file_path: Path to the STL file

        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            # Check file exists
            if not file_path.exists():
                return False, "File does not exist"

            # Check file size
            file_size = file_path.stat().st_size
            if file_size > self.MAX_FILE_SIZE:
                return False, f"File too large: {file_size} bytes (max {self.MAX_FILE_SIZE})"

            if file_size < self.MIN_FILE_SIZE:
                return False, f"File too small: {file_size} bytes (min {self.MIN_FILE_SIZE})"

            # Check file extension
            if file_path.suffix.lower() != ".stl":
                return False, "File must have .stl extension"

            # Validate STL format
            is_valid, error = self._validate_stl_format(file_path)
            if not is_valid:
                return False, error

            # Validate geometry
            is_valid, error = self._validate_geometry(file_path)
            if not is_valid:
                return False, error

            return True, None

        except Exception as e:
            logger.error(f"STL validation error: {e}")
            return False, f"Validation error: {str(e)}"

    def _validate_stl_format(self, file_path: Path) -> Tuple[bool, Optional[str]]:
        """Validate STL file format (binary or ASCII)."""
        try:
            with open(file_path, "rb") as f:
                # Read first few bytes to determine format
                header = f.read(80)

                # Check if it's ASCII STL
                if header.startswith(b"solid"):
                    return self._validate_ascii_stl(file_path)
                else:
                    return self._validate_binary_stl(file_path)

        except Exception as e:
            return False, f"Failed to read STL file: {str(e)}"

    def _validate_binary_stl(self, file_path: Path) -> Tuple[bool, Optional[str]]:
        """Validate binary STL format."""
        try:
            with open(file_path, "rb") as f:
                # Skip 80-byte header
                f.read(80)

                # Read triangle count
                triangle_count_bytes = f.read(4)
                if len(triangle_count_bytes) != 4:
                    return False, "Invalid binary STL: missing triangle count"

                triangle_count = struct.unpack("<I", triangle_count_bytes)[0]

                # Validate triangle count
                if triangle_count == 0:
                    return False, "STL file contains no triangles"

                if triangle_count > 1000000:  # 1M triangles max
                    return False, f"STL file too complex: {triangle_count} triangles (max 1,000,000)"

                # Calculate expected file size
                # 50 bytes per triangle
                expected_size = 80 + 4 + (triangle_count * 50)
                actual_size = file_path.stat().st_size

                if actual_size != expected_size:
                    return False, f"Invalid binary STL: size mismatch (expected {expected_size}, got {actual_size})"

                # Validate a few triangles
                for i in range(min(10, triangle_count)):
                    triangle_data = f.read(50)
                    if len(triangle_data) != 50:
                        return False, f"Invalid triangle data at triangle {i}"

                    # Parse triangle (normal + 3 vertices + attribute)
                    try:
                        normal = struct.unpack("<3f", triangle_data[0:12])
                        vertex1 = struct.unpack("<3f", triangle_data[12:24])
                        vertex2 = struct.unpack("<3f", triangle_data[24:36])
                        vertex3 = struct.unpack("<3f", triangle_data[36:48])

                        # Basic sanity checks
                        for coord in normal + vertex1 + vertex2 + vertex3:
                            if abs(coord) > 10000:  # Reasonable coordinate limit
                                return False, f"Invalid coordinate value: {coord}"

                    except struct.error:
                        return False, f"Failed to parse triangle {i}"

                return True, None

        except Exception as e:
            return False, f"Binary STL validation error: {str(e)}"

    def _validate_ascii_stl(self, file_path: Path) -> Tuple[bool, Optional[str]]:
        """Validate ASCII STL format."""
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()

            lines = content.strip().split("\n")

            # Check basic structure
            if not lines[0].strip().startswith("solid"):
                return False, "ASCII STL must start with 'solid'"

            if not lines[-1].strip().startswith("endsolid"):
                return False, "ASCII STL must end with 'endsolid'"

            # Count triangles and validate structure
            triangle_count = 0
            i = 1

            while i < len(lines) - 1:
                line = lines[i].strip()

                if line.startswith("facet normal"):
                    # Validate facet structure
                    if i + 6 >= len(lines):
                        return False, f"Incomplete facet at line {i + 1}"

                    # Check outer loop
                    if not lines[i + 1].strip() == "outer loop":
                        return False, f"Expected 'outer loop' at line {i + 2}"

                    # Check vertices
                    for j in range(3):
                        vertex_line = lines[i + 2 + j].strip()
                        if not vertex_line.startswith("vertex"):
                            return False, f"Expected vertex at line {i + 3 + j}"

                        # Validate vertex coordinates
                        try:
                            coords = vertex_line.split()[1:4]
                            if len(coords) != 3:
                                return False, f"Invalid vertex format at line {i + 3 + j}"

                            for coord in coords:
                                float(coord)  # Validate numeric
                        except (ValueError, IndexError):
                            return False, f"Invalid vertex coordinates at line {i + 3 + j}"

                    # Check endloop and endfacet
                    if not lines[i + 5].strip() == "endloop":
                        return False, f"Expected 'endloop' at line {i + 6}"

                    if not lines[i + 6].strip() == "endfacet":
                        return False, f"Expected 'endfacet' at line {i + 7}"

                    triangle_count += 1
                    i += 7
                else:
                    i += 1

            if triangle_count == 0:
                return False, "ASCII STL contains no triangles"

            if triangle_count > 1000000:
                return False, f"STL file too complex: {triangle_count} triangles (max 1,000,000)"

            return True, None

        except Exception as e:
            return False, f"ASCII STL validation error: {str(e)}"

    def _validate_geometry(self, file_path: Path) -> Tuple[bool, Optional[str]]:
        """Validate STL geometry for printability."""
        try:
            # Basic geometry checks
            # For now, just ensure the file is readable
            # More advanced checks could include:
            # - Manifold validation
            # - Normal consistency
            # - Minimum feature size
            # - Overhang detection

            return True, None

        except Exception as e:
            return False, f"Geometry validation error: {str(e)}"
