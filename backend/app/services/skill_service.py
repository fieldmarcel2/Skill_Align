"""
Skill service — Admin CRUD for the master skill list.

Read access is available to all authenticated roles.
Write access (create/update/delete) is Admin-only (enforced in the router).
"""

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.skill import Skill
from app.schemas.skill import SkillCreate, SkillUpdate, SkillOut


def create_skill(db: Session, data: SkillCreate) -> SkillOut:
    if db.query(Skill).filter(Skill.name == data.name).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A skill named '{data.name}' already exists.",
        )
    skill = Skill(name=data.name, category=data.category)
    db.add(skill)
    db.commit()
    db.refresh(skill)
    return SkillOut.model_validate(skill)


def list_skills(db: Session, category: str | None = None) -> list[SkillOut]:
    query = db.query(Skill)
    if category:
        query = query.filter(Skill.category == category)
    return [SkillOut.model_validate(s) for s in query.order_by(Skill.name).all()]


def get_skill(db: Session, skill_id: int) -> SkillOut:
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found.")
    return SkillOut.model_validate(skill)


def update_skill(db: Session, skill_id: int, data: SkillUpdate) -> SkillOut:
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found.")

    if data.name is not None:
        # Check for name conflict with another skill
        existing = db.query(Skill).filter(Skill.name == data.name, Skill.id != skill_id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A skill named '{data.name}' already exists.",
            )
        skill.name = data.name

    if data.category is not None:
        skill.category = data.category

    db.commit()
    db.refresh(skill)
    return SkillOut.model_validate(skill)


def delete_skill(db: Session, skill_id: int) -> None:
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found.")

    # Check if skill is in use — give a clear error rather than a DB FK error
    if skill.job_skills or skill.candidate_skills:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Cannot delete skill: it is referenced by existing jobs or candidate profiles. "
                "Remove those references first."
            ),
        )

    db.delete(skill)
    db.commit()
