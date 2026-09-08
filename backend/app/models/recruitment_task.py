"""
Model: RecruitmentTask
======================
Actionable tasks for the Recruiter Action Center and HR workflows.

Extended with: action_type for workflow-specific tasks, match_result_id and interview_id
for context-linking, enabling the Action Center to show structured pending actions.

Action Types:
- SEND_SLOTS_TO_CANDIDATE: Recruiter must forward HM-proposed slots to candidate
- CONFIRM_INTERVIEW: Recruiter must confirm candidate's slot selection with HM
- CREATE_OFFER: Recruiter should create compensation offer (after GO decision)
- SEND_OFFER: Recruiter should send the drafted offer
- FEEDBACK_REQUIRED: HM must submit interview feedback
- GENERAL: Generic ad-hoc task
"""

from datetime import datetime
from sqlalchemy import (
    DateTime, ForeignKey, Integer, String, Text, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

TASK_STATUSES = ("OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED")
TASK_PRIORITIES = ("LOW", "MEDIUM", "HIGH", "URGENT")
TASK_ACTION_TYPES = (
    "SEND_SLOTS_TO_CANDIDATE",
    "CONFIRM_INTERVIEW",
    "CREATE_OFFER",
    "SEND_OFFER",
    "FEEDBACK_REQUIRED",
    "GENERAL",
)


class RecruitmentTask(Base):
    __tablename__ = "recruitment_tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    job_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    candidate_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=True, index=True
    )
    assigned_to: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_by: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # New: link to match_result for workflow context
    match_result_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("match_results.id", ondelete="CASCADE"), nullable=True, index=True
    )
    # New: link to interview for slot/feedback tasks
    interview_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("interviews.id", ondelete="CASCADE"), nullable=True, index=True
    )
    # New: workflow-specific action type
    action_type: Mapped[str | None] = mapped_column(
        String(60), nullable=True, default="GENERAL", index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="OPEN", index=True
    )
    priority: Mapped[str] = mapped_column(
        String(20), nullable=False, default="MEDIUM"
    )
    due_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
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
        "Job", back_populates="tasks", lazy="joined"
    )
    candidate: Mapped["Candidate | None"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Candidate", lazy="joined"
    )
    assignee: Mapped["User"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "User", foreign_keys=[assigned_to], lazy="joined"
    )
    creator: Mapped["User"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "User", foreign_keys=[created_by], lazy="joined"
    )

    def __repr__(self) -> str:
        return (
            f"<RecruitmentTask id={self.id} job_id={self.job_id} "
            f"action_type={self.action_type!r} assigned_to={self.assigned_to} "
            f"status={self.status!r} title={self.title!r}>"
        )
