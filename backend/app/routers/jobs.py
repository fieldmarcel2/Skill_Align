"""
Job Management Router
=====================

CRITICAL ARCHITECTURE CHANGE (v2.0):
  HR is now the OWNER of job requisitions.
  Recruiters can VIEW jobs and match results but CANNOT create/edit/delete.

Permissions:
- POST   /api/jobs         → HR / Admin only
- GET    /api/jobs         → All authenticated users
- GET    /api/jobs/{id}    → All authenticated users
- PUT    /api/jobs/{id}    → HR / Admin only
- DELETE /api/jobs/{id}    → HR / Admin only

When a job is published (status → 'active') or matching-relevant fields
are updated, the backend automatically queues a background matching task.
Recruiters do not need to manually trigger matching for new jobs.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, status, Query, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.dependencies import get_current_user, require_hr_or_admin
from app.models.user import User
from app.schemas.job import JobCreate, JobUpdate, JobOut
from app.schemas.recruiter_assignment import (
    JobRecruiterAssignmentIn,
    JobRecruiterUpdateRole,
    JobRecruiterAssignmentOut,
)
from app.services import job_service, recruiter_assignment_service

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])


@router.post(
    "",
    response_model=JobOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new job requisition (HR / Admin only)",
    description=(
        "HR creates a job with title, min experience, description, and required/preferred skills with weights. "
        "If status is 'active', automatic candidate matching is queued in the background. "
        "Recruiters cannot create jobs."
    )
)
def create_job(
    data: JobCreate,
    db: Session = Depends(get_db),
    hr_user: User = Depends(require_hr_or_admin),
):
    return job_service.create_job(db, data, creator=hr_user)


@router.get(
    "",
    response_model=List[JobOut],
    status_code=status.HTTP_200_OK,
    summary="List jobs",
    description="List jobs. HR can filter by their own jobs. Recruiters see assigned jobs.",
)
def list_jobs(
    status: Optional[str] = Query(None, description="Filter by job status (draft, active, closed)"),
    my_jobs_only: bool = Query(False, description="Filter to jobs created by the requesting user (HR only)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    creator_id = None
    job_ids = None

    if current_user.role.name == "Recruiter":
        # Recruiters only see jobs assigned to them
        job_ids = recruiter_assignment_service.get_recruiter_assigned_job_ids(db, current_user.id)
    elif my_jobs_only and current_user.role.name in ("HR", "Admin"):
        creator_id = current_user.id

    return job_service.list_jobs(db, creator_id=creator_id, status_filter=status, job_ids=job_ids)


@router.get(
    "/{job_id}",
    response_model=JobOut,
    status_code=status.HTTP_200_OK,
    summary="Get job by ID",
)
def get_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role.name == "Recruiter":
        if not recruiter_assignment_service.is_recruiter_assigned(db, job_id, current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You are not assigned to this job requisition.",
            )
    return job_service.get_job_out(db, job_id)


# ---------------------------------------------------------------------------
# Recruiter Assignment Endpoints (HR / Admin)
# ---------------------------------------------------------------------------

@router.post(
    "/{job_id}/recruiters",
    response_model=JobRecruiterAssignmentOut,
    status_code=status.HTTP_201_CREATED,
    summary="Assign a recruiter to a job (HR / Admin only)",
)
def assign_recruiter(
    job_id: int,
    data: JobRecruiterAssignmentIn,
    db: Session = Depends(get_db),
    hr_user: User = Depends(require_hr_or_admin),
):
    return recruiter_assignment_service.assign_recruiter_to_job(
        db=db,
        job_id=job_id,
        recruiter_id=data.recruiter_id,
        assigned_by_user=hr_user,
        assignment_role=data.assignment_role,
    )


@router.delete(
    "/{job_id}/recruiters/{recruiter_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a recruiter from a job (HR / Admin only)",
)
def remove_recruiter(
    job_id: int,
    recruiter_id: int,
    db: Session = Depends(get_db),
    hr_user: User = Depends(require_hr_or_admin),
):
    recruiter_assignment_service.remove_recruiter_from_job(
        db=db,
        job_id=job_id,
        recruiter_id=recruiter_id,
        removed_by_user=hr_user,
    )


@router.patch(
    "/{job_id}/recruiters/{recruiter_id}",
    response_model=JobRecruiterAssignmentOut,
    summary="Update a recruiter's role on a job (HR / Admin only)",
)
def update_recruiter_role(
    job_id: int,
    recruiter_id: int,
    data: JobRecruiterUpdateRole,
    db: Session = Depends(get_db),
    hr_user: User = Depends(require_hr_or_admin),
):
    return recruiter_assignment_service.update_recruiter_role(
        db=db,
        job_id=job_id,
        recruiter_id=recruiter_id,
        new_role=data.assignment_role,
        updated_by_user=hr_user,
    )


@router.get(
    "/{job_id}/recruiters",
    response_model=List[JobRecruiterAssignmentOut],
    summary="List recruiters assigned to a job requisition",
)
def list_job_recruiters(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role.name == "Recruiter":
        if not recruiter_assignment_service.is_recruiter_assigned(db, job_id, current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You are not assigned to this job requisition.",
            )
    return recruiter_assignment_service.list_job_recruiters(db=db, job_id=job_id)


@router.put(
    "/{job_id}",
    response_model=JobOut,
    status_code=status.HTTP_200_OK,
    summary="Update job requisition (HR / Admin only)",
    description=(
        "HR updates job specifications and associated skills. "
        "If matching-relevant fields change (skills, experience, work mode, status), "
        "existing match results are marked stale and re-matching is queued automatically. "
        "Recruiters cannot edit job requirements."
    )
)
def update_job(
    job_id: int,
    data: JobUpdate,
    db: Session = Depends(get_db),
    hr_user: User = Depends(require_hr_or_admin),
):
    return job_service.update_job(db, job_id, data, requester=hr_user)


@router.delete(
    "/{job_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a job requisition (HR / Admin only)",
    description=(
        "HR deletes a job requisition. "
        "This will also cascade-remove all associated job skills and match results. "
        "Recruiters cannot delete jobs."
    )
)
def delete_job(
    job_id: int,
    db: Session = Depends(get_db),
    hr_user: User = Depends(require_hr_or_admin),
):
    job_service.delete_job(db, job_id, requester=hr_user)
