"""
SkillAlign Celery Worker Entry Point
======================================
Run with:
    celery -A worker.celery_app worker --loglevel=info -Q resume_processing,matching,notifications

For development with auto-reload:
    celery -A worker.celery_app worker --loglevel=debug -Q resume_processing,matching,notifications

For production (multiple workers per queue):
    celery -A worker.celery_app worker --loglevel=info -Q resume_processing --concurrency=2
    celery -A worker.celery_app worker --loglevel=info -Q matching --concurrency=4
"""

from app.celery_app import celery_app  

import app.tasks.resume_tasks  # noqa: F401 no quality assurance
import app.tasks.matching_tasks  # noqa: F401


if __name__ == "__main__":
    celery_app.start()
