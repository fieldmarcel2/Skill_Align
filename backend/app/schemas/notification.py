"""
Notification Pydantic Schemas
=============================
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class NotificationBase(BaseModel):
    user_id: int
    channel: str = "email"
    subject: str
    body: str
    status: str = "sent"


class NotificationCreate(NotificationBase):
    pass


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    channel: str
    subject: str
    body: str
    status: str
    is_read: bool = False
    notification_type: Optional[str] = None
    match_result_id: Optional[int] = None
    action_url: Optional[str] = None
    created_at: datetime
