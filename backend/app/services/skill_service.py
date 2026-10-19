"""
Skill service — Admin CRUD for the master skill list.

Read access is available to all authenticated roles.
Write access (create/update/delete) is Admin-only (enforced in the router).
"""

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.skill import Skill
from app.schemas.skill import SkillCreate, SkillUpdate, SkillOut


import re

# ── Canonical Alias Dictionary ───────────────────────────────────────────────
SKILL_ALIASES = {
    "reactjs": "React",
    "react.js": "React",
    "react native": "React Native",
    "nodejs": "Node.js",
    "node.js": "Node.js",
    "node": "Node.js",
    "expressjs": "Express.js",
    "express.js": "Express.js",
    "nextjs": "Next.js",
    "next.js": "Next.js",
    "vuejs": "Vue.js",
    "vue.js": "Vue.js",
    "angularjs": "Angular",
    "angular.js": "Angular",
    "py": "Python",
    "python3": "Python",
    "python 3": "Python",
    "golang": "Go",
    "go lang": "Go",
    "ts": "TypeScript",
    "js": "JavaScript",
    "postgres": "PostgreSQL",
    "postgresql": "PostgreSQL",
    "postgres sql": "PostgreSQL",
    "k8s": "Kubernetes",
    "amazon web services": "AWS",
    "aws cloud": "AWS",
    "azure": "Microsoft Azure",
    "ms azure": "Microsoft Azure",
    "gcp": "Google Cloud",
    "google cloud platform": "Google Cloud",
    "docker container": "Docker",
    "docker containers": "Docker",
    "ci / cd": "CI/CD",
    "cicd": "CI/CD",
    "github action": "GitHub Actions",
    "git hub": "Git",
    "restful api": "REST API",
    "rest apis": "REST API",
    "rest api": "REST API",
    "fast api": "FastAPI",
    "mongo": "MongoDB",
    "mongo db": "MongoDB",
    "ms sql": "SQL Server",
    "microsoft sql server": "SQL Server",
    "azure devops": "Azure DevOps",
}

# ── Junk & Spam Blocklist (Phrases, Non-Skills, Profanity) ───────────────────
JUNK_SKILL_PHRASES = {
    "hardworking", "team player", "responsible for", "self motivated",
    "years of experience", "years experience", "good communication",
    "etc", "various", "n/a", "none", "unknown", "other", "nothing",
    "eating", "sleeping", "playing games", "badword", "fraud", "hacker",
    "work ethic", "fast learner", "quick learner", "problem solver"
}


def sanitize_skill_name(name: str) -> str:
    """
    Validates, sanitizes, and normalizes candidate-submitted skill strings.
    Rejects spam, profanity, HTML tags, URLs, and excessive length.
    """
    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Skill name cannot be empty."
        )

    # Strip whitespace, quotes, HTML tags
    cleaned = re.sub(r"<[^>]*>", "", name).strip().strip("\"'").strip()

    # Reject URLs and emails
    if re.search(r"https?://|www\.|\.com|\.org|@|\\", cleaned, re.IGNORECASE):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"'{name}' is not a valid skill identifier (contains URLs/forbidden symbols)."
        )

    # Length constraints
    if len(cleaned) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Skill name must be at least 2 characters long."
        )
    if len(cleaned) > 60:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Skill name cannot exceed 60 characters."
        )

    # Check against non-skill / junk blocklist
    lower = cleaned.lower()
    if lower in JUNK_SKILL_PHRASES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"'{cleaned}' is a generic descriptor or subjective phrase, not a recognized technical/domain skill."
        )

    # Check forbidden character patterns (e.g. pure numbers, random punctuation spam)
    if not re.search(r"[a-zA-Z]", cleaned):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"'{name}' must contain alphabetic characters."
        )

    # Resolve alias if present
    canonical_alias = SKILL_ALIASES.get(lower)
    if canonical_alias:
        return canonical_alias

    return cleaned


def create_skill(db: Session, data: SkillCreate) -> SkillOut:
    name_clean = sanitize_skill_name(data.name)
    
    # Check if skill exists in canonical DB (case-insensitive)
    existing = db.query(Skill).filter(Skill.name.ilike(name_clean)).first()
    if existing:
        return SkillOut.model_validate(existing)
        
    skill = Skill(name=name_clean, category=data.category or "Technical")
    db.add(skill)
    db.commit()
    db.refresh(skill)
    return SkillOut.model_validate(skill)


def list_skills(db: Session, category: str | None = None) -> list[SkillOut]:
    query = db.query(Skill)
    if category:
        query = query.filter(Skill.category == category)
    return [SkillOut.model_validate(s) for s in query.order_by(Skill.name).all()]


def get_skill(db: Session, skill_id: int) -> SkillOut:
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found.")
    return SkillOut.model_validate(skill)


def update_skill(db: Session, skill_id: int, data: SkillUpdate) -> SkillOut:
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found.")

    if data.name is not None:
        # Check for name conflict with another skill
        existing = db.query(Skill).filter(Skill.name == data.name, Skill.id != skill_id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A skill named '{data.name}' already exists.",
            )
        skill.name = data.name

    if data.category is not None:
        skill.category = data.category

    db.commit()
    db.refresh(skill)
    return SkillOut.model_validate(skill)


def delete_skill(db: Session, skill_id: int) -> None:
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found.")

    # Check if skill is in use — give a clear error rather than a DB FK error
    if skill.job_skills or skill.candidate_skills:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Cannot delete skill: it is referenced by existing jobs or candidate profiles. "
                "Remove those references first."
            ),
        )

    db.delete(skill)
    db.commit()
