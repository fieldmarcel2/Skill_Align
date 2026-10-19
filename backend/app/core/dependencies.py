"""
FastAPI dependency functions for authentication and role-based authorization.

All protected routes must declare one of these as a Depends() parameter.
Authorization is ALWAYS enforced on the backend — never trust the frontend.

Available dependencies
──────────────────────
get_db()            → yields a DB session (used in all routers)
get_current_user()  → any authenticated user
require_admin()     → Admin role only
require_hr()        → HR role only
require_recruiter() → Recruiter role only
require_candidate() → Candidate role only
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.security import decode_access_token, is_token_blacklisted
from app.database.session import get_db
from app.models.user import User

# HTTP Bearer scheme — reads "Authorization: Bearer <token>" header
_bearer_scheme = HTTPBearer(auto_error=False)


import logging
from app.core.request_context import set_user_context, get_request_id

logger = logging.getLogger("skillalign.security")

# Core auth dependency


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> User:

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not credentials:
        raise credentials_exception

    # Check token revocation
    if is_token_blacklisted(credentials.credentials):
        logger.warning(
            "Access attempt with blacklisted/revoked token",
            extra={"category": "security", "event": "token_revoked"},
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired or token was revoked. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_access_token(credentials.credentials)
        user_id: str | None = payload.get("sub")
        if user_id is None:
            logger.warning(
                "Token payload missing sub claim",
                extra={"category": "security", "event": "token_invalid"},
            )
            raise credentials_exception
    except JWTError as e:
        logger.warning(
            "JWT token validation error: %s",
            str(e),
            extra={"category": "security", "event": "token_validation_failed"},
        )
        raise credentials_exception

    user = None
    if str(user_id).isdigit():
        user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        user = db.query(User).filter(User.email == str(user_id)).first()

    if user is None:
        logger.warning(
            "Authenticated token user id=%s not found in database",
            user_id,
            extra={"category": "security", "event": "user_not_found"},
        )
        raise credentials_exception
    if not user.is_active:
        logger.warning(
            "Deactivated user id=%s attempted API access",
            user.id,
            extra={"category": "security", "event": "deactivated_user_access", "user_id": user.id},
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is deactivated.",
        )

    role_name = user.role.name if user.role else "Unknown"
    set_user_context(user.id, role_name)
    return user


def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    """Returns the authenticated User if valid credentials are provided, else None without raising 401."""
    if not credentials:
        return None
    try:
        payload = decode_access_token(credentials.credentials)
        user_id: str | None = payload.get("sub")
        if user_id is None:
            return None
        user = None
        if str(user_id).isdigit():
            user = db.query(User).filter(User.id == int(user_id)).first()
        if not user:
            user = db.query(User).filter(User.email == str(user_id)).first()
        if user and user.is_active:
            role_name = user.role.name if user.role else "Unknown"
            set_user_context(user.id, role_name)
            return user
    except Exception:
        return None
    return None


# Role-specific guards

def _require_role(role_name: str):
    """Factory that returns a dependency checking for a specific role name."""

    def _guard(current_user: User = Depends(get_current_user)) -> User:
        user_role = current_user.role.name if current_user.role else "Unknown"
        if user_role != role_name:
            logger.warning(
                "Access forbidden: User %s (role: %s) attempted action requiring %s",
                current_user.id,
                user_role,
                role_name,
                extra={
                    "category": "security",
                    "event": "permission_denied",
                    "user_id": current_user.id,
                    "user_role": user_role,
                    "required_role": role_name,
                },
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access restricted to {role_name} users.",
            )
        return current_user

    _guard.__name__ = f"require_{role_name.lower()}"
    return _guard


require_admin = _require_role("Admin")
require_hr = _require_role("HR")
require_recruiter = _require_role("Recruiter")
require_candidate = _require_role("Candidate")


def require_admin_or_hr(current_user: User = Depends(get_current_user)) -> User:
    """Allow Admin OR HR — used for endpoints accessible by both."""
    user_role = current_user.role.name if current_user.role else "Unknown"
    if user_role not in ("Admin", "HR"):
        logger.warning(
            "Access forbidden: User %s (role: %s) attempted action requiring Admin or HR",
            current_user.id,
            user_role,
            extra={
                "category": "security",
                "event": "permission_denied",
                "user_id": current_user.id,
                "user_role": user_role,
            },
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to Admin or HR users.",
        )
    return current_user


def require_hr_or_recruiter(current_user: User = Depends(get_current_user)) -> User:
    """Allow HR OR Recruiter OR Admin — used for shared read endpoints."""
    user_role = current_user.role.name if current_user.role else "Unknown"
    if user_role not in ("HR", "Recruiter", "Admin"):
        logger.warning(
            "Access forbidden: User %s (role: %s) attempted action requiring HR, Recruiter, or Admin",
            current_user.id,
            user_role,
            extra={
                "category": "security",
                "event": "permission_denied",
                "user_id": current_user.id,
                "user_role": user_role,
            },
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to HR, Recruiter, or Admin users.",
        )
    return current_user


def require_hr_or_admin(current_user: User = Depends(get_current_user)) -> User:
    """Allow HR OR Admin — used for job creation/editing/deletion.
    HR is the owner of job requisition lifecycle."""
    user_role = current_user.role.name if current_user.role else "Unknown"
    if user_role not in ("HR", "Admin"):
        logger.warning(
            "Access forbidden: User %s (role: %s) attempted action requiring HR or Admin",
            current_user.id,
            user_role,
            extra={
                "category": "security",
                "event": "permission_denied",
                "user_id": current_user.id,
                "user_role": user_role,
            },
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to HR or Admin users. Recruiters cannot modify job requisitions.",
        )
    return current_user
