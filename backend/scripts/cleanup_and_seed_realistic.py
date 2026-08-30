"""
SkillAlign - Database Cleanup & Realistic Seeding Script
Cleans up temporary test accounts, keeps only 4 realistic candidates + Admin + HR + Recruiter,
and synchronizes User model names with Candidate profile names.
"""

import sys
import os
import io

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
from app.models.notification import Notification
from app.core.security import hash_password


def cleanup_and_seed():
    db = SessionLocal()
    try:
        print("\n--- Cleaning up temporary mock users & matching state ---")

        # 1. Fetch core roles
        admin_role = db.query(Role).filter(Role.name == "Admin").first()
        hr_role = db.query(Role).filter(Role.name == "HR").first()
        recruiter_role = db.query(Role).filter(Role.name == "Recruiter").first()
        candidate_role = db.query(Role).filter(Role.name == "Candidate").first()

        # 2. Identified core emails we want to preserve
        core_emails = {
            "admin@skillaign.dev",
            "hr@skillaign.dev",
            "recruiter@skillaign.dev",
            "alice@candidate.dev",
            "shiva9590t@gmail.com",
            "bob@candidate.dev",
            "priya@candidate.dev",
            "rohan@candidate.dev",
        }

        # 3. Delete non-core mock users (e.g. testcand_..., User-..., etc.)
        users_to_delete = db.query(User).filter(
            (User.email.not_in(core_emails) | (User.email == None)) & (User.role_id == candidate_role.id)
        ).all()

        for u in users_to_delete:
            # Check if this user is linked to Shivanshu with active S3 resume
            if u.candidate_profile and u.candidate_profile.resume_s3_key:
                continue
            if u.phone_number == "+918840226477" or u.phone_number == "8840226477":
                continue

            print(f"  Removing mock user: ID={u.id}, Name='{u.name}', Email='{u.email}', Phone='{u.phone_number}'")
            # Delete notifications
            db.query(Notification).filter(Notification.user_id == u.id).delete(synchronize_session=False)
            # Delete candidate profile & skills
            if u.candidate_profile:
                db.query(CandidateSkill).filter(CandidateSkill.candidate_id == u.candidate_profile.id).delete(synchronize_session=False)
                db.query(MatchResult).filter(MatchResult.candidate_id == u.candidate_profile.id).delete(synchronize_session=False)
                db.delete(u.candidate_profile)
            db.delete(u)

        db.commit()

        # 4. Ensure Core Users exist and have synchronized data
        print("\n--- Synchronizing Core Platform Users ---")

        # Admin
        admin = db.query(User).filter(User.email == "admin@skillaign.dev").first()
        if not admin:
            admin = User(name="System Admin", email="admin@skillaign.dev", password_hash=hash_password("Admin@123"), role_id=admin_role.id, is_active=True)
            db.add(admin)
        else:
            admin.name = "System Admin"
            admin.is_active = True

        # HR
        hr = db.query(User).filter(User.email == "hr@skillaign.dev").first()
        if not hr:
            hr = User(name="Sarah HR", email="hr@skillaign.dev", password_hash=hash_password("Hr@12345"), role_id=hr_role.id, is_active=True)
            db.add(hr)
        else:
            hr.name = "Sarah HR"
            hr.is_active = True

        # Recruiter
        recruiter = db.query(User).filter(User.email == "recruiter@skillaign.dev").first()
        if not recruiter:
            recruiter = User(name="James Recruiter", email="recruiter@skillaign.dev", password_hash=hash_password("Recruiter@123"), role_id=recruiter_role.id, is_active=True)
            db.add(recruiter)
        else:
            recruiter.name = "James Recruiter"
            recruiter.is_active = True

        # Candidate 1: Shivanshu Tripathi (Primary Candidate account)
        cand1_user = db.query(User).filter((User.email == "alice@candidate.dev") | (User.email == "shiva9590t@gmail.com")).first()
        if not cand1_user:
            cand1_user = User(name="Shivanshu Tripathi", email="alice@candidate.dev", phone_number="+91 8840226477", password_hash=hash_password("Candidate@123"), role_id=candidate_role.id, is_active=True)
            db.add(cand1_user)
            db.flush()
        else:
            cand1_user.name = "Shivanshu Tripathi"
            cand1_user.phone_number = "+91 8840226477"
            cand1_user.is_active = True

        cand1 = db.query(Candidate).filter(Candidate.user_id == cand1_user.id).first()
        if not cand1:
            cand1 = Candidate(user_id=cand1_user.id, full_name="Shivanshu Tripathi", phone="+91 8840226477", total_experience_years=2.0)
            db.add(cand1)
            db.flush()
        else:
            cand1.full_name = "Shivanshu Tripathi"
            cand1.phone = "+91 8840226477"
            cand1.total_experience_years = 2.0

        # Candidate 2: Bob Smith
        cand2_user = db.query(User).filter(User.email == "bob@candidate.dev").first()
        if not cand2_user:
            cand2_user = User(name="Bob Smith", email="bob@candidate.dev", phone_number="+91 9876543211", password_hash=hash_password("Candidate@123"), role_id=candidate_role.id, is_active=True)
            db.add(cand2_user)
            db.flush()
        else:
            cand2_user.name = "Bob Smith"
            cand2_user.phone_number = "+91 9876543211"
            cand2_user.is_active = True

        cand2 = db.query(Candidate).filter(Candidate.user_id == cand2_user.id).first()
        if not cand2:
            cand2 = Candidate(user_id=cand2_user.id, full_name="Bob Smith", phone="+91 9876543211", total_experience_years=3.0)
            db.add(cand2)
            db.flush()
        else:
            cand2.full_name = "Bob Smith"
            cand2.phone = "+91 9876543211"

        # Candidate 3: Priya Sharma
        cand3_user = db.query(User).filter(User.email == "priya@candidate.dev").first()
        if not cand3_user:
            cand3_user = User(name="Priya Sharma", email="priya@candidate.dev", phone_number="+91 9876543212", password_hash=hash_password("Candidate@123"), role_id=candidate_role.id, is_active=True)
            db.add(cand3_user)
            db.flush()
        else:
            cand3_user.name = "Priya Sharma"
            cand3_user.phone_number = "+91 9876543212"
            cand3_user.is_active = True

        cand3 = db.query(Candidate).filter(Candidate.user_id == cand3_user.id).first()
        if not cand3:
            cand3 = Candidate(user_id=cand3_user.id, full_name="Priya Sharma", phone="+91 9876543212", total_experience_years=4.5)
            db.add(cand3)
            db.flush()
        else:
            cand3.full_name = "Priya Sharma"
            cand3.phone = "+91 9876543212"

        # Candidate 4: Rohan Verma
        cand4_user = db.query(User).filter(User.email == "rohan@candidate.dev").first()
        if not cand4_user:
            cand4_user = User(name="Rohan Verma", email="rohan@candidate.dev", phone_number="+91 9876543213", password_hash=hash_password("Candidate@123"), role_id=candidate_role.id, is_active=True)
            db.add(cand4_user)
            db.flush()
        else:
            cand4_user.name = "Rohan Verma"
            cand4_user.phone_number = "+91 9876543213"
            cand4_user.is_active = True

        cand4 = db.query(Candidate).filter(Candidate.user_id == cand4_user.id).first()
        if not cand4:
            cand4 = Candidate(user_id=cand4_user.id, full_name="Rohan Verma", phone="+91 9876543213", total_experience_years=1.5)
            db.add(cand4)
            db.flush()
        else:
            cand4.full_name = "Rohan Verma"
            cand4.phone = "+91 9876543213"

        db.commit()

        # 5. Populate standard skills for candidates if missing
        skills_map = {s.name: s.id for s in db.query(Skill).all()}
        
        # Skills for Shivanshu
        for sname, prof, yrs in [("Python", "Expert", 2.0), ("FastAPI", "Expert", 2.0), ("PostgreSQL", "Intermediate", 2.0), ("React", "Intermediate", 1.5), ("AWS", "Intermediate", 1.0)]:
            if sname in skills_map:
                sk_id = skills_map[sname]
                if not db.query(CandidateSkill).filter(CandidateSkill.candidate_id == cand1.id, CandidateSkill.skill_id == sk_id).first():
                    db.add(CandidateSkill(candidate_id=cand1.id, skill_id=sk_id, proficiency_level=prof, years_experience=yrs))

        # Skills for Bob
        for sname, prof, yrs in [("Node.js", "Expert", 3.0), ("TypeScript", "Expert", 3.0), ("Docker", "Intermediate", 2.0), ("AWS", "Intermediate", 2.0)]:
            if sname in skills_map:
                sk_id = skills_map[sname]
                if not db.query(CandidateSkill).filter(CandidateSkill.candidate_id == cand2.id, CandidateSkill.skill_id == sk_id).first():
                    db.add(CandidateSkill(candidate_id=cand2.id, skill_id=sk_id, proficiency_level=prof, years_experience=yrs))

        # Skills for Priya
        for sname, prof, yrs in [("Python", "Expert", 4.5), ("Machine Learning", "Expert", 4.0), ("SQL", "Expert", 4.0)]:
            if sname in skills_map:
                sk_id = skills_map[sname]
                if not db.query(CandidateSkill).filter(CandidateSkill.candidate_id == cand3.id, CandidateSkill.skill_id == sk_id).first():
                    db.add(CandidateSkill(candidate_id=cand3.id, skill_id=sk_id, proficiency_level=prof, years_experience=yrs))

        # Skills for Rohan
        for sname, prof, yrs in [("React", "Expert", 1.5), ("Tailwind CSS", "Expert", 1.5), ("JavaScript", "Expert", 1.5)]:
            if sname in skills_map:
                sk_id = skills_map[sname]
                if not db.query(CandidateSkill).filter(CandidateSkill.candidate_id == cand4.id, CandidateSkill.skill_id == sk_id).first():
                    db.add(CandidateSkill(candidate_id=cand4.id, skill_id=sk_id, proficiency_level=prof, years_experience=yrs))

        db.commit()

        print("\n--- Summary of Active Users in SkillAlign ---")
        for u in db.query(User).order_by(User.id).all():
            print(f"  [ID {u.id}] {u.name} | Email: {u.email} | Phone: {u.phone_number} | Role: {u.role.name} | Active: {u.is_active}")

        print("\n[SUCCESS] Cleanup & Standard Seeding complete!\n")

    finally:
        db.close()


if __name__ == "__main__":
    cleanup_and_seed()
