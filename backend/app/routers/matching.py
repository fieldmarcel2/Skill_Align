"""
Matching Engine Router
======================

ARCHITECTURE v2.0:
  Matching is primarily automatic (triggered by resume upload or job publish).
  This router provides:
  - Manual re-run (queued, non-blocking) for Recruiter/HR oversight
  - Match result retrieval and pipeline management
  - Status polling for async matching state

Endpoints:
- POST  /api/matching/jobs/{job_id}/run       (Recruiter/HR/Admin: Queue re-matching — async)
- GET   /api/matching/jobs/{job_id}/status    (Recruiter/HR/Admin: Matching processing status)
- GET   /api/matching/jobs/{job_id}           (Recruiter & HR: View ranked match results)
- GET   /api/matching/screened                (HR: View candidates screened by Recruiter)
- PATCH /api/matching/{match_id}/status       (Recruiter: screen/reject; HR: approve/reject/interview)
- GET   /api/matching/shortlists              (Recruiter & HR: View active pipeline candidates)
- POST  /api/matching/{match_id}/scorecard    (HR & Recruiter: Add feedback scorecard)
- GET   /api/matching/{match_id}/scorecards   (HR & Recruiter: Get all scorecards for a match)
- GET   /api/matching/{match_id}/ai-analysis  (HR & Recruiter: Gemini AI semantic analysis)
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
from app.models.job import Job
from app.schemas.matching import (
    MatchRunResponse, MatchResultOut, MatchStatusUpdate,
    ScorecardCreate, ScorecardOut,
)
from app.services import matching_service

router = APIRouter(prefix="/api/matching", tags=["Matching Engine"])


@router.post(
    "/jobs/{job_id}/run",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Queue matching engine for a job (Recruiter/HR/Admin)",
    description=(
        "Queues an async background matching task. Returns immediately with task status. "
        "Normal matching is triggered automatically when HR publishes/updates a job or "
        "a candidate uploads a resume. Use this endpoint for manual re-evaluation. "
        "Recruiter can trigger re-matching for any active job."
    )
)
def run_matching(
    job_id: int,
    sync: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_recruiter),
):
    """Queue async background matching — or run synchronously if sync=True."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with id {job_id} not found."
        )

    if sync:
        result = matching_service.run_job_matching(db, job_id, recruiter_user=current_user)
        return {
            "status": "completed",
            "message": "Matching completed synchronously.",
            "job_id": job_id,
            "task_id": None,
            "total_candidates": result.total_candidates,
            "results": [r.model_dump() if hasattr(r, "model_dump") else r for r in result.results],
        }

    task_id = None
    try:
        from app.celery_app import celery_app
        insp = celery_app.control.inspect(timeout=0.2)
        active_workers = insp.ping() if insp else None
        if active_workers:
            from app.tasks.matching_tasks import run_job_matching_task
            task = run_job_matching_task.apply_async(
                args=[job_id, f"manual_{current_user.role.name.lower()}"],
                queue="matching",
            )
            task_id = task.id
            return {
                "status": "queued",
                "message": "Matching has been queued and will process in the background.",
                "job_id": job_id,
                "task_id": task_id,
            }
        else:
            # No worker running — execute immediately
            result = matching_service.run_job_matching(db, job_id, recruiter_user=current_user)
            return {
                "status": "completed",
                "message": "Matching completed immediately.",
                "job_id": job_id,
                "task_id": "sync-completed",
                "total_candidates": result.total_candidates,
            }
    except Exception as e:
        import logging
        logging.getLogger("skillalign.matching_router").warning(
            f"Async queue error, running immediate fallback: {e}"
        )
        result = matching_service.run_job_matching(db, job_id, recruiter_user=current_user)
        return {
            "status": "completed",
            "message": "Matching completed synchronously.",
            "job_id": job_id,
            "task_id": None,
            "total_candidates": result.total_candidates,
        }


@router.get(
    "/jobs/{job_id}/status",
    status_code=status.HTTP_200_OK,
    summary="Get matching processing status for a job (Recruiter/HR/Admin)",
    description="Returns the current processing status of match results for a job.",
)
def get_matching_status(
    job_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_hr_or_recruiter),
):
    """Return summary of match processing_status values for a job."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with id {job_id} not found."
        )

    results = db.query(MatchResult).filter(MatchResult.job_id == job_id).all()
    total = len(results)
    if total == 0:
        overall = "not_run"
    else:
        statuses = {r.processing_status for r in results}
        if "processing" in statuses or "queued" in statuses:
            overall = "processing"
        elif "stale" in statuses:
            overall = "stale"
        elif "failed" in statuses:
            overall = "partial_failure"
        else:
            overall = "completed"

    return {
        "job_id": job_id,
        "job_title": job.title,
        "job_status": job.status,
        "matching_status": overall,
        "total_results": total,
        "status_breakdown": {
            "completed": sum(1 for r in results if r.processing_status == "completed"),
            "stale": sum(1 for r in results if r.processing_status == "stale"),
            "processing": sum(1 for r in results if r.processing_status in ("queued", "processing")),
            "failed": sum(1 for r in results if r.processing_status == "failed"),
        }
    }


@router.get(
    "/jobs/{job_id}",
    response_model=List[MatchResultOut],
    status_code=status.HTTP_200_OK,
    summary="Get ranked match results for a job (HR & Recruiter)",
)
def get_job_matches(
    job_id: int,
    status: Optional[str] = Query(None, description="Filter by pipeline status"),
    db: Session = Depends(get_db),
    user: User = Depends(require_hr_or_recruiter),
):
    return matching_service.get_job_matches(db, job_id, status_filter=status)


@router.get(
    "/screened",
    response_model=List[MatchResultOut],
    status_code=status.HTTP_200_OK,
    summary="List screened candidates ready for HR approval (HR)",
    description="Returns all candidate matches that have been screened by recruiters and awaiting HR review.",
)
def list_screened_candidates(
    job_id: Optional[int] = Query(None, description="Optional job ID filter"),
    db: Session = Depends(get_db),
    user: User = Depends(require_admin_or_hr),
):
    return matching_service.get_screened_matches(db, job_id=job_id)


@router.patch(
    "/{match_id}/status",
    response_model=MatchResultOut,
    status_code=status.HTTP_200_OK,
    summary="Update candidate pipeline status (Role-enforced)",
    description=(
        "Recruiter: can update to 'screened' or 'rejected'. "
        "HR: can approve, schedule interviews, make offers, hire, or reject. "
        "Recruiters are no longer restricted to jobs they created."
    )
)
def update_status(
    match_id: int,
    data: MatchStatusUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_hr_or_recruiter),
):
    return matching_service.update_match_status(db, match_id, data.status, user=user)


@router.get(
    "/shortlists",
    response_model=List[MatchResultOut],
    status_code=status.HTTP_200_OK,
    summary="List active pipeline candidates (Recruiter & HR)",
    description="Returns candidates advancing through the hiring pipeline.",
)
def list_shortlists(
    job_id: Optional[int] = Query(None, description="Optional job ID filter"),
    db: Session = Depends(get_db),
    user: User = Depends(require_hr_or_recruiter),
):
    active_statuses = [
        "screened", "approved_by_hr", "interview_scheduled", "shortlisted",
        "screening", "technical_interview", "hr_interview", "offer", "hired"
    ]
    query = db.query(MatchResult).filter(MatchResult.status.in_(active_statuses))

    if job_id:
        query = query.filter(MatchResult.job_id == job_id)

    # Note: Recruiters now see all shortlisted candidates (not filtered by job ownership)
    # since HR creates jobs, not Recruiters

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
    summary="Add feedback scorecard for a candidate (HR & Recruiter)",
)
def add_scorecard(
    match_id: int,
    data: ScorecardCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_hr_or_recruiter),
):
    return matching_service.create_scorecard(db, match_id, data, reviewer=user)


@router.get(
    "/{match_id}/scorecards",
    response_model=List[ScorecardOut],
    status_code=status.HTTP_200_OK,
    summary="Get all scorecards for a match result (HR & Recruiter)",
)
def get_scorecards(
    match_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_hr_or_recruiter),
):
    return matching_service.get_scorecards(db, match_id)


@router.get(
    "/{match_id}/ai-analysis",
    status_code=status.HTTP_200_OK,
    summary="Get Gemini AI candidate fit analysis & tailored interview questions (HR & Recruiter)",
)
def get_ai_analysis(
    match_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_hr_or_recruiter),
):
    return matching_service.get_match_ai_analysis(db, match_id)


@router.get(
    "/jobs/{job_id}/shortlist-candidates",
    status_code=status.HTTP_200_OK,
    summary="Get ranked candidates for shortlisting with filters (Recruiter/HR)",
)
def get_shortlist_candidates(
    job_id: int,
    min_score: float = Query(0.0, ge=0.0, le=100.0, description="Minimum overall match score (0-100)"),
    top_n: Optional[int] = Query(None, ge=1, le=100, description="Return top N candidates"),
    exclude_blacklisted: bool = Query(True, description="Exclude active blacklisted candidates"),
    db: Session = Depends(get_db),
    user: User = Depends(require_hr_or_recruiter),
):
    return matching_service.get_shortlist_candidates(
        db, job_id, min_score=min_score, top_n=top_n, exclude_blacklisted=exclude_blacklisted
    )

