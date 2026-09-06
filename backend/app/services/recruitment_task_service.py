"""
Recruitment Task Service
========================
Manages actionable requests dispatched by HR to assigned recruiters.
"""

from datetime import datetime, timezone
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.job import Job
from app.models.user import User
from app.models.recruitment_task import RecruitmentTask, TASK_STATUSES, TASK_PRIORITIES
from app.models.notification import Notification
from app.services.recruiter_assignment_service import is_recruiter_assigned
from app.services.audit_service import log_audit


def create_task(
    db: Session,
    job_id: int,
    candidate_id: Optional[int],
    assigned_to_id: int,
    created_by_user: User,
    title: str,
    description: Optional[str] = None,
    priority: str = "MEDIUM",
    due_at: Optional[datetime] = None,
) -> RecruitmentTask:
    """HR creates an actionable task for an assigned recruiter."""
    # 1. Verify target recruiter is assigned to the job
    if not is_recruiter_assigned(db, job_id, assigned_to_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assigned recruiter is not actively assigned to this job requisition.",
        )

    job = db.query(Job).filter(Job.id == job_id).first()

    now = datetime.now(timezone.utc)
    task = RecruitmentTask(
        job_id=job_id,
        candidate_id=candidate_id,
        assigned_to=assigned_to_id,
        created_by=created_by_user.id,
        title=title.strip(),
        description=description.strip() if description else None,
        status="OPEN",
        priority=priority if priority in TASK_PRIORITIES else "MEDIUM",
        due_at=due_at,
        created_at=now,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    # Notify assigned recruiter
    notif = Notification(
        user_id=assigned_to_id,
        channel="in_app",
        subject=f"New Task: {title}",
        body=(
            f"HR {created_by_user.name} assigned you a task on requisition '{job.title if job else job_id}': "
            f"'{title}'. Priority: {priority}."
        ),
        status="sent",
    )
    db.add(notif)
    db.commit()

    log_audit(
        db,
        actor_id=created_by_user.id,
        action="CREATE_TASK",
        entity_type="recruitment_task",
        entity_id=task.id,
        job_id=job_id,
        candidate_id=candidate_id,
        details={"title": title, "assigned_to": assigned_to_id, "priority": priority},
    )

    return task


def update_task_status(
    db: Session,
    task_id: int,
    new_status: str,
    current_user: User,
    description: Optional[str] = None,
) -> RecruitmentTask:
    """Update task status (e.g. mark IN_PROGRESS or COMPLETED)."""
    task = db.query(RecruitmentTask).filter(RecruitmentTask.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with id {task_id} not found."
        )

    # Authorization: only assigned recruiter, HR creator, or Admin can update
    is_assignee = task.assigned_to == current_user.id
    is_creator = task.created_by == current_user.id
    is_admin = current_user.role.name == "Admin"

    if not (is_assignee or is_creator or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to update this recruitment task.",
        )

    if new_status not in TASK_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid task status. Must be one of: {', '.join(TASK_STATUSES)}."
        )

    task.status = new_status
    if description:
        task.description = description

    now = datetime.now(timezone.utc)
    if new_status == "COMPLETED":
        task.completed_at = now
        # Notify HR creator
        if task.created_by != current_user.id:
            notif = Notification(
                user_id=task.created_by,
                channel="in_app",
                subject=f"Task Completed: {task.title}",
                body=f"Recruiter {current_user.name} has completed the task: '{task.title}'.",
                status="sent",
            )
            db.add(notif)

    db.commit()
    db.refresh(task)

    log_audit(
        db,
        actor_id=current_user.id,
        action="UPDATE_TASK",
        entity_type="recruitment_task",
        entity_id=task.id,
        job_id=task.job_id,
        candidate_id=task.candidate_id,
        details={"status": new_status},
    )

    return task


def list_recruiter_tasks(
    db: Session,
    recruiter_id: int,
    status_filter: Optional[str] = None,
) -> List[RecruitmentTask]:
    """Retrieve tasks assigned to a recruiter."""
    query = db.query(RecruitmentTask).filter(RecruitmentTask.assigned_to == recruiter_id)
    if status_filter:
        query = query.filter(RecruitmentTask.status == status_filter)
    return query.order_by(
        RecruitmentTask.status == "OPEN",
        RecruitmentTask.created_at.desc(),
    ).all()


def list_job_tasks(
    db: Session,
    job_id: int,
    candidate_id: Optional[int] = None,
) -> List[RecruitmentTask]:
    """Retrieve tasks associated with a job requisition."""
    query = db.query(RecruitmentTask).filter(RecruitmentTask.job_id == job_id)
    if candidate_id is not None:
        query = query.filter(RecruitmentTask.candidate_id == candidate_id)
    return query.order_by(RecruitmentTask.created_at.desc()).all()
