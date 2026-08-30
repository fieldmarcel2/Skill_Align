"""
Pydantic schemas for Candidate profile and skills endpoints.

CandidateProfileCreate / CandidateProfileUpdate → POST/PUT /api/candidates/me
CandidateSkillIn / CandidateSkillUpdate         → skill management
CandidateOut                                    → full profile response
"""

from typing import Optional
from pydantic import BaseModel, field_validator, ConfigDict
from datetime import datetime

from app.schemas.skill import SkillOut

VALID_PROFICIENCY = {"Beginner", "Intermediate", "Expert"}


# ── Candidate skills ──────────────────────────────────────────────────────────

class CandidateSkillIn(BaseModel):
    skill_id: int
    proficiency_level: str = "Beginner"
    years_experience: float = 0

    @field_validator("proficiency_level")
    @classmethod
    def valid_proficiency(cls, v: str) -> str:
        # Normalise to Title Case so "beginner" → "Beginner"
        v = v.strip().title()
        if v not in VALID_PROFICIENCY:
            raise ValueError("proficiency_level must be Beginner, Intermediate, or Expert.")
        return v

    @field_validator("years_experience")
    @classmethod
    def non_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError("years_experience cannot be negative.")
        return v


class CandidateSkillUpdate(BaseModel):
    proficiency_level: Optional[str] = None
    years_experience: Optional[float] = None

    @field_validator("proficiency_level")
    @classmethod
    def valid_proficiency(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip().title()
            if v not in VALID_PROFICIENCY:
                raise ValueError("proficiency_level must be Beginner, Intermediate, or Expert.")
        return v

    @field_validator("years_experience")
    @classmethod
    def non_negative(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v < 0:
            raise ValueError("years_experience cannot be negative.")
        return v


class CandidateSkillOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    skill: SkillOut
    proficiency_level: str
    years_experience: float


# ── Candidate profile ─────────────────────────────────────────────────────────

class CandidateProfileCreate(BaseModel):
    full_name: str
    phone: Optional[str] = None
    total_experience_years: float = 0

    @field_validator("full_name")
    @classmethod
    def non_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("full_name cannot be blank.")
        return v

    @field_validator("total_experience_years")
    @classmethod
    def non_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError("total_experience_years cannot be negative.")
        return v


class CandidateProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    total_experience_years: Optional[float] = None

    @field_validator("total_experience_years")
    @classmethod
    def non_negative(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v < 0:
            raise ValueError("total_experience_years cannot be negative.")
        return v


class CandidateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    phone: Optional[str]
    resume_file_path: Optional[str] = None
    resume_s3_key: Optional[str] = None
    resume_filename: Optional[str] = None
    resume_uploaded_at: Optional[datetime] = None
    total_experience_years: float
    skills: list[CandidateSkillOut]
