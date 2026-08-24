"""Initial schema — SkillAlign core 8 tables

Creates:
  roles, users, skills, jobs, job_skills,
  candidates, candidate_skills, match_results

Revision ID: 001_initial_schema
Revises: None
Create Date: 2026-08-24 00:00:00 UTC
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# ── revision identifiers ────────────────────────────────────────────────────
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# ═══════════════════════════════════════════════════════════════════════════
# UPGRADE — create all tables in dependency order
# ═══════════════════════════════════════════════════════════════════════════
def upgrade() -> None:

    # ── 1. roles ─────────────────────────────────────────────────────────────
    op.create_table(
        "roles",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(50), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_roles"),
        sa.UniqueConstraint("name", name="uq_roles_name"),
    )

    # ── 2. skills ────────────────────────────────────────────────────────────
    op.create_table(
        "skills",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("category", sa.String(100), nullable=False, server_default="Other"),
        sa.PrimaryKeyConstraint("id", name="pk_skills"),
        sa.UniqueConstraint("name", name="uq_skills_name"),
    )
    op.create_index("ix_skills_name", "skills", ["name"])

    # ── 3. users ─────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role_id", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["role_id"], ["roles.id"],
            name="fk_users_role_id",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_users"),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_role_id", "users", ["role_id"])

    # ── 4. jobs ──────────────────────────────────────────────────────────────
    op.create_table(
        "jobs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("department", sa.String(150), nullable=True),
        sa.Column("client_name", sa.String(255), nullable=True),
        sa.Column(
            "min_experience_years",
            sa.Numeric(precision=4, scale=1),
            nullable=False,
            server_default="0",
        ),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column("created_by", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["created_by"], ["users.id"],
            name="fk_jobs_created_by",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_jobs"),
    )
    op.create_index("ix_jobs_status", "jobs", ["status"])
    op.create_index("ix_jobs_created_by", "jobs", ["created_by"])

    # ── 5. job_skills ────────────────────────────────────────────────────────
    op.create_table(
        "job_skills",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("job_id", sa.Integer(), nullable=False),
        sa.Column("skill_id", sa.Integer(), nullable=False),
        sa.Column("requirement_type", sa.String(20), nullable=False, server_default="required"),
        sa.Column(
            "weight",
            sa.Numeric(precision=5, scale=2),
            nullable=False,
            server_default="1.0",
        ),
        sa.ForeignKeyConstraint(
            ["job_id"], ["jobs.id"],
            name="fk_job_skills_job_id",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["skill_id"], ["skills.id"],
            name="fk_job_skills_skill_id",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_job_skills"),
        sa.UniqueConstraint("job_id", "skill_id", name="uq_job_skill"),
        sa.CheckConstraint(
            "requirement_type IN ('required', 'preferred')",
            name="ck_job_skill_requirement_type",
        ),
        sa.CheckConstraint("weight > 0", name="ck_job_skill_weight_positive"),
    )
    op.create_index("ix_job_skills_job_id", "job_skills", ["job_id"])
    op.create_index("ix_job_skills_skill_id", "job_skills", ["skill_id"])

    # ── 6. candidates ────────────────────────────────────────────────────────
    op.create_table(
        "candidates",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(30), nullable=True),
        sa.Column("resume_file_path", sa.Text(), nullable=True),
        sa.Column(
            "total_experience_years",
            sa.Numeric(precision=4, scale=1),
            nullable=False,
            server_default="0",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"],
            name="fk_candidates_user_id",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_candidates"),
        sa.UniqueConstraint("user_id", name="uq_candidate_user"),
    )
    op.create_index("ix_candidates_user_id", "candidates", ["user_id"])

    # ── 7. candidate_skills ───────────────────────────────────────────────────
    op.create_table(
        "candidate_skills",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), nullable=False),
        sa.Column("skill_id", sa.Integer(), nullable=False),
        sa.Column("proficiency_level", sa.String(20), nullable=False, server_default="Beginner"),
        sa.Column(
            "years_experience",
            sa.Numeric(precision=4, scale=1),
            nullable=False,
            server_default="0",
        ),
        sa.ForeignKeyConstraint(
            ["candidate_id"], ["candidates.id"],
            name="fk_candidate_skills_candidate_id",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["skill_id"], ["skills.id"],
            name="fk_candidate_skills_skill_id",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_candidate_skills"),
        sa.UniqueConstraint("candidate_id", "skill_id", name="uq_candidate_skill"),
        sa.CheckConstraint(
            "proficiency_level IN ('Beginner', 'Intermediate', 'Expert')",
            name="ck_candidate_skill_proficiency",
        ),
        sa.CheckConstraint(
            "years_experience >= 0",
            name="ck_candidate_skill_years_non_negative",
        ),
    )
    op.create_index("ix_candidate_skills_candidate_id", "candidate_skills", ["candidate_id"])
    op.create_index("ix_candidate_skills_skill_id", "candidate_skills", ["skill_id"])

    # ── 8. match_results ──────────────────────────────────────────────────────
    op.create_table(
        "match_results",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("job_id", sa.Integer(), nullable=False),
        sa.Column("candidate_id", sa.Integer(), nullable=False),
        sa.Column("matched_by", sa.Integer(), nullable=True),
        sa.Column(
            "overall_score",
            sa.Numeric(precision=5, scale=2),
            nullable=False,
            server_default="0",
        ),
        sa.Column("status", sa.String(20), nullable=False, server_default="matched"),
        sa.Column(
            "matched_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["job_id"], ["jobs.id"],
            name="fk_match_results_job_id",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["candidate_id"], ["candidates.id"],
            name="fk_match_results_candidate_id",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["matched_by"], ["users.id"],
            name="fk_match_results_matched_by",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_match_results"),
        sa.UniqueConstraint("job_id", "candidate_id", name="uq_match_result"),
        sa.CheckConstraint(
            "status IN ('matched', 'shortlisted', 'rejected')",
            name="ck_match_result_status",
        ),
        sa.CheckConstraint(
            "overall_score >= 0 AND overall_score <= 100",
            name="ck_match_result_score_range",
        ),
    )
    op.create_index("ix_match_results_job_id", "match_results", ["job_id"])
    op.create_index("ix_match_results_candidate_id", "match_results", ["candidate_id"])
    op.create_index("ix_match_results_matched_by", "match_results", ["matched_by"])
    op.create_index("ix_match_results_status", "match_results", ["status"])


# ═══════════════════════════════════════════════════════════════════════════
# DOWNGRADE — drop tables in reverse dependency order
# ═══════════════════════════════════════════════════════════════════════════
def downgrade() -> None:
    op.drop_table("match_results")
    op.drop_table("candidate_skills")
    op.drop_table("candidates")
    op.drop_table("job_skills")
    op.drop_table("jobs")
    op.drop_table("users")
    op.drop_table("skills")
    op.drop_table("roles")
