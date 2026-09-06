"""
User Management Router (Admin Only)
===================================

Endpoints:
- POST /api/users          (Admin creates HR or Recruiter accounts)
- GET  /api/users          (Admin lists all users, optional role_id filter)
- GET  /api/users/stats    (Admin dashboard overview statistics)
- GET  /api/users/{id}     (Admin gets single user details)
- PUT  /api/users/{id}     (Admin updates user active status or name)
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, status, Query 
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.dependencies import require_admin, require_hr_or_admin
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, UserOut
from app.services import user_service

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.post(
    "",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create HR or Recruiter user",
    description="Admin creates a new privileged account (HR or Recruiter). Role must be 2 (HR) or 3 (Recruiter)."
)
def create_user(
    data: UserCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    return user_service.create_user(db, data)


@router.get(
    "/stats",
    status_code=status.HTTP_200_OK,
    summary="Admin dashboard statistics",
    description="Returns aggregate counts of total users, active users, HRs, recruiters, candidates, and skills."
)
def get_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    return user_service.get_dashboard_stats(db)


@router.get(
    "/recruiters",
    response_model=List[UserOut],
    status_code=status.HTTP_200_OK,
    summary="List active recruiters (HR & Admin)",
    description="Returns all active recruiters available for assignment to job requisitions."
)
def list_recruiters(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    # Role ID 3 = Recruiter
    return user_service.list_users(db, role_id=3)


@router.get(
    "",
    response_model=List[UserOut],
    status_code=status.HTTP_200_OK,
    summary="List all users",
    description="Returns all registered users with optional role filtering. HR and Admin accessible."
)
def list_users(
    role_id: Optional[int] = Query(None, description="Filter users by role ID (1: Admin, 2: HR, 3: Recruiter, 4: Candidate)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin)
):
    # If caller is HR and hasn't specified role_id, provide recruiters by default
    if current_user.role.name == "HR" and role_id is None:
        role_id = 3
    return user_service.list_users(db, role_id=role_id)


@router.get(
    "/{user_id}",
    response_model=UserOut,
    status_code=status.HTTP_200_OK,
    summary="Get user by ID"
)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    return user_service.get_user(db, user_id)


@router.put(
    "/{user_id}",
    response_model=UserOut,
    status_code=status.HTTP_200_OK,
    summary="Update user",
    description="Update user name or toggle is_active status (activate/deactivate)."
)
def update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    return user_service.update_user(db, user_id, data)
