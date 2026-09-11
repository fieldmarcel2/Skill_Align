"""
Model: Offer
============
Represents a job offer extended to a candidate after successful interview process.

Offer Approval Lifecycle (v2):
1. Recruiter creates offer → DRAFT (can edit freely).
2. Recruiter submits to HM → PENDING_HM_REVIEW.
3a. HM requests changes → HM_CHANGES_REQUESTED (recruiter edits, re-submits).
3b. HM approves → HM_APPROVED.
4. Recruiter generates official PDF offer letter → OFFER_READY.
5. Recruiter sends offer to candidate → SENT.
6a. Candidate accepts → ACCEPTED → MatchResult → HIRED.
6b. Candidate rejects → REJECTED → MatchResult → BLACKLISTED (6 months).
7. Offer auto-expires if not responded by offer_expiry_date → EXPIRED.

Security:
- offer_token is a 32-byte random hex used in public accept/reject links.
- secure_access_token_hash is a SHA-256 hash used for PDF download access.
- Backend verifies token + candidate ownership before processing.
"""

from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

OFFER_STATUSES = (
    "DRAFT", "PENDING_HM_REVIEW", "HM_CHANGES_REQUESTED", "HM_APPROVED",
    "OFFER_READY", "SENT", "ACCEPTED", "REJECTED", "EXPIRED", "WITHDRAWN"
)


class Offer(Base):
    __tablename__ = "offers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    match_result_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("match_results.id", ondelete="CASCADE"),
        nullable=False, unique=True, index=True
    )
    candidate_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False, index=True
    )
    job_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # ── Compensation ──────────────────────────────────────────────────────────
    salary_currency: Mapped[str] = mapped_column(String(10), nullable=False, default="INR")
    salary_min: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    salary_max: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    proposed_salary: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    fixed_compensation: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    variable_compensation: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    total_compensation: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    bonus: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    joining_bonus: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    other_benefits: Mapped[str | None] = mapped_column(Text, nullable=True)
    notice_period: Mapped[str | None] = mapped_column(String(100), nullable=True)
    expected_joining_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    override_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    override_approved_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # ── Offer Details ─────────────────────────────────────────────────────────
    role_scope: Mapped[str | None] = mapped_column(Text, nullable=True)
    employment_type: Mapped[str | None] = mapped_column(String(50), nullable=True, default="Full-time")
    joining_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    joining_timeline: Mapped[str | None] = mapped_column(String(100), nullable=True)
    offer_expiry_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    work_mode: Mapped[str | None] = mapped_column(String(50), nullable=True)
    additional_terms: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Public Offer Token (for candidate accept/reject link) ─────────────────
    offer_token: Mapped[str | None] = mapped_column(String(64), nullable=True, unique=True, index=True)

    # ── Status (legacy single-field for backward compat) ─────────────────────
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="DRAFT", index=True
    )
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    candidate_response_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    rejected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Approval Workflow (v2) ─────────────────────────────────────────────────
    # workflow_state mirrors status but with finer granularity for the approval flow
    workflow_state: Mapped[str] = mapped_column(
        String(50), nullable=False, default="DRAFT", index=True
    )
    submitted_to_hm_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    approved_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    hm_approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    hm_comments: Mapped[str | None] = mapped_column(Text, nullable=True)
    recruiter_comments: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── PDF Document Storage & Versioning ──────────────────────────────────────
    pdf_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    pdf_storage_key: Mapped[str | None] = mapped_column(String(500), nullable=True)
    pdf_file_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    pdf_file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    pdf_mime_type: Mapped[str | None] = mapped_column(String(100), nullable=True, default="application/pdf")
    pdf_generated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    pdf_generated_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    # Secure token hash for candidate PDF download (SHA-256 of offer_token)
    secure_access_token_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)
    token_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

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
    match_result: Mapped["MatchResult"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "MatchResult", foreign_keys=[match_result_id], lazy="select", overlaps="offer"
    )
    candidate: Mapped["Candidate"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Candidate", lazy="joined"
    )
    job: Mapped["Job"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Job", lazy="joined"
    )
    creator: Mapped["User | None"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "User", foreign_keys=[created_by], lazy="joined"
    )
    approver: Mapped["User | None"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "User", foreign_keys=[approved_by], lazy="joined"
    )
    pdf_generator: Mapped["User | None"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "User", foreign_keys=[pdf_generated_by], lazy="joined"
    )

    def __repr__(self) -> str:
        return (
            f"<Offer id={self.id} match_result_id={self.match_result_id} "
            f"status={self.status!r} workflow_state={self.workflow_state!r}>"
        )
