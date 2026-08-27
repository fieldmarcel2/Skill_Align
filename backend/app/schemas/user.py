"""
Pydantic schemas for User management (Admin endpoints).

UserCreate  → POST /api/users   (Admin creates HR or Recruiter accounts)
UserUpdate  → PUT  /api/users/{id}
UserOut     → response for user data (no password_hash)
"""

import re
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator, ConfigDict
from datetime import datetime


def _validate_password(value: str) -> str:
    if len(value) < 8:
        raise ValueError("Password must be at least 8 characters.")
    if not re.search(r"[A-Z]", value):
        raise ValueError("Password must contain at least one uppercase letter.")
    if not re.search(r"[a-z]", value):
        raise ValueError("Password must contain at least one lowercase letter.")
    if not re.search(r"\d", value):
        raise ValueError("Password must contain at least one digit.")
    return value


class RoleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


class UserCreate(BaseModel):
    """
    Admin-only endpoint to create HR or Recruiter accounts.
    role_id must be 2 (HR) or 3 (Recruiter).
    Admin cannot use this to create another Admin.
    """
    name: str
    email: EmailStr
    password: str
    role_id: int

    @field_validator("password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        return _validate_password(v)

    @field_validator("role_id")
    @classmethod
    def valid_role(cls, v: int) -> int:
        # Only HR (2) and Recruiter (3) can be created via this endpoint.
        # Admin (1) and Candidate (4) are off-limits.
        if v not in (2, 3):
            raise ValueError("role_id must be 2 (HR) or 3 (Recruiter).")
        return v

    @field_validator("name")
    @classmethod
    def non_empty_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be blank.")
        return v


class UserUpdate(BaseModel):
    """Partial update — all fields optional."""
    name: Optional[str] = None
    is_active: Optional[bool] = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: Optional[str] = None
    phone_number: Optional[str] = None
    role: RoleOut
    is_active: bool
    created_at: datetime

