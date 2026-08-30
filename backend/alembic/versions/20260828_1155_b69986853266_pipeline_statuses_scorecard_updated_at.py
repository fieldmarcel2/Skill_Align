"""pipeline_statuses_scorecard_updated_at

Revision ID: b69986853266
Revises: b7f8a9c0d1e2
Create Date: 2026-08-28 11:55:59.955700+00:00

Changes:
- Creates candidate_scorecards table
- Adds updated_at column to match_results
- Expands match_results.status VARCHAR from 20 → 30
- Drops old status CHECK constraint and creates new 6-stage pipeline one
- Migrates old status values: matched/shortlisted → screening, rejected → rejected
- Fixes index uniqueness on candidates, skills, users
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b69986853266'
down_revision: Union[str, None] = 'b7f8a9c0d1e2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. Create candidate_scorecards table ──────────────────────────────────
    op.create_table(
        'candidate_scorecards',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('match_result_id', sa.Integer(), nullable=False),
        sa.Column('reviewer_id', sa.Integer(), nullable=True),
        sa.Column('communication_score', sa.Integer(), nullable=False),
        sa.Column('technical_score', sa.Integer(), nullable=False),
        sa.Column('overall_impression', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint('communication_score >= 1 AND communication_score <= 10', name='ck_scorecard_comm_score'),
        sa.CheckConstraint('technical_score >= 1 AND technical_score <= 10', name='ck_scorecard_tech_score'),
        sa.ForeignKeyConstraint(['match_result_id'], ['match_results.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['reviewer_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_candidate_scorecards_match_result_id'), 'candidate_scorecards', ['match_result_id'], unique=False)
    op.create_index(op.f('ix_candidate_scorecards_reviewer_id'), 'candidate_scorecards', ['reviewer_id'], unique=False)

    # ── 2. Update match_results ───────────────────────────────────────────────
    # Drop the old status CHECK constraint
    op.drop_constraint('ck_match_result_status', 'match_results', type_='check')

    # Migrate existing status values to new pipeline stages
    op.execute("UPDATE match_results SET status = 'screening' WHERE status IN ('matched', 'shortlisted')")
    # 'rejected' stays as 'rejected'

    # Expand the status column length and update server default
    op.alter_column(
        'match_results', 'status',
        existing_type=sa.VARCHAR(length=20),
        type_=sa.String(length=30),
        existing_nullable=False,
        server_default=sa.text("'screening'::character varying"),
    )

    # Create the new pipeline status CHECK constraint
    op.create_check_constraint(
        'ck_match_result_status',
        'match_results',
        "status IN ('screening', 'technical_interview', 'hr_interview', 'offer', 'hired', 'rejected')"
    )

    # Add updated_at column
    op.add_column(
        'match_results',
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False)
    )

    # ── 3. Fix index uniqueness on candidates, skills, users ─────────────────
    op.drop_index('ix_candidates_user_id', table_name='candidates')
    op.create_index(op.f('ix_candidates_user_id'), 'candidates', ['user_id'], unique=True)

    op.drop_constraint('uq_skills_name', 'skills', type_='unique')
    op.drop_index('ix_skills_name', table_name='skills')
    op.create_index(op.f('ix_skills_name'), 'skills', ['name'], unique=True)

    op.drop_constraint('uq_users_email', 'users', type_='unique')
    op.drop_constraint('uq_users_phone_number', 'users', type_='unique')
    op.drop_index('ix_users_email', table_name='users')
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.drop_index('ix_users_phone_number', table_name='users')
    op.create_index(op.f('ix_users_phone_number'), 'users', ['phone_number'], unique=True)


def downgrade() -> None:
    # Reverse index changes
    op.drop_index(op.f('ix_users_phone_number'), table_name='users')
    op.create_index('ix_users_phone_number', 'users', ['phone_number'], unique=False)
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.create_index('ix_users_email', 'users', ['email'], unique=False)
    op.create_unique_constraint('uq_users_phone_number', 'users', ['phone_number'])
    op.create_unique_constraint('uq_users_email', 'users', ['email'])

    op.drop_index(op.f('ix_skills_name'), table_name='skills')
    op.create_index('ix_skills_name', 'skills', ['name'], unique=False)
    op.create_unique_constraint('uq_skills_name', 'skills', ['name'])

    op.drop_index(op.f('ix_candidates_user_id'), table_name='candidates')
    op.create_index('ix_candidates_user_id', 'candidates', ['user_id'], unique=False)

    # Reverse match_results changes
    op.drop_column('match_results', 'updated_at')
    op.drop_constraint('ck_match_result_status', 'match_results', type_='check')

    # Migrate statuses back (best-effort)
    op.execute("UPDATE match_results SET status = 'matched' WHERE status = 'screening'")
    op.execute("UPDATE match_results SET status = 'rejected' WHERE status IN ('technical_interview', 'hr_interview', 'offer', 'hired')")

    op.alter_column(
        'match_results', 'status',
        existing_type=sa.String(length=30),
        type_=sa.VARCHAR(length=20),
        existing_nullable=False,
        server_default=sa.text("'matched'::character varying"),
    )
    op.create_check_constraint(
        'ck_match_result_status',
        'match_results',
        "status IN ('matched', 'shortlisted', 'rejected')"
    )

    # Drop scorecard table
    op.drop_index(op.f('ix_candidate_scorecards_reviewer_id'), table_name='candidate_scorecards')
    op.drop_index(op.f('ix_candidate_scorecards_match_result_id'), table_name='candidate_scorecards')
    op.drop_table('candidate_scorecards')
