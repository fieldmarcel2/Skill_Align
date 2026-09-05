"""
Unit Tests for Deterministic & Explainable Job-Candidate Matching Engine
========================================================================
Validates:
- Explainable matched_skills vs missing_skills breakdown.
- Multi-factor weighted score calculation.
- Experience threshold check.
- Pure deterministic logic without NLP/LLMs.
"""

import pytest
from app.models.job import Job
from app.models.job_skill import JobSkill
from app.models.skill import Skill
from app.models.candidate import Candidate
from app.models.candidate_skill import CandidateSkill
from app.services.matching_service import calculate_candidate_match_score


def test_deterministic_matching_exact_example():
    """
    Candidate: Python (Expert), FastAPI (Expert), PostgreSQL (Expert)
    Job Requirements:
      - Python (weight 5)
      - FastAPI (weight 4)
      - PostgreSQL (weight 4)
      - AWS (weight 3)
    Expected:
      matched_skills = Python, FastAPI, PostgreSQL
      missing_skills = AWS
      explainable score calculation
    """
    # 1. Mock Skills
    skill_py = Skill(id=101, name="Python", category="Programming")
    skill_fa = Skill(id=102, name="FastAPI", category="Backend")
    skill_pg = Skill(id=103, name="PostgreSQL", category="Database")
    skill_aws = Skill(id=104, name="AWS", category="Cloud")

    # 2. Mock Job
    job = Job(
        id=201,
        title="Backend Cloud Engineer",
        min_experience_years=2.0,
        job_skills=[
            JobSkill(job_id=201, skill_id=101, weight=5.0, requirement_type="required", skill=skill_py),
            JobSkill(job_id=201, skill_id=102, weight=4.0, requirement_type="required", skill=skill_fa),
            JobSkill(job_id=201, skill_id=103, weight=4.0, requirement_type="required", skill=skill_pg),
            JobSkill(job_id=201, skill_id=104, weight=3.0, requirement_type="preferred", skill=skill_aws),
        ]
    )

    # 3. Mock Candidate
    candidate = Candidate(
        id=301,
        full_name="Alex River",
        total_experience_years=3.5,
        skills=[
            CandidateSkill(candidate_id=301, skill_id=101, proficiency_level="Expert", years_experience=3.0),
            CandidateSkill(candidate_id=301, skill_id=102, proficiency_level="Expert", years_experience=2.5),
            CandidateSkill(candidate_id=301, skill_id=103, proficiency_level="Expert", years_experience=3.0),
        ]
    )

    # 4. Calculate Score
    overall_score, breakdown, meets_exp = calculate_candidate_match_score(job, candidate)

    # 5. Assertions
    matched_skills = [b["skill_name"] for b in breakdown if b["candidate_proficiency"] is not None]
    missing_skills = [b["skill_name"] for b in breakdown if b["candidate_proficiency"] is None]

    assert "Python" in matched_skills
    assert "FastAPI" in matched_skills
    assert "PostgreSQL" in matched_skills
    assert matched_skills == ["Python", "FastAPI", "PostgreSQL"]

    assert missing_skills == ["AWS"]

    # Total weight = 5 + 4 + 4 + 3 = 16
    # Earned weight = (5*1.0) + (4*1.0) + (4*1.0) + (3*0) = 13.0
    # Skill Score = (13 / 16) * 100 = 81.25%
    # Multi-factor score: 60% skill (48.75) + 20% exp (20.0, 3.5>=2.0) + 10% edu (0) + 10% location (10.0) = 78.75%
    assert overall_score == 78.75
    assert meets_exp is True


def test_experience_threshold_below_requirement():
    """Candidate has less experience than required minimum."""
    job = Job(id=202, title="Senior Architect", min_experience_years=5.0, job_skills=[])
    candidate = Candidate(id=302, full_name="Junior Dev", total_experience_years=1.5, skills=[])

    overall_score, breakdown, meets_exp = calculate_candidate_match_score(job, candidate)
    assert meets_exp is False
