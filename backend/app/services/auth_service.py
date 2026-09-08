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
from app.models.candidate import Candidate
from app.schemas.auth import (
    RegisterRequest, LoginRequest, TokenResponse, UserResponse, UserUpdateMeRequest,
    SendOTPRequest, VerifyOTPRequest, OTPResponse, OTPLoginResponse,
)
from app.services import otp_service
from app.services.sms_service import get_sms_service

logger = logging.getLogger(__name__)


# ── Registration ──────────────────────────────────────────────────────────────

def register_candidate(db: Session, data: RegisterRequest) -> UserResponse:
    """
    Register a user account (Candidate, Recruiter, or HR).
    Both Email and Phone are required.
    """
    # Prevent duplicate email registration
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    # Check phone requirement and uniqueness
    if not data.phone or not data.phone.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number is required.",
        )

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

    # Public self-registration ALWAYS assigns the Candidate role.
    # Privileged roles (HR, Recruiter, Admin) CANNOT be created here.
    candidate_role = db.query(Role).filter(Role.name == "Candidate").first()
    if candidate_role is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="System configuration error: Candidate role not found.",
        )

    user = User(
        name=data.name.strip(),
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
    Supports email and phone number, domain aliasing (@skillaign.dev <-> @skillalign.dev),
    and dev password flexibility in debug mode.
    """
    clean_identifier = data.email.strip()
    clean_email = clean_identifier.lower()

    # 1. Look up user by exact email
    user = db.query(User).filter(User.email.ilike(clean_email)).first()

    # 2. Domain aliasing fallback (@skillalign.dev <-> @skillaign.dev)
    if user is None and "@skillalign.dev" in clean_email:
        alt_email = clean_email.replace("@skillalign.dev", "@skillaign.dev")
        user = db.query(User).filter(User.email.ilike(alt_email)).first()
    elif user is None and "@skillaign.dev" in clean_email:
        alt_email = clean_email.replace("@skillaign.dev", "@skillalign.dev")
        user = db.query(User).filter(User.email.ilike(alt_email)).first()

    # 3. Phone number fallback (if user entered phone into email field)
    if user is None:
        user = db.query(User).filter(User.phone_number == clean_identifier).first()
        if user is None:
            try:
                norm_phone = normalize_phone(clean_identifier)
                user = db.query(User).filter(User.phone_number == norm_phone).first()
            except ValueError:
                pass

    if user is None:
        logger.warning(f"Login failed: User not found for identifier '{clean_identifier}'")
        detail_msg = f"User '{clean_identifier}' not found. Please check spelling or register." if settings.DEBUG else "Incorrect email or password."
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail_msg,
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.password_hash:
        logger.warning(f"Login failed: User '{user.email}' has no password set (OTP-only account)")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This account was registered via Phone OTP. Please use the 'Phone OTP' tab to sign in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 4. Verify password
    is_valid = verify_password(data.password, user.password_hash)

    # In development/debug mode, allow common developer password variants (e.g. Pass@123 vs Rec@12345 vs Recruiter@123)
    if not is_valid and settings.DEBUG:
        dev_variants = [
            "Pass@123",
            "Rec@12345",
            "Recruiter@123",
            "Admin@123",
            "HR@12345",
            "Password123!",
            "Password@123",
            "Candidate@123",
            "23702859@tT",
        ]
        if data.password in dev_variants:
            for variant in dev_variants:
                if verify_password(variant, user.password_hash):
                    is_valid = True
                    break

    if not is_valid:
        logger.warning(f"Login failed: Incorrect password for user '{user.email}'")
        detail_msg = f"Incorrect password for '{user.email}'." if settings.DEBUG else "Incorrect email or password."
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail_msg,
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your account has been deactivated. Contact an administrator.",
        )

    token = create_access_token({"sub": str(user.id), "role": user.role.name})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


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
    fallback_otp = None
    try:
        sms.send_otp(phone, otp)
    except Exception as e:
        logger.error("SMS delivery failed for %s: %s", phone, e)
        err_msg = str(e)
        # Twilio Error 21608: Trial accounts cannot send messages to unverified numbers
        if "21608" in err_msg or "unverified" in err_msg.lower():
            logger.warning("Twilio trial recipient unverified for %s. Using fallback OTP.", phone)
            fallback_otp = otp
        else:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to send SMS: {err_msg}",
            )

    return OTPResponse(
        message="OTP sent successfully." if not fallback_otp else "OTP generated (Twilio Trial sandbox allows SMS to verified numbers only).",
        dev_otp=otp if (settings.OTP_DEV_MODE or fallback_otp) else None,
    )



def find_user_by_phone(db: Session, phone: str):
    """Find user by phone supporting exact E.164 match and clean 10-digit suffix."""
    user = db.query(User).filter(User.phone_number == phone).first()
    if user:
        return user
    clean_digits = "".join(filter(str.isdigit, phone))
    if len(clean_digits) >= 10:
        last10 = clean_digits[-10:]
        for u in db.query(User).all():
            if u.phone_number:
                u_digits = "".join(filter(str.isdigit, u.phone_number))
                if u_digits.endswith(last10):
                    return u
    return None


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
    user = find_user_by_phone(db, phone)

    if user is None:
        # Create a new Candidate user (phone-only, no email/password)
        candidate_role = db.query(Role).filter(Role.name == "Candidate").first()
        if candidate_role is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="System configuration error: Candidate role not found.",
            )

        user = User(
            name=f"Candidate {phone[-4:]}",
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


def update_me(db: Session, current_user: User, data: UserUpdateMeRequest) -> UserResponse:
    if data.name is not None and data.name.strip():
        current_user.name = data.name.strip()
        if current_user.candidate_profile:
            current_user.candidate_profile.full_name = data.name.strip()

    if data.phone_number is not None:
        clean_phone = data.phone_number.strip() if data.phone_number else None
        if clean_phone:
            existing = db.query(User).filter(User.phone_number == clean_phone, User.id != current_user.id).first()
            if existing:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Phone number is already in use by another account.")
            current_user.phone_number = clean_phone
            if current_user.candidate_profile:
                current_user.candidate_profile.phone = clean_phone
        else:
            current_user.phone_number = None

    if data.email is not None:
        clean_email = data.email.strip().lower()
        existing_email = db.query(User).filter(User.email == clean_email, User.id != current_user.id).first()
        if existing_email:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already in use by another account.")
        current_user.email = clean_email

    db.add(current_user)
    if current_user.candidate_profile:
        db.add(current_user.candidate_profile)
    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)

