"""
Interview Pydantic Schemas
==========================
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class InterviewSlotOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    interview_id: int
    slot_datetime: datetime
    slot_end_datetime: Optional[datetime] = None
    status: str
    proposer_name: Optional[str] = None


class InterviewBase(BaseModel):
    match_result_id: int
    interview_date: Optional[datetime] = None
    interview_type: str = "technical"
    meeting_link: Optional[str] = None
    interview_mode: Optional[str] = "online"
    scheduled_end: Optional[datetime] = None
    feedback: Optional[str] = None
    status: str = "scheduled"


class InterviewCreate(InterviewBase):
    send_notification: bool = True


class InterviewUpdate(BaseModel):
    interview_date: Optional[datetime] = None
    interview_type: Optional[str] = None
    meeting_link: Optional[str] = None
    interview_mode: Optional[str] = None
    scheduled_end: Optional[datetime] = None
    feedback: Optional[str] = None
    status: Optional[str] = None


class InterviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    match_result_id: int
    scheduled_by: int
    interview_date: Optional[datetime] = None
    interview_type: str
    meeting_link: Optional[str] = None
    interview_mode: Optional[str] = None
    scheduled_end: Optional[datetime] = None
    feedback: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None
    scheduler_name: Optional[str] = None
    candidate_name: Optional[str] = None
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    slot_token: Optional[str] = None
    pipeline_state: Optional[str] = None
    slots: Optional[List[InterviewSlotOut]] = []

