"""
Auth Router
===========

Endpoints:
- POST /api/auth/register  (Public, Candidate self-registration only)
- POST /api/auth/login     (Public, Returns JWT token)
- GET  /api/auth/me        (Protected, Returns current user profile with role)
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserResponse
from app.services import auth_service

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Candidate self-registration",
    description="Allows public users to register as a Candidate. Privileged roles cannot be created here."
)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    return auth_service.register_candidate(db, data)


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="User login",
    description="Authenticates credentials and returns a signed JWT access token."
)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    return auth_service.login(db, data)


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current user profile",
    description="Returns the profile information and role of the currently authenticated user."
)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)
