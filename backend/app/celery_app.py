"""
Celery Application Configuration
===================================
Configures Celery with Redis as broker and result backend.
Three dedicated queues:
  - resume_processing: Heavy I/O resume extraction/parsing tasks
  - matching: CPU-bound candidate-job scoring
  - notifications: Email/SMS notification dispatch
"""

from celery import Celery
from app.core.config import settings


def create_celery_app() -> Celery:
    celery_app = Celery(
        "skillaign",
        broker=settings.effective_celery_broker,
        backend=settings.effective_celery_backend,
        include=[
            "app.tasks.resume_tasks",
            "app.tasks.matching_tasks",
        ],
    )

    celery_app.conf.update(
        # Serialization
        task_serializer="json",
        result_serializer="json",
        accept_content=["json"],
        # Timezone
        timezone="Asia/Kolkata",
        enable_utc=True,
        # Queue routing
        task_routes={
            "app.tasks.resume_tasks.*": {"queue": "resume_processing"},
            "app.tasks.matching_tasks.*": {"queue": "matching"},
        },
        # Reliability settings
        task_acks_late=True,
        task_reject_on_worker_lost=True,
        # Result expiry (24 hours)
        result_expires=86400,
        # Worker concurrency
        worker_prefetch_multiplier=1,
        # Retry settings
        task_max_retries=3,
        task_default_retry_delay=30,
        # Redis connection pool
        broker_connection_retry_on_startup=True,
        broker_transport_options={
            "visibility_timeout": 3600,  # 1 hour
            "socket_keepalive": True,
        },
        # Allow Redis SSL connections (required for cloud Redis)
        broker_use_ssl=False,
        redis_backend_use_ssl=False,
    )

    return celery_app


celery_app = create_celery_app()
