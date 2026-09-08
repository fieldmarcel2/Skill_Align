"""
Pydantic schemas for Audit Logs.
"""

from datetime import datetime
from typing import Optional, Any, Dict
from pydantic import BaseModel, ConfigDict


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    actor_id: Optional[int] = None
    action: str
    entity_type: str
    entity_id: Optional[int] = None
    job_id: Optional[int] = None
    candidate_id: Optional[int] = None
    details: Optional[str] = None
    created_at: datetime
    actor_name: Optional[str] = None


class HiringAuditLogEntry(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    action: str
    action_label: str
    category: str
    actor_id: Optional[int] = None
    actor_name: Optional[str] = None
    actor_email: Optional[str] = None
    actor_role: Optional[str] = None
    job_id: Optional[int] = None
    job_title: Optional[str] = None
    job_department: Optional[str] = None
    candidate_id: Optional[int] = None
    candidate_name: Optional[str] = None
    match_result_id: Optional[int] = None
    interview_id: Optional[int] = None
    from_state: Optional[str] = None
    to_state: Optional[str] = None
    details: Optional[dict[str, Any]] = None
    created_at: str
    relative_time: str


class HiringLogsMetrics(BaseModel):
    total_logs: int
    total_hires: int
    total_offers: int
    total_interviews: int
    recent_24h: int


class HiringLogsResponse(BaseModel):
    items: list[HiringAuditLogEntry]
    total: int
    page: int
    page_size: int
    total_pages: int
    metrics: HiringLogsMetrics
