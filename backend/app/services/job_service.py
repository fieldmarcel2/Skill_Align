"""
Job service — Recruiter job management.

Creating a job and its skills is done in a single DB transaction.
If skill insertion fails, the job is also rolled back (no partial state).
"""

from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.job import Job
from app.models.job_skill import JobSkill
from app.models.skill import Skill
from app.models.user import User
from app.schemas.job import JobCreate, JobUpdate, JobOut


def _validate_skills(db: Session, skill_inputs: list) -> None:
    """Verify all skill_ids exist. Raises 400 for any invalid ID."""
    for s in skill_inputs:
        if not db.query(Skill).filter(Skill.id == s.skill_id).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Skill with id={s.skill_id} does not exist.",
            )


def create_job(db: Session, data: JobCreate, creator: User) -> JobOut:
    """
    Create a job with its associated skills in a single transaction.
    If any skill is invalid, the entire operation is rolled back.
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

    db.commit()
    db.refresh(job)
    return JobOut.model_validate(job)


def list_jobs(
    db: Session,
    creator_id: Optional[int] = None,
    status_filter: Optional[str] = None,
) -> list[JobOut]:
    query = db.query(Job)
    if creator_id is not None:
        query = query.filter(Job.created_by == creator_id)
    if status_filter:
        query = query.filter(Job.status == status_filter)
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
    Update a job. Recruiter can only update their own jobs.
    If skills are provided, existing job_skills are replaced atomically.
    """
    job = get_job(db, job_id)

    # Ownership check — Recruiters can only edit their own jobs
    if requester.role.name == "Recruiter" and job.created_by != requester.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own jobs.",
        )

    if data.title is not None:
        job.title = data.title.strip()
    if data.description is not None:
        job.description = data.description
    if data.department is not None:
        job.department = data.department
    if data.client_name is not None:
        job.client_name = data.client_name
    if data.min_experience_years is not None:
        job.min_experience_years = data.min_experience_years
    if data.work_mode is not None:
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
        job.status = data.status

    if data.skills is not None:
        _validate_skills(db, data.skills)
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
    return JobOut.model_validate(job)


def delete_job(db: Session, job_id: int, requester: User) -> None:
    """
    Delete a job and all its associated skills.
    Recruiters can only delete their own jobs.
    """
    job = get_job(db, job_id)

    # Ownership check
    if requester.role.name == "Recruiter" and job.created_by != requester.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own jobs.",
        )

    # Delete associated job_skills first (cascade should handle this but explicit is safer)
    for js in list(job.job_skills):
        db.delete(js)
    db.flush()

    db.delete(job)
    db.commit()
