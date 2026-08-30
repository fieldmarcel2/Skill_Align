"""
Model: Candidate

Extended profile for users who hold the 'Candidate' role.

- user_id is UNIQUE enforcing a strict one-to-one relationship between
  a Candidate profile and a User account.
- resume_file_path stores the server-side relative path only; the actual
  binary file lives on disk (never in the database).
- total_experience_years is set by the candidate; used by the matching
  engine to check min_experience_years on the job.
"""

from datetime import datetime
from sqlalchemy import (
    DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Candidate(Base):
    __tablename__ = "candidates"

    __table_args__ = (
        UniqueConstraint("user_id", name="uq_candidate_user"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(30), nullable=True)
    resume_file_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    resume_s3_key: Mapped[str | None] = mapped_column(String(500), nullable=True)
    resume_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    resume_uploaded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    total_experience_years: Mapped[float] = mapped_column(
        Numeric(4, 1), nullable=False, default=0
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    user: Mapped["User"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "User", back_populates="candidate_profile", lazy="joined"
    )
    skills: Mapped[list["CandidateSkill"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "CandidateSkill", back_populates="candidate", lazy="select",
        cascade="all, delete-orphan"
    )
    match_results: Mapped[list["MatchResult"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "MatchResult", back_populates="candidate", lazy="select"
    )

    def __repr__(self) -> str:
        return f"<Candidate id={self.id} full_name={self.full_name!r}>"
