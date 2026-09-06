"""
Model: MatchResult

Stores the outcome of the matching engine for a specific (job, candidate) pair.

Roles & Pipeline Workflow:
1. Recruiter triggers match -> status = 'matched' (with recruiter_id set to recruiter's user id).
2. Recruiter reviews candidate & resume -> updates status to 'screened' (or 'rejected').
3. HR views 'screened' candidates -> updates status to 'approved_by_hr' (or 'rejected').
4. HR schedules interview -> creates Interview record, updates status to 'interview_scheduled'.
5. Final decisions -> 'offer', 'hired', or 'rejected'.
"""

from datetime import datetime
from sqlalchemy import (
    CheckConstraint, DateTime, ForeignKey, Integer, Numeric,
    String, UniqueConstraint, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

PIPELINE_STATUSES = (
    "matched",
    "screened",
    "approved_by_hr",
    "interview_scheduled",
    "shortlisted",
    "screening",
    "technical_interview",
    "hr_interview",
    "offer",
    "hired",
    "rejected",
)


class MatchResult(Base):
    __tablename__ = "match_results"

    __table_args__ = (
        UniqueConstraint("job_id", "candidate_id", name="uq_match_result"),
        CheckConstraint(
            "overall_score >= 0 AND overall_score <= 100",
            name="ck_match_result_score_range",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    job_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    candidate_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False, index=True
    )
    recruiter_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    matched_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    overall_score: Mapped[float] = mapped_column(
        Numeric(5, 2), nullable=False, default=0
    )
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="matched", index=True
    )
    # Technical async processing state — separate from business pipeline status
    # queued | processing | completed | failed | stale
    processing_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="completed", index=True
    )
    # Incremented on each match recalculation — detects stale results
    matched_by_version: Mapped[int | None] = mapped_column(Integer, nullable=True, default=1)
    matched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    job: Mapped["Job"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Job", back_populates="match_results", lazy="joined"
    )
    candidate: Mapped["Candidate"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Candidate", back_populates="match_results", lazy="joined"
    )
    recruiter: Mapped["User"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "User", foreign_keys=[recruiter_id], lazy="joined"
    )
    matched_by_user: Mapped["User"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "User", foreign_keys=[matched_by], back_populates="match_results_triggered", lazy="joined"
    )
    scorecards: Mapped[list["CandidateScorecard"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "CandidateScorecard", back_populates="match_result",
        lazy="select", cascade="all, delete-orphan"
    )
    interviews: Mapped[list["Interview"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Interview", back_populates="match_result",
        lazy="select", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return (
            f"<MatchResult job_id={self.job_id} candidate_id={self.candidate_id} "
            f"recruiter_id={self.recruiter_id} score={self.overall_score} status={self.status!r}>"
        )
