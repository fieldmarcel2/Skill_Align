from app.database.base import Base  # noqa: F401

# Import all models so Alembic can detect them
from app.models.role import Role  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.skill import Skill  # noqa: F401
from app.models.job import Job  # noqa: F401
from app.models.job_skill import JobSkill  # noqa: F401
from app.models.candidate import Candidate  # noqa: F401
from app.models.candidate_skill import CandidateSkill  # noqa: F401
from app.models.match_result import MatchResult  # noqa: F401
from app.models.otp_verification import OTPVerification  # noqa: F401

