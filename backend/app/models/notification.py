"""
Model: Notification

Stores user notifications dispatched during hiring pipeline actions.
Extended with: is_read flag, notification_type for dashboard filtering,
match_result_id for context, and action_url for deep-linking.
"""

from datetime import datetime
from sqlalchemy import (
    Boolean, DateTime, ForeignKey, Integer, String, Text, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

NOTIFICATION_TYPES = (
    "HM_REVIEW_REQUIRED",
    "INTERVIEW_SLOTS_RECEIVED",
    "SLOTS_SENT_TO_CANDIDATE",
    "CANDIDATE_SLOT_SELECTED",
    "INTERVIEW_CONFIRMED",
    "INTERVIEW_COMPLETED",
    "FEEDBACK_REQUIRED",
    "INTERVIEW_GO",
    "INTERVIEW_NO_GO",
    "OFFER_READY",
    "OFFER_ACCEPTED",
    "OFFER_REJECTED",
    "CANDIDATE_BLACKLISTED",
    "GENERAL",
)


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    channel: Mapped[str] = mapped_column(
        String(50), nullable=False, default="in_app"
    )
    subject: Mapped[str] = mapped_column(
        String(255), nullable=False
    )
    body: Mapped[str] = mapped_column(
        Text, nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="sent", index=True
    )
    # New enterprise workflow fields
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    notification_type: Mapped[str | None] = mapped_column(
        String(60), nullable=True, index=True
    )
    match_result_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("match_results.id", ondelete="CASCADE"), nullable=True, index=True
    )
    action_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    user: Mapped["User"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "User", lazy="joined"
    )

    def __repr__(self) -> str:
        return (
            f"<Notification id={self.id} user_id={self.user_id} "
            f"type={self.notification_type!r} subject={self.subject!r} "
            f"is_read={self.is_read} status={self.status!r}>"
        )
