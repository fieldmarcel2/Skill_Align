"""
Job Management Router
=====================

Endpoints:
- POST /api/jobs        (Recruiter: Create job with required/preferred skills and weights)
- GET  /api/jobs        (Authenticated: List jobs; Recruiters see their jobs or all, HR sees active jobs)
- GET  /api/jobs/{id}   (Authenticated: Get job details with skills)
- PUT  /api/jobs/{id}   (Recruiter: Update owned job and skills)
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.dependencies import get_current_user, require_recruiter
from app.models.user import User
from app.schemas.job import JobCreate, JobUpdate, JobOut
from app.services import job_service

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])


@router.post(
    "",
    response_model=JobOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new job (Recruiter only)",
    description="Recruiter creates a job with title, min experience, description, and required/preferred skills with weights."
)
def create_job(
    data: JobCreate,
    db: Session = Depends(get_db),
    recruiter: User = Depends(require_recruiter)
):
    return job_service.create_job(db, data, creator=recruiter)


@router.get(
    "",
    response_model=List[JobOut],
    status_code=status.HTTP_200_OK,
    summary="List jobs",
    description="List jobs. Recruiters can filter by their own jobs, HR can view active jobs for matching."
)
def list_jobs(
    status: Optional[str] = Query(None, description="Filter by job status (draft, active, closed)"),
    my_jobs_only: bool = Query(False, description="Filter to only jobs created by the requesting recruiter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    creator_id = current_user.id if (my_jobs_only and current_user.role.name == "Recruiter") else None
    return job_service.list_jobs(db, creator_id=creator_id, status_filter=status)


@router.get(
    "/{job_id}",
    response_model=JobOut,
    status_code=status.HTTP_200_OK,
    summary="Get job by ID"
)
def get_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return job_service.get_job_out(db, job_id)


@router.put(
    "/{job_id}",
    response_model=JobOut,
    status_code=status.HTTP_200_OK,
    summary="Update job (Recruiter only)",
    description="Recruiter updates their own job specifications and associated skills."
)
def update_job(
    job_id: int,
    data: JobUpdate,
    db: Session = Depends(get_db),
    recruiter: User = Depends(require_recruiter)
):
    return job_service.update_job(db, job_id, data, requester=recruiter)


@router.delete(
    "/{job_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a job (Recruiter only)",
    description="Recruiter deletes their own job. This will also remove all associated job skills and match results."
)
def delete_job(
    job_id: int,
    db: Session = Depends(get_db),
    recruiter: User = Depends(require_recruiter)
):
    job_service.delete_job(db, job_id, requester=recruiter)

