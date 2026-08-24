"""
Model: Role

Stores the four application roles:
  1 - Admin
  2 - HR
  3 - Recruiter
  4 - Candidate

These four roles are seeded at startup and must not be modified by
application users. Admin cannot create arbitrary new roles through
the UI.
"""

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)

    # ── Relationships ─────────────────────────────────────────────────────────
    users: Mapped[list["User"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "User", back_populates="role", lazy="select"
    )

    def __repr__(self) -> str:
        return f"<Role id={self.id} name={self.name!r}>"
