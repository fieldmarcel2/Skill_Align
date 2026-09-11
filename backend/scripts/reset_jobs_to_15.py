"""
SkillAlign — Jobs Reset Script
==============================
Cleans ALL existing jobs and seeds exactly 15 genuine tech roles
with 0-2 years experience requirements.

Run:
    cd backend
    python -m scripts.reset_jobs_to_15
"""

import sys
import os
import io
import json

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.database.session import SessionLocal
from app.models.user import User
from app.models.role import Role
from app.models.skill import Skill
from app.models.job import Job
from app.models.job_skill import JobSkill
from app.models.match_result import MatchResult
from app.models.interview import Interview
from app.models.interview_slot import InterviewSlot
from app.models.offer import Offer
from app.models.recruitment_task import RecruitmentTask
from app.models.audit_log import AuditLog
from app.models.notification import Notification
from sqlalchemy import text


FIFTEEN_JOBS = [
    # 1 — Cloud Engineering (0-2 yrs)
    {
        "title": "Cloud Engineer",
        "department": "Infrastructure",
        "client_name": "NovaTech Solutions",
        "description": (
            "Design and manage scalable cloud infrastructure on AWS. "
            "You will provision EC2 instances, design VPC networks, set up CI/CD pipelines using GitHub Actions, "
            "and manage containerised workloads with Docker and ECS. "
            "Collaborate closely with the DevOps team to ensure 99.9% uptime SLAs."
        ),
        "min_experience_years": 1.0,
        "work_mode": "Hybrid",
        "location": "Bangalore, India",
        "salary_min": 600000,
        "salary_max": 1000000,
        "status": "active",
        "skills": [
            ("AWS", "required", 4),
            ("Docker", "required", 3),
            ("Linux", "required", 3),
            ("Terraform", "preferred", 2),
            ("Python", "preferred", 2),
        ],
    },
    # 2 — Full Stack Development (0-2 yrs)
    {
        "title": "Full Stack Developer",
        "department": "Engineering",
        "client_name": "Zephyr Labs",
        "description": (
            "Build end-to-end features on our SaaS product using React and Node.js. "
            "You will own complete features from database schema design to pixel-perfect UI. "
            "Work in a fast-paced agile team with weekly releases. "
            "Strong TypeScript and REST API skills are essential."
        ),
        "min_experience_years": 0.5,
        "work_mode": "Remote",
        "location": "Pan-India",
        "salary_min": 500000,
        "salary_max": 900000,
        "status": "active",
        "skills": [
            ("React", "required", 4),
            ("Node.js", "required", 4),
            ("TypeScript", "required", 3),
            ("PostgreSQL", "required", 3),
            ("Docker", "preferred", 2),
        ],
    },
    # 3 — Angular Developer (0-2 yrs)
    {
        "title": "Angular Developer",
        "department": "Product",
        "client_name": "FinEdge Technologies",
        "description": (
            "Develop responsive, high-performance Angular applications for our fintech dashboard. "
            "You will implement complex data visualisations using D3.js and NgRx state management. "
            "Experience with RxJS observables and Angular Material components is required."
        ),
        "min_experience_years": 1.0,
        "work_mode": "Hybrid",
        "location": "Mumbai, India",
        "salary_min": 550000,
        "salary_max": 900000,
        "status": "active",
        "skills": [
            ("Angular", "required", 4),
            ("TypeScript", "required", 3),
            ("RxJS", "required", 3),
            ("JavaScript", "required", 3),
            ("REST APIs", "preferred", 2),
        ],
    },
    # 4 — Data Analyst (0-2 yrs)
    {
        "title": "Data Analyst",
        "department": "Business Intelligence",
        "client_name": "DataPulse Analytics",
        "description": (
            "Transform raw business data into actionable insights using Python and SQL. "
            "Build dashboards in Power BI, run A/B tests, and present findings to senior leadership. "
            "Experience with pandas, matplotlib, and statistical modelling is preferred."
        ),
        "min_experience_years": 0.0,
        "work_mode": "Hybrid",
        "location": "Hyderabad, India",
        "salary_min": 450000,
        "salary_max": 800000,
        "status": "active",
        "skills": [
            ("Python", "required", 3),
            ("SQL", "required", 4),
            ("Pandas", "required", 3),
            ("Power BI", "preferred", 2),
            ("Excel", "preferred", 2),
        ],
    },
    # 5 — Backend Developer (Python / FastAPI) (0-2 yrs)
    {
        "title": "Backend Developer (Python)",
        "department": "Engineering",
        "client_name": "Scalar Systems",
        "description": (
            "Build high-throughput RESTful APIs using Python and FastAPI. "
            "Design PostgreSQL schemas, implement Redis caching strategies, "
            "and integrate third-party services via webhooks. "
            "Write comprehensive unit and integration tests using pytest."
        ),
        "min_experience_years": 1.0,
        "work_mode": "Remote",
        "location": "Pan-India",
        "salary_min": 600000,
        "salary_max": 1000000,
        "status": "active",
        "skills": [
            ("Python", "required", 4),
            ("FastAPI", "required", 4),
            ("PostgreSQL", "required", 3),
            ("Redis", "preferred", 2),
            ("Docker", "preferred", 2),
        ],
    },
    # 6 — DevOps Engineer (0-2 yrs)
    {
        "title": "DevOps Engineer",
        "department": "Infrastructure",
        "client_name": "CloudNest Platforms",
        "description": (
            "Own CI/CD pipelines across our multi-cloud Kubernetes environment. "
            "Build and maintain GitOps workflows using ArgoCD, "
            "manage Helm chart releases, and set up observability stacks (Prometheus + Grafana). "
            "Experience with scripting in Bash/Python is required."
        ),
        "min_experience_years": 1.0,
        "work_mode": "Hybrid",
        "location": "Pune, India",
        "salary_min": 650000,
        "salary_max": 1100000,
        "status": "active",
        "skills": [
            ("Kubernetes", "required", 4),
            ("Docker", "required", 4),
            ("CI/CD", "required", 3),
            ("AWS", "required", 3),
            ("Terraform", "preferred", 2),
        ],
    },
    # 7 — React Native Developer (0-2 yrs)
    {
        "title": "React Native Developer",
        "department": "Mobile Engineering",
        "client_name": "AppSprint Studio",
        "description": (
            "Build cross-platform iOS and Android mobile apps using React Native. "
            "Implement native modules where needed, integrate with REST/GraphQL backends, "
            "and optimise performance using Hermes engine. "
            "Experience with Expo or bare React Native workflow is required."
        ),
        "min_experience_years": 0.5,
        "work_mode": "Remote",
        "location": "Pan-India",
        "salary_min": 550000,
        "salary_max": 950000,
        "status": "active",
        "skills": [
            ("React Native", "required", 4),
            ("JavaScript", "required", 4),
            ("TypeScript", "required", 3),
            ("REST APIs", "preferred", 2),
            ("Redux", "preferred", 2),
        ],
    },
    # 8 — Machine Learning Engineer (0-2 yrs)
    {
        "title": "Machine Learning Engineer",
        "department": "AI / Research",
        "client_name": "Cognify AI",
        "description": (
            "Train and deploy production-grade ML models using Python and PyTorch. "
            "Work on NLP-based document classification pipelines, "
            "integrate models into REST APIs, and monitor model drift in production. "
            "Familiarity with MLflow and model registry practices is a plus."
        ),
        "min_experience_years": 1.0,
        "work_mode": "Hybrid",
        "location": "Bangalore, India",
        "salary_min": 700000,
        "salary_max": 1200000,
        "status": "active",
        "skills": [
            ("Python", "required", 4),
            ("PyTorch", "required", 3),
            ("Machine Learning", "required", 4),
            ("NLP", "preferred", 2),
            ("Docker", "preferred", 2),
        ],
    },
    # 9 — QA / Automation Engineer (0-2 yrs)
    {
        "title": "QA Automation Engineer",
        "department": "Quality Assurance",
        "client_name": "TestGrid Technologies",
        "description": (
            "Design and maintain automated test suites using Selenium and Cypress. "
            "Write API tests with Postman and pytest, "
            "integrate tests into CI pipelines, and generate coverage reports. "
            "Experience with BDD frameworks like Cucumber is a plus."
        ),
        "min_experience_years": 0.5,
        "work_mode": "Hybrid",
        "location": "Chennai, India",
        "salary_min": 450000,
        "salary_max": 800000,
        "status": "active",
        "skills": [
            ("Selenium", "required", 3),
            ("Python", "required", 3),
            ("Cypress", "preferred", 2),
            ("JavaScript", "preferred", 2),
            ("CI/CD", "preferred", 2),
        ],
    },
    # 10 — Java Spring Boot Developer (0-2 yrs)
    {
        "title": "Java Developer (Spring Boot)",
        "department": "Engineering",
        "client_name": "Meridian Fintech",
        "description": (
            "Develop enterprise-grade microservices using Java 17 and Spring Boot. "
            "Design RESTful APIs, integrate with Kafka message queues, "
            "and manage MySQL databases with JPA/Hibernate. "
            "Exposure to Docker and Kubernetes deployment is preferred."
        ),
        "min_experience_years": 1.0,
        "work_mode": "Onsite",
        "location": "Delhi NCR, India",
        "salary_min": 600000,
        "salary_max": 1000000,
        "status": "active",
        "skills": [
            ("Java", "required", 4),
            ("Spring Boot", "required", 4),
            ("MySQL", "required", 3),
            ("Kafka", "preferred", 2),
            ("Docker", "preferred", 2),
        ],
    },
    # 11 — Business Intelligence Analyst (0-2 yrs)
    {
        "title": "Business Intelligence Analyst",
        "department": "Analytics",
        "client_name": "Insightful Corp",
        "description": (
            "Build and maintain BI dashboards and data pipelines. "
            "Query large datasets using SQL, transform data with dbt, "
            "and visualise insights using Tableau. "
            "Collaborate with product and sales teams to define KPI frameworks."
        ),
        "min_experience_years": 0.0,
        "work_mode": "Hybrid",
        "location": "Noida, India",
        "salary_min": 400000,
        "salary_max": 750000,
        "status": "active",
        "skills": [
            ("SQL", "required", 4),
            ("Tableau", "required", 3),
            ("Python", "preferred", 2),
            ("Excel", "preferred", 3),
            ("Power BI", "preferred", 2),
        ],
    },
    # 12 — Security Engineer (0-2 yrs)
    {
        "title": "Security Engineer (Fresher)",
        "department": "Cybersecurity",
        "client_name": "ShieldNet Security",
        "description": (
            "Assist in conducting vulnerability assessments and penetration testing. "
            "Monitor SIEM dashboards, respond to security incidents, "
            "and help implement security hardening for cloud environments. "
            "Certifications like CompTIA Security+ or CEH are a strong plus."
        ),
        "min_experience_years": 0.0,
        "work_mode": "Hybrid",
        "location": "Bangalore, India",
        "salary_min": 500000,
        "salary_max": 850000,
        "status": "active",
        "skills": [
            ("Network Security", "required", 3),
            ("Linux", "required", 3),
            ("Python", "preferred", 2),
            ("SIEM", "preferred", 2),
        ],
    },
    # 13 — Frontend React Developer (0-2 yrs)
    {
        "title": "Frontend Developer (React)",
        "department": "Product",
        "client_name": "UXCraft Studio",
        "description": (
            "Build stunning, accessible, and responsive web interfaces using React and Tailwind CSS. "
            "Own the component library, implement animations using Framer Motion, "
            "and ensure Lighthouse performance scores above 90. "
            "Strong eye for design and attention to UI detail is a must."
        ),
        "min_experience_years": 0.5,
        "work_mode": "Remote",
        "location": "Pan-India",
        "salary_min": 480000,
        "salary_max": 850000,
        "status": "active",
        "skills": [
            ("React", "required", 4),
            ("TypeScript", "required", 3),
            ("CSS", "required", 3),
            ("JavaScript", "required", 3),
            ("Tailwind CSS", "preferred", 2),
        ],
    },
    # 14 — Database Administrator (0-2 yrs)
    {
        "title": "Database Administrator (DBA)",
        "department": "Infrastructure",
        "client_name": "DataVault Systems",
        "description": (
            "Manage and optimise PostgreSQL and MongoDB databases for high-volume applications. "
            "Perform query tuning, backup/recovery planning, index optimisation, "
            "and set up read-replica clusters. "
            "Monitoring using pg_stat_statements and Percona Monitoring and Management (PMM)."
        ),
        "min_experience_years": 1.0,
        "work_mode": "Hybrid",
        "location": "Hyderabad, India",
        "salary_min": 550000,
        "salary_max": 900000,
        "status": "active",
        "skills": [
            ("PostgreSQL", "required", 4),
            ("MongoDB", "required", 3),
            ("SQL", "required", 4),
            ("Redis", "preferred", 2),
            ("Linux", "preferred", 2),
        ],
    },
    # 15 — Golang Developer (0-2 yrs)
    {
        "title": "Go (Golang) Backend Developer",
        "department": "Platform Engineering",
        "client_name": "StreamLine Networks",
        "description": (
            "Build high-performance microservices in Go for our real-time event streaming platform. "
            "Design gRPC service contracts, implement protobuf-based APIs, "
            "and write concurrent processing pipelines using goroutines and channels. "
            "Experience with Kafka and Redis pub/sub is preferred."
        ),
        "min_experience_years": 0.5,
        "work_mode": "Remote",
        "location": "Pan-India",
        "salary_min": 600000,
        "salary_max": 1050000,
        "status": "active",
        "skills": [
            ("Go", "required", 4),
            ("gRPC", "required", 3),
            ("Docker", "required", 3),
            ("Kafka", "preferred", 2),
            ("Redis", "preferred", 2),
        ],
    },
]


def reset_jobs():
    db = SessionLocal()
    try:
        print("\n" + "=" * 70)
        print("  RESETTING JOB REQUISITIONS — SkillAlign Demo Cleanup")
        print("=" * 70)

        # 1. Find core HR user
        hr_role = db.query(Role).filter(Role.name == "HR").first()
        hr_user = db.query(User).filter(User.role_id == hr_role.id).first()
        if not hr_user:
            print("ERROR: No HR user found. Please seed users first.")
            return

        print(f"  Using HR user: {hr_user.name} ({hr_user.email})")

        # 2. Get IDs of jobs that have MatchResults with advanced pipeline states to preserve
        print("\n  Identifying jobs with live candidate pipelines...")
        PROTECTED_STATES = {
            "INTERVIEW_SLOTS_PROPOSED", "WAITING_FOR_CANDIDATE_SLOT",
            "CANDIDATE_SLOT_SELECTED", "INTERVIEW_CONFIRMED",
            "WAITING_FOR_HM_FEEDBACK", "COMPENSATION_DISCUSSION",
            "OFFER_CREATED", "OFFER_SENT", "HIRED",
        }
        protected_job_ids = set()
        all_mrs = db.query(MatchResult).all()
        for mr in all_mrs:
            if mr.pipeline_state in PROTECTED_STATES:
                protected_job_ids.add(mr.job_id)

        print(f"  Protected jobs (with live pipelines): {sorted(protected_job_ids)}")

        # 3. Delete non-protected jobs and all their orphaned data
        all_jobs = db.query(Job).all()
        deleted_count = 0
        for job in all_jobs:
            if job.id in protected_job_ids:
                print(f"  Skipping protected job ID={job.id}: {job.title!r}")
                continue

            # Delete job_skills
            db.query(JobSkill).filter(JobSkill.job_id == job.id).delete(synchronize_session=False)

            # Delete match_results (and cascade)
            job_mrs = db.query(MatchResult).filter(MatchResult.job_id == job.id).all()
            for mr in job_mrs:
                # Offers
                db.query(Offer).filter(Offer.match_result_id == mr.id).delete(synchronize_session=False)
                # Tasks
                db.query(RecruitmentTask).filter(RecruitmentTask.match_result_id == mr.id).delete(synchronize_session=False)
                # Audit logs
                db.query(AuditLog).filter(AuditLog.entity_id == mr.id, AuditLog.entity_type == "MatchResult").delete(synchronize_session=False)
                # Interview slots + interviews
                interviews = db.query(Interview).filter(Interview.match_result_id == mr.id).all()
                for itw in interviews:
                    db.query(InterviewSlot).filter(InterviewSlot.interview_id == itw.id).delete(synchronize_session=False)
                    db.delete(itw)
                db.delete(mr)

            db.delete(job)
            deleted_count += 1

        db.flush()
        print(f"\n  Deleted {deleted_count} junk jobs.")

        # 4. Ensure required skills exist
        print("\n  Ensuring skill catalogue is populated...")
        skills_needed = set()
        for jd in FIFTEEN_JOBS:
            for sname, _, _ in jd["skills"]:
                skills_needed.add(sname)

        skill_category_map = {
            "AWS": "Cloud", "Docker": "DevOps", "Linux": "Systems",
            "Terraform": "DevOps", "Python": "Programming",
            "React": "Frontend", "Node.js": "Backend", "TypeScript": "Programming",
            "PostgreSQL": "Database", "Angular": "Frontend", "RxJS": "Frontend",
            "JavaScript": "Programming", "REST APIs": "Backend", "SQL": "Database",
            "Pandas": "Data Science", "Power BI": "Analytics", "Excel": "Productivity",
            "FastAPI": "Backend", "Redis": "Database", "Kubernetes": "DevOps",
            "CI/CD": "DevOps", "React Native": "Mobile", "Redux": "Frontend",
            "PyTorch": "AI", "Machine Learning": "AI", "NLP": "AI",
            "Selenium": "Testing", "Cypress": "Testing",
            "Java": "Programming", "Spring Boot": "Backend", "MySQL": "Database",
            "Kafka": "Streaming", "Tableau": "Analytics",
            "Network Security": "Security", "SIEM": "Security",
            "CSS": "Frontend", "Tailwind CSS": "Frontend",
            "MongoDB": "Database", "Go": "Programming", "gRPC": "Backend",
            "Go (Golang)": "Programming",
        }

        skill_map = {}
        for sname in skills_needed:
            sk = db.query(Skill).filter(Skill.name == sname).first()
            if not sk:
                cat = skill_category_map.get(sname, "General")
                sk = Skill(name=sname, category=cat)
                db.add(sk)
                db.flush()
                print(f"    + Created skill: {sname}")
            skill_map[sname] = sk

        # 5. Create the 15 genuine jobs
        print("\n  Creating 15 genuine job requisitions...")
        created_jobs = []
        for i, jd in enumerate(FIFTEEN_JOBS, 1):
            # Check if an identical job already exists (by title + client)
            existing = db.query(Job).filter(
                Job.title == jd["title"],
                Job.client_name == jd["client_name"],
            ).first()
            if existing:
                print(f"  {i:2d}. Already exists: {jd['title']!r} — updating...")
                j = existing
                j.description = jd["description"]
                j.min_experience_years = jd["min_experience_years"]
                j.status = jd["status"]
                j.work_mode = jd.get("work_mode", "Hybrid")
                loc_parts = jd.get("location", "").split(",")
                j.location_city = loc_parts[0].strip() if loc_parts else "Bangalore"
                j.location_country = "India"
                # Reset skills
                db.query(JobSkill).filter(JobSkill.job_id == j.id).delete(synchronize_session=False)
            else:
                loc_parts = jd.get("location", "").split(",")
                j = Job(
                    title=jd["title"],
                    department=jd["department"],
                    client_name=jd["client_name"],
                    description=jd["description"],
                    min_experience_years=jd["min_experience_years"],
                    status=jd["status"],
                    work_mode=jd.get("work_mode", "Hybrid"),
                    location_city=loc_parts[0].strip() if loc_parts else "Bangalore",
                    location_country="India",
                    created_by=hr_user.id,
                )
                db.add(j)
                db.flush()
                print(f"  {i:2d}. Created: {jd['title']!r} — ID={j.id}")

            for sname, req_type, weight in jd["skills"]:
                sk = skill_map[sname]
                db.add(JobSkill(
                    job_id=j.id,
                    skill_id=sk.id,
                    requirement_type=req_type,
                    weight=float(weight),
                ))
            db.flush()
            created_jobs.append(j)

        db.commit()
        print("\n" + "=" * 70)
        print(f"  ✅ SUCCESS: DB now has {len(created_jobs)} clean job requisitions!")
        print("=" * 70 + "\n")

    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        print(f"\nERROR: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    reset_jobs()
