"""
Matching Engine Service
=======================

Implements the candidate-job matching algorithm and pipeline lifecycle for SkillAlign.

Roles & Permissions Workflow:
-----------------------------
1. Recruiter triggers match -> status = 'matched' (with recruiter_id set to recruiter's user id).
2. Recruiter reviews candidate resume -> updates status to 'screened' or 'rejected'.
3. HR views 'screened' candidates -> updates status to 'approved_by_hr' or 'rejected'.
4. HR schedules interview -> creates Interview record, updates status to 'interview_scheduled'.
5. Final decisions -> 'offer', 'hired', or 'rejected'.
"""

from typing import List, Dict, Any, Optional
from decimal import Decimal
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.job import Job
from app.models.candidate import Candidate
from app.models.match_result import MatchResult, PIPELINE_STATUSES
from app.models.candidate_scorecard import CandidateScorecard
from app.models.interview import Interview
from app.models.user import User
from app.schemas.matching import MatchResultOut, MatchRunResponse, SkillMatchDetail, ScorecardCreate, ScorecardOut
from app.schemas.interview import InterviewOut


PROFICIENCY_MAP: Dict[str, float] = {
    "Beginner": 0.40,
    "Intermediate": 0.70,
    "Expert": 1.00,
}


def _build_match_result_out(record: MatchResult) -> MatchResultOut:
    """Helper to construct MatchResultOut with computed fields and relationships."""
    meets_exp = True
    if record.job and record.candidate:
        meets_exp = float(record.candidate.total_experience_years or 0) >= float(record.job.min_experience_years or 0)

    item = MatchResultOut.model_validate(record)
    item.meets_experience = meets_exp
    return item


def calculate_candidate_match_score(job: Job, candidate: Candidate) -> tuple[float, list[dict], bool]:
    """
    Calculate the overall score for a candidate against a job.
    
    Returns:
        (overall_score, skill_breakdown, meets_experience)
    """
    cand_exp = float(candidate.total_experience_years or 0)
    job_exp = float(job.min_experience_years or 0)
    meets_experience = cand_exp >= job_exp

    if not job.job_skills:
        return 0.0, [], meets_experience

    # Map candidate skills for O(1) lookup
    candidate_skills_dict = {
        cs.skill_id: (cs.proficiency_level, float(cs.years_experience or 0))
        for cs in candidate.skills
    }

    total_weight = 0.0
    weighted_score_sum = 0.0
    breakdown = []

    for js in job.job_skills:
        weight = float(js.weight)
        total_weight += weight

        candidate_skill_info = candidate_skills_dict.get(js.skill_id)
        if candidate_skill_info:
            prof_level, years_exp = candidate_skill_info
            score_factor = PROFICIENCY_MAP.get(prof_level, 0.0)
        else:
            prof_level = None
            years_exp = None
            score_factor = 0.0

        weighted_score_sum += score_factor * weight

        breakdown.append({
            "skill_id": js.skill_id,
            "skill_name": js.skill.name if js.skill else "Unknown",
            "requirement_type": js.requirement_type,
            "weight": weight,
            "candidate_proficiency": prof_level,
            "candidate_years": years_exp,
            "skill_score": round(score_factor, 2)
        })

    if total_weight > 0:
        overall_score = round((weighted_score_sum / total_weight) * 100, 2)
    else:
        overall_score = 0.0

    return overall_score, breakdown, meets_experience


def run_job_matching(db: Session, job_id: int, recruiter_user: User) -> MatchRunResponse:
    """
    Executes the matching engine for all candidate profiles against the specified job.
    Accessible by Recruiter (or Admin). Sets recruiter_id to the recruiter's ID and status to 'matched'.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with id {job_id} not found."
        )

    # If user is Recruiter, check ownership
    if recruiter_user.role.name == "Recruiter" and job.created_by != recruiter_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Recruiters can only run matching for their own jobs."
        )

    candidates = db.query(Candidate).all()
    if not candidates:
        return MatchRunResponse(job_id=job_id, total_candidates=0, results=[])

    match_results_out: List[MatchResultOut] = []

    for cand in candidates:
        overall_score, breakdown, meets_experience = calculate_candidate_match_score(job, cand)

        existing_result = db.query(MatchResult).filter(
            MatchResult.job_id == job.id,
            MatchResult.candidate_id == cand.id
        ).first()

        if existing_result:
            existing_result.overall_score = Decimal(str(overall_score))
            existing_result.recruiter_id = recruiter_user.id
            existing_result.matched_by = recruiter_user.id
            existing_result.status = "matched"
            db_record = existing_result
        else:
            db_record = MatchResult(
                job_id=job.id,
                candidate_id=cand.id,
                recruiter_id=recruiter_user.id,
                matched_by=recruiter_user.id,
                overall_score=Decimal(str(overall_score)),
                status="matched"
            )
            db.add(db_record)

        db.flush()
        db.refresh(db_record)

        result_out = _build_match_result_out(db_record)
        match_results_out.append(result_out)

    db.commit()

    # Sort candidates by overall score descending
    match_results_out.sort(key=lambda r: r.overall_score, reverse=True)

    return MatchRunResponse(
        job_id=job_id,
        total_candidates=len(match_results_out),
        results=match_results_out
    )


def get_job_matches(db: Session, job_id: int, status_filter: Optional[str] = None) -> List[MatchResultOut]:
    """Retrieve saved match results for a job with optional status filtering."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with id {job_id} not found."
        )

    query = db.query(MatchResult).filter(MatchResult.job_id == job_id)
    if status_filter:
        query = query.filter(MatchResult.status == status_filter)

    results = query.order_by(MatchResult.overall_score.desc()).all()
    return [_build_match_result_out(r) for r in results]


def get_screened_matches(db: Session, job_id: Optional[int] = None) -> List[MatchResultOut]:
    """Retrieve all candidates screened by recruiters (ready for HR strategic review & approval)."""
    query = db.query(MatchResult).filter(MatchResult.status.in_(["screened", "approved_by_hr", "interview_scheduled"]))
    if job_id:
        query = query.filter(MatchResult.job_id == job_id)

    results = query.order_by(MatchResult.overall_score.desc()).all()
    return [_build_match_result_out(r) for r in results]


def get_match_result_by_id(db: Session, match_id: int) -> MatchResultOut:
    """Fetch single match result by ID."""
    match_record = db.query(MatchResult).filter(MatchResult.id == match_id).first()
    if not match_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Match result with id {match_id} not found."
        )
    return _build_match_result_out(match_record)


def update_match_status(db: Session, match_id: int, new_status: str, user: User) -> MatchResultOut:
    """
    Update match result pipeline status.

    Role Permissions:
    - Recruiter: Can transition candidates for jobs they created to 'screened' or 'rejected'.
    - HR: Can transition candidates from 'screened' to 'approved_by_hr', 'interview_scheduled', 'offer', 'hired', or 'rejected'.
    - Admin: Full pipeline update privileges.
    """
    match_record = db.query(MatchResult).filter(MatchResult.id == match_id).first()
    if not match_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Match result with id {match_id} not found."
        )

    if new_status not in PIPELINE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status: {new_status}. Must be one of: {', '.join(sorted(PIPELINE_STATUSES))}."
        )

    user_role = user.role.name

    if user_role == "Recruiter":
        # Recruiter can only manage their own job's candidates
        if match_record.job.created_by != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Recruiter can only manage candidates for jobs they created."
            )
        # Recruiter can screen or reject initial matches
        if new_status not in ("screened", "rejected", "matched"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Recruiter can only update candidate status to 'screened' or 'rejected'."
            )
    elif user_role == "HR":
        # HR strategic approval / rejection / interviews / offers
        if new_status not in ("approved_by_hr", "rejected", "interview_scheduled", "technical_interview", "hr_interview", "offer", "hired", "screened", "shortlisted"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="HR can only approve candidates ('approved_by_hr'), schedule interviews, make offers, hire, or reject."
            )
    elif user_role != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized to update match status."
        )

    match_record.status = new_status
    db.commit()
    db.refresh(match_record)

    return _build_match_result_out(match_record)


# ── Scorecard CRUD ────────────────────────────────────────────────────────────

def create_scorecard(
    db: Session, match_id: int, data: ScorecardCreate, reviewer: User
) -> ScorecardOut:
    """Add a new feedback scorecard for a match result."""
    match_record = db.query(MatchResult).filter(MatchResult.id == match_id).first()
    if not match_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Match result with id {match_id} not found."
        )

    scorecard = CandidateScorecard(
        match_result_id=match_id,
        reviewer_id=reviewer.id,
        communication_score=data.communication_score,
        technical_score=data.technical_score,
        overall_impression=data.overall_impression,
    )
    db.add(scorecard)
    db.commit()
    db.refresh(scorecard)
    return ScorecardOut.model_validate(scorecard)


def get_scorecards(db: Session, match_id: int) -> List[ScorecardOut]:
    """Retrieve all scorecards for a specific match result."""
    match_record = db.query(MatchResult).filter(MatchResult.id == match_id).first()
    if not match_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Match result with id {match_id} not found."
        )

    scorecards = (
        db.query(CandidateScorecard)
        .filter(CandidateScorecard.match_result_id == match_id)
        .order_by(CandidateScorecard.created_at.desc())
        .all()
    )
    return [ScorecardOut.model_validate(s) for s in scorecards]
