"""
Workflow Service — Enterprise Recruitment State Machine
========================================================
Implements the 21-state recruitment workflow for SkillAlign.

Core principle:
  Every state transition:
  1. Validates the transition is allowed (raises HTTPException on invalid transition)
  2. Updates match_result.pipeline_state
  3. Writes an AuditLog entry atomically (same transaction)
  4. Creates in-app Notification for relevant parties
  5. Optionally dispatches background email

State Machine:
  CANDIDATE_MATCHED → CANDIDATE_SHORTLISTED → SENT_TO_HIRING_MANAGER
  → HIRING_MANAGER_REVIEW → (HIRING_MANAGER_REJECTED | INTERVIEW_REQUESTED)
  → INTERVIEW_SLOTS_PROPOSED → WAITING_FOR_CANDIDATE_SLOT
  → CANDIDATE_SLOT_SELECTED → INTERVIEW_CONFIRMED → INTERVIEW_COMPLETED
  → WAITING_FOR_HM_FEEDBACK → (INTERVIEW_GO | INTERVIEW_NO_GO)
  → COMPENSATION_DISCUSSION → OFFER_CREATED → OFFER_SENT
  → (OFFER_ACCEPTED → HIRED) | (OFFER_REJECTED → BLACKLISTED)

Any state can transition to REJECTED via explicit reject actions.
"""

import json
import logging
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, List

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.match_result import MatchResult
from app.models.interview import Interview
from app.models.interview_slot import InterviewSlot
from app.models.interview_feedback import InterviewFeedback
from app.models.offer import Offer
from app.models.candidate_blacklist import CandidateBlacklist
from app.models.audit_log import AuditLog
from app.models.notification import Notification
from app.models.recruitment_task import RecruitmentTask
from app.models.user import User

logger = logging.getLogger("skillalign.workflow")

# ── Valid Transitions ─────────────────────────────────────────────────────────
VALID_TRANSITIONS: dict[str, list[str]] = {
    "CANDIDATE_MATCHED": ["CANDIDATE_SHORTLISTED", "SENT_TO_HIRING_MANAGER", "HIRING_MANAGER_REVIEW", "INTERVIEW_REQUESTED", "INTERVIEW_SLOTS_PROPOSED", "REJECTED"],
    "CANDIDATE_SHORTLISTED": ["SENT_TO_HIRING_MANAGER", "HIRING_MANAGER_REVIEW", "INTERVIEW_REQUESTED", "INTERVIEW_SLOTS_PROPOSED", "REJECTED"],
    "SENT_TO_HIRING_MANAGER": ["HIRING_MANAGER_REVIEW", "INTERVIEW_REQUESTED", "INTERVIEW_SLOTS_PROPOSED", "REJECTED"],
    "HIRING_MANAGER_REVIEW": ["HIRING_MANAGER_REJECTED", "INTERVIEW_REQUESTED", "INTERVIEW_SLOTS_PROPOSED", "REJECTED"],
    "HIRING_MANAGER_REJECTED": ["REJECTED"],
    "INTERVIEW_REQUESTED": ["INTERVIEW_SLOTS_PROPOSED", "WAITING_FOR_CANDIDATE_SLOT", "CANDIDATE_SLOT_SELECTED", "REJECTED"],
    "INTERVIEW_SLOTS_PROPOSED": ["INTERVIEW_SLOTS_PROPOSED", "WAITING_FOR_CANDIDATE_SLOT", "CANDIDATE_SLOT_SELECTED", "INTERVIEW_CONFIRMED", "REJECTED"],
    "WAITING_FOR_CANDIDATE_SLOT": ["WAITING_FOR_CANDIDATE_SLOT", "INTERVIEW_SLOTS_PROPOSED", "CANDIDATE_SLOT_SELECTED", "INTERVIEW_CONFIRMED", "REJECTED"],
    "CANDIDATE_SLOT_SELECTED": ["CANDIDATE_SLOT_SELECTED", "INTERVIEW_SLOTS_PROPOSED", "WAITING_FOR_CANDIDATE_SLOT", "INTERVIEW_CONFIRMED", "REJECTED"],
    "INTERVIEW_CONFIRMED": ["INTERVIEW_COMPLETED", "INTERVIEW_SLOTS_PROPOSED", "INTERVIEW_REQUESTED", "CANDIDATE_SLOT_SELECTED", "REJECTED"],
    "INTERVIEW_COMPLETED": ["WAITING_FOR_HM_FEEDBACK", "INTERVIEW_GO", "COMPENSATION_DISCUSSION", "REJECTED"],
    "WAITING_FOR_HM_FEEDBACK": ["INTERVIEW_GO", "INTERVIEW_NO_GO", "COMPENSATION_DISCUSSION", "REJECTED"],
    "INTERVIEW_GO": ["COMPENSATION_DISCUSSION", "INTERVIEW_REQUESTED", "REJECTED"],
    "INTERVIEW_NO_GO": ["REJECTED"],
    "COMPENSATION_DISCUSSION": ["OFFER_CREATED", "INTERVIEW_REQUESTED", "REJECTED"],
    "OFFER_CREATED": ["OFFER_SENT", "OFFER_CREATED", "REJECTED"],
    "OFFER_SENT": ["OFFER_ACCEPTED", "OFFER_REJECTED", "REJECTED"],
    "OFFER_ACCEPTED": ["HIRED"],
    "OFFER_REJECTED": ["BLACKLISTED"],
    "BLACKLISTED": [],
    "HIRED": [],
    "REJECTED": [],
}


def _validate_transition(current_state: str, target_state: str) -> None:
    """Raise HTTPException 422 if transition is invalid."""
    allowed = VALID_TRANSITIONS.get(current_state, [])
    if target_state not in allowed:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Invalid workflow transition: '{current_state}' → '{target_state}'. "
                f"Allowed transitions from '{current_state}': {allowed or 'none (terminal state)'}."
            ),
        )


def _create_audit_log(
    db: Session,
    actor_id: Optional[int],
    action: str,
    match_result: MatchResult,
    from_state: Optional[str] = None,
    to_state: Optional[str] = None,
    interview_id: Optional[int] = None,
    details: Optional[str] = None,
) -> AuditLog:
    """Create an audit log entry for a workflow transition."""
    log = AuditLog(
        actor_id=actor_id,
        action=action,
        entity_type="match_result",
        entity_id=match_result.id,
        job_id=match_result.job_id,
        candidate_id=match_result.candidate_id,
        match_result_id=match_result.id,
        interview_id=interview_id,
        from_state=from_state,
        to_state=to_state,
        details=details,
    )
    db.add(log)
    return log


def _create_notification(
    db: Session,
    user_id: int,
    subject: str,
    body: str,
    notification_type: str,
    match_result_id: Optional[int] = None,
    action_url: Optional[str] = None,
) -> Notification:
    """Create an in-app notification."""
    notif = Notification(
        user_id=user_id,
        channel="in_app",
        subject=subject,
        body=body,
        status="sent",
        is_read=False,
        notification_type=notification_type,
        match_result_id=match_result_id,
        action_url=action_url,
    )
    db.add(notif)
    return notif


def _create_recruiter_task(
    db: Session,
    job_id: int,
    candidate_id: int,
    assigned_to: int,
    created_by: int,
    title: str,
    description: str,
    action_type: str,
    match_result_id: Optional[int] = None,
    interview_id: Optional[int] = None,
    priority: str = "HIGH",
) -> RecruitmentTask:
    """Create a recruiter action task."""
    task = RecruitmentTask(
        job_id=job_id,
        candidate_id=candidate_id,
        assigned_to=assigned_to,
        created_by=created_by,
        match_result_id=match_result_id,
        interview_id=interview_id,
        action_type=action_type,
        title=title,
        description=description,
        status="OPEN",
        priority=priority,
    )
    db.add(task)
    return task


# ── Workflow Transition Functions ─────────────────────────────────────────────

def shortlist_candidate(
    db: Session,
    match_result: MatchResult,
    recruiter: User,
    note: Optional[str] = None,
) -> MatchResult:
    """Recruiter shortlists a candidate for a job."""
    _validate_transition(match_result.pipeline_state, "CANDIDATE_SHORTLISTED")
    old_state = match_result.pipeline_state

    match_result.pipeline_state = "CANDIDATE_SHORTLISTED"
    match_result.status = "screened"
    if note:
        match_result.shortlist_note = note

    _create_audit_log(
        db, recruiter.id, "CANDIDATE_SHORTLISTED", match_result,
        from_state=old_state, to_state="CANDIDATE_SHORTLISTED",
        details=f"Shortlisted by {recruiter.name}. Note: {note or 'None'}",
    )
    db.commit()
    db.refresh(match_result)
    logger.info(f"[Workflow] MatchResult {match_result.id}: {old_state} → CANDIDATE_SHORTLISTED by user {recruiter.id}")
    return match_result


def submit_to_hiring_manager(
    db: Session,
    match_result: MatchResult,
    recruiter: User,
    hiring_manager_id: int,
    note: Optional[str] = None,
) -> MatchResult:
    """Recruiter submits candidate to Hiring Manager for review."""
    _validate_transition(match_result.pipeline_state, "SENT_TO_HIRING_MANAGER")
    old_state = match_result.pipeline_state

    # Verify HM exists and is HR role
    hm = db.query(User).filter(User.id == hiring_manager_id, User.is_active == True).first()
    if not hm or hm.role.name not in ("HR", "Admin"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Hiring Manager with id {hiring_manager_id} not found or is not an HR/Admin user.",
        )

    now = datetime.now(timezone.utc)
    match_result.pipeline_state = "SENT_TO_HIRING_MANAGER"
    match_result.hiring_manager_id = hiring_manager_id
    match_result.shortlist_note = note
    match_result.submitted_to_hm_at = now
    match_result.status = "screened"

    candidate_name = match_result.candidate.full_name if match_result.candidate else "Candidate"
    job_title = match_result.job.title if match_result.job else "Job"

    _create_audit_log(
        db, recruiter.id, "SUBMITTED_TO_HM", match_result,
        from_state=old_state, to_state="SENT_TO_HIRING_MANAGER",
        details=json.dumps({
            "recruiter": recruiter.name,
            "hiring_manager_id": hiring_manager_id,
            "hiring_manager": hm.name,
            "note": note,
        }),
    )

    # Notify HM
    _create_notification(
        db, hiring_manager_id,
        subject=f"Candidate Submitted for Review: {candidate_name}",
        body=(
            f"{recruiter.name} has submitted {candidate_name} for the {job_title} position. "
            f"Match Score: {float(match_result.overall_score):.0f}%. "
            f"Note: {note or 'No note provided.'}"
        ),
        notification_type="HM_REVIEW_REQUIRED",
        match_result_id=match_result.id,
        action_url=f"/hr/candidates/{match_result.id}/review",
    )

    db.commit()
    db.refresh(match_result)
    logger.info(f"[Workflow] MatchResult {match_result.id}: {old_state} → SENT_TO_HIRING_MANAGER to HM {hm.name}")
    return match_result


def hm_start_review(
    db: Session,
    match_result: MatchResult,
    hm_user: User,
) -> MatchResult:
    """HM marks a candidate as 'in review'."""
    if match_result.pipeline_state == "HIRING_MANAGER_REVIEW":
        return match_result

    _validate_transition(match_result.pipeline_state, "HIRING_MANAGER_REVIEW")
    old_state = match_result.pipeline_state

    now = datetime.now(timezone.utc)
    match_result.pipeline_state = "HIRING_MANAGER_REVIEW"
    match_result.hm_reviewed_at = now

    _create_audit_log(
        db, hm_user.id, "HM_REVIEW_STARTED", match_result,
        from_state=old_state, to_state="HIRING_MANAGER_REVIEW",
        details=f"HM {hm_user.name} started review",
    )
    db.commit()
    db.refresh(match_result)
    return match_result


def hm_reject_candidate(
    db: Session,
    match_result: MatchResult,
    hm_user: User,
    reason: Optional[str] = None,
) -> MatchResult:
    """HM rejects a candidate."""
    _validate_transition(match_result.pipeline_state, "HIRING_MANAGER_REJECTED")
    old_state = match_result.pipeline_state

    match_result.pipeline_state = "REJECTED"
    match_result.status = "rejected"
    match_result.hm_rejection_reason = reason

    # Cascade cancellation to any pending/active interviews and slots
    interviews = db.query(Interview).filter(Interview.match_result_id == match_result.id).all()
    for inv in interviews:
        if inv.status != "completed":
            inv.status = "cancelled"
        for slot in (inv.slots or []):
            if slot.status != "confirmed":
                slot.status = "cancelled"

    db.query(RecruitmentTask).filter(
        RecruitmentTask.match_result_id == match_result.id,
        RecruitmentTask.status == "PENDING",
    ).update({"status": "CANCELLED"}, synchronize_session=False)

    from app.models.candidate_recruiter_assignment import CandidateRecruiterAssignment
    db.query(CandidateRecruiterAssignment).filter(
        CandidateRecruiterAssignment.job_id == match_result.job_id,
        CandidateRecruiterAssignment.candidate_id == match_result.candidate_id,
        CandidateRecruiterAssignment.status == "active",
    ).update({
        "status": "completed",
        "completed_at": datetime.now(timezone.utc)
    }, synchronize_session=False)

    candidate_name = match_result.candidate.full_name if match_result.candidate else "Candidate"
    job_title = match_result.job.title if match_result.job else "Job"

    _create_audit_log(
        db, hm_user.id, "HM_REJECTED_CANDIDATE", match_result,
        from_state=old_state, to_state="REJECTED",
        details=json.dumps({"hm": hm_user.name, "reason": reason}),
    )

    # Notify recruiter
    if match_result.recruiter_id:
        _create_notification(
            db, match_result.recruiter_id,
            subject=f"Candidate Rejected by Hiring Manager: {candidate_name}",
            body=(
                f"{hm_user.name} has rejected {candidate_name} for {job_title}. "
                f"Reason: {reason or 'No reason provided.'}"
            ),
            notification_type="INTERVIEW_NO_GO",
            match_result_id=match_result.id,
        )

    db.commit()
    db.refresh(match_result)
    logger.info(f"[Workflow] MatchResult {match_result.id}: {old_state} → REJECTED by HM {hm_user.name}")
    return match_result


def request_interview(
    db: Session,
    match_result: MatchResult,
    hm_user: User,
    slots: List[dict],  # [{"slot_datetime": datetime, "slot_end_datetime": datetime|None}]
    interview_type: str = "technical",
    meeting_link: Optional[str] = None,
) -> tuple[MatchResult, Interview]:
    """
    HM requests an interview and proposes time slots.
    Minimum 2 slots required.
    """
    bl = is_candidate_blacklisted(db, match_result.candidate_id)
    if bl:
        until_str = bl.blacklisted_until.strftime("%d %B %Y")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Candidate unavailable for interview consideration until {until_str}.",
        )

    if len(slots) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least 2 time slots must be proposed for an interview request.",
        )

    now_utc = datetime.now(timezone.utc)
    for slot in slots:
        slot_dt = slot.get("slot_datetime")
        if isinstance(slot_dt, str):
            from datetime import datetime as dt
            slot_dt = dt.fromisoformat(slot_dt)
        if slot_dt and slot_dt.tzinfo is None:
            from datetime import timezone as tz_module
            slot_dt = slot_dt.replace(tzinfo=timezone.utc)
        if slot_dt and slot_dt <= now_utc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Slot datetime {slot_dt} is in the past. All slots must be future dates.",
            )

    current_pstate = match_result.pipeline_state or "CANDIDATE_MATCHED"
    old_state = current_pstate

    # Check if this is an adjustment of already proposed slots
    existing_interview = (
        db.query(Interview)
        .filter(Interview.match_result_id == match_result.id)
        .order_by(Interview.created_at.desc())
        .first()
    )

    if existing_interview and current_pstate in ("INTERVIEW_SLOTS_PROPOSED", "WAITING_FOR_CANDIDATE_SLOT", "INTERVIEW_REQUESTED", "CANDIDATE_SLOT_SELECTED"):
        interview = existing_interview
        interview.interview_type = interview_type
        if meeting_link:
            interview.meeting_link = meeting_link
        interview.status = "pending_slot"

        # Cancel previous proposed slots
        db.query(InterviewSlot).filter(
            InterviewSlot.interview_id == interview.id,
            InterviewSlot.status == "proposed",
        ).update({"status": "cancelled"})
    else:
        if current_pstate not in ("INTERVIEW_REQUESTED", "INTERVIEW_SLOTS_PROPOSED"):
            _validate_transition(current_pstate, "INTERVIEW_SLOTS_PROPOSED")

        # Create Interview record (date will be set when slot is confirmed)
        interview = Interview(
            match_result_id=match_result.id,
            scheduled_by=hm_user.id,
            requested_by=hm_user.id,
            interview_type=interview_type,
            meeting_link=meeting_link,
            interview_mode="online",
            status="pending_slot",
        )
        db.add(interview)
        db.flush()  # get interview.id

    # Create new proposed slot records
    slot_records = []
    for slot_data in slots:
        slot_dt = slot_data.get("slot_datetime")
        slot_end = slot_data.get("slot_end_datetime")
        if isinstance(slot_dt, str):
            slot_dt = datetime.fromisoformat(slot_dt)
        if isinstance(slot_end, str):
            slot_end = datetime.fromisoformat(slot_end)
        if slot_dt and slot_dt.tzinfo is None:
            slot_dt = slot_dt.replace(tzinfo=timezone.utc)
        if slot_end and slot_end.tzinfo is None:
            slot_end = slot_end.replace(tzinfo=timezone.utc)

        slot_record = InterviewSlot(
            interview_id=interview.id,
            match_result_id=match_result.id,
            proposed_by=hm_user.id,
            slot_datetime=slot_dt,
            slot_end_datetime=slot_end,
            status="proposed",
        )
        db.add(slot_record)
        slot_records.append(slot_record)

    # Update match state: INTERVIEW_REQUESTED → INTERVIEW_SLOTS_PROPOSED
    match_result.pipeline_state = "INTERVIEW_SLOTS_PROPOSED"
    match_result.status = "interview_scheduled"
    if not match_result.hiring_manager_id:
        match_result.hiring_manager_id = hm_user.id

    slot_summary = "; ".join([
        str(s.get("slot_datetime"))[:16] for s in slots
    ])

    _create_audit_log(
        db, hm_user.id, "INTERVIEW_REQUESTED_AND_SLOTS_PROPOSED", match_result,
        from_state=old_state, to_state="INTERVIEW_SLOTS_PROPOSED",
        interview_id=interview.id,
        details=json.dumps({
            "hm": hm_user.name,
            "slots_count": len(slots),
            "slots": slot_summary,
            "interview_type": interview_type,
        }),
    )

    # Notify recruiter: they must forward slots to candidate
    candidate_name = match_result.candidate.full_name if match_result.candidate else "Candidate"
    job_title = match_result.job.title if match_result.job else "Job"

    recruiter_id = match_result.recruiter_id
    if recruiter_id:
        _create_notification(
            db, recruiter_id,
            subject=f"Action Required: Interview Scheduling for {candidate_name}",
            body=(
                f"{hm_user.name} has requested an interview for {candidate_name} ({job_title}). "
                f"They proposed {len(slots)} time slots. Please forward these to the candidate."
            ),
            notification_type="INTERVIEW_SLOTS_RECEIVED",
            match_result_id=match_result.id,
            action_url=f"/recruiter/applications/{match_result.id}/send-slots",
        )
        _create_recruiter_task(
            db,
            job_id=match_result.job_id,
            candidate_id=match_result.candidate_id,
            assigned_to=recruiter_id,
            created_by=hm_user.id,
            title=f"Send Interview Slots to {candidate_name}",
            description=(
                f"{hm_user.name} proposed {len(slots)} slots for {job_title}. "
                f"Slots: {slot_summary}. Please forward to candidate."
            ),
            action_type="SEND_SLOTS_TO_CANDIDATE",
            match_result_id=match_result.id,
            interview_id=interview.id,
        )

    db.commit()
    db.refresh(match_result)
    db.refresh(interview)
    logger.info(
        f"[Workflow] MatchResult {match_result.id}: {old_state} → INTERVIEW_SLOTS_PROPOSED. "
        f"Interview {interview.id} created with {len(slots)} slots."
    )
    return match_result, interview


def send_slots_to_candidate(
    db: Session,
    match_result: MatchResult,
    recruiter: User,
    interview: Interview,
) -> tuple[MatchResult, str]:
    """
    Recruiter forwards HM-proposed slots to candidate via email.
    Returns (updated match_result, slot_token).
    """
    _validate_transition(match_result.pipeline_state, "WAITING_FOR_CANDIDATE_SLOT")
    old_state = match_result.pipeline_state

    # Generate secure token for public slot selection
    token = secrets.token_hex(32)
    interview.slot_token = token

    match_result.pipeline_state = "WAITING_FOR_CANDIDATE_SLOT"

    _create_audit_log(
        db, recruiter.id, "SLOTS_SENT_TO_CANDIDATE", match_result,
        from_state=old_state, to_state="WAITING_FOR_CANDIDATE_SLOT",
        interview_id=interview.id,
        details=f"Slots forwarded by recruiter {recruiter.name}. Token generated.",
    )

    # Mark recruiter task as complete
    db.query(RecruitmentTask).filter(
        RecruitmentTask.interview_id == interview.id,
        RecruitmentTask.action_type == "SEND_SLOTS_TO_CANDIDATE",
        RecruitmentTask.status == "OPEN",
    ).update({"status": "COMPLETED"})

    # Send in-app notification to candidate
    if match_result.candidate and match_result.candidate.user_id:
        cand_name = match_result.candidate.full_name or "Candidate"
        job_title = match_result.job.title if match_result.job else "Position"
        _create_notification(
            db, match_result.candidate.user_id,
            subject=f"Action Required: Choose your interview time slot for {job_title}",
            body=(
                f"Hello {cand_name},\n\n"
                f"The recruitment team has proposed interview time slots for {job_title}. "
                f"Please open your candidate dashboard or use the invitation link to select your preferred slot."
            ),
            notification_type="INTERVIEW_SLOTS_RECEIVED",
            match_result_id=match_result.id,
            action_url="/candidate/dashboard",
        )

    db.commit()
    db.refresh(match_result)
    db.refresh(interview)
    return match_result, token


def candidate_select_slot(
    db: Session,
    interview: Interview,
    slot_id: int,
    token: Optional[str] = None,
    current_user: Optional[User] = None,
) -> tuple[MatchResult, InterviewSlot]:
    """
    Candidate selects an interview slot using either:
    1. The secure token received via email/link
    2. An authenticated Candidate session where current_user matches the candidate.
    Race-condition safe: validates slot status within transaction.
    """
    match_result = interview.match_result
    if not match_result:
        raise HTTPException(status_code=404, detail="Application not found.")

    is_authenticated_candidate = (
        current_user is not None
        and match_result.candidate is not None
        and match_result.candidate.user_id == current_user.id
    )

    is_token_valid = (
        token is not None
        and bool(token.strip())
        and interview.slot_token is not None
        and interview.slot_token == token.strip()
    )

    if not is_token_valid and not is_authenticated_candidate:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or expired selection token, or unauthorized candidate.",
        )

    if (
        interview.status == "cancelled"
        or match_result.status == "rejected"
        or match_result.pipeline_state in ("REJECTED", "DECLINED", "BLACKLISTED", "HIRING_MANAGER_REJECTED", "OFFER_REJECTED")
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This interview invitation is no longer active as the candidate application has been rejected or cancelled.",
        )

    _validate_transition(match_result.pipeline_state, "CANDIDATE_SLOT_SELECTED")
    old_state = match_result.pipeline_state

    # Validate slot belongs to this interview and is still available
    slot = db.query(InterviewSlot).filter(
        InterviewSlot.id == slot_id,
        InterviewSlot.interview_id == interview.id,
        InterviewSlot.status == "proposed",
    ).with_for_update().first()

    if not slot:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Selected slot is no longer available or does not belong to this interview.",
        )

    now = datetime.now(timezone.utc)

    # Mark selected slot
    slot.status = "selected"

    # Cancel all other slots for this interview
    db.query(InterviewSlot).filter(
        InterviewSlot.interview_id == interview.id,
        InterviewSlot.id != slot_id,
    ).update({"status": "cancelled"})

    # Update interview with selected date
    interview.interview_date = slot.slot_datetime
    interview.scheduled_end = slot.slot_end_datetime
    interview.candidate_selection_at = now
    interview.status = "scheduled"

    # Update match state
    match_result.pipeline_state = "CANDIDATE_SLOT_SELECTED"
    match_result.status = "interview_scheduled"

    _create_audit_log(
        db, None, "CANDIDATE_SLOT_SELECTED", match_result,
        from_state=old_state, to_state="CANDIDATE_SLOT_SELECTED",
        interview_id=interview.id,
        details=json.dumps({
            "selected_slot_id": slot_id,
            "selected_datetime": str(slot.slot_datetime),
        }),
    )

    # Notify recruiter
    candidate_name = match_result.candidate.full_name if match_result.candidate else "Candidate"
    job_title = match_result.job.title if match_result.job else "Job"

    if match_result.recruiter_id:
        _create_notification(
            db, match_result.recruiter_id,
            subject=f"Candidate Selected Interview Slot: {candidate_name}",
            body=(
                f"{candidate_name} has selected a slot for the {job_title} interview: "
                f"{slot.slot_datetime.strftime('%d %b %Y at %I:%M %p')}. "
                f"Please confirm the interview."
            ),
            notification_type="CANDIDATE_SLOT_SELECTED",
            match_result_id=match_result.id,
            action_url=f"/recruiter/applications/{match_result.id}/confirm-interview",
        )
        _create_recruiter_task(
            db,
            job_id=match_result.job_id,
            candidate_id=match_result.candidate_id,
            assigned_to=match_result.recruiter_id,
            created_by=match_result.recruiter_id,
            title=f"Confirm Interview with {candidate_name}",
            description=(
                f"{candidate_name} selected slot: "
                f"{slot.slot_datetime.strftime('%d %b %Y at %I:%M %p')}. "
                f"Confirm the interview to proceed."
            ),
            action_type="CONFIRM_INTERVIEW",
            match_result_id=match_result.id,
            interview_id=interview.id,
        )

    # Automatically complete any open slot sending/proposing tasks
    db.query(RecruitmentTask).filter(
        RecruitmentTask.interview_id == interview.id,
        RecruitmentTask.action_type.in_(["SEND_SLOTS_TO_CANDIDATE", "PROPOSE_INTERVIEW_SLOTS"]),
        RecruitmentTask.status == "OPEN",
    ).update({"status": "COMPLETED"})

    db.commit()
    db.refresh(match_result)
    db.refresh(interview)
    db.refresh(slot)
    return match_result, slot


def confirm_interview(
    db: Session,
    match_result: MatchResult,
    recruiter: User,
    interview: Interview,
) -> MatchResult:
    """Recruiter confirms the interview. Sends confirmation emails to all parties."""
    _validate_transition(match_result.pipeline_state, "INTERVIEW_CONFIRMED")
    old_state = match_result.pipeline_state

    now = datetime.now(timezone.utc)
    interview.confirmed_by = recruiter.id
    interview.confirmed_at = now
    interview.status = "scheduled"

    match_result.pipeline_state = "INTERVIEW_CONFIRMED"
    match_result.status = "interview_scheduled"

    _create_audit_log(
        db, recruiter.id, "INTERVIEW_CONFIRMED", match_result,
        from_state=old_state, to_state="INTERVIEW_CONFIRMED",
        interview_id=interview.id,
        details=f"Confirmed by recruiter {recruiter.name}",
    )

    # Mark confirm task as done
    db.query(RecruitmentTask).filter(
        RecruitmentTask.interview_id == interview.id,
        RecruitmentTask.action_type == "CONFIRM_INTERVIEW",
        RecruitmentTask.status == "OPEN",
    ).update({"status": "COMPLETED"})

    candidate_name = match_result.candidate.full_name if match_result.candidate else "Candidate"
    job_title = match_result.job.title if match_result.job else "Job"
    interview_dt_str = interview.interview_date.strftime('%d %b %Y at %I:%M %p') if interview.interview_date else "TBD"

    # Notify candidate
    if match_result.candidate and match_result.candidate.user_id:
        _create_notification(
            db, match_result.candidate.user_id,
            subject=f"Interview Confirmed: {job_title}",
            body=(
                f"Your interview for {job_title} has been confirmed for "
                f"{interview_dt_str}. You will receive further details via email."
            ),
            notification_type="INTERVIEW_CONFIRMED",
            match_result_id=match_result.id,
        )

    # Notify HM
    if match_result.hiring_manager_id:
        _create_notification(
            db, match_result.hiring_manager_id,
            subject=f"Interview Confirmed: {candidate_name} for {job_title}",
            body=(
                f"Interview with {candidate_name} for {job_title} confirmed: {interview_dt_str}. "
                f"Confirmed by recruiter {recruiter.name}."
            ),
            notification_type="INTERVIEW_CONFIRMED",
            match_result_id=match_result.id,
        )

    db.commit()
    db.refresh(match_result)
    logger.info(f"[Workflow] MatchResult {match_result.id}: {old_state} → INTERVIEW_CONFIRMED")
    return match_result


def complete_interview(
    db: Session,
    match_result: MatchResult,
    actor: User,
    interview: Interview,
    technical_rating: Optional[int] = None,
    communication_rating: Optional[int] = None,
    problem_solving_rating: Optional[int] = None,
    role_fit_rating: Optional[int] = None,
    overall_rating: Optional[int] = None,
    comments: Optional[str] = None,
) -> MatchResult:
    """Mark interview as completed, save interviewer competency ratings, and create feedback task for HM."""
    _validate_transition(match_result.pipeline_state, "INTERVIEW_COMPLETED")
    old_state = match_result.pipeline_state

    now = datetime.now(timezone.utc)
    interview.status = "completed"
    interview.interviewer_id = actor.id
    interview.interviewer_submitted_at = now
    if technical_rating is not None:
        interview.interviewer_technical_rating = technical_rating
    if communication_rating is not None:
        interview.interviewer_communication_rating = communication_rating
    if problem_solving_rating is not None:
        interview.interviewer_problem_solving_rating = problem_solving_rating
    if role_fit_rating is not None:
        interview.interviewer_role_fit_rating = role_fit_rating
    if overall_rating is not None:
        interview.interviewer_overall_rating = overall_rating
    if comments is not None:
        interview.interviewer_comments = comments

    match_result.pipeline_state = "WAITING_FOR_HM_FEEDBACK"

    rating_summary = {
        "interviewer": actor.name,
        "technical": technical_rating,
        "communication": communication_rating,
        "problem_solving": problem_solving_rating,
        "role_fit": role_fit_rating,
        "overall": overall_rating,
        "comments": comments,
    }

    _create_audit_log(
        db, actor.id, "INTERVIEW_COMPLETED", match_result,
        from_state=old_state, to_state="WAITING_FOR_HM_FEEDBACK",
        interview_id=interview.id,
        details=json.dumps(rating_summary),
    )

    candidate_name = match_result.candidate.full_name if match_result.candidate else "Candidate"
    job_title = match_result.job.title if match_result.job else "Job"

    # Notify HM: feedback required
    if match_result.hiring_manager_id:
        _create_notification(
            db, match_result.hiring_manager_id,
            subject=f"Interview Feedback Required: {candidate_name}",
            body=(
                f"The interview with {candidate_name} for {job_title} has been completed. "
                f"Please submit your GO/NO-GO feedback to proceed with the recruitment."
            ),
            notification_type="FEEDBACK_REQUIRED",
            match_result_id=match_result.id,
            action_url=f"/hr/candidates/{match_result.id}/feedback",
        )
        _create_recruiter_task(
            db,
            job_id=match_result.job_id,
            candidate_id=match_result.candidate_id,
            assigned_to=match_result.hiring_manager_id,
            created_by=actor.id,
            title=f"Submit Interview Feedback for {candidate_name}",
            description=(
                f"Interview completed. GO/NO-GO feedback required for {candidate_name} ({job_title})."
            ),
            action_type="FEEDBACK_REQUIRED",
            match_result_id=match_result.id,
            interview_id=interview.id,
        )

    db.commit()
    db.refresh(match_result)
    logger.info(f"[Workflow] MatchResult {match_result.id}: {old_state} → WAITING_FOR_HM_FEEDBACK")
    return match_result


def save_interviewer_evaluation(
    db: Session,
    match_result: MatchResult,
    actor: User,
    interview: Interview,
    technical_rating: Optional[int] = None,
    communication_rating: Optional[int] = None,
    problem_solving_rating: Optional[int] = None,
    role_fit_rating: Optional[int] = None,
    overall_rating: Optional[int] = None,
    comments: Optional[str] = None,
) -> tuple[MatchResult, Interview]:
    """Save or update structured competency ratings by the interviewer."""
    now = datetime.now(timezone.utc)
    interview.interviewer_id = actor.id
    interview.interviewer_submitted_at = now
    if technical_rating is not None:
        interview.interviewer_technical_rating = technical_rating
    if communication_rating is not None:
        interview.interviewer_communication_rating = communication_rating
    if problem_solving_rating is not None:
        interview.interviewer_problem_solving_rating = problem_solving_rating
    if role_fit_rating is not None:
        interview.interviewer_role_fit_rating = role_fit_rating
    if overall_rating is not None:
        interview.interviewer_overall_rating = overall_rating
    if comments is not None:
        interview.interviewer_comments = comments

    _create_audit_log(
        db, actor.id, "INTERVIEWER_EVALUATION_SAVED", match_result,
        from_state=match_result.pipeline_state, to_state=match_result.pipeline_state,
        interview_id=interview.id,
        details=json.dumps({
            "interviewer": actor.name,
            "technical": technical_rating,
            "communication": communication_rating,
            "problem_solving": problem_solving_rating,
            "role_fit": role_fit_rating,
            "overall": overall_rating,
            "comments": comments,
        }),
    )

    db.commit()
    db.refresh(interview)
    return match_result, interview


def submit_hm_feedback(
    db: Session,
    match_result: MatchResult,
    hm_user: User,
    interview: Interview,
    go_no_go: str,
    technical_rating: Optional[int] = None,
    communication_rating: Optional[int] = None,
    problem_solving_rating: Optional[int] = None,
    role_fit_rating: Optional[int] = None,
    overall_rating: Optional[int] = None,
    comments: Optional[str] = None,
) -> tuple[MatchResult, InterviewFeedback]:
    """HM submits GO/NO-GO feedback after interview."""
    go_no_go = go_no_go.upper()
    if go_no_go not in ("GO", "NO_GO"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="go_no_go must be 'GO' or 'NO_GO'.",
        )

    if match_result.pipeline_state not in ("WAITING_FOR_HM_FEEDBACK",):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Feedback can only be submitted when in WAITING_FOR_HM_FEEDBACK state. Current: {match_result.pipeline_state}",
        )

    # Create feedback record
    feedback = InterviewFeedback(
        interview_id=interview.id,
        match_result_id=match_result.id,
        reviewer_id=hm_user.id,
        go_no_go=go_no_go,
        technical_rating=technical_rating,
        communication_rating=communication_rating,
        problem_solving_rating=problem_solving_rating,
        role_fit_rating=role_fit_rating,
        overall_rating=overall_rating,
        comments=comments,
    )
    db.add(feedback)

    old_state = match_result.pipeline_state
    candidate_name = match_result.candidate.full_name if match_result.candidate else "Candidate"
    job_title = match_result.job.title if match_result.job else "Job"

    if go_no_go == "GO":
        match_result.pipeline_state = "COMPENSATION_DISCUSSION"
        match_result.status = "offer"

        _create_audit_log(
            db, hm_user.id, "HM_FEEDBACK_GO", match_result,
            from_state=old_state, to_state="COMPENSATION_DISCUSSION",
            interview_id=interview.id,
            details=json.dumps({
                "hm": hm_user.name, "decision": "GO",
                "overall_rating": overall_rating, "comments": comments,
            }),
        )

        # Notify recruiter: proceed to compensation
        if match_result.recruiter_id:
            _create_notification(
                db, match_result.recruiter_id,
                subject=f"Interview GO Decision: {candidate_name} — Proceed to Compensation",
                body=(
                    f"{hm_user.name} has given a GO for {candidate_name} ({job_title}). "
                    f"Overall rating: {overall_rating}/5. Please proceed with compensation discussion and offer."
                ),
                notification_type="INTERVIEW_GO",
                match_result_id=match_result.id,
                action_url=f"/recruiter/applications/{match_result.id}/compensation",
            )
            _create_recruiter_task(
                db,
                job_id=match_result.job_id,
                candidate_id=match_result.candidate_id,
                assigned_to=match_result.recruiter_id,
                created_by=hm_user.id,
                title=f"Create Offer for {candidate_name}",
                description=(
                    f"GO decision received from {hm_user.name}. "
                    f"Create and send a compensation offer for {candidate_name} ({job_title})."
                ),
                action_type="CREATE_OFFER",
                match_result_id=match_result.id,
                interview_id=interview.id,
            )
        logger.info(f"[Workflow] MatchResult {match_result.id}: GO → COMPENSATION_DISCUSSION")

    else:  # NO_GO
        match_result.pipeline_state = "REJECTED"
        match_result.status = "rejected"
        match_result.hm_rejection_reason = comments
        match_result.hm_reviewed_at = datetime.now(timezone.utc)

        interviews = db.query(Interview).filter(Interview.match_result_id == match_result.id).all()
        for inv in interviews:
            if inv.status != "completed":
                inv.status = "cancelled"
            for slot in (inv.slots or []):
                if slot.status != "confirmed":
                    slot.status = "cancelled"

        db.query(RecruitmentTask).filter(
            RecruitmentTask.match_result_id == match_result.id,
            RecruitmentTask.status == "PENDING",
        ).update({"status": "CANCELLED"}, synchronize_session=False)

        from app.models.candidate_recruiter_assignment import CandidateRecruiterAssignment
        db.query(CandidateRecruiterAssignment).filter(
            CandidateRecruiterAssignment.job_id == match_result.job_id,
            CandidateRecruiterAssignment.candidate_id == match_result.candidate_id,
            CandidateRecruiterAssignment.status == "active",
        ).update({
            "status": "completed",
            "completed_at": datetime.now(timezone.utc)
        }, synchronize_session=False)

        now_iso = datetime.now(timezone.utc).isoformat()
        _create_audit_log(
            db, hm_user.id, "HM_FEEDBACK_NO_GO", match_result,
            from_state=old_state, to_state="REJECTED",
            interview_id=interview.id,
            details=json.dumps({
                "decision": "NO_GO",
                "decision_maker": hm_user.name,
                "decision_maker_id": hm_user.id,
                "decision_maker_email": hm_user.email,
                "decision_timestamp": now_iso,
                "decision_reason": comments or "Candidate did not meet post-interview requirements.",
                "comments": comments,
                "ratings": {
                    "overall": overall_rating,
                    "technical": technical_rating,
                    "communication": communication_rating,
                    "problem_solving": problem_solving_rating,
                    "role_fit": role_fit_rating,
                },
                "interview_details": {
                    "id": interview.id,
                    "type": interview.interview_type,
                    "interview_date": interview.interview_date.isoformat() if interview.interview_date else None,
                    "interviewer_evaluation": {
                        "technical": interview.interviewer_technical_rating,
                        "communication": interview.interviewer_communication_rating,
                        "problem_solving": interview.interviewer_problem_solving_rating,
                        "role_fit": interview.interviewer_role_fit_rating,
                        "overall": interview.interviewer_overall_rating,
                        "comments": interview.interviewer_comments,
                    },
                },
            }),
        )

        if match_result.recruiter_id:
            _create_notification(
                db, match_result.recruiter_id,
                subject=f"Interview NO-GO Decision: {candidate_name}",
                body=(
                    f"{hm_user.name} has given a NO-GO for {candidate_name} ({job_title}). "
                    f"Reason: {comments or 'No comments provided.'}. Candidate has been rejected."
                ),
                notification_type="INTERVIEW_NO_GO",
                match_result_id=match_result.id,
            )
        logger.info(f"[Workflow] MatchResult {match_result.id}: NO-GO → REJECTED")

    # Complete feedback task
    db.query(RecruitmentTask).filter(
        RecruitmentTask.interview_id == interview.id,
        RecruitmentTask.action_type == "FEEDBACK_REQUIRED",
        RecruitmentTask.status == "OPEN",
    ).update({"status": "COMPLETED"})

    db.commit()
    db.refresh(match_result)
    db.refresh(feedback)
    return match_result, feedback


def create_offer(
    db: Session,
    match_result: MatchResult,
    recruiter: User,
    proposed_salary: Optional[float],
    salary_min: Optional[float] = None,
    salary_max: Optional[float] = None,
    salary_currency: str = "INR",
    role_scope: Optional[str] = None,
    employment_type: str = "Full-time",
    joining_date: Optional[datetime] = None,
    joining_timeline: Optional[str] = None,
    offer_expiry_date: Optional[datetime] = None,
    location: Optional[str] = None,
    work_mode: Optional[str] = None,
    additional_terms: Optional[str] = None,
) -> tuple[MatchResult, Offer]:
    """Recruiter creates a draft offer."""
    # Allow creating offer in COMPENSATION_DISCUSSION state
    if match_result.pipeline_state not in ("COMPENSATION_DISCUSSION",):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Offer can only be created in COMPENSATION_DISCUSSION state. Current: {match_result.pipeline_state}",
        )

    old_state = match_result.pipeline_state

    # Check if offer already exists for this application
    offer = db.query(Offer).filter(Offer.match_result_id == match_result.id).first()
    if offer:
        offer.created_by = recruiter.id
        offer.salary_currency = salary_currency
        offer.salary_min = salary_min
        offer.salary_max = salary_max
        offer.proposed_salary = proposed_salary
        offer.role_scope = role_scope
        offer.employment_type = employment_type
        offer.joining_date = joining_date
        offer.joining_timeline = joining_timeline
        offer.offer_expiry_date = offer_expiry_date
        offer.location = location
        offer.work_mode = work_mode
        offer.additional_terms = additional_terms
        offer.status = "DRAFT"
        offer.offer_token = None
        offer.sent_at = None
        offer.responded_at = None
        offer.candidate_response_note = None
    else:
        offer = Offer(
            match_result_id=match_result.id,
            candidate_id=match_result.candidate_id,
            job_id=match_result.job_id,
            created_by=recruiter.id,
            salary_currency=salary_currency,
            salary_min=salary_min,
            salary_max=salary_max,
            proposed_salary=proposed_salary,
            role_scope=role_scope,
            employment_type=employment_type,
            joining_date=joining_date,
            joining_timeline=joining_timeline,
            offer_expiry_date=offer_expiry_date,
            location=location,
            work_mode=work_mode,
            additional_terms=additional_terms,
            status="DRAFT",
        )
        db.add(offer)
    db.flush()

    match_result.pipeline_state = "OFFER_CREATED"
    match_result.status = "offer"

    _create_audit_log(
        db, recruiter.id, "OFFER_CREATED", match_result,
        from_state=old_state, to_state="OFFER_CREATED",
        details=json.dumps({
            "offer_id": offer.id,
            "proposed_salary": proposed_salary,
            "currency": salary_currency,
        }),
    )

    db.commit()
    db.refresh(match_result)
    db.refresh(offer)
    logger.info(f"[Workflow] MatchResult {match_result.id}: {old_state} → OFFER_CREATED (Offer {offer.id})")
    return match_result, offer


def send_offer(
    db: Session,
    match_result: MatchResult,
    offer: Offer,
    recruiter: User,
) -> tuple[MatchResult, Offer, str]:
    """Recruiter sends the offer to the candidate."""
    if offer.status not in ("DRAFT", "OFFER_READY", "HM_APPROVED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only DRAFT, HM_APPROVED, or OFFER_READY offers can be sent. Current status: {offer.status}",
        )

    _validate_transition(match_result.pipeline_state, "OFFER_SENT")
    old_state = match_result.pipeline_state

    token = secrets.token_hex(32)
    now = datetime.now(timezone.utc)

    offer.offer_token = token
    offer.status = "SENT"
    offer.workflow_state = "SENT"
    offer.sent_at = now
    match_result.pipeline_state = "OFFER_SENT"
    match_result.status = "offer"

    _create_audit_log(
        db, recruiter.id, "OFFER_SENT", match_result,
        from_state=old_state, to_state="OFFER_SENT",
        details=json.dumps({"offer_id": offer.id, "recruiter": recruiter.name}),
    )

    # Notify candidate
    if match_result.candidate and match_result.candidate.user_id:
        job_title = match_result.job.title if match_result.job else "Job"
        _create_notification(
            db, match_result.candidate.user_id,
            subject=f"You Have a Job Offer: {job_title}",
            body=(
                f"Congratulations! You have received a job offer for the {job_title} position. "
                f"Proposed salary: {offer.salary_currency} {offer.proposed_salary:,.0f}. "
                f"Please review and respond."
            ),
            notification_type="OFFER_READY",
            match_result_id=match_result.id,
            action_url=f"/candidate/offers/{offer.id}?token={token}",
        )

    db.commit()
    db.refresh(match_result)
    db.refresh(offer)
    logger.info(f"[Workflow] MatchResult {match_result.id}: {old_state} → OFFER_SENT")
    return match_result, offer, token


def candidate_respond_to_offer(
    db: Session,
    offer: Offer,
    token: str,
    accept: bool,
    note: Optional[str] = None,
) -> tuple[MatchResult, Offer]:
    """Candidate accepts or rejects an offer."""
    if not offer.offer_token or offer.offer_token != token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or expired offer token.",
        )
    if offer.status != "SENT":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Offer is not in SENT status. Current: {offer.status}",
        )

    match_result = db.query(MatchResult).filter(MatchResult.id == offer.match_result_id).first()
    if not match_result:
        raise HTTPException(status_code=404, detail="Application not found.")

    now = datetime.now(timezone.utc)
    offer.responded_at = now
    offer.candidate_response_note = note

    candidate_name = match_result.candidate.full_name if match_result.candidate else "Candidate"
    job_title = match_result.job.title if match_result.job else "Job"

    if accept:
        offer.status = "ACCEPTED"
        _validate_transition(match_result.pipeline_state, "OFFER_ACCEPTED")
        old_state = match_result.pipeline_state
        match_result.pipeline_state = "HIRED"
        match_result.status = "hired"

        _create_audit_log(
            db, None, "OFFER_ACCEPTED", match_result,
            from_state=old_state, to_state="HIRED",
            details=json.dumps({"candidate": candidate_name, "note": note}),
        )

        # Notify recruiter + HM
        for uid in filter(None, [match_result.recruiter_id, match_result.hiring_manager_id]):
            _create_notification(
                db, uid,
                subject=f"Offer Accepted: {candidate_name} — HIRED",
                body=f"{candidate_name} has accepted the offer for {job_title}. Recruitment complete!",
                notification_type="OFFER_ACCEPTED",
                match_result_id=match_result.id,
            )
        logger.info(f"[Workflow] MatchResult {match_result.id}: OFFER_ACCEPTED → HIRED")

    else:
        offer.status = "REJECTED"
        _validate_transition(match_result.pipeline_state, "OFFER_REJECTED")
        old_state = match_result.pipeline_state
        match_result.pipeline_state = "BLACKLISTED"
        match_result.status = "rejected"

        # Create 6-month blacklist
        blacklist_until = now + timedelta(days=183)  # ~6 months
        blacklist = CandidateBlacklist(
            candidate_id=match_result.candidate_id,
            match_result_id=match_result.id,
            blacklisted_by=match_result.recruiter_id,
            reason=f"Offer rejected by candidate for {job_title}. Note: {note or 'None'}",
            blacklisted_at=now,
            blacklisted_until=blacklist_until,
            is_active=True,
        )
        db.add(blacklist)

        _create_audit_log(
            db, None, "OFFER_REJECTED_CANDIDATE_BLACKLISTED", match_result,
            from_state=old_state, to_state="BLACKLISTED",
            details=json.dumps({
                "candidate": candidate_name,
                "blacklisted_until": str(blacklist_until),
                "note": note,
            }),
        )

        for uid in filter(None, [match_result.recruiter_id, match_result.hiring_manager_id]):
            _create_notification(
                db, uid,
                subject=f"Offer Rejected: {candidate_name} — Blacklisted 6 Months",
                body=(
                    f"{candidate_name} has rejected the offer for {job_title}. "
                    f"Candidate has been blacklisted until {blacklist_until.strftime('%d %b %Y')}."
                ),
                notification_type="OFFER_REJECTED",
                match_result_id=match_result.id,
            )
        logger.info(
            f"[Workflow] MatchResult {match_result.id}: OFFER_REJECTED → BLACKLISTED until {blacklist_until}"
        )

    db.commit()
    db.refresh(match_result)
    db.refresh(offer)
    return match_result, offer


def get_application_timeline(db: Session, match_result_id: int) -> list[AuditLog]:
    """Return full audit timeline for an application, ordered by time."""
    return (
        db.query(AuditLog)
        .filter(AuditLog.match_result_id == match_result_id)
        .order_by(AuditLog.created_at.asc())
        .all()
    )


def is_candidate_blacklisted(db: Session, candidate_id: int) -> Optional[CandidateBlacklist]:
    """Check if candidate is currently blacklisted. Returns blacklist record or None."""
    now = datetime.now(timezone.utc)
    return (
        db.query(CandidateBlacklist)
        .filter(
            CandidateBlacklist.candidate_id == candidate_id,
            CandidateBlacklist.is_active == True,
            CandidateBlacklist.blacklisted_until > now,
        )
        .first()
    )


# ══════════════════════════════════════════════════════════════════════════════
# MULTI-ROUND INTERVIEW MANAGEMENT (v3)
# ══════════════════════════════════════════════════════════════════════════════

def get_match_interviews(db: Session, match_result_id: int) -> List[Interview]:
    """Return all interview rounds for an application, ordered by round number."""
    return (
        db.query(Interview)
        .filter(Interview.match_result_id == match_result_id)
        .order_by(Interview.round_number.asc(), Interview.created_at.asc())
        .all()
    )


def create_interview_round(
    db: Session,
    match_result: MatchResult,
    created_by: User,
    round_number: int,
    round_name: str,
    round_type: str = "TECHNICAL",
    duration_minutes: int = 60,
    is_additional_round: bool = False,
) -> Interview:
    """
    Create a new interview round record for an application.

    For multi-round jobs this creates Round 2, 3, etc. while keeping
    Round 1 compatible with the existing single-round flow.
    """
    interview = Interview(
        match_result_id=match_result.id,
        scheduled_by=created_by.id,
        requested_by=created_by.id,
        round_number=round_number,
        round_name=round_name,
        round_type=round_type,
        duration_minutes=duration_minutes,
        is_additional_round=is_additional_round,
        round_status="PENDING_SCHEDULING",
        status="scheduled",
        interview_type=round_type.lower(),
    )
    db.add(interview)
    db.flush()

    _create_audit_log(
        db, created_by.id, f"INTERVIEW_ROUND_{round_number}_CREATED", match_result,
        from_state=match_result.pipeline_state, to_state=match_result.pipeline_state,
        interview_id=interview.id,
        details=json.dumps({
            "round_number": round_number,
            "round_name": round_name,
            "round_type": round_type,
            "is_additional": is_additional_round,
        }),
    )

    logger.info(
        f"[Workflow] MatchResult {match_result.id}: Round {round_number} ({round_type}) created by user {created_by.id}"
    )
    return interview


def submit_round_hm_feedback(
    db: Session,
    match_result: MatchResult,
    interview: Interview,
    hm_user: User,
    recommendation: str,  # "PASS" | "GO" | "NO_GO"
    technical_rating: Optional[int] = None,
    communication_rating: Optional[int] = None,
    problem_solving_rating: Optional[int] = None,
    role_fit_rating: Optional[int] = None,
    overall_rating: Optional[int] = None,
    comments: Optional[str] = None,
    is_final_round: bool = False,
) -> tuple[MatchResult, Interview]:
    """
    Submit HM per-round feedback/recommendation.

    Recommendations:
      - "PASS" (intermediate round): Round is passed, next round should be created/activated.
      - "GO" (final round): Final approval — transitions to COMPENSATION_DISCUSSION.
      - "NO_GO": Terminates the application pipeline → REJECTED.

    Args:
        is_final_round: True if this is the last configured round for the job.
    """
    now = datetime.now(timezone.utc)
    old_state = match_result.pipeline_state

    # Save HM ratings
    interview.hm_recommendation = recommendation
    interview.hm_feedback_submitted_at = now
    if technical_rating is not None:
        interview.hm_technical_rating = technical_rating
    if communication_rating is not None:
        interview.hm_communication_rating = communication_rating
    if problem_solving_rating is not None:
        interview.hm_problem_solving_rating = problem_solving_rating
    if role_fit_rating is not None:
        interview.hm_role_fit_rating = role_fit_rating
    if overall_rating is not None:
        interview.hm_overall_rating = overall_rating
    if comments is not None:
        interview.hm_comments = comments

    if recommendation == "NO_GO":
        # Terminate pipeline
        interview.round_status = "NO_GO"
        match_result.pipeline_state = "INTERVIEW_NO_GO"
        match_result.status = "rejected"

        _create_audit_log(
            db, hm_user.id, f"ROUND_{interview.round_number}_NO_GO", match_result,
            from_state=old_state, to_state="INTERVIEW_NO_GO",
            interview_id=interview.id,
            details=json.dumps({
                "round": interview.round_number,
                "recommendation": recommendation,
                "comments": comments,
            }),
        )

        # Cancel any pending slots for this interview
        pending_slots = db.query(InterviewSlot).filter(
            InterviewSlot.interview_id == interview.id,
            InterviewSlot.status == "proposed"
        ).all()
        for slot in pending_slots:
            slot.status = "cancelled"

        # Notify recruiter
        if match_result.recruiter_id:
            _create_notification(
                db, match_result.recruiter_id,
                subject=f"Interview NO-GO: Round {interview.round_number}",
                body=f"Hiring Manager has rejected the candidate at Round {interview.round_number}. Pipeline terminated.",
                notification_type="INTERVIEW_NO_GO",
                match_result_id=match_result.id,
            )

        logger.info(
            f"[Workflow] MatchResult {match_result.id}: Round {interview.round_number} NO_GO by HM {hm_user.id}"
        )

    elif recommendation in ("PASS", "GO"):
        interview.round_status = "PASSED"

        if is_final_round or recommendation == "GO":
            # Final round passed — transition to COMPENSATION_DISCUSSION
            _validate_transition(match_result.pipeline_state, "COMPENSATION_DISCUSSION")
            match_result.pipeline_state = "COMPENSATION_DISCUSSION"

            _create_audit_log(
                db, hm_user.id, f"ROUND_{interview.round_number}_FINAL_GO", match_result,
                from_state=old_state, to_state="COMPENSATION_DISCUSSION",
                interview_id=interview.id,
                details=json.dumps({
                    "round": interview.round_number,
                    "is_final": True,
                    "recommendation": recommendation,
                }),
            )

            # Assign CREATE_OFFER task to recruiter
            if match_result.recruiter_id:
                _create_recruiter_task(
                    db,
                    job_id=match_result.job_id,
                    candidate_id=match_result.candidate_id,
                    assigned_to=match_result.recruiter_id,
                    created_by=hm_user.id,
                    title=f"Create Offer — Final GO Received",
                    description=f"HM has given final GO after Round {interview.round_number}. Create the offer package.",
                    action_type="CREATE_OFFER",
                    match_result_id=match_result.id,
                )
                _create_notification(
                    db, match_result.recruiter_id,
                    subject="Final GO — Create Offer Now",
                    body=f"Hiring Manager has given final approval after Round {interview.round_number}. Proceed to create the offer.",
                    notification_type="INTERVIEW_GO",
                    match_result_id=match_result.id,
                )

            logger.info(
                f"[Workflow] MatchResult {match_result.id}: Round {interview.round_number} FINAL_GO → COMPENSATION_DISCUSSION"
            )

        else:
            # Intermediate round passed — keep in INTERVIEW_GO for next round
            _create_audit_log(
                db, hm_user.id, f"ROUND_{interview.round_number}_PASS", match_result,
                from_state=old_state, to_state=old_state,
                interview_id=interview.id,
                details=json.dumps({
                    "round": interview.round_number,
                    "is_final": False,
                    "recommendation": "PASS",
                }),
            )

            # Notify recruiter to schedule next round
            if match_result.recruiter_id:
                _create_notification(
                    db, match_result.recruiter_id,
                    subject=f"Round {interview.round_number} Passed — Schedule Next Round",
                    body=f"Candidate passed Round {interview.round_number}. Schedule the next interview round.",
                    notification_type="INTERVIEW_GO",
                    match_result_id=match_result.id,
                )
            # Notify HM
            if match_result.hiring_manager_id:
                _create_notification(
                    db, match_result.hiring_manager_id,
                    subject=f"Round {interview.round_number} — PASS Recorded",
                    body=f"Your feedback for Round {interview.round_number} has been saved. Recruiter will schedule the next round.",
                    notification_type="INTERVIEW_GO",
                    match_result_id=match_result.id,
                )

            logger.info(
                f"[Workflow] MatchResult {match_result.id}: Round {interview.round_number} PASS — awaiting next round"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid recommendation: '{recommendation}'. Use PASS, GO, or NO_GO.",
        )

    db.commit()
    db.refresh(match_result)
    db.refresh(interview)
    return match_result, interview


def add_additional_round(
    db: Session,
    match_result: MatchResult,
    requested_by: User,
    round_name: str,
    round_type: str = "ADDITIONAL",
    duration_minutes: int = 60,
) -> Interview:
    """
    Append an on-demand additional round (N+1) to an application.
    Allowed when match is in INTERVIEW_GO or COMPENSATION_DISCUSSION state.
    """
    allowed_states = ["INTERVIEW_GO", "INTERVIEW_CONFIRMED", "INTERVIEW_COMPLETED",
                      "WAITING_FOR_HM_FEEDBACK", "COMPENSATION_DISCUSSION"]
    if match_result.pipeline_state not in allowed_states:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Cannot add additional round in state '{match_result.pipeline_state}'.",
        )

    # Find the current max round number
    existing_rounds = get_match_interviews(db, match_result.id)
    max_round = max((r.round_number for r in existing_rounds), default=0)
    next_round = max_round + 1

    interview = create_interview_round(
        db=db,
        match_result=match_result,
        created_by=requested_by,
        round_number=next_round,
        round_name=round_name,
        round_type=round_type,
        duration_minutes=duration_minutes,
        is_additional_round=True,
    )

    # Transition back to scheduling state for the new round
    old_state = match_result.pipeline_state
    match_result.pipeline_state = "INTERVIEW_REQUESTED"

    _create_audit_log(
        db, requested_by.id, f"ADDITIONAL_ROUND_{next_round}_ADDED", match_result,
        from_state=old_state, to_state="INTERVIEW_REQUESTED",
        interview_id=interview.id,
    )

    db.commit()
    db.refresh(interview)
    return interview


# ══════════════════════════════════════════════════════════════════════════════
# OFFER APPROVAL WORKFLOW (v2)
# ══════════════════════════════════════════════════════════════════════════════

def submit_offer_for_hm_review(
    db: Session,
    offer: Offer,
    match_result: MatchResult,
    recruiter: User,
    recruiter_notes: Optional[str] = None,
) -> Offer:
    """
    Recruiter submits the draft offer to HM for review.
    Transitions offer workflow_state: DRAFT / HM_CHANGES_REQUESTED → PENDING_HM_REVIEW.
    """
    allowed = ("DRAFT", "HM_CHANGES_REQUESTED")
    if offer.workflow_state not in allowed:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Cannot submit offer for review in state '{offer.workflow_state}'.",
        )

    offer.workflow_state = "PENDING_HM_REVIEW"
    offer.status = "PENDING_HM_REVIEW"
    if recruiter_notes:
        offer.recruiter_comments = recruiter_notes

    _create_audit_log(
        db, recruiter.id, "OFFER_SUBMITTED_FOR_HM_REVIEW", match_result,
        from_state=match_result.pipeline_state, to_state=match_result.pipeline_state,
        details=json.dumps({"recruiter_notes": recruiter_notes}),
    )

    # Notify HM
    if match_result.hiring_manager_id:
        _create_notification(
            db, match_result.hiring_manager_id,
            subject="Offer Ready for Your Review",
            body=f"Recruiter {recruiter.name} has submitted an offer for your review. Please approve or request changes.",
            notification_type="OFFER_REVIEW_REQUIRED",
            match_result_id=match_result.id,
        )

        # Create HM task
        _create_recruiter_task(
            db,
            job_id=match_result.job_id,
            candidate_id=match_result.candidate_id,
            assigned_to=match_result.hiring_manager_id,
            created_by=recruiter.id,
            title="Review Offer — Action Required",
            description="A draft offer has been submitted for your review. Please approve or request changes.",
            action_type="REVIEW_OFFER",
            match_result_id=match_result.id,
            priority="HIGH",
        )

    db.commit()
    db.refresh(offer)
    logger.info(f"[Workflow] Offer {offer.id}: Submitted for HM review by recruiter {recruiter.id}")
    return offer


def hm_review_offer(
    db: Session,
    offer: Offer,
    match_result: MatchResult,
    hm_user: User,
    action: str,  # "APPROVE" | "REQUEST_CHANGES"
    hm_notes: Optional[str] = None,
) -> Offer:
    """
    HM reviews a submitted offer.

    action="APPROVE" → workflow_state = HM_APPROVED
    action="REQUEST_CHANGES" → workflow_state = HM_CHANGES_REQUESTED
    """
    if offer.workflow_state != "PENDING_HM_REVIEW":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Offer is not pending HM review (current state: '{offer.workflow_state}').",
        )

    now = datetime.now(timezone.utc)
    if hm_notes:
        offer.hm_comments = hm_notes

    if action == "APPROVE":
        offer.workflow_state = "HM_APPROVED"
        offer.status = "HM_APPROVED"
        offer.approved_by = hm_user.id
        offer.approved_at = now

        _create_audit_log(
            db, hm_user.id, "OFFER_APPROVED_BY_HM", match_result,
            from_state=match_result.pipeline_state, to_state=match_result.pipeline_state,
            details=json.dumps({"hm_notes": hm_notes}),
        )

        # Notify recruiter
        if match_result.recruiter_id:
            _create_notification(
                db, match_result.recruiter_id,
                subject="✅ Offer Approved by Hiring Manager",
                body="The offer has been approved by the Hiring Manager. You can now generate the official PDF offer letter.",
                notification_type="OFFER_APPROVED",
                match_result_id=match_result.id,
            )

        logger.info(f"[Workflow] Offer {offer.id}: APPROVED by HM {hm_user.id}")

    elif action == "REQUEST_CHANGES":
        offer.workflow_state = "HM_CHANGES_REQUESTED"
        offer.status = "HM_CHANGES_REQUESTED"

        _create_audit_log(
            db, hm_user.id, "OFFER_CHANGES_REQUESTED_BY_HM", match_result,
            from_state=match_result.pipeline_state, to_state=match_result.pipeline_state,
            details=json.dumps({"hm_notes": hm_notes}),
        )

        # Notify recruiter
        if match_result.recruiter_id:
            _create_notification(
                db, match_result.recruiter_id,
                subject="⚠️ Offer Changes Requested by Hiring Manager",
                body=f"Hiring Manager has requested changes to the offer. Notes: {hm_notes or 'See portal for details.'}",
                notification_type="OFFER_CHANGES_REQUESTED",
                match_result_id=match_result.id,
            )

        logger.info(f"[Workflow] Offer {offer.id}: CHANGES_REQUESTED by HM {hm_user.id}")

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid action: '{action}'. Use 'APPROVE' or 'REQUEST_CHANGES'.",
        )

    db.commit()
    db.refresh(offer)
    return offer


def generate_offer_pdf(
    db: Session,
    offer: Offer,
    match_result: MatchResult,
    recruiter: User,
    candidate,
    job,
    hm_user=None,
) -> Offer:
    """
    Generate the official PDF offer letter for an HM-approved offer.

    Requires offer.workflow_state == 'HM_APPROVED'.
    Transitions: HM_APPROVED → OFFER_READY.
    Stores PDF bytes in the configured storage provider.
    """
    if offer.workflow_state != "HM_APPROVED":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"PDF can only be generated for HM-approved offers (current state: '{offer.workflow_state}').",
        )

    # Generate PDF
    from app.services.offer_pdf_service import OfferPDFService
    pdf_bytes = OfferPDFService.generate(
        offer=offer,
        candidate=candidate,
        job=job,
        recruiter=recruiter,
        hm_user=hm_user,
    )

    # Store PDF
    from app.services.storage.storage_manager import get_storage
    storage = get_storage()
    pdf_key = f"offers/{offer.id}/offer_letter.pdf"
    storage.save_file(pdf_key, pdf_bytes, content_type="application/pdf")

    # Update offer record
    now = datetime.now(timezone.utc)
    offer.workflow_state = "OFFER_READY"
    offer.status = "OFFER_READY"
    offer.pdf_storage_key = pdf_key
    offer.pdf_file_name = "offer_letter.pdf"
    offer.pdf_file_size = len(pdf_bytes)
    offer.pdf_mime_type = "application/pdf"
    offer.pdf_generated_at = now
    offer.pdf_generated_by = recruiter.id

    _create_audit_log(
        db, recruiter.id, "OFFER_PDF_GENERATED", match_result,
        from_state="HM_APPROVED", to_state="OFFER_READY",
        details=json.dumps({
            "pdf_key": pdf_key,
            "size_bytes": len(pdf_bytes),
        }),
    )

    db.commit()
    db.refresh(offer)
    logger.info(f"[Workflow] Offer {offer.id}: PDF generated ({len(pdf_bytes)} bytes) → OFFER_READY")
    return offer


def submit_offer_for_review_or_send(
    db: Session,
    offer: Offer,
    match_result: MatchResult,
    recruiter: User,
    require_hm_approval: bool = True,
) -> Offer:
    """
    Convenience function that either submits to HM or sends directly.
    """
    if require_hm_approval:
        return submit_offer_for_hm_review(db, offer, match_result, recruiter)
    else:
        # Legacy path — skip HM approval
        offer.workflow_state = "HM_APPROVED"
        db.commit()
        return offer


def get_offer_pdf_bytes(offer: Offer) -> bytes:
    """
    Retrieve the generated PDF bytes for an offer.

    Raises:
        HTTPException 404: If PDF has not been generated or file not found
    """
    if not offer.pdf_storage_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Offer PDF has not been generated yet.",
        )
    from app.services.storage.storage_manager import get_storage
    storage = get_storage()
    try:
        return storage.get_file_bytes(offer.pdf_storage_key)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Offer PDF file not found in storage.",
        )


def check_and_expire_offers(db: Session) -> int:
    """
    Auto-expire offers that have passed their expiry date.
    Returns the number of offers expired.
    """
    now = datetime.now(timezone.utc)
    expired_count = 0

    pending_offers = (
        db.query(Offer)
        .filter(
            Offer.workflow_state == "SENT",
            Offer.expires_at != None,
            Offer.expires_at < now,
        )
        .all()
    )

    for offer in pending_offers:
        offer.workflow_state = "EXPIRED"
        offer.status = "EXPIRED"
        expired_count += 1
        logger.info(f"[Workflow] Offer {offer.id} auto-expired (was due {offer.expires_at})")

    if expired_count:
        db.commit()

    return expired_count

