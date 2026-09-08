"""
Model: InterviewSlot
====================
Stores proposed time slots for an interview, proposed by the Hiring Manager.

Workflow:
1. HM clicks "Request Interview" and proposes >= 2 slots.
2. Recruiter reviews and forwards to candidate.
3. Candidate selects one slot.
4. Recruiter confirms the selected slot.

Constraints:
- Minimum 2 slots must be proposed (enforced at API level).
- Once selected, other slots for the same interview are cancelled.
- Status: proposed | selected | cancelled
"""

from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class InterviewSlot(Base):
    __tablename__ = "interview_slots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    interview_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("interviews.id", ondelete="CASCADE"), nullable=False, index=True
    )
    match_result_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("match_results.id", ondelete="CASCADE"), nullable=False, index=True
    )
    proposed_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    slot_datetime: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    slot_end_datetime: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # proposed | selected | cancelled
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="proposed", index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    interview: Mapped["Interview"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Interview", foreign_keys=[interview_id], back_populates="slots", lazy="select"
    )
    proposer: Mapped["User | None"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "User", foreign_keys=[proposed_by], lazy="select"
    )

    def __repr__(self) -> str:
        return (
            f"<InterviewSlot id={self.id} interview_id={self.interview_id} "
            f"slot={self.slot_datetime} status={self.status!r}>"
        )
