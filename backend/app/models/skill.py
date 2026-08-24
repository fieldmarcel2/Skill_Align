"""
Model: Skill

Master list of skills managed exclusively by Admin.

The `category` column is a plain VARCHAR (not a PostgreSQL enum) so that
new categories can be added without a schema migration. Suggested values:
  Programming, Database, Frontend, Backend, DevOps, Cloud,
  Testing, Data Science, Other
"""

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Skill(Base):
    __tablename__ = "skills"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(150), unique=True, nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False, default="Other")

    # ── Relationships ─────────────────────────────────────────────────────────
    job_skills: Mapped[list["JobSkill"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "JobSkill", back_populates="skill", lazy="select"
    )
    candidate_skills: Mapped[list["CandidateSkill"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "CandidateSkill", back_populates="skill", lazy="select"
    )

    def __repr__(self) -> str:
        return f"<Skill id={self.id} name={self.name!r} category={self.category!r}>"
