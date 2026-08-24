"""
Pydantic schemas for Auth endpoints.

RegisterRequest  → POST /api/auth/register (public, Candidate only)
LoginRequest     → POST /api/auth/login
TokenResponse    → returned after successful login
UserResponse     → GET /api/auth/me (current user profile)
"""

import re
from pydantic import BaseModel, EmailStr, field_validator, ConfigDict
from datetime import datetime


# ── Password validation ───────────────────────────────────────────────────────

def _validate_password(value: str) -> str:
    """
    Enforce a minimum password policy:
    - At least 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    """
    if len(value) < 8:
        raise ValueError("Password must be at least 8 characters.")
    if not re.search(r"[A-Z]", value):
        raise ValueError("Password must contain at least one uppercase letter.")
    if not re.search(r"[a-z]", value):
        raise ValueError("Password must contain at least one lowercase letter.")
    if not re.search(r"\d", value):
        raise ValueError("Password must contain at least one digit.")
    return value


# ── Register ──────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    """
    Public candidate self-registration.
    The backend ALWAYS assigns role = Candidate.
    Clients cannot submit role_id.
    """
    name: str
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        return _validate_password(v)

    @field_validator("name")
    @classmethod
    def non_empty_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be blank.")
        return v


# ── Login ─────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# ── Token response ────────────────────────────────────────────────────────────

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ── User profile (safe — no password_hash) ───────────────────────────────────

class RoleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    role: RoleOut
    is_active: bool
    created_at: datetime
