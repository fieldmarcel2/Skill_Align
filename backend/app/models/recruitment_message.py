"""
Model: RecruitmentMessage
=========================
Internal recruitment collaboration messages between HR and Recruiters.

Scope & Data Isolation:
- Job-level messages: candidate_id IS NULL.
  Visible to HR owner and all recruiters assigned to that specific job.
- Candidate-level messages: candidate_id IS NOT NULL.
  Contextual discussion regarding a candidate specifically for this job requisition.
  Segregated per (job, candidate) pair — never leaks across different jobs.
"""

from datetime import datetime
from sqlalchemy import (
    Boolean, DateTime, ForeignKey, Integer, String, Text, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

MESSAGE_TYPES = ("GENERAL", "SCREENING_NOTE", "HR_REQUEST", "RECOMMENDATION", "SYSTEM")


class RecruitmentMessage(Base):
    __tablename__ = "recruitment_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    job_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    candidate_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=True, index=True
    )
    sender_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    message: Mapped[str] = mapped_column(Text, nullable=False)
    message_type: Mapped[str] = mapped_column(
        String(30), nullable=False, default="GENERAL"
    )
    is_private: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    read_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    job: Mapped["Job"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Job", back_populates="messages", lazy="joined"
    )
    candidate: Mapped["Candidate | None"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Candidate", lazy="joined"
    )
    sender: Mapped["User"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "User", foreign_keys=[sender_id], lazy="joined"
    )

    def __repr__(self) -> str:
        return (
            f"<RecruitmentMessage id={self.id} job_id={self.job_id} "
            f"candidate_id={self.candidate_id} sender_id={self.sender_id} type={self.message_type!r}>"
        )
