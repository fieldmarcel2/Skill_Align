"""Add phone number to users and create otp_verifications table

Revision ID: b7f8a9c0d1e2
Revises: a1b2c3d4e5f6
Create Date: 2026-08-25 14:40:00 UTC
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# ── revision identifiers ────────────────────────────────────────────────────
revision: str = "b7f8a9c0d1e2"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# ═══════════════════════════════════════════════════════════════════════════
# UPGRADE
# ═══════════════════════════════════════════════════════════════════════════
def upgrade() -> None:

    # ── 1. Add phone_number column to users ──────────────────────────────────
    op.add_column(
        "users",
        sa.Column("phone_number", sa.String(20), nullable=True),
    )
    op.create_unique_constraint("uq_users_phone_number", "users", ["phone_number"])
    op.create_index("ix_users_phone_number", "users", ["phone_number"])

    # ── 2. Make email nullable (existing rows keep their email) ──────────────
    op.alter_column(
        "users",
        "email",
        existing_type=sa.String(255),
        nullable=True,
    )

    # ── 3. Make password_hash nullable (existing rows keep their hash) ───────
    op.alter_column(
        "users",
        "password_hash",
        existing_type=sa.String(255),
        nullable=True,
    )

    # ── 4. Add check constraint: at least one of email or phone_number ───────
    op.create_check_constraint(
        "ck_users_email_or_phone",
        "users",
        "email IS NOT NULL OR phone_number IS NOT NULL",
    )

    # ── 5. Create otp_verifications table ────────────────────────────────────
    op.create_table(
        "otp_verifications",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("phone_number", sa.String(20), nullable=False),
        sa.Column("otp_hash", sa.String(255), nullable=False),
        sa.Column(
            "expires_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("max_attempts", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id", name="pk_otp_verifications"),
    )
    op.create_index(
        "ix_otp_verifications_phone_number",
        "otp_verifications",
        ["phone_number"],
    )


# ═══════════════════════════════════════════════════════════════════════════
# DOWNGRADE
# ═══════════════════════════════════════════════════════════════════════════
def downgrade() -> None:

    # ── Drop otp_verifications table ─────────────────────────────────────────
    op.drop_index("ix_otp_verifications_phone_number", table_name="otp_verifications")
    op.drop_table("otp_verifications")

    # ── Remove check constraint ──────────────────────────────────────────────
    op.drop_constraint("ck_users_email_or_phone", "users", type_="check")

    # ── Restore password_hash to NOT NULL ────────────────────────────────────
    op.alter_column(
        "users",
        "password_hash",
        existing_type=sa.String(255),
        nullable=False,
    )

    # ── Restore email to NOT NULL ────────────────────────────────────────────
    op.alter_column(
        "users",
        "email",
        existing_type=sa.String(255),
        nullable=False,
    )

    # ── Drop phone_number column ─────────────────────────────────────────────
    op.drop_index("ix_users_phone_number", table_name="users")
    op.drop_constraint("uq_users_phone_number", "users", type_="unique")
    op.drop_column("users", "phone_number")
