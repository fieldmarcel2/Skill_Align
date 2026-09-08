import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from app.database.session import engine

with engine.connect() as conn:
    res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='interviews';"))
    cols = [r[0] for r in res.fetchall()]
    print("Current interviews columns:", cols)

    # Add interviewer competency rating columns if they don't exist
    new_cols = [
        ("interviewer_technical_rating", "INTEGER"),
        ("interviewer_communication_rating", "INTEGER"),
        ("interviewer_problem_solving_rating", "INTEGER"),
        ("interviewer_role_fit_rating", "INTEGER"),
        ("interviewer_overall_rating", "INTEGER"),
        ("interviewer_comments", "TEXT"),
        ("interviewer_id", "INTEGER REFERENCES users(id) ON DELETE SET NULL"),
        ("interviewer_submitted_at", "TIMESTAMP WITH TIME ZONE"),
    ]

    for col_name, col_type in new_cols:
        if col_name not in cols:
            print(f"Adding column {col_name} ({col_type})...")
            conn.execute(text(f"ALTER TABLE interviews ADD COLUMN IF NOT EXISTS {col_name} {col_type};"))
            conn.commit()
    print("Checking offers table...")
    res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='offers';"))
    offer_cols = [r[0] for r in res.fetchall()]
    print("Current offers columns:", offer_cols)

    offer_new_cols = [
        ("role_scope", "TEXT"),
        ("joining_timeline", "VARCHAR(100)"),
    ]

    for col_name, col_type in offer_new_cols:
        if col_name not in offer_cols:
            print(f"Adding column {col_name} ({col_type}) to offers...")
            conn.execute(text(f"ALTER TABLE offers ADD COLUMN IF NOT EXISTS {col_name} {col_type};"))
            conn.commit()
            print(f"Added {col_name} successfully.")
        else:
            print(f"Column {col_name} already exists in offers.")

    print("Migration complete!")

