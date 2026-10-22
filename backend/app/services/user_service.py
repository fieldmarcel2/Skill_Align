"""
User management service (Admin operations).

Business logic for creating HR/Recruiter accounts and managing user state.
"""

import math
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
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
    db.flush()

    from app.services.audit_service import log_audit
    log_audit(
        db=db,
        actor_id=None,
        action="USER_CREATED",
        entity_type="user",
        entity_id=user.id,
        details={
            "name": user.name,
            "email": user.email,
            "role": role.name,
            "phone_number": norm_phone,
        },
        commit=False,
    )

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


def update_user(db: Session, user_id: int, data: UserUpdate, current_admin_id: Optional[int] = None) -> UserOut:
    """Update user profile: name, email, phone_number, role, and is_active."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    # Security Guard: External candidate identities must remain authentic and tamper-free.
    # Administrators can only manage internal staff (Recruiters, Hiring Managers/HR, Admins).
    if user.role.name == "Candidate":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Security restriction: Administrators cannot modify external candidate profiles. Candidates manage their own credentials and application data to preserve audit authenticity.",
        )

    old_details = {
        "name": user.name,
        "email": user.email,
        "phone_number": user.phone_number,
        "role": user.role.name,
        "is_active": user.is_active,
    }

    # 1. Update Name
    if data.name is not None:
        trimmed_name = data.name.strip()
        if not trimmed_name:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Name cannot be empty.")
        user.name = trimmed_name

    # 2. Update Email
    if data.email is not None:
        email_clean = str(data.email).strip().lower()
        if not email_clean:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email cannot be blank.")
        # Check uniqueness against other users
        existing_email = (
            db.query(User)
            .filter(func.lower(User.email) == email_clean, User.id != user_id)
            .first()
        )
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email '{email_clean}' is already in use by another account."
            )
        user.email = email_clean

    # 3. Update Phone Number
    if data.phone_number is not None:
        phone_raw = data.phone_number.strip()
        if not phone_raw:
            user.phone_number = None
        else:
            try:
                norm_phone = normalize_phone(phone_raw)
            except Exception:
                norm_phone = phone_raw
            # Check uniqueness against other users
            existing_phone = (
                db.query(User)
                .filter(User.phone_number == norm_phone, User.id != user_id)
                .first()
            )
            if existing_phone:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Phone number '{phone_raw}' is already associated with another account."
                )
            user.phone_number = norm_phone

    # 4. Update Role
    target_role: Optional[Role] = None
    if data.role_id is not None:
        target_role = db.query(Role).filter(Role.id == data.role_id).first()
    elif data.role is not None:
        role_lookup = data.role.strip()
        if role_lookup.upper() in ("HM", "HIRING MANAGER", "HIRING_MANAGER"):
            role_lookup = "HR"
        target_role = (
            db.query(Role)
            .filter(func.lower(Role.name) == role_lookup.lower())
            .first()
        )

    if target_role:
        # Guard: prevent converting internal corporate accounts into candidates
        if target_role.name == "Candidate":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Security restriction: Internal staff accounts cannot be converted into candidate profiles.",
            )
        # Guard: prevent demoting the last active administrator
        if user.role.name == "Admin" and target_role.name != "Admin":
            active_admins = (
                db.query(User)
                .join(Role)
                .filter(Role.name == "Admin", User.is_active == True)
                .count()
            )
            if active_admins <= 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot change the role of the primary/sole active administrator."
                )
        user.role_id = target_role.id

    # 5. Update Status
    if data.is_active is not None:
        if user.role.name == "Admin" and data.is_active is False:
            active_admins = (
                db.query(User)
                .join(Role)
                .filter(Role.name == "Admin", User.is_active == True)
                .count()
            )
            if active_admins <= 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot deactivate the sole active administrator account."
                )
        user.is_active = data.is_active

    # 6. Audit Trail Logging
    from app.services.audit_service import log_audit
    log_audit(
        db=db,
        actor_id=current_admin_id,
        action="USER_PROFILE_UPDATED",
        entity_type="user",
        entity_id=user.id,
        details={
            "user_id": user.id,
            "previous": old_details,
            "updated": {
                "name": user.name,
                "email": user.email,
                "phone_number": user.phone_number,
                "role": user.role.name,
                "is_active": user.is_active,
            },
        },
        commit=False,
    )

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
    old_active = user.is_active
    user.is_active = not user.is_active

    from app.services.audit_service import log_audit
    log_audit(
        db=db,
        actor_id=None,
        action="USER_STATUS_TOGGLED",
        entity_type="user",
        entity_id=user.id,
        from_state="active" if old_active else "deactivated",
        to_state="active" if user.is_active else "deactivated",
        details={
            "user_id": user.id,
            "user_name": user.name,
            "user_email": user.email,
            "is_active": user.is_active,
        },
        commit=False,
    )

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
    role_name = user.role.name if user.role else "Unknown"

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

    # 6. Record Audit Log before final deletion
    from app.services.audit_service import log_audit
    log_audit(
        db=db,
        actor_id=current_admin_id,
        action="USER_DELETED",
        entity_type="user",
        entity_id=user_id,
        details={
            "deleted_user_id": user_id,
            "deleted_user_name": user_name,
            "deleted_user_role": role_name,
            "deleted_by_admin_id": current_admin_id,
        },
        commit=False,
    )

    # Delete User record
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        db.delete(user)
        db.commit()

    return {
        "message": f"User '{user_name}' (ID: {user_id}) permanently removed successfully.",
        "id": user_id,
    }
