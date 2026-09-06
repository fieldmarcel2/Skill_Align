"""
Resume Processing Celery Tasks
================================
Queue: resume_processing

Handles async resume text extraction, structured parsing, skill extraction
with evidence, candidate profile update, and matching trigger.

Workflow (Trigger A — Candidate Resume/Profile Change):
  Candidate uploads resume
    → store_resume_and_queue() stores original in S3 → returns quickly
    → process_resume_task queued in Redis
    → Worker picks up task
    → Text extraction (PDF/DOCX/TXT)
    → Store extracted .txt to S3
    → Parse structured data (deterministic regex)
    → Extract skills with evidence snippets
    → Normalize skills against master taxonomy
    → Update candidate_skills (source='resume', evidence_text=snippet)
    → Update candidate profile (degree, experience, education)
    → Enqueue run_candidate_matching_task for auto-matching
"""

import io
import json
import logging
import re
from datetime import datetime, timezone
from typing import Optional

from celery import shared_task
from celery.utils.log import get_task_logger
from sqlalchemy.orm import Session

from app.celery_app import celery_app
from app.database.session import SessionLocal
from app.models.candidate import Candidate
from app.models.candidate_skill import CandidateSkill
from app.models.skill import Skill
from app.services.s3_service import s3_service
from app.services.resume_text_extractor import extract_text_from_file
from app.services.resume_txt_parser import parse_resume_text

logger = get_task_logger(__name__)


def _get_evidence_snippet(raw_text: str, skill_name: str, context_chars: int = 150) -> Optional[str]:
    """
    Extract a clean, complete sentence or line from resume text proving the skill,
    avoiding chopped words, sliced prefixes, or mid-sentence cut-offs.
    """
    if not raw_text or not skill_name:
        return None

    skill_lower = skill_name.lower().strip()
    variants = [re.escape(skill_name)]
    if skill_lower == "postgresql":
        variants.append(r"postgre\s*sql")
    elif skill_lower == "mysql":
        variants.append(r"my\s*sql")
    elif skill_lower == "cloudwatch":
        variants.append(r"cloud\s*watch")
    elif skill_lower == "devops":
        variants.append(r"dev\s*ops")
    elif skill_lower == "javascript":
        variants.append(r"java\s*script")
    elif skill_lower == "typescript":
        variants.append(r"type\s*script")
    elif skill_lower == "github":
        variants.append(r"git\s*hub")

    escaped = r"(?:" + "|".join(variants) + r")"

    # 1. Search for bullet points in experience or projects mentioning the skill
    bullet_regex = re.compile(r'^[•\-\*]\s*([^\n]*?\b' + escaped + r'\b[^\n]*)', re.MULTILINE | re.IGNORECASE)
    bullet_match = bullet_regex.search(raw_text)
    if bullet_match:
        cand = bullet_match.group(1).strip()
        cand = re.sub(r'^[•\-\*\s]+', '', cand).strip()
        if len(cand) >= 12:
            return cand[:250]

    # 2. Search for technical skills category line (e.g., "Databases: PostgreSQL, MySQL, Amazon RDS")
    cat_regex = re.compile(r'^([A-Za-z0-9\s&/()\-]+:\s*[^\n]*?\b' + escaped + r'\b[^\n]*)', re.MULTILINE | re.IGNORECASE)
    cat_match = cat_regex.search(raw_text)
    if cat_match:
        cand = cat_match.group(1).strip()
        cand = re.sub(r'^[•\-\*\s]+', '', cand).strip()
        if len(cand) >= 8:
            return cand[:250]

    # 3. Search for any full single line containing the skill
    line_regex = re.compile(r'^([^\n]*?\b' + escaped + r'\b[^\n]*)', re.MULTILINE | re.IGNORECASE)
    line_match = line_regex.search(raw_text)
    if line_match:
        cand = line_match.group(1).strip()
        cand = re.sub(r'^[•\-\*\s]+', '', cand).strip()
        if len(cand) >= 8:
            return cand[:250]

    # 4. Sentence boundary fallback
    pattern = re.compile(r'\b' + escaped + r'\b', re.IGNORECASE)
    match = pattern.search(raw_text)
    if not match:
        pattern = re.compile(escaped, re.IGNORECASE)
        match = pattern.search(raw_text)
        if not match:
            return None

    start = max(0, match.start() - 100)
    pre = raw_text[start:match.start()]
    sent_breaks = [m.end() for m in re.finditer(r'[\.\n•\r]\s*', pre)]
    act_start = start + sent_breaks[-1] if sent_breaks else start

    end = min(len(raw_text), match.end() + 100)
    post = raw_text[match.end():end]
    post_breaks = [m.start() for m in re.finditer(r'[\.\n•\r]', post)]
    act_end = match.end() + post_breaks[0] if post_breaks else end

    snippet = raw_text[act_start:act_end].strip()
    snippet = re.sub(r'^[•\-\*,\.\s]+', '', snippet)
    return snippet[:250] if snippet else None


@celery_app.task(
    bind=True,
    name="app.tasks.resume_tasks.process_resume_task",
    queue="resume_processing",
    max_retries=3,
    default_retry_delay=30,
    acks_late=True,
)
def process_resume_task(
    self,
    candidate_id: int,
    s3_key: str,
    original_filename: str,
    content_type: str = "application/pdf",
) -> dict:
    """
    Celery task: Full async resume processing pipeline.

    Steps:
    1. Download original file bytes from S3
    2. Extract readable text (PDF/DOCX/TXT)
    3. Store extracted .txt artifact back to S3
    4. Parse structured data (deterministic regex)
    5. Extract skills with evidence snippets
    6. Normalize against master skill taxonomy
    7. Upsert candidate_skills (source='resume')
    8. Update candidate profile fields
    9. Trigger auto-matching for active jobs
    """
    db: Session = SessionLocal()
    try:
        logger.info(f"[Resume Task] Starting processing for candidate_id={candidate_id}")

        # 1. Fetch candidate
        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if not candidate:
            logger.error(f"[Resume Task] Candidate {candidate_id} not found.")
            return {"status": "failed", "error": "Candidate not found"}

        # 2. Download original from S3
        try:
            content_bytes = s3_service.download_bytes(s3_key)
        except Exception as e:
            logger.error(f"[Resume Task] Failed to download from S3: {e}")
            self.retry(exc=e)
            return {}

        # 3. Extract text
        try:
            extracted_text, detected_format = extract_text_from_file(
                file_bytes=content_bytes,
                filename=original_filename,
                content_type=content_type,
            )
        except Exception as e:
            logger.error(f"[Resume Task] Text extraction failed: {e}")
            # Update candidate with failed status
            candidate.resume_raw_text = None
            db.commit()
            return {"status": "failed", "error": str(e)}

        # 4. Store extracted .txt to S3
        import os
        stem_name = os.path.splitext(os.path.basename(s3_key))[0]
        extracted_s3_key = f"resumes/extracted/{candidate_id}/{stem_name}.txt"
        try:
            s3_service.upload_text(text_content=extracted_text, s3_key=extracted_s3_key)
            candidate.resume_extracted_text_s3_key = extracted_s3_key
        except Exception as e:
            logger.warning(f"[Resume Task] Failed to upload extracted TXT: {e}")

        # 5. Parse structured data
        master_skills = db.query(Skill).all()
        master_skill_names = [s.name for s in master_skills]
        skill_lookup = {s.name.lower(): s for s in master_skills}

        parsed_data = parse_resume_text(
            raw_text=extracted_text,
            master_skills=master_skill_names,
        )

        # 6. Update candidate record
        now_utc = datetime.now(timezone.utc)
        candidate.resume_raw_text = extracted_text
        candidate.resume_parsed_at = now_utc
        candidate.extracted_data = json.dumps(parsed_data)

        if parsed_data.get("education_degree"):
            candidate.education_degree = parsed_data["education_degree"]
        if parsed_data.get("education_institution"):
            candidate.education_institution = parsed_data["education_institution"]

        # Auto-update experience if candidate hasn't declared it
        parsed_exp = float(parsed_data.get("total_experience_years", 0))
        if float(candidate.total_experience_years or 0) == 0.0 and parsed_exp > 0:
            candidate.total_experience_years = parsed_exp

        # 7. Upsert candidate_skills with source='resume' and evidence_text
        existing_skills = {cs.skill_id: cs for cs in candidate.skills}
        added_skills = []
        updated_skills = []

        for sk_dict in parsed_data.get("skills", []):
            sk_name = sk_dict.get("name", "")
            matched_master = skill_lookup.get(sk_name.lower())
            if not matched_master:
                continue

            evidence_snippet = _get_evidence_snippet(extracted_text, sk_name)

            if matched_master.id in existing_skills:
                # Update existing skill — upgrade to resume evidence if currently manual
                existing_cs = existing_skills[matched_master.id]
                existing_cs.evidence_text = evidence_snippet
                if evidence_snippet:
                    existing_cs.source = "resume"
                updated_skills.append(matched_master.name)
            else:
                # New resume-extracted skill — proficiency is None (unknown)
                # Do NOT assign Expert blindly just because skill appears in resume
                auto_years = round(min(float(parsed_exp), 2.0), 1) if parsed_exp > 0 else 0.0
                new_cs = CandidateSkill(
                    candidate_id=candidate.id,
                    skill_id=matched_master.id,
                    source="resume",
                    proficiency_level=None,  # Unknown — let matching engine use 0.50 factor
                    years_experience=auto_years,
                    evidence_text=evidence_snippet,
                )
                db.add(new_cs)
                existing_skills[matched_master.id] = new_cs
                added_skills.append(matched_master.name)

        db.commit()
        db.refresh(candidate)

        logger.info(
            f"[Resume Task] Processing complete for candidate_id={candidate_id}. "
            f"Added: {len(added_skills)}, Updated: {len(updated_skills)} skills."
        )

        # 8. Trigger auto-matching against active jobs
        from app.tasks.matching_tasks import run_candidate_matching_task
        try:
            insp = celery_app.control.inspect(timeout=0.2)
            if insp and insp.ping():
                run_candidate_matching_task.apply_async(
                    args=[candidate_id],
                    queue="matching",
                )
            else:
                run_candidate_matching_task.apply(args=[candidate_id])
        except Exception:
            run_candidate_matching_task.apply(args=[candidate_id])

        return {
            "status": "completed",
            "candidate_id": candidate_id,
            "format": detected_format,
            "added_skills": added_skills,
            "updated_skills": updated_skills,
            "parsed_exp": parsed_exp,
        }

    except Exception as e:
        logger.error(f"[Resume Task] Unexpected error for candidate_id={candidate_id}: {e}")
        db.rollback()
        self.retry(exc=e)
        return {}
    finally:
        db.close()
