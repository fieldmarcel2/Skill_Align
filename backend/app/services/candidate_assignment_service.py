"""
Candidate Recruiter Assignment Service
======================================
Handles operational claiming and distribution of candidates across assigned recruiters on a job.

Concurrency & Race Condition Handling:
- Enforces strict (job_id, candidate_id) uniqueness.
- Safely catches database integrity conflicts if two recruiters claim simultaneously.
"""

from datetime import datetime, timezone
from typing import Dict, List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.candidate import Candidate
from app.models.job import Job
from app.models.user import User
from app.models.candidate_recruiter_assignment import CandidateRecruiterAssignment
from app.models.match_result import MatchResult
from app.services.recruiter_assignment_service import is_recruiter_assigned
from app.services.audit_service import log_audit


def claim_candidate(
    db: Session,
    job_id: int,
    candidate_id: int,
    recruiter_user: User,
) -> CandidateRecruiterAssignment:
    """
    Recruiter claims an unassigned candidate for screening ("Assign to Me").
    
    Race-condition safe:
    - Database unique constraint on (job_id, candidate_id) guarantees that only
      one active claim succeeds.
    """
    # 1. Verify recruiter is assigned to this job requisition; if not, automatically enroll them
    if recruiter_user.role.name != "Admin" and not is_recruiter_assigned(db, job_id, recruiter_user.id):
        from app.models.job_recruiter_assignment import JobRecruiterAssignment
        job_assign = JobRecruiterAssignment(
            job_id=job_id,
            recruiter_id=recruiter_user.id,
            assigned_by=recruiter_user.id,
            assignment_role="RECRUITER",
            status="active",
            assigned_at=datetime.now(timezone.utc),
        )
        db.add(job_assign)
        try:
            db.commit()
        except Exception:
            db.rollback()

    # 2. Verify candidate match exists for this job
    match = (
        db.query(MatchResult)
        .filter(MatchResult.job_id == job_id, MatchResult.candidate_id == candidate_id)
        .first()
    )
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate is not matched with this job requisition.",
        )

    # 3. Check existing assignment
    existing = (
        db.query(CandidateRecruiterAssignment)
        .filter(
            CandidateRecruiterAssignment.job_id == job_id,
            CandidateRecruiterAssignment.candidate_id == candidate_id,
        )
        .first()
    )

    now = datetime.now(timezone.utc)
    if existing:
        if existing.status == "active":
            if existing.recruiter_id == recruiter_user.id:
                return existing  # Already claimed by this recruiter
            # Claimed by someone else
            other_recruiter = existing.recruiter.name if existing.recruiter else "another recruiter"
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Candidate is already claimed by {other_recruiter}.",
            )
        # Reactivate previously unassigned/completed claim
        existing.status = "active"
        existing.recruiter_id = recruiter_user.id
        existing.assigned_by = recruiter_user.id
        existing.assigned_at = now
        existing.completed_at = None
        assignment = existing
    else:
        assignment = CandidateRecruiterAssignment(
            job_id=job_id,
            candidate_id=candidate_id,
            recruiter_id=recruiter_user.id,
            assigned_by=recruiter_user.id,
            status="active",
            assigned_at=now,
        )
        db.add(assignment)

    try:
        db.commit()
        db.refresh(assignment)
    except IntegrityError:
        db.rollback()
        # Another recruiter completed claim in between
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Candidate was just claimed by another recruiter. Please refresh the candidate pool.",
        )

    log_audit(
        db,
        actor_id=recruiter_user.id,
        action="CLAIM_CANDIDATE",
        entity_type="candidate_recruiter_assignment",
        entity_id=assignment.id,
        job_id=job_id,
        candidate_id=candidate_id,
        details={"recruiter_id": recruiter_user.id, "recruiter_name": recruiter_user.name},
    )

    return assignment


def assign_candidate_to_recruiter(
    db: Session,
    job_id: int,
    candidate_id: int,
    target_recruiter_id: int,
    assigned_by_user: User,
) -> CandidateRecruiterAssignment:
    """HR or Primary Recruiter delegates a candidate to a specific assigned recruiter."""
    # Verify target recruiter is assigned to the job
    if not is_recruiter_assigned(db, job_id, target_recruiter_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target recruiter is not actively assigned to this job requisition.",
        )

    existing = (
        db.query(CandidateRecruiterAssignment)
        .filter(
            CandidateRecruiterAssignment.job_id == job_id,
            CandidateRecruiterAssignment.candidate_id == candidate_id,
        )
        .first()
    )

    now = datetime.now(timezone.utc)
    if existing:
        existing.status = "active"
        existing.recruiter_id = target_recruiter_id
        existing.assigned_by = assigned_by_user.id
        existing.assigned_at = now
        existing.completed_at = None
        assignment = existing
    else:
        assignment = CandidateRecruiterAssignment(
            job_id=job_id,
            candidate_id=candidate_id,
            recruiter_id=target_recruiter_id,
            assigned_by=assigned_by_user.id,
            status="active",
            assigned_at=now,
        )
        db.add(assignment)

    try:
        db.commit()
        db.refresh(assignment)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Failed to assign candidate due to a concurrent conflict.",
        )

    log_audit(
        db,
        actor_id=assigned_by_user.id,
        action="ASSIGN_CANDIDATE",
        entity_type="candidate_recruiter_assignment",
        entity_id=assignment.id,
        job_id=job_id,
        candidate_id=candidate_id,
        details={"recruiter_id": target_recruiter_id},
    )
    return assignment


def unassign_candidate(
    db: Session,
    job_id: int,
    candidate_id: int,
    user: Optional[User] = None,
    requesting_user: Optional[User] = None,
) -> None:
    """Release a candidate back to the shared job pool."""
    active_user = requesting_user or user
    assignment = (
        db.query(CandidateRecruiterAssignment)
        .filter(
            CandidateRecruiterAssignment.job_id == job_id,
            CandidateRecruiterAssignment.candidate_id == candidate_id,
            CandidateRecruiterAssignment.status == "active",
        )
        .first()
    )
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active candidate assignment not found.",
        )

    assignment.status = "unassigned"
    db.commit()

    log_audit(
        db,
        actor_id=active_user.id if active_user else assignment.recruiter_id,
        action="UNASSIGN_CANDIDATE",
        entity_type="candidate_recruiter_assignment",
        entity_id=assignment.id,
        job_id=job_id,
        candidate_id=candidate_id,
    )


def get_candidate_assignment(
    db: Session,
    job_id: int,
    candidate_id: int,
) -> Optional[CandidateRecruiterAssignment]:
    """Get active candidate assignment for a job."""
    return (
        db.query(CandidateRecruiterAssignment)
        .filter(
            CandidateRecruiterAssignment.job_id == job_id,
            CandidateRecruiterAssignment.candidate_id == candidate_id,
            CandidateRecruiterAssignment.status == "active",
        )
        .first()
    )


def list_job_candidate_assignments(
    db: Session,
    job_id: int,
) -> Dict[int, CandidateRecruiterAssignment]:
    """Return dictionary mapping candidate_id to active assignment for a job."""
    assignments = (
        db.query(CandidateRecruiterAssignment)
        .filter(
            CandidateRecruiterAssignment.job_id == job_id,
            CandidateRecruiterAssignment.status == "active",
        )
        .all()
    )
    return {a.candidate_id: a for a in assignments}
