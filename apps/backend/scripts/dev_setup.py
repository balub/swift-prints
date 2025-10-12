#!/usr/bin/env python3
"""
Development setup script for Swift Prints Backend.
"""
import os
import sys
import subprocess
from pathlib import Path


def run_command(cmd, cwd=None):
    """Run a shell command and return the result."""
    print(f"Running: {cmd}")
    result = subprocess.run(cmd, shell=True, cwd=cwd,
                            capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
        return False
    print(f"Success: {result.stdout}")
    return True


def setup_environment():
    """Set up the development environment."""
    backend_dir = Path(__file__).parent.parent

    print("Setting up Swift Prints Backend development environment...")

    # Create .env file if it doesn't exist
    env_file = backend_dir / ".env"
    env_example = backend_dir / ".env.example"

    if not env_file.exists() and env_example.exists():
        print("Creating .env file from .env.example...")
        env_file.write_text(env_example.read_text())

    # Create upload directory
    upload_dir = backend_dir / "uploads"
    upload_dir.mkdir(exist_ok=True)
    print(f"Created upload directory: {upload_dir}")

    # Create temp directory
    temp_dir = backend_dir / "temp"
    temp_dir.mkdir(exist_ok=True)
    print(f"Created temp directory: {temp_dir}")

    # Initialize Alembic if not already done
    alembic_dir = backend_dir / "alembic" / "versions"
    if not alembic_dir.exists():
        print("Initializing Alembic migrations...")
        alembic_dir.mkdir(parents=True, exist_ok=True)

    print("Development environment setup complete!")
    print("\nNext steps:")
    print("1. Install dependencies: pip install -r requirements.txt")
    print("2. Start Redis and PostgreSQL: docker-compose -f docker-compose.dev.yml up -d")
    print("3. Run migrations: alembic upgrade head")
    print("4. Start the server: uvicorn main:app --reload")


if __name__ == "__main__":
    setup_environment()
