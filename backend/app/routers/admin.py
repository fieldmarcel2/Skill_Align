"""
Admin Management Router
=======================

Endpoints:
- GET   /api/admin/users              (Admin: Paginated + filtered user list)
- GET   /api/admin/users/{id}         (Admin: Extended user detail with profile info)
- PATCH /api/admin/users/{id}/toggle-status (Admin: Quick activate/deactivate)
"""

import json
import math
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Any, Dict
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy import or_, func
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.dependencies import require_admin
from app.models.user import User
from app.models.role import Role
from app.models.candidate import Candidate
from app.models.job import Job
from app.models.audit_log import AuditLog
from app.schemas.user import PaginatedUsersResponse, UserOut
from app.schemas.audit_log import HiringLogsResponse, HiringAuditLogEntry, HiringLogsMetrics
from app.services import user_service

router = APIRouter(prefix="/api/admin", tags=["Admin Management"])
logger = logging.getLogger("skillalign.admin")


@router.get(
    "/users",
    response_model=PaginatedUsersResponse,
    status_code=status.HTTP_200_OK,
    summary="List all users with pagination, search, and filters (Admin only)",
    description=(
        "Returns a paginated list of all users. Supports server-side filtering by role, "
        "status (active/deactivated), and search by name or email. "
        "Response includes pagination metadata."
    )
)
def list_users_paginated(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(20, ge=1, le=100, description="Results per page (max 100)"),
    search: Optional[str] = Query(None, description="Search by name or email (partial match)"),
    role: Optional[str] = Query(None, description="Filter by role name: Admin, HR, Recruiter, Candidate"),
    user_status: Optional[str] = Query(None, alias="status", description="Filter by status: active, deactivated"),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    return user_service.list_users_paginated(
        db,
        page=page,
        page_size=page_size,
        search=search,
        role=role,
        user_status=user_status,
    )


@router.get(
    "/users/{user_id}/detail",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Get extended user detail (Admin only)",
    description="Returns full user profile including candidate resume info, recruiter jobs, skills."
)
def get_user_detail(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="User not found.")

    result: Dict[str, Any] = {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "phone_number": user.phone_number,
        "role": user.role.name,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "candidate_profile": None,
        "jobs_created": [],
    }

    # Extended: Candidate profile
    if user.role.name == "Candidate":
        candidate = db.query(Candidate).filter(Candidate.user_id == user.id).first()
        if candidate:
            result["candidate_profile"] = {
                "id": candidate.id,
                "full_name": candidate.full_name,
                "phone": candidate.phone,
                "total_experience_years": float(candidate.total_experience_years),
                "education_degree": candidate.education_degree,
                "education_institution": candidate.education_institution,
                "resume_uploaded": bool(candidate.resume_s3_key or candidate.resume_file_path),
                "resume_filename": candidate.resume_filename,
                "resume_uploaded_at": candidate.resume_uploaded_at.isoformat() if candidate.resume_uploaded_at else None,
                "resume_parsed_at": candidate.resume_parsed_at.isoformat() if candidate.resume_parsed_at else None,
                "extracted_data": candidate.extracted_data,
                "has_raw_text": bool(candidate.resume_raw_text or candidate.resume_extracted_text_s3_key),
                "skills": [
                    {
                        "skill_name": cs.skill.name,
                        "category": cs.skill.category,
                        "proficiency_level": cs.proficiency_level,
                        "years_experience": cs.years_experience,
                    }
                    for cs in candidate.skills
                ],
            }

    # Extended: Jobs created (for Recruiters)
    if user.role.name == "Recruiter":
        jobs = db.query(Job).filter(Job.created_by == user.id).order_by(Job.created_at.desc()).all()
        result["jobs_created"] = [
            {
                "id": j.id,
                "title": j.title,
                "department": j.department,
                "status": j.status,
                "min_experience_years": float(j.min_experience_years),
                "created_at": j.created_at.isoformat() if j.created_at else None,
                "skills_count": len(j.job_skills),
            }
            for j in jobs
        ]

    return result


@router.patch(
    "/users/{user_id}/toggle-status",
    response_model=UserOut,
    status_code=status.HTTP_200_OK,
    summary="Toggle user active/deactivated status (Admin only)",
    description="Quickly activates or deactivates a user account. Admin accounts cannot be toggled."
)
def toggle_user_status(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    return user_service.toggle_user_status(db, user_id)


@router.delete(
    "/users/{user_id}",
    status_code=status.HTTP_200_OK,
    summary="Permanently delete a user (Admin only)",
    description="Permanently deletes a user account and cascades all related candidate data, skills, and applications."
)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    return user_service.delete_user(db, user_id, current_admin_id=admin.id)


# ─── Global Hiring & Audit Logs ──────────────────────────────────────────────

ACTION_CATEGORY_MAP: Dict[str, tuple[str, str]] = {
    # Offers & Hires
    "OFFER_CREATED": ("OFFERS", "Offer Created"),
    "OFFER_SUBMITTED_FOR_HM_REVIEW": ("OFFERS", "Offer Submitted to HM Review"),
    "OFFER_APPROVED_BY_HM": ("OFFERS", "Offer Approved by HM"),
    "OFFER_CHANGES_REQUESTED_BY_HM": ("OFFERS", "Offer Revision Requested by HM"),
    "OFFER_PDF_GENERATED": ("OFFERS", "Official Offer PDF Generated"),
    "OFFER_SENT": ("OFFERS", "Offer Letter Dispatched"),
    "OFFER_ACCEPTED": ("OFFERS", "Offer Accepted (Hired)"),
    "OFFER_REJECTED_CANDIDATE_BLACKLISTED": ("OFFERS", "Offer Declined & Cooldown Activated"),
    "OFFER_REJECTED": ("OFFERS", "Offer Declined"),

    # Interviews & Scheduling
    "INTERVIEW_REQUESTED_AND_SLOTS_PROPOSED": ("INTERVIEWS", "Interview Requested & Slots Proposed"),
    "SLOTS_SENT_TO_CANDIDATE": ("INTERVIEWS", "Interview Slots Sent to Candidate"),
    "CANDIDATE_SLOT_SELECTED": ("INTERVIEWS", "Candidate Selected Interview Slot"),
    "INTERVIEW_CONFIRMED": ("INTERVIEWS", "Interview Confirmed & Scheduled"),
    "INTERVIEW_COMPLETED": ("INTERVIEWS", "Interview Completed"),
    "INTERVIEW_ROUND_2_CREATED": ("INTERVIEWS", "Additional Interview Round Scheduled"),
    "ADDITIONAL_ROUND_2_ADDED": ("INTERVIEWS", "Interview Round Added"),
    "ROUND_1_PASS": ("INTERVIEWS", "Round 1 Evaluation: PASS"),
    "ROUND_2_FINAL_GO": ("INTERVIEWS", "Final Round Evaluation: GO"),
    "INTERVIEWER_EVALUATION_SAVED": ("INTERVIEWS", "Interview Scorecard Submitted"),

    # Hiring Manager Reviews
    "SUBMITTED_TO_HM": ("REVIEWS", "Shortlist Submitted for HM Review"),
    "HM_REVIEW_STARTED": ("REVIEWS", "Hiring Manager Review Initiated"),
    "HM_FEEDBACK_GO": ("REVIEWS", "HM Review Decision: GO"),
    "HM_FEEDBACK_NO_GO": ("REVIEWS", "HM Review Decision: NO GO"),
    "HM_REJECTED_CANDIDATE": ("REVIEWS", "Candidate Rejected by HM"),

    # Sourcing & Talent Pipeline
    "CANDIDATE_MATCHED": ("SOURCING", "Candidate Matched to Requisition"),
    "CANDIDATE_SHORTLISTED": ("SOURCING", "Candidate Shortlisted by Recruiter"),
    "CLAIM_CANDIDATE": ("SOURCING", "Candidate Claimed by Recruiter"),
    "ASSIGN_RECRUITER": ("SOURCING", "Requisition Assigned to Recruiter"),
    "UNASSIGN_CANDIDATE": ("SOURCING", "Candidate Unassigned"),
    "CHANGE_RECRUITER_ROLE": ("SOURCING", "Recruiter Role Adjusted"),

    # Operational Tasks
    "CREATE_TASK": ("TASKS", "Recruitment Task Created"),
    "UPDATE_TASK": ("TASKS", "Recruitment Task Updated"),
}


def _resolve_category_and_label(action: str) -> tuple[str, str]:
    if action in ACTION_CATEGORY_MAP:
        return ACTION_CATEGORY_MAP[action]
    act_upper = action.upper()
    if "OFFER" in act_upper or "HIRE" in act_upper:
        cat = "OFFERS"
    elif "INTERVIEW" in act_upper or "SLOT" in act_upper or "ROUND" in act_upper:
        cat = "INTERVIEWS"
    elif "HM" in act_upper or "REVIEW" in act_upper:
        cat = "REVIEWS"
    elif "TASK" in act_upper:
        cat = "TASKS"
    else:
        cat = "SOURCING"
    label = action.replace("_", " ").title()
    return cat, label


def _format_relative_time(dt: datetime) -> str:
    now = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    diff = now - dt
    seconds = int(diff.total_seconds())
    if seconds < 60:
        return "Just now"
    minutes = seconds // 60
    if minutes < 60:
        return f"{minutes}m ago"
    hours = minutes // 60
    if hours < 24:
        return f"{hours}h ago"
    days = hours // 24
    if days < 30:
        return f"{days}d ago"
    return dt.strftime("%b %d, %Y")


def _parse_details_dict(raw: Optional[str]) -> Dict[str, Any]:
    if not raw:
        return {}
    try:
        data = json.loads(raw)
        if isinstance(data, dict):
            return data
        return {"value": data}
    except Exception:
        return {"note": raw}


@router.get(
    "/hiring-logs",
    response_model=HiringLogsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get comprehensive recruitment and hiring audit logs (Admin only)",
    description=(
        "Returns system-wide hiring activity logs, including stage transitions, offers, "
        "interview scheduling, HM reviews, and sourcing assignments with metrics and filtering."
    )
)
def get_hiring_logs(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    category: Optional[str] = Query(None, description="Category: ALL, OFFERS, INTERVIEWS, REVIEWS, SOURCING, TASKS"),
    action: Optional[str] = Query(None, description="Filter by exact action name"),
    search: Optional[str] = Query(None, description="Search term for actions, candidate, job, actor, or details"),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    from app.services.audit_service import prune_audit_logs
    # Prune database to retain maximum 50 most recent audit activities
    try:
        prune_audit_logs(db, max_keep=50)
    except Exception as e:
        logger.warning(f"Audit log auto-prune notice: {e}")

    # Calculate overall metrics bounded by latest 50 entries
    now = datetime.now(timezone.utc)
    h24 = now - timedelta(hours=24)

    page_size = min(page_size, 50)
    total_logs_count = db.query(func.count(AuditLog.id)).scalar() or 0
    total_hires = db.query(func.count(AuditLog.id)).filter(AuditLog.action == "OFFER_ACCEPTED").scalar() or 0
    total_offers = db.query(func.count(AuditLog.id)).filter(
        AuditLog.action.in_(["OFFER_SENT", "OFFER_CREATED", "OFFER_APPROVED_BY_HM", "OFFER_ACCEPTED"])
    ).scalar() or 0
    total_interviews = db.query(func.count(AuditLog.id)).filter(
        or_(
            AuditLog.action.like("INTERVIEW%"),
            AuditLog.action.like("%SLOT%"),
            AuditLog.action.like("ROUND%"),
        )
    ).scalar() or 0
    recent_24h = db.query(func.count(AuditLog.id)).filter(AuditLog.created_at >= h24).scalar() or 0

    # Base query for log entries
    query = (
        db.query(
            AuditLog,
            User.name.label("actor_name"),
            User.email.label("actor_email"),
            Role.name.label("actor_role"),
            Job.title.label("job_title"),
            Job.department.label("job_department"),
            Candidate.full_name.label("candidate_name"),
        )
        .outerjoin(User, AuditLog.actor_id == User.id)
        .outerjoin(Role, User.role_id == Role.id)
        .outerjoin(Job, AuditLog.job_id == Job.id)
        .outerjoin(Candidate, AuditLog.candidate_id == Candidate.id)
    )

    # Category filtering
    if category and category.upper() != "ALL":
        cat = category.upper()
        if cat in ("OFFERS", "HIRES"):
            query = query.filter(
                AuditLog.action.in_([
                    "OFFER_CREATED", "OFFER_SUBMITTED_FOR_HM_REVIEW", "OFFER_APPROVED_BY_HM",
                    "OFFER_CHANGES_REQUESTED_BY_HM", "OFFER_PDF_GENERATED", "OFFER_SENT",
                    "OFFER_ACCEPTED", "OFFER_REJECTED_CANDIDATE_BLACKLISTED", "OFFER_REJECTED"
                ])
            )
        elif cat == "INTERVIEWS":
            query = query.filter(
                or_(
                    AuditLog.action.like("INTERVIEW%"),
                    AuditLog.action.like("%SLOT%"),
                    AuditLog.action.like("ROUND%"),
                )
            )
        elif cat == "REVIEWS":
            query = query.filter(
                AuditLog.action.in_([
                    "SUBMITTED_TO_HM", "HM_REVIEW_STARTED", "HM_FEEDBACK_GO",
                    "HM_FEEDBACK_NO_GO", "HM_REJECTED_CANDIDATE"
                ])
            )
        elif cat == "SOURCING":
            query = query.filter(
                AuditLog.action.in_([
                    "CANDIDATE_MATCHED", "CANDIDATE_SHORTLISTED", "CLAIM_CANDIDATE",
                    "ASSIGN_RECRUITER", "UNASSIGN_CANDIDATE", "CHANGE_RECRUITER_ROLE"
                ])
            )
        elif cat == "TASKS":
            query = query.filter(AuditLog.action.in_(["CREATE_TASK", "UPDATE_TASK"]))

    # Action filtering
    if action:
        query = query.filter(AuditLog.action == action)

    # Search filtering across all attributes
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                AuditLog.action.ilike(term),
                AuditLog.from_state.ilike(term),
                AuditLog.to_state.ilike(term),
                AuditLog.details.ilike(term),
                User.name.ilike(term),
                User.email.ilike(term),
                Job.title.ilike(term),
                Job.department.ilike(term),
                Candidate.full_name.ilike(term),
            )
        )

    filtered_total = query.count()
    total_pages = max(1, math.ceil(filtered_total / page_size))
    offset = (page - 1) * page_size

    rows = query.order_by(AuditLog.created_at.desc(), AuditLog.id.desc()).offset(offset).limit(page_size).all()

    items: list[HiringAuditLogEntry] = []
    for log, actor_name, actor_email, actor_role, job_title, job_dept, candidate_name in rows:
        cat, label = _resolve_category_and_label(log.action)
        details_obj = _parse_details_dict(log.details)

        # Fallback candidate name from details if record was purged or detached
        resolved_cand_name = (
            candidate_name
            or details_obj.get("candidate")
            or details_obj.get("candidate_name")
            or details_obj.get("full_name")
        )

        # Fallback actor name from details if actor_id was null
        resolved_actor_name = (
            actor_name
            or details_obj.get("recruiter")
            or details_obj.get("recruiter_name")
            or details_obj.get("hm")
            or ("System Automation" if log.actor_id is None else None)
        )

        resolved_actor_role = actor_role or ("System" if log.actor_id is None else None)

        entry = HiringAuditLogEntry(
            id=log.id,
            action=log.action,
            action_label=label,
            category=cat,
            actor_id=log.actor_id,
            actor_name=resolved_actor_name,
            actor_email=actor_email,
            actor_role=resolved_actor_role,
            job_id=log.job_id,
            job_title=job_title,
            job_department=job_dept,
            candidate_id=log.candidate_id,
            candidate_name=resolved_cand_name,
            match_result_id=log.match_result_id,
            interview_id=log.interview_id,
            from_state=log.from_state,
            to_state=log.to_state,
            details=details_obj,
            created_at=log.created_at.isoformat() if log.created_at else "",
            relative_time=_format_relative_time(log.created_at) if log.created_at else "",
        )
        items.append(entry)

    return HiringLogsResponse(
        items=items,
        total=filtered_total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        metrics=HiringLogsMetrics(
            total_logs=total_logs_count,
            total_hires=total_hires,
            total_offers=total_offers,
            total_interviews=total_interviews,
            recent_24h=recent_24h,
        )
    )


