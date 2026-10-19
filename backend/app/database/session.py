"""
Database session factory.

Provides:
- engine          : SQLAlchemy async-compatible engine (sync here for simplicity)
- SessionLocal    : session factory used by dependency injection
- get_db()        : FastAPI dependency that yields a database session
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator

from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,   # detect stale connections before using them
    pool_recycle=300,     # recycle connections every 5 mins for Neon / serverless DBs
    pool_size=10,
    max_overflow=20,
    echo=settings.DB_ECHO,
)

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
