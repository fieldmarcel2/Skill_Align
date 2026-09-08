"""
Model: InterviewFeedback
========================
Structured GO/NO-GO feedback from the Hiring Manager after an interview.

- One feedback per interview.
- Only the HM (HR role) can submit feedback.
- go_no_go: 'GO' | 'NO_GO'
- Ratings 1-5 for technical, communication, problem solving, role fit.
- Workflow blocks until feedback is submitted (WAITING_FOR_HM_FEEDBACK state).
"""

from datetime import datetime
from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class InterviewFeedback(Base):
    __tablename__ = "interview_feedback"

    __table_args__ = (
        CheckConstraint("go_no_go IN ('GO', 'NO_GO')", name="ck_feedback_go_no_go"),
        CheckConstraint(
            "technical_rating BETWEEN 1 AND 5",
            name="ck_feedback_technical_rating",
        ),
        CheckConstraint(
            "communication_rating BETWEEN 1 AND 5",
            name="ck_feedback_communication_rating",
        ),
        CheckConstraint(
            "problem_solving_rating BETWEEN 1 AND 5",
            name="ck_feedback_problem_solving_rating",
        ),
        CheckConstraint(
            "role_fit_rating BETWEEN 1 AND 5",
            name="ck_feedback_role_fit_rating",
        ),
        CheckConstraint(
            "overall_rating BETWEEN 1 AND 5",
            name="ck_feedback_overall_rating",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    interview_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("interviews.id", ondelete="CASCADE"),
        nullable=False, unique=True, index=True
    )
    match_result_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("match_results.id", ondelete="CASCADE"), nullable=False, index=True
    )
    reviewer_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    # GO | NO_GO
    go_no_go: Mapped[str] = mapped_column(String(10), nullable=False)
    technical_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    communication_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    problem_solving_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    role_fit_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    overall_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    comments: Mapped[str | None] = mapped_column(Text, nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    interview: Mapped["Interview"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Interview", back_populates="hm_feedback", lazy="joined"
    )
    reviewer: Mapped["User | None"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "User", foreign_keys=[reviewer_id], lazy="joined"
    )

    def __repr__(self) -> str:
        return (
            f"<InterviewFeedback id={self.id} interview_id={self.interview_id} "
            f"go_no_go={self.go_no_go!r} overall={self.overall_rating}>"
        )
