"""
Skill Master Router
===================

Endpoints:
- POST   /api/skills       (Admin: Create skill)
- GET    /api/skills       (Authenticated: List all skills, optional category filter)
- GET    /api/skills/{id}  (Authenticated: Get single skill)
- PUT    /api/skills/{id}  (Admin: Update skill)
- DELETE /api/skills/{id}  (Admin: Delete skill)
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, status, Query, Response
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.dependencies import get_current_user, require_admin
from app.models.user import User
from app.schemas.skill import SkillCreate, SkillUpdate, SkillOut
from app.services import skill_service

router = APIRouter(prefix="/api/skills", tags=["Skills"])


@router.post(
    "",
    response_model=SkillOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create skill (Admin only)"
)
def create_skill(
    data: SkillCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    return skill_service.create_skill(db, data)


@router.get(
    "",
    response_model=List[SkillOut],
    status_code=status.HTTP_200_OK,
    summary="List all skills (All authenticated roles)"
)
def list_skills(
    category: Optional[str] = Query(None, description="Filter skills by category"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return skill_service.list_skills(db, category=category)


@router.get(
    "/{skill_id}",
    response_model=SkillOut,
    status_code=status.HTTP_200_OK,
    summary="Get skill by ID (All authenticated roles)"
)
def get_skill(
    skill_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return skill_service.get_skill(db, skill_id)


@router.put(
    "/{skill_id}",
    response_model=SkillOut,
    status_code=status.HTTP_200_OK,
    summary="Update skill (Admin only)"
)
def update_skill(
    skill_id: int,
    data: SkillUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    return skill_service.update_skill(db, skill_id, data)


@router.delete(
    "/{skill_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete skill (Admin only)"
)
def delete_skill(
    skill_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    skill_service.delete_skill(db, skill_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
