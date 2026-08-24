"""
Candidate service — profile and skill management.

Each candidate owns exactly one profile (enforced by the UNIQUE constraint
on candidates.user_id). All operations validate ownership so candidates
cannot access or modify other candidates' data.
"""

import os
import shutil
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.candidate import Candidate
from app.models.candidate_skill import CandidateSkill
from app.models.skill import Skill
from app.models.user import User
from app.schemas.candidate import (
    CandidateOut,
    CandidateProfileCreate,
    CandidateProfileUpdate,
    CandidateSkillIn,
    CandidateSkillUpdate,
)


# ── Profile ────────────────────────────────────────────────────────────────────

def get_my_profile(db: Session, user: User) -> CandidateOut:
    candidate = db.query(Candidate).filter(Candidate.user_id == user.id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate profile not found. Please create your profile first.",
        )
    return CandidateOut.model_validate(candidate)


def create_profile(db: Session, user: User, data: CandidateProfileCreate) -> CandidateOut:
    if db.query(Candidate).filter(Candidate.user_id == user.id).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Profile already exists. Use PUT to update it.",
        )
    candidate = Candidate(
        user_id=user.id,
        full_name=data.full_name,
        phone=data.phone,
        total_experience_years=data.total_experience_years,
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return CandidateOut.model_validate(candidate)


def update_profile(db: Session, user: User, data: CandidateProfileUpdate) -> CandidateOut:
    candidate = db.query(Candidate).filter(Candidate.user_id == user.id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. Create it first with POST.",
        )
    if data.full_name is not None:
        candidate.full_name = data.full_name.strip()
    if data.phone is not None:
        candidate.phone = data.phone
    if data.total_experience_years is not None:
        candidate.total_experience_years = data.total_experience_years

    db.commit()
    db.refresh(candidate)
    return CandidateOut.model_validate(candidate)


# ── Resume upload ─────────────────────────────────────────────────────────────

_ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
_ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx"}


def upload_resume(db: Session, user: User, file: UploadFile) -> CandidateOut:
    """
    Save the uploaded resume to disk and store the relative path in the DB.

    Security:
    - File extension and content-type are validated.
    - File size is checked against MAX_UPLOAD_SIZE_MB.
    - The path stored in DB is relative (no filesystem disclosure).
    - Files are stored at: UPLOAD_DIR/resumes/<user_id>/<filename>
    """
    candidate = db.query(Candidate).filter(Candidate.user_id == user.id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Create your profile before uploading a resume.",
        )

    # Validate extension
    ext = Path(file.filename or "").suffix.lower()
    if ext not in _ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {', '.join(_ALLOWED_EXTENSIONS)}",
        )

    # Validate content-type header (advisory, not authoritative)
    if file.content_type and file.content_type not in _ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file content type.",
        )

    # Read and check size
    content = file.file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum allowed size is {settings.MAX_UPLOAD_SIZE_MB} MB.",
        )

    # Build storage path (relative, safe)
    upload_root = Path(settings.UPLOAD_DIR) / "resumes" / str(user.id)
    upload_root.mkdir(parents=True, exist_ok=True)

    # Use a fixed filename per user so re-uploads replace previous file
    safe_filename = f"resume_{user.id}{ext}"
    dest = upload_root / safe_filename

    with open(dest, "wb") as f:
        f.write(content)

    # Store a relative path only — never an absolute filesystem path
    relative_path = str(Path("resumes") / str(user.id) / safe_filename)
    candidate.resume_file_path = relative_path

    db.commit()
    db.refresh(candidate)
    return CandidateOut.model_validate(candidate)


# ── Skills ─────────────────────────────────────────────────────────────────────

def _get_candidate(db: Session, user: User) -> Candidate:
    candidate = db.query(Candidate).filter(Candidate.user_id == user.id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Create your profile before managing skills.",
        )
    return candidate


def add_skill(db: Session, user: User, data: CandidateSkillIn) -> CandidateOut:
    candidate = _get_candidate(db, user)

    # Validate skill exists
    if not db.query(Skill).filter(Skill.id == data.skill_id).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Skill with id={data.skill_id} does not exist.",
        )

    # Prevent duplicate
    if db.query(CandidateSkill).filter(
        CandidateSkill.candidate_id == candidate.id,
        CandidateSkill.skill_id == data.skill_id,
    ).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have this skill. Use PUT to update it.",
        )

    cs = CandidateSkill(
        candidate_id=candidate.id,
        skill_id=data.skill_id,
        proficiency_level=data.proficiency_level,
        years_experience=data.years_experience,
    )
    db.add(cs)
    db.commit()
    db.refresh(candidate)
    return CandidateOut.model_validate(candidate)


def update_skill(
    db: Session, user: User, skill_id: int, data: CandidateSkillUpdate
) -> CandidateOut:
    candidate = _get_candidate(db, user)
    cs = db.query(CandidateSkill).filter(
        CandidateSkill.candidate_id == candidate.id,
        CandidateSkill.skill_id == skill_id,
    ).first()
    if not cs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill not found in your profile.",
        )
    if data.proficiency_level is not None:
        cs.proficiency_level = data.proficiency_level
    if data.years_experience is not None:
        cs.years_experience = data.years_experience

    db.commit()
    db.refresh(candidate)
    return CandidateOut.model_validate(candidate)


def remove_skill(db: Session, user: User, skill_id: int) -> CandidateOut:
    candidate = _get_candidate(db, user)
    cs = db.query(CandidateSkill).filter(
        CandidateSkill.candidate_id == candidate.id,
        CandidateSkill.skill_id == skill_id,
    ).first()
    if not cs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill not found in your profile.",
        )
    db.delete(cs)
    db.commit()
    db.refresh(candidate)
    return CandidateOut.model_validate(candidate)


def get_candidate_by_id(db: Session, candidate_id: int) -> CandidateOut:
    """Used by HR/Recruiter to view a specific candidate profile."""
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found."
        )
    return CandidateOut.model_validate(candidate)
