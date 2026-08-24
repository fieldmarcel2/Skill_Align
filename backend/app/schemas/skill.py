"""
Pydantic schemas for Skill endpoints.

SkillCreate / SkillUpdate → Admin CRUD
SkillOut                  → read response (all roles)
"""

from typing import Optional
from pydantic import BaseModel, field_validator, ConfigDict

VALID_CATEGORIES = {
    "Programming", "Database", "Frontend", "Backend",
    "DevOps", "Cloud", "Testing", "Data Science", "Other",
}


class SkillCreate(BaseModel):
    name: str
    category: str = "Other"

    @field_validator("name")
    @classmethod
    def non_empty_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Skill name cannot be blank.")
        return v

    @field_validator("category")
    @classmethod
    def valid_category(cls, v: str) -> str:
        v = v.strip()
        if v not in VALID_CATEGORIES:
            raise ValueError(
                f"Category must be one of: {', '.join(sorted(VALID_CATEGORIES))}"
            )
        return v


class SkillUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None

    @field_validator("name")
    @classmethod
    def non_empty_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Skill name cannot be blank.")
        return v

    @field_validator("category")
    @classmethod
    def valid_category(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if v not in VALID_CATEGORIES:
                raise ValueError(
                    f"Category must be one of: {', '.join(sorted(VALID_CATEGORIES))}"
                )
        return v


class SkillOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    category: str
