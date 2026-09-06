"""
Pydantic schemas for Recruiter and Candidate Assignments.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class UserBasicOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: Optional[str] = None


class JobRecruiterAssignmentIn(BaseModel):
    recruiter_id: int
    assignment_role: str = "RECRUITER"  # PRIMARY_RECRUITER, RECRUITER, SOURCER


class JobRecruiterUpdateRole(BaseModel):
    assignment_role: str


class JobRecruiterAssignmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    job_id: int
    recruiter_id: int
    assigned_by: int
    assignment_role: str
    status: str
    assigned_at: datetime
    removed_at: Optional[datetime] = None
    recruiter: Optional[UserBasicOut] = None
    assigner: Optional[UserBasicOut] = None


class CandidateRecruiterAssignmentIn(BaseModel):
    recruiter_id: int


class CandidateRecruiterAssignmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    job_id: int
    candidate_id: int
    recruiter_id: int
    assigned_by: int
    status: str
    assigned_at: datetime
    completed_at: Optional[datetime] = None
    recruiter: Optional[UserBasicOut] = None
    assigner: Optional[UserBasicOut] = None


class RecruiterDashboardStats(BaseModel):
    assigned_jobs_count: int
    total_candidates_count: int
    pending_review_count: int
    screened_count: int
    pending_tasks_count: int


class RecruiterJobItem(BaseModel):
    id: int
    title: str
    status: str
    min_experience_years: float
    work_mode: Optional[str] = None
    created_at: datetime
    assignment_role: str
    total_candidates: int
    pending_review: int
    assigned_to_me: int

