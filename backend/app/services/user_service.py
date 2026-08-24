"""
User management service (Admin operations).

Business logic for creating HR/Recruiter accounts and managing user state.
"""

from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.core.security import hash_password
from app.models.user import User
from app.models.role import Role
from app.schemas.user import UserCreate, UserUpdate, UserOut


def create_user(db: Session, data: UserCreate) -> UserOut:
    """
    Admin creates an HR or Recruiter account.

    Additional server-side guard: even if schema validation passes,
    we double-check that the role is not Admin (1) or Candidate (4).
    """
    # Double-check role is HR or Recruiter (defence-in-depth beyond schema)
    if data.role_id not in (2, 3):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admins can only create HR or Recruiter accounts.",
        )

    # Verify the role exists
    role = db.query(Role).filter(Role.id == data.role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Role with id={data.role_id} does not exist.",
        )

    # Prevent duplicate email
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    user = User(
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
        role_id=data.role_id,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


def list_users(db: Session, role_id: Optional[int] = None) -> list[UserOut]:
    """List all users, optionally filtered by role."""
    query = db.query(User)
    if role_id is not None:
        query = query.filter(User.role_id == role_id)
    return [UserOut.model_validate(u) for u in query.order_by(User.id).all()]


def get_user(db: Session, user_id: int) -> UserOut:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return UserOut.model_validate(user)


def update_user(db: Session, user_id: int, data: UserUpdate) -> UserOut:
    """Partial update — only name and is_active can be changed."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    if data.name is not None:
        user.name = data.name.strip()
    if data.is_active is not None:
        user.is_active = data.is_active

    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


def get_dashboard_stats(db: Session) -> dict:
    """Admin dashboard summary statistics."""
    total = db.query(User).count()
    active = db.query(User).filter(User.is_active == True).count()  # noqa: E712
    hr_count = db.query(User).join(User.role).filter(User.role.has(name="HR")).count()
    recruiter_count = db.query(User).join(User.role).filter(User.role.has(name="Recruiter")).count()
    candidate_count = db.query(User).join(User.role).filter(User.role.has(name="Candidate")).count()

    from app.models.skill import Skill
    skill_count = db.query(Skill).count()

    return {
        "total_users": total,
        "active_users": active,
        "hr_users": hr_count,
        "recruiters": recruiter_count,
        "candidates": candidate_count,
        "total_skills": skill_count,
    }
