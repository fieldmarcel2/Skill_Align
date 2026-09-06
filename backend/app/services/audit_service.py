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


def list_audit_logs(
    db: Session,
    job_id: Optional[int] = None,
    candidate_id: Optional[int] = None,
    limit: int = 50,
) -> List[AuditLog]:
    """Retrieve audit history filtered by job and/or candidate."""
    query = db.query(AuditLog)
    if job_id is not None:
        query = query.filter(AuditLog.job_id == job_id)
    if candidate_id is not None:
        query = query.filter(AuditLog.candidate_id == candidate_id)
    return query.order_by(AuditLog.created_at.desc()).limit(limit).all()
