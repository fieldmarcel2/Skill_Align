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
    candidate_proficiency: Optional[str] = None  # None if missing or detected without rating
    candidate_years: Optional[float] = None
    skill_score: float       # 0.0 – 1.0
    source: Optional[str] = None  # 'resume' vs 'manual'
    evidence_text: Optional[str] = None  # Textual quote from resume proving the skill


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
    pipeline_state: Optional[str] = "CANDIDATE_MATCHED"
    hiring_manager_id: Optional[int] = None
    shortlist_note: Optional[str] = None
    submitted_to_hm_at: Optional[datetime] = None
    hm_reviewed_at: Optional[datetime] = None
    hm_rejection_reason: Optional[str] = None
    # Async processing state (separate from business pipeline status)
    # queued | processing | completed | failed | stale
    processing_status: str = "completed"
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
    assigned_recruiter: Optional[Dict[str, Any]] = None
    assignment_status: Optional[str] = None
    resume_detected_skills: List[Dict[str, Any]] = []
    self_declared_skills: List[Dict[str, Any]] = []
    pending_tasks_count: int = 0
    is_blacklisted: bool = False
    blacklist_reason: Optional[str] = None
    blacklisted_until: Optional[str] = None
    blacklist_display_message: Optional[str] = None


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
    """Response after running the matching engine synchronously (legacy/fallback)."""
    job_id: int
    total_candidates: int
    results: list[MatchResultOut]


class MatchQueueResponse(BaseModel):
    """Response after queuing an async matching task."""
    status: str  # "queued" | "completed" (fallback)
    message: str
    job_id: int
    task_id: Optional[str] = None
    total_candidates: Optional[int] = None  # set if run synchronously as fallback
