"""
Database schema sync helper for SkillAlign.
Ensures interviews and notifications tables exist, adds recruiter_id column, and updates constraints.
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from app.database.session import engine
from app.database.base import Base
import app.models  # load all models


def sync_db():
    print("Creating all tables if missing...")
    Base.metadata.create_all(bind=engine)
    print("Tables verified.")

    with engine.begin() as conn:
        # Check if recruiter_id column exists on match_results
        col_check = conn.execute(
            text("SELECT column_name FROM information_schema.columns WHERE table_name='match_results' AND column_name='recruiter_id'")
        ).fetchone()

        if not col_check:
            print("Adding recruiter_id column to match_results...")
            conn.execute(text("ALTER TABLE match_results ADD COLUMN recruiter_id INTEGER REFERENCES users(id) ON DELETE SET NULL;"))
            conn.execute(text("UPDATE match_results SET recruiter_id = matched_by WHERE recruiter_id IS NULL;"))
            print("recruiter_id column added and backfilled.")
        else:
            print("recruiter_id column already exists.")

        # Drop restrictive status check constraint on match_results
        try:
            conn.execute(text("ALTER TABLE match_results DROP CONSTRAINT IF EXISTS ck_match_result_status;"))
            print("Dropped old ck_match_result_status constraint.")
        except Exception as e:
            print("Notice:", e)

        # Check and add S3 resume columns to candidates table
        s3_key_check = conn.execute(
            text("SELECT column_name FROM information_schema.columns WHERE table_name='candidates' AND column_name='resume_s3_key'")
        ).fetchone()
        if not s3_key_check:
            print("Adding S3 resume columns to candidates table...")
            conn.execute(text("ALTER TABLE candidates ADD COLUMN resume_s3_key VARCHAR(500) NULL;"))
            conn.execute(text("ALTER TABLE candidates ADD COLUMN resume_filename VARCHAR(255) NULL;"))
            conn.execute(text("ALTER TABLE candidates ADD COLUMN resume_uploaded_at TIMESTAMP WITH TIME ZONE NULL;"))
            print("S3 resume columns added to candidates table.")
        else:
            print("S3 resume columns already exist on candidates table.")

    print("[SUCCESS] Database sync complete.")


if __name__ == "__main__":
    sync_db()
