"""
SQLAlchemy declarative base.

All models must inherit from this Base so that Alembic
and SQLAlchemy can discover them for migrations and queries.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
