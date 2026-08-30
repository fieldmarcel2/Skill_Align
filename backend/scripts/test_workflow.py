"""
End-to-End Workflow Verification Script for SkillAlign:
Tests the strict Recruiter vs. HR workflow, role permissions, matching, screening, HR approval, interview scheduling, and candidate pipeline tracking.
"""

import sys
import os
import io

# Set console output encoding to utf-8 if possible
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient
from app.main import app
from app.database.session import SessionLocal
from app.models.role import Role
from app.models.user import User
from app.models.skill import Skill
from app.models.candidate import Candidate
from app.models.candidate_skill import CandidateSkill
from app.models.job import Job
from app.models.job_skill import JobSkill
from app.models.match_result import MatchResult
from app.models.interview import Interview
from app.models.notification import Notification
from app.core.security import create_access_token, hash_password

client = TestClient(app)


def test_full_workflow():
    print("\n=======================================================")
    print("  SkillAlign: End-to-End Recruiter vs HR Workflow Test ")
    print("=======================================================\n")

    db = SessionLocal()
    try:
        # 1. Setup / Verify Users
        # Admin (role_id=1), HR (role_id=2), Recruiter (role_id=3), Candidate (role_id=4)
        recruiter = db.query(User).filter(User.email == "recruiter@skillaign.dev").first()
        if not recruiter:
            recruiter = User(name="James Recruiter", email="recruiter@skillaign.dev", password_hash=hash_password("Rec@12345"), role_id=3, is_active=True)
            db.add(recruiter)
            db.flush()

        hr = db.query(User).filter(User.email == "hr@skillaign.dev").first()
        if not hr:
            hr = User(name="Sarah HR", email="hr@skillaign.dev", password_hash=hash_password("HR@12345"), role_id=2, is_active=True)
            db.add(hr)
            db.flush()

        candidate_user = db.query(User).filter(User.email == "alice@candidate.dev").first()
        if not candidate_user:
            candidate_user = User(name="Alice Johnson", email="alice@candidate.dev", password_hash=hash_password("Alice@123"), role_id=4, is_active=True)
            db.add(candidate_user)
            db.flush()

        # Ensure Candidate profile
        candidate_profile = db.query(Candidate).filter(Candidate.user_id == candidate_user.id).first()
        if not candidate_profile:
            candidate_profile = Candidate(user_id=candidate_user.id, full_name="Alice Johnson", phone="+919876543210", total_experience_years=4.0)
            db.add(candidate_profile)
            db.flush()

        # Ensure Skills
        py_skill = db.query(Skill).filter(Skill.name == "Python").first()
        if not py_skill:
            py_skill = Skill(name="Python", category="Programming")
            db.add(py_skill)
            db.flush()

        fastapi_skill = db.query(Skill).filter(Skill.name == "FastAPI").first()
        if not fastapi_skill:
            fastapi_skill = Skill(name="FastAPI", category="Backend")
            db.add(fastapi_skill)
            db.flush()

        # Candidate skills
        cs1 = db.query(CandidateSkill).filter(CandidateSkill.candidate_id == candidate_profile.id, CandidateSkill.skill_id == py_skill.id).first()
        if not cs1:
            db.add(CandidateSkill(candidate_id=candidate_profile.id, skill_id=py_skill.id, proficiency_level="Expert", years_experience=4.0))

        cs2 = db.query(CandidateSkill).filter(CandidateSkill.candidate_id == candidate_profile.id, CandidateSkill.skill_id == fastapi_skill.id).first()
        if not cs2:
            db.add(CandidateSkill(candidate_id=candidate_profile.id, skill_id=fastapi_skill.id, proficiency_level="Intermediate", years_experience=2.0))

        db.commit()

        # Generate tokens
        recruiter_token = create_access_token(data={"sub": str(recruiter.id), "role": "Recruiter"})
        hr_token = create_access_token(data={"sub": str(hr.id), "role": "HR"})
        candidate_token = create_access_token(data={"sub": str(candidate_user.id), "role": "Candidate"})

        recruiter_headers = {"Authorization": f"Bearer {recruiter_token}"}
        hr_headers = {"Authorization": f"Bearer {hr_token}"}
        cand_headers = {"Authorization": f"Bearer {candidate_token}"}

        # -------------------------------------------------------------
        # STEP 1: Recruiter creates a job with weighted skills
        # -------------------------------------------------------------
        print("[1] Recruiter creates a job requisition...")
        job_payload = {
            "title": "Lead Python & FastAPI Architect",
            "description": "Lead high performance backend engineering.",
            "department": "Engineering",
            "client_name": "CloudTech Global",
            "min_experience_years": 3.0,
            "status": "active",
            "skills": [
                {"skill_id": py_skill.id, "requirement_type": "required", "weight": 5.0},
                {"skill_id": fastapi_skill.id, "requirement_type": "required", "weight": 4.0},
            ]
        }
        res = client.post("/api/jobs", json=job_payload, headers=recruiter_headers)
        assert res.status_code == 201, f"Failed creating job: {res.text}"
        job_data = res.json()
        job_id = job_data["id"]
        print(f"    -> Job created with ID: {job_id}, Title: {job_data['title']}")

        # -------------------------------------------------------------
        # STEP 2: Recruiter triggers matching engine
        # -------------------------------------------------------------
        print("\n[2] Recruiter triggers candidate matching engine...")
        res = client.post(f"/api/matching/jobs/{job_id}/run", headers=recruiter_headers)
        assert res.status_code == 200, f"Match run failed: {res.text}"
        match_run_data = res.json()
        assert match_run_data["total_candidates"] >= 1, "No candidates scored"
        
        alice_match = next((m for m in match_run_data["results"] if m["candidate_id"] == candidate_profile.id), None)
        assert alice_match is not None, "Alice was not found in match results"
        assert alice_match["overall_score"] > 0, "Score should be calculated"
        assert alice_match["status"] == "matched", f"Initial status should be 'matched', got {alice_match['status']}"
        match_id = alice_match["id"]
        print(f"    -> Match computed! Candidate: {alice_match['candidate']['full_name']}, Score: {alice_match['overall_score']}%, Status: {alice_match['status']}")

        # -------------------------------------------------------------
        # STEP 3: Recruiter screens candidate
        # -------------------------------------------------------------
        print("\n[3] Recruiter reviews resume and updates status to 'screened'...")
        res = client.patch(f"/api/match_results/{match_id}/status", json={"status": "screened"}, headers=recruiter_headers)
        assert res.status_code == 200, f"Failed screening: {res.text}"
        screened_res = res.json()
        assert screened_res["status"] == "screened", f"Status should be 'screened', got {screened_res['status']}"
        print(f"    -> Candidate status updated to: {screened_res['status']}")

        # Verify Recruiter cannot schedule interview (permission check)
        print("\n[3b] Verify Recruiter cannot schedule interview (Forbidden)...")
        res = client.post("/api/interviews", json={
            "match_result_id": match_id,
            "interview_date": "2026-09-01T10:00:00Z",
            "interview_type": "technical"
        }, headers=recruiter_headers)
        assert res.status_code == 403, f"Recruiter should be forbidden from scheduling interview, got {res.status_code}"
        print("    -> Recruiter correctly blocked with HTTP 403 Forbidden.")

        # -------------------------------------------------------------
        # STEP 4: HR views screened candidates and grants approval
        # -------------------------------------------------------------
        print("\n[4] HR fetches screened candidates list...")
        res = client.get("/api/matching/screened", headers=hr_headers)
        assert res.status_code == 200, f"Failed fetching screened: {res.text}"
        screened_list = res.json()
        assert any(m["id"] == match_id for m in screened_list), "Screened match not present in HR screened list"
        print(f"    -> HR sees {len(screened_list)} candidate(s) in screened pool.")

        print("\n[4b] HR updates status to 'approved_by_hr'...")
        res = client.patch(f"/api/match_results/{match_id}/status", json={"status": "approved_by_hr"}, headers=hr_headers)
        assert res.status_code == 200, f"Failed HR approval: {res.text}"
        approved_res = res.json()
        assert approved_res["status"] == "approved_by_hr", f"Status should be 'approved_by_hr', got {approved_res['status']}"
        print(f"    -> Status updated to: {approved_res['status']}")

        # -------------------------------------------------------------
        # STEP 5: HR schedules an interview and dispatches notification
        # -------------------------------------------------------------
        print("\n[5] HR schedules an interview (sets scheduled_by to HR ID & dispatches notification)...")
        interview_payload = {
            "match_result_id": match_id,
            "interview_date": "2026-09-05T14:30:00Z",
            "interview_type": "Technical Round - System Design",
            "feedback": "Google Meet: https://meet.google.com/skillalign-round1",
            "send_notification": True
        }
        res = client.post("/api/interviews", json=interview_payload, headers=hr_headers)
        assert res.status_code == 201, f"Failed scheduling interview: {res.text}"
        interview_data = res.json()
        assert interview_data["scheduled_by"] == hr.id, f"scheduled_by should be HR ID {hr.id}, got {interview_data['scheduled_by']}"
        assert interview_data["status"] == "scheduled"
        print(f"    -> Interview created (ID: {interview_data['id']}), Scheduled By HR: {interview_data['scheduler_name']}")

        # Verify Match status transitioned to interview_scheduled
        db.expire_all()
        updated_match = db.query(MatchResult).filter(MatchResult.id == match_id).first()
        assert updated_match.status == "interview_scheduled", f"Status should be 'interview_scheduled', got {updated_match.status}"
        print(f"    -> MatchResult pipeline status automatically updated to: {updated_match.status}")

        # -------------------------------------------------------------
        # STEP 6: Candidate tracks pipeline status & interview schedule
        # -------------------------------------------------------------
        print("\n[6] Candidate views their hiring pipeline...")
        res = client.get("/api/candidates/me/pipeline", headers=cand_headers)
        assert res.status_code == 200, f"Failed candidate pipeline: {res.text}"
        cand_pipeline = res.json()
        assert len(cand_pipeline) >= 1, "Candidate should have at least 1 job match in pipeline"
        alice_pipe_item = next((p for p in cand_pipeline if p["id"] == match_id), None)
        assert alice_pipe_item is not None, "Match item not found in candidate pipeline"
        assert alice_pipe_item["status"] == "interview_scheduled", f"Pipeline status should be 'interview_scheduled', got {alice_pipe_item['status']}"
        print(f"    -> Candidate pipeline verified! Job: '{alice_pipe_item['job']['title']}', Stage: '{alice_pipe_item['status']}'")

        print("\n[6b] Candidate checks scheduled interviews...")
        res = client.get("/api/interviews/my", headers=cand_headers)
        assert res.status_code == 200
        cand_interviews = res.json()
        assert len(cand_interviews) >= 1, "Candidate should have at least 1 scheduled interview"
        print(f"    -> Candidate received interview: {cand_interviews[0]['interview_type']} on {cand_interviews[0]['interview_date']}")

        print("\n[6c] Candidate checks notification inbox...")
        res = client.get("/api/notifications/my", headers=cand_headers)
        assert res.status_code == 200
        cand_notifs = res.json()
        assert len(cand_notifs) >= 1, "Candidate should have received interview notification"
        print(f"    -> Candidate notification received: '{cand_notifs[0]['subject']}'")

        print("\n=======================================================")
        print(" [SUCCESS] All Recruiter vs HR Workflow Tests Passed! ")
        print("=======================================================\n")

    finally:
        db.close()


if __name__ == "__main__":
    test_full_workflow()
