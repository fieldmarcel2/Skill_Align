"""
Pydantic schemas for Audit Logs.
"""

from datetime import datetime
from typing import Optional
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
