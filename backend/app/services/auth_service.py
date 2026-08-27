"""
Auth service — registration, login, and OTP business logic.

All auth logic lives here, NOT in the router.
The router only handles HTTP request/response concerns.
"""

import logging

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.core.config import settings
from app.core.security import hash_password, verify_password, create_access_token, normalize_phone
from app.models.user import User
from app.models.role import Role
from app.schemas.auth import (
    RegisterRequest, LoginRequest, TokenResponse, UserResponse,
    SendOTPRequest, VerifyOTPRequest, OTPResponse, OTPLoginResponse,
)
from app.services import otp_service
from app.services.sms_service import get_sms_service

logger = logging.getLogger(__name__)


# ── Registration ──────────────────────────────────────────────────────────────

def register_candidate(db: Session, data: RegisterRequest) -> UserResponse:
    """
    Create a new Candidate user account.

    Security guarantees:
    - The Candidate role is looked up from the DB (never trusted from client).
    - Duplicate email raises 409 Conflict.
    - Password is bcrypt-hashed before storage.
    - Optional phone number is normalized and checked for uniqueness.
    """
    # Prevent duplicate registration
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    # Check phone uniqueness if provided
    normalized_phone = None
    if data.phone:
        try:
            normalized_phone = normalize_phone(data.phone)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e),
            )
        if db.query(User).filter(User.phone_number == normalized_phone).first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this phone number already exists.",
            )

    # Fetch the Candidate role — fail hard if seed data is missing
    candidate_role = db.query(Role).filter(Role.name == "Candidate").first()
    if candidate_role is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="System configuration error: Candidate role not found.",
        )

    user = User(
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
        phone_number=normalized_phone,
        role_id=candidate_role.id,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)


# ── Login ─────────────────────────────────────────────────────────────────────

def login(db: Session, data: LoginRequest) -> TokenResponse:
    """
    Authenticate a user and return a signed JWT.

    Returns the same generic error for both wrong email and wrong password
    to prevent user-enumeration attacks.
    """
    _auth_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect email or password.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    user = db.query(User).filter(User.email == data.email).first()
    if user is None:
        raise _auth_error

    if not user.password_hash or not verify_password(data.password, user.password_hash):
        raise _auth_error

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your account has been deactivated. Contact an administrator.",
        )

    token = create_access_token({"sub": str(user.id), "role": user.role.name})
    return TokenResponse(access_token=token)


# ── OTP: Send ─────────────────────────────────────────────────────────────────

def send_otp(db: Session, data: SendOTPRequest) -> OTPResponse:
    """
    Normalize the phone number, generate an OTP, and send it via SMS.
    """
    try:
        phone = normalize_phone(data.phone)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    # Generate OTP and store hashed version (enforces cooldown internally)
    otp = otp_service.create_otp_record(db, phone)

    # Send OTP via SMS provider
    sms = get_sms_service()
    try:
        sms.send_otp(phone, otp)
    except Exception as e:
        logger.error("SMS delivery failed for %s: %s", phone, e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to send OTP. Please try again later.",
        )

    return OTPResponse(
        message="OTP sent successfully.",
        dev_otp=otp if settings.OTP_DEV_MODE else None,
    )



# ── OTP: Verify & Login ──────────────────────────────────────────────────────

def verify_otp_and_login(db: Session, data: VerifyOTPRequest) -> OTPLoginResponse:
    """
    Verify the OTP, then find or create the user, and return a JWT.

    - Existing user with this phone → authenticate.
    - No user with this phone → create a new Candidate user.
    - Role is always server-assigned; the client cannot specify it.
    """
    try:
        phone = normalize_phone(data.phone)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    # Verify OTP (raises on failure)
    otp_service.verify_otp(db, phone, data.otp)

    # ── Find or create user ──────────────────────────────────────────────────
    is_new_user = False
    user = db.query(User).filter(User.phone_number == phone).first()

    if user is None:
        # Create a new Candidate user (phone-only, no email/password)
        candidate_role = db.query(Role).filter(Role.name == "Candidate").first()
        if candidate_role is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="System configuration error: Candidate role not found.",
            )

        user = User(
            name=f"User-{phone[-4:]}",  # default name from last 4 digits
            email=None,
            password_hash=None,
            phone_number=phone,
            role_id=candidate_role.id,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        is_new_user = True

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your account has been deactivated. Contact an administrator.",
        )

    # Generate JWT
    token = create_access_token({"sub": str(user.id), "role": user.role.name})

    return OTPLoginResponse(
        message="Login successful.",
        access_token=token,
        user=UserResponse.model_validate(user),
        is_new_user=is_new_user,
    )

