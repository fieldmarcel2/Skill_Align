"""
Model: Notification

Stores user notifications dispatched during hiring pipeline actions (e.g. interview invitations, status updates).
"""

from datetime import datetime
from sqlalchemy import (
    DateTime, ForeignKey, Integer, String, Text, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    channel: Mapped[str] = mapped_column(
        String(50), nullable=False, default="email"
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
            f"channel={self.channel!r} subject={self.subject!r} status={self.status!r}>"
        )
