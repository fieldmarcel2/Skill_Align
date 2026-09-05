"""
Candidate service — profile and skill management.

Each candidate owns exactly one profile (enforced by the UNIQUE constraint
on candidates.user_id). All operations validate ownership so candidates
cannot access or modify other candidates' data.
"""

import os
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.services.s3_service import s3_service

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
        full_name=data.full_name.strip(),
        phone=data.phone.strip() if data.phone else None,
        total_experience_years=data.total_experience_years,
        address=data.address.strip() if data.address else None,
        city=data.city.strip() if data.city else None,
        state=data.state.strip() if data.state else None,
        pincode=data.pincode.strip() if data.pincode else None,
        country=data.country.strip() if data.country else "India",
        work_authorization=data.work_authorization.strip() if data.work_authorization else None,
        preferred_work_mode=data.preferred_work_mode.strip() if data.preferred_work_mode else None,
        notice_period=data.notice_period.strip() if data.notice_period else None,
        current_ctc=data.current_ctc,
        expected_ctc=data.expected_ctc,
    )
    # Synchronize User model name and phone number
    user.name = data.full_name.strip()
    if data.phone:
        user.phone_number = data.phone.strip()

    db.add(candidate)
    db.add(user)
    db.commit()
    db.refresh(candidate)
    db.refresh(user)
    return CandidateOut.model_validate(candidate)


def update_profile(db: Session, user: User, data: CandidateProfileUpdate) -> CandidateOut:
    candidate = db.query(Candidate).filter(Candidate.user_id == user.id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. Create it first with POST.",
        )
    if data.full_name is not None:
        clean_name = data.full_name.strip()
        candidate.full_name = clean_name
        user.name = clean_name
    if data.phone is not None:
        clean_phone = data.phone.strip() if data.phone else None
        candidate.phone = clean_phone
        if clean_phone:
            user.phone_number = clean_phone
    if data.total_experience_years is not None:
        candidate.total_experience_years = data.total_experience_years
    if data.address is not None:
        candidate.address = data.address.strip() if data.address else None
    if data.city is not None:
        candidate.city = data.city.strip() if data.city else None
    if data.state is not None:
        candidate.state = data.state.strip() if data.state else None
    if data.pincode is not None:
        candidate.pincode = data.pincode.strip() if data.pincode else None
    if data.country is not None:
        candidate.country = data.country.strip() if data.country else "India"
    if data.work_authorization is not None:
        candidate.work_authorization = data.work_authorization.strip() if data.work_authorization else None
    if data.preferred_work_mode is not None:
        candidate.preferred_work_mode = data.preferred_work_mode.strip() if data.preferred_work_mode else None
    if data.notice_period is not None:
        candidate.notice_period = data.notice_period.strip() if data.notice_period else None
    if data.current_ctc is not None:
        candidate.current_ctc = data.current_ctc
    if data.expected_ctc is not None:
        candidate.expected_ctc = data.expected_ctc

    db.add(user)
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    db.refresh(user)
    return CandidateOut.model_validate(candidate)


# ── Resume upload ─────────────────────────────────────────────────────────────

_ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
_ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx"}


async def upload_resume(db: Session, user: User, file: UploadFile) -> CandidateOut:
    """
    Delegate upload, text extraction, TXT generation, and parsing to resume_service.
    """
    from app.services.resume_service import process_and_store_resume
    candidate = db.query(Candidate).filter(Candidate.user_id == user.id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Create your profile before uploading a resume.",
        )

    await process_and_store_resume(db, candidate, file)
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
