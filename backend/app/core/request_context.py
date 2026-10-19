"""
Request Context — Async-safe per-request correlation ID and context storage.
=============================================================================

Provides ContextVar-based storage that is:
  - Isolated per async task / thread (no shared global state)
  - Available to any module that imports get_request_id(), get_user_id(), get_user_role()
  - Set per request in RequestIDMiddleware and auth dependencies

Usage from any module::

    from app.core.request_context import get_request_id, get_user_id, get_user_role

    logger.info("Processing started request=%s user=%s", get_request_id(), get_user_id())
"""

import re
import uuid
from contextvars import ContextVar
from typing import Any, Optional, Dict

# Per-async-task storage for the current request ID.
_request_id_var: ContextVar[Optional[str]] = ContextVar("request_id", default=None)
request_id_var = _request_id_var

# Per-async-task storage for current user ID & role.
_user_id_var: ContextVar[Optional[int]] = ContextVar("user_id", default=None)
_user_role_var: ContextVar[Optional[str]] = ContextVar("user_role", default=None)

# Extra domain context storage (candidate_id, job_id, etc.)
_context_fields_var: ContextVar[Dict[str, Any]] = ContextVar("context_fields", default={})

# Validation: only alphanumeric chars, hyphens, underscores (max 128 chars)
_SAFE_ID_RE = re.compile(r"^[a-zA-Z0-9\-_]{1,128}$")


def _generate_request_id() -> str:
    """Generate a short, unique request ID (8 hex chars from UUID4)."""
    return uuid.uuid4().hex[:8]


def set_request_id(incoming_header: Optional[str] = None) -> str:
    """
    Determine the request ID for this request context:
    - If *incoming_header* is present and safe, reuse it (propagation).
    - Otherwise generate a new unique ID.

    Stores the result in the ContextVar and returns it.
    """
    if incoming_header and _SAFE_ID_RE.match(incoming_header):
        request_id = incoming_header
    else:
        request_id = _generate_request_id()

    _request_id_var.set(request_id)
    return request_id


def get_request_id() -> str:
    """
    Return the current request's ID.
    Falls back to 'no-request-id' if called outside a request context.
    """
    return _request_id_var.get() or "no-request-id"


def set_user_context(user_id: Optional[int], user_role: Optional[str] = None) -> None:
    """Set the authenticated user context for the current request."""
    _user_id_var.set(user_id)
    _user_role_var.set(user_role)


def get_user_id() -> Optional[int]:
    """Return the current request's authenticated user ID, or None."""
    return _user_id_var.get()


def get_user_role() -> Optional[str]:
    """Return the current request's authenticated user role name, or None."""
    return _user_role_var.get()


def set_context_field(key: str, value: Any) -> None:
    """Set a custom domain context field (e.g. candidate_id, job_id)."""
    current = dict(_context_fields_var.get() or {})
    current[key] = value
    _context_fields_var.set(current)


def get_context_field(key: str, default: Any = None) -> Any:
    """Get a custom domain context field value."""
    current = _context_fields_var.get() or {}
    return current.get(key, default)


def get_all_context_fields() -> Dict[str, Any]:
    """Get all extra domain context fields."""
    return dict(_context_fields_var.get() or {})


def clear_context() -> None:
    """Clear request context (used for test isolation and teardown)."""
    _request_id_var.set(None)
    _user_id_var.set(None)
    _user_role_var.set(None)
    _context_fields_var.set({})
