"""
Router: AWS S3 Resume Management for Candidates
================================================
Implements secure resume upload, pre-signed URL generation, and deletion using AWS S3 & Boto3.

Endpoints:
- POST   /api/candidates/{candidate_id}/resume  - Upload resume (PDF/DOCX) to S3
- GET    /api/candidates/{candidate_id}/resume  - Get temporary pre-signed URL (ExpiresIn=300)
- DELETE /api/candidates/{candidate_id}/resume  - Delete resume from S3 & clear database fields

Security Rules:
- Candidates can only upload, view, or delete their own resume.
- Recruiters, HR, and Admins can view/generate pre-signed URLs to download resumes.
- AWS credentials are NEVER exposed to the client.
"""

import os
import re
from datetime import datetime, timezone
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
    ResumeDeleteResponse,
)
from app.services.s3_service import s3_service

router = APIRouter(prefix="/api/candidates", tags=["Candidate Resumes"])

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/octet-stream",
}


def sanitize_filename(filename: str) -> str:
    """
    Sanitize the uploaded filename to prevent directory traversal and remove unsafe chars.
    """
    # Extract only the base name (strip any paths)
    base = os.path.basename(filename)
    # Remove any non-alphanumeric characters except dot, dash, underscore
    clean = re.sub(r"[^a-zA-Z0-9._-]", "_", base)
    return clean or "resume.pdf"


# ── Endpoint A: Upload Resume ─────────────────────────────────────────────────

@router.post(
    "/{candidate_id}/resume",
    response_model=ResumeUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload Candidate Resume to AWS S3",
)
async def upload_candidate_resume(
    candidate_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Uploads candidate resume to AWS S3 under `resumes/candidates/{candidate_id}/{filename}`.
    Deletes the old S3 object if an existing resume is on file.
    """
    # 1. Fetch candidate
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate with id {candidate_id} not found."
        )

    # 2. Role & Ownership Authorization
    # Only the candidate owner or Admin can upload
    user_role = current_user.role.name if current_user.role else ""
    if user_role != "Admin" and candidate.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You can only upload a resume for your own profile."
        )

    # 3. File extension & MIME validation
    original_filename = file.filename or "resume.pdf"
    file_ext = os.path.splitext(original_filename)[1].lower()

    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type '{file_ext}'. Allowed formats: PDF, DOCX, DOC."
        )

    content_type = file.content_type or "application/pdf"
    if content_type not in ALLOWED_MIME_TYPES and content_type != "application/octet-stream":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid MIME content type: {content_type}"
        )

    # 4. File size check
    # Read file content into memory stream (limit 10MB)
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    content = await file.read()
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB."
        )

    # 5. Delete previous S3 resume if one already exists
    if candidate.resume_s3_key:
        try:
            s3_service.delete_file(candidate.resume_s3_key)
        except Exception as e:
            # Non-blocking warning
            pass

    # 6. Prepare S3 Key
    safe_name = sanitize_filename(original_filename)
    s3_key = f"resumes/candidates/{candidate_id}/{safe_name}"

    # 7. Upload to S3
    file.file.seek(0)
    try:
        s3_service.upload_file(
            file_obj=file.file,
            s3_key=s3_key,
            content_type=content_type,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload resume to S3: {str(e)}"
        )

    # 8. Update database record
    now_utc = datetime.now(timezone.utc)
    candidate.resume_s3_key = s3_key
    candidate.resume_filename = original_filename
    candidate.resume_uploaded_at = now_utc
    candidate.resume_file_path = s3_key  # for backward compatibility

    db.commit()
    db.refresh(candidate)

    return ResumeUploadResponse(
        message="Resume uploaded successfully to AWS S3",
        candidate_id=candidate.id,
        resume_filename=candidate.resume_filename,
        resume_s3_key=candidate.resume_s3_key,
        resume_uploaded_at=candidate.resume_uploaded_at,
    )


# ── Endpoint B: Get Pre-signed URL ───────────────────────────────────────────

@router.get(
    "/{candidate_id}/resume",
    response_model=ResumeUrlResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Pre-signed S3 URL to View/Download Resume",
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
    # Recruiter, HR, Admin, or Candidate Owner
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


# ── Endpoint C: Delete Resume ─────────────────────────────────────────────────

@router.delete(
    "/{candidate_id}/resume",
    response_model=ResumeDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete Candidate Resume from AWS S3",
)
def delete_candidate_resume(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Deletes the resume from S3 and clears database columns.
    Accessible only by the Candidate owner or Admin.
    """
    # 1. Fetch candidate
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate with id {candidate_id} not found."
        )

    # 2. Role Authorization check
    user_role = current_user.role.name if current_user.role else ""
    if user_role != "Admin" and candidate.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You can only delete your own resume."
        )

    # 3. Delete from S3 if key exists
    if candidate.resume_s3_key:
        try:
            s3_service.delete_file(candidate.resume_s3_key)
        except Exception:
            pass

    # 4. Clear database columns
    candidate.resume_s3_key = None
    candidate.resume_filename = None
    candidate.resume_uploaded_at = None
    candidate.resume_file_path = None

    db.commit()

    return ResumeDeleteResponse(
        message="Resume deleted successfully",
        candidate_id=candidate.id,
    )
