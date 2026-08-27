"""
Model: OTPVerification

Stores hashed one-time passwords for phone-based authentication.

Security notes:
- Only the SHA-256 hash of the OTP is stored — never plaintext.
- Each record tracks attempt count to prevent brute-force.
- OTPs expire after a configurable period (default 5 minutes).
- Once verified, the record is marked is_verified=True and cannot be reused.
"""

from datetime import datetime, timezone
from sqlalchemy import (
    Boolean, DateTime, Integer, String, func
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class OTPVerification(Base):
    __tablename__ = "otp_verifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    phone_number: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    otp_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    attempt_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    max_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    is_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<OTPVerification id={self.id} phone={self.phone_number!r} verified={self.is_verified}>"
