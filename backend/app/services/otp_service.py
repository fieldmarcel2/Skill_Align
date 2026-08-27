"""
OTP Service — Core business logic for OTP generation, storage, and verification.

Security guarantees:
- OTPs are 6-digit, cryptographically secure (secrets.randbelow).
- Only SHA-256 hashes are stored in the database.
- OTPs expire after a configurable period.
- Failed attempts are tracked; OTP is invalidated after max attempts.
- Previous unverified OTPs for the same phone are invalidated on new request.
- Resend cooldown prevents abuse.
"""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.otp_verification import OTPVerification


def generate_otp() -> str:
    """Generate a cryptographically secure 6-digit OTP."""
    return str(secrets.randbelow(900000) + 100000)


def hash_otp(otp: str) -> str:
    """Return the SHA-256 hex digest of an OTP string."""
    return hashlib.sha256(otp.encode("utf-8")).hexdigest()


def verify_otp_hash(otp: str, otp_hash: str) -> bool:
    """Constant-time comparison of an OTP against its stored hash."""
    return secrets.compare_digest(hash_otp(otp), otp_hash)


def create_otp_record(db: Session, phone: str) -> str:
    """
    Generate an OTP for the given phone number and store its hash.

    - Invalidates all previous unverified OTPs for this phone.
    - Enforces resend cooldown.
    - Returns the plaintext OTP (for sending via SMS — never store this).

    Raises:
        HTTPException 429 if resend cooldown has not elapsed.
    """
    now = datetime.now(timezone.utc)

    # ── Enforce resend cooldown ──────────────────────────────────────────────
    latest = (
        db.query(OTPVerification)
        .filter(
            OTPVerification.phone_number == phone,
            OTPVerification.is_verified == False,  # noqa: E712
        )
        .order_by(OTPVerification.created_at.desc())
        .first()
    )

    if latest:
        cooldown_end = latest.created_at + timedelta(
            seconds=settings.OTP_RESEND_COOLDOWN_SECONDS
        )
        if now < cooldown_end:
            remaining = int((cooldown_end - now).total_seconds())
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {remaining} seconds before requesting a new OTP.",
            )

    # ── Invalidate old unverified OTPs ───────────────────────────────────────
    db.query(OTPVerification).filter(
        OTPVerification.phone_number == phone,
        OTPVerification.is_verified == False,  # noqa: E712
    ).update({"is_verified": True})

    # ── Create new OTP record ────────────────────────────────────────────────
    otp = generate_otp()
    record = OTPVerification(
        phone_number=phone,
        otp_hash=hash_otp(otp),
        expires_at=now + timedelta(seconds=settings.OTP_EXPIRY_SECONDS),
        attempt_count=0,
        max_attempts=settings.OTP_MAX_ATTEMPTS,
        is_verified=False,
    )
    db.add(record)
    db.commit()

    return otp


def verify_otp(db: Session, phone: str, otp: str) -> OTPVerification:
    """
    Verify an OTP for the given phone number.

    Returns the OTPVerification record on success.

    Raises:
        HTTPException 401 — invalid/expired/no OTP found.
        HTTPException 429 — too many failed attempts.
    """
    now = datetime.now(timezone.utc)

    # ── Find latest unverified OTP for this phone ────────────────────────────
    record = (
        db.query(OTPVerification)
        .filter(
            OTPVerification.phone_number == phone,
            OTPVerification.is_verified == False,  # noqa: E712
        )
        .order_by(OTPVerification.created_at.desc())
        .first()
    )

    if record is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No OTP found for this phone number. Please request a new OTP.",
        )

    # ── Check expiration ─────────────────────────────────────────────────────
    if now > record.expires_at:
        record.is_verified = True  # mark as consumed
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="OTP has expired. Please request a new OTP.",
        )

    # ── Check attempt limit ──────────────────────────────────────────────────
    if record.attempt_count >= record.max_attempts:
        record.is_verified = True  # invalidate
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many incorrect attempts. Please request a new OTP.",
        )

    # ── Verify OTP hash ──────────────────────────────────────────────────────
    if not verify_otp_hash(otp, record.otp_hash):
        record.attempt_count += 1
        db.commit()
        remaining = record.max_attempts - record.attempt_count
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid OTP. {remaining} attempt(s) remaining.",
        )

    # ── Success — mark as verified ───────────────────────────────────────────
    record.is_verified = True
    db.commit()
    return record
