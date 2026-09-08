"""
Enterprise Recruitment Workflow Router
=======================================
Implements the full recruitment lifecycle state machine endpoints.

Role permissions:
- Recruiter: shortlist, submit-to-hm, send-slots, confirm-interview, complete-interview,
             create-offer, send-offer, action-center
- HR (Hiring Manager): hm-review, hm-reject, request-interview, hm-feedback, hm-dashboard
- Candidate: select-slot (public with token), offer accept/reject (public with token)
- Admin: all read endpoints + timeline

Security: All transitions are enforced server-side. Invalid transitions raise HTTP 422.
"""

import json
import logging
from typing import List, Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.dependencies import (
    get_current_user,
    get_current_user_optional,
    require_recruiter,
    require_hr,
    require_hr_or_recruiter,
    require_admin_or_hr,
)
from app.models.user import User
from app.models.match_result import MatchResult
from app.models.interview import Interview
from app.models.interview_slot import InterviewSlot
from app.models.offer import Offer
from app.models.recruitment_task import RecruitmentTask
from app.models.audit_log import AuditLog
from app.models.notification import Notification
from app.schemas.workflow import (
    ShortlistRequest,
    SubmitToHMRequest,
    HMRejectRequest,
    RequestInterviewRequest,
    SelectSlotRequest,
    CompleteInterviewRequest,
    HMFeedbackRequest,
    CreateOfferRequest,
    UpdateOfferRequest,
    OfferRespondRequest,
    WorkflowStateOut,
    InterviewWithSlotsOut,
    InterviewSlotOut,
    InterviewFeedbackOut,
    OfferOut,
    BlacklistOut,
    AuditLogOut,
    ActionCenterItem,
    HMDashboardItem,
)
from app.services import workflow_service
from app.services.email_service import (
    send_interview_slot_selection_email,
    send_interview_confirmation_email,
    send_offer_email,
)

logger = logging.getLogger("skillalign.workflow.router")

router = APIRouter(prefix="/api/workflow", tags=["Workflow"])
offer_router = APIRouter(prefix="/api/offers", tags=["Offers"])


def _get_match_result_or_404(db: Session, match_id: int) -> MatchResult:
    mr = db.query(MatchResult).filter(MatchResult.id == match_id).first()
    if not mr:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application (MatchResult) with id {match_id} not found.",
        )
    return mr


def _get_active_interview(db: Session, match_result: MatchResult) -> Interview:
    interview = (
        db.query(Interview)
        .filter(Interview.match_result_id == match_result.id)
        .order_by(Interview.created_at.desc())
        .first()
    )
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No interview found for this application.",
        )
    return interview


def _interview_with_slots_out(interview: Interview) -> InterviewWithSlotsOut:
    slots = [
        InterviewSlotOut(
            id=s.id,
            interview_id=s.interview_id,
            slot_datetime=s.slot_datetime,
            slot_end_datetime=s.slot_end_datetime,
            status=s.status,
            proposer_name=s.proposer.name if s.proposer else None,
        )
        for s in (interview.slots or [])
    ]
    feedback_out = None
    if interview.hm_feedback:
        f = interview.hm_feedback
        feedback_out = InterviewFeedbackOut(
            id=f.id,
            interview_id=f.interview_id,
            match_result_id=f.match_result_id,
            reviewer_id=f.reviewer_id,
            reviewer_name=f.reviewer.name if f.reviewer else None,
            go_no_go=f.go_no_go,
            technical_rating=f.technical_rating,
            communication_rating=f.communication_rating,
            problem_solving_rating=f.problem_solving_rating,
            role_fit_rating=f.role_fit_rating,
            overall_rating=f.overall_rating,
            comments=f.comments,
            submitted_at=f.submitted_at,
        )
    candidate_name = None
    job_title = None
    if interview.match_result:
        if interview.match_result.candidate:
            candidate_name = interview.match_result.candidate.full_name
        if interview.match_result.job:
            job_title = interview.match_result.job.title

    return InterviewWithSlotsOut(
        id=interview.id,
        match_result_id=interview.match_result_id,
        interview_type=interview.interview_type,
        meeting_link=interview.meeting_link,
        interview_mode=interview.interview_mode,
        interview_date=interview.interview_date,
        scheduled_end=interview.scheduled_end,
        status=interview.status,
        slot_token=None,  # Never expose token in list endpoints
        candidate_selection_at=interview.candidate_selection_at,
        confirmed_at=interview.confirmed_at,
        created_at=interview.created_at,
        slots=slots,
        hm_feedback=feedback_out,
        candidate_name=candidate_name,
        job_title=job_title,
        interviewer_technical_rating=interview.interviewer_technical_rating,
        interviewer_communication_rating=interview.interviewer_communication_rating,
        interviewer_problem_solving_rating=interview.interviewer_problem_solving_rating,
        interviewer_role_fit_rating=interview.interviewer_role_fit_rating,
        interviewer_overall_rating=interview.interviewer_overall_rating,
        interviewer_comments=interview.interviewer_comments,
        interviewer_name=interview.interviewer.name if interview.interviewer else None,
        interviewer_submitted_at=interview.interviewer_submitted_at,
        # Multi-round fields
        round_number=getattr(interview, 'round_number', 1) or 1,
        round_name=getattr(interview, 'round_name', None),
        round_type=getattr(interview, 'round_type', 'TECHNICAL') or 'TECHNICAL',
        round_status=getattr(interview, 'round_status', 'PENDING_SCHEDULING') or 'PENDING_SCHEDULING',
        is_additional_round=getattr(interview, 'is_additional_round', False) or False,
        duration_minutes=getattr(interview, 'duration_minutes', None),
        hm_recommendation=getattr(interview, 'hm_recommendation', None),
        hm_technical_rating=getattr(interview, 'hm_technical_rating', None),
        hm_communication_rating=getattr(interview, 'hm_communication_rating', None),
        hm_problem_solving_rating=getattr(interview, 'hm_problem_solving_rating', None),
        hm_role_fit_rating=getattr(interview, 'hm_role_fit_rating', None),
        hm_overall_rating=getattr(interview, 'hm_overall_rating', None),
        hm_comments=getattr(interview, 'hm_comments', None),
        hm_feedback_submitted_at=getattr(interview, 'hm_feedback_submitted_at', None),
    )


def _offer_out(offer: Offer) -> OfferOut:
    hm_name = None
    mr = getattr(offer, 'match_result', None)
    if mr and getattr(mr, 'hiring_manager', None):
        hm_name = mr.hiring_manager.name

    return OfferOut(
        id=offer.id,
        match_result_id=offer.match_result_id,
        candidate_id=offer.candidate_id,
        job_id=offer.job_id,
        created_by=offer.created_by,
        salary_currency=offer.salary_currency,
        salary_min=float(offer.salary_min) if offer.salary_min else None,
        salary_max=float(offer.salary_max) if offer.salary_max else None,
        proposed_salary=float(offer.proposed_salary) if offer.proposed_salary else None,
        role_scope=offer.role_scope,
        employment_type=offer.employment_type,
        joining_date=offer.joining_date,
        joining_timeline=offer.joining_timeline,
        offer_expiry_date=offer.offer_expiry_date,
        location=offer.location,
        work_mode=offer.work_mode,
        additional_terms=offer.additional_terms,
        status=offer.status,
        sent_at=offer.sent_at,
        responded_at=offer.responded_at,
        candidate_response_note=offer.candidate_response_note,
        created_at=offer.created_at,
        updated_at=offer.updated_at,
        # Offer approval workflow fields
        workflow_state=getattr(offer, 'workflow_state', offer.status),
        approved_by=getattr(offer, 'approved_by', None),
        approved_at=getattr(offer, 'approved_at', None),
        hm_comments=getattr(offer, 'hm_comments', None),
        recruiter_comments=getattr(offer, 'recruiter_comments', None),
        # PDF fields
        pdf_file_name=getattr(offer, 'pdf_file_name', None),
        pdf_file_size=getattr(offer, 'pdf_file_size', None),
        pdf_generated_at=getattr(offer, 'pdf_generated_at', None),
        pdf_storage_key=getattr(offer, 'pdf_storage_key', None),
        expires_at=getattr(offer, 'expires_at', None),
        has_pdf=bool(getattr(offer, 'pdf_storage_key', None)),
        # Derived
        candidate_name=offer.candidate.full_name if offer.candidate else None,
        job_title=offer.job.title if offer.job else None,
        recruiter_name=offer.creator.name if offer.creator else None,
        hiring_manager_name=hm_name,
    )


def _workflow_state_out(mr: MatchResult) -> WorkflowStateOut:
    return WorkflowStateOut(
        match_result_id=mr.id,
        pipeline_state=mr.pipeline_state,
        hiring_manager_id=mr.hiring_manager_id,
        hiring_manager_name=mr.hiring_manager.name if mr.hiring_manager else None,
        shortlist_note=mr.shortlist_note,
        submitted_to_hm_at=mr.submitted_to_hm_at,
        hm_reviewed_at=mr.hm_reviewed_at,
        hm_rejection_reason=mr.hm_rejection_reason,
    )


# ─────────────────────────────────────────────────────────────────────────────
# RECRUITER ACTIONS
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/{match_id}/shortlist",
    response_model=WorkflowStateOut,
    status_code=status.HTTP_200_OK,
    summary="Recruiter: Shortlist a candidate",
)
def shortlist_candidate(
    match_id: int,
    data: ShortlistRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter),
):
    """Recruiter shortlists a matched candidate. Transition: CANDIDATE_MATCHED → CANDIDATE_SHORTLISTED."""
    mr = _get_match_result_or_404(db, match_id)
    mr = workflow_service.shortlist_candidate(db, mr, current_user, note=data.note)
    return WorkflowStateOut(
        match_result_id=mr.id,
        pipeline_state=mr.pipeline_state,
        shortlist_note=mr.shortlist_note,
        submitted_to_hm_at=mr.submitted_to_hm_at,
    )


@router.post(
    "/{match_id}/submit-to-hm",
    response_model=WorkflowStateOut,
    status_code=status.HTTP_200_OK,
    summary="Recruiter: Submit candidate to Hiring Manager",
)
def submit_to_hm(
    match_id: int,
    data: SubmitToHMRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter),
):
    """Recruiter submits a shortlisted candidate to the HM for review."""
    mr = _get_match_result_or_404(db, match_id)
    mr = workflow_service.submit_to_hiring_manager(
        db, mr, current_user,
        hiring_manager_id=data.hiring_manager_id,
        note=data.note,
    )
    return WorkflowStateOut(
        match_result_id=mr.id,
        pipeline_state=mr.pipeline_state,
        hiring_manager_id=mr.hiring_manager_id,
        hiring_manager_name=mr.hiring_manager.name if mr.hiring_manager else None,
        shortlist_note=mr.shortlist_note,
        submitted_to_hm_at=mr.submitted_to_hm_at,
    )


@router.post(
    "/{match_id}/send-slots-to-candidate",
    response_model=InterviewWithSlotsOut,
    status_code=status.HTTP_200_OK,
    summary="Recruiter: Forward interview slots to candidate",
)
def send_slots_to_candidate(
    match_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter),
):
    """Recruiter forwards the HM-proposed slots to candidate via email. Generates secure token."""
    mr = _get_match_result_or_404(db, match_id)
    bl = workflow_service.is_candidate_blacklisted(db, mr.candidate_id)
    if bl:
        until_str = bl.blacklisted_until.strftime("%d %B %Y")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Candidate unavailable for interview consideration until {until_str}.",
        )

    interview = _get_active_interview(db, mr)

    mr, token = workflow_service.send_slots_to_candidate(db, mr, current_user, interview)

    # Send email to candidate with slot selection link
    try:
        candidate = mr.candidate
        if candidate and candidate.user and candidate.user.email:
            slots_info = [
                {
                    "slot_datetime": s.slot_datetime,
                    "slot_end_datetime": s.slot_end_datetime,
                    "slot_id": s.id,
                }
                for s in (interview.slots or [])
                if s.status == "proposed"
            ]
            send_interview_slot_selection_email(
                candidate_email=candidate.user.email,
                candidate_name=candidate.full_name,
                job_title=mr.job.title if mr.job else "the position",
                slots=slots_info,
                selection_url=f"http://localhost:5173/select-slot?token={token}&interview_id={interview.id}",
            )
    except Exception as e:
        logger.warning(f"Failed to send slot selection email: {e}")

    db.refresh(interview)
    return _interview_with_slots_out(interview)


@router.post(
    "/{match_id}/confirm-interview",
    response_model=WorkflowStateOut,
    status_code=status.HTTP_200_OK,
    summary="Recruiter: Confirm the candidate's selected slot",
)
def confirm_interview(
    match_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter),
):
    """Recruiter confirms the interview after candidate selects a slot."""
    mr = _get_match_result_or_404(db, match_id)
    interview = _get_active_interview(db, mr)
    mr = workflow_service.confirm_interview(db, mr, current_user, interview)

    # Send confirmation email
    try:
        candidate = mr.candidate
        if candidate and candidate.user and candidate.user.email:
            send_interview_confirmation_email(
                candidate_email=candidate.user.email,
                candidate_name=candidate.full_name,
                job_title=mr.job.title if mr.job else "the position",
                interview_datetime=interview.interview_date,
                meeting_link=interview.meeting_link,
                recruiter_name=current_user.name,
            )
    except Exception as e:
        logger.warning(f"Failed to send confirmation email: {e}")

    return WorkflowStateOut(
        match_result_id=mr.id,
        pipeline_state=mr.pipeline_state,
        hiring_manager_id=mr.hiring_manager_id,
    )


@router.post(
    "/{match_id}/complete-interview",
    response_model=WorkflowStateOut,
    status_code=status.HTTP_200_OK,
    summary="Recruiter: Mark interview as completed and submit competency ratings",
)
def complete_interview(
    match_id: int,
    data: CompleteInterviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_recruiter),
):
    """Mark the interview as completed with structured competency ratings. Triggers HM feedback request."""
    mr = _get_match_result_or_404(db, match_id)
    interview = _get_active_interview(db, mr)
    mr = workflow_service.complete_interview(
        db, mr, current_user, interview,
        technical_rating=data.technical_rating,
        communication_rating=data.communication_rating,
        problem_solving_rating=data.problem_solving_rating,
        role_fit_rating=data.role_fit_rating,
        overall_rating=data.overall_rating,
        comments=data.comments or data.notes,
    )
    return WorkflowStateOut(
        match_result_id=mr.id,
        pipeline_state=mr.pipeline_state,
    )


@router.post(
    "/{match_id}/interviewer-evaluation",
    response_model=InterviewWithSlotsOut,
    status_code=status.HTTP_200_OK,
    summary="Recruiter/Interviewer: Save structured competency evaluation",
)
def save_interviewer_evaluation(
    match_id: int,
    data: CompleteInterviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_recruiter),
):
    """Save or update structured competency ratings for an interview."""
    mr = _get_match_result_or_404(db, match_id)
    interview = _get_active_interview(db, mr)
    mr, interview = workflow_service.save_interviewer_evaluation(
        db, mr, current_user, interview,
        technical_rating=data.technical_rating,
        communication_rating=data.communication_rating,
        problem_solving_rating=data.problem_solving_rating,
        role_fit_rating=data.role_fit_rating,
        overall_rating=data.overall_rating,
        comments=data.comments or data.notes,
    )
    return _interview_with_slots_out(interview)


@router.post(
    "/{match_id}/create-offer",
    response_model=OfferOut,
    status_code=status.HTTP_201_CREATED,
    summary="Recruiter: Create a compensation offer (DRAFT)",
)
def create_offer(
    match_id: int,
    data: CreateOfferRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter),
):
    """Recruiter creates a draft offer after GO decision."""
    mr = _get_match_result_or_404(db, match_id)
    mr, offer = workflow_service.create_offer(
        db, mr, current_user,
        proposed_salary=data.proposed_salary,
        salary_min=data.salary_min,
        salary_max=data.salary_max,
        salary_currency=data.salary_currency,
        role_scope=data.role_scope,
        employment_type=data.employment_type,
        joining_date=data.joining_date,
        joining_timeline=data.joining_timeline,
        offer_expiry_date=data.offer_expiry_date,
        location=data.location,
        work_mode=data.work_mode,
        additional_terms=data.additional_terms,
    )
    return _offer_out(offer)



# ─────────────────────────────────────────────────────────────────────────────
# HIRING MANAGER (HR) ACTIONS
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/{match_id}/hm-review",
    response_model=WorkflowStateOut,
    status_code=status.HTTP_200_OK,
    summary="Hiring Manager: Start reviewing a candidate",
)
def hm_start_review(
    match_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr),
):
    """HM marks a submitted candidate as 'in review'."""
    mr = _get_match_result_or_404(db, match_id)
    mr = workflow_service.hm_start_review(db, mr, current_user)
    return WorkflowStateOut(
        match_result_id=mr.id,
        pipeline_state=mr.pipeline_state,
        hm_reviewed_at=mr.hm_reviewed_at,
    )


@router.post(
    "/{match_id}/hm-reject",
    response_model=WorkflowStateOut,
    status_code=status.HTTP_200_OK,
    summary="Hiring Manager: Reject a candidate",
)
def hm_reject(
    match_id: int,
    data: HMRejectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr),
):
    """HM rejects a candidate. Transition: HIRING_MANAGER_REVIEW → REJECTED."""
    mr = _get_match_result_or_404(db, match_id)
    mr = workflow_service.hm_reject_candidate(db, mr, current_user, reason=data.reason)
    return WorkflowStateOut(
        match_result_id=mr.id,
        pipeline_state=mr.pipeline_state,
        hm_rejection_reason=mr.hm_rejection_reason,
    )


@router.post(
    "/{match_id}/request-interview",
    response_model=InterviewWithSlotsOut,
    status_code=status.HTTP_201_CREATED,
    summary="Hiring Manager: Request interview with slot proposals (min 2 slots)",
)
def request_interview(
    match_id: int,
    data: RequestInterviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr),
):
    """HM requests an interview and proposes >= 2 time slots. Notifies recruiter."""
    mr = _get_match_result_or_404(db, match_id)
    bl = workflow_service.is_candidate_blacklisted(db, mr.candidate_id)
    if bl:
        until_str = bl.blacklisted_until.strftime("%d %B %Y")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Candidate unavailable for interview consideration until {until_str}.",
        )

    # Allow from CANDIDATE_MATCHED, CANDIDATE_SHORTLISTED, SENT_TO_HIRING_MANAGER or HIRING_MANAGER_REVIEW
    if mr.pipeline_state in ("CANDIDATE_MATCHED", "CANDIDATE_SHORTLISTED", "SENT_TO_HIRING_MANAGER"):
        mr.pipeline_state = "HIRING_MANAGER_REVIEW"

    slots_data = [
        {"slot_datetime": s.slot_datetime, "slot_end_datetime": s.slot_end_datetime}
        for s in data.slots
    ]
    mr, interview = workflow_service.request_interview(
        db, mr, current_user, slots=slots_data,
        interview_type=data.interview_type,
        meeting_link=data.meeting_link,
    )
    db.refresh(interview)
    return _interview_with_slots_out(interview)


@router.post(
    "/{match_id}/hm-feedback",
    response_model=InterviewFeedbackOut,
    status_code=status.HTTP_201_CREATED,
    summary="Hiring Manager: Submit GO/NO-GO interview feedback",
)
def submit_hm_feedback(
    match_id: int,
    data: HMFeedbackRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr),
):
    """HM submits structured feedback after interview completion."""
    mr = _get_match_result_or_404(db, match_id)
    interview = _get_active_interview(db, mr)
    mr, feedback = workflow_service.submit_hm_feedback(
        db, mr, current_user, interview,
        go_no_go=data.go_no_go,
        technical_rating=data.technical_rating,
        communication_rating=data.communication_rating,
        problem_solving_rating=data.problem_solving_rating,
        role_fit_rating=data.role_fit_rating,
        overall_rating=data.overall_rating,
        comments=data.comments,
    )
    return InterviewFeedbackOut(
        id=feedback.id,
        interview_id=feedback.interview_id,
        match_result_id=feedback.match_result_id,
        reviewer_id=feedback.reviewer_id,
        reviewer_name=current_user.name,
        go_no_go=feedback.go_no_go,
        technical_rating=feedback.technical_rating,
        communication_rating=feedback.communication_rating,
        problem_solving_rating=feedback.problem_solving_rating,
        role_fit_rating=feedback.role_fit_rating,
        overall_rating=feedback.overall_rating,
        comments=feedback.comments,
        submitted_at=feedback.submitted_at,
    )


# ─────────────────────────────────────────────────────────────────────────────
# CANDIDATE ACTIONS (Public with token)
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/interviews/{interview_id}/select-slot",
    response_model=WorkflowStateOut,
    status_code=status.HTTP_200_OK,
    summary="Candidate: Select an interview slot (token-authenticated or logged-in candidate)",
)
def candidate_select_slot(
    interview_id: int,
    data: SelectSlotRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Candidate selects a time slot using either the secure token received via email/dashboard
    or their active logged-in candidate session.
    """
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found.")

    mr, slot = workflow_service.candidate_select_slot(
        db, interview, data.slot_id, token=data.token, current_user=current_user
    )
    return WorkflowStateOut(
        match_result_id=mr.id,
        pipeline_state=mr.pipeline_state,
    )


# ─────────────────────────────────────────────────────────────────────────────
# OFFER ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@offer_router.get(
    "/pending-review",
    response_model=List[OfferOut],
    summary="HM: List offers pending HM review",
)
def get_pending_hm_offers(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr),
):
    """Returns offers that have been submitted to HM for review."""
    hm_condition = or_(
        MatchResult.hiring_manager_id == current_user.id,
        MatchResult.hiring_manager_id == None,
    )
    offers = (
        db.query(Offer)
        .join(MatchResult, Offer.match_result_id == MatchResult.id)
        .filter(
            hm_condition,
            Offer.workflow_state == "PENDING_HM_REVIEW",
        )
        .order_by(Offer.updated_at.desc())
        .all()
    )
    return [_offer_out(o) for o in offers]


@offer_router.get(
    "/{offer_id}",
    response_model=OfferOut,
    summary="Get offer details",
)
def get_offer(
    offer_id: int,
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found.")

    # Allow access via token (public) or authenticated recruiter/HR/admin/candidate owner
    if token:
        if offer.offer_token != token:
            raise HTTPException(status_code=403, detail="Invalid offer token.")
    elif current_user:
        role = current_user.role.name
        if role == "Candidate":
            # Verify candidate owns this offer
            mr = db.query(MatchResult).filter(MatchResult.id == offer.match_result_id).first()
            if not mr or not mr.candidate or mr.candidate.user_id != current_user.id:
                raise HTTPException(status_code=403, detail="Access denied.")
        elif role not in ("HR", "Recruiter", "Admin"):
            raise HTTPException(status_code=403, detail="Access denied.")
    else:
        raise HTTPException(status_code=401, detail="Authentication required.")

    return _offer_out(offer)


@offer_router.get(
    "/by-match/{match_id}",
    response_model=OfferOut,
    summary="Get offer details for a match result",
)
def get_offer_by_match(
    match_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_recruiter),
):
    offer = db.query(Offer).filter(Offer.match_result_id == match_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found for this application.")
    return _offer_out(offer)


@offer_router.patch(
    "/{offer_id}",
    response_model=OfferOut,
    summary="Recruiter: Update a DRAFT offer",
)
def update_offer(
    offer_id: int,
    data: UpdateOfferRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter),
):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found.")
    editable_states = ["DRAFT", "HM_CHANGES_REQUESTED"]
    current_state = getattr(offer, 'workflow_state', offer.status) or offer.status
    if current_state not in editable_states and offer.status != "DRAFT":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only DRAFT or HM_CHANGES_REQUESTED offers can be edited.",
        )

    update_data = data.model_dump(exclude_none=True)
    for key, value in update_data.items():
        setattr(offer, key, value)

    db.commit()
    db.refresh(offer)
    return _offer_out(offer)


@offer_router.post(
    "/{offer_id}/send",
    response_model=OfferOut,
    summary="Recruiter: Send offer to candidate",
)
def send_offer(
    offer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter),
):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found.")

    mr = _get_match_result_or_404(db, offer.match_result_id)
    mr, offer, token = workflow_service.send_offer(db, mr, offer, current_user)

    # Send offer email
    try:
        candidate = mr.candidate
        if candidate and candidate.user and candidate.user.email:
            send_offer_email(
                candidate_email=candidate.user.email,
                candidate_name=candidate.full_name,
                job_title=mr.job.title if mr.job else "the position",
                proposed_salary=float(offer.proposed_salary) if offer.proposed_salary else None,
                currency=offer.salary_currency,
                employment_type=offer.employment_type,
                joining_date=offer.joining_date,
                offer_expiry_date=offer.offer_expiry_date,
                accept_url=f"http://localhost:5173/candidate/offers/{offer.id}?token={token}",
                recruiter_name=current_user.name,
            )
    except Exception as e:
        logger.warning(f"Failed to send offer email: {e}")

    return _offer_out(offer)


@offer_router.post(
    "/{offer_id}/respond",
    response_model=OfferOut,
    summary="Candidate: Accept or reject offer (public, token-authenticated)",
)
def respond_to_offer(
    offer_id: int,
    data: OfferRespondRequest,
    db: Session = Depends(get_db),
):
    """Candidate accepts or rejects an offer using the secure token."""
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found.")

    mr, offer = workflow_service.candidate_respond_to_offer(
        db, offer, token=data.token, accept=data.accept, note=data.note
    )
    return _offer_out(offer)


# ─────────────────────────────────────────────────────────────────────────────
# TIMELINE & DASHBOARD
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/{match_id}/timeline",
    response_model=List[AuditLogOut],
    summary="Get full application timeline (audit trail)",
)
def get_timeline(
    match_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_recruiter),
):
    """Full chronological audit trail for an application."""
    mr = _get_match_result_or_404(db, match_id)
    logs = workflow_service.get_application_timeline(db, match_id)
    result = []
    for log in logs:
        result.append(AuditLogOut(
            id=log.id,
            actor_id=log.actor_id,
            actor_name=log.actor.name if log.actor else "System",
            action=log.action,
            entity_type=log.entity_type,
            from_state=log.from_state,
            to_state=log.to_state,
            details=log.details,
            created_at=log.created_at,
        ))
    return result


@router.get(
    "/action-center",
    response_model=List[ActionCenterItem],
    summary="Recruiter: Get Action Center — all pending workflow actions",
)
def get_action_center(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter),
):
    """Returns all open workflow action tasks for the current recruiter, ordered by priority."""
    tasks = (
        db.query(RecruitmentTask)
        .filter(
            RecruitmentTask.assigned_to == current_user.id,
            RecruitmentTask.status == "OPEN",
            RecruitmentTask.action_type.in_([
                "SEND_SLOTS_TO_CANDIDATE",
                "CONFIRM_INTERVIEW",
                "CREATE_OFFER",
                "SEND_OFFER",
            ]),
        )
        .order_by(RecruitmentTask.created_at.desc())
        .all()
    )

    result = []
    for task in tasks:
        candidate_name = None
        job_title = task.job.title if task.job else None
        pipeline_state = None

        if task.candidate:
            candidate_name = task.candidate.full_name

        if task.match_result_id:
            mr = db.query(MatchResult).filter(MatchResult.id == task.match_result_id).first()
            if mr:
                pipeline_state = mr.pipeline_state

        result.append(ActionCenterItem(
            task_id=task.id,
            action_type=task.action_type or "GENERAL",
            title=task.title,
            description=task.description,
            priority=task.priority,
            match_result_id=task.match_result_id,
            candidate_name=candidate_name,
            job_title=job_title,
            pipeline_state=pipeline_state,
            due_at=task.due_at,
            created_at=task.created_at,
        ))
    return result


@router.get(
    "/hm-dashboard",
    response_model=dict,
    summary="Hiring Manager: Get dashboard items (pending reviews, feedback required)",
)
def get_hm_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr),
):
    """Returns all candidates awaiting HM action."""

    def build_hm_item(mr: MatchResult) -> HMDashboardItem:
        candidate_name = mr.candidate.full_name if mr.candidate else "Unknown"
        job_title = mr.job.title if mr.job else "Unknown"
        recruiter_name = mr.recruiter.name if mr.recruiter else None
        return HMDashboardItem(
            match_result_id=mr.id,
            candidate_name=candidate_name,
            job_title=job_title,
            overall_score=float(mr.overall_score),
            pipeline_state=mr.pipeline_state,
            submitted_to_hm_at=mr.submitted_to_hm_at,
            hm_reviewed_at=mr.hm_reviewed_at,
            recruiter_name=recruiter_name,
        )

    hm_condition = or_(
        MatchResult.hiring_manager_id == current_user.id,
        MatchResult.hiring_manager_id == None,
    )

    pending_review = (
        db.query(MatchResult)
        .filter(
            hm_condition,
            MatchResult.pipeline_state.in_(["SENT_TO_HIRING_MANAGER", "HIRING_MANAGER_REVIEW"]),
        )
        .order_by(MatchResult.submitted_to_hm_at.asc())
        .all()
    )

    feedback_required = (
        db.query(MatchResult)
        .filter(
            hm_condition,
            MatchResult.pipeline_state == "WAITING_FOR_HM_FEEDBACK",
        )
        .all()
    )

    interview_requested = (
        db.query(MatchResult)
        .filter(
            hm_condition,
            MatchResult.pipeline_state.in_([
                "INTERVIEW_SLOTS_PROPOSED",
                "WAITING_FOR_CANDIDATE_SLOT",
                "CANDIDATE_SLOT_SELECTED",
                "INTERVIEW_CONFIRMED",
            ]),
        )
        .all()
    )

    pending_offers = (
        db.query(Offer)
        .join(MatchResult, Offer.match_result_id == MatchResult.id)
        .filter(
            hm_condition,
            Offer.workflow_state == "PENDING_HM_REVIEW",
        )
        .order_by(Offer.updated_at.desc())
        .all()
    )

    return {
        "pending_review": [build_hm_item(mr) for mr in pending_review],
        "feedback_required": [build_hm_item(mr) for mr in feedback_required],
        "interview_in_progress": [build_hm_item(mr) for mr in interview_requested],
        "pending_offers": [_offer_out(o) for o in pending_offers],
        "counts": {
            "pending_review": len(pending_review),
            "feedback_required": len(feedback_required),
            "interview_in_progress": len(interview_requested),
            "pending_offers": len(pending_offers),
        },
    }


@router.get(
    "/{match_id}/interview",
    response_model=InterviewWithSlotsOut,
    summary="Get interview details with slots and feedback for an application",
)
def get_interview_details(
    match_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_recruiter),
):
    mr = _get_match_result_or_404(db, match_id)
    interview = _get_active_interview(db, mr)
    return _interview_with_slots_out(interview)


@router.get(
    "/{match_id}/state",
    response_model=WorkflowStateOut,
    summary="Get current workflow state for an application",
)
def get_workflow_state(
    match_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_recruiter),
):
    mr = _get_match_result_or_404(db, match_id)
    return WorkflowStateOut(
        match_result_id=mr.id,
        pipeline_state=mr.pipeline_state,
        hiring_manager_id=mr.hiring_manager_id,
        hiring_manager_name=mr.hiring_manager.name if mr.hiring_manager else None,
        shortlist_note=mr.shortlist_note,
        submitted_to_hm_at=mr.submitted_to_hm_at,
        hm_reviewed_at=mr.hm_reviewed_at,
        hm_rejection_reason=mr.hm_rejection_reason,
    )


@router.get(
    "/public/slots/{interview_id}",
    response_model=InterviewWithSlotsOut,
    summary="Public: Get interview slots for candidate selection (token required)",
)
def get_public_slots(
    interview_id: int,
    token: str = Query(..., description="Slot selection token from email"),
    db: Session = Depends(get_db),
):
    """Public endpoint for candidate to view slots before selecting. Token validates access."""
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found.")
    if not interview.slot_token or interview.slot_token != token:
        raise HTTPException(status_code=403, detail="Invalid or expired token.")
    return _interview_with_slots_out(interview)


# ═════════════════════════════════════════════════════════════════════════════
# MULTI-ROUND INTERVIEW ENDPOINTS (v3)
# ═════════════════════════════════════════════════════════════════════════════

@router.get(
    "/{match_id}/interviews",
    response_model=List[InterviewWithSlotsOut],
    summary="Get all interview rounds for an application",
)
def get_match_interview_rounds(
    match_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_recruiter),
):
    """Returns all interview rounds for an application ordered by round number."""
    _get_match_result_or_404(db, match_id)
    interviews = workflow_service.get_match_interviews(db, match_id)
    return [_interview_with_slots_out(iv) for iv in interviews]


@router.post(
    "/{match_id}/interviews/add-round",
    response_model=InterviewWithSlotsOut,
    summary="Add an on-demand additional interview round",
)
def add_additional_interview_round(
    match_id: int,
    round_name: str = Query(..., description="Name of the additional round"),
    round_type: str = Query("ADDITIONAL", description="TECHNICAL|CODING|MANAGERIAL|HR|CULTURE_FIT|ADDITIONAL"),
    duration_minutes: int = Query(60, description="Duration in minutes"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_recruiter),
):
    """
    Append an on-demand additional interview round to an existing application.
    Allowed when the candidate has passed at least one round.
    """
    mr = _get_match_result_or_404(db, match_id)
    interview = workflow_service.add_additional_round(
        db=db,
        match_result=mr,
        requested_by=current_user,
        round_name=round_name,
        round_type=round_type,
        duration_minutes=duration_minutes,
    )
    return _interview_with_slots_out(interview)


@router.post(
    "/interviews/{interview_id}/round-feedback",
    response_model=WorkflowStateOut,
    summary="HM: Submit per-round feedback and GO/PASS/NO-GO decision",
)
def submit_interview_round_feedback(
    interview_id: int,
    recommendation: str = Query(..., description="PASS | GO | NO_GO"),
    is_final_round: bool = Query(False, description="True if this is the final configured round"),
    technical_rating: Optional[int] = Query(None, ge=1, le=5),
    communication_rating: Optional[int] = Query(None, ge=1, le=5),
    problem_solving_rating: Optional[int] = Query(None, ge=1, le=5),
    role_fit_rating: Optional[int] = Query(None, ge=1, le=5),
    overall_rating: Optional[int] = Query(None, ge=1, le=5),
    comments: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr),
):
    """
    HM submits per-round feedback with PASS/GO/NO_GO recommendation.
    - PASS: Intermediate round passed, next round to be scheduled.
    - GO: Final round approved, pipeline advances to COMPENSATION_DISCUSSION.
    - NO_GO: Terminates the pipeline.
    """
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found.")

    mr = _get_match_result_or_404(db, interview.match_result_id)

    mr, interview = workflow_service.submit_round_hm_feedback(
        db=db,
        match_result=mr,
        interview=interview,
        hm_user=current_user,
        recommendation=recommendation.upper(),
        technical_rating=technical_rating,
        communication_rating=communication_rating,
        problem_solving_rating=problem_solving_rating,
        role_fit_rating=role_fit_rating,
        overall_rating=overall_rating,
        comments=comments,
        is_final_round=is_final_round,
    )
    return _workflow_state_out(mr)


# ═════════════════════════════════════════════════════════════════════════════
# OFFER APPROVAL WORKFLOW ENDPOINTS (v2)
# ═════════════════════════════════════════════════════════════════════════════

@offer_router.post(
    "/{offer_id}/submit-review",
    response_model=OfferOut,
    summary="Recruiter: Submit offer to HM for approval",
)
def submit_offer_to_hm(
    offer_id: int,
    recruiter_notes: Optional[str] = Query(None, description="Optional notes to HM"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter),
):
    """
    Recruiter submits a DRAFT offer to the Hiring Manager for review.
    Transitions: DRAFT → PENDING_HM_REVIEW.
    """
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found.")

    mr = _get_match_result_or_404(db, offer.match_result_id)

    offer = workflow_service.submit_offer_for_hm_review(
        db=db,
        offer=offer,
        match_result=mr,
        recruiter=current_user,
        recruiter_notes=recruiter_notes,
    )
    return _offer_out(offer)


@offer_router.post(
    "/{offer_id}/hm-review",
    response_model=OfferOut,
    summary="HM: Approve or request changes to an offer",
)
def hm_review_offer_endpoint(
    offer_id: int,
    action: str = Query(..., description="APPROVE | REQUEST_CHANGES"),
    hm_notes: Optional[str] = Query(None, description="Notes / change requests"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr),
):
    """
    HM reviews a submitted offer and either approves or requests changes.
    - APPROVE → HM_APPROVED (recruiter can now generate PDF)
    - REQUEST_CHANGES → HM_CHANGES_REQUESTED (recruiter edits and resubmits)
    """
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found.")

    mr = _get_match_result_or_404(db, offer.match_result_id)

    offer = workflow_service.hm_review_offer(
        db=db,
        offer=offer,
        match_result=mr,
        hm_user=current_user,
        action=action.upper(),
        hm_notes=hm_notes,
    )
    return _offer_out(offer)


@offer_router.post(
    "/{offer_id}/generate-pdf",
    response_model=OfferOut,
    summary="Recruiter: Generate official PDF offer letter",
)
def generate_pdf_offer(
    offer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter),
):
    """
    Generate the official PDF offer letter for an HM-approved offer.
    Requires workflow_state == HM_APPROVED.
    Transitions: HM_APPROVED → OFFER_READY.
    """
    from app.models.candidate import Candidate
    from app.models.job import Job
    from app.models.user import User as UserModel

    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found.")

    mr = _get_match_result_or_404(db, offer.match_result_id)
    candidate = db.query(Candidate).filter(Candidate.id == offer.candidate_id).first()
    job = db.query(Job).filter(Job.id == offer.job_id).first()
    hm_user = None
    if mr.hiring_manager_id:
        hm_user = db.query(UserModel).filter(UserModel.id == mr.hiring_manager_id).first()

    offer = workflow_service.generate_offer_pdf(
        db=db,
        offer=offer,
        match_result=mr,
        recruiter=current_user,
        candidate=candidate,
        job=job,
        hm_user=hm_user,
    )
    return _offer_out(offer)


@offer_router.get(
    "/{offer_id}/pdf",
    summary="Recruiter/HM: Download generated offer PDF",
)
def download_offer_pdf(
    offer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_recruiter),
):
    """Download the generated offer letter PDF (HR/Recruiter access)."""
    from fastapi.responses import Response

    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found.")

    pdf_bytes = workflow_service.get_offer_pdf_bytes(offer)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=\"offer_letter_{offer_id}.pdf\"",
            "Content-Length": str(len(pdf_bytes)),
        },
    )


@offer_router.get(
    "/candidate/{token}/pdf",
    summary="Candidate: Download secure offer PDF using secure token",
)
def candidate_download_offer_pdf(
    token: str,
    db: Session = Depends(get_db),
):
    """Public endpoint — candidate downloads their offer PDF using the secure offer token."""
    from fastapi.responses import Response

    offer = db.query(Offer).filter(Offer.offer_token == token).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found or token invalid.")

    # Check expiry
    now = datetime.now(timezone.utc)
    if offer.token_expires_at and offer.token_expires_at < now:
        raise HTTPException(status_code=410, detail="Offer token has expired.")

    if not offer.pdf_storage_key:
        raise HTTPException(status_code=404, detail="Offer PDF has not been generated yet.")

    pdf_bytes = workflow_service.get_offer_pdf_bytes(offer)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": "inline; filename=\"offer_letter.pdf\"",
            "Content-Length": str(len(pdf_bytes)),
        },
    )

