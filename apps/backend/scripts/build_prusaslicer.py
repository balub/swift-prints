#!/usr/bin/env python3
"""
Build PrusaSlicer Docker image for STL analysis.
"""

import subprocess
import sys
from pathlib import Path


def build_prusaslicer_image():
    """Build the PrusaSlicer Docker image."""
    backend_dir = Path(__file__).parent.parent

    print("Building PrusaSlicer Docker image...")

    try:
        # Build the Docker image
        result = subprocess.run([
            "docker", "build",
            "-f", "docker/Dockerfile.prusaslicer",
            "-t", "prusaslicer:latest",
            "."
        ], cwd=backend_dir, check=True, capture_output=True, text=True)

        print("✅ PrusaSlicer Docker image built successfully!")
        print(f"Output: {result.stdout}")

        return True

    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to build PrusaSlicer Docker image:")
        print(f"Error: {e.stderr}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False


if __name__ == "__main__":
    success = build_prusaslicer_image()
    sys.exit(0 if success else 1)
