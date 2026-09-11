"""
Job service — HR-owned job management.

HR is the owner of job creation, editing, and deletion.
Recruiters can only VIEW jobs and their match results.

When a job is published (status → 'active') or important matching fields
are updated, the system automatically queues a background matching task.

Matching-relevant fields (trigger re-matching on change):
  - status (draft → active triggers matching)
  - min_experience_years
  - work_mode
  - skills (required/preferred + weights)
"""

from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from fastapi import HTTPException, status

from app.models.job import Job
from app.models.job_skill import JobSkill
from app.models.skill import Skill
from app.models.user import User
from app.models.audit_log import AuditLog
from app.models.match_result import MatchResult
from app.schemas.job import JobCreate, JobUpdate, JobOut, JobPipelineSummary


def _validate_skills(db: Session, skill_inputs: list) -> None:
    """Verify all skill_ids exist. Raises 400 for any invalid ID."""
    for s in skill_inputs:
        if not db.query(Skill).filter(Skill.id == s.skill_id).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Skill with id={s.skill_id} does not exist.",
            )


def _queue_job_matching(job_id: int, triggered_by: str = "hr_action") -> None:
    """
    Queue a background matching task for the given job.
    If no Celery worker is active, executes synchronously immediately.
    """
    try:
        from app.tasks.matching_tasks import run_job_matching_task
        from app.celery_app import celery_app
        insp = celery_app.control.inspect(timeout=0.2)
        active_workers = insp.ping() if insp else None
        if active_workers:
            run_job_matching_task.apply_async(
                args=[job_id, triggered_by],
                queue="matching",
            )
        else:
            run_job_matching_task.apply(args=[job_id, triggered_by])
    except Exception as e:
        try:
            from app.tasks.matching_tasks import run_job_matching_task
            run_job_matching_task.apply(args=[job_id, triggered_by])
        except Exception as fallback_err:
            import logging
            logging.getLogger("skillalign.job_service").warning(
                f"Could not run matching for job_id={job_id}: {fallback_err}"
            )


def create_job(db: Session, data: JobCreate, creator: User) -> JobOut:
    """
    Create a job with its associated skills in a single transaction.
    Creator must be HR or Admin.
    If job is published immediately (status='active'), auto-queues matching.
    """
    _validate_skills(db, data.skills)

    job = Job(
        title=data.title,
        description=data.description,
        department=data.department,
        client_name=data.client_name,
        min_experience_years=data.min_experience_years,
        work_mode=data.work_mode or "Hybrid",
        location_city=data.location_city,
        location_state=data.location_state,
        location_country=data.location_country or "India",
        urgency=data.urgency or "30 days",
        shift_timing=data.shift_timing or "Day",
        travel_requirements=data.travel_requirements or "None",
        status=data.status,
        created_by=creator.id,
    )
    db.add(job)
    db.flush()  # get job.id without committing

    for s in data.skills:
        db.add(JobSkill(
            job_id=job.id,
            skill_id=s.skill_id,
            requirement_type=s.requirement_type,
            weight=s.weight,
        ))

    # Record job creation in audit log
    audit_entry = AuditLog(
        actor_id=creator.id,
        action="JOB_CREATED",
        entity_type="job",
        entity_id=job.id,
        job_id=job.id,
        to_state=job.status,
        details=f"Job '{job.title}' created by {creator.name} ({creator.role.name if creator.role else 'HR'}) with {len(data.skills)} required/preferred skills.",
    )
    db.add(audit_entry)

    db.commit()
    db.refresh(job)

    # Auto-trigger matching if job is published immediately
    if job.status == "active":
        _queue_job_matching(job.id, triggered_by="hr_publish")

    return JobOut.model_validate(job)


def list_jobs(
    db: Session,
    creator_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    job_ids: Optional[List[int]] = None,
) -> list[JobOut]:
    query = db.query(Job)
    if creator_id is not None:
        query = query.filter(Job.created_by == creator_id)
    if status_filter:
        query = query.filter(Job.status == status_filter)
    if job_ids is not None:
        query = query.filter(Job.id.in_(job_ids))
    return [JobOut.model_validate(j) for j in query.order_by(Job.created_at.desc()).all()]


def get_job(db: Session, job_id: int) -> Job:
    """Return the raw ORM object (used internally and by other services)."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")
    return job


def get_job_out(db: Session, job_id: int) -> JobOut:
    return JobOut.model_validate(get_job(db, job_id))


def update_job(db: Session, job_id: int, data: JobUpdate, requester: User) -> JobOut:
    """
    Update a job. Only HR and Admin can update jobs.
    Detects matching-relevant field changes and queues re-matching automatically.
    """
    job = get_job(db, job_id)

    # Track which matching-relevant fields change
    matching_relevant_changed = False
    was_active = job.status == "active"

    if data.title is not None:
        job.title = data.title.strip()
    if data.description is not None:
        job.description = data.description
    if data.department is not None:
        job.department = data.department
    if data.client_name is not None:
        job.client_name = data.client_name
    if data.min_experience_years is not None:
        if data.min_experience_years != float(job.min_experience_years or 0):
            matching_relevant_changed = True
        job.min_experience_years = data.min_experience_years
    if data.work_mode is not None:
        if data.work_mode != job.work_mode:
            matching_relevant_changed = True
        job.work_mode = data.work_mode
    if data.location_city is not None:
        job.location_city = data.location_city
    if data.location_state is not None:
        job.location_state = data.location_state
    if data.location_country is not None:
        job.location_country = data.location_country
    if data.urgency is not None:
        job.urgency = data.urgency
    if data.shift_timing is not None:
        job.shift_timing = data.shift_timing
    if data.travel_requirements is not None:
        job.travel_requirements = data.travel_requirements
    if data.status is not None:
        if data.status != job.status:
            matching_relevant_changed = True
        job.status = data.status

    if data.skills is not None:
        _validate_skills(db, data.skills)
        matching_relevant_changed = True
        # Delete existing skills and replace with the new set
        for js in list(job.job_skills):
            db.delete(js)
        db.flush()
        for s in data.skills:
            db.add(JobSkill(
                job_id=job.id,
                skill_id=s.skill_id,
                requirement_type=s.requirement_type,
                weight=s.weight,
            ))

    db.commit()
    db.refresh(job)

    # Auto-trigger re-matching if:
    # 1. Job is currently active AND matching-relevant fields changed, OR
    # 2. Job just transitioned from draft/closed → active
    now_active = job.status == "active"
    just_published = not was_active and now_active
    should_rematch = now_active and (matching_relevant_changed or just_published)

    if should_rematch:
        triggered_by = "hr_publish" if just_published else "hr_update"
        _queue_job_matching(job.id, triggered_by=triggered_by)

    return JobOut.model_validate(job)


def delete_job(db: Session, job_id: int, requester: User) -> None:
    """
    Delete a job and all its associated skills.
    Only HR and Admin can delete jobs.
    """
    job = get_job(db, job_id)

    # Delete associated job_skills first (cascade should handle this but explicit is safer)
    for js in list(job.job_skills):
        db.delete(js)
    db.flush()

    db.delete(job)
    db.commit()


def get_jobs_pipeline_summary(
    db: Session, job_ids: Optional[List[int]] = None
) -> List[JobPipelineSummary]:
    """
    Computes aggregate candidate counts and pipeline status for each job in 2 queries.
    Allows HR and Recruiters to immediately identify which requisitions have active candidates
    versus those where sourcing/matching is needed.
    """
    query = db.query(Job)
    if job_ids is not None:
        query = query.filter(Job.id.in_(job_ids))
    jobs = query.order_by(Job.created_at.desc()).all()

    match_query = db.query(
        MatchResult.job_id,
        func.count(MatchResult.id).label("total_candidates"),
        func.sum(case((MatchResult.status.in_(["matched", "screened", "screening", "shortlisted"]), 1), else_=0)).label("in_screening"),
        func.sum(case((MatchResult.status.in_(["approved_by_hr", "interview_scheduled", "technical_interview", "hr_interview"]), 1), else_=0)).label("in_interview"),
        func.sum(case((MatchResult.status.in_(["offer"]), 1), else_=0)).label("in_offer"),
        func.sum(case((MatchResult.status.in_(["hired"]), 1), else_=0)).label("hired"),
    ).filter(MatchResult.status != "rejected")

    if job_ids is not None:
        match_query = match_query.filter(MatchResult.job_id.in_(job_ids))

    match_stats = match_query.group_by(MatchResult.job_id).all()
    stats_by_job = {row.job_id: row for row in match_stats}

    result = []
    for j in jobs:
        st = stats_by_job.get(j.id)
        total = int(st.total_candidates) if st and st.total_candidates else 0
        in_screening = int(st.in_screening) if st and st.in_screening else 0
        in_interview = int(st.in_interview) if st and st.in_interview else 0
        in_offer = int(st.in_offer) if st and st.in_offer else 0
        hired = int(st.hired) if st and st.hired else 0

        result.append(
            JobPipelineSummary(
                id=j.id,
                title=j.title,
                department=j.department,
                client_name=j.client_name,
                status=j.status,
                min_experience_years=float(j.min_experience_years or 0),
                work_mode=j.work_mode or "Hybrid",
                required_skills_count=len(j.job_skills) if j.job_skills else 0,
                total_candidates=total,
                in_screening_count=in_screening,
                in_interview_count=in_interview,
                in_offer_count=in_offer,
                hired_count=hired,
                has_active_pipeline=total > 0,
                sourcing_needed=total == 0,
            )
        )
    return result

