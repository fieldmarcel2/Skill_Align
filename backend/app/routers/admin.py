"""
Admin Management Router
=======================

Endpoints:
- GET   /api/admin/users              (Admin: Paginated + filtered user list)
- PATCH /api/admin/users/{id}/toggle-status (Admin: Quick activate/deactivate)
"""

from typing import Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.dependencies import require_admin
from app.models.user import User
from app.schemas.user import PaginatedUsersResponse, UserOut
from app.services import user_service

router = APIRouter(prefix="/api/admin", tags=["Admin Management"])


@router.get(
    "/users",
    response_model=PaginatedUsersResponse,
    status_code=status.HTTP_200_OK,
    summary="List all users with pagination, search, and filters (Admin only)",
    description=(
        "Returns a paginated list of all users. Supports server-side filtering by role, "
        "status (active/deactivated), and search by name or email. "
        "Response includes pagination metadata."
    )
)
def list_users_paginated(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(20, ge=1, le=100, description="Results per page (max 100)"),
    search: Optional[str] = Query(None, description="Search by name or email (partial match)"),
    role: Optional[str] = Query(None, description="Filter by role name: Admin, HR, Recruiter, Candidate"),
    user_status: Optional[str] = Query(None, alias="status", description="Filter by status: active, deactivated"),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    return user_service.list_users_paginated(
        db,
        page=page,
        page_size=page_size,
        search=search,
        role=role,
        user_status=user_status,
    )


@router.patch(
    "/users/{user_id}/toggle-status",
    response_model=UserOut,
    status_code=status.HTTP_200_OK,
    summary="Toggle user active/deactivated status (Admin only)",
    description="Quickly activates or deactivates a user account. Admin accounts cannot be toggled."
)
def toggle_user_status(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    return user_service.toggle_user_status(db, user_id)
