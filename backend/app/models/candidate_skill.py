"""
Model: CandidateSkill

Junction table linking a Candidate to their Skills with proficiency
and experience metadata used by the matching engine.

Constraints:
- (candidate_id, skill_id) UNIQUE — a candidate cannot list the same
  skill twice.
- proficiency_level must be one of: 'Beginner', 'Intermediate', 'Expert'
  (used verbatim in the matching algorithm).

Proficiency score mapping (matching engine):
  Beginner      → 0.40
  Intermediate  → 0.70
  Expert        → 1.00
"""

from sqlalchemy import (
    CheckConstraint, ForeignKey, Integer, Numeric, String, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class CandidateSkill(Base):
    __tablename__ = "candidate_skills"

    __table_args__ = (
        UniqueConstraint("candidate_id", "skill_id", name="uq_candidate_skill"),
        CheckConstraint(
            "proficiency_level IN ('Beginner', 'Intermediate', 'Expert')",
            name="ck_candidate_skill_proficiency",
        ),
        CheckConstraint(
            "years_experience >= 0",
            name="ck_candidate_skill_years_non_negative",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False, index=True
    )
    skill_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("skills.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    proficiency_level: Mapped[str] = mapped_column(
        String(20), nullable=False, default="Beginner"
    )
    years_experience: Mapped[float] = mapped_column(
        Numeric(4, 1), nullable=False, default=0
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
            f"skill_id={self.skill_id} proficiency={self.proficiency_level!r}>"
        )
