"""
AWS S3 Storage Service for Candidate Resumes.

Provides secure methods to:
- Upload candidate resumes to S3 (resumes/candidates/{candidate_id}/{filename})
- Generate short-lived pre-signed URLs (ExpiresIn=300) for secure candidate/recruiter/HR viewing
- Delete resumes from S3 when candidates update or remove their files

CRITICAL SECURITY:
- AWS credentials are read exclusively from environment variables / Settings.
- AWS credentials are NEVER exposed to the frontend or included in API responses.
- Only temporary pre-signed S3 URLs are shared.
"""

import logging
from typing import BinaryIO
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError, BotoCoreError

from app.core.config import settings

logger = logging.getLogger("skillalign.s3")


class S3Service:
    def __init__(self) -> None:
        self.bucket_name = settings.AWS_S3_BUCKET_NAME
        self.region = settings.AWS_REGION

    def _get_client(self):
        """
        Instantiate and return a configured boto3 S3 client using environment settings.
        Configures sigv4 and regional endpoint addressing.
        """
        if not settings.AWS_ACCESS_KEY_ID or not settings.AWS_SECRET_ACCESS_KEY:
            logger.warning("AWS S3 credentials not fully configured in environment.")

        return boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID or None,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY or None,
            region_name=self.region,
            config=Config(
                signature_version="s3v4",
                s3={"addressing_style": "virtual"},
                retries={"max_attempts": 3, "mode": "standard"},
            ),
        )

    def upload_file(
        self,
        file_obj: BinaryIO,
        s3_key: str,
        content_type: str = "application/pdf",
    ) -> str:
        """
        Upload binary file stream to S3 under specified key.
        Returns the s3_key upon successful upload.
        """
        client = self._get_client()
        try:
            client.upload_fileobj(
                file_obj,
                self.bucket_name,
                s3_key,
                ExtraArgs={
                    "ContentType": content_type,
                    "ServerSideEncryption": "AES256",
                },
            )
            logger.info(f"Successfully uploaded file to s3://{self.bucket_name}/{s3_key}")
            return s3_key
        except (ClientError, BotoCoreError) as e:
            logger.error(f"Failed to upload to S3 (key: {s3_key}): {e}")
            raise RuntimeError(f"S3 Upload failed: {str(e)}") from e

    def generate_presigned_url(
        self,
        s3_key: str,
        expires_in: int = settings.S3_PRESIGNED_URL_EXPIRES_SECONDS,
        original_filename: str | None = None,
    ) -> str:
        """
        Generate a pre-signed GET URL for temporary, secure access.
        Default expiry is 300 seconds (5 minutes).
        """
        client = self._get_client()
        params = {
            "Bucket": self.bucket_name,
            "Key": s3_key,
        }

        # Optional content-disposition header to suggest proper download filename
        if original_filename:
            safe_filename = original_filename.replace('"', '')
            params["ResponseContentDisposition"] = f'inline; filename="{safe_filename}"'

        try:
            url = client.generate_presigned_url(
                ClientMethod="get_object",
                Params=params,
                ExpiresIn=expires_in,
            )
            logger.info(f"Generated pre-signed URL for {s3_key} (expires in {expires_in}s)")
            return url
        except (ClientError, BotoCoreError) as e:
            logger.error(f"Failed to generate pre-signed URL for {s3_key}: {e}")
            raise RuntimeError(f"Failed to generate pre-signed URL: {str(e)}") from e

    def delete_file(self, s3_key: str) -> bool:
        """
        Delete an object from S3.
        Returns True if deleted or object doesn't exist, False on error.
        """
        if not s3_key:
            return True

        client = self._get_client()
        try:
            client.delete_object(Bucket=self.bucket_name, Key=s3_key)
            logger.info(f"Deleted S3 object: s3://{self.bucket_name}/{s3_key}")
            return True
        except (ClientError, BotoCoreError) as e:
            logger.warning(f"Error deleting S3 object ({s3_key}): {e}")
            return False


# Singleton instance for import throughout the backend
s3_service = S3Service()
