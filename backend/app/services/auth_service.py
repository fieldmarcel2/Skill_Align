"""
Auth service — registration and login business logic.

All auth logic lives here, NOT in the router.
The router only handles HTTP request/response concerns.
"""

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.core.security import hash_password, verify_password, create_access_token
from app.models.user import User
from app.models.role import Role
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserResponse


# ── Registration ──────────────────────────────────────────────────────────────

def register_candidate(db: Session, data: RegisterRequest) -> UserResponse:
    """
    Create a new Candidate user account.

    Security guarantees:
    - The Candidate role is looked up from the DB (never trusted from client).
    - Duplicate email raises 409 Conflict.
    - Password is bcrypt-hashed before storage.
    """
    # Prevent duplicate registration
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    # Fetch the Candidate role — fail hard if seed data is missing
    candidate_role = db.query(Role).filter(Role.name == "Candidate").first()
    if candidate_role is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="System configuration error: Candidate role not found.",
        )

    user = User(
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
        role_id=candidate_role.id,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)


# ── Login ─────────────────────────────────────────────────────────────────────

def login(db: Session, data: LoginRequest) -> TokenResponse:
    """
    Authenticate a user and return a signed JWT.

    Returns the same generic error for both wrong email and wrong password
    to prevent user-enumeration attacks.
    """
    _auth_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect email or password.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    user = db.query(User).filter(User.email == data.email).first()
    if user is None:
        raise _auth_error

    if not verify_password(data.password, user.password_hash):
        raise _auth_error

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your account has been deactivated. Contact an administrator.",
        )

    token = create_access_token({"sub": str(user.id), "role": user.role.name})
    return TokenResponse(access_token=token)
