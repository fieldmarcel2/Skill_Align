"""
Application configuration.

Reads settings from environment variables / .env file using Pydantic Settings.
All sensitive values (secrets, database URLs) must come from the environment.
"""

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ENV_FILE_PATH = BACKEND_DIR / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(str(ENV_FILE_PATH), ".env", "backend/.env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ──────────────────────────────────────────────────────────
    APP_NAME: str = "SkillAlign"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # ── Database ─────────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/skillaign"
    DB_ECHO: bool = False  # Set True locally to see SQL queries

    # ── JWT ──────────────────────────────────────────────────────────────────
    JWT_SECRET_KEY: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # ── File Upload ───────────────────────────────────────────────────────────
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 10
    ALLOWED_RESUME_TYPES: list[str] = ["application/pdf",
                                        "application/msword",
                                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]

    # ── CORS ─────────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    # ── OTP ──────────────────────────────────────────────────────────────────
    OTP_EXPIRY_SECONDS: int = 300            # 5 minutes
    OTP_MAX_ATTEMPTS: int = 5
    OTP_RESEND_COOLDOWN_SECONDS: int = 60    # minimum seconds between resends
    OTP_DEV_MODE: bool = False               # True = log OTP to console, skip SMS

    # ── SMS Provider (Twilio) ────────────────────────────────────────────────
    SMS_PROVIDER: str = "twilio"
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_FROM_NUMBER: str = ""

    # ── AWS S3 Resume Storage ─────────────────────────────────────────────────
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_S3_BUCKET_NAME: str = "skillalign-resumes"
    AWS_REGION: str = "us-east-1"
    S3_PRESIGNED_URL_EXPIRES_SECONDS: int = 300  # 5 minutes


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance (singleton pattern)."""
    return Settings()


# Module-level convenience reference
settings = get_settings()
