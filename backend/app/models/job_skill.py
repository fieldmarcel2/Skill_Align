"""
Model: JobSkill

Junction table that links a Job to its required/preferred Skills,
with an optional numeric weight used by the matching engine.

Constraints:
- (job_id, skill_id) UNIQUE — a skill cannot appear twice for the same job
- requirement_type must be 'required' or 'preferred'
- weight is a positive numeric value; higher = more important

Example:
  job_id=1, skill_id=5 (Python), requirement_type='required', weight=5
  job_id=1, skill_id=6 (React),  requirement_type='preferred', weight=2
"""

from sqlalchemy import (
    CheckConstraint, ForeignKey, Integer, Numeric, String, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class JobSkill(Base):
    __tablename__ = "job_skills"

    __table_args__ = (
        UniqueConstraint("job_id", "skill_id", name="uq_job_skill"),
        CheckConstraint(
            "requirement_type IN ('required', 'preferred')",
            name="ck_job_skill_requirement_type",
        ),
        CheckConstraint("weight > 0", name="ck_job_skill_weight_positive"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    job_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    skill_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("skills.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    requirement_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default="required"
    )
    weight: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=1.0)

    # ── Relationships ─────────────────────────────────────────────────────────
    job: Mapped["Job"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Job", back_populates="job_skills", lazy="select"
    )
    skill: Mapped["Skill"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Skill", back_populates="job_skills", lazy="joined"
    )

    def __repr__(self) -> str:
        return (
            f"<JobSkill job_id={self.job_id} skill_id={self.skill_id} "
            f"type={self.requirement_type!r} weight={self.weight}>"
        )
