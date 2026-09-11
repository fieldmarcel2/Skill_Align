"""
Candidate Profile and Resume Router
===================================

Endpoints:
- GET    /api/candidates/me                  (Candidate: View own profile)
- POST   /api/candidates/me                  (Candidate: Create profile)
- PUT    /api/candidates/me                  (Candidate: Update profile)
- POST   /api/candidates/me/resume           (Candidate: Upload resume file)
- POST   /api/candidates/me/skills           (Candidate: Add skill with proficiency & years)
- PUT    /api/candidates/me/skills/{skill_id}(Candidate: Update skill proficiency/years)
- DELETE /api/candidates/me/skills/{skill_id}(Candidate: Remove skill)
- GET    /api/candidates/{id}                (HR / Recruiter: View candidate profile)
- GET    /api/candidates/{id}/resume         (HR / Recruiter / Candidate owner: Secure resume download)
"""

import os
from typing import List
from pathlib import Path
from fastapi import APIRouter, Depends, status, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.config import settings
from app.core.dependencies import get_current_user, require_candidate, require_hr_or_recruiter
from app.models.user import User
from app.models.candidate import Candidate
from app.models.match_result import MatchResult
from app.schemas.candidate import (
    CandidateOut,
    CandidateProfileCreate,
    CandidateProfileUpdate,
    CandidateSkillIn,
    CandidateSkillUpdate
)
from app.schemas.matching import MatchResultOut
from app.services import candidate_service

router = APIRouter(prefix="/api/candidates", tags=["Candidates"])


# ── Candidate Self-Service ───────────────────────────────────────────────────

@router.get(
    "/me",
    response_model=CandidateOut,
    status_code=status.HTTP_200_OK,
    summary="Get own candidate profile"
)
def get_my_profile(
    db: Session = Depends(get_db),
    candidate_user: User = Depends(require_candidate)
):
    return candidate_service.get_my_profile(db, candidate_user)


from app.services.matching_service import _build_match_result_out


@router.get(
    "/me/pipeline",
    response_model=List[MatchResultOut],
    status_code=status.HTTP_200_OK,
    summary="Get candidate's job matches and pipeline statuses",
    description="Returns all job matches, current pipeline stage (Matched -> Screened -> HR Approved -> Interview Scheduled), and interview details for the logged-in candidate."
)
def get_my_pipeline(
    db: Session = Depends(get_db),
    candidate_user: User = Depends(require_candidate)
):
    candidate = db.query(Candidate).filter(Candidate.user_id == candidate_user.id).first()
    if not candidate:
        return []

    results = (
        db.query(MatchResult)
        .filter(MatchResult.candidate_id == candidate.id)
        .order_by(MatchResult.updated_at.desc())
        .all()
    )

    return [_build_match_result_out(r) for r in results]


@router.get(
    "/me/hiring",
    status_code=status.HTTP_200_OK,
    summary="Get candidate hiring details, journey timeline, and onboarding status",
)
def get_my_hiring_status(
    db: Session = Depends(get_db),
    candidate_user: User = Depends(require_candidate),
):
    """
    Returns the comprehensive hiring state, accepted offer details,
    recruitment journey timeline, and pre-onboarding checklist.
    """
    from sqlalchemy import or_
    from app.models.offer import Offer

    candidate = db.query(Candidate).filter(Candidate.user_id == candidate_user.id).first()
    if not candidate:
        return {"is_hired": False, "candidate_hiring_status": "ACTIVE", "hiring_details": None}

    # Find accepted offer or match with HIRED pipeline_state
    offer = (
        db.query(Offer)
        .filter(Offer.candidate_id == candidate.id, Offer.status == "ACCEPTED")
        .order_by(Offer.updated_at.desc())
        .first()
    )

    hired_match = None
    if offer and offer.match_result:
        hired_match = offer.match_result
    else:
        hired_match = (
            db.query(MatchResult)
            .filter(
                MatchResult.candidate_id == candidate.id,
                or_(MatchResult.pipeline_state == "HIRED", MatchResult.status == "hired"),
            )
            .order_by(MatchResult.updated_at.desc())
            .first()
        )
        if hired_match and not offer:
            offer = db.query(Offer).filter(Offer.match_result_id == hired_match.id).first()

    if not hired_match or not offer or offer.status != "ACCEPTED":
        return {
            "is_hired": False,
            "candidate_hiring_status": getattr(candidate, "hiring_status", "ACTIVE") or "ACTIVE",
            "hiring_details": None,
        }

    job = hired_match.job
    company_name = getattr(job, "department", None) or "SkillAlign Technologies"
    
    joining_date_str = "TBD"
    if offer.joining_date:
        joining_date_str = offer.joining_date.strftime("%d %b %Y") if hasattr(offer.joining_date, "strftime") else str(offer.joining_date)[:10]

    accepted_date_str = "Recent"
    if offer.accepted_at:
        accepted_date_str = offer.accepted_at.strftime("%d %b %Y") if hasattr(offer.accepted_at, "strftime") else str(offer.accepted_at)[:10]

    applied_date_str = hired_match.created_at.strftime("%d %b %Y") if hasattr(hired_match, "created_at") and hasattr(hired_match.created_at, "strftime") else "Completed"

    journey_timeline = [
        {"title": "Application Submitted", "description": "Profile matched & submitted into requisition", "status": "COMPLETED", "date": applied_date_str},
        {"title": "Candidate Shortlisted", "description": "Algorithmic profile evaluation cleared", "status": "COMPLETED", "date": "Completed"},
        {"title": "Sent to Hiring Manager", "description": "Candidate packet dispatched to HM", "status": "COMPLETED", "date": "Completed"},
        {"title": "Interview Round Evaluations", "description": "Technical & behavioral assessments concluded", "status": "COMPLETED", "date": "Completed"},
        {"title": "Final HM Decision — GO", "description": "Hiring Manager gave strategic hiring clearance", "status": "COMPLETED", "date": "Completed"},
        {"title": "Compensation Finalized", "description": "Total CTC and base package structured", "status": "COMPLETED", "date": "Completed"},
        {"title": "Offer Letter Created & Approved", "description": "Official employment proposal formalized", "status": "COMPLETED", "date": "Completed"},
        {"title": "Offer Sent to Candidate", "description": "Formal digital offer extended", "status": "COMPLETED", "date": "Completed"},
        {"title": "Offer Accepted ✓", "description": f"Accepted on {accepted_date_str}", "status": "COMPLETED", "date": accepted_date_str},
        {"title": "HIRED into Requisition ✓", "description": "Candidate successfully hired & workflow closed", "status": "COMPLETED", "date": accepted_date_str},
    ]

    pre_onboarding_checklist = [
        {"id": 1, "title": "Government Identity & Work Authorization Verification", "description": "Aadhaar / Passport / PAN document upload", "status": "PENDING", "category": "DOCUMENTS"},
        {"id": 2, "title": "Bank Account & Direct Deposit Details", "description": "Bank account & IFSC for payroll processing", "status": "PENDING", "category": "PAYROLL"},
        {"id": 3, "title": "Educational & Previous Experience Credentials", "description": "Degree certificates & previous employment reliving letters", "status": "PENDING", "category": "VERIFICATION"},
        {"id": 4, "title": "Emergency Contacts & Medical Declarations", "description": "Primary & secondary emergency contact details", "status": "PENDING", "category": "PERSONAL"},
        {"id": 5, "title": "IT Equipment & Workstation Preference", "description": "Laptop OS & shipping address confirmation", "status": "PENDING", "category": "LOGISTICS"},
    ]

    return {
        "is_hired": True,
        "candidate_hiring_status": "HIRED",
        "hiring_details": {
            "candidate_name": candidate.full_name,
            "job_title": job.title if job else "Software Engineer",
            "company_name": company_name,
            "position": job.title if job else "Software Engineer",
            "employment_type": offer.employment_type or "Full-time",
            "work_mode": offer.work_mode or "Hybrid",
            "location": offer.location or getattr(job, "location_city", "Bangalore"),
            "joining_date": joining_date_str,
            "raw_joining_date": offer.joining_date.isoformat() if offer.joining_date and hasattr(offer.joining_date, "isoformat") else str(offer.joining_date),
            "joining_status": "Upcoming",
            "reporting_manager": (
                hired_match.hiring_manager.name if hired_match and getattr(hired_match, "hiring_manager", None) else "Sarah HR"
            ),
            "recruiter": (
                offer.creator.name if offer and getattr(offer, "creator", None) else (
                    hired_match.recruiter.name if hired_match and getattr(hired_match, "recruiter", None) else "James Recruiter"
                )
            ),
            "hiring_status": "HIRED",
            "offer_id": offer.id,
            "match_id": hired_match.id,
            "ctc": float(offer.proposed_salary) if offer.proposed_salary else 0,
            "currency": offer.salary_currency or "INR",
            "accepted_at": offer.accepted_at.isoformat() if offer.accepted_at and hasattr(offer.accepted_at, "isoformat") else str(offer.accepted_at),
            "role_scope": offer.role_scope,
            "additional_terms": offer.additional_terms,
            "pdf_version": offer.pdf_version or 1,
            "journey_timeline": journey_timeline,
            "pre_onboarding_checklist": pre_onboarding_checklist,
        }
    }


@router.post(
    "/me",
    response_model=CandidateOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create candidate profile"
)
def create_my_profile(
    data: CandidateProfileCreate,
    db: Session = Depends(get_db),
    candidate_user: User = Depends(require_candidate)
):
    return candidate_service.create_profile(db, candidate_user, data)


@router.put(
    "/me",
    response_model=CandidateOut,
    status_code=status.HTTP_200_OK,
    summary="Update candidate profile"
)
def update_my_profile(
    data: CandidateProfileUpdate,
    db: Session = Depends(get_db),
    candidate_user: User = Depends(require_candidate)
):
    return candidate_service.update_profile(db, candidate_user, data)


@router.post(
    "/me/resume",
    response_model=CandidateOut,
    status_code=status.HTTP_200_OK,
    summary="Upload resume (PDF/DOC/DOCX)",
    description="Secure resume upload outside database. Validates type and size limits."
)
async def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    candidate_user: User = Depends(require_candidate)
):
    return await candidate_service.upload_resume(db, candidate_user, file)


@router.post(
    "/me/skills",
    response_model=CandidateOut,
    status_code=status.HTTP_201_CREATED,
    summary="Add skill to profile",
    description="Add a skill with proficiency (Beginner, Intermediate, Expert) and years of experience."
)
def add_my_skill(
    data: CandidateSkillIn,
    db: Session = Depends(get_db),
    candidate_user: User = Depends(require_candidate)
):
    return candidate_service.add_skill(db, candidate_user, data)


@router.put(
    "/me/skills/{skill_id}",
    response_model=CandidateOut,
    status_code=status.HTTP_200_OK,
    summary="Update skill proficiency or years"
)
def update_my_skill(
    skill_id: int,
    data: CandidateSkillUpdate,
    db: Session = Depends(get_db),
    candidate_user: User = Depends(require_candidate)
):
    return candidate_service.update_skill(db, candidate_user, skill_id, data)


@router.delete(
    "/me/skills/{skill_id}",
    response_model=CandidateOut,
    status_code=status.HTTP_200_OK,
    summary="Remove skill from profile"
)
def remove_my_skill(
    skill_id: int,
    db: Session = Depends(get_db),
    candidate_user: User = Depends(require_candidate)
):
    return candidate_service.remove_skill(db, candidate_user, skill_id)


@router.get(
    "/{candidate_id}",
    response_model=CandidateOut,
    status_code=status.HTTP_200_OK,
    summary="View candidate profile by ID (HR & Recruiter)"
)
def get_candidate_profile(
    candidate_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_hr_or_recruiter)
):
    if user.role.name == "Recruiter":
        from app.services import recruiter_assignment_service
        assigned_job_ids = recruiter_assignment_service.get_recruiter_assigned_job_ids(db, user.id)
        if not assigned_job_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You are not assigned to any job requisitions.",
            )
        matched = (
            db.query(MatchResult)
            .filter(
                MatchResult.candidate_id == candidate_id,
                MatchResult.job_id.in_(assigned_job_ids),
            )
            .first()
        )
        if not matched:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: This candidate is not matched with any jobs assigned to you.",
            )
    return candidate_service.get_candidate_by_id(db, candidate_id)
