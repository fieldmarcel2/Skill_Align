"""
Storage Service for Candidate Resumes and Extracted TXT Documents.

Supports dual-path storage:
- Original file: resumes/original/{candidate_id}/{filename}
- Extracted TXT: resumes/extracted/{candidate_id}/{stem}.txt

Provides secure methods to:
- Upload binary resume files & plain text representations to AWS S3 (with local storage fallback)
- Generate short-lived pre-signed GET URLs (ExpiresIn=300) for secure candidate/recruiter/HR viewing
- Retrieve extracted text directly from S3
- Delete both original and extracted files upon candidate update/removal

CRITICAL SECURITY:
- AWS credentials are read exclusively from environment variables / Settings.
- AWS credentials are NEVER exposed to the frontend or included in API responses.
- Only temporary pre-signed S3 URLs are shared.
"""

import io
import os
import logging
from pathlib import Path
from typing import BinaryIO
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError, BotoCoreError

from app.core.config import settings

logger = logging.getLogger("skillalign.storage")


class S3Service:
    def __init__(self) -> None:
        self.bucket_name = settings.AWS_S3_BUCKET_NAME
        self.region = settings.AWS_REGION
        self.local_storage_dir = Path("uploads")

    def _is_s3_configured(self) -> bool:
        return bool(
            settings.AWS_ACCESS_KEY_ID
            and settings.AWS_SECRET_ACCESS_KEY
            and settings.AWS_S3_BUCKET_NAME
        )

    def _get_client(self):
        """
        Instantiate and return a configured boto3 S3 client using environment settings.
        Configures sigv4 and regional endpoint addressing.
        """
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
        Falls back to local filesystem if S3 is not configured.
        """
        if self._is_s3_configured():
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
        else:
            # Local filesystem fallback for dev/testing
            target_path = self.local_storage_dir / s3_key
            target_path.parent.mkdir(parents=True, exist_ok=True)
            with open(target_path, "wb") as f:
                f.write(file_obj.read())
            logger.info(f"Saved file to local storage: {target_path}")
            return s3_key

    def upload_text(
        self,
        text_content: str,
        s3_key: str,
    ) -> str:
        """
        Upload plain text string to storage under specified key (e.g. resumes/extracted/...).
        """
        text_bytes = text_content.encode("utf-8")
        bio = io.BytesIO(text_bytes)
        return self.upload_file(
            file_obj=bio,
            s3_key=s3_key,
            content_type="text/plain; charset=utf-8",
        )

    def get_text(self, s3_key: str) -> str:
        """
        Retrieve plain text content from storage.
        """
        if self._is_s3_configured():
            client = self._get_client()
            try:
                response = client.get_object(Bucket=self.bucket_name, Key=s3_key)
                content = response["Body"].read().decode("utf-8", errors="replace")
                return content
            except Exception as e:
                logger.warning(f"Error fetching text from S3 ({s3_key}): {e}")
                # Check local fallback
                target_path = self.local_storage_dir / s3_key
                if target_path.exists():
                    return target_path.read_text(encoding="utf-8", errors="replace")
                raise RuntimeError(f"Could not retrieve text for key {s3_key}: {e}") from e
        else:
            target_path = self.local_storage_dir / s3_key
            if target_path.exists():
                return target_path.read_text(encoding="utf-8", errors="replace")
            raise FileNotFoundError(f"Local file not found: {target_path}")

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
        if self._is_s3_configured():
            client = self._get_client()
            params = {
                "Bucket": self.bucket_name,
                "Key": s3_key,
            }

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
        else:
            return f"/api/candidates/download-local?key={s3_key}"

    def delete_file(self, s3_key: str) -> bool:
        """
        Delete an object from S3 / local storage.
        Returns True if deleted or object doesn't exist, False on error.
        """
        if not s3_key:
            return True

        if self._is_s3_configured():
            client = self._get_client()
            try:
                client.delete_object(Bucket=self.bucket_name, Key=s3_key)
                logger.info(f"Deleted S3 object: s3://{self.bucket_name}/{s3_key}")
            except (ClientError, BotoCoreError) as e:
                logger.warning(f"Error deleting S3 object ({s3_key}): {e}")

        # Also remove from local storage if present
        local_path = self.local_storage_dir / s3_key
        if local_path.exists():
            try:
                local_path.unlink()
            except Exception:
                pass

        return True

    def download_bytes(self, s3_key: str) -> bytes:
        """
        Download binary content from S3 / local storage as bytes.
        Used by the async resume worker to retrieve uploaded files.
        """
        if self._is_s3_configured():
            client = self._get_client()
            try:
                response = client.get_object(Bucket=self.bucket_name, Key=s3_key)
                content = response["Body"].read()
                logger.info(f"Downloaded {len(content)} bytes from S3: {s3_key}")
                return content
            except (ClientError, BotoCoreError) as e:
                logger.error(f"Failed to download from S3 ({s3_key}): {e}")
                raise RuntimeError(f"S3 download failed: {str(e)}") from e
        else:
            # Local fallback
            local_path = self.local_storage_dir / s3_key
            if local_path.exists():
                return local_path.read_bytes()
            raise FileNotFoundError(f"Local file not found: {local_path}")


# Singleton instance for import throughout the backend
s3_service = S3Service()
