"""
Clean up duplicate jobs, matches, and interviews.
Establish 3 standard, realistic job requisitions with proper skill weights,
and compute clean match results across all 4 candidates.
"""

import sys
import os
import io
from decimal import Decimal

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.database.session import SessionLocal
from app.models.user import User
from app.models.skill import Skill
from app.models.job import Job
from app.models.job_skill import JobSkill
from app.models.candidate import Candidate
from app.models.match_result import MatchResult
from app.models.interview import Interview
from app.models.notification import Notification
from app.services.matching_service import run_job_matching


def clean_jobs_and_pipeline():
    db = SessionLocal()
    try:
        print("\n--- Cleaning up duplicate jobs & orphan match records ---")

        # 1. Fetch Recruiter user
        recruiter = db.query(User).filter(User.email == "recruiter@skillaign.dev").first()
        if not recruiter:
            recruiter = db.query(User).filter(User.role.has(name="Recruiter")).first()

        # 2. Delete all old interviews, scorecards, match results, job_skills, and jobs
        db.query(Interview).delete(synchronize_session=False)
        db.query(MatchResult).delete(synchronize_session=False)
        db.query(JobSkill).delete(synchronize_session=False)
        db.query(Job).delete(synchronize_session=False)
        db.commit()

        print("  All duplicate and test jobs removed.")

        # 3. Create 3 Clean, Industry-Standard Job Requisitions
        skills_map = {s.name: s.id for s in db.query(Skill).all()}

        job1 = Job(
            title="Senior Backend Developer",
            description="Seeking a Senior Backend Developer proficient in Python, FastAPI, PostgreSQL, and scalable microservice architectures.",
            min_experience_years=2.0,
            status="active",
            created_by=recruiter.id,
        )
        db.add(job1)
        db.flush()

        # Add skills for Job 1
        for sname, req_type, weight in [("Python", "required", 5.0), ("FastAPI", "required", 4.0), ("PostgreSQL", "required", 4.0), ("Docker", "preferred", 3.0), ("AWS", "preferred", 3.0)]:
            if sname in skills_map:
                db.add(JobSkill(job_id=job1.id, skill_id=skills_map[sname], requirement_type=req_type, weight=Decimal(str(weight))))

        job2 = Job(
            title="Full-Stack Engineer",
            description="Join our product team to build high-performance web applications using React, TypeScript, and modern API backends.",
            min_experience_years=2.0,
            status="active",
            created_by=recruiter.id,
        )
        db.add(job2)
        db.flush()

        # Add skills for Job 2
        for sname, req_type, weight in [("React", "required", 5.0), ("TypeScript", "required", 4.0), ("FastAPI", "preferred", 4.0), ("PostgreSQL", "preferred", 3.0), ("Tailwind CSS", "preferred", 3.0)]:
            if sname in skills_map:
                db.add(JobSkill(job_id=job2.id, skill_id=skills_map[sname], requirement_type=req_type, weight=Decimal(str(weight))))

        job3 = Job(
            title="Cloud & DevOps Architect",
            description="Lead our cloud infrastructure automation, CI/CD pipelines, and containerized deployments on AWS.",
            min_experience_years=3.0,
            status="active",
            created_by=recruiter.id,
        )
        db.add(job3)
        db.flush()

        # Add skills for Job 3
        for sname, req_type, weight in [("AWS", "required", 5.0), ("Docker", "required", 4.0), ("Python", "preferred", 3.0), ("Node.js", "preferred", 3.0)]:
            if sname in skills_map:
                db.add(JobSkill(job_id=job3.id, skill_id=skills_map[sname], requirement_type=req_type, weight=Decimal(str(weight))))

        db.commit()
        print("  Created 3 Clean Job Requisitions:")
        print(f"    - [{job1.id}] {job1.title}")
        print(f"    - [{job2.id}] {job2.title}")
        print(f"    - [{job3.id}] {job3.title}")

        # 4. Compute Match Results for each Job across all Candidates
        print("\n--- Running AI/Algorithmic Matching Engine for all 3 Jobs ---")
        run_job_matching(db, job1.id, recruiter)
        run_job_matching(db, job2.id, recruiter)
        run_job_matching(db, job3.id, recruiter)

        # 5. Set realistic pipeline stages for Job 1 to demonstrate the full workflow
        # Let's find matches for Job 1:
        # Candidate 1 (Shivanshu) -> score ~86% -> 'approved_by_hr'
        # Candidate 2 (Bob) -> 'screened'
        # Candidate 3 (Priya) -> 'matched'
        # Candidate 4 (Rohan) -> 'matched'
        matches_job1 = db.query(MatchResult).filter(MatchResult.job_id == job1.id).all()
        for m in matches_job1:
            cand = db.query(Candidate).filter(Candidate.id == m.candidate_id).first()
            if cand and "Shivanshu" in cand.full_name:
                m.status = "approved_by_hr"
            elif cand and "Bob" in cand.full_name:
                m.status = "screened"
            else:
                m.status = "matched"

        db.commit()

        print("\n--- Summary of Jobs and Pipeline Matches ---")
        for j in db.query(Job).all():
            m_count = db.query(MatchResult).filter(MatchResult.job_id == j.id).count()
            print(f"  Job #{j.id}: '{j.title}' -> {m_count} matched candidates")

        print("\n[SUCCESS] Jobs and pipeline cleaned and configured successfully!\n")

    finally:
        db.close()


if __name__ == "__main__":
    clean_jobs_and_pipeline()
