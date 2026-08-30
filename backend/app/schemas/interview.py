"""
Interview Pydantic Schemas
==========================
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class InterviewBase(BaseModel):
    match_result_id: int
    interview_date: datetime
    interview_type: str = "technical"
    feedback: Optional[str] = None
    status: str = "scheduled"


class InterviewCreate(InterviewBase):
    send_notification: bool = True


class InterviewUpdate(BaseModel):
    interview_date: Optional[datetime] = None
    interview_type: Optional[str] = None
    feedback: Optional[str] = None
    status: Optional[str] = None


class InterviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    match_result_id: int
    scheduled_by: int
    interview_date: datetime
    interview_type: str
    feedback: Optional[str] = None
    status: str
    created_at: datetime
    scheduler_name: Optional[str] = None
    candidate_name: Optional[str] = None
    job_title: Optional[str] = None
