"""
SkillAlign Database Seed Script
================================

PURPOSE
-------
This script populates the database with:
  1. Required production data (roles) — ALWAYS run this in any environment.
  2. Development-only sample data    — run only locally / in staging.

WARNING
-------
  - This file is for DEVELOPMENT use. Do NOT run the development seed on
    a production database unless you are intentionally setting up demo data.
  - Demo credentials below are plaintext only here for display; the actual
    values stored in the DB are bcrypt hashes.

USAGE
-----
From the backend/ directory:

  # Seed roles only (safe for production)
  python -m scripts.seed --roles-only

  # Seed everything (dev/staging only)
  python -m scripts.seed --dev

  # Both flags are idempotent — running twice is safe.
"""

import sys
import os
import argparse

# Make app importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

from sqlalchemy.exc import IntegrityError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

db_url = os.environ.get("DATABASE_URL") or settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

engine = create_engine(db_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

from app.models.role import Role
from app.models.user import User
from app.models.skill import Skill
from app.models.candidate import Candidate
from app.models.candidate_skill import CandidateSkill
from app.models.job import Job
from app.models.job_skill import JobSkill


# ── Bcrypt helper (minimal, no FastAPI dependency) ────────────────────────
import bcrypt

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


# ═══════════════════════════════════════════════════════════════════════════
# PRODUCTION DATA — Roles
# ═══════════════════════════════════════════════════════════════════════════

ROLES = [
    {"id": 1, "name": "Admin"},
    {"id": 2, "name": "HR"},
    {"id": 3, "name": "Recruiter"},
    {"id": 4, "name": "Candidate"},
]


def seed_roles(db) -> None:
    """Idempotently seed the four required roles."""
    print("  → Seeding roles...")
    for r in ROLES:
        existing = db.query(Role).filter_by(id=r["id"]).first()
        if not existing:
            db.add(Role(id=r["id"], name=r["name"]))
    db.commit()
    print("  ✓ Roles seeded.")


# ═══════════════════════════════════════════════════════════════════════════
# DEVELOPMENT DATA
# ═══════════════════════════════════════════════════════════════════════════

DEV_SKILLS = [
    # Frontend Technologies
    {"name": "HTML5", "category": "Frontend"},
    {"name": "CSS3", "category": "Frontend"},
    {"name": "HTML", "category": "Frontend"},
    {"name": "CSS", "category": "Frontend"},
    {"name": "React.js", "category": "Frontend"},
    {"name": "React", "category": "Frontend"},
    {"name": "Next.js", "category": "Frontend"},
    {"name": "Vue.js", "category": "Frontend"},
    {"name": "Angular", "category": "Frontend"},
    {"name": "Nuxt.js", "category": "Frontend"},
    {"name": "Svelte", "category": "Frontend"},
    {"name": "Vite", "category": "Frontend"},
    {"name": "Webpack", "category": "Frontend"},
    {"name": "Redux", "category": "Frontend"},
    {"name": "Redux Toolkit", "category": "Frontend"},
    {"name": "Zustand", "category": "Frontend"},
    {"name": "Tailwind CSS", "category": "Frontend"},
    {"name": "Bootstrap", "category": "Frontend"},
    {"name": "Sass / SCSS", "category": "Frontend"},
    {"name": "Material-UI (MUI)", "category": "Frontend"},
    {"name": "Chakra UI", "category": "Frontend"},
    {"name": "Framer Motion", "category": "Frontend"},
    {"name": "Three.js", "category": "Frontend"},
    {"name": "WebSockets", "category": "Frontend"},
    {"name": "Responsive Design", "category": "Frontend"},

    # Programming Languages
    {"name": "Python", "category": "Programming"},
    {"name": "JavaScript", "category": "Programming"},
    {"name": "TypeScript", "category": "Programming"},
    {"name": "Java", "category": "Programming"},
    {"name": "C++", "category": "Programming"},
    {"name": "C#", "category": "Programming"},
    {"name": "C", "category": "Programming"},
    {"name": "Go", "category": "Programming"},
    {"name": "Rust", "category": "Programming"},
    {"name": "PHP", "category": "Programming"},
    {"name": "Ruby", "category": "Programming"},
    {"name": "Kotlin", "category": "Programming"},
    {"name": "Swift", "category": "Programming"},
    {"name": "Dart", "category": "Programming"},
    {"name": "Bash / Shell", "category": "Programming"},
    {"name": "SQL", "category": "Programming"},

    # Backend Frameworks & Systems
    {"name": "FastAPI", "category": "Backend"},
    {"name": "Django", "category": "Backend"},
    {"name": "Flask", "category": "Backend"},
    {"name": "Node.js", "category": "Backend"},
    {"name": "Express.js", "category": "Backend"},
    {"name": "NestJS", "category": "Backend"},
    {"name": "Spring Boot", "category": "Backend"},
    {"name": "ASP.NET Core", "category": "Backend"},
    {"name": "Laravel", "category": "Backend"},
    {"name": "Ruby on Rails", "category": "Backend"},
    {"name": "GraphQL", "category": "Backend"},
    {"name": "REST APIs", "category": "Backend"},
    {"name": "gRPC", "category": "Backend"},
    {"name": "Microservices", "category": "Backend"},
    {"name": "Celery", "category": "Backend"},
    {"name": "RabbitMQ", "category": "Backend"},
    {"name": "Kafka", "category": "Backend"},
    {"name": "Redis", "category": "Backend"},
    {"name": "Elasticsearch", "category": "Backend"},

    # Tools, SCM & Productivity
    {"name": "Git", "category": "Tools"},
    {"name": "GitHub", "category": "Tools"},
    {"name": "GitLab", "category": "Tools"},
    {"name": "Bitbucket", "category": "Tools"},
    {"name": "Postman", "category": "Tools"},
    {"name": "JIRA", "category": "Tools"},
    {"name": "Confluence", "category": "Tools"},
    {"name": "Swagger / OpenAPI", "category": "Tools"},
    {"name": "VS Code", "category": "Tools"},
    {"name": "Figma", "category": "Tools"},

    # DevOps & Cloud
    {"name": "Docker", "category": "DevOps"},
    {"name": "Kubernetes", "category": "DevOps"},
    {"name": "Helm", "category": "DevOps"},
    {"name": "Terraform", "category": "DevOps"},
    {"name": "Ansible", "category": "DevOps"},
    {"name": "CI/CD Pipelines", "category": "DevOps"},
    {"name": "GitHub Actions", "category": "DevOps"},
    {"name": "GitLab CI", "category": "DevOps"},
    {"name": "Jenkins", "category": "DevOps"},
    {"name": "Linux", "category": "DevOps"},
    {"name": "Nginx", "category": "DevOps"},
    {"name": "Apache", "category": "DevOps"},
    {"name": "AWS", "category": "Cloud"},
    {"name": "AWS EC2", "category": "Cloud"},
    {"name": "AWS S3", "category": "Cloud"},
    {"name": "AWS Lambda", "category": "Cloud"},
    {"name": "AWS CloudWatch", "category": "Cloud"},
    {"name": "GCP", "category": "Cloud"},
    {"name": "Google Cloud Run", "category": "Cloud"},
    {"name": "Azure", "category": "Cloud"},
    {"name": "Azure DevOps", "category": "Cloud"},
    {"name": "Cloudflare", "category": "Cloud"},
    {"name": "Serverless", "category": "Cloud"},
    {"name": "Prometheus", "category": "DevOps"},
    {"name": "Grafana", "category": "DevOps"},

    # Databases & Storage
    {"name": "PostgreSQL", "category": "Database"},
    {"name": "MySQL", "category": "Database"},
    {"name": "MongoDB", "category": "Database"},
    {"name": "SQLite", "category": "Database"},
    {"name": "DynamoDB", "category": "Database"},
    {"name": "Supabase", "category": "Database"},
    {"name": "Firebase", "category": "Database"},
    {"name": "Cassandra", "category": "Database"},
    {"name": "Prisma", "category": "Database"},
    {"name": "SQLAlchemy", "category": "Database"},

    # AI & Data Science
    {"name": "Machine Learning", "category": "AI"},
    {"name": "Deep Learning", "category": "AI"},
    {"name": "Large Language Models (LLMs)", "category": "AI"},
    {"name": "Prompt Engineering", "category": "AI"},
    {"name": "LangChain", "category": "AI"},
    {"name": "LlamaIndex", "category": "AI"},
    {"name": "Hugging Face", "category": "AI"},
    {"name": "Vector Databases", "category": "AI"},
    {"name": "OpenAI API", "category": "AI"},
    {"name": "PyTorch", "category": "AI"},
    {"name": "TensorFlow", "category": "AI"},
    {"name": "scikit-learn", "category": "AI"},
    {"name": "NLP", "category": "AI"},
    {"name": "Pandas", "category": "Data Science"},
    {"name": "NumPy", "category": "Data Science"},
    {"name": "Databricks", "category": "Data Science"},
    {"name": "dbt", "category": "Data Science"},
    {"name": "Apache Airflow", "category": "Data Science"},
    {"name": "Apache Spark", "category": "Data Science"},
    {"name": "Snowflake", "category": "Data Science"},
    {"name": "BigQuery", "category": "Data Science"},
    {"name": "Power BI", "category": "Analytics"},
    {"name": "Tableau", "category": "Analytics"},

    # Testing & QA
    {"name": "pytest", "category": "Testing"},
    {"name": "Jest", "category": "Testing"},
    {"name": "Vitest", "category": "Testing"},
    {"name": "Cypress", "category": "Testing"},
    {"name": "Playwright", "category": "Testing"},
    {"name": "Selenium", "category": "Testing"},
    {"name": "JUnit", "category": "Testing"},
    {"name": "Unit Testing", "category": "Testing"},
    {"name": "Integration Testing", "category": "Testing"},

    # Security
    {"name": "OAuth 2.0", "category": "Security"},
    {"name": "JWT", "category": "Security"},
    {"name": "OWASP Security", "category": "Security"},
    {"name": "SIEM", "category": "Security"},
    {"name": "Network Security", "category": "Security"},
    {"name": "Keycloak", "category": "Security"},
    {"name": "Role-Based Access Control (RBAC)", "category": "Security"},

    # Mobile
    {"name": "React Native", "category": "Mobile"},
    {"name": "Flutter", "category": "Mobile"},
    {"name": "iOS Development", "category": "Mobile"},
    {"name": "Android Development", "category": "Mobile"},
]

# ---------------------------------------------------------------------------
# DEV CREDENTIALS — display only; bcrypt-hashed before DB insert
# ---------------------------------------------------------------------------
# ┌──────────────────┬─────────────────────────────┬──────────────┬──────────────┐
# │ Role             │ Email                        │ Password     │ NOTE         │
# ├──────────────────┼─────────────────────────────┼──────────────┼──────────────┤
# │ Admin            │ admin@skillaign.dev          │ Admin@123    │ DEV ONLY     │
# │ HR               │ hr@skillaign.dev             │ HR@12345     │ DEV ONLY     │
# │ Recruiter        │ recruiter@skillaign.dev      │ Rec@12345    │ DEV ONLY     │
# │ Candidate        │ alice@candidate.dev          │ Alice@123    │ DEV ONLY     │
# │ Candidate        │ bob@candidate.dev            │ Bob@12345    │ DEV ONLY     │
# └──────────────────┴─────────────────────────────┴──────────────┴──────────────┘

DEV_USERS = [
    {
        "name": "System Admin",
        "email": "admin@skillaign.dev",
        "password": "Admin@123",
        "role_id": 1,
    },
    {
        "name": "System Admin",
        "email": "admin@skillalign.dev",
        "password": "Admin@123",
        "role_id": 1,
    },
    {
        "name": "Sarah HR",
        "email": "hr@skillaign.dev",
        "password": "HR@12345",
        "role_id": 2,
    },
    {
        "name": "Sarah HR",
        "email": "hr@skillalign.dev",
        "password": "HR@12345",
        "role_id": 2,
    },
    {
        "name": "James Recruiter",
        "email": "recruiter@skillaign.dev",
        "password": "Rec@12345",
        "role_id": 3,
    },
    {
        "name": "James Recruiter",
        "email": "recruiter@skillalign.dev",
        "password": "Pass@123",
        "role_id": 3,
    },
    {
        "name": "Alice Johnson",
        "email": "alice@candidate.dev",
        "password": "Alice@123",
        "role_id": 4,
    },
    {
        "name": "Bob Smith",
        "email": "bob@candidate.dev",
        "password": "Bob@12345",
        "role_id": 4,
    },
    {
        "name": "Shiva Candidate",
        "email": "shiva4850t@gmail.com",
        "password": "Password123!",
        "role_id": 4,
    },
]

DEV_JOBS = [
    {
        "title": "Senior Backend Developer",
        "description": "Build and maintain Python/FastAPI microservices.",
        "department": "Engineering",
        "client_name": "TechCorp Solutions",
        "min_experience_years": 3,
        "status": "active",
        "recruiter_email": "recruiter@skillaign.dev",
        "skills": [
            {"name": "Python",     "type": "required",  "weight": 5},
            {"name": "FastAPI",    "type": "required",  "weight": 4},
            {"name": "PostgreSQL", "type": "required",  "weight": 4},
            {"name": "Docker",     "type": "preferred", "weight": 3},
            {"name": "AWS",        "type": "preferred", "weight": 2},
        ],
    },
    {
        "title": "Full-Stack Engineer",
        "description": "React frontend + Node.js backend for SaaS product.",
        "department": "Product",
        "client_name": "StartupXYZ",
        "min_experience_years": 2,
        "status": "active",
        "recruiter_email": "recruiter@skillaign.dev",
        "skills": [
            {"name": "React",      "type": "required",  "weight": 5},
            {"name": "TypeScript", "type": "required",  "weight": 4},
            {"name": "Node.js",    "type": "required",  "weight": 4},
            {"name": "PostgreSQL", "type": "preferred", "weight": 2},
            {"name": "Docker",     "type": "preferred", "weight": 2},
        ],
    },
]

DEV_CANDIDATES = [
    {
        "user_email": "alice@candidate.dev",
        "full_name": "Alice Johnson",
        "phone": "+91-9876543210",
        "total_experience_years": 4,
        "skills": [
            {"name": "Python",     "proficiency": "Expert",        "years": 4},
            {"name": "FastAPI",    "proficiency": "Intermediate",  "years": 2},
            {"name": "PostgreSQL", "proficiency": "Intermediate",  "years": 3},
            {"name": "Docker",     "proficiency": "Beginner",      "years": 1},
            {"name": "React",      "proficiency": "Beginner",      "years": 1},
        ],
    },
    {
        "user_email": "bob@candidate.dev",
        "full_name": "Bob Smith",
        "phone": "+91-9123456789",
        "total_experience_years": 2,
        "skills": [
            {"name": "React",      "proficiency": "Expert",        "years": 2},
            {"name": "TypeScript", "proficiency": "Intermediate",  "years": 2},
            {"name": "Node.js",    "proficiency": "Intermediate",  "years": 1},
            {"name": "JavaScript", "proficiency": "Expert",        "years": 3},
        ],
    },
    {
        "user_email": "shiva4850t@gmail.com",
        "full_name": "Shiva Candidate",
        "phone": "+91-9999999999",
        "total_experience_years": 3,
        "skills": [
            {"name": "Python",     "proficiency": "Expert",        "years": 3},
            {"name": "FastAPI",    "proficiency": "Expert",        "years": 2},
            {"name": "React",      "proficiency": "Intermediate",  "years": 2},
        ],
    },
]


def seed_dev_data(db) -> None:
    """Seed development-only sample data."""

    print("  → Seeding skills...")
    skill_map: dict[str, Skill] = {}
    for s in DEV_SKILLS:
        existing = db.query(Skill).filter_by(name=s["name"]).first()
        if not existing:
            skill = Skill(name=s["name"], category=s["category"])
            db.add(skill)
            db.flush()
            skill_map[s["name"]] = skill
        else:
            skill_map[s["name"]] = existing
    db.commit()
    print(f"  ✓ {len(skill_map)} skills available.")

    print("  → Seeding dev users...")
    user_map: dict[str, User] = {}
    for u in DEV_USERS:
        existing = db.query(User).filter_by(email=u["email"]).first()
        if not existing:
            user = User(
                name=u["name"],
                email=u["email"],
                password_hash=hash_password(u["password"]),
                role_id=u["role_id"],
                is_active=True,
            )
            db.add(user)
            db.flush()
            user_map[u["email"]] = user
        else:
            user_map[u["email"]] = existing
    db.commit()
    print(f"  ✓ {len(user_map)} dev users ready.")

    print("  → Seeding dev jobs...")
    for j in DEV_JOBS:
        recruiter = user_map.get(j["recruiter_email"])
        if not recruiter:
            print(f"  ⚠ Recruiter {j['recruiter_email']!r} not found; skipping job.")
            continue
        existing_job = db.query(Job).filter_by(title=j["title"], created_by=recruiter.id).first()
        if existing_job:
            job = existing_job
        else:
            job = Job(
                title=j["title"],
                description=j["description"],
                department=j["department"],
                client_name=j["client_name"],
                min_experience_years=j["min_experience_years"],
                status=j["status"],
                created_by=recruiter.id,
            )
            db.add(job)
            db.flush()

            for s in j["skills"]:
                skill = skill_map.get(s["name"])
                if skill:
                    js = JobSkill(
                        job_id=job.id,
                        skill_id=skill.id,
                        requirement_type=s["type"],
                        weight=s["weight"],
                    )
                    db.add(js)
    db.commit()
    print("  ✓ Dev jobs seeded.")

    print("  → Seeding candidate profiles...")
    for c in DEV_CANDIDATES:
        user = user_map.get(c["user_email"])
        if not user:
            print(f"  ⚠ User {c['user_email']!r} not found; skipping candidate.")
            continue
        existing = db.query(Candidate).filter_by(user_id=user.id).first()
        if existing:
            candidate = existing
        else:
            candidate = Candidate(
                user_id=user.id,
                full_name=c["full_name"],
                phone=c["phone"],
                total_experience_years=c["total_experience_years"],
            )
            db.add(candidate)
            db.flush()

            for s in c["skills"]:
                skill = skill_map.get(s["name"])
                if skill:
                    cs = CandidateSkill(
                        candidate_id=candidate.id,
                        skill_id=skill.id,
                        proficiency_level=s["proficiency"],
                        years_experience=s["years"],
                    )
                    db.add(cs)
    db.commit()
    print("  ✓ Candidate profiles seeded.")


# ═══════════════════════════════════════════════════════════════════════════
# ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════

def main() -> None:
    parser = argparse.ArgumentParser(description="SkillAlign seed script")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--roles-only",
        action="store_true",
        help="Seed only the 4 required roles (safe for production).",
    )
    group.add_argument(
        "--dev",
        action="store_true",
        help="Seed roles + sample skills/users/jobs/candidates (DEV ONLY).",
    )
    args = parser.parse_args()

    print("\n=== SkillAlign Seed Script ===")
    db = SessionLocal()
    try:
        seed_roles(db)
        if args.dev:
            print("\n  ⚠  Development seed mode — do NOT run on production!\n")
            seed_dev_data(db)
        print("\n✅  Seed complete.\n")
    except Exception as exc:
        db.rollback()
        print(f"\n❌  Seed failed: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
