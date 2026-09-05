"""
Admin Management Router
=======================

Endpoints:
- GET   /api/admin/users              (Admin: Paginated + filtered user list)
- GET   /api/admin/users/{id}         (Admin: Extended user detail with profile info)
- PATCH /api/admin/users/{id}/toggle-status (Admin: Quick activate/deactivate)
"""

from typing import Optional, Any, Dict
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.dependencies import require_admin
from app.models.user import User
from app.models.candidate import Candidate
from app.models.job import Job
from app.schemas.user import PaginatedUsersResponse, UserOut
from app.services import user_service

router = APIRouter(prefix="/api/admin", tags=["Admin Management"])


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


