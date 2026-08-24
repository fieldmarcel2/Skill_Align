"""
Matching Engine Service
=======================

Implements the candidate-job matching algorithm for SkillAlign.

Algorithm Specification:
------------------------
1. Proficiency Scores:
     Beginner      = 0.40
     Intermediate  = 0.70
     Expert        = 1.00
     Missing Skill = 0.00

2. Overall Score Formula:
     overall_score = ( SUM(skill_score * weight) / SUM(weight) ) * 100
     Result is rounded to 2 decimal places (0.00 to 100.00).

3. Experience Check:
     Compares candidate.total_experience_years >= job.min_experience_years.
     Result is surfaced in the match output (meets_experience).

4. Upsert Strategy:
     When matching is re-run for a job:
     - Updates existing MatchResult record if one exists for (job_id, candidate_id)
     - Or inserts a new MatchResult record if none exists.
     - Resets status to 'matched' for fresh evaluation.
"""

from typing import List, Dict, Any, Optional
from decimal import Decimal
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.job import Job
from app.models.candidate import Candidate
from app.models.match_result import MatchResult
from app.models.user import User
from app.schemas.matching import MatchResultOut, MatchRunResponse, SkillMatchDetail


PROFICIENCY_MAP: Dict[str, float] = {
    "Beginner": 0.40,
    "Intermediate": 0.70,
    "Expert": 1.00,
}


def calculate_candidate_match_score(job: Job, candidate: Candidate) -> tuple[float, list[dict], bool]:
    """
    Calculate the overall score for a candidate against a job.
    
    Returns:
        (overall_score, skill_breakdown, meets_experience)
    """
    if not job.job_skills:
        return 0.0, [], float(candidate.total_experience_years) >= float(job.min_experience_years)

    # Map candidate skills for O(1) lookup
    candidate_skills_dict = {
        cs.skill_id: (cs.proficiency_level, float(cs.years_experience))
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

    meets_experience = float(candidate.total_experience_years) >= float(job.min_experience_years)
    return overall_score, breakdown, meets_experience


def run_job_matching(db: Session, job_id: int, matched_by_user: User) -> MatchRunResponse:
    """
    Executes the matching engine for all candidate profiles against the specified job.
    Upserts match_results into the database and returns ranked candidates.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with id {job_id} not found."
        )

    candidates = db.query(Candidate).all()
    if not candidates:
        return MatchRunResponse(job_id=job_id, total_candidates=0, results=[])

    match_results_out: List[MatchResultOut] = []

    for cand in candidates:
        overall_score, breakdown, meets_experience = calculate_candidate_match_score(job, cand)

        # Upsert into match_results table
        existing_result = db.query(MatchResult).filter(
            MatchResult.job_id == job.id,
            MatchResult.candidate_id == cand.id
        ).first()

        if existing_result:
            existing_result.overall_score = Decimal(str(overall_score))
            existing_result.matched_by = matched_by_user.id
            existing_result.status = "matched"
            db_record = existing_result
        else:
            db_record = MatchResult(
                job_id=job.id,
                candidate_id=cand.id,
                matched_by=matched_by_user.id,
                overall_score=Decimal(str(overall_score)),
                status="matched"
            )
            db.add(db_record)

        db.flush()
        db.refresh(db_record)

        # Build response item
        result_out = MatchResultOut.model_validate(db_record)
        result_out.meets_experience = meets_experience
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
    output: List[MatchResultOut] = []
    for r in results:
        meets_exp = float(r.candidate.total_experience_years) >= float(job.min_experience_years)
        item = MatchResultOut.model_validate(r)
        item.meets_experience = meets_exp
        output.append(item)
    return output


def update_match_status(db: Session, match_id: int, new_status: str, user: User) -> MatchResultOut:
    """
    Update match result status:
    - HR can transition: matched -> shortlisted, matched -> rejected
    - Recruiter can transition: shortlisted -> rejected
    """
    match_record = db.query(MatchResult).filter(MatchResult.id == match_id).first()
    if not match_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Match result with id {match_id} not found."
        )

    user_role = user.role.name
    current_status = match_record.status

    if user_role == "HR":
        if new_status not in ["shortlisted", "rejected", "matched"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status transition for HR: {new_status}"
            )
    elif user_role == "Recruiter":
        # Recruiter can only reject candidates or review their own jobs
        if match_record.job.created_by != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Recruiter can only manage shortlists for jobs they created."
            )
        if new_status != "rejected" and new_status != "shortlisted":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Recruiter can only shortlist or reject candidates."
            )
    elif user_role != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized to update match status."
        )

    match_record.status = new_status
    db.commit()
    db.refresh(match_record)

    job = match_record.job
    meets_exp = float(match_record.candidate.total_experience_years) >= float(job.min_experience_years)
    item = MatchResultOut.model_validate(match_record)
    item.meets_experience = meets_exp
    return item
