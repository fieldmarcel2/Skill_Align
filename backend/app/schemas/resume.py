"""
Pydantic Schemas for Resume Storage & Async Processing Pipeline.
"""

from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field


class ResumeUploadResponse(BaseModel):
    """
    Async upload response — returned immediately after file is stored to S3.
    Processing happens asynchronously via Celery.
    Poll GET /{candidate_id}/resume/status to check completion.
    """
    status: str = "processing"
    message: str = "Resume uploaded successfully. Processing has been queued."
    candidate_id: int
    task_id: Optional[str] = None   # Celery task ID for status polling
    filename: str
    uploaded_at: Optional[str] = None
    resume_s3_key: Optional[str] = None
    resume_file_path: Optional[str] = None
    parsed_data: Optional[Dict[str, Any]] = None
    auto_added_skills: Optional[List[str]] = None

    model_config = {"from_attributes": True}


class ResumeStatusResponse(BaseModel):
    """
    Resume processing status — used for async status polling.
    processing_status values:
      not_uploaded  → no resume on file
      processing    → uploaded but not yet parsed (worker running)
      completed     → fully parsed, skills extracted, matching triggered
      failed        → processing encountered an error
    """
    candidate_id: int
    processing_status: str  # not_uploaded | processing | completed | failed
    filename: Optional[str] = None
    uploaded_at: Optional[datetime] = None
    parsed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ResumeUrlResponse(BaseModel):
    resume_url: str
    filename: str | None = None
    expires_in_seconds: int = Field(default=300, description="Pre-signed URL expiry duration in seconds")

    model_config = {"from_attributes": True}


class ResumeTextResponse(BaseModel):
    candidate_id: int
    filename: Optional[str] = None
    raw_text: str
    extracted_text_s3_key: Optional[str] = None
    parsed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ParsedResumeResponse(BaseModel):
    candidate_id: int
    parsed_data: Dict[str, Any]
    parsed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ResumeDeleteResponse(BaseModel):
    message: str = "Resume and extracted documents deleted successfully"
    candidate_id: int

    model_config = {"from_attributes": True}
