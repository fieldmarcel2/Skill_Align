"""
Model: User

Central identity table. Every person who can log into SkillAlign
(Admin, HR, Recruiter, or Candidate) has exactly one row here.

Security notes:
- password_hash stores the bcrypt hash ONLY. Plaintext passwords
  are never persisted.
- The password_hash column is excluded from normal response schemas.
"""

from datetime import datetime, timezone
from sqlalchemy import (
    Boolean, CheckConstraint, DateTime, ForeignKey, Integer, String, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class User(Base):
    __tablename__ = "users"

    __table_args__ = (
        CheckConstraint(
            "email IS NOT NULL OR phone_number IS NOT NULL",
            name="ck_users_email_or_phone",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True, index=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone_number: Mapped[str | None] = mapped_column(String(20), unique=True, nullable=True, index=True)
    role_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("roles.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    role: Mapped["Role"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Role", back_populates="users", lazy="joined"
    )
    candidate_profile: Mapped["Candidate"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Candidate", back_populates="user", uselist=False, lazy="select"
    )
    jobs: Mapped[list["Job"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Job", back_populates="creator", lazy="select"
    )
    match_results_triggered: Mapped[list["MatchResult"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "MatchResult", back_populates="matched_by_user", lazy="select"
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r} phone={self.phone_number!r} role_id={self.role_id}>"
