"""
Pydantic schemas for Auth endpoints.

RegisterRequest  → POST /api/auth/register (public, Candidate only)
LoginRequest     → POST /api/auth/login
TokenResponse    → returned after successful login
UserResponse     → GET /api/auth/me (current user profile)

OTP schemas:
SendOTPRequest   → POST /api/auth/send-otp
VerifyOTPRequest → POST /api/auth/verify-otp
OTPResponse      → response after sending OTP
OTPLoginResponse → response after successful OTP verification
"""

import re
from typing import Optional
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
    Public self-registration strictly for Candidates only.
    Both Email and Phone are required.
    Privileged roles (HR, Recruiter) must be provisioned by an Administrator.
    """
    name: str
    email: EmailStr
    password: str
    phone: str

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

    @field_validator("phone")
    @classmethod
    def non_empty_phone(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Phone number is required.")
        return v


# ── Login ─────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# ── User profile (safe — no password_hash) ───────────────────────────────────

class RoleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: Optional[str] = None
    phone_number: Optional[str] = None
    role: RoleOut
    is_active: bool
    created_at: datetime


# ── Token response ────────────────────────────────────────────────────────────

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Optional[UserResponse] = None


class UserUpdateMeRequest(BaseModel):
    name: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[EmailStr] = None


# ── OTP Schemas ──────────────────────────────────────────────────────────────

class SendOTPRequest(BaseModel):
    """Request body for POST /api/auth/send-otp."""
    phone: str

    @field_validator("phone")
    @classmethod
    def non_empty_phone(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Phone number cannot be blank.")
        return v


class VerifyOTPRequest(BaseModel):
    """Request body for POST /api/auth/verify-otp."""
    phone: str
    otp: str

    @field_validator("otp")
    @classmethod
    def valid_otp_format(cls, v: str) -> str:
        v = v.strip()
        if not re.match(r"^\d{6}$", v):
            raise ValueError("OTP must be exactly 6 digits.")
        return v

    @field_validator("phone")
    @classmethod
    def non_empty_phone(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Phone number cannot be blank.")
        return v


class OTPResponse(BaseModel):
    """Response after requesting an OTP."""
    message: str
    dev_otp: Optional[str] = None



class OTPLoginResponse(BaseModel):
    """Response after successful OTP verification and login."""
    message: str
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    is_new_user: bool

