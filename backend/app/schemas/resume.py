"""
Pydantic Schemas for Resume Storage & Deterministic Parsing.
"""

from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field


class ResumeUploadResponse(BaseModel):
    status: str = "success"
    message: str = "Resume uploaded, text extracted, and profile parsed successfully."
    candidate_id: int
    filename: str
    format: Optional[str] = "PDF"
    original_s3_key: str
    extracted_text_s3_key: Optional[str] = None
    uploaded_at: datetime
    parsed_at: Optional[datetime] = None
    parsed_data: Optional[Dict[str, Any]] = None
    auto_added_skills: Optional[List[str]] = Field(default_factory=list)

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
