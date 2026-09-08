"""
Pydantic schemas for the enterprise recruitment workflow endpoints.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, field_validator


# ── Request Schemas ────────────────────────────────────────────────────────────

class ShortlistRequest(BaseModel):
    note: Optional[str] = None


class SubmitToHMRequest(BaseModel):
    hiring_manager_id: int
    note: Optional[str] = None


class HMRejectRequest(BaseModel):
    reason: Optional[str] = None


class SlotProposal(BaseModel):
    slot_datetime: datetime
    slot_end_datetime: Optional[datetime] = None


class RequestInterviewRequest(BaseModel):
    slots: List[SlotProposal]
    interview_type: str = "technical"
    meeting_link: Optional[str] = None

    @field_validator("slots")
    @classmethod
    def at_least_two_slots(cls, v: list) -> list:
        if len(v) < 2:
            raise ValueError("At least 2 time slots must be proposed.")
        return v


class SelectSlotRequest(BaseModel):
    token: Optional[str] = None
    slot_id: int


class CompleteInterviewRequest(BaseModel):
    technical_rating: Optional[int] = None
    communication_rating: Optional[int] = None
    problem_solving_rating: Optional[int] = None
    role_fit_rating: Optional[int] = None
    overall_rating: Optional[int] = None
    comments: Optional[str] = None
    notes: Optional[str] = None


class HMFeedbackRequest(BaseModel):
    go_no_go: str   # GO | NO_GO
    technical_rating: Optional[int] = None
    communication_rating: Optional[int] = None
    problem_solving_rating: Optional[int] = None
    role_fit_rating: Optional[int] = None
    overall_rating: Optional[int] = None
    comments: Optional[str] = None

    @field_validator("go_no_go")
    @classmethod
    def validate_go_no_go(cls, v: str) -> str:
        v = v.upper()
        if v not in ("GO", "NO_GO"):
            raise ValueError("go_no_go must be 'GO' or 'NO_GO'.")
        return v

    @field_validator("technical_rating", "communication_rating", "problem_solving_rating", "role_fit_rating", "overall_rating", mode="before")
    @classmethod
    def validate_rating(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and not (1 <= v <= 5):
            raise ValueError("Ratings must be between 1 and 5.")
        return v


class CreateOfferRequest(BaseModel):
    proposed_salary: Optional[float] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_currency: str = "INR"
    role_scope: Optional[str] = None
    employment_type: str = "Full-time"
    joining_date: Optional[datetime] = None
    joining_timeline: Optional[str] = None
    offer_expiry_date: Optional[datetime] = None
    location: Optional[str] = None
    work_mode: Optional[str] = None
    additional_terms: Optional[str] = None


class UpdateOfferRequest(BaseModel):
    proposed_salary: Optional[float] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_currency: Optional[str] = None
    role_scope: Optional[str] = None
    employment_type: Optional[str] = None
    joining_date: Optional[datetime] = None
    joining_timeline: Optional[str] = None
    offer_expiry_date: Optional[datetime] = None
    location: Optional[str] = None
    work_mode: Optional[str] = None
    additional_terms: Optional[str] = None


class OfferRespondRequest(BaseModel):
    token: str
    accept: bool
    note: Optional[str] = None


# ── Response Schemas ──────────────────────────────────────────────────────────

class InterviewSlotOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    interview_id: int
    slot_datetime: datetime
    slot_end_datetime: Optional[datetime] = None
    status: str
    proposer_name: Optional[str] = None


class InterviewFeedbackOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    interview_id: int
    match_result_id: int
    reviewer_id: Optional[int] = None
    reviewer_name: Optional[str] = None
    go_no_go: str
    technical_rating: Optional[int] = None
    communication_rating: Optional[int] = None
    problem_solving_rating: Optional[int] = None
    role_fit_rating: Optional[int] = None
    overall_rating: Optional[int] = None
    comments: Optional[str] = None
    submitted_at: datetime


class OfferOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    match_result_id: int
    candidate_id: int
    job_id: int
    created_by: Optional[int] = None
    salary_currency: str
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    proposed_salary: Optional[float] = None
    role_scope: Optional[str] = None
    employment_type: Optional[str] = None
    joining_date: Optional[datetime] = None
    joining_timeline: Optional[str] = None
    offer_expiry_date: Optional[datetime] = None
    location: Optional[str] = None
    work_mode: Optional[str] = None
    additional_terms: Optional[str] = None
    status: str
    sent_at: Optional[datetime] = None
    responded_at: Optional[datetime] = None
    candidate_response_note: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    # Offer Approval Workflow (v2)
    workflow_state: Optional[str] = None
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    hm_comments: Optional[str] = None
    recruiter_comments: Optional[str] = None
    # PDF info
    pdf_file_name: Optional[str] = None
    pdf_file_size: Optional[int] = None
    pdf_generated_at: Optional[datetime] = None
    pdf_storage_key: Optional[str] = None
    expires_at: Optional[datetime] = None
    # Derived
    candidate_name: Optional[str] = None
    job_title: Optional[str] = None
    recruiter_name: Optional[str] = None
    hiring_manager_name: Optional[str] = None
    has_pdf: bool = False



class BlacklistOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    candidate_id: int
    match_result_id: Optional[int] = None
    reason: Optional[str] = None
    blacklisted_at: datetime
    blacklisted_until: datetime
    is_active: bool
    candidate_name: Optional[str] = None


class WorkflowStateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    match_result_id: int
    pipeline_state: str
    hiring_manager_id: Optional[int] = None
    hiring_manager_name: Optional[str] = None
    shortlist_note: Optional[str] = None
    submitted_to_hm_at: Optional[datetime] = None
    hm_reviewed_at: Optional[datetime] = None
    hm_rejection_reason: Optional[str] = None


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    actor_id: Optional[int] = None
    actor_name: Optional[str] = None
    action: str
    entity_type: str
    from_state: Optional[str] = None
    to_state: Optional[str] = None
    details: Optional[str] = None
    created_at: datetime


class ActionCenterItem(BaseModel):
    task_id: int
    action_type: str
    title: str
    description: Optional[str] = None
    priority: str
    match_result_id: Optional[int] = None
    candidate_name: Optional[str] = None
    job_title: Optional[str] = None
    pipeline_state: Optional[str] = None
    due_at: Optional[datetime] = None
    created_at: datetime


class HMDashboardItem(BaseModel):
    match_result_id: int
    candidate_name: str
    job_title: str
    overall_score: float
    pipeline_state: str
    submitted_to_hm_at: Optional[datetime] = None
    hm_reviewed_at: Optional[datetime] = None
    recruiter_name: Optional[str] = None


class InterviewWithSlotsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    match_result_id: int
    interview_type: str
    meeting_link: Optional[str] = None
    interview_mode: Optional[str] = None
    interview_date: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    status: str
    slot_token: Optional[str] = None
    candidate_selection_at: Optional[datetime] = None
    confirmed_at: Optional[datetime] = None
    created_at: datetime
    slots: List[InterviewSlotOut] = []
    hm_feedback: Optional[InterviewFeedbackOut] = None
    candidate_name: Optional[str] = None
    job_title: Optional[str] = None
    interviewer_technical_rating: Optional[int] = None
    interviewer_communication_rating: Optional[int] = None
    interviewer_problem_solving_rating: Optional[int] = None
    interviewer_role_fit_rating: Optional[int] = None
    interviewer_overall_rating: Optional[int] = None
    interviewer_comments: Optional[str] = None
    interviewer_name: Optional[str] = None
    interviewer_submitted_at: Optional[datetime] = None
    # Multi-round fields (v3)
    round_number: int = 1
    round_name: Optional[str] = None
    round_type: str = "TECHNICAL"
    round_status: str = "PENDING_SCHEDULING"
    is_additional_round: bool = False
    duration_minutes: Optional[int] = None
    # HM per-round evaluation
    hm_recommendation: Optional[str] = None
    hm_technical_rating: Optional[int] = None
    hm_communication_rating: Optional[int] = None
    hm_problem_solving_rating: Optional[int] = None
    hm_role_fit_rating: Optional[int] = None
    hm_overall_rating: Optional[int] = None
    hm_comments: Optional[str] = None
    hm_feedback_submitted_at: Optional[datetime] = None
