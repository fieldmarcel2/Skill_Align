"""
Audit Logging Service
=====================
Records operational actions performed by HR, Recruiters, and Admins across jobs, candidates, workflows, and tasks.
"""

import json
from typing import Optional, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.audit_log import AuditLog
from app.core.request_context import get_request_id


def log_audit(
    db: Session,
    actor_id: Optional[int],
    action: str,
    entity_type: str,
    entity_id: Optional[int] = None,
    job_id: Optional[int] = None,
    candidate_id: Optional[int] = None,
    match_result_id: Optional[int] = None,
    interview_id: Optional[int] = None,
    from_state: Optional[str] = None,
    to_state: Optional[str] = None,
    details: Optional[Any] = None,
    request_id: Optional[str] = None,
    commit: bool = True,
) -> AuditLog:
    """Record an audit trail event.

    Args:
        request_id: Optional HTTP request ID for distributed request tracing.
                    If None, automatically retrieves the active request_id from ContextVar.
        commit: If True, calls db.commit() and db.refresh(); if False, only db.add() is called
                (allowing caller to manage transaction atomicity).
    """
    # Auto-resolve request_id from thread-safe ContextVar if not explicitly passed
    resolved_request_id = request_id or get_request_id()
    if resolved_request_id == "no-request-id":
        resolved_request_id = None

    details_str = None
    if details is not None:
        if isinstance(details, str):
            details_str = details
        else:
            try:
                details_str = json.dumps(details, default=str)
            except Exception:
                details_str = str(details)

    log_entry = AuditLog(
        actor_id=actor_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        job_id=job_id,
        candidate_id=candidate_id,
        match_result_id=match_result_id,
        interview_id=interview_id,
        from_state=from_state,
        to_state=to_state,
        details=details_str,
        request_id=resolved_request_id,
    )
    db.add(log_entry)
    if commit:
        db.commit()
        db.refresh(log_entry)
    return log_entry


def prune_audit_logs(db: Session, max_keep: int = 2000) -> int:
    """
    Prunes older audit logs so the table retains at most `max_keep` latest entries.
    Default changed to 2000 so historical activity is preserved safely.
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
