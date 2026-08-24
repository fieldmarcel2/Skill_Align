"""
Matching Engine Router
======================

Endpoints:
- POST  /api/matching/jobs/{job_id}/run    (HR only: Run candidate matching engine)
- GET   /api/matching/jobs/{job_id}        (HR & Recruiter: View ranked match results)
- PATCH /api/matching/{match_id}/status    (HR: Shortlist/Reject; Recruiter: Reject)
- GET   /api/matching/shortlists           (Recruiter & HR: View all shortlisted candidates)
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.dependencies import require_hr, require_hr_or_recruiter
from app.models.user import User
from app.models.match_result import MatchResult
from app.schemas.matching import MatchRunResponse, MatchResultOut, MatchStatusUpdate
from app.services import matching_service

router = APIRouter(prefix="/api/matching", tags=["Matching Engine"])


@router.post(
    "/jobs/{job_id}/run",
    response_model=MatchRunResponse,
    status_code=status.HTTP_200_OK,
    summary="Run matching engine for a job (HR only)",
    description="Scores all candidates against job requirements using weighted proficiency matching, saves results to match_results, and returns ranked candidates."
)
def run_matching(
    job_id: int,
    db: Session = Depends(get_db),
    hr_user: User = Depends(require_hr)
):
    return matching_service.run_job_matching(db, job_id, matched_by_user=hr_user)


@router.get(
    "/jobs/{job_id}",
    response_model=List[MatchResultOut],
    status_code=status.HTTP_200_OK,
    summary="Get match results for a job (HR & Recruiter)"
)
def get_job_matches(
    job_id: int,
    status: Optional[str] = Query(None, description="Filter results by status (matched, shortlisted, rejected)"),
    db: Session = Depends(get_db),
    user: User = Depends(require_hr_or_recruiter)
):
    return matching_service.get_job_matches(db, job_id, status_filter=status)


@router.patch(
    "/{match_id}/status",
    response_model=MatchResultOut,
    status_code=status.HTTP_200_OK,
    summary="Update candidate match status (Shortlist or Reject)"
)
def update_status(
    match_id: int,
    data: MatchStatusUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_hr_or_recruiter)
):
    return matching_service.update_match_status(db, match_id, data.status, user=user)


@router.get(
    "/shortlists",
    response_model=List[MatchResultOut],
    status_code=status.HTTP_200_OK,
    summary="List all shortlisted candidates (Recruiter & HR)"
)
def list_shortlists(
    job_id: Optional[int] = Query(None, description="Optional job ID filter"),
    db: Session = Depends(get_db),
    user: User = Depends(require_hr_or_recruiter)
):
    query = db.query(MatchResult).filter(MatchResult.status == "shortlisted")
    if job_id:
        query = query.filter(MatchResult.job_id == job_id)
    
    # If recruiter, only show shortlists for jobs they created
    if user.role.name == "Recruiter":
        query = query.join(MatchResult.job).filter(MatchResult.job.has(created_by=user.id))

    results = query.order_by(MatchResult.overall_score.desc()).all()
    output = []
    for r in results:
        meets_exp = float(r.candidate.total_experience_years) >= float(r.job.min_experience_years)
        item = MatchResultOut.model_validate(r)
        item.meets_experience = meets_exp
        output.append(item)
    return output
