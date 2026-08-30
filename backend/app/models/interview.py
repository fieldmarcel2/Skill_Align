"""
Model: Interview

Stores interview scheduling details created by HR for candidates in the hiring pipeline.

Constraints:
- scheduled_by must be an HR user.
- match_result_id links this interview to the candidate's job match.
- status tracks: 'scheduled', 'completed', 'cancelled'.
"""

from datetime import datetime
from sqlalchemy import (
    DateTime, ForeignKey, Integer, String, Text, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Interview(Base):
    __tablename__ = "interviews"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    match_result_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("match_results.id", ondelete="CASCADE"), nullable=False, index=True
    )
    scheduled_by: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    interview_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    interview_type: Mapped[str] = mapped_column(
        String(50), nullable=False, default="technical"
    )
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="scheduled", index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    match_result: Mapped["MatchResult"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "MatchResult", back_populates="interviews", lazy="joined"
    )
    scheduler: Mapped["User"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "User", foreign_keys=[scheduled_by], lazy="joined"
    )

    def __repr__(self) -> str:
        return (
            f"<Interview id={self.id} match_result_id={self.match_result_id} "
            f"scheduled_by={self.scheduled_by} date={self.interview_date} status={self.status!r}>"
        )
