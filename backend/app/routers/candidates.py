"""
Candidate Profile and Resume Router
===================================

Endpoints:
- GET    /api/candidates/me                  (Candidate: View own profile)
- POST   /api/candidates/me                  (Candidate: Create profile)
- PUT    /api/candidates/me                  (Candidate: Update profile)
- POST   /api/candidates/me/resume           (Candidate: Upload resume file)
- POST   /api/candidates/me/skills           (Candidate: Add skill with proficiency & years)
- PUT    /api/candidates/me/skills/{skill_id}(Candidate: Update skill proficiency/years)
- DELETE /api/candidates/me/skills/{skill_id}(Candidate: Remove skill)
- GET    /api/candidates/{id}                (HR / Recruiter: View candidate profile)
- GET    /api/candidates/{id}/resume         (HR / Recruiter / Candidate owner: Secure resume download)
"""

import os
from pathlib import Path
from fastapi import APIRouter, Depends, status, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.config import settings
from app.core.dependencies import get_current_user, require_candidate, require_hr_or_recruiter
from app.models.user import User
from app.models.candidate import Candidate
from app.schemas.candidate import (
    CandidateOut,
    CandidateProfileCreate,
    CandidateProfileUpdate,
    CandidateSkillIn,
    CandidateSkillUpdate
)
from app.services import candidate_service

router = APIRouter(prefix="/api/candidates", tags=["Candidates"])


# ── Candidate Self-Service ───────────────────────────────────────────────────

@router.get(
    "/me",
    response_model=CandidateOut,
    status_code=status.HTTP_200_OK,
    summary="Get own candidate profile"
)
def get_my_profile(
    db: Session = Depends(get_db),
    candidate_user: User = Depends(require_candidate)
):
    return candidate_service.get_my_profile(db, candidate_user)


@router.post(
    "/me",
    response_model=CandidateOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create candidate profile"
)
def create_my_profile(
    data: CandidateProfileCreate,
    db: Session = Depends(get_db),
    candidate_user: User = Depends(require_candidate)
):
    return candidate_service.create_profile(db, candidate_user, data)


@router.put(
    "/me",
    response_model=CandidateOut,
    status_code=status.HTTP_200_OK,
    summary="Update candidate profile"
)
def update_my_profile(
    data: CandidateProfileUpdate,
    db: Session = Depends(get_db),
    candidate_user: User = Depends(require_candidate)
):
    return candidate_service.update_profile(db, candidate_user, data)


@router.post(
    "/me/resume",
    response_model=CandidateOut,
    status_code=status.HTTP_200_OK,
    summary="Upload resume (PDF/DOC/DOCX)",
    description="Secure resume upload outside database. Validates type and size limits."
)
def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    candidate_user: User = Depends(require_candidate)
):
    return candidate_service.upload_resume(db, candidate_user, file)


@router.post(
    "/me/skills",
    response_model=CandidateOut,
    status_code=status.HTTP_201_CREATED,
    summary="Add skill to profile",
    description="Add a skill with proficiency (Beginner, Intermediate, Expert) and years of experience."
)
def add_my_skill(
    data: CandidateSkillIn,
    db: Session = Depends(get_db),
    candidate_user: User = Depends(require_candidate)
):
    return candidate_service.add_skill(db, candidate_user, data)


@router.put(
    "/me/skills/{skill_id}",
    response_model=CandidateOut,
    status_code=status.HTTP_200_OK,
    summary="Update skill proficiency or years"
)
def update_my_skill(
    skill_id: int,
    data: CandidateSkillUpdate,
    db: Session = Depends(get_db),
    candidate_user: User = Depends(require_candidate)
):
    return candidate_service.update_skill(db, candidate_user, skill_id, data)


@router.delete(
    "/me/skills/{skill_id}",
    response_model=CandidateOut,
    status_code=status.HTTP_200_OK,
    summary="Remove skill from profile"
)
def remove_my_skill(
    skill_id: int,
    db: Session = Depends(get_db),
    candidate_user: User = Depends(require_candidate)
):
    return candidate_service.remove_skill(db, candidate_user, skill_id)


# ── Authorized View Endpoints (HR & Recruiter) ───────────────────────────────

@router.get(
    "/{candidate_id}",
    response_model=CandidateOut,
    status_code=status.HTTP_200_OK,
    summary="View candidate profile by ID (HR & Recruiter)"
)
def get_candidate_profile(
    candidate_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_hr_or_recruiter)
):
    return candidate_service.get_candidate_by_id(db, candidate_id)


@router.get(
    "/{candidate_id}/resume",
    summary="Secure resume download/view (Authorized HR, Recruiter, or Owner)"
)
def download_resume(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate or not candidate.resume_file_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found for this candidate."
        )

    # Check authorization: HR, Recruiter, Admin, or Candidate themselves
    user_role = current_user.role.name
    if user_role not in ["HR", "Recruiter", "Admin"] and candidate.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this resume."
        )

    # Path traversal protection: resolve against base upload dir
    safe_base = Path(settings.UPLOAD_DIR).resolve()
    target_path = (safe_base / candidate.resume_file_path).resolve()

    if not str(target_path).startswith(str(safe_base)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file path detected."
        )

    if not target_path.exists() or not target_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume file does not exist on disk."
        )

    # Determine media type for inline viewing/download
    ext = target_path.suffix.lower()
    media_type = "application/pdf" if ext == ".pdf" else "application/octet-stream"

    return FileResponse(
        path=str(target_path),
        media_type=media_type,
        filename=f"Resume_{candidate.full_name.replace(' ', '_')}{ext}"
    )
