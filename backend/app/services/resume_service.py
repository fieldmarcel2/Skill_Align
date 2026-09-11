"""
Resume Processing Coordinator Service
======================================
Coordinates the async resume pipeline:

store_resume_and_queue():
  1. File validation (PDF, DOCX, DOC, TXT, max size 10MB)
  2. Store original file to S3/local storage
  3. Update candidate DB with S3 key and filename
  4. Queue process_resume_task in Celery (resume_processing queue)
  5. Return quickly with processing status

The actual heavy work (text extraction, parsing, skill sync) is done
by the Celery worker in app/tasks/resume_tasks.py.

For backward compatibility, process_and_store_resume() is kept as a
synchronous helper for admin/testing use cases.
"""

import io
import json
import os
import re
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.candidate import Candidate
from app.models.candidate_skill import CandidateSkill
from app.models.skill import Skill
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


async def store_resume_and_queue(
    db: Session,
    candidate: Candidate,
    file: UploadFile,
) -> Dict[str, Any]:
    """
    Store the original resume to S3 and queue async processing.
    Returns immediately with a task_id for status polling.
    """
    original_filename = file.filename or "resume.pdf"
    file_ext = os.path.splitext(original_filename)[1].lower()

    # 1. Validation
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type '{file_ext}'. Allowed: PDF (.pdf), Word (.docx, .doc), Text (.txt).",
        )

    content_bytes = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content_bytes) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB.",
        )

    # 2. Prepare S3 keys
    safe_name = sanitize_filename(original_filename)
    original_s3_key = f"resumes/original/{candidate.id}/{safe_name}"
    content_type = file.content_type or "application/pdf"

    # Delete previous files
    if candidate.resume_s3_key:
        s3_service.delete_file(candidate.resume_s3_key)
    if candidate.resume_extracted_text_s3_key:
        s3_service.delete_file(candidate.resume_extracted_text_s3_key)

    # 3. Store original to S3
    try:
        s3_service.upload_file(
            file_obj=io.BytesIO(content_bytes),
            s3_key=original_s3_key,
            content_type=content_type,
        )
    except Exception as e:
        logger.error(f"Failed to store resume in storage: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload resume to storage: {str(e)}",
        )

    # 4. Update candidate record (quick metadata update)
    now_utc = datetime.now(timezone.utc)
    candidate.resume_s3_key = original_s3_key
    candidate.resume_filename = original_filename
    candidate.resume_uploaded_at = now_utc
    candidate.resume_file_path = original_s3_key  # backward compat
    # Clear old parsed data since we're reprocessing
    candidate.resume_parsed_at = None
    candidate.extracted_data = None
    candidate.resume_raw_text = None
    db.commit()
    db.refresh(candidate)

    # 5. Check if Celery worker is active; if not, execute synchronously immediately
    task_id = None
    processed_immediately = False

    def _check_celery_worker():
        try:
            import socket
            from urllib.parse import urlparse
            broker = settings.effective_celery_broker() if callable(getattr(settings, "effective_celery_broker", None)) else getattr(settings, "REDIS_URL", "redis://localhost:6379/0")
            parsed = urlparse(broker)
            host = parsed.hostname or "127.0.0.1"
            port = parsed.port or 6379
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(0.2)
            res = s.connect_ex((host, port))
            s.close()
            if res != 0:
                return False
            from app.celery_app import celery_app
            insp = celery_app.control.inspect(timeout=0.25)
            return bool(insp and insp.ping())
        except Exception:
            return False

    try:
        if _check_celery_worker():
            from app.celery_app import celery_app
            from app.tasks.resume_tasks import process_resume_task
            task = process_resume_task.apply_async(
                args=[candidate.id, original_s3_key, original_filename, content_type],
                queue="resume_processing",
            )
            task_id = task.id
            logger.info(f"Resume task queued to Celery: task_id={task_id} for candidate_id={candidate.id}")
        else:
            logger.info(f"No active Celery workers found — processing resume immediately for candidate_id={candidate.id}")
            from app.tasks.resume_tasks import process_resume_task
            sync_res = process_resume_task.apply(
                args=[candidate.id, original_s3_key, original_filename, content_type]
            )
            task_id = "sync-completed"
            processed_immediately = True
            db.refresh(candidate)
            logger.info(f"Resume processed immediately for candidate_id={candidate.id}")
    except Exception as e:
        logger.error(f"Error in async dispatch; attempting direct execution: {e}")
        try:
            from app.tasks.resume_tasks import process_resume_task
            sync_res = process_resume_task.apply(
                args=[candidate.id, original_s3_key, original_filename, content_type]
            )
            task_id = "sync-completed"
            processed_immediately = True
            db.refresh(candidate)
        except Exception as fallback_err:
            logger.error(f"Direct execution failed: {fallback_err}")

    status_str = "completed" if processed_immediately else "processing"
    msg_str = (
        "Resume uploaded and processed successfully."
        if processed_immediately
        else "Resume uploaded successfully. Processing has been queued."
    )

    parsed_dict = None
    if candidate.extracted_data:
        try:
            parsed_dict = json.loads(candidate.extracted_data)
        except Exception:
            pass

    auto_skills = []
    if candidate.skills:
        auto_skills = [
            cs.skill.name for cs in candidate.skills
            if getattr(cs, "source", None) == "resume" and cs.skill
        ]

    return {
        "status": status_str,
        "message": msg_str,
        "candidate_id": candidate.id,
        "task_id": task_id,
        "filename": original_filename,
        "uploaded_at": now_utc.isoformat(),
        "resume_s3_key": candidate.resume_s3_key,
        "resume_file_path": candidate.resume_file_path or candidate.resume_s3_key,
        "parsed_data": parsed_dict,
        "auto_added_skills": auto_skills,
    }


async def _process_synchronous_fallback(
    db: Session,
    candidate: Candidate,
    content_bytes: bytes,
    original_filename: str,
    content_type: str,
) -> None:
    """
    Fallback synchronous processing when Celery is unavailable.
    Used in development or when Redis is not reachable.
    """
    try:
        extracted_text, detected_format = extract_text_from_file(
            file_bytes=content_bytes,
            filename=original_filename,
            content_type=content_type,
        )
    except Exception as e:
        logger.error(f"Fallback extraction failed: {e}")
        return

    # Store extracted text
    safe_name = sanitize_filename(original_filename)
    stem_name = os.path.splitext(safe_name)[0]
    extracted_s3_key = f"resumes/extracted/{candidate.id}/{stem_name}.txt"
    try:
        s3_service.upload_text(text_content=extracted_text, s3_key=extracted_s3_key)
        candidate.resume_extracted_text_s3_key = extracted_s3_key
    except Exception:
        pass

    master_skills = db.query(Skill).all()
    master_skill_names = [s.name for s in master_skills]
    skill_lookup = {s.name.lower(): s for s in master_skills}

    parsed_data = parse_resume_text(raw_text=extracted_text, master_skills=master_skill_names)

    now_utc = datetime.now(timezone.utc)
    candidate.resume_raw_text = extracted_text
    candidate.resume_parsed_at = now_utc
    candidate.extracted_data = json.dumps(parsed_data)

    if parsed_data.get("education_degree"):
        candidate.education_degree = parsed_data["education_degree"]
    if parsed_data.get("education_institution"):
        candidate.education_institution = parsed_data["education_institution"]

    parsed_exp = float(parsed_data.get("total_experience_years", 0))
    if float(candidate.total_experience_years or 0) == 0.0 and parsed_exp > 0:
        candidate.total_experience_years = parsed_exp

    # Sync skills with source='resume'
    from app.tasks.resume_tasks import _get_evidence_snippet
    existing_skills_map = {cs.skill_id: cs for cs in candidate.skills}
    for sk_dict in parsed_data.get("skills", []):
        sk_name = sk_dict.get("name", "")
        matched_master = skill_lookup.get(sk_name.lower())
        if not matched_master:
            continue
        evidence_snippet = _get_evidence_snippet(extracted_text, sk_name)
        if matched_master.id in existing_skills_map:
            cs = existing_skills_map[matched_master.id]
            cs.evidence_text = evidence_snippet
            if evidence_snippet:
                cs.source = "resume"
        else:
            auto_years = round(min(float(parsed_exp), 2.0), 1) if parsed_exp > 0 else 0.0
            new_cs = CandidateSkill(
                candidate_id=candidate.id,
                skill_id=matched_master.id,
                source="resume",
                proficiency_level=None,  # Unknown proficiency
                years_experience=auto_years,
                evidence_text=evidence_snippet,
            )
            db.add(new_cs)
            existing_skills_map[matched_master.id] = new_cs

    db.commit()
    db.refresh(candidate)


async def process_and_store_resume(
    db: Session,
    candidate: Candidate,
    file: UploadFile,
) -> Dict[str, Any]:
    """
    DEPRECATED SYNCHRONOUS VERSION — kept for backward compatibility.
    Use store_resume_and_queue() for new async flow.
    Executes full resume extraction, storage, and deterministic parsing pipeline synchronously.
    """
    original_filename = file.filename or "resume.pdf"
    file_ext = os.path.splitext(original_filename)[1].lower()

    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type '{file_ext}'. Allowed: PDF (.pdf), Word (.docx, .doc), Text (.txt).",
        )

    content_bytes = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content_bytes) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB.",
        )

    safe_name = sanitize_filename(original_filename)
    stem_name = os.path.splitext(safe_name)[0]

    original_s3_key = f"resumes/original/{candidate.id}/{safe_name}"
    extracted_s3_key = f"resumes/extracted/{candidate.id}/{stem_name}.txt"

    if candidate.resume_s3_key:
        s3_service.delete_file(candidate.resume_s3_key)
    if candidate.resume_extracted_text_s3_key:
        s3_service.delete_file(candidate.resume_extracted_text_s3_key)

    original_bio = io.BytesIO(content_bytes)
    content_type = file.content_type or "application/pdf"
    try:
        s3_service.upload_file(file_obj=original_bio, s3_key=original_s3_key, content_type=content_type)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    try:
        extracted_text, detected_format = extract_text_from_file(
            file_bytes=content_bytes, filename=original_filename, content_type=content_type,
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    try:
        s3_service.upload_text(text_content=extracted_text, s3_key=extracted_s3_key)
    except Exception as e:
        logger.warning(f"Failed to upload extracted TXT: {e}")

    master_skills = db.query(Skill).all()
    master_skill_names = [s.name for s in master_skills]
    skill_lookup = {s.name.lower(): s for s in master_skills}

    parsed_data = parse_resume_text(raw_text=extracted_text, master_skills=master_skill_names)

    now_utc = datetime.now(timezone.utc)
    candidate.resume_s3_key = original_s3_key
    candidate.resume_extracted_text_s3_key = extracted_s3_key
    candidate.resume_filename = original_filename
    candidate.resume_uploaded_at = now_utc
    candidate.resume_parsed_at = now_utc
    candidate.resume_raw_text = extracted_text
    candidate.extracted_data = json.dumps(parsed_data)
    candidate.resume_file_path = original_s3_key

    if parsed_data.get("education_degree"):
        candidate.education_degree = parsed_data["education_degree"]
    if parsed_data.get("education_institution"):
        candidate.education_institution = parsed_data["education_institution"]

    parsed_exp = float(parsed_data.get("total_experience_years", 0))
    if float(candidate.total_experience_years or 0) == 0.0 and parsed_exp > 0:
        candidate.total_experience_years = parsed_exp

    existing_skills_map = {cs.skill_id: cs for cs in candidate.skills}
    added_skills = []

    for sk_dict in parsed_data.get("skills", []):
        sk_name = sk_dict.get("name", "")
        matched_master = skill_lookup.get(sk_name.lower())
        if not matched_master:
            continue
        evidence_snippet = _get_evidence_snippet(extracted_text, sk_name)
        if matched_master.id in existing_skills_map:
            cs = existing_skills_map[matched_master.id]
            cs.evidence_text = evidence_snippet
            if evidence_snippet:
                cs.source = "resume"
        else:
            auto_years = round(min(float(parsed_exp), 2.0), 1) if parsed_exp > 0 else 1.0
            new_cs = CandidateSkill(
                candidate_id=candidate.id,
                skill_id=matched_master.id,
                source="resume",
                proficiency_level=None,  # Unknown proficiency — not Expert
                years_experience=auto_years,
                evidence_text=evidence_snippet,
            )
            db.add(new_cs)
            existing_skills_map[matched_master.id] = new_cs
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
