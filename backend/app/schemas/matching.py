"""
Pydantic schemas for Matching endpoints.

MatchRunResponse    → result of POST /api/matching/jobs/{job_id}/run
MatchResultOut      → single match result item
MatchStatusUpdate   → PATCH status (shortlist / reject)
"""

from typing import Optional
from pydantic import BaseModel, field_validator, ConfigDict
from datetime import datetime

from app.schemas.candidate import CandidateOut
from app.schemas.job import JobOut


VALID_STATUS_TRANSITIONS = {"shortlisted", "rejected", "matched"}


class SkillMatchDetail(BaseModel):
    """Per-skill breakdown shown in the match result detail view."""
    skill_id: int
    skill_name: str
    requirement_type: str   # required / preferred
    weight: float
    candidate_proficiency: Optional[str]  # None if missing
    candidate_years: Optional[float]
    skill_score: float       # 0.0 – 1.0


class MatchResultOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    job_id: int
    candidate_id: int
    overall_score: float
    status: str
    matched_at: datetime
    meets_experience: bool = True   # computed, not stored
    candidate: CandidateOut


class MatchStatusUpdate(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def valid_status(cls, v: str) -> str:
        v = v.lower()
        if v not in VALID_STATUS_TRANSITIONS:
            raise ValueError("status must be 'matched', 'shortlisted', or 'rejected'.")
        return v


class MatchRunResponse(BaseModel):
    """Response after running the matching engine."""
    job_id: int
    total_candidates: int
    results: list[MatchResultOut]
