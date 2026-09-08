"""
SkillAlign - Enterprise Recruitment Demo Seeding Script
Seeds realistic enterprise recruitment workflow states, tasks, audit trails,
interview slots, feedback, offers, and blacklist records.
"""

import os
import sys
import io
import json
from datetime import datetime, timezone, timedelta

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.database.session import SessionLocal
from app.models.user import User
from app.models.role import Role
from app.models.skill import Skill
from app.models.job import Job
from app.models.job_skill import JobSkill
from app.models.candidate import Candidate
from app.models.candidate_skill import CandidateSkill
from app.models.match_result import MatchResult
from app.models.interview import Interview
from app.models.interview_slot import InterviewSlot
from app.models.interview_feedback import InterviewFeedback
from app.models.offer import Offer
from app.models.candidate_blacklist import CandidateBlacklist
from app.models.recruitment_task import RecruitmentTask
from app.models.audit_log import AuditLog
from app.models.notification import Notification
from app.core.security import hash_password


def seed_enterprise_demo():
    db = SessionLocal()
    try:
        print("\n" + "=" * 65)
        print("  SEEDING SKILLALIGN ENTERPRISE RECRUITMENT DEMO DATA")
        print("=" * 65)

        now = datetime.now(timezone.utc)

        # 1. Fetch Roles
        admin_role = db.query(Role).filter(Role.name == "Admin").first()
        hr_role = db.query(Role).filter(Role.name == "HR").first()
        recruiter_role = db.query(Role).filter(Role.name == "Recruiter").first()
        candidate_role = db.query(Role).filter(Role.name == "Candidate").first()

        # 2. Core Users
        def get_or_create_user(email, name, role_id, password="Pass@123", phone=None):
            u = db.query(User).filter(User.email == email).first()
            if not u:
                u = User(
                    name=name,
                    email=email,
                    password_hash=hash_password(password),
                    role_id=role_id,
                    is_active=True,
                    phone_number=phone,
                )
                db.add(u)
                db.flush()
            else:
                u.name = name
                u.role_id = role_id
                u.is_active = True
                if phone:
                    u.phone_number = phone
                db.flush()
            return u

        admin = get_or_create_user("admin@skillalign.dev", "System Admin", admin_role.id, "Admin@123")
        hm_sarah = get_or_create_user("hr@skillalign.dev", "Sarah HiringManager", hr_role.id, "Hr@12345")
        rec_james = get_or_create_user("recruiter@skillalign.dev", "James Recruiter", recruiter_role.id, "Recruiter@123")

        # 3. Core Skills
        skill_names = [
            ("Python", "Programming"), ("FastAPI", "Framework"), ("PostgreSQL", "Database"),
            ("React", "Frontend"), ("TypeScript", "Programming"), ("Docker", "DevOps"),
            ("Kubernetes", "DevOps"), ("AWS", "Cloud"), ("Redis", "Database"),
            ("Machine Learning", "AI"), ("PyTorch", "AI"), ("NLP", "AI"),
        ]
        skill_map = {}
        for sname, scat in skill_names:
            sk = db.query(Skill).filter(Skill.name == sname).first()
            if not sk:
                sk = Skill(name=sname, category=scat)
                db.add(sk)
                db.flush()
            skill_map[sname] = sk

        # 4. Jobs
        jobs_def = [
            {
                "title": "Senior Full-Stack Engineer",
                "department": "Engineering",
                "min_exp": 4.0,
                "skills": [("React", 4.0), ("Python", 4.0), ("PostgreSQL", 3.0), ("Docker", 2.0)],
            },
            {
                "title": "Cloud DevOps Architect",
                "department": "Infrastructure",
                "min_exp": 5.0,
                "skills": [("AWS", 5.0), ("Kubernetes", 4.0), ("Docker", 4.0), ("Python", 3.0)],
            },
            {
                "title": "Lead Frontend React Architect",
                "department": "Product",
                "min_exp": 5.0,
                "skills": [("React", 5.0), ("TypeScript", 4.0), ("Redis", 2.0)],
            },
            {
                "title": "Senior AI / ML Research Engineer",
                "department": "AI Labs",
                "min_exp": 3.0,
                "skills": [("Python", 4.0), ("Machine Learning", 4.0), ("PyTorch", 3.0), ("NLP", 3.0)],
            },
        ]

        jobs = {}
        for jdata in jobs_def:
            j = db.query(Job).filter(Job.title == jdata["title"]).first()
            if not j:
                j = Job(
                    title=jdata["title"],
                    description=f"Leading candidate search for {jdata['title']} in {jdata['department']}.",
                    department=jdata["department"],
                    min_experience_years=jdata["min_exp"],
                    status="active",
                    created_by=hm_sarah.id,
                )
                db.add(j)
                db.flush()
                for sname, req_exp in jdata["skills"]:
                    sk = skill_map[sname]
                    db.add(JobSkill(job_id=j.id, skill_id=sk.id, requirement_type="required", weight=float(req_exp)))
                db.flush()
            jobs[jdata["title"]] = j

        # 5. Candidates & Profiles
        candidates_def = [
            {
                "email": "alice@candidate.dev",
                "name": "Alice Johnson",
                "phone": "+14155550101",
                "exp": 5.5,
                "city": "San Francisco",
                "target_job": "Senior Full-Stack Engineer",
                "score": 92.5,
                "state": "HIRING_MANAGER_REVIEW",
                "skills": [("React", 5.0), ("Python", 5.0), ("PostgreSQL", 4.0), ("Docker", 3.0)],
            },
            {
                "email": "priya@candidate.dev",
                "name": "Priya Patel",
                "phone": "+919876543220",
                "exp": 6.0,
                "city": "Bangalore",
                "target_job": "Cloud DevOps Architect",
                "score": 95.0,
                "state": "INTERVIEW_SLOTS_PROPOSED",
                "skills": [("AWS", 6.0), ("Kubernetes", 5.0), ("Docker", 5.0), ("Python", 4.0)],
            },
            {
                "email": "bob@candidate.dev",
                "name": "Bob Miller",
                "phone": "+14155550102",
                "exp": 6.0,
                "city": "Austin",
                "target_job": "Lead Frontend React Architect",
                "score": 89.0,
                "state": "WAITING_FOR_HM_FEEDBACK",
                "skills": [("React", 6.0), ("TypeScript", 5.0), ("Redis", 3.0)],
            },
            {
                "email": "rohan@candidate.dev",
                "name": "Rohan Gupta",
                "phone": "+919876543230",
                "exp": 4.0,
                "city": "Hyderabad",
                "target_job": "Senior AI / ML Research Engineer",
                "score": 96.0,
                "state": "COMPENSATION_DISCUSSION",
                "skills": [("Python", 5.0), ("Machine Learning", 4.0), ("PyTorch", 4.0), ("NLP", 3.5)],
            },
            {
                "email": "rahul@candidate.dev",
                "name": "Rahul Sharma",
                "phone": "+919876543240",
                "exp": 3.5,
                "city": "Bangalore",
                "target_job": "Senior Full-Stack Engineer",
                "score": 88.0,
                "state": "OFFER_SENT",
                "skills": [("Python", 4.0), ("React", 3.0), ("PostgreSQL", 3.0)],
            },
            {
                "email": "shiva@candidate.dev",
                "name": "Shivanshu Tripathi",
                "phone": "+918840226477",
                "exp": 7.0,
                "city": "Noida",
                "target_job": "Senior AI / ML Research Engineer",
                "score": 98.0,
                "state": "HIRED",
                "skills": [("Python", 7.0), ("Machine Learning", 6.0), ("PyTorch", 5.0), ("NLP", 5.0), ("AWS", 4.0)],
            },
        ]

        print("\n--- Seeding Enterprise Lifecycle Candidates & State Data ---")

        for cdef in candidates_def:
            u = get_or_create_user(cdef["email"], cdef["name"], candidate_role.id, "Candidate@123", cdef["phone"])
            cprof = db.query(Candidate).filter(Candidate.user_id == u.id).first()
            if not cprof:
                cprof = Candidate(
                    user_id=u.id,
                    full_name=cdef["name"],
                    phone=cdef["phone"],
                    total_experience_years=cdef["exp"],
                    city=cdef["city"],
                )
                db.add(cprof)
                db.flush()
            else:
                cprof.full_name = cdef["name"]
                cprof.phone = cdef["phone"]
                cprof.total_experience_years = cdef["exp"]
                cprof.city = cdef["city"]
                db.flush()

            # Attach skills
            for sname, sexp in cdef["skills"]:
                sk = skill_map[sname]
                csk = db.query(CandidateSkill).filter(CandidateSkill.candidate_id == cprof.id, CandidateSkill.skill_id == sk.id).first()
                if not csk:
                    db.add(CandidateSkill(
                        candidate_id=cprof.id,
                        skill_id=sk.id,
                        years_experience=sexp,
                        proficiency_level="Expert" if sexp >= 4.0 else "Intermediate",
                        source="manual",
                    ))
            db.flush()

            job_obj = jobs[cdef["target_job"]]

            # MatchResult
            mr = db.query(MatchResult).filter(MatchResult.candidate_id == cprof.id, MatchResult.job_id == job_obj.id).first()
            if not mr:
                mr = MatchResult(
                    candidate_id=cprof.id,
                    job_id=job_obj.id,
                    recruiter_id=rec_james.id,
                    hiring_manager_id=hm_sarah.id,
                    overall_score=cdef["score"],
                    status="matched",
                    pipeline_state=cdef["state"],
                    shortlist_note="Exceptional match across all technical core competencies.",
                    submitted_to_hm_at=now - timedelta(days=3),
                    hm_reviewed_at=now - timedelta(days=2),
                )
                db.add(mr)
                db.flush()
            else:
                mr.pipeline_state = cdef["state"]
                mr.hiring_manager_id = hm_sarah.id
                mr.recruiter_id = rec_james.id
                mr.overall_score = cdef["score"]
                mr.shortlist_note = "Exceptional match across all technical core competencies."
                mr.submitted_to_hm_at = now - timedelta(days=3)
                mr.hm_reviewed_at = now - timedelta(days=2)
                db.flush()

            # Clean up old sub-records for clean seeding
            db.query(RecruitmentTask).filter(RecruitmentTask.match_result_id == mr.id).delete()
            db.query(AuditLog).filter(AuditLog.entity_id == mr.id, AuditLog.entity_type == "MatchResult").delete()

            # Generate Audit Trail for this candidate based on state
            def log_event(action, from_s, to_s, actor_id, days_ago, details=None):
                db.add(AuditLog(
                    actor_id=actor_id,
                    action=action,
                    entity_type="MatchResult",
                    entity_id=mr.id,
                    from_state=from_s,
                    to_state=to_s,
                    details=details or "{}",
                    created_at=now - timedelta(days=days_ago),
                ))

            log_event("CANDIDATE_MATCHED", None, "CANDIDATE_MATCHED", None, 5)
            log_event("CANDIDATE_SHORTLISTED", "CANDIDATE_MATCHED", "CANDIDATE_SHORTLISTED", rec_james.id, 4)
            log_event("SUBMITTED_TO_HM", "CANDIDATE_SHORTLISTED", "SENT_TO_HIRING_MANAGER", rec_james.id, 3)

            if cdef["state"] in ("HIRING_MANAGER_REVIEW", "INTERVIEW_SLOTS_PROPOSED", "WAITING_FOR_HM_FEEDBACK", "COMPENSATION_DISCUSSION", "OFFER_SENT", "HIRED"):
                log_event("HM_REVIEW_STARTED", "SENT_TO_HIRING_MANAGER", "HIRING_MANAGER_REVIEW", hm_sarah.id, 2)

            # State-specific attachments
            if cdef["state"] == "INTERVIEW_SLOTS_PROPOSED":
                # Create interview & proposed slots
                itw = db.query(Interview).filter(Interview.match_result_id == mr.id).first()
                if not itw:
                    itw = Interview(
                        match_result_id=mr.id,
                        scheduled_by=rec_james.id,
                        requested_by=hm_sarah.id,
                        status="scheduled",
                        meeting_link="https://meet.google.com/xyz-devops-inte",
                    )
                    db.add(itw)
                    db.flush()
                db.query(InterviewSlot).filter(InterviewSlot.interview_id == itw.id).delete()
                s1 = InterviewSlot(
                    interview_id=itw.id,
                    match_result_id=mr.id,
                    proposed_by=hm_sarah.id,
                    slot_datetime=now + timedelta(days=2, hours=10),
                    slot_end_datetime=now + timedelta(days=2, hours=11),
                    status="proposed",
                )
                s2 = InterviewSlot(
                    interview_id=itw.id,
                    match_result_id=mr.id,
                    proposed_by=hm_sarah.id,
                    slot_datetime=now + timedelta(days=3, hours=14),
                    slot_end_datetime=now + timedelta(days=3, hours=15),
                    status="proposed",
                )
                db.add_all([s1, s2])
                db.flush()
                # Create task for Recruiter
                db.add(RecruitmentTask(
                    assigned_to=rec_james.id,
                    created_by=hm_sarah.id,
                    match_result_id=mr.id,
                    job_id=job_obj.id,
                    candidate_id=cprof.id,
                    action_type="SEND_SLOTS_TO_CANDIDATE",
                    title=f"Send Interview Slots to {cdef['name']}",
                    description=f"Hiring Manager Sarah proposed 2 interview slots for {job_obj.title}.",
                    priority="HIGH",
                    status="OPEN",
                ))
                log_event("INTERVIEW_REQUESTED_AND_SLOTS_PROPOSED", "HIRING_MANAGER_REVIEW", "INTERVIEW_SLOTS_PROPOSED", hm_sarah.id, 2)

            elif cdef["state"] == "WAITING_FOR_HM_FEEDBACK":
                itw = db.query(Interview).filter(Interview.match_result_id == mr.id).first()
                if not itw:
                    itw = Interview(
                        match_result_id=mr.id,
                        scheduled_by=rec_james.id,
                        requested_by=hm_sarah.id,
                        status="completed",
                        interview_date=now - timedelta(hours=4),
                        meeting_link="https://meet.google.com/react-frontend-rev",
                    )
                    db.add(itw)
                    db.flush()
                else:
                    itw.status = "completed"
                    itw.interview_date = now - timedelta(hours=4)
                    db.flush()
                log_event("INTERVIEW_REQUESTED_AND_SLOTS_PROPOSED", "HIRING_MANAGER_REVIEW", "INTERVIEW_SLOTS_PROPOSED", hm_sarah.id, 3)
                log_event("SLOTS_SENT_TO_CANDIDATE", "INTERVIEW_SLOTS_PROPOSED", "WAITING_FOR_CANDIDATE_SLOT", rec_james.id, 2)
                log_event("CANDIDATE_SLOT_SELECTED", "WAITING_FOR_CANDIDATE_SLOT", "CANDIDATE_SLOT_SELECTED", None, 1)
                log_event("INTERVIEW_CONFIRMED", "CANDIDATE_SLOT_SELECTED", "INTERVIEW_CONFIRMED", rec_james.id, 1)
                log_event("INTERVIEW_COMPLETED", "INTERVIEW_CONFIRMED", "WAITING_FOR_HM_FEEDBACK", rec_james.id, 0)

            elif cdef["state"] == "COMPENSATION_DISCUSSION":
                itw = db.query(Interview).filter(Interview.match_result_id == mr.id).first()
                if not itw:
                    itw = Interview(
                        match_result_id=mr.id,
                        scheduled_by=rec_james.id,
                        requested_by=hm_sarah.id,
                        status="completed",
                    )
                    db.add(itw)
                    db.flush()
                db.query(InterviewFeedback).filter(InterviewFeedback.interview_id == itw.id).delete()
                fb = InterviewFeedback(
                    interview_id=itw.id,
                    match_result_id=mr.id,
                    reviewer_id=hm_sarah.id,
                    go_no_go="GO",
                    technical_rating=5,
                    communication_rating=5,
                    problem_solving_rating=5,
                    role_fit_rating=5,
                    overall_rating=5,
                    comments="Superb technical depth in PyTorch, NLP architectures, and deep neural network deployment. Unanimous GO decision!",
                )
                db.add(fb)
                db.flush()
                # Create Task for Recruiter
                db.add(RecruitmentTask(
                    assigned_to=rec_james.id,
                    created_by=hm_sarah.id,
                    match_result_id=mr.id,
                    job_id=job_obj.id,
                    candidate_id=cprof.id,
                    action_type="CREATE_OFFER",
                    title=f"Prepare Formal Offer for {cdef['name']}",
                    description=f"Hiring Manager approved with a 5/5 Star GO rating for {job_obj.title}.",
                    priority="URGENT",
                    status="OPEN",
                ))
                log_event("INTERVIEW_COMPLETED", "INTERVIEW_CONFIRMED", "WAITING_FOR_HM_FEEDBACK", rec_james.id, 2)
                log_event("HM_FEEDBACK_GO", "WAITING_FOR_HM_FEEDBACK", "COMPENSATION_DISCUSSION", hm_sarah.id, 1, json.dumps({"decision": "GO", "overall_rating": 5}))

            elif cdef["state"] == "OFFER_SENT":
                db.query(Offer).filter(Offer.match_result_id == mr.id).delete()
                offer = Offer(
                    match_result_id=mr.id,
                    candidate_id=cprof.id,
                    job_id=job_obj.id,
                    created_by=rec_james.id,
                    salary_currency="INR",
                    salary_min=1800000.0,
                    salary_max=2400000.0,
                    proposed_salary=2100000.0,
                    employment_type="Full-time",
                    joining_date=now + timedelta(days=21),
                    offer_expiry_date=now + timedelta(days=7),
                    location="Bangalore",
                    work_mode="Hybrid",
                    additional_terms="₹2,00,000 joining bonus + comprehensive health insurance + ₹1,00,000 annual learning stipend.",
                    offer_token="demo_offer_token_rahul_12345",
                    status="SENT",
                    sent_at=now - timedelta(hours=6),
                )
                db.add(offer)
                db.flush()
                log_event("HM_FEEDBACK_GO", "WAITING_FOR_HM_FEEDBACK", "COMPENSATION_DISCUSSION", hm_sarah.id, 2)
                log_event("OFFER_CREATED", "COMPENSATION_DISCUSSION", "OFFER_CREATED", rec_james.id, 1)
                log_event("OFFER_SENT", "OFFER_CREATED", "OFFER_SENT", rec_james.id, 0, json.dumps({"offer_id": offer.id, "proposed_salary": 2100000.0}))

            elif cdef["state"] == "HIRED":
                db.query(Offer).filter(Offer.match_result_id == mr.id).delete()
                offer = Offer(
                    match_result_id=mr.id,
                    candidate_id=cprof.id,
                    job_id=job_obj.id,
                    created_by=rec_james.id,
                    salary_currency="INR",
                    salary_min=3200000.0,
                    salary_max=4200000.0,
                    proposed_salary=3800000.0,
                    employment_type="Full-time",
                    joining_date=now + timedelta(days=14),
                    offer_expiry_date=now + timedelta(days=3),
                    location="Noida / Remote",
                    work_mode="Hybrid",
                    additional_terms="Senior Stock Units Grant (ESOPs) + ₹3,00,000 Relocation allowance.",
                    status="ACCEPTED",
                    sent_at=now - timedelta(days=2),
                    responded_at=now - timedelta(days=1),
                    candidate_response_note="Extremely excited to join SkillAlign AI Labs as Lead AI Architect!",
                )
                db.add(offer)
                db.flush()
                log_event("HM_FEEDBACK_GO", "WAITING_FOR_HM_FEEDBACK", "COMPENSATION_DISCUSSION", hm_sarah.id, 4)
                log_event("OFFER_CREATED", "COMPENSATION_DISCUSSION", "OFFER_CREATED", rec_james.id, 3)
                log_event("OFFER_SENT", "OFFER_CREATED", "OFFER_SENT", rec_james.id, 2)
                log_event("OFFER_ACCEPTED", "OFFER_SENT", "HIRED", None, 1, json.dumps({"hired_date": (now - timedelta(days=1)).isoformat()}))

            print(f"  ✓ Seeded: {cdef['name']:<20} | Job: {cdef['target_job']:<30} | State: {cdef['state']}")

        db.commit()
        print("\n" + "=" * 65)
        print("  🎉 DEMO ENTERPRISE RECRUITMENT DATA SEEDED SUCCESSFULLY!")
        print("=" * 65 + "\n")

    except Exception as e:
        db.rollback()
        print(f"Error seeding demo data: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_enterprise_demo()
