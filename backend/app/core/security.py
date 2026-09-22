"""
Security utilities: JWT token creation/verification and direct bcrypt password hashing.

Never import raw passwords anywhere in this codebase after they enter this module.
"""

from datetime import datetime, timedelta, timezone
from typing import Any
import hashlib
import secrets
import bcrypt
from jose import JWTError, jwt

from app.core.config import settings


def generate_password_reset_token() -> str:
    """
    Generate a high-entropy URL-safe random string for password resets.
    """
    return secrets.token_urlsafe(32)


def hash_reset_token(token: str) -> str:
    """
    Hash a password reset token with SHA-256 for secure database storage.
    """
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def hash_password(plain_password: str) -> str:
    """
    Hash a plaintext password using bcrypt.
    Truncates password to 72 bytes to adhere to bcrypt specification.
    """
    # bcrypt max password length is 72 bytes
    pwd_bytes = plain_password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Return True if plain_password matches the stored bcrypt hash.
    """
    try:
        pwd_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        return False


# ── JWT ───────────────────────────────────────────────────────────────────────

def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """
    Create a signed JWT access token.

    The token payload will contain:
      - all keys from *data*
      - exp: expiry timestamp (UTC)

    Usage::
        token = create_access_token({"sub": str(user.id), "role": user.role.name})
    """
    payload = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload["exp"] = expire
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    """
    Decode and verify a JWT token.

    Raises:
        jose.JWTError: if the token is invalid, expired, or tampered with.
    """
    return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])


# ── Token Blacklisting (Redis with in-memory fallback) ───────────────────────

_IN_MEMORY_BLACKLIST: set[str] = set()


def blacklist_token(token: str, expires_in_seconds: int = 3600) -> None:
    """Blacklist a JWT token upon logout."""
    _IN_MEMORY_BLACKLIST.add(token)
    try:
        import redis
        r = redis.from_url(settings.REDIS_URL, socket_timeout=0.5)
        r.setex(f"blacklist:{token}", expires_in_seconds, "1")
    except Exception:
        pass


def is_token_blacklisted(token: str) -> bool:
    """Check if a token has been revoked / blacklisted."""
    if token in _IN_MEMORY_BLACKLIST:
        return True
    try:
        import redis
        r = redis.from_url(settings.REDIS_URL, socket_timeout=0.5)
        return bool(r.get(f"blacklist:{token}"))
    except Exception:
        return False



# ── Phone Number Normalization ────────────────────────────────────────────────

def normalize_phone(phone: str, default_region: str = "IN") -> str:
    """
    Normalize a phone number to E.164 format using the phonenumbers library.

    Examples:
        "+91 98765 43210"  → "+919876543210"
        "09876543210"      → "+919876543210"
        "+919876543210"    → "+919876543210"

    Raises:
        ValueError: if the phone number is invalid or cannot be parsed.
    """
    import phonenumbers

    try:
        parsed = phonenumbers.parse(phone, default_region)
    except phonenumbers.NumberParseException as e:
        raise ValueError(f"Invalid phone number: {e}")

    if not phonenumbers.is_valid_number(parsed):
        raise ValueError("Phone number is not valid.")

    return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
