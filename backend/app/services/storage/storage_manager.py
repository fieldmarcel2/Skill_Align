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
    Automatically enables S3StorageProvider when AWS S3 credentials are configured,
    with seamless local storage fallback.
    """
    backend = os.getenv("STORAGE_BACKEND", "").lower()

    if backend == "local":
        from app.services.storage.local_storage import LocalStorageProvider
        return LocalStorageProvider()

    from app.services.s3_service import s3_service
    if backend == "s3" or s3_service._is_s3_configured():
        from app.services.storage.s3_storage import S3StorageProvider
        return S3StorageProvider()

    from app.services.storage.local_storage import LocalStorageProvider
    return LocalStorageProvider()
