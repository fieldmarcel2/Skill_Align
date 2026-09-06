"""
Router: Resume Management, Text Extraction & Deterministic Parsing
===================================================================
Async Resume Pipeline (v2.0):
  POST /{id}/resume   → Stores original file to S3 + queues processing task (async)
  GET  /{id}/resume/status → Poll processing status (queued/processing/completed/failed)
  GET  /{id}/resume        → Pre-signed URL for original file
  GET  /{id}/resume/text   → Extracted plain text
  GET  /{id}/resume/parsed → Structured parsed data
  DELETE /{id}/resume      → Delete files and clear DB

Security Rules:
- Candidates can only upload, view, or delete their own resume.
- Recruiters, HR, and Admins can view/download resumes and parsed data.
- AWS credentials are NEVER exposed to the client.
"""

import json
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.config import settings
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.candidate import Candidate
from app.schemas.resume import (
    ResumeUploadResponse,
    ResumeStatusResponse,
    ResumeUrlResponse,
    ResumeTextResponse,
    ParsedResumeResponse,
    ResumeDeleteResponse,
)
from app.services.s3_service import s3_service
from app.services import resume_service

logger = logging.getLogger("skillalign.resume_router")

router = APIRouter(prefix="/api/candidates", tags=["Candidate Resumes"])


# ── Endpoint A: Upload Resume (with Extraction & Deterministic Parsing) ──────

@router.post(
    "/{candidate_id}/resume",
    response_model=ResumeUploadResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload Candidate Resume (PDF, DOCX, TXT) — Async Processing",
    description=(
        "Stores the original resume to S3 immediately, then queues async processing "
        "(text extraction, parsing, skill sync, auto-matching). "
        "Returns a task_id for status polling via GET /{id}/resume/status. "
        "Processing typically completes within 5-30 seconds depending on file size."
    )
)
async def upload_candidate_resume(
    candidate_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Async resume upload: stores original + queues processing.
    Returns immediately with processing status.
    """
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate with id {candidate_id} not found."
        )

    user_role = current_user.role.name if current_user.role else ""
    if user_role != "Admin" and candidate.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You can only upload a resume for your own profile."
        )

    result = await resume_service.store_resume_and_queue(
        db=db,
        candidate=candidate,
        file=file,
    )

    return ResumeUploadResponse(**result)


# ── Endpoint: Resume Processing Status ──────────────────────────────────────

@router.get(
    "/{candidate_id}/resume/status",
    response_model=ResumeStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Resume Processing Status",
    description="Poll this endpoint to check if async resume processing has completed."
)
def get_resume_status(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate with id {candidate_id} not found."
        )

    user_role = current_user.role.name if current_user.role else ""
    is_privileged = user_role in ["HR", "Recruiter", "Admin"]
    is_owner = candidate.user_id == current_user.id
    if not is_privileged and not is_owner:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden.")

    if not candidate.resume_filename:
        processing_status = "not_uploaded"
    elif candidate.resume_parsed_at is None:
        processing_status = "processing"
    else:
        processing_status = "completed"

    return ResumeStatusResponse(
        candidate_id=candidate.id,
        processing_status=processing_status,
        filename=candidate.resume_filename,
        uploaded_at=candidate.resume_uploaded_at,
        parsed_at=candidate.resume_parsed_at,
    )


# ── Endpoint B: Get Pre-signed URL for Original Resume ────────────────────────

@router.get(
    "/{candidate_id}/resume",
    response_model=ResumeUrlResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Pre-signed S3 URL to View/Download Original Resume",
)
def get_candidate_resume_url(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generates a secure, temporary pre-signed URL with ExpiresIn=300 (5 minutes).
    Accessible by Candidate (own profile), Recruiter, HR, and Admin.
    """
    # 1. Fetch candidate
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate with id {candidate_id} not found."
        )

    # 2. Check if candidate has uploaded a resume
    if not candidate.resume_s3_key and not candidate.resume_file_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No resume uploaded for this candidate."
        )

    # 3. Role Authorization check
    user_role = current_user.role.name if current_user.role else ""
    is_privileged = user_role in ["HR", "Recruiter", "Admin"]
    is_owner = candidate.user_id == current_user.id

    if not is_privileged and not is_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You do not have permission to view this candidate's resume."
        )

    # 4. Generate pre-signed URL via S3 service
    s3_key = candidate.resume_s3_key or candidate.resume_file_path
    try:
        presigned_url = s3_service.generate_presigned_url(
            s3_key=s3_key,
            expires_in=settings.S3_PRESIGNED_URL_EXPIRES_SECONDS,
            original_filename=candidate.resume_filename,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate secure resume URL: {str(e)}"
        )

    return ResumeUrlResponse(
        resume_url=presigned_url,
        filename=candidate.resume_filename,
        expires_in_seconds=settings.S3_PRESIGNED_URL_EXPIRES_SECONDS,
    )


# ── Endpoint C: Get Extracted Text (.txt) ────────────────────────────────────

@router.get(
    "/{candidate_id}/resume/text",
    response_model=ResumeTextResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Extracted Plain Text (.txt) of Candidate Resume",
)
def get_candidate_resume_text(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns the clean extracted plain text representation of the resume.
    Accessible by Candidate (own profile), Recruiter, HR, and Admin.
    """
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate with id {candidate_id} not found."
        )

    user_role = current_user.role.name if current_user.role else ""
    is_privileged = user_role in ["HR", "Recruiter", "Admin"]
    is_owner = candidate.user_id == current_user.id

    if not is_privileged and not is_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You do not have permission to view this extracted text."
        )

    raw_text = candidate.resume_raw_text
    if not raw_text and candidate.resume_extracted_text_s3_key:
        try:
            raw_text = s3_service.get_text(candidate.resume_extracted_text_s3_key)
        except Exception:
            raw_text = None

    if not raw_text:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No extracted text available for this candidate's resume."
        )

    return ResumeTextResponse(
        candidate_id=candidate.id,
        filename=candidate.resume_filename,
        raw_text=raw_text,
        extracted_text_s3_key=candidate.resume_extracted_text_s3_key,
        parsed_at=candidate.resume_parsed_at,
    )


# ── Endpoint D: Get Structured Parsed Resume Data ────────────────────────────

@router.get(
    "/{candidate_id}/resume/parsed",
    response_model=ParsedResumeResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Structured Parsed Data (Skills, Experience, Education, Certifications)",
)
def get_candidate_parsed_resume(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns structured parsed fields extracted deterministically from resume text.
    Accessible by Candidate (own profile), Recruiter, HR, and Admin.
    """
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate with id {candidate_id} not found."
        )

    user_role = current_user.role.name if current_user.role else ""
    is_privileged = user_role in ["HR", "Recruiter", "Admin"]
    is_owner = candidate.user_id == current_user.id

    if not is_privileged and not is_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You do not have permission to view this parsed data."
        )

    if not candidate.extracted_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No parsed resume data available for this candidate."
        )

    try:
        parsed_dict = json.loads(candidate.extracted_data)
    except Exception:
        parsed_dict = {}

    return ParsedResumeResponse(
        candidate_id=candidate.id,
        parsed_data=parsed_dict,
        parsed_at=candidate.resume_parsed_at,
    )


# ── Endpoint E: Delete Resume & Extracted Artifacts ──────────────────────────

@router.delete(
    "/{candidate_id}/resume",
    response_model=ResumeDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete Candidate Resume & Extracted Documents from Storage",
)
def delete_candidate_resume(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Deletes original file and extracted TXT from storage and clears database columns.
    Accessible only by the Candidate owner or Admin.
    """
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate with id {candidate_id} not found."
        )

    user_role = current_user.role.name if current_user.role else ""
    if user_role != "Admin" and candidate.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You can only delete your own resume."
        )

    # Delete original from S3
    if candidate.resume_s3_key:
        s3_service.delete_file(candidate.resume_s3_key)
    # Delete extracted text from S3
    if candidate.resume_extracted_text_s3_key:
        s3_service.delete_file(candidate.resume_extracted_text_s3_key)

    # Clear database columns
    candidate.resume_s3_key = None
    candidate.resume_extracted_text_s3_key = None
    candidate.resume_filename = None
    candidate.resume_uploaded_at = None
    candidate.resume_parsed_at = None
    candidate.resume_raw_text = None
    candidate.extracted_data = None
    candidate.resume_file_path = None

    db.commit()

    return ResumeDeleteResponse(
        message="Resume and extracted documents deleted successfully",
        candidate_id=candidate.id,
    )
