"""
S3 Storage Provider
===================
Implements StorageProvider interface using the project's S3Service.
Stores offer letters and document artifacts in AWS S3 with local filesystem fallback.
"""

import io
import logging
from typing import Optional
from pathlib import Path

from app.services.storage.base_storage import StorageProvider
from app.services.s3_service import s3_service

logger = logging.getLogger("skillalign.storage.s3")


class S3StorageProvider(StorageProvider):
    """Storage provider backed by AWS S3 with local disk fallback."""

    def __init__(self) -> None:
        self.s3 = s3_service
        self.local_dir = Path("uploads")

    def save_file(self, key: str, data: bytes, content_type: str = "application/pdf") -> str:
        """Save bytes to S3 under the specified key (e.g. 'offers/1/offer_letter.pdf')."""
        bio = io.BytesIO(data)
        return self.s3.upload_file(bio, s3_key=key, content_type=content_type)

    def get_file_bytes(self, key: str) -> bytes:
        """Retrieve binary content from S3 or local fallback."""
        try:
            return self.s3.download_bytes(key)
        except Exception as e:
            logger.error(f"Error fetching file bytes for {key}: {e}")
            raise FileNotFoundError(f"Storage object '{key}' not found: {e}") from e

    get_file = get_file_bytes

    def get_file_path(self, key: str) -> Optional[str]:
        """Return local path if cached locally, else None."""
        local_path = self.local_dir / key
        if local_path.exists():
            return str(local_path)
        return None

    def delete_file(self, key: str) -> bool:
        """Delete object from S3 and local cache."""
        return self.s3.delete_file(key)

    def file_exists(self, key: str) -> bool:
        """Check if file exists in S3 or locally."""
        try:
            self.get_file_bytes(key)
            return True
        except FileNotFoundError:
            return False

    def generate_presigned_url(self, key: str, expires_in: int = 300, filename: Optional[str] = None) -> str:
        """Generate a short-lived pre-signed URL for direct browser viewing."""
        return self.s3.generate_presigned_url(key, expires_in=expires_in, original_filename=filename)
