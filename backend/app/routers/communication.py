"""
Communication Router
====================
Contextual messaging between HR and Recruiters.
Endpoints support:
- Job-level discussion (candidate_id = None)
- Candidate-level review notes & recommendation threads (strictly scoped to job_id + candidate_id)
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.recruitment_message import RecruitmentMessage
from app.schemas.communication import RecruitmentMessageCreate, RecruitmentMessageOut
from app.services import communication_service

router = APIRouter(prefix="/api/jobs", tags=["Recruitment Communication"])


def _to_message_out(msg: RecruitmentMessage) -> RecruitmentMessageOut:
    return RecruitmentMessageOut(
        id=msg.id,
        job_id=msg.job_id,
        candidate_id=msg.candidate_id,
        sender_id=msg.sender_id,
        message=msg.message,
        message_type=msg.message_type,
        is_private=msg.is_private,
        created_at=msg.created_at,
        read_at=msg.read_at,
        sender_name=msg.sender.name if msg.sender else "User",
        sender_role=msg.sender.role.name if (msg.sender and msg.sender.role) else "User",
    )


# ─────────────────────────────────────────────────────────────────────────────
# Job-Level Messages
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/{job_id}/messages",
    response_model=List[RecruitmentMessageOut],
    summary="List job-level recruitment collaboration messages",
)
def list_job_messages(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    messages = communication_service.list_messages(
        db=db,
        job_id=job_id,
        candidate_id=None,
        current_user=current_user,
    )
    return [_to_message_out(m) for m in messages]


@router.post(
    "/{job_id}/messages",
    response_model=RecruitmentMessageOut,
    status_code=status.HTTP_201_CREATED,
    summary="Send a job-level recruitment message",
)
def send_job_message(
    job_id: int,
    data: RecruitmentMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    msg = communication_service.send_message(
        db=db,
        job_id=job_id,
        candidate_id=None,
        sender_user=current_user,
        message_text=data.message,
        message_type=data.message_type,
        is_private=data.is_private,
    )
    return _to_message_out(msg)


# ─────────────────────────────────────────────────────────────────────────────
# Candidate-Level Messages (Contextual to this Job)
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/{job_id}/candidates/{candidate_id}/messages",
    response_model=List[RecruitmentMessageOut],
    summary="List candidate-specific discussion messages for this job requisition",
)
def list_candidate_messages(
    job_id: int,
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    messages = communication_service.list_messages(
        db=db,
        job_id=job_id,
        candidate_id=candidate_id,
        current_user=current_user,
    )
    return [_to_message_out(m) for m in messages]


@router.post(
    "/{job_id}/candidates/{candidate_id}/messages",
    response_model=RecruitmentMessageOut,
    status_code=status.HTTP_201_CREATED,
    summary="Send a candidate review note or recommendation for this job requisition",
)
def send_candidate_message(
    job_id: int,
    candidate_id: int,
    data: RecruitmentMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    msg = communication_service.send_message(
        db=db,
        job_id=job_id,
        candidate_id=candidate_id,
        sender_user=current_user,
        message_text=data.message,
        message_type=data.message_type,
        is_private=data.is_private,
    )
    return _to_message_out(msg)
