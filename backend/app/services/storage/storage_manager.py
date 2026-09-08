"""
Storage Manager — Factory for Storage Providers
=================================================
Returns the configured storage provider based on environment.

Usage:
    from app.services.storage.storage_manager import get_storage
    storage = get_storage()
    key = storage.save_file("offers/42/offer.pdf", pdf_bytes)
"""

import os
from functools import lru_cache
from app.services.storage.base_storage import StorageProvider


@lru_cache(maxsize=1)
def get_storage() -> StorageProvider:
    """
    Return the configured storage provider (singleton).

    Set STORAGE_BACKEND env var to switch providers:
      - 'local' (default): LocalStorageProvider
      - 's3': S3StorageProvider (not yet implemented)
    """
    backend = os.getenv("STORAGE_BACKEND", "local").lower()

    if backend == "local":
        from app.services.storage.local_storage import LocalStorageProvider
        return LocalStorageProvider()

    # Future: S3, Azure Blob, GCS
    raise ValueError(f"Unknown STORAGE_BACKEND: {backend!r}. Supported: 'local'")
