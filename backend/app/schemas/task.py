"""
Pydantic schemas for Recruitment Tasks.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class RecruitmentTaskCreate(BaseModel):
    assigned_to: int
    title: str
    description: Optional[str] = None
    priority: str = "MEDIUM"  # LOW, MEDIUM, HIGH, URGENT
    due_at: Optional[datetime] = None


class RecruitmentTaskUpdate(BaseModel):
    status: Optional[str] = None  # OPEN, IN_PROGRESS, COMPLETED, CANCELLED
    priority: Optional[str] = None
    description: Optional[str] = None


class RecruitmentTaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    job_id: int
    candidate_id: Optional[int] = None
    assigned_to: int
    created_by: int
    title: str
    description: Optional[str] = None
    status: str
    priority: str
    due_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    assignee_name: Optional[str] = None
    creator_name: Optional[str] = None
    job_title: Optional[str] = None
    candidate_name: Optional[str] = None
