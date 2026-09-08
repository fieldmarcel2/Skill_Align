"""
Model: CandidateBlacklist
=========================
Records candidates blacklisted after offer rejection (6-month period).

Business Rules:
- Created automatically when candidate rejects an offer.
- Blacklist period = 6 months from rejection date.
- During blacklist period:
  - Matching engine EXCLUDES candidate from interview recommendations.
  - Backend enforces this (not just frontend filtering).
- After expiry, is_active is automatically set to False (cron/check on query).
- Candidate is NOT deleted — profile preserved, only interview eligibility restricted.
"""

from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class CandidateBlacklist(Base):
    __tablename__ = "candidate_blacklists"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("candidates.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    match_result_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("match_results.id", ondelete="SET NULL"), nullable=True, index=True
    )
    blacklisted_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    blacklisted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    blacklisted_until: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)

    # ── Relationships ─────────────────────────────────────────────────────────
    candidate: Mapped["Candidate"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Candidate", lazy="joined"
    )
    blacklisted_by_user: Mapped["User | None"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "User", foreign_keys=[blacklisted_by], lazy="joined"
    )

    def __repr__(self) -> str:
        return (
            f"<CandidateBlacklist id={self.id} candidate_id={self.candidate_id} "
            f"until={self.blacklisted_until} active={self.is_active}>"
        )
