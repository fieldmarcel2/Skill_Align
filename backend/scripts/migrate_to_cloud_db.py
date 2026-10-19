"""
SkillAlign Full Database Data Migration Tool
=============================================
Migrates all table records, relationships, and sequences from the local
PostgreSQL development database to the production cloud PostgreSQL database (Neon / Render / Supabase / RDS).
"""

import os
import sys
import time
import argparse
from typing import List, Dict, Any
from sqlalchemy import create_engine, text
from sqlalchemy.pool import NullPool
from sqlalchemy.exc import OperationalError, DBAPIError

TABLE_MIGRATION_ORDER = [
    "roles",
    "skills",
    "users",
    "candidates",
    "candidate_skills",
    "jobs",
    "job_skills",
    "job_interview_rounds",
    "job_recruiter_assignments",
    "match_results",
    "candidate_recruiter_assignments",
    "interviews",
    "interview_slots",
    "interview_feedback",
    "offers",
    "candidate_scorecards",
    "candidate_blacklists",
    "recruitment_tasks",
    "recruitment_messages",
    "notifications",
    "otp_verifications",
    "audit_logs",
    "alembic_version",
]

DEFAULT_SOURCE_URL = "postgresql://postgres:23702859%40tT@localhost:5432/skillaign"
CHUNK_SIZE = 50
MAX_RETRIES = 3


def clean_db_url(url: str) -> str:
    url = url.strip()
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    if "-pooler." in url:
        url = url.replace("-pooler.", ".")
    return url


def execute_with_retry(engine, query, params=None, max_retries=MAX_RETRIES):
    """Execute SQL query with automatic reconnection on SSL / transient network drops."""
    for attempt in range(1, max_retries + 1):
        try:
            with engine.connect() as conn:
                if params is not None:
                    result = conn.execute(query, params)
                else:
                    result = conn.execute(query)
                return result
        except (OperationalError, DBAPIError) as e:
            if attempt == max_retries:
                raise
            print(f"    [WARN] Transient connection issue ({e.__class__.__name__}), retrying ({attempt}/{max_retries})...", flush=True)
            time.sleep(1.5 * attempt)


def run_migration(source_url: str, target_url: str):
    source_url = clean_db_url(source_url)
    target_url = clean_db_url(target_url)

    print("=" * 70, flush=True)
    print("SkillAlign Production Data Migration", flush=True)
    print("=" * 70, flush=True)
    print(f"Source DB: {source_url.split('@')[-1] if '@' in source_url else 'localhost'}", flush=True)
    print(f"Target DB: {target_url.split('@')[-1] if '@' in target_url else 'target'}", flush=True)
    print("=" * 70, flush=True)

    connect_args = {
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5,
        "connect_timeout": 30,
    }

    src_engine = create_engine(source_url, poolclass=NullPool)
    tgt_engine = create_engine(
        target_url,
        poolclass=NullPool,
        isolation_level="AUTOCOMMIT",
        connect_args=connect_args,
    )

    # 1. Test connections
    try:
        with src_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("[OK] Connected to Source Database successfully.", flush=True)
    except Exception as e:
        print(f"[ERROR] Could not connect to Source Database: {e}", flush=True)
        return False

    try:
        with tgt_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("[OK] Connected to Target Database successfully.", flush=True)
    except Exception as e:
        print(f"[ERROR] Could not connect to Target Database: {e}", flush=True)
        return False

    # 2. Check and sync target schema
    with tgt_engine.connect() as conn:
        tgt_tables = [r[0] for r in conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")).fetchall()]

    if not tgt_tables or "users" not in tgt_tables:
        print("\n[WARNING] Target database missing tables. Creating tables from models...", flush=True)
        sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
        from app.database.base import Base
        import app.models
        Base.metadata.create_all(bind=tgt_engine)
        print("[OK] Tables created successfully on target database.", flush=True)
        with tgt_engine.connect() as conn:
            tgt_tables = [r[0] for r in conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")).fetchall()]

    # 3. Drop legacy check constraints on target
    try:
        execute_with_retry(tgt_engine, text("ALTER TABLE match_results DROP CONSTRAINT IF EXISTS ck_match_result_status;"))
        print("[OK] Dropped legacy ck_match_result_status constraint on match_results.", flush=True)
    except Exception as e:
        print(f"Notice on dropping constraint: {e}", flush=True)

    # 4. Clean target tables in reverse dependency order
    print("\n--- Cleaning Target Database Tables ---", flush=True)
    for table_name in reversed(TABLE_MIGRATION_ORDER):
        if table_name in tgt_tables:
            try:
                execute_with_retry(tgt_engine, text(f'DELETE FROM "{table_name}"'))
                print(f"  - Cleared: {table_name}", flush=True)
            except Exception as err:
                print(f"  - Notice on clearing {table_name}: {err}", flush=True)

    print("[OK] Target database cleared for fresh data import.", flush=True)

    # 5. Migrate each table in forward order
    print("\n--- Migrating Table Data ---", flush=True)
    total_records = 0

    for table_name in TABLE_MIGRATION_ORDER:
        # Check if table exists in source
        with src_engine.connect() as src_conn:
            table_check = src_conn.execute(
                text(f"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '{table_name}')")
            ).scalar()
            if not table_check:
                continue

            rows = src_conn.execute(text(f'SELECT * FROM "{table_name}"')).fetchall()

        if not rows:
            print(f"  - {table_name:32}:    0 rows (skipped)", flush=True)
            continue

        columns = list(rows[0]._mapping.keys())
        cols_str = ", ".join([f'"{c}"' for c in columns])
        placeholders = ", ".join([f":{c}" for c in columns])
        insert_stmt = text(f'INSERT INTO "{table_name}" ({cols_str}) VALUES ({placeholders})')
        records = [dict(r._mapping) for r in rows]

        # Insert in chunks with automatic retry
        for i in range(0, len(records), CHUNK_SIZE):
            chunk = records[i:i + CHUNK_SIZE]
            execute_with_retry(tgt_engine, insert_stmt, chunk)

        total_records += len(records)
        print(f"  - {table_name:32}: {len(records):>4} rows migrated & saved [OK]", flush=True)

    # 6. Sync PostgreSQL primary key sequences safely
    print("\n--- Syncing PostgreSQL Primary Key Sequences ---", flush=True)
    for table_name in TABLE_MIGRATION_ORDER:
        if table_name == "alembic_version":
            continue
        try:
            with tgt_engine.connect() as conn:
                max_id = conn.execute(text(f'SELECT MAX(id) FROM "{table_name}"')).scalar()
                if max_id is not None:
                    seq_name = conn.execute(text(f"SELECT pg_get_serial_sequence('{table_name}', 'id')")).scalar()
                    if seq_name:
                        conn.execute(text(f"SELECT setval('{seq_name}', {max_id}, true)"))
                        print(f"  - Sequence '{seq_name}' synced to {max_id}", flush=True)
        except Exception as e:
            print(f"  - Notice on sequence for {table_name}: {e}", flush=True)

    print("\n" + "=" * 70, flush=True)
    print(f"[SUCCESS] Migration completed! Total records migrated: {total_records}", flush=True)
    print("=" * 70, flush=True)

    # 7. Verification on target
    print("\n--- Verification on Target Database ---", flush=True)
    with tgt_engine.connect() as conn:
        for table_name in ["users", "candidates", "candidate_skills", "jobs", "job_skills", "match_results", "interviews", "offers", "recruitment_tasks"]:
            try:
                cnt = conn.execute(text(f'SELECT count(*) FROM "{table_name}"')).scalar()
                print(f"  * {table_name:25}: {cnt:>4} records", flush=True)
            except Exception as e:
                print(f"  * {table_name:25}: error ({e})", flush=True)

    print("\nAll candidate profiles, uploaded resumes, jobs, and match results are now live in the cloud database!", flush=True)
    return True


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SkillAlign PostgreSQL Data Migration Tool")
    parser.add_argument("--source", default=os.getenv("SOURCE_DATABASE_URL", DEFAULT_SOURCE_URL), help="Source Database URL (localhost)")
    parser.add_argument("--target", default=os.getenv("TARGET_DATABASE_URL"), help="Target Database URL (Neon / Render)")
    args = parser.parse_args()

    target = args.target
    if not target:
        print("\nTarget Database URL not provided via argument or TARGET_DATABASE_URL environment variable.")
        print("Please enter your Neon / Render Database connection string:")
        target = input("Target Database URL: ").strip()

    if not target:
        print("[ERROR] Target Database URL is required. Exiting.")
        sys.exit(1)

    run_migration(source_url=args.source, target_url=target)
