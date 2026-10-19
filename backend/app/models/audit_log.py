"""
Model: AuditLog
===============
Tracks ALL operational actions and workflow state transitions across the recruitment lifecycle.

Correlation:
- request_id (nullable) links an Audit Log entry to a specific HTTP request.
  Use this to correlate audit entries with application logs via shared request_id.
"""

from datetime import datetime
from sqlalchemy import (
    DateTime, ForeignKey, Integer, String, Text, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    actor_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    action: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    job_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=True, index=True
    )
    candidate_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=True, index=True
    )
    # New enterprise workflow fields
    match_result_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("match_results.id", ondelete="CASCADE"), nullable=True, index=True
    )
    interview_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("interviews.id", ondelete="CASCADE"), nullable=True, index=True
    )
    from_state: Mapped[str | None] = mapped_column(String(60), nullable=True)
    to_state: Mapped[str | None] = mapped_column(String(60), nullable=True)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Correlation field: links this audit entry to the originating HTTP request.
    # NULL for records created before this column was added — fully backward-compatible.
    request_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    actor: Mapped["User | None"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "User", foreign_keys=[actor_id], lazy="joined"
    )

    def __repr__(self) -> str:
        return (
            f"<AuditLog id={self.id} action={self.action!r} actor_id={self.actor_id} "
            f"job_id={self.job_id} candidate_id={self.candidate_id} "
            f"from_state={self.from_state!r} to_state={self.to_state!r}>"
        )
