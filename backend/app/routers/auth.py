"""
Auth Router
===========

Endpoints:
- POST /api/auth/register     (Public, Candidate self-registration only)
- POST /api/auth/login        (Public, Returns JWT token)
- GET  /api/auth/me           (Protected, Returns current user profile with role)
- POST /api/auth/send-otp     (Public, Request OTP for phone login)
- POST /api/auth/verify-otp   (Public, Verify OTP and login/register)
- POST /api/auth/resend-otp   (Public, Resend OTP with cooldown)
"""

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.dependencies import get_current_user
from app.core.rate_limit import limiter
from app.models.user import User
from app.schemas.auth import (
    RegisterRequest, LoginRequest, TokenResponse, UserResponse,
    SendOTPRequest, VerifyOTPRequest, OTPResponse, OTPLoginResponse,
)
from app.services import auth_service

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# ── Email + Password ─────────────────────────────────────────────────────────

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Candidate self-registration",
    description="Allows public users to register as a Candidate. Privileged roles cannot be created here."
)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    return auth_service.register_candidate(db, data)


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="User login",
    description="Authenticates credentials and returns a signed JWT access token."
)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    return auth_service.login(db, data)


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current user profile",
    description="Returns the profile information and role of the currently authenticated user."
)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


# ── Phone OTP ────────────────────────────────────────────────────────────────

@router.post(
    "/send-otp",
    response_model=OTPResponse,
    status_code=status.HTTP_200_OK,
    summary="Request OTP for phone login",
    description="Sends a 6-digit OTP to the provided phone number. Valid for 5 minutes."
)
@limiter.limit("5/minute")
def send_otp(
    request: Request,
    data: SendOTPRequest,
    db: Session = Depends(get_db),
):
    return auth_service.send_otp(db, data)


@router.post(
    "/verify-otp",
    response_model=OTPLoginResponse,
    status_code=status.HTTP_200_OK,
    summary="Verify OTP and login",
    description="Verifies the OTP. If the phone is new, creates a Candidate account. Returns a JWT."
)
@limiter.limit("10/minute")
def verify_otp(
    request: Request,
    data: VerifyOTPRequest,
    db: Session = Depends(get_db),
):
    return auth_service.verify_otp_and_login(db, data)


@router.post(
    "/resend-otp",
    response_model=OTPResponse,
    status_code=status.HTTP_200_OK,
    summary="Resend OTP",
    description="Resends OTP to the phone number. Subject to cooldown period."
)
@limiter.limit("3/minute")
def resend_otp(
    request: Request,
    data: SendOTPRequest,
    db: Session = Depends(get_db),
):
    return auth_service.send_otp(db, data)

