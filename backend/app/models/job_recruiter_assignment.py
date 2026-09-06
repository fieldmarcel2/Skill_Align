"""
Model: JobRecruiterAssignment
=============================
Maps Recruiters to Jobs with specific operational roles:
- PRIMARY_RECRUITER: Primary lead coordinating recruitment activity on the requisition
- RECRUITER: Talent acquisition recruiter actively reviewing/screening candidates
- SOURCER: Sourcing specialist identifying/adding talent

Constraints:
- (job_id, recruiter_id) UNIQUE — prevents duplicate active assignments of the same recruiter.
"""

from datetime import datetime
from sqlalchemy import (
    DateTime, ForeignKey, Integer, String, UniqueConstraint, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

ASSIGNMENT_ROLES = ("PRIMARY_RECRUITER", "RECRUITER", "SOURCER")


class JobRecruiterAssignment(Base):
    __tablename__ = "job_recruiter_assignments"

    __table_args__ = (
        UniqueConstraint("job_id", "recruiter_id", name="uq_job_recruiter"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    job_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    recruiter_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    assigned_by: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    assignment_role: Mapped[str] = mapped_column(
        String(30), nullable=False, default="RECRUITER"
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="active", index=True
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    removed_at: Mapped[datetime | None] = mapped_column(
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
        "Job", back_populates="recruiter_assignments", lazy="joined"
    )
    recruiter: Mapped["User"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "User", foreign_keys=[recruiter_id], back_populates="job_assignments", lazy="joined"
    )
    assigner: Mapped["User"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "User", foreign_keys=[assigned_by], lazy="joined"
    )

    def __repr__(self) -> str:
        return (
            f"<JobRecruiterAssignment job_id={self.job_id} recruiter_id={self.recruiter_id} "
            f"role={self.assignment_role!r} status={self.status!r}>"
        )
