"""
Match Results Router
====================

Direct REST endpoint alias for Match Results:
- GET   /api/match_results/{id}         (Get single match result)
- PATCH /api/match_results/{id}/status  (Update pipeline status with strict role checks)
- GET   /api/match_results/screened     (List screened candidates for HR)
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.dependencies import (
    require_hr_or_recruiter,
    require_admin_or_hr,
)
from app.models.user import User
from app.schemas.matching import (
    MatchResultOut, MatchStatusUpdate
)
from app.services import matching_service

router = APIRouter(prefix="/api/match_results", tags=["Match Results"])


@router.get(
    "/screened",
    response_model=List[MatchResultOut],
    status_code=status.HTTP_200_OK,
    summary="List screened candidates for HR"
)
def list_screened(
    job_id: Optional[int] = Query(None, description="Optional job ID filter"),
    db: Session = Depends(get_db),
    user: User = Depends(require_admin_or_hr)
):
    return matching_service.get_screened_matches(db, job_id=job_id)


@router.get(
    "/{match_id}",
    response_model=MatchResultOut,
    status_code=status.HTTP_200_OK,
    summary="Get match result by ID"
)
def get_match_result(
    match_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_hr_or_recruiter)
):
    return matching_service.get_match_result_by_id(db, match_id)


@router.patch(
    "/{match_id}/status",
    response_model=MatchResultOut,
    status_code=status.HTTP_200_OK,
    summary="Update candidate pipeline status (Role-checked)"
)
def update_status(
    match_id: int,
    data: MatchStatusUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_hr_or_recruiter)
):
    return matching_service.update_match_status(db, match_id, data.status, user=user)
