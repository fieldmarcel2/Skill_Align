"""
Model: CandidateSkill

Junction table linking a Candidate to their Skills with proficiency,
experience metadata, and evidence source used by the matching engine.

Constraints:
- (candidate_id, skill_id) UNIQUE — a candidate cannot list the same
  skill twice.
- proficiency_level is NULLABLE — None means "detected from resume but
  proficiency cannot be reliably inferred". The matching engine maps
  None → 0.50 (detected factor, between Beginner=0.40 and Intermediate=0.70).
- source distinguishes evidence origin: 'resume' (auto-extracted) vs
  'manual' (self-declared by candidate).

Proficiency score mapping (matching engine):
  Beginner      → 0.40
  Intermediate  → 0.70
  Expert        → 1.00
  None          → 0.50  (resume-detected, unknown proficiency)

Source types:
  resume  → Extracted automatically from uploaded resume text
  manual  → Self-declared by candidate on their skills page
"""

from datetime import datetime
from sqlalchemy import (
    CheckConstraint, DateTime, ForeignKey, Integer, Numeric, String, Text,
    UniqueConstraint, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class CandidateSkill(Base):
    __tablename__ = "candidate_skills"

    __table_args__ = (
        UniqueConstraint("candidate_id", "skill_id", name="uq_candidate_skill"),
        CheckConstraint(
            "proficiency_level IS NULL OR proficiency_level IN ('Beginner', 'Intermediate', 'Expert')",
            name="ck_candidate_skill_proficiency",
        ),
        CheckConstraint(
            "years_experience >= 0",
            name="ck_candidate_skill_years_non_negative",
        ),
        CheckConstraint(
            "source IN ('resume', 'manual')",
            name="ck_candidate_skill_source",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False, index=True
    )
    skill_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("skills.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    # 'resume' = auto-extracted from resume | 'manual' = self-declared
    source: Mapped[str] = mapped_column(
        String(20), nullable=False, default="manual", index=True
    )
    # NULL means "detected in resume but proficiency not reliably inferred"
    proficiency_level: Mapped[str | None] = mapped_column(
        String(20), nullable=True, default=None
    )
    years_experience: Mapped[float] = mapped_column(
        Numeric(4, 1), nullable=False, default=0
    )
    # Text snippet from resume proving the skill (only for source='resume')
    evidence_text: Mapped[str | None] = mapped_column(Text, nullable=True)

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
    candidate: Mapped["Candidate"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Candidate", back_populates="skills", lazy="select"
    )
    skill: Mapped["Skill"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Skill", back_populates="candidate_skills", lazy="joined"
    )

    def __repr__(self) -> str:
        return (
            f"<CandidateSkill candidate_id={self.candidate_id} "
            f"skill_id={self.skill_id} source={self.source!r} "
            f"proficiency={self.proficiency_level!r}>"
        )
