"""
Model: Interview

Stores interview scheduling details created as part of the enterprise recruitment workflow.

Extended Workflow (v3 — Multi-Round):
1. HM requests interview → Interview record created (round_number, round_type set).
2. Recruiter sends slots to candidate (slot_token used for public link).
3. Candidate selects a slot (candidate_selection_at recorded).
4. Recruiter confirms (confirmed_by, confirmed_at set).
5. Interview takes place → status = 'completed'.
6. Interviewer submits competency scorecard (interviewer_* ratings).
7. HM submits per-round feedback (hm_recommendation: PASS / NO_GO / GO for final).
8. If PASS → next round initialized; if final GO → COMPENSATION_DISCUSSION.
9. If NO_GO → pipeline terminated, subsequent rounds cancelled.
"""

from datetime import datetime
from sqlalchemy import (
    Boolean, DateTime, ForeignKey, Integer, String, Text, func
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
    # HM who requested the interview
    requested_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    # Recruiter who confirmed the final slot
    confirmed_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    interview_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    interview_type: Mapped[str] = mapped_column(
        String(50), nullable=False, default="technical"
    )
    meeting_link: Mapped[str | None] = mapped_column(String(500), nullable=True)
    interview_mode: Mapped[str | None] = mapped_column(String(50), nullable=True, default="online")
    scheduled_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    # scheduled | completed | cancelled | PENDING_SCHEDULING | SLOTS_PROPOSED |
    # SLOT_SELECTED | CONFIRMED | PASSED | NO_GO
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="scheduled", index=True
    )
    # Secure 64-char hex token for candidate slot selection link (public)
    slot_token: Mapped[str | None] = mapped_column(String(64), nullable=True, unique=True, index=True)
    # When candidate selected their slot
    candidate_selection_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # When recruiter confirmed the interview
    confirmed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # ── Multi-Round Fields (v3) ────────────────────────────────────────────────
    # Round number within the application (1 = first/default, 2 = second, etc.)
    round_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1, index=True)
    # Human-readable round name (e.g., "Technical Screening", "System Design")
    round_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # Round type: TECHNICAL | CODING | MANAGERIAL | HR | CULTURE_FIT | ADDITIONAL
    round_type: Mapped[str] = mapped_column(String(50), nullable=False, default="TECHNICAL")
    # Round-level status: PENDING_SCHEDULING | SLOTS_PROPOSED | SLOT_SELECTED |
    # SCHEDULED | COMPLETED | PASSED | NO_GO | CANCELLED
    round_status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="PENDING_SCHEDULING", index=True
    )
    # Whether this is an on-demand additional round
    is_additional_round: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    # Duration in minutes
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True, default=60)
    # Candidate's selected slot FK (convenience reference)
    candidate_slot_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("interview_slots.id", ondelete="SET NULL"), nullable=True
    )

    # ── HM Per-Round Evaluation ────────────────────────────────────────────────
    # PASS = intermediate round passed, GO = final round approved, NO_GO = rejected
    hm_recommendation: Mapped[str | None] = mapped_column(String(20), nullable=True)
    hm_technical_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    hm_communication_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    hm_problem_solving_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    hm_role_fit_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    hm_overall_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    hm_comments: Mapped[str | None] = mapped_column(Text, nullable=True)
    hm_feedback_submitted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # ── Structured Competency Evaluation by Interviewer (1-5 stars) ───────────
    interviewer_technical_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    interviewer_communication_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    interviewer_problem_solving_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    interviewer_role_fit_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    interviewer_overall_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    interviewer_comments: Mapped[str | None] = mapped_column(Text, nullable=True)
    interviewer_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    interviewer_submitted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
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
    requester: Mapped["User | None"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "User", foreign_keys=[requested_by], lazy="joined"
    )
    confirmer: Mapped["User | None"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "User", foreign_keys=[confirmed_by], lazy="joined"
    )
    interviewer: Mapped["User | None"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "User", foreign_keys=[interviewer_id], lazy="joined"
    )
    slots: Mapped[list["InterviewSlot"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "InterviewSlot",
        primaryjoin="Interview.id == foreign(InterviewSlot.interview_id)",
        back_populates="interview",
        lazy="select", cascade="all, delete-orphan",
        overlaps="selected_slot"
    )
    selected_slot: Mapped["InterviewSlot | None"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "InterviewSlot", foreign_keys="[Interview.candidate_slot_id]", lazy="select",
        overlaps="slots"
    )
    hm_feedback: Mapped["InterviewFeedback | None"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "InterviewFeedback", back_populates="interview",
        uselist=False, lazy="select", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return (
            f"<Interview id={self.id} match_result_id={self.match_result_id} "
            f"round={self.round_number}/{self.round_type} status={self.status!r}>"
        )
