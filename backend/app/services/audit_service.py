"""
Audit Logging Service
=====================
Records operational actions performed by HR and Recruiters across jobs, candidates, and tasks.
"""

import json
from typing import Optional, Any, List
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def log_audit(
    db: Session,
    actor_id: Optional[int],
    action: str,
    entity_type: str,
    entity_id: Optional[int] = None,
    job_id: Optional[int] = None,
    candidate_id: Optional[int] = None,
    details: Optional[Any] = None,
) -> AuditLog:
    """Record an audit trail event."""
    details_str = None
    if details is not None:
        if isinstance(details, str):
            details_str = details
        else:
            try:
                details_str = json.dumps(details)
            except Exception:
                details_str = str(details)

    log_entry = AuditLog(
        actor_id=actor_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        job_id=job_id,
        candidate_id=candidate_id,
        details=details_str,
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry


from sqlalchemy import func


def prune_audit_logs(db: Session, max_keep: int = 50) -> int:
    """
    Prunes older audit logs so the table retains at most `max_keep` latest entries.
    Ensures the Admin activity feed does not grow indefinitely and stays performant.
    Returns the number of pruned entries.
    """
    total_count = db.query(func.count(AuditLog.id)).scalar() or 0
    if total_count <= max_keep:
        return 0

    # Get the exact IDs of the max_keep newest records
    keep_ids = [
        row[0]
        for row in db.query(AuditLog.id)
        .order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
        .limit(max_keep)
        .all()
    ]

    if not keep_ids:
        return 0

    deleted = (
        db.query(AuditLog)
        .filter(~AuditLog.id.in_(keep_ids))
        .delete(synchronize_session=False)
    )
    db.commit()
    return deleted


def list_audit_logs(
    db: Session,
    job_id: Optional[int] = None,
    candidate_id: Optional[int] = None,
    limit: int = 50,
) -> List[AuditLog]:
    """Retrieve audit history filtered by job and/or candidate, capped at limit."""
    query = db.query(AuditLog)
    if job_id is not None:
        query = query.filter(AuditLog.job_id == job_id)
    if candidate_id is not None:
        query = query.filter(AuditLog.candidate_id == candidate_id)
    return query.order_by(AuditLog.created_at.desc(), AuditLog.id.desc()).limit(min(limit, 50)).all()
