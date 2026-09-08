"""
Model: JobInterviewRound
========================
Defines the sequential interview round templates configured for a job requisition.

Each job can have multiple rounds (e.g., Round 1: Technical Screening, Round 2: Coding,
Round 3: Hiring Manager). When a candidate is scheduled for an interview, rounds are
instantiated sequentially from these templates.

Round Types:
  TECHNICAL   - Technical screening / deep dive
  CODING      - Live coding / take-home assessment
  MANAGERIAL  - Behavioral / leadership assessment by HM
  HR          - HR / culture fit round
  CULTURE_FIT - Culture & values fit
  ADDITIONAL  - On-demand extra round appended after main rounds
"""

from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class JobInterviewRound(Base):
    __tablename__ = "job_interview_rounds"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    job_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    round_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    round_name: Mapped[str] = mapped_column(String(100), nullable=False, default="Interview Round")
    round_type: Mapped[str] = mapped_column(String(50), nullable=False, default="TECHNICAL")
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    is_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # ── Relationships ──────────────────────────────────────────────────────────
    job: Mapped["Job"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Job", lazy="joined"
    )

    def __repr__(self) -> str:
        return (
            f"<JobInterviewRound id={self.id} job_id={self.job_id} "
            f"round={self.round_number} type={self.round_type!r}>"
        )
