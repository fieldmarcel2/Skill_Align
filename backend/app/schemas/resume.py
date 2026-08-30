"""
Pydantic Schemas for AWS S3 Resume Management.
"""

from datetime import datetime
from pydantic import BaseModel, Field


class ResumeUploadResponse(BaseModel):
    message: str = "Resume uploaded successfully to AWS S3"
    candidate_id: int
    resume_filename: str
    resume_s3_key: str
    resume_uploaded_at: datetime

    model_config = {"from_attributes": True}


class ResumeUrlResponse(BaseModel):
    resume_url: str
    filename: str | None = None
    expires_in_seconds: int = Field(default=300, description="Pre-signed URL expiry duration in seconds")

    model_config = {"from_attributes": True}


class ResumeDeleteResponse(BaseModel):
    message: str = "Resume deleted successfully"
    candidate_id: int

    model_config = {"from_attributes": True}
