"""
Interview Management Router
===========================

Endpoints:
- POST  /api/interviews             (HR Only: Schedule interview for screened/approved candidate)
- GET   /api/interviews             (HR & Admin: List scheduled interviews)
- GET   /api/interviews/my          (Candidate: View own scheduled interviews)
- GET   /api/interviews/{id}        (HR, Admin, or Candidate owner)
- PATCH /api/interviews/{id}        (HR Only: Update interview status/feedback)
"""

from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.dependencies import get_current_user, require_hr, require_admin_or_hr
from app.models.user import User
from app.models.interview import Interview
from app.models.match_result import MatchResult
from app.models.notification import Notification
from app.models.candidate import Candidate
from app.schemas.interview import InterviewCreate, InterviewUpdate, InterviewOut

router = APIRouter(prefix="/api/interviews", tags=["Interviews"])


from app.services.email_service import send_interview_scheduled_email


def _to_interview_out(interview: Interview) -> InterviewOut:
    candidate_name = None
    job_title = None
    if interview.match_result:
        if interview.match_result.candidate:
            candidate_name = interview.match_result.candidate.full_name
        if interview.match_result.job:
            job_title = interview.match_result.job.title

    scheduler_name = interview.scheduler.name if interview.scheduler else None

    return InterviewOut(
        id=interview.id,
        match_result_id=interview.match_result_id,
        scheduled_by=interview.scheduled_by,
        interview_date=interview.interview_date,
        interview_type=interview.interview_type,
        meeting_link=interview.meeting_link,
        interview_mode=interview.interview_mode,
        scheduled_end=interview.scheduled_end,
        feedback=interview.feedback,
        status=interview.status,
        created_at=interview.created_at,
        scheduler_name=scheduler_name,
        candidate_name=candidate_name,
        job_title=job_title,
    )


@router.post(
    "",
    response_model=InterviewOut,
    status_code=status.HTTP_201_CREATED,
    summary="Schedule an interview (HR Only)",
    description="HR schedules an interview for a candidate, transitions match status to 'interview_scheduled', and dispatches candidate notification via SendGrid and in-app alert."
)
def create_interview(
    data: InterviewCreate,
    db: Session = Depends(get_db),
    hr_user: User = Depends(require_hr)
):
    match_result = db.query(MatchResult).filter(MatchResult.id == data.match_result_id).first()
    if not match_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"MatchResult with id {data.match_result_id} not found."
        )

    # Create interview
    interview = Interview(
        match_result_id=data.match_result_id,
        scheduled_by=hr_user.id,
        interview_date=data.interview_date,
        interview_type=data.interview_type,
        meeting_link=data.meeting_link,
        interview_mode=data.interview_mode or "online",
        scheduled_end=data.scheduled_end,
        feedback=data.feedback,
        status=data.status or "scheduled",
    )
    db.add(interview)

    # Update match status to interview_scheduled
    match_result.status = "interview_scheduled"

    # Send notification to candidate if requested
    if data.send_notification and match_result.candidate and match_result.candidate.user:
        cand_user = match_result.candidate.user
        job_title = match_result.job.title if match_result.job else "Position"
        company_name = (
            match_result.job.client_name
            or match_result.job.department
            or "SkillAlign Enterprise Client"
        )
        formatted_date = data.interview_date.strftime("%B %d, %Y")
        formatted_time = data.interview_date.strftime("%I:%M %p")

        # In-app notification
        notification = Notification(
            user_id=cand_user.id,
            channel="email",
            subject=f"Interview Scheduled: {job_title}",
            body=(
                f"Hello {match_result.candidate.full_name},\n\n"
                f"Your {data.interview_type} interview for the position '{job_title}' at {company_name} "
                f"has been scheduled for {formatted_date} at {formatted_time}.\n"
                f"Mode: {data.interview_mode or 'Online'}\n"
                f"Meeting Link: {data.meeting_link or 'Will be updated'}\n"
                f"Scheduled by: {hr_user.name} (HR Team).\n\n"
                f"Please check your dashboard for further details."
            ),
            status="sent",
        )
        db.add(notification)

        # SendGrid transactional email delivery
        if cand_user.email:
            try:
                recruiter_email = match_result.job.creator.email if (match_result.job and match_result.job.creator) else None
                send_interview_scheduled_email(
                    candidate_email=cand_user.email,
                    candidate_name=match_result.candidate.full_name,
                    job_title=job_title,
                    company=company_name,
                    interview_date=formatted_date,
                    interview_time=formatted_time,
                    interview_mode=data.interview_mode or "online",
                    meeting_link=data.meeting_link,
                    interviewer_name=hr_user.name,
                    recruiter_name=hr_user.name,
                    recruiter_email=recruiter_email,
                )
            except Exception as e:
                # Do not fail interview scheduling if email service fails
                pass

    db.commit()
    db.refresh(interview)

    return _to_interview_out(interview)


@router.get(
    "",
    response_model=List[InterviewOut],
    status_code=status.HTTP_200_OK,
    summary="List all interviews (HR & Admin)"
)
def list_interviews(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    user: User = Depends(require_admin_or_hr)
):
    query = db.query(Interview)
    if status_filter:
        query = query.filter(Interview.status == status_filter)
    interviews = query.order_by(Interview.interview_date.asc()).all()
    return [_to_interview_out(i) for i in interviews]


@router.get(
    "/my",
    response_model=List[InterviewOut],
    status_code=status.HTTP_200_OK,
    summary="List candidate's scheduled interviews (Candidate)"
)
def list_my_interviews(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if not candidate:
        return []

    interviews = (
        db.query(Interview)
        .join(Interview.match_result)
        .filter(MatchResult.candidate_id == candidate.id)
        .order_by(Interview.interview_date.asc())
        .all()
    )
    return [_to_interview_out(i) for i in interviews]


@router.get(
    "/{interview_id}",
    response_model=InterviewOut,
    status_code=status.HTTP_200_OK,
    summary="Get interview by ID"
)
def get_interview(
    interview_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Interview with id {interview_id} not found."
        )

    # Authorization Check: Privileged roles (Admin, HR, Recruiter) or Candidate owner only
    user_role = current_user.role.name if current_user.role else ""
    is_privileged = user_role in ["HR", "Recruiter", "Admin"]
    is_owner = (
        interview.match_result
        and interview.match_result.candidate
        and interview.match_result.candidate.user_id == current_user.id
    )

    if not is_privileged and not is_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You do not have permission to view this interview."
        )

    return _to_interview_out(interview)


@router.patch(
    "/{interview_id}",
    response_model=InterviewOut,
    status_code=status.HTTP_200_OK,
    summary="Update interview status or feedback (HR & Admin)"
)
def update_interview(
    interview_id: int,
    data: InterviewUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin_or_hr)
):
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Interview with id {interview_id} not found."
        )

    if data.interview_date is not None:
        interview.interview_date = data.interview_date
    if data.interview_type is not None:
        interview.interview_type = data.interview_type
    if data.meeting_link is not None:
        interview.meeting_link = data.meeting_link
    if data.interview_mode is not None:
        interview.interview_mode = data.interview_mode
    if data.scheduled_end is not None:
        interview.scheduled_end = data.scheduled_end
    if data.feedback is not None:
        interview.feedback = data.feedback
    if data.status is not None:
        interview.status = data.status

    db.commit()
    db.refresh(interview)
    return _to_interview_out(interview)
