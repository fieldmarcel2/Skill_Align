"""
Recruitment Communication Service
=================================
Contextual communication between HR and Recruiters.

Guarantees data isolation:
- Job-level discussion is strictly scoped to the job requisition.
- Candidate-level discussion is strictly scoped to (job_id, candidate_id) context.
- Candidate discussions never leak across different job applications.
"""

from datetime import datetime, timezone
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.job import Job
from app.models.user import User
from app.models.recruitment_message import RecruitmentMessage
from app.models.notification import Notification
from app.services.recruiter_assignment_service import is_recruiter_assigned


def _verify_job_collaboration_access(db: Session, job_id: int, user: User) -> Job:
    """Verify user is Admin, HR creator of job, or an assigned Recruiter."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job requisition with id {job_id} not found."
        )

    if user.role.name == "Admin":
        return job
    if user.role.name == "HR" and job.created_by == user.id:
        return job
    if user.role.name == "Recruiter" and is_recruiter_assigned(db, job_id, user.id):
        return job

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You are not authorized to access communication for this job requisition.",
    )


def send_message(
    db: Session,
    job_id: int,
    candidate_id: Optional[int],
    sender_user: User,
    message_text: str,
    message_type: str = "GENERAL",
    is_private: bool = False,
) -> RecruitmentMessage:
    """Post an internal recruitment message at job level or candidate level."""
    job = _verify_job_collaboration_access(db, job_id, sender_user)

    msg = RecruitmentMessage(
        job_id=job_id,
        candidate_id=candidate_id,
        sender_id=sender_user.id,
        message=message_text.strip(),
        message_type=message_type,
        is_private=is_private,
        created_at=datetime.now(timezone.utc),
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    # Contextual notification dispatch
    # If recruiter sent a message, notify HR job owner
    if sender_user.role.name == "Recruiter" and job.created_by != sender_user.id:
        context_str = f"candidate on {job.title}" if candidate_id else f"job '{job.title}'"
        notif = Notification(
            user_id=job.created_by,
            channel="in_app",
            subject=f"New Note from {sender_user.name} ({job.title})",
            body=f"{sender_user.name} posted a {message_type.replace('_', ' ').lower()} regarding {context_str}: {message_text[:150]}",
            status="sent",
        )
        db.add(notif)
        db.commit()

    return msg


def list_messages(
    db: Session,
    job_id: int,
    candidate_id: Optional[int] = None,
    current_user: Optional[User] = None,
    limit: int = 100,
) -> List[RecruitmentMessage]:
    """
    List messages for a job or candidate.
    Strictly isolated:
    - candidate_id=None -> Job-level communication
    - candidate_id=123 -> Candidate-specific communication on this job
    """
    if current_user:
        _verify_job_collaboration_access(db, job_id, current_user)

    query = db.query(RecruitmentMessage).filter(RecruitmentMessage.job_id == job_id)

    if candidate_id is not None:
        query = query.filter(RecruitmentMessage.candidate_id == candidate_id)
    else:
        query = query.filter(RecruitmentMessage.candidate_id.is_(None))

    # Hide private notes written by other recruiters
    if current_user and current_user.role.name == "Recruiter":
        query = query.filter(
            (RecruitmentMessage.is_private.is_(False)) |
            (RecruitmentMessage.sender_id == current_user.id)
        )

    return query.order_by(RecruitmentMessage.created_at.asc()).limit(limit).all()
