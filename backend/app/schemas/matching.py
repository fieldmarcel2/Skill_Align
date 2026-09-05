"""
Pydantic schemas for Matching endpoints.

MatchRunResponse    → result of POST /api/matching/jobs/{job_id}/run
MatchResultOut      → single match result item (includes pipeline status, candidate, job, interviews, matched/missing skills)
MatchStatusUpdate   → PATCH status (pipeline stage transition)
ScorecardCreate     → POST /api/matching/{id}/scorecard
ScorecardOut        → GET /api/matching/{id}/scorecards
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, field_validator, ConfigDict
from datetime import datetime

from app.schemas.candidate import CandidateOut
from app.schemas.job import JobOut
from app.schemas.interview import InterviewOut


# All valid pipeline stages
PIPELINE_STATUSES = {
    "matched",
    "screened",
    "approved_by_hr",
    "interview_scheduled",
    "shortlisted",
    "screening",
    "technical_interview",
    "hr_interview",
    "offer",
    "hired",
    "rejected",
}


class SkillMatchDetail(BaseModel):
    """Per-skill breakdown shown in the match result detail view."""
    skill_id: int
    skill_name: str
    requirement_type: str   # required / preferred
    weight: float
    candidate_proficiency: Optional[str] = None  # None if missing
    candidate_years: Optional[float] = None
    skill_score: float       # 0.0 – 1.0


class ReviewerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


class ScorecardCreate(BaseModel):
    communication_score: int
    technical_score: int
    overall_impression: Optional[str] = None

    @field_validator("communication_score", "technical_score")
    @classmethod
    def score_range(cls, v: int) -> int:
        if not (1 <= v <= 10):
            raise ValueError("Score must be between 1 and 10.")
        return v


class ScorecardOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    match_result_id: int
    reviewer_id: Optional[int] = None
    reviewer: Optional[ReviewerOut] = None
    communication_score: int
    technical_score: int
    overall_impression: Optional[str] = None
    created_at: datetime


class MatchResultOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    job_id: int
    candidate_id: int
    recruiter_id: Optional[int] = None
    overall_score: float
    status: str
    matched_at: datetime
    updated_at: Optional[datetime] = None
    meets_experience: bool = True   # computed, not stored
    matched_skills: List[str] = []
    missing_skills: List[str] = []
    skill_breakdown: List[SkillMatchDetail] = []
    explanation: Optional[str] = None
    candidate: Optional[CandidateOut] = None
    job: Optional[JobOut] = None
    interviews: List[InterviewOut] = []
    scorecards: List[ScorecardOut] = []


class MatchStatusUpdate(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def valid_status(cls, v: str) -> str:
        v = v.lower()
        if v not in PIPELINE_STATUSES:
            raise ValueError(
                f"status must be one of: {', '.join(sorted(PIPELINE_STATUSES))}."
            )
        return v


class MatchRunResponse(BaseModel):
    """Response after running the matching engine."""
    job_id: int
    total_candidates: int
    results: list[MatchResultOut]
