"""
Recruitment Tasks Router
========================
Actionable work requests dispatched between HR and Recruiters:
- HR assigns tasks to recruiters on specific jobs/candidates
- Recruiters view and update task progress (OPEN -> IN_PROGRESS -> COMPLETED)
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.dependencies import get_current_user, require_hr_or_admin, require_recruiter
from app.models.user import User
from app.models.recruitment_task import RecruitmentTask
from app.schemas.task import RecruitmentTaskCreate, RecruitmentTaskUpdate, RecruitmentTaskOut
from app.services import recruitment_task_service

router = APIRouter(tags=["Recruitment Tasks"])


def _to_task_out(task: RecruitmentTask) -> RecruitmentTaskOut:
    return RecruitmentTaskOut(
        id=task.id,
        job_id=task.job_id,
        candidate_id=task.candidate_id,
        assigned_to=task.assigned_to,
        created_by=task.created_by,
        title=task.title,
        description=task.description,
        status=task.status,
        priority=task.priority,
        due_at=task.due_at,
        completed_at=task.completed_at,
        created_at=task.created_at,
        updated_at=task.updated_at,
        assignee_name=task.assignee.name if task.assignee else "Unknown",
        creator_name=task.creator.name if task.creator else "Unknown",
        job_title=task.job.title if task.job else None,
        candidate_name=task.candidate.full_name if task.candidate else None,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Recruiter Personal Tasks
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/api/recruiter/tasks",
    response_model=List[RecruitmentTaskOut],
    summary="List all recruitment tasks assigned to current recruiter",
)
def get_my_tasks(
    status: Optional[str] = Query(None, description="Filter by status: OPEN, IN_PROGRESS, COMPLETED, CANCELLED"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter),
):
    tasks = recruitment_task_service.list_recruiter_tasks(
        db=db,
        recruiter_id=current_user.id,
        status_filter=status,
    )
    return [_to_task_out(t) for t in tasks]


# ─────────────────────────────────────────────────────────────────────────────
# Job / Candidate Tasks
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/api/jobs/{job_id}/tasks",
    response_model=List[RecruitmentTaskOut],
    summary="List tasks associated with a job requisition or candidate",
)
def get_job_tasks(
    job_id: int,
    candidate_id: Optional[int] = Query(None, description="Optional candidate filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tasks = recruitment_task_service.list_job_tasks(
        db=db,
        job_id=job_id,
        candidate_id=candidate_id,
    )
    return [_to_task_out(t) for t in tasks]


@router.post(
    "/api/jobs/{job_id}/tasks",
    response_model=RecruitmentTaskOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a recruitment task for an assigned recruiter (HR / Admin)",
)
def create_job_task(
    job_id: int,
    data: RecruitmentTaskCreate,
    candidate_id: Optional[int] = Query(None, description="Optional candidate id"),
    db: Session = Depends(get_db),
    hr_user: User = Depends(require_hr_or_admin),
):
    task = recruitment_task_service.create_task(
        db=db,
        job_id=job_id,
        candidate_id=candidate_id,
        assigned_to_id=data.assigned_to,
        created_by_user=hr_user,
        title=data.title,
        description=data.description,
        priority=data.priority,
        due_at=data.due_at,
    )
    return _to_task_out(task)


@router.patch(
    "/api/tasks/{task_id}",
    response_model=RecruitmentTaskOut,
    summary="Update recruitment task status or notes",
)
def update_task_status(
    task_id: int,
    data: RecruitmentTaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.status is None and data.description is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either status or description must be provided for update.",
        )
    task = recruitment_task_service.update_task_status(
        db=db,
        task_id=task_id,
        new_status=data.status or "OPEN",
        current_user=current_user,
        description=data.description,
    )
    return _to_task_out(task)
