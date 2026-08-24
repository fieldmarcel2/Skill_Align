"""
Alembic environment configuration for SkillAlign.

This file is executed by Alembic CLI commands (upgrade, downgrade,
revision --autogenerate, etc.).

Key responsibilities:
1. Load the app's database URL from the same settings used by FastAPI.
2. Import all SQLAlchemy models so Alembic's autogenerate can detect
   table additions/removals.
3. Support both 'online' (connected DB) and 'offline' (SQL script) modes.
"""

import sys
import os
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# ---------------------------------------------------------------------------
# Make sure the backend/ directory is importable when running from any CWD.
# ---------------------------------------------------------------------------
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# ---------------------------------------------------------------------------
# Import application settings (reads .env)
# ---------------------------------------------------------------------------
from app.core.config import settings  # noqa: E402

# ---------------------------------------------------------------------------
# Import the shared metadata so Alembic can compare models vs. the DB.
# We import app.models so every model registers itself against Base.metadata.
# ---------------------------------------------------------------------------
from app.database.base import Base  # noqa: E402
import app.models  # noqa: E402, F401  — side-effect import (registers all models)

# ---------------------------------------------------------------------------
# Alembic config object — gives access to alembic.ini values
# ---------------------------------------------------------------------------
config = context.config

# Interpret the alembic.ini logging section (if present)
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Override the sqlalchemy.url from our Settings (not from alembic.ini).
# ConfigParser treats % as an interpolation character; we must escape it.
db_url = settings.DATABASE_URL.replace("%", "%%")
config.set_main_option("sqlalchemy.url", db_url)

target_metadata = Base.metadata


# ---------------------------------------------------------------------------
# Offline mode — generate SQL without a live DB connection
# ---------------------------------------------------------------------------
def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


# ---------------------------------------------------------------------------
# Online mode — run against a live DB connection
# ---------------------------------------------------------------------------
def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
