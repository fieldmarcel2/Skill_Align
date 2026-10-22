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

import logging
import time
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
from app.core.logging_config import debug_log, sanitize_and_truncate

logger = logging.getLogger("skillalign.job_service")


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
            logger.warning(
                "Could not run matching for job_id=%s: %s",
                job_id,
                fallback_err,
                extra={
                    "event": "matching_queue_failed",
                    "job_id": job_id,
                    "triggered_by": triggered_by,
                    "exception_type": type(fallback_err).__name__,
                },
            )


def create_job(db: Session, data: JobCreate, creator: User) -> JobOut:
    """
    Create a job with its associated skills in a single transaction.
    Creator must be HR or Admin.
    If job is published immediately (status='active'), auto-queues matching.
    """
    start_time = time.perf_counter()

    debug_log(
        logger,
        "Job creation started",
        stage="request_validation",
        payload=data.model_dump(exclude_none=True),
        extra_fields={
            "event": "job_create_started",
            "user_id": creator.id,
            "user_role": creator.role.name if creator.role else "Unknown",
        },
    )

    _validate_skills(db, data.skills)

    debug_log(
        logger,
        "Skills validated for job creation: %d skill(s) provided",
        stage="request_validation",
        extra_fields={
            "event": "job_skills_validated",
            "input_count": len(data.skills),
            "skill_ids": [s.skill_id for s in data.skills],
            "user_id": creator.id,
        },
    )

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

    debug_log(
        logger,
        "Inserting job record into database",
        stage="database_insert",
        payload={
            "title": data.title,
            "status": data.status,
            "department": data.department,
            "min_experience_years": str(data.min_experience_years),
            "work_mode": data.work_mode or "Hybrid",
            "skills_count": len(data.skills),
        },
        extra_fields={
            "event": "job_db_insert",
            "db_operation": "INSERT",
            "user_id": creator.id,
        },
    )

    db.flush()  # get job.id without committing

    debug_log(
        logger,
        "Job record inserted with job_id=%s, now adding %d skill(s)",
        stage="database_insert",
        extra_fields={
            "event": "job_skills_insert",
            "job_id": job.id,
            "db_operation": "INSERT",
            "rows_affected": len(data.skills),
            "input_count": len(data.skills),
        },
    )

    for s in data.skills:
        db.add(JobSkill(
            job_id=job.id,
            skill_id=s.skill_id,
            requirement_type=s.requirement_type,
            weight=s.weight,
        ))

    # Record job creation in audit log
    from app.services.audit_service import log_audit
    log_audit(
        db=db,
        actor_id=creator.id,
        action="JOB_CREATED",
        entity_type="job",
        entity_id=job.id,
        job_id=job.id,
        to_state=job.status,
        details={
            "title": job.title,
            "department": job.department,
            "status": job.status,
            "skills_count": len(data.skills),
            "creator": creator.name,
        },
        commit=False,
    )

    db.commit()
    db.refresh(job)

    duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

    logger.info(
        "Job created: job_id=%s title='%s' status=%s skills=%d in %.2fms",
        job.id,
        job.title,
        job.status,
        len(data.skills),
        duration_ms,
        extra={
            "event": "job_created",
            "stage": "response",
            "job_id": job.id,
            "duration_ms": duration_ms,
            "skills_count": len(data.skills),
            "status": job.status,
            "user_id": creator.id,
        },
    )

    # Auto-trigger matching if job is published immediately
    if job.status == "active":
        logger.info(
            "Job job_id=%s published immediately as active — queuing matching task",
            job.id,
            extra={"event": "job_matching_queued", "job_id": job.id, "triggered_by": "hr_publish"},
        )
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

    jobs = query.order_by(Job.created_at.desc()).all()

    debug_log(
        logger,
        "list_jobs query returned %d job(s)",
        stage="database_result",
        extra_fields={
            "event": "jobs_listed",
            "output_count": len(jobs),
            "creator_id": creator_id,
            "status_filter": status_filter,
            "job_ids_filter_count": len(job_ids) if job_ids is not None else None,
            "db_operation": "SELECT",
        },
    )

    return [JobOut.model_validate(j) for j in jobs]


def get_job(db: Session, job_id: int) -> Job:
    """Return the raw ORM object (used internally and by other services)."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        logger.warning(
            "Job not found: job_id=%s",
            job_id,
            extra={"event": "job_not_found", "job_id": job_id, "db_operation": "SELECT"},
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")
    return job


def get_job_out(db: Session, job_id: int) -> JobOut:
    return JobOut.model_validate(get_job(db, job_id))


def update_job(db: Session, job_id: int, data: JobUpdate, requester: User) -> JobOut:
    """
    Update a job. Only HR and Admin can update jobs.
    Detects matching-relevant field changes and queues re-matching automatically.
    """
    start_time = time.perf_counter()

    debug_log(
        logger,
        "Job update started for job_id=%s",
        stage="request_validation",
        payload=data.model_dump(exclude_none=True, exclude_unset=True),
        extra_fields={
            "event": "job_update_started",
            "job_id": job_id,
            "user_id": requester.id,
            "user_role": requester.role.name if requester.role else "Unknown",
        },
    )

    job = get_job(db, job_id)

    # Track which matching-relevant fields change
    matching_relevant_changed = False
    was_active = job.status == "active"
    old_status = job.status
    changed_fields: list[str] = []

    if data.title is not None:
        job.title = data.title.strip()
        changed_fields.append("title")
    if data.description is not None:
        job.description = data.description
        changed_fields.append("description")
    if data.department is not None:
        job.department = data.department
        changed_fields.append("department")
    if data.client_name is not None:
        job.client_name = data.client_name
        changed_fields.append("client_name")
    if data.min_experience_years is not None:
        if data.min_experience_years != float(job.min_experience_years or 0):
            matching_relevant_changed = True
            changed_fields.append("min_experience_years")
        job.min_experience_years = data.min_experience_years
    if data.work_mode is not None:
        if data.work_mode != job.work_mode:
            matching_relevant_changed = True
            changed_fields.append("work_mode")
        job.work_mode = data.work_mode
    if data.location_city is not None:
        job.location_city = data.location_city
        changed_fields.append("location_city")
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
            changed_fields.append("status")
        job.status = data.status

    skills_replaced = False
    if data.skills is not None:
        _validate_skills(db, data.skills)
        matching_relevant_changed = True
        skills_replaced = True
        changed_fields.append("skills")
        old_skill_ids = [js.skill_id for js in job.job_skills]
        new_skill_ids = [s.skill_id for s in data.skills]

        debug_log(
            logger,
            "Replacing job skills: old=%d skill(s), new=%d skill(s)",
            stage="service_processing",
            extra_fields={
                "event": "job_skills_replace",
                "job_id": job_id,
                "input_count": len(data.skills),
                "old_skill_ids": old_skill_ids,
                "new_skill_ids": new_skill_ids,
            },
        )

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

    debug_log(
        logger,
        "Job update committed to database: job_id=%s changed_fields=%s matching_relevant=%s",
        stage="database_insert",
        extra_fields={
            "event": "job_update_db",
            "job_id": job_id,
            "db_operation": "UPDATE",
            "changed_fields": changed_fields,
            "matching_relevant_changed": matching_relevant_changed,
            "old_status": old_status,
            "new_status": job.status,
        },
    )

    from app.services.audit_service import log_audit
    log_audit(
        db=db,
        actor_id=requester.id,
        action="JOB_UPDATED",
        entity_type="job",
        entity_id=job.id,
        job_id=job.id,
        from_state=old_status,
        to_state=job.status,
        details={
            "title": job.title,
            "department": job.department,
            "status": job.status,
            "matching_relevant_changed": matching_relevant_changed,
            "updater": requester.name,
            "changed_fields": changed_fields,
        },
        commit=False,
    )

    db.commit()
    db.refresh(job)

    duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

    # Auto-trigger re-matching if:
    # 1. Job is currently active AND matching-relevant fields changed, OR
    # 2. Job just transitioned from draft/closed → active
    now_active = job.status == "active"
    just_published = not was_active and now_active
    should_rematch = now_active and (matching_relevant_changed or just_published)

    logger.info(
        "Job updated: job_id=%s status=%s matching_relevant=%s duration=%.2fms",
        job.id,
        job.status,
        matching_relevant_changed,
        duration_ms,
        extra={
            "event": "job_updated",
            "stage": "response",
            "job_id": job.id,
            "duration_ms": duration_ms,
            "changed_fields": changed_fields,
            "matching_relevant_changed": matching_relevant_changed,
            "user_id": requester.id,
        },
    )

    if should_rematch:
        triggered_by = "hr_publish" if just_published else "hr_update"
        logger.info(
            "Job job_id=%s update triggered re-matching (reason=%s)",
            job.id,
            triggered_by,
            extra={"event": "job_rematch_queued", "job_id": job.id, "triggered_by": triggered_by},
        )
        _queue_job_matching(job.id, triggered_by=triggered_by)

    return JobOut.model_validate(job)


def delete_job(db: Session, job_id: int, requester: User) -> None:
    """
    Delete a job and all its associated skills.
    Only HR and Admin can delete jobs.
    """
    job = get_job(db, job_id)
    job_title = job.title
    skills_count = len(job.job_skills) if job.job_skills else 0

    debug_log(
        logger,
        "Deleting job_id=%s title='%s' with %d associated skill(s)",
        stage="database_insert",
        extra_fields={
            "event": "job_delete_started",
            "job_id": job_id,
            "db_operation": "DELETE",
            "skills_count": skills_count,
            "user_id": requester.id,
        },
    )

    from app.services.audit_service import log_audit
    log_audit(
        db=db,
        actor_id=requester.id,
        action="JOB_DELETED",
        entity_type="job",
        entity_id=job_id,
        job_id=job_id,
        details={"title": job_title, "deleted_by": requester.name},
        commit=False,
    )

    # Delete associated job_skills first (cascade should handle this but explicit is safer)
    for js in list(job.job_skills):
        db.delete(js)
    db.flush()

    db.delete(job)
    db.commit()

    logger.info(
        "Job deleted: job_id=%s title='%s' by user_id=%s",
        job_id,
        job_title,
        requester.id,
        extra={
            "event": "job_deleted",
            "job_id": job_id,
            "user_id": requester.id,
            "rows_affected": 1,
            "db_operation": "DELETE",
        },
    )


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

    debug_log(
        logger,
        "Pipeline summary computed: %d job(s), %d with active pipelines",
        stage="database_result",
        extra_fields={
            "event": "pipeline_summary_computed",
            "output_count": len(result),
            "jobs_with_pipeline": sum(1 for r in result if r.has_active_pipeline),
            "db_operation": "SELECT",
        },
    )

    return result
