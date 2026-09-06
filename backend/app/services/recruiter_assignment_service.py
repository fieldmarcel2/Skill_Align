"""
Recruiter Assignment Service
============================
Manages multi-recruiter assignments to job requisitions (owned by HR).
"""

from datetime import datetime, timezone
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.job import Job
from app.models.user import User
from app.models.job_recruiter_assignment import JobRecruiterAssignment, ASSIGNMENT_ROLES
from app.models.candidate_recruiter_assignment import CandidateRecruiterAssignment
from app.models.notification import Notification
from app.services.audit_service import log_audit


def assign_recruiter_to_job(
    db: Session,
    job_id: int,
    recruiter_id: int,
    assigned_by_user: User,
    assignment_role: str = "RECRUITER",
) -> JobRecruiterAssignment:
    """Assign a recruiter to a job requisition with a specific operational role."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job requisition with id {job_id} not found."
        )

    # Validate recruiter
    recruiter = db.query(User).filter(User.id == recruiter_id).first()
    if not recruiter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {recruiter_id} not found."
        )
    if recruiter.role.name != "Recruiter":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User {recruiter.name} does not hold the Recruiter role (role is {recruiter.role.name})."
        )

    if assignment_role not in ASSIGNMENT_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid assignment role. Must be one of: {', '.join(ASSIGNMENT_ROLES)}."
        )

    # If setting to PRIMARY_RECRUITER, demote any existing primary recruiter on this job to RECRUITER
    if assignment_role == "PRIMARY_RECRUITER":
        existing_primary = (
            db.query(JobRecruiterAssignment)
            .filter(
                JobRecruiterAssignment.job_id == job_id,
                JobRecruiterAssignment.assignment_role == "PRIMARY_RECRUITER",
                JobRecruiterAssignment.status == "active",
                JobRecruiterAssignment.recruiter_id != recruiter_id,
            )
            .first()
        )
        if existing_primary:
            existing_primary.assignment_role = "RECRUITER"

    # Check existing assignment
    assignment = (
        db.query(JobRecruiterAssignment)
        .filter(
            JobRecruiterAssignment.job_id == job_id,
            JobRecruiterAssignment.recruiter_id == recruiter_id,
        )
        .first()
    )

    now = datetime.now(timezone.utc)
    if assignment:
        if assignment.status == "active":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Recruiter {recruiter.name} is already actively assigned to this job requisition."
            )
        # Reactivate previously removed assignment
        assignment.status = "active"
        assignment.assignment_role = assignment_role
        assignment.assigned_by = assigned_by_user.id
        assignment.assigned_at = now
        assignment.removed_at = None
    else:
        assignment = JobRecruiterAssignment(
            job_id=job_id,
            recruiter_id=recruiter_id,
            assigned_by=assigned_by_user.id,
            assignment_role=assignment_role,
            status="active",
            assigned_at=now,
        )
        db.add(assignment)

    db.commit()
    db.refresh(assignment)

    # Create notification for the recruiter
    notification = Notification(
        user_id=recruiter_id,
        channel="in_app",
        subject=f"Assigned to Job: {job.title}",
        body=(
            f"You have been assigned to job requisition '{job.title}' ({job.client_name or 'SkillAlign'}) "
            f"as {assignment_role.replace('_', ' ').title()} by {assigned_by_user.name}."
        ),
        status="sent",
    )
    db.add(notification)
    db.commit()

    # Log audit
    log_audit(
        db,
        actor_id=assigned_by_user.id,
        action="ASSIGN_RECRUITER",
        entity_type="job_recruiter_assignment",
        entity_id=assignment.id,
        job_id=job_id,
        details={
            "recruiter_id": recruiter_id,
            "recruiter_name": recruiter.name,
            "assignment_role": assignment_role,
        },
    )

    return assignment


def remove_recruiter_from_job(
    db: Session,
    job_id: int,
    recruiter_id: int,
    removed_by_user: User,
) -> None:
    """Remove a recruiter from a job requisition and release any candidate claims."""
    assignment = (
        db.query(JobRecruiterAssignment)
        .filter(
            JobRecruiterAssignment.job_id == job_id,
            JobRecruiterAssignment.recruiter_id == recruiter_id,
            JobRecruiterAssignment.status == "active",
        )
        .first()
    )
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active recruiter assignment not found for this job.",
        )

    assignment.status = "removed"
    assignment.removed_at = datetime.now(timezone.utc)

    # Also release candidate claims held by this recruiter on this job
    candidate_claims = (
        db.query(CandidateRecruiterAssignment)
        .filter(
            CandidateRecruiterAssignment.job_id == job_id,
            CandidateRecruiterAssignment.recruiter_id == recruiter_id,
            CandidateRecruiterAssignment.status == "active",
        )
        .all()
    )
    for claim in candidate_claims:
        claim.status = "unassigned"

    db.commit()

    log_audit(
        db,
        actor_id=removed_by_user.id,
        action="REMOVE_RECRUITER",
        entity_type="job_recruiter_assignment",
        entity_id=assignment.id,
        job_id=job_id,
        details={"recruiter_id": recruiter_id},
    )


def update_recruiter_role(
    db: Session,
    job_id: int,
    recruiter_id: int,
    new_role: str,
    updated_by_user: User,
) -> JobRecruiterAssignment:
    """Update a recruiter's operational role on a job (e.g. promoting to PRIMARY_RECRUITER)."""
    if new_role not in ASSIGNMENT_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid assignment role. Must be one of: {', '.join(ASSIGNMENT_ROLES)}."
        )

    assignment = (
        db.query(JobRecruiterAssignment)
        .filter(
            JobRecruiterAssignment.job_id == job_id,
            JobRecruiterAssignment.recruiter_id == recruiter_id,
            JobRecruiterAssignment.status == "active",
        )
        .first()
    )
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active recruiter assignment not found for this job.",
        )

    if new_role == "PRIMARY_RECRUITER":
        # Demote any existing primary recruiter on this job
        existing_primary = (
            db.query(JobRecruiterAssignment)
            .filter(
                JobRecruiterAssignment.job_id == job_id,
                JobRecruiterAssignment.assignment_role == "PRIMARY_RECRUITER",
                JobRecruiterAssignment.status == "active",
                JobRecruiterAssignment.recruiter_id != recruiter_id,
            )
            .first()
        )
        if existing_primary:
            existing_primary.assignment_role = "RECRUITER"

    assignment.assignment_role = new_role
    db.commit()
    db.refresh(assignment)

    log_audit(
        db,
        actor_id=updated_by_user.id,
        action="CHANGE_RECRUITER_ROLE",
        entity_type="job_recruiter_assignment",
        entity_id=assignment.id,
        job_id=job_id,
        details={"recruiter_id": recruiter_id, "new_role": new_role},
    )
    return assignment


def list_job_recruiters(db: Session, job_id: int) -> List[JobRecruiterAssignment]:
    """List all active recruiter assignments for a job requisition."""
    return (
        db.query(JobRecruiterAssignment)
        .filter(
            JobRecruiterAssignment.job_id == job_id,
            JobRecruiterAssignment.status == "active",
        )
        .order_by(
            JobRecruiterAssignment.assignment_role == "PRIMARY_RECRUITER",
            JobRecruiterAssignment.assigned_at.asc(),
        )
        .all()
    )


def get_recruiter_assigned_job_ids(db: Session, recruiter_id: int) -> List[int]:
    """Return all job IDs where the recruiter is actively assigned."""
    rows = (
        db.query(JobRecruiterAssignment.job_id)
        .filter(
            JobRecruiterAssignment.recruiter_id == recruiter_id,
            JobRecruiterAssignment.status == "active",
        )
        .all()
    )
    return [r[0] for r in rows]


def is_recruiter_assigned(db: Session, job_id: int, recruiter_id: int) -> bool:
    """Check if a recruiter is actively assigned to a job requisition."""
    return db.query(JobRecruiterAssignment).filter(
        JobRecruiterAssignment.job_id == job_id,
        JobRecruiterAssignment.recruiter_id == recruiter_id,
        JobRecruiterAssignment.status == "active",
    ).first() is not None
