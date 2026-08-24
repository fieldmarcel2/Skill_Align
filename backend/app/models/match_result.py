"""
Model: MatchResult

Stores the outcome of the matching engine for a specific
(job, candidate) pair.

Upsert behaviour:
  When HR re-runs matching for the same job, the engine performs an
  INSERT … ON CONFLICT (job_id, candidate_id) DO UPDATE.
  This preserves the unique constraint while updating the score.
  The `status` is reset to 'matched' on re-run so HR can
  re-review; if preserving the previous status is desired,
  this can be adjusted in the service layer.

overall_score:
  Computed by matching_service.py using the weighted proficiency
  formula (0–100). Rounded to 2 decimal places.

status transitions:
  matched → shortlisted  (HR action)
  matched → rejected     (HR action)
  shortlisted → rejected (Recruiter action)
"""

from datetime import datetime
from sqlalchemy import (
    CheckConstraint, DateTime, ForeignKey, Integer, Numeric,
    String, UniqueConstraint, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class MatchResult(Base):
    __tablename__ = "match_results"

    __table_args__ = (
        UniqueConstraint("job_id", "candidate_id", name="uq_match_result"),
        CheckConstraint(
            "status IN ('matched', 'shortlisted', 'rejected')",
            name="ck_match_result_status",
        ),
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
    matched_by: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    overall_score: Mapped[float] = mapped_column(
        Numeric(5, 2), nullable=False, default=0
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="matched", index=True
    )
    matched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    job: Mapped["Job"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Job", back_populates="match_results", lazy="joined"
    )
    candidate: Mapped["Candidate"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Candidate", back_populates="match_results", lazy="joined"
    )
    matched_by_user: Mapped["User"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "User", back_populates="match_results_triggered", lazy="joined"
    )

    def __repr__(self) -> str:
        return (
            f"<MatchResult job_id={self.job_id} candidate_id={self.candidate_id} "
            f"score={self.overall_score} status={self.status!r}>"
        )
