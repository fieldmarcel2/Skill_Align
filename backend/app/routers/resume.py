"""
Router: Resume Management, Text Extraction & Deterministic Parsing
===================================================================
Implements secure resume upload, text extraction, TXT generation, rule-based parsing,
pre-signed URL generation, text preview, and deletion using AWS S3 & Boto3.

Endpoints:
- POST   /api/candidates/{candidate_id}/resume       - Upload resume (PDF/DOCX/TXT), extract text, parse data
- GET    /api/candidates/{candidate_id}/resume       - Get temporary pre-signed URL (ExpiresIn=300) for original file
- GET    /api/candidates/{candidate_id}/resume/text  - Get extracted plain text (.txt) content
- GET    /api/candidates/{candidate_id}/resume/parsed- Get structured parsed resume data (skills, exp, edu, certs)
- DELETE /api/candidates/{candidate_id}/resume       - Delete original & TXT from storage & clear DB fields

Security Rules:
- Candidates can only upload, view, or delete their own resume and extracted text.
- Recruiters, HR, and Admins can view/generate pre-signed URLs to download resumes and view parsed data.
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
    status_code=status.HTTP_201_CREATED,
    summary="Upload Candidate Resume (PDF, DOCX, TXT) and Run Extraction & Parsing",
)
async def upload_candidate_resume(
    candidate_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Uploads candidate resume, stores original in S3, extracts readable text,
    stores extracted TXT in S3, parses structured data using deterministic rules,
    and auto-synchronizes skills with the master database taxonomy.
    """
    # 1. Fetch candidate
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate with id {candidate_id} not found."
        )

    # 2. Role & Ownership Authorization
    # Only candidate owner or Admin can upload
    user_role = current_user.role.name if current_user.role else ""
    if user_role != "Admin" and candidate.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You can only upload a resume for your own profile."
        )

    # 3. Delegate to coordinator service
    result = await resume_service.process_and_store_resume(
        db=db,
        candidate=candidate,
        file=file,
    )

    return ResumeUploadResponse(**result)


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
