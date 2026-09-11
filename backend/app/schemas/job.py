"""
Pydantic schemas for Job endpoints (Recruiter).

JobSkillIn  → skill entry inside job create/update
JobCreate   → POST /api/jobs
JobUpdate   → PUT  /api/jobs/{id}
JobOut      → read response with embedded skills
"""

from typing import Optional, Any
from pydantic import BaseModel, field_validator, model_validator, ConfigDict
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
    work_mode: Optional[str] = "Hybrid"
    location_city: Optional[str] = None
    location_state: Optional[str] = None
    location_country: Optional[str] = "India"
    urgency: Optional[str] = "30 days"
    shift_timing: Optional[str] = "Day"
    travel_requirements: Optional[str] = "None"
    status: str = "draft"
    skills: list[JobSkillIn] = []

    @model_validator(mode="before")
    @classmethod
    def handle_job_skills_alias(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "job_skills" in data and not data.get("skills"):
                data["skills"] = data["job_skills"]
        return data

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
    work_mode: Optional[str] = None
    location_city: Optional[str] = None
    location_state: Optional[str] = None
    location_country: Optional[str] = None
    urgency: Optional[str] = None
    shift_timing: Optional[str] = None
    travel_requirements: Optional[str] = None
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
    work_mode: Optional[str] = "Hybrid"
    location_city: Optional[str] = None
    location_state: Optional[str] = None
    location_country: Optional[str] = "India"
    urgency: Optional[str] = "30 days"
    shift_timing: Optional[str] = "Day"
    travel_requirements: Optional[str] = "None"
    status: str
    creator: JobCreatorOut
    job_skills: list[JobSkillOut]
    created_at: datetime
    updated_at: datetime


class JobPipelineSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    department: Optional[str] = None
    client_name: Optional[str] = None
    status: str
    min_experience_years: float = 0
    work_mode: Optional[str] = "Hybrid"
    required_skills_count: int = 0
    total_candidates: int = 0
    in_screening_count: int = 0
    in_interview_count: int = 0
    in_offer_count: int = 0
    hired_count: int = 0
    has_active_pipeline: bool = False
    sourcing_needed: bool = True

