"""
Resume Processing Coordinator Service
======================================
Coordinates the complete end-to-end resume pipeline:
1. File validation (PDF, DOCX, DOC, TXT, max size 10MB)
2. Dual-path S3 storage:
   - Original: `resumes/original/{candidate_id}/{filename}`
   - Extracted TXT: `resumes/extracted/{candidate_id}/{stem}.txt`
3. Deterministic text extraction (`resume_text_extractor`)
4. Rule-based structured parsing (`resume_txt_parser`)
5. Persistence into Candidate model & auto-syncing skills into CandidateSkill records.

Zero NLP / Zero LLMs / Zero RAG.
Deterministic, maintainable, explainable.
"""

import json
import os
import re
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Optional

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.candidate import Candidate
from app.models.candidate_skill import CandidateSkill
from app.models.skill import Skill
from app.models.user import User
from app.services.s3_service import s3_service
from app.services.resume_text_extractor import extract_text_from_file
from app.services.resume_txt_parser import parse_resume_text

logger = logging.getLogger("skillalign.resume")

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt"}


def sanitize_filename(filename: str) -> str:
    """Sanitize the uploaded filename to prevent directory traversal and remove unsafe chars."""
    base = os.path.basename(filename)
    clean = re.sub(r"[^a-zA-Z0-9._-]", "_", base)
    return clean or "resume.pdf"


async def process_and_store_resume(
    db: Session,
    candidate: Candidate,
    file: UploadFile,
) -> Dict[str, Any]:
    """
    Executes full resume extraction, storage, and deterministic parsing pipeline.
    """
    original_filename = file.filename or "resume.pdf"
    file_ext = os.path.splitext(original_filename)[1].lower()

    # 1. Validation
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type '{file_ext}'. Allowed formats: PDF (.pdf), Word (.docx, .doc), Text (.txt)."
        )

    # Read binary bytes
    content_bytes = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content_bytes) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB."
        )

    # 2. Prepare Dual Storage Keys
    safe_name = sanitize_filename(original_filename)
    stem_name = os.path.splitext(safe_name)[0]

    original_s3_key = f"resumes/original/{candidate.id}/{safe_name}"
    extracted_s3_key = f"resumes/extracted/{candidate.id}/{stem_name}.txt"

    # Delete previous S3 files if present
    if candidate.resume_s3_key:
        s3_service.delete_file(candidate.resume_s3_key)
    if candidate.resume_extracted_text_s3_key:
        s3_service.delete_file(candidate.resume_extracted_text_s3_key)

    # 3. Store Original File
    import io
    original_bio = io.BytesIO(content_bytes)
    content_type = file.content_type or "application/pdf"
    try:
        s3_service.upload_file(
            file_obj=original_bio,
            s3_key=original_s3_key,
            content_type=content_type,
        )
    except Exception as e:
        logger.error(f"Failed to store original resume in storage: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload original resume to storage: {str(e)}"
        )

    # 4. Extract Readable Text
    try:
        extracted_text, detected_format = extract_text_from_file(
            file_bytes=content_bytes,
            filename=original_filename,
            content_type=content_type,
        )
    except ValueError as ve:
        logger.warning(f"Text extraction warning for candidate {candidate.id}: {ve}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Text extraction failed: {str(ve)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error extracting text: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal document extraction error: {str(e)}"
        )

    # 5. Store Extracted TXT File
    try:
        s3_service.upload_text(
            text_content=extracted_text,
            s3_key=extracted_s3_key,
        )
    except Exception as e:
        logger.warning(f"Warning: Failed to upload extracted TXT to storage: {e}")

    # 6. Parse Structured Data
    # Fetch master skill names from taxonomy for cross-referencing
    master_skills = db.query(Skill).all()
    master_skill_names = [s.name for s in master_skills]
    skill_lookup = {s.name.lower(): s for s in master_skills}

    parsed_data = parse_resume_text(
        raw_text=extracted_text,
        master_skills=master_skill_names,
    )

    # 7. Update Candidate Record
    now_utc = datetime.now(timezone.utc)
    candidate.resume_s3_key = original_s3_key
    candidate.resume_extracted_text_s3_key = extracted_s3_key
    candidate.resume_filename = original_filename
    candidate.resume_uploaded_at = now_utc
    candidate.resume_parsed_at = now_utc
    candidate.resume_raw_text = extracted_text
    candidate.extracted_data = json.dumps(parsed_data)
    candidate.resume_file_path = original_s3_key  # backward compat

    if parsed_data.get("education_degree"):
        candidate.education_degree = parsed_data["education_degree"]
    if parsed_data.get("education_institution"):
        candidate.education_institution = parsed_data["education_institution"]

    # Auto-update experience if current candidate experience is 0
    parsed_exp = float(parsed_data.get("total_experience_years", 0))
    if float(candidate.total_experience_years or 0) == 0.0 and parsed_exp > 0:
        candidate.total_experience_years = parsed_exp

    # 8. Auto-synchronize Candidate Skills with Master Taxonomy
    existing_skill_ids = {cs.skill_id for cs in candidate.skills}
    added_skills = []

    for sk_dict in parsed_data.get("skills", []):
        sk_name = sk_dict.get("name", "")
        matched_master = skill_lookup.get(sk_name.lower())
        if matched_master and matched_master.id not in existing_skill_ids:
            # Cap auto-synced years at min(2.0, parsed_exp) so we don't assign
            # the full 10-year career tenure to each individual skill discovered.
            # HR/Recruiters can manually adjust if needed.
            auto_years = round(min(float(parsed_exp), 2.0), 1) if parsed_exp > 0 else 1.0
            new_cs = CandidateSkill(
                candidate_id=candidate.id,
                skill_id=matched_master.id,
                proficiency_level="Intermediate",
                years_experience=auto_years,
            )
            db.add(new_cs)
            existing_skill_ids.add(matched_master.id)
            added_skills.append(matched_master.name)

    db.commit()
    db.refresh(candidate)

    return {
        "status": "success",
        "message": "Resume uploaded, text extracted, and profile parsed successfully.",
        "candidate_id": candidate.id,
        "filename": candidate.resume_filename,
        "format": detected_format,
        "original_s3_key": candidate.resume_s3_key,
        "extracted_text_s3_key": candidate.resume_extracted_text_s3_key,
        "uploaded_at": candidate.resume_uploaded_at,
        "parsed_at": candidate.resume_parsed_at,
        "parsed_data": parsed_data,
        "auto_added_skills": added_skills,
    }
