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
