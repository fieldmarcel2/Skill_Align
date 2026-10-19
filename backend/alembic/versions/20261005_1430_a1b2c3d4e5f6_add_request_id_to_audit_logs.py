"""add request_id to audit_logs for distributed tracing

Revision ID: fa3b8c9d1e2f
Revises: d7eb34fa5678
Create Date: 2026-10-05 14:30:00.000000

Why this migration:
    The existing Audit Log system records who did what and when (business/security record).
    Adding a request_id column allows correlating audit log entries with HTTP requests.

    When the same HTTP request:
      1. Performs a business action (written to audit_logs.request_id)
      2. Causes an application exception (logged with request_id)

    A developer can search logs for "request_id=abc123" and find the
    exact Audit Log entry for the same request.

    Existing records:
    - NULL is a valid value — all existing audit records predate this change.
    - Existing behavior is entirely unchanged.
    - The column is nullable and unindexed by default; an index is added
      for efficient search-by-request_id queries.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'fa3b8c9d1e2f'
down_revision = 'd7eb34fa5678'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add request_id column to audit_logs for distributed request tracing.
    # nullable=True: all existing records will have NULL — this is correct and safe.
    op.add_column(
        'audit_logs',
        sa.Column('request_id', sa.String(length=128), nullable=True)
    )
    # Index for efficient lookup: "find all audit events for request abc123"
    op.create_index(
        'ix_audit_logs_request_id',
        'audit_logs',
        ['request_id'],
        unique=False
    )


def downgrade() -> None:
    op.drop_index('ix_audit_logs_request_id', table_name='audit_logs')
    op.drop_column('audit_logs', 'request_id')
