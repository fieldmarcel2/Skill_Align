"""
Pydantic schemas for Recruitment Communication.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class RecruitmentMessageCreate(BaseModel):
    message: str
    message_type: str = "GENERAL"  # GENERAL, SCREENING_NOTE, HR_REQUEST, RECOMMENDATION, SYSTEM
    is_private: bool = False


class RecruitmentMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    job_id: int
    candidate_id: Optional[int] = None
    sender_id: int
    message: str
    message_type: str
    is_private: bool
    created_at: datetime
    read_at: Optional[datetime] = None
    sender_name: Optional[str] = None
    sender_role: Optional[str] = None
