"""
Matching Engine Router
======================

Endpoints:
- POST  /api/matching/jobs/{job_id}/run    (Recruiter: Run candidate matching engine)
- GET   /api/matching/jobs/{job_id}        (Recruiter & HR: View ranked match results)
- GET   /api/matching/screened             (HR: View candidates screened by Recruiter)
- PATCH /api/matching/{match_id}/status    (Recruiter: screen/reject; HR: approve/reject/interview)
- GET   /api/matching/shortlists           (Recruiter & HR: View active pipeline candidates)
- POST  /api/matching/{match_id}/scorecard (HR & Recruiter: Add feedback scorecard)
- GET   /api/matching/{match_id}/scorecards(HR & Recruiter: Get all scorecards for a match)
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.dependencies import (
    get_current_user,
    require_recruiter,
    require_hr,
    require_hr_or_recruiter,
    require_admin_or_hr,
)
from app.models.user import User
from app.models.match_result import MatchResult
from app.schemas.matching import (
    MatchRunResponse, MatchResultOut, MatchStatusUpdate,
    ScorecardCreate, ScorecardOut
)
from app.services import matching_service

router = APIRouter(prefix="/api/matching", tags=["Matching Engine"])


@router.post(
    "/jobs/{job_id}/run",
    response_model=MatchRunResponse,
    status_code=status.HTTP_200_OK,
    summary="Run matching engine for a job (Recruiter)",
    description="Scores all candidates against job requirements using weighted proficiency matching, saves results to match_results setting recruiter_id, and returns ranked candidates."
)
def run_matching(
    job_id: int,
    db: Session = Depends(get_db),
    recruiter_user: User = Depends(require_hr_or_recruiter)
):
    # Recruiter (tactical) or HR/Admin can trigger match
    return matching_service.run_job_matching(db, job_id, recruiter_user=recruiter_user)


@router.get(
    "/jobs/{job_id}",
    response_model=List[MatchResultOut],
    status_code=status.HTTP_200_OK,
    summary="Get match results for a job (HR & Recruiter)"
)
def get_job_matches(
    job_id: int,
    status: Optional[str] = Query(None, description="Filter by pipeline status"),
    db: Session = Depends(get_db),
    user: User = Depends(require_hr_or_recruiter)
):
    return matching_service.get_job_matches(db, job_id, status_filter=status)


@router.get(
    "/screened",
    response_model=List[MatchResultOut],
    status_code=status.HTTP_200_OK,
    summary="List screened candidates ready for HR approval (HR)",
    description="Returns all candidate matches that have been screened by recruiters and are awaiting HR approval or interview scheduling."
)
def list_screened_candidates(
    job_id: Optional[int] = Query(None, description="Optional job ID filter"),
    db: Session = Depends(get_db),
    user: User = Depends(require_admin_or_hr)
):
    return matching_service.get_screened_matches(db, job_id=job_id)


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


@router.get(
    "/shortlists",
    response_model=List[MatchResultOut],
    status_code=status.HTTP_200_OK,
    summary="List active pipeline candidates (Recruiter & HR)",
    description="Returns candidates advancing through the hiring pipeline."
)
def list_shortlists(
    job_id: Optional[int] = Query(None, description="Optional job ID filter"),
    db: Session = Depends(get_db),
    user: User = Depends(require_hr_or_recruiter)
):
    active_statuses = ["screened", "approved_by_hr", "interview_scheduled", "shortlisted", "technical_interview", "hr_interview", "offer", "hired"]
    query = db.query(MatchResult).filter(MatchResult.status.in_(active_statuses))

    if job_id:
        query = query.filter(MatchResult.job_id == job_id)

    if user.role.name == "Recruiter":
        query = query.join(MatchResult.job).filter(MatchResult.job.has(created_by=user.id))

    results = query.order_by(MatchResult.overall_score.desc()).all()
    output = []
    for r in results:
        meets_exp = True
        if r.job and r.candidate:
            meets_exp = float(r.candidate.total_experience_years or 0) >= float(r.job.min_experience_years or 0)
        item = MatchResultOut.model_validate(r)
        item.meets_experience = meets_exp
        output.append(item)
    return output


# ── Scorecard Endpoints ───────────────────────────────────────────────────────

@router.post(
    "/{match_id}/scorecard",
    response_model=ScorecardOut,
    status_code=status.HTTP_201_CREATED,
    summary="Add feedback scorecard for a candidate (HR & Recruiter)"
)
def add_scorecard(
    match_id: int,
    data: ScorecardCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_hr_or_recruiter)
):
    return matching_service.create_scorecard(db, match_id, data, reviewer=user)


@router.get(
    "/{match_id}/scorecards",
    response_model=List[ScorecardOut],
    status_code=status.HTTP_200_OK,
    summary="Get all scorecards for a match result (HR & Recruiter)"
)
def get_scorecards(
    match_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_hr_or_recruiter)
):
    return matching_service.get_scorecards(db, match_id)
