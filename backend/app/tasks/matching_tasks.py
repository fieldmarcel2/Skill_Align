"""
Matching Engine Celery Tasks
================================
Queue: matching

Two primary matching triggers as defined in the architecture:

TRIGGER A — run_candidate_matching_task(candidate_id)
  Fired when candidate uploads/updates resume.
  Two-stage: find ACTIVE jobs with skill overlap → detailed score → upsert.

TRIGGER B — run_job_matching_task(job_id)
  Fired when HR publishes a job or updates matching-relevant fields.
  Two-stage: find candidates with skill overlap → detailed score → upsert.
"""

import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import List

from celery.utils.log import get_task_logger
from sqlalchemy.orm import Session

from app.celery_app import celery_app
from app.database.session import SessionLocal
from app.models.candidate import Candidate
from app.models.candidate_skill import CandidateSkill
from app.models.job import Job
from app.models.job_skill import JobSkill
from app.models.match_result import MatchResult

logger = get_task_logger(__name__)

# Proficiency factor mapping — None = detected from resume, unknown proficiency
PROFICIENCY_MAP = {
    "Beginner": 0.40,
    "Intermediate": 0.70,
    "Expert": 1.00,
    None: 0.50,  # Resume-detected skill with unknown proficiency
}


def _calculate_match_score(job: Job, candidate: Candidate) -> tuple[float, list[dict], bool]:
    """
    Deterministic multi-criteria match scoring.
    Returns: (overall_score, skill_breakdown, meets_experience)
    """
    cand_exp = float(candidate.total_experience_years or 0)
    job_exp = float(job.min_experience_years or 0)
    meets_experience = cand_exp >= job_exp

    if not job.job_skills:
        return 0.0, [], meets_experience

    candidate_skills_dict = {
        cs.skill_id: cs
        for cs in candidate.skills
    }

    total_weight = 0.0
    weighted_score_sum = 0.0
    breakdown = []
    has_any_skill_match = False

    for js in job.job_skills:
        weight = float(js.weight)
        total_weight += weight

        candidate_skill = candidate_skills_dict.get(js.skill_id)
        if candidate_skill:
            prof_level = candidate_skill.proficiency_level  # May be None for resume-detected
            years_exp = float(candidate_skill.years_experience or 0)
            source = candidate_skill.source
            # None proficiency → 0.50 (resume-detected, evidence present but level unknown)
            score_factor = PROFICIENCY_MAP.get(prof_level, 0.50)
            has_any_skill_match = True
        else:
            prof_level = None
            years_exp = None
            source = None
            score_factor = 0.0

        weighted_score_sum += score_factor * weight

        breakdown.append({
            "skill_id": js.skill_id,
            "skill_name": js.skill.name if js.skill else "Unknown",
            "requirement_type": js.requirement_type,
            "weight": weight,
            "candidate_proficiency": prof_level,
            "candidate_years": years_exp,
            "skill_score": round(score_factor, 2),
            "source": source,
        })

    # Zero-gate: if candidate matches zero required skills, score = 0
    if not has_any_skill_match:
        return 0.0, breakdown, meets_experience

    # 1. Skill Component (up to 60%)
    raw_skill_ratio = (weighted_score_sum / total_weight) if total_weight > 0 else 0.0
    skill_component = raw_skill_ratio * 60.0

    # 2. Experience Component (up to 20%)
    if job_exp <= 0:
        exp_component = 20.0
    elif cand_exp >= job_exp:
        exp_component = 20.0
    elif cand_exp >= (job_exp * 0.7):
        exp_component = 12.0
    elif cand_exp > 0:
        exp_component = 6.0
    else:
        exp_component = 0.0

    # 3. Education Qualification (up to 10%)
    edu_component = 10.0 if bool(candidate.education_degree) else 0.0

    # 4. Work Mode Compatibility (up to 10%)
    cand_mode = (candidate.preferred_work_mode or "").lower()
    job_mode = (job.work_mode or "").lower()
    if not cand_mode or not job_mode or cand_mode == "hybrid" or job_mode == "hybrid" or cand_mode == job_mode:
        work_mode_component = 10.0
    else:
        work_mode_component = 4.0

    overall_score = round(
        min(100.0, skill_component + exp_component + edu_component + work_mode_component), 2
    )
    return overall_score, breakdown, meets_experience


def _find_active_jobs_for_candidate(db: Session, candidate_id: int) -> List[Job]:
    """
    STAGE 1 — Two-stage filter: find ACTIVE jobs that share at least one skill
    with the candidate. This avoids scoring every job.
    """
    candidate_skill_ids = [
        cs.skill_id
        for cs in db.query(CandidateSkill.skill_id)
                     .filter(CandidateSkill.candidate_id == candidate_id)
                     .all()
    ]
    if not candidate_skill_ids:
        return []

    # Find ACTIVE jobs that have at least one matching skill
    matching_job_ids = (
        db.query(JobSkill.job_id)
        .join(Job, Job.id == JobSkill.job_id)
        .filter(
            Job.status == "active",
            JobSkill.skill_id.in_(candidate_skill_ids),
        )
        .distinct()
        .all()
    )
    job_ids = [row[0] for row in matching_job_ids]
    if not job_ids:
        return []

    return db.query(Job).filter(Job.id.in_(job_ids)).all()


def _find_relevant_candidates_for_job(db: Session, job_id: int) -> List[Candidate]:
    """
    STAGE 1 — Two-stage filter: find candidates that share at least one skill
    with the job's requirements. Avoids scoring every candidate.
    """
    job_skill_ids = [
        row[0]
        for row in db.query(JobSkill.skill_id)
                      .filter(JobSkill.job_id == job_id)
                      .all()
    ]
    if not job_skill_ids:
        # No skill requirements — match all candidates
        return db.query(Candidate).all()

    candidate_ids = (
        db.query(CandidateSkill.candidate_id)
        .filter(CandidateSkill.skill_id.in_(job_skill_ids))
        .distinct()
        .all()
    )
    cand_ids = [row[0] for row in candidate_ids]
    if not cand_ids:
        return []

    return db.query(Candidate).filter(Candidate.id.in_(cand_ids)).all()


def _upsert_match_result(
    db: Session,
    job: Job,
    candidate: Candidate,
    overall_score: float,
    triggered_by: str = "auto",
) -> MatchResult:
    """
    Upsert match result — preserves existing business pipeline status.
    Only updates score, processing_status, and increments version.
    """
    existing = db.query(MatchResult).filter(
        MatchResult.job_id == job.id,
        MatchResult.candidate_id == candidate.id,
    ).first()

    now = datetime.now(timezone.utc)

    if existing:
        existing.overall_score = Decimal(str(overall_score))
        existing.processing_status = "completed"
        existing.matched_by_version = (existing.matched_by_version or 0) + 1
        existing.matched_at = now
        # Do NOT reset business pipeline status (screened/approved etc.)
        return existing
    else:
        new_result = MatchResult(
            job_id=job.id,
            candidate_id=candidate.id,
            overall_score=Decimal(str(overall_score)),
            status="matched",  # Initial business status
            processing_status="completed",
            matched_by_version=1,
            matched_at=now,
        )
        db.add(new_result)
        return new_result


@celery_app.task(
    bind=True,
    name="app.tasks.matching_tasks.run_candidate_matching_task",
    queue="matching",
    max_retries=3,
    default_retry_delay=60,
    acks_late=True,
)
def run_candidate_matching_task(self, candidate_id: int) -> dict:
    """
    TRIGGER A — Candidate-initiated matching.
    Fired after resume processing completes.
    Two-stage: skill overlap filter → detailed scoring → upsert.
    """
    db: Session = SessionLocal()
    try:
        logger.info(f"[Match Task-A] Running candidate matching for candidate_id={candidate_id}")

        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if not candidate:
            logger.error(f"[Match Task-A] Candidate {candidate_id} not found.")
            return {"status": "failed", "error": "Candidate not found"}

        # Stage 1: find relevant ACTIVE jobs (skill overlap filter)
        relevant_jobs = _find_active_jobs_for_candidate(db, candidate_id)
        logger.info(f"[Match Task-A] Found {len(relevant_jobs)} relevant active jobs.")

        scored = 0
        for job in relevant_jobs:
            try:
                overall_score, breakdown, meets_exp = _calculate_match_score(job, candidate)
                _upsert_match_result(db, job, candidate, overall_score, triggered_by="candidate_resume")
                scored += 1
            except Exception as e:
                logger.warning(f"[Match Task-A] Error scoring job_id={job.id}: {e}")

        db.commit()
        logger.info(
            f"[Match Task-A] Completed candidate_id={candidate_id}: "
            f"{scored}/{len(relevant_jobs)} jobs scored."
        )

        return {
            "status": "completed",
            "candidate_id": candidate_id,
            "jobs_evaluated": scored,
        }

    except Exception as e:
        logger.error(f"[Match Task-A] Unexpected error for candidate_id={candidate_id}: {e}")
        db.rollback()
        self.retry(exc=e)
        return {}
    finally:
        db.close()


@celery_app.task(
    bind=True,
    name="app.tasks.matching_tasks.run_job_matching_task",
    queue="matching",
    max_retries=3,
    default_retry_delay=60,
    acks_late=True,
)
def run_job_matching_task(self, job_id: int, triggered_by: str = "hr_publish") -> dict:
    """
    TRIGGER B — Job-initiated matching.
    Fired when HR publishes a job or updates matching-relevant fields.
    Two-stage: skill overlap filter → detailed scoring → upsert.
    """
    db: Session = SessionLocal()
    try:
        logger.info(f"[Match Task-B] Running job matching for job_id={job_id}")

        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            logger.error(f"[Match Task-B] Job {job_id} not found.")
            return {"status": "failed", "error": "Job not found"}

        if job.status != "active":
            logger.info(f"[Match Task-B] Job {job_id} is not active (status={job.status}). Skipping.")
            return {"status": "skipped", "reason": "Job not active"}

        # Mark existing results as stale before re-scoring
        db.query(MatchResult).filter(
            MatchResult.job_id == job_id,
            MatchResult.status == "matched",  # Only reset initial matches, preserve pipeline
        ).update({"processing_status": "stale"})
        db.flush()

        # Stage 1: find relevant candidates (skill overlap filter)
        relevant_candidates = _find_relevant_candidates_for_job(db, job_id)
        logger.info(f"[Match Task-B] Found {len(relevant_candidates)} relevant candidates.")

        scored = 0
        for candidate in relevant_candidates:
            try:
                overall_score, breakdown, meets_exp = _calculate_match_score(job, candidate)
                _upsert_match_result(db, job, candidate, overall_score, triggered_by=triggered_by)
                scored += 1
            except Exception as e:
                logger.warning(f"[Match Task-B] Error scoring candidate_id={candidate.id}: {e}")

        db.commit()
        logger.info(
            f"[Match Task-B] Completed job_id={job_id}: "
            f"{scored}/{len(relevant_candidates)} candidates scored."
        )

        return {
            "status": "completed",
            "job_id": job_id,
            "candidates_evaluated": scored,
        }

    except Exception as e:
        logger.error(f"[Match Task-B] Unexpected error for job_id={job_id}: {e}")
        db.rollback()
        self.retry(exc=e)
        return {}
    finally:
        db.close()
