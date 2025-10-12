"""
Celery application configuration for async task processing.
"""

from celery import Celery

from app.core.config import get_settings

settings = get_settings()

# Create Celery app
celery_app = Celery(
    "swift_prints_worker",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["app.services.slicer.analysis_service"]
)

# Configure Celery
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
)

# Task routing
celery_app.conf.task_routes = {
    "app.services.slicer.analysis_service.analyze_stl_task": {"queue": "analysis"},
}

if __name__ == "__main__":
    celery_app.start()
