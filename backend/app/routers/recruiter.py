"""
Recruiter Operations Router
===========================
Provides operational endpoints for recruiters:
- Dashboard statistics across assigned jobs
- Assigned jobs list with candidate stats and recruiter roles
- Filtered candidate pool per job or globally across assigned jobs
- Comprehensive candidate review context (evidence, self-declared skills, parsed resume, communication)
- Race-condition safe candidate claiming ("Assign to Me") and unassignment
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status as http_status
from sqlalchemy import or_, and_
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.dependencies import get_current_user, require_recruiter, require_hr_or_recruiter
from app.models.user import User
from app.models.job import Job
from app.models.candidate import Candidate
from app.models.match_result import MatchResult
from app.models.job_recruiter_assignment import JobRecruiterAssignment
from app.models.candidate_recruiter_assignment import CandidateRecruiterAssignment
from app.models.recruitment_task import RecruitmentTask
from app.schemas.matching import MatchResultOut
from app.schemas.recruiter_assignment import (
    RecruiterDashboardStats,
    RecruiterJobItem,
    CandidateRecruiterAssignmentIn,
    CandidateRecruiterAssignmentOut,
)
from app.services import (
    recruiter_assignment_service,
    candidate_assignment_service,
    matching_service,
)

router = APIRouter(prefix="/api/recruiter", tags=["Recruiter Operations"])
claims_router = APIRouter(prefix="/api/jobs", tags=["Candidate Claiming"])


# ─────────────────────────────────────────────────────────────────────────────
# Recruiter Dashboard & Assigned Jobs
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/dashboard-stats",
    response_model=RecruiterDashboardStats,
    summary="Get recruiter dashboard overview metrics",
)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter),
):
    assigned_job_ids = recruiter_assignment_service.get_recruiter_assigned_job_ids(db, current_user.id)
    if not assigned_job_ids:
        return RecruiterDashboardStats(
            assigned_jobs_count=0,
            total_candidates_count=0,
            pending_review_count=0,
            screened_count=0,
            pending_tasks_count=0,
        )

    total_candidates = (
        db.query(MatchResult)
        .filter(MatchResult.job_id.in_(assigned_job_ids))
        .count()
    )

    pending_review = (
        db.query(MatchResult)
        .filter(
            MatchResult.job_id.in_(assigned_job_ids),
            MatchResult.status == "matched",
        )
        .count()
    )

    screened_count = (
        db.query(MatchResult)
        .filter(
            MatchResult.job_id.in_(assigned_job_ids),
            MatchResult.status.in_([
                "screened",
                "approved_by_hr",
                "interview_scheduled",
                "shortlisted",
                "technical_interview",
                "hr_interview",
                "offer",
                "hired",
            ]),
        )
        .count()
    )

    pending_tasks = (
        db.query(RecruitmentTask)
        .filter(
            RecruitmentTask.assigned_to == current_user.id,
            RecruitmentTask.status.in_(["OPEN", "IN_PROGRESS"]),
        )
        .count()
    )

    return RecruiterDashboardStats(
        assigned_jobs_count=len(assigned_job_ids),
        total_candidates_count=total_candidates,
        pending_review_count=pending_review,
        screened_count=screened_count,
        pending_tasks_count=pending_tasks,
    )


@router.get(
    "/jobs",
    response_model=List[RecruiterJobItem],
    summary="List all jobs actively assigned to the current recruiter",
)
def get_recruiter_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter),
):
    assignments = (
        db.query(JobRecruiterAssignment)
        .filter(
            JobRecruiterAssignment.recruiter_id == current_user.id,
            JobRecruiterAssignment.status == "active",
        )
        .all()
    )

    items = []
    for asgn in assignments:
        job = asgn.job
        if not job:
            continue

        total_candidates = db.query(MatchResult).filter(MatchResult.job_id == job.id).count()
        pending_review = (
            db.query(MatchResult)
            .filter(MatchResult.job_id == job.id, MatchResult.status == "matched")
            .count()
        )
        assigned_to_me = (
            db.query(CandidateRecruiterAssignment)
            .filter(
                CandidateRecruiterAssignment.job_id == job.id,
                CandidateRecruiterAssignment.recruiter_id == current_user.id,
                CandidateRecruiterAssignment.status == "active",
            )
            .count()
        )

        items.append(
            RecruiterJobItem(
                id=job.id,
                title=job.title,
                status=job.status,
                min_experience_years=job.min_experience_years,
                work_mode=job.work_mode,
                created_at=job.created_at,
                assignment_role=asgn.assignment_role,
                total_candidates=total_candidates,
                pending_review=pending_review,
                assigned_to_me=assigned_to_me,
            )
        )

    items.sort(key=lambda x: x.created_at, reverse=True)
    return items


# ─────────────────────────────────────────────────────────────────────────────
# Recruiter Candidate Queue Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/jobs/{job_id}/candidates",
    response_model=List[MatchResultOut],
    summary="Get candidate match results for a specific assigned job",
)
def get_job_candidates(
    job_id: int,
    search: Optional[str] = Query(None, description="Search by candidate name or city"),
    min_score: Optional[float] = Query(None, description="Filter by minimum match score"),
    status: Optional[str] = Query(None, description="Filter by candidate pipeline status"),
    assigned_to_me: Optional[bool] = Query(False, description="Filter to candidates claimed by requesting recruiter"),
    assignment_status: Optional[str] = Query(None, description="'unassigned' or 'claimed'"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_recruiter),
):
    if current_user.role.name == "Recruiter":
        if not recruiter_assignment_service.is_recruiter_assigned(db, job_id, current_user.id):
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="Access denied: You are not assigned to this job requisition.",
            )

    query = db.query(MatchResult).filter(MatchResult.job_id == job_id)

    if search:
        query = query.join(Candidate, MatchResult.candidate_id == Candidate.id).filter(
            or_(
                Candidate.full_name.ilike(f"%{search}%"),
                Candidate.city.ilike(f"%{search}%"),
            )
        )

    if min_score is not None:
        query = query.filter(MatchResult.overall_score >= min_score)

    if status:
        query = query.filter(MatchResult.status == status)

    if assigned_to_me:
        query = query.join(
            CandidateRecruiterAssignment,
            and_(
                CandidateRecruiterAssignment.job_id == MatchResult.job_id,
                CandidateRecruiterAssignment.candidate_id == MatchResult.candidate_id,
                CandidateRecruiterAssignment.recruiter_id == current_user.id,
                CandidateRecruiterAssignment.status == "active",
            ),
        )
    elif assignment_status == "unassigned":
        # Left join and filter where assignment is null or inactive
        query = query.outerjoin(
            CandidateRecruiterAssignment,
            and_(
                CandidateRecruiterAssignment.job_id == MatchResult.job_id,
                CandidateRecruiterAssignment.candidate_id == MatchResult.candidate_id,
                CandidateRecruiterAssignment.status == "active",
            ),
        ).filter(CandidateRecruiterAssignment.id.is_(None))
    elif assignment_status == "claimed":
        query = query.join(
            CandidateRecruiterAssignment,
            and_(
                CandidateRecruiterAssignment.job_id == MatchResult.job_id,
                CandidateRecruiterAssignment.candidate_id == MatchResult.candidate_id,
                CandidateRecruiterAssignment.status == "active",
            ),
        )

    matches = (
        query.order_by(MatchResult.overall_score.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return [matching_service._build_match_result_out(m, db=db) for m in matches]


@router.get(
    "/candidates",
    response_model=List[MatchResultOut],
    summary="Global candidate search across all assigned jobs for the recruiter",
)
def get_all_assigned_candidates(
    job_id: Optional[int] = Query(None, description="Optional filter by specific job"),
    search: Optional[str] = Query(None, description="Search by candidate name or city"),
    min_score: Optional[float] = Query(None, description="Filter by minimum match score"),
    status: Optional[str] = Query(None, description="Filter by pipeline status"),
    assigned_to_me: Optional[bool] = Query(False, description="Filter to claimed candidates"),
    assignment_status: Optional[str] = Query(None, description="'unassigned' or 'claimed'"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter),
):
    assigned_job_ids = recruiter_assignment_service.get_recruiter_assigned_job_ids(db, current_user.id)
    if job_id is not None:
        # If specific job requested, verify recruiter is assigned to it (unless Admin/HR)
        if current_user.role.name == "Recruiter" and (not assigned_job_ids or job_id not in assigned_job_ids):
            return []
        target_job_ids = [job_id]
    elif assigned_job_ids:
        target_job_ids = assigned_job_ids
    else:
        # Recruiter has no assigned jobs — strictly return empty pool for multi-recruiter isolation
        return []

    query = db.query(MatchResult).filter(MatchResult.job_id.in_(target_job_ids))

    if search:
        query = query.join(Candidate, MatchResult.candidate_id == Candidate.id).filter(
            or_(
                Candidate.full_name.ilike(f"%{search}%"),
                Candidate.city.ilike(f"%{search}%"),
            )
        )

    if min_score is not None:
        query = query.filter(MatchResult.overall_score >= min_score)

    if status:
        query = query.filter(MatchResult.status == status)

    if assigned_to_me:
        query = query.join(
            CandidateRecruiterAssignment,
            and_(
                CandidateRecruiterAssignment.job_id == MatchResult.job_id,
                CandidateRecruiterAssignment.candidate_id == MatchResult.candidate_id,
                CandidateRecruiterAssignment.recruiter_id == current_user.id,
                CandidateRecruiterAssignment.status == "active",
            ),
        )
    elif assignment_status == "unassigned":
        query = query.outerjoin(
            CandidateRecruiterAssignment,
            and_(
                CandidateRecruiterAssignment.job_id == MatchResult.job_id,
                CandidateRecruiterAssignment.candidate_id == MatchResult.candidate_id,
                CandidateRecruiterAssignment.status == "active",
            ),
        ).filter(CandidateRecruiterAssignment.id.is_(None))
    elif assignment_status == "claimed":
        query = query.join(
            CandidateRecruiterAssignment,
            and_(
                CandidateRecruiterAssignment.job_id == MatchResult.job_id,
                CandidateRecruiterAssignment.candidate_id == MatchResult.candidate_id,
                CandidateRecruiterAssignment.status == "active",
            ),
        )

    matches = (
        query.order_by(MatchResult.overall_score.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return [matching_service._build_match_result_out(m, db=db) for m in matches]


@router.get(
    "/jobs/{job_id}/candidates/{candidate_id}",
    response_model=MatchResultOut,
    summary="Get full candidate review profile and match breakdown for a job",
)
def get_candidate_detail_for_job(
    job_id: int,
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_recruiter),
):
    if current_user.role.name == "Recruiter":
        if not recruiter_assignment_service.is_recruiter_assigned(db, job_id, current_user.id):
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="Access denied: You are not assigned to this job requisition.",
            )

    match = (
        db.query(MatchResult)
        .filter(MatchResult.job_id == job_id, MatchResult.candidate_id == candidate_id)
        .first()
    )
    if not match:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=f"Candidate {candidate_id} has no match result for job {job_id}.",
        )

    return matching_service._build_match_result_out(match, db=db)


# ─────────────────────────────────────────────────────────────────────────────
# Candidate Claiming & Assignment Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@claims_router.post(
    "/{job_id}/candidates/{candidate_id}/claim",
    response_model=CandidateRecruiterAssignmentOut,
    summary="Claim candidate for screening ('Assign to Me')",
)
@router.post(
    "/jobs/{job_id}/candidates/{candidate_id}/claim",
    response_model=CandidateRecruiterAssignmentOut,
    summary="Claim candidate for screening ('Assign to Me')",
)
def claim_candidate_endpoint(
    job_id: int,
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter),
):
    return candidate_assignment_service.claim_candidate(
        db=db,
        job_id=job_id,
        candidate_id=candidate_id,
        recruiter_user=current_user,
    )


@claims_router.post(
    "/{job_id}/candidates/{candidate_id}/assign",
    response_model=CandidateRecruiterAssignmentOut,
    summary="Assign candidate to a recruiter (HR or Primary Recruiter)",
)
@router.post(
    "/jobs/{job_id}/candidates/{candidate_id}/assign",
    response_model=CandidateRecruiterAssignmentOut,
    summary="Assign candidate to a recruiter (HR or Primary Recruiter)",
)
def assign_candidate_endpoint(
    job_id: int,
    candidate_id: int,
    data: CandidateRecruiterAssignmentIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_recruiter),
):
    return candidate_assignment_service.assign_candidate_to_recruiter(
        db=db,
        job_id=job_id,
        candidate_id=candidate_id,
        recruiter_id=data.recruiter_id,
        assigned_by_user=current_user,
    )


@claims_router.delete(
    "/{job_id}/candidates/{candidate_id}/assignment",
    status_code=http_status.HTTP_204_NO_CONTENT,
    summary="Unassign candidate from current recruiter",
)
@router.delete(
    "/jobs/{job_id}/candidates/{candidate_id}/assignment",
    status_code=http_status.HTTP_204_NO_CONTENT,
    summary="Unassign candidate from current recruiter",
)
def unassign_candidate_endpoint(
    job_id: int,
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_recruiter),
):
    candidate_assignment_service.unassign_candidate(
        db=db,
        job_id=job_id,
        candidate_id=candidate_id,
        requesting_user=current_user,
    )
