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

from app.core.security import decode_access_token
from app.database.session import get_db
from app.models.user import User

# HTTP Bearer scheme — reads "Authorization: Bearer <token>" header
_bearer_scheme = HTTPBearer(auto_error=False)


# ─────────────────────────────────────────────────────────────────────────────
# Core auth dependency
# ─────────────────────────────────────────────────────────────────────────────

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

    try:
        payload = decode_access_token(credentials.credentials)
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is deactivated.",
        )
    return user


# Role-specific guards

def _require_role(role_name: str):
    """Factory that returns a dependency checking for a specific role name."""

    def _guard(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role.name != role_name:
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
    if current_user.role.name not in ("Admin", "HR"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to Admin or HR users.",
        )
    return current_user


def require_hr_or_recruiter(current_user: User = Depends(get_current_user)) -> User:
    """Allow HR OR Recruiter OR Admin — used for shared read endpoints."""
    if current_user.role.name not in ("HR", "Recruiter", "Admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to HR, Recruiter, or Admin users.",
        )
    return current_user


def require_hr_or_admin(current_user: User = Depends(get_current_user)) -> User:
    """Allow HR OR Admin — used for job creation/editing/deletion.
    HR is the owner of job requisition lifecycle."""
    if current_user.role.name not in ("HR", "Admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to HR or Admin users. Recruiters cannot modify job requisitions.",
        )
    return current_user
