"""
Model: CandidateRecruiterAssignment
===================================
Represents operational assignment / claiming of a specific candidate for a job requisition.

Workflow:
- MODE 1: Shared candidate pool (unassigned candidates visible to all assigned recruiters).
- MODE 2: Claiming / Assignment ("Assign to Me" or HR/Primary Recruiter assigns candidate to recruiter).

Concurrency / Race Conditions:
- (job_id, candidate_id) UNIQUE constraint guarantees that two recruiters clicking
  "Assign to Me" concurrently cannot create two active primary assignments.
"""

from datetime import datetime
from sqlalchemy import (
    DateTime, ForeignKey, Integer, String, UniqueConstraint, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class CandidateRecruiterAssignment(Base):
    __tablename__ = "candidate_recruiter_assignments"

    __table_args__ = (
        UniqueConstraint("job_id", "candidate_id", name="uq_job_candidate_assignment"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    job_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    candidate_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False, index=True
    )
    recruiter_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    assigned_by: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="active", index=True
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
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
    job: Mapped["Job"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Job", back_populates="candidate_assignments", lazy="joined"
    )
    candidate: Mapped["Candidate"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Candidate", back_populates="recruiter_assignments", lazy="joined"
    )
    recruiter: Mapped["User"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "User", foreign_keys=[recruiter_id], lazy="joined"
    )
    assigner: Mapped["User"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "User", foreign_keys=[assigned_by], lazy="joined"
    )

    def __repr__(self) -> str:
        return (
            f"<CandidateRecruiterAssignment job_id={self.job_id} candidate_id={self.candidate_id} "
            f"recruiter_id={self.recruiter_id} status={self.status!r}>"
        )
