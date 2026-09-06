"""
User management service (Admin operations).

Business logic for creating HR/Recruiter accounts and managing user state.
"""

import math
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_
from fastapi import HTTPException, status

from app.core.security import hash_password, normalize_phone
from app.models.user import User
from app.models.role import Role
from app.schemas.user import UserCreate, UserUpdate, UserOut, PaginatedUsersResponse


def create_user(db: Session, data: UserCreate) -> UserOut:
    """
    Admin creates an HR or Recruiter account.

    Additional server-side guard: even if schema validation passes,
    we double-check that the role is not Admin (1) or Candidate (4).
    """
    # Double-check role is HR or Recruiter (defence-in-depth beyond schema)
    if data.role_id not in (2, 3):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admins can only create HR or Recruiter accounts.",
        )

    # Verify the role exists
    role = db.query(Role).filter(Role.id == data.role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Role with id={data.role_id} does not exist.",
        )

    clean_email = data.email.strip().lower()
    # Prevent duplicate email
    if db.query(User).filter(User.email.ilike(clean_email)).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    norm_phone = None
    if data.phone_number and data.phone_number.strip():
        try:
            norm_phone = normalize_phone(data.phone_number.strip())
            if db.query(User).filter(User.phone_number == norm_phone).first():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="An account with this phone number already exists.",
                )
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e),
            )

    user = User(
        name=data.name.strip(),
        email=clean_email,
        password_hash=hash_password(data.password),
        phone_number=norm_phone,
        role_id=data.role_id,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


def list_users(db: Session, role_id: Optional[int] = None) -> list[UserOut]:
    """List all users, optionally filtered by role."""
    query = db.query(User)
    if role_id is not None:
        query = query.filter(User.role_id == role_id)
    return [UserOut.model_validate(u) for u in query.order_by(User.id).all()]


def list_users_paginated(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
    role: Optional[str] = None,
    user_status: Optional[str] = None,
) -> PaginatedUsersResponse:
    """
    Admin: List users with server-side pagination, search, role, and status filters.

    Args:
        page:        1-indexed page number
        page_size:   results per page (max 100)
        search:      partial match on name or email
        role:        role name filter (Admin, HR, Recruiter, Candidate)
        user_status: 'active' | 'deactivated'
    """
    page_size = min(page_size, 100)  # cap at 100
    query = db.query(User).join(User.role)

    # Search filter (name OR email)
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(User.name.ilike(term), User.email.ilike(term))
        )

    # Role filter
    if role and role.strip():
        query = query.filter(Role.name == role.strip())

    # Active/Deactivated filter
    if user_status:
        if user_status.lower() == "active":
            query = query.filter(User.is_active == True)  # noqa: E712
        elif user_status.lower() == "deactivated":
            query = query.filter(User.is_active == False)  # noqa: E712

    total_items = query.count()
    total_pages = max(1, math.ceil(total_items / page_size))
    offset = (page - 1) * page_size

    users = query.order_by(User.created_at.desc()).offset(offset).limit(page_size).all()

    return PaginatedUsersResponse(
        data=[UserOut.model_validate(u) for u in users],
        total_items=total_items,
        total_pages=total_pages,
        current_page=page,
    )


def get_user(db: Session, user_id: int) -> UserOut:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return UserOut.model_validate(user)


def update_user(db: Session, user_id: int, data: UserUpdate) -> UserOut:
    """Partial update — only name and is_active can be changed."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    if data.name is not None:
        user.name = data.name.strip()
    if data.is_active is not None:
        user.is_active = data.is_active

    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


def toggle_user_status(db: Session, user_id: int) -> UserOut:
    """Quick-toggle: flip is_active without sending the full payload."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    if user.role.name == "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin accounts cannot be deactivated via this endpoint."
        )
    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


def get_dashboard_stats(db: Session) -> dict:
    """Admin dashboard summary statistics."""
    total = db.query(User).count()
    active = db.query(User).filter(User.is_active == True).count()  # noqa: E712
    hr_count = db.query(User).join(User.role).filter(User.role.has(name="HR")).count()
    recruiter_count = db.query(User).join(User.role).filter(User.role.has(name="Recruiter")).count()
    candidate_count = db.query(User).join(User.role).filter(User.role.has(name="Candidate")).count()

    from app.models.skill import Skill
    skill_count = db.query(Skill).count()

    return {
        "total_users": total,
        "active_users": active,
        "hr_users": hr_count,
        "recruiters": recruiter_count,
        "candidates": candidate_count,
        "total_skills": skill_count,
    }


def delete_user(db: Session, user_id: int, current_admin_id: Optional[int] = None) -> dict:
    """
    Permanently delete a user account and safely cascade all related candidate profiles,
    skills, evaluations, and job records.
    """
    from app.models.candidate import Candidate
    from app.models.candidate_skill import CandidateSkill
    from app.models.candidate_scorecard import CandidateScorecard
    from app.models.interview import Interview
    from app.models.job import Job
    from app.models.job_skill import JobSkill
    from app.models.match_result import MatchResult
    from app.models.notification import Notification
    from app.models.otp_verification import OTPVerification

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    if current_admin_id and user.id == current_admin_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot delete your own admin account.",
        )

    if user.role.name == "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator accounts cannot be deleted.",
        )

    user_name = user.name

    # 1. Cascade Candidate profile and evaluations
    candidate = db.query(Candidate).filter(Candidate.user_id == user.id).first()
    if candidate:
        mr_ids = [m[0] for m in db.query(MatchResult.id).filter(MatchResult.candidate_id == candidate.id).all()]
        if mr_ids:
            db.query(Interview).filter(Interview.match_result_id.in_(mr_ids)).delete(synchronize_session=False)
            db.query(CandidateScorecard).filter(CandidateScorecard.match_result_id.in_(mr_ids)).delete(synchronize_session=False)
            db.query(MatchResult).filter(MatchResult.candidate_id == candidate.id).delete(synchronize_session=False)
        db.query(CandidateSkill).filter(CandidateSkill.candidate_id == candidate.id).delete(synchronize_session=False)
        db.delete(candidate)

    # 2. Cascade Recruiter jobs and associated matches
    jobs = db.query(Job).filter(Job.created_by == user.id).all()
    for j in jobs:
        mr_ids = [m[0] for m in db.query(MatchResult.id).filter(MatchResult.job_id == j.id).all()]
        if mr_ids:
            db.query(Interview).filter(Interview.match_result_id.in_(mr_ids)).delete(synchronize_session=False)
            db.query(CandidateScorecard).filter(CandidateScorecard.match_result_id.in_(mr_ids)).delete(synchronize_session=False)
            db.query(MatchResult).filter(MatchResult.job_id == j.id).delete(synchronize_session=False)
        db.query(JobSkill).filter(JobSkill.job_id == j.id).delete(synchronize_session=False)
        db.delete(j)

    # 3. Cascade HR evaluation scorecards & interviews
    db.query(CandidateScorecard).filter(CandidateScorecard.reviewer_id == user.id).delete(synchronize_session=False)
    db.query(Interview).filter(Interview.scheduled_by == user.id).delete(synchronize_session=False)

    # 4. Cascade Recruiter Assignments, Tasks, and Collaboration
    from app.models.job_recruiter_assignment import JobRecruiterAssignment
    from app.models.candidate_recruiter_assignment import CandidateRecruiterAssignment
    from app.models.recruitment_task import RecruitmentTask
    from app.models.recruitment_message import RecruitmentMessage
    from app.models.audit_log import AuditLog

    db.query(JobRecruiterAssignment).filter(
        (JobRecruiterAssignment.recruiter_id == user.id) | (JobRecruiterAssignment.assigned_by == user.id)
    ).delete(synchronize_session=False)

    db.query(CandidateRecruiterAssignment).filter(
        (CandidateRecruiterAssignment.recruiter_id == user.id) | (CandidateRecruiterAssignment.assigned_by == user.id)
    ).delete(synchronize_session=False)

    db.query(RecruitmentMessage).filter(RecruitmentMessage.sender_id == user.id).delete(synchronize_session=False)

    db.query(RecruitmentTask).filter(
        (RecruitmentTask.assigned_to == user.id) | (RecruitmentTask.created_by == user.id)
    ).delete(synchronize_session=False)

    # Nullify references in MatchResult
    db.query(MatchResult).filter(MatchResult.matched_by == user.id).update(
        {MatchResult.matched_by: None}, synchronize_session=False
    )
    db.query(MatchResult).filter(MatchResult.recruiter_id == user.id).update(
        {MatchResult.recruiter_id: None}, synchronize_session=False
    )

    # Nullify references in AuditLog
    db.query(AuditLog).filter(AuditLog.actor_id == user.id).update(
        {AuditLog.actor_id: None}, synchronize_session=False
    )

    # 5. Cleanup Notifications & OTPs
    db.query(Notification).filter(Notification.user_id == user.id).delete(synchronize_session=False)
    if user.phone_number:
        db.query(OTPVerification).filter(OTPVerification.phone_number == user.phone_number).delete(synchronize_session=False)

    # Commit child cascading deletions to release foreign keys
    db.commit()

    # 6. Delete User record
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        db.delete(user)
        db.commit()

    return {
        "message": f"User '{user_name}' (ID: {user_id}) permanently removed successfully.",
        "id": user_id,
    }
