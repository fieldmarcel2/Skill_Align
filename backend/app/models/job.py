"""
Model: Job

Represents an open/draft/closed job requisition created by a Recruiter.

- created_by   → the Recruiter (users.id) who created this job
- status       → 'draft' | 'active' | 'closed'  (plain VARCHAR, not enum)
- client_name  → optional; useful for recruitment agencies working with clients
"""

from datetime import datetime
from sqlalchemy import (
    DateTime, ForeignKey, Integer, Numeric, String, Text, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    department: Mapped[str] = mapped_column(String(150), nullable=True)
    client_name: Mapped[str] = mapped_column(String(255), nullable=True)
    min_experience_years: Mapped[float] = mapped_column(
        Numeric(4, 1), nullable=False, default=0
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="draft", index=True
    )
    created_by: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    creator: Mapped["User"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "User", back_populates="jobs", lazy="joined"
    )
    job_skills: Mapped[list["JobSkill"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "JobSkill", back_populates="job", lazy="select", cascade="all, delete-orphan"
    )
    match_results: Mapped[list["MatchResult"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "MatchResult", back_populates="job", lazy="select", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Job id={self.id} title={self.title!r} status={self.status!r}>"
