"""
Model: CandidateScorecard

Stores collaborative interview feedback for a specific match result.
Multiple reviewers (HR, Recruiter) can each leave a scorecard entry.

- match_result_id → the (job, candidate) pair being evaluated
- reviewer_id     → the user (HR or Recruiter) who submitted the feedback
- communication_score / technical_score → integer 1–10
- overall_impression → free-text notes
"""

from datetime import datetime
from sqlalchemy import (
    CheckConstraint, DateTime, ForeignKey, Integer, Text, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class CandidateScorecard(Base):
    __tablename__ = "candidate_scorecards"

    __table_args__ = (
        CheckConstraint(
            "communication_score >= 1 AND communication_score <= 10",
            name="ck_scorecard_comm_score",
        ),
        CheckConstraint(
            "technical_score >= 1 AND technical_score <= 10",
            name="ck_scorecard_tech_score",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    match_result_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("match_results.id", ondelete="CASCADE"), nullable=False, index=True
    )
    reviewer_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    communication_score: Mapped[int] = mapped_column(Integer, nullable=False)
    technical_score: Mapped[int] = mapped_column(Integer, nullable=False)
    overall_impression: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    match_result: Mapped["MatchResult"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "MatchResult", back_populates="scorecards", lazy="select"
    )
    reviewer: Mapped["User"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "User", lazy="joined"
    )

    def __repr__(self) -> str:
        return (
            f"<CandidateScorecard match_result_id={self.match_result_id} "
            f"reviewer_id={self.reviewer_id} comm={self.communication_score} tech={self.technical_score}>"
        )
