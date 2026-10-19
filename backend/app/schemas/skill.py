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
    def valid_category(cls, v: Optional[str]) -> str:
        if not v:
            return "Other"
        v = v.strip()
        for cat in VALID_CATEGORIES:
            if v.lower() == cat.lower():
                return cat
        lower = v.lower()
        if "cloud" in lower:
            return "Cloud"
        if "devops" in lower:
            return "DevOps"
        if "data" in lower or "ml" in lower or "ai" in lower:
            return "Data Science"
        if "db" in lower or "database" in lower or "storage" in lower:
            return "Database"
        if "test" in lower or "tool" in lower or "qa" in lower:
            return "Testing"
        if "front" in lower or "ui" in lower or "ux" in lower:
            return "Frontend"
        if "back" in lower or "core" in lower or "tech" in lower:
            return "Backend"
        if "program" in lower or "language" in lower or "code" in lower:
            return "Programming"
        return "Other"


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
        if v is None:
            return None
        v = v.strip()
        for cat in VALID_CATEGORIES:
            if v.lower() == cat.lower():
                return cat
        lower = v.lower()
        if "cloud" in lower:
            return "Cloud"
        if "devops" in lower:
            return "DevOps"
        if "data" in lower or "ml" in lower or "ai" in lower:
            return "Data Science"
        if "db" in lower or "database" in lower or "storage" in lower:
            return "Database"
        if "test" in lower or "tool" in lower or "qa" in lower:
            return "Testing"
        if "front" in lower or "ui" in lower or "ux" in lower:
            return "Frontend"
        if "back" in lower or "core" in lower or "tech" in lower:
            return "Backend"
        if "program" in lower or "language" in lower or "code" in lower:
            return "Programming"
        return "Other"


class SkillOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    category: str
