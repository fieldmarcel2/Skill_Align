"""
Local Filesystem Storage Provider
===================================
Stores files under the backend/storage/ directory.
Structure: storage/offers/{offer_id}/{filename}

This is the development storage provider.
For production, replace with S3StorageProvider.
"""

import os
import logging
from typing import Optional
from pathlib import Path

from app.services.storage.base_storage import StorageProvider

logger = logging.getLogger("skillalign.storage.local")

# Root storage directory (relative to backend/), absolute in production
STORAGE_ROOT = Path(__file__).resolve().parent.parent.parent.parent.parent / "storage"


class LocalStorageProvider(StorageProvider):
    """
    Stores files on the local filesystem under {STORAGE_ROOT}/{key}.
    Creates intermediate directories as needed.
    """

    def __init__(self, root: Optional[Path] = None):
        self.root = Path(root) if root else STORAGE_ROOT
        self.root.mkdir(parents=True, exist_ok=True)
        logger.info(f"LocalStorageProvider initialized — root: {self.root}")

    def _full_path(self, key: str) -> Path:
        """Resolve the full filesystem path for a storage key."""
        # Normalize key (strip leading slashes)
        clean_key = key.lstrip("/").replace("\\", "/")
        full = (self.root / clean_key).resolve()
        # Security: ensure path stays within storage root
        if not str(full).startswith(str(self.root.resolve())):
            raise ValueError(f"Path traversal attempt detected for key: {key!r}")
        return full

    def save_file(self, key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
        path = self._full_path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        logger.info(f"Saved file: {path} ({len(data)} bytes, {content_type})")
        return key

    def get_file_bytes(self, key: str) -> bytes:
        path = self._full_path(key)
        if not path.exists():
            raise FileNotFoundError(f"Storage file not found: {key!r}")
        return path.read_bytes()

    def get_file_path(self, key: str) -> Optional[str]:
        return str(self._full_path(key))

    def delete_file(self, key: str) -> bool:
        path = self._full_path(key)
        if path.exists():
            path.unlink()
            logger.info(f"Deleted file: {path}")
            return True
        return False

    def file_exists(self, key: str) -> bool:
        return self._full_path(key).exists()
