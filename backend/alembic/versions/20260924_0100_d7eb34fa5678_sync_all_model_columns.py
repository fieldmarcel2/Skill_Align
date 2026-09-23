"""sync all model columns

Revision ID: d7eb34fa5678
Revises: c6db23ef1513
Create Date: 2026-09-24 01:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd7eb34fa5678'
down_revision = 'c6db23ef1513'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── users ────────────────────────────────────────────────────────────────
    op.add_column('users', sa.Column('password_reset_token', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('password_reset_expires_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index(op.f('ix_users_password_reset_token'), 'users', ['password_reset_token'], unique=False)

    # ── jobs ─────────────────────────────────────────────────────────────────
    op.add_column('jobs', sa.Column('work_mode', sa.String(length=50), nullable=True, server_default='Hybrid'))
    op.add_column('jobs', sa.Column('location_city', sa.String(length=100), nullable=True))
    op.add_column('jobs', sa.Column('location_state', sa.String(length=100), nullable=True))
    op.add_column('jobs', sa.Column('location_country', sa.String(length=50), nullable=True, server_default='India'))
    op.add_column('jobs', sa.Column('urgency', sa.String(length=50), nullable=True, server_default='30 days'))
    op.add_column('jobs', sa.Column('shift_timing', sa.String(length=50), nullable=True, server_default='Day'))
    op.add_column('jobs', sa.Column('travel_requirements', sa.String(length=100), nullable=True, server_default='None'))

    # ── candidates ───────────────────────────────────────────────────────────
    op.add_column('candidates', sa.Column('resume_s3_key', sa.String(length=500), nullable=True))
    op.add_column('candidates', sa.Column('resume_extracted_text_s3_key', sa.String(length=500), nullable=True))
    op.add_column('candidates', sa.Column('resume_filename', sa.String(length=255), nullable=True))
    op.add_column('candidates', sa.Column('resume_uploaded_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('candidates', sa.Column('resume_parsed_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('candidates', sa.Column('resume_raw_text', sa.Text(), nullable=True))
    op.add_column('candidates', sa.Column('extracted_data', sa.Text(), nullable=True))
    op.add_column('candidates', sa.Column('education_degree', sa.String(length=255), nullable=True))
    op.add_column('candidates', sa.Column('education_institution', sa.String(length=255), nullable=True))
    op.add_column('candidates', sa.Column('address', sa.Text(), nullable=True))
    op.add_column('candidates', sa.Column('city', sa.String(length=100), nullable=True))
    op.add_column('candidates', sa.Column('state', sa.String(length=100), nullable=True))
    op.add_column('candidates', sa.Column('pincode', sa.String(length=10), nullable=True))
    op.add_column('candidates', sa.Column('country', sa.String(length=50), nullable=True, server_default='India'))
    op.add_column('candidates', sa.Column('work_authorization', sa.String(length=100), nullable=True))
    op.add_column('candidates', sa.Column('preferred_work_mode', sa.String(length=50), nullable=True))
    op.add_column('candidates', sa.Column('notice_period', sa.String(length=50), nullable=True))
    op.add_column('candidates', sa.Column('current_ctc', sa.Numeric(precision=12, scale=2), nullable=True))
    op.add_column('candidates', sa.Column('expected_ctc', sa.Numeric(precision=12, scale=2), nullable=True))
    op.add_column('candidates', sa.Column('hiring_status', sa.String(length=50), nullable=True, server_default='ACTIVE'))

    # ── match_results ────────────────────────────────────────────────────────
    op.add_column('match_results', sa.Column('recruiter_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_match_results_recruiter_id_users',
        'match_results', 'users',
        ['recruiter_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_index(op.f('ix_match_results_recruiter_id'), 'match_results', ['recruiter_id'], unique=False)

    # ── offers ───────────────────────────────────────────────────────────────
    op.add_column('offers', sa.Column('fixed_compensation', sa.Numeric(precision=14, scale=2), nullable=True))
    op.add_column('offers', sa.Column('variable_compensation', sa.Numeric(precision=14, scale=2), nullable=True))
    op.add_column('offers', sa.Column('total_compensation', sa.Numeric(precision=14, scale=2), nullable=True))
    op.add_column('offers', sa.Column('bonus', sa.Numeric(precision=14, scale=2), nullable=True))
    op.add_column('offers', sa.Column('joining_bonus', sa.Numeric(precision=14, scale=2), nullable=True))
    op.add_column('offers', sa.Column('other_benefits', sa.Text(), nullable=True))
    op.add_column('offers', sa.Column('notice_period', sa.String(length=100), nullable=True))
    op.add_column('offers', sa.Column('expected_joining_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('offers', sa.Column('override_reason', sa.Text(), nullable=True))
    op.add_column('offers', sa.Column('override_approved_by', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_offers_override_approved_by_users',
        'offers', 'users',
        ['override_approved_by'], ['id'],
        ondelete='SET NULL'
    )
    op.add_column('offers', sa.Column('role_scope', sa.Text(), nullable=True))
    op.add_column('offers', sa.Column('joining_timeline', sa.String(length=100), nullable=True))
    op.add_column('offers', sa.Column('accepted_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('offers', sa.Column('rejected_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('offers', sa.Column('rejection_reason', sa.Text(), nullable=True))
    op.add_column('offers', sa.Column('submitted_to_hm_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('offers', sa.Column('hm_approved_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('offers', sa.Column('pdf_version', sa.Integer(), nullable=False, server_default='1'))


def downgrade() -> None:
    pass
