#!/usr/bin/env python3
"""
Start Celery worker for processing analysis tasks.
"""

from app.core.celery_app import celery_app
import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))


if __name__ == "__main__":
    # Start Celery worker
    celery_app.worker_main([
        "worker",
        "--loglevel=info",
        "--queues=analysis,celery",
        "--concurrency=2"
    ])
