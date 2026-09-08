"""
Storage Abstraction Layer
=========================
Abstract base class for file storage providers.
Implement this interface for Local, S3, Azure Blob, GCS etc.
"""

from abc import ABC, abstractmethod
from typing import Optional


class StorageProvider(ABC):
    """Abstract storage provider interface."""

    @abstractmethod
    def save_file(self, key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
        """
        Save file bytes to storage.

        Args:
            key: Storage key / path (e.g., 'offers/42/offer_letter.pdf')
            data: Raw file bytes
            content_type: MIME type of the file

        Returns:
            The storage key used (may differ from input if provider normalizes paths)
        """
        ...

    @abstractmethod
    def get_file_bytes(self, key: str) -> bytes:
        """
        Retrieve file bytes from storage.

        Args:
            key: Storage key / path

        Returns:
            Raw file bytes

        Raises:
            FileNotFoundError: If the file does not exist
        """
        ...

    @abstractmethod
    def get_file_path(self, key: str) -> Optional[str]:
        """
        Get a local filesystem path to the file (if applicable).
        Returns None for remote storage providers.
        """
        ...

    @abstractmethod
    def delete_file(self, key: str) -> bool:
        """
        Delete a file from storage.

        Returns:
            True if file was deleted, False if it didn't exist
        """
        ...

    @abstractmethod
    def file_exists(self, key: str) -> bool:
        """Check if a file exists at the given storage key."""
        ...
