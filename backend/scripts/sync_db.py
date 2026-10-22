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
        # Drop restrictive status check constraint on match_results
        try:
            conn.execute(text("ALTER TABLE match_results DROP CONSTRAINT IF EXISTS ck_match_result_status;"))
            print("Dropped old ck_match_result_status constraint.")
        except Exception as e:
            print("Notice on dropping constraint:", e)

        safe_alters = [
            "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS request_id VARCHAR(128);",
            "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS match_result_id INTEGER REFERENCES match_results(id) ON DELETE CASCADE;",
            "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS interview_id INTEGER REFERENCES interviews(id) ON DELETE CASCADE;",
            "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS from_state VARCHAR(60);",
            "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS to_state VARCHAR(60);",
            "ALTER TABLE match_results ADD COLUMN IF NOT EXISTS recruiter_id INTEGER REFERENCES users(id) ON DELETE SET NULL;",
            "ALTER TABLE match_results ADD COLUMN IF NOT EXISTS hiring_manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL;",
            "ALTER TABLE match_results ADD COLUMN IF NOT EXISTS shortlist_note TEXT;",
            "ALTER TABLE match_results ADD COLUMN IF NOT EXISTS submitted_to_hm_at TIMESTAMP WITH TIME ZONE;",
            "ALTER TABLE match_results ADD COLUMN IF NOT EXISTS hm_reviewed_at TIMESTAMP WITH TIME ZONE;",
            "ALTER TABLE match_results ADD COLUMN IF NOT EXISTS hm_rejection_reason TEXT;",
            "ALTER TABLE match_results ADD COLUMN IF NOT EXISTS processing_status VARCHAR(30) DEFAULT 'completed';",
            "ALTER TABLE candidates ADD COLUMN IF NOT EXISTS resume_s3_key VARCHAR(500);",
            "ALTER TABLE candidates ADD COLUMN IF NOT EXISTS resume_filename VARCHAR(255);",
            "ALTER TABLE candidates ADD COLUMN IF NOT EXISTS resume_uploaded_at TIMESTAMP WITH TIME ZONE;",
            "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;",
            "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS notification_type VARCHAR(60);",
            "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS match_result_id INTEGER REFERENCES match_results(id) ON DELETE CASCADE;",
            "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url VARCHAR(500);",
            "ALTER TABLE interviews ADD COLUMN IF NOT EXISTS slot_token VARCHAR(255);",
            "ALTER TABLE interviews ADD COLUMN IF NOT EXISTS round_number INTEGER DEFAULT 1;",
            "ALTER TABLE interviews ADD COLUMN IF NOT EXISTS round_name VARCHAR(255);",
            "ALTER TABLE interviews ADD COLUMN IF NOT EXISTS round_type VARCHAR(50);",
            "ALTER TABLE interviews ADD COLUMN IF NOT EXISTS round_status VARCHAR(50);",
            "ALTER TABLE interviews ADD COLUMN IF NOT EXISTS is_additional_round BOOLEAN DEFAULT false;",
        ]
        for query in safe_alters:
            try:
                conn.execute(text(query))
            except Exception as e:
                print("Notice on alter:", e)

        # Backfill recruiter_id
        try:
            conn.execute(text("""
                UPDATE match_results mr
                SET recruiter_id = cra.recruiter_id
                FROM candidate_recruiter_assignments cra
                WHERE mr.candidate_id = cra.candidate_id
                  AND mr.job_id = cra.job_id
                  AND cra.status = 'active'
                  AND mr.recruiter_id IS NULL;
            """))
            conn.execute(text("""
                UPDATE match_results mr
                SET recruiter_id = mr.matched_by
                WHERE mr.recruiter_id IS NULL AND mr.matched_by IS NOT NULL;
            """))
            recruiter_row = conn.execute(text("""
                SELECT u.id FROM users u
                JOIN roles r ON u.role_id = r.id
                WHERE r.name = 'Recruiter' AND u.is_active = true
                ORDER BY u.id ASC LIMIT 1;
            """)).fetchone()
            if recruiter_row:
                conn.execute(text("""
                    UPDATE match_results
                    SET recruiter_id = :rid
                    WHERE recruiter_id IS NULL;
                """), {"rid": recruiter_row[0]})
            print("recruiter_id columns verified and backfilled.")
        except Exception as e:
            print("Notice on backfilling recruiter_id:", e)

    print("[SUCCESS] Database sync complete.")


if __name__ == "__main__":
    sync_db()
