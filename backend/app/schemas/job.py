"""
Pydantic schemas for Job endpoints (Recruiter).

JobSkillIn  → skill entry inside job create/update
JobCreate   → POST /api/jobs
JobUpdate   → PUT  /api/jobs/{id}
JobOut      → read response with embedded skills
"""

from typing import Optional
from pydantic import BaseModel, field_validator, ConfigDict
from datetime import datetime

from app.schemas.skill import SkillOut


VALID_STATUSES = {"draft", "active", "closed"}
VALID_REQUIREMENT_TYPES = {"required", "preferred"}


# ── Job skill line ────────────────────────────────────────────────────────────

class JobSkillIn(BaseModel):
    skill_id: int
    requirement_type: str = "required"
    weight: float = 1.0

    @field_validator("requirement_type")
    @classmethod
    def valid_type(cls, v: str) -> str:
        v = v.lower()
        if v not in VALID_REQUIREMENT_TYPES:
            raise ValueError("requirement_type must be 'required' or 'preferred'.")
        return v

    @field_validator("weight")
    @classmethod
    def positive_weight(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("weight must be greater than 0.")
        return v


class JobSkillOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    skill: SkillOut
    requirement_type: str
    weight: float


# ── Job CRUD ──────────────────────────────────────────────────────────────────

class JobCreate(BaseModel):
    title: str
    description: Optional[str] = None
    department: Optional[str] = None
    client_name: Optional[str] = None
    min_experience_years: float = 0
    status: str = "draft"
    skills: list[JobSkillIn] = []

    @field_validator("title")
    @classmethod
    def non_empty_title(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Job title cannot be blank.")
        return v

    @field_validator("status")
    @classmethod
    def valid_status(cls, v: str) -> str:
        v = v.lower()
        if v not in VALID_STATUSES:
            raise ValueError("status must be 'draft', 'active', or 'closed'.")
        return v

    @field_validator("min_experience_years")
    @classmethod
    def non_negative_experience(cls, v: float) -> float:
        if v < 0:
            raise ValueError("min_experience_years cannot be negative.")
        return v


class JobUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    department: Optional[str] = None
    client_name: Optional[str] = None
    min_experience_years: Optional[float] = None
    status: Optional[str] = None
    skills: Optional[list[JobSkillIn]] = None

    @field_validator("status")
    @classmethod
    def valid_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.lower()
            if v not in VALID_STATUSES:
                raise ValueError("status must be 'draft', 'active', or 'closed'.")
        return v


class JobCreatorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: Optional[str] = None
    phone_number: Optional[str] = None



class JobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str]
    department: Optional[str]
    client_name: Optional[str]
    min_experience_years: float
    status: str
    creator: JobCreatorOut
    job_skills: list[JobSkillOut]
    created_at: datetime
    updated_at: datetime
