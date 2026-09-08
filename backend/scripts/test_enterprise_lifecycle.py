"""
SkillAlign: End-to-End Enterprise Recruitment Lifecycle Verification
====================================================================
Validates the complete recruitment workflow:
  Recruiter Shortlist
    ↓
  Submit to Hiring Manager
    ↓
  Hiring Manager Review & Slot Proposal (≥2 slots)
    ↓
  Recruiter Forwards Slots to Candidate
    ↓
  Candidate Slot Selection (Secure Token)
    ↓
  Recruiter Confirms Interview
    ↓
  Interview Completed
    ↓
  Hiring Manager GO/NO-GO Feedback
    ↓
  Recruiter Compensation & Offer Creation
    ↓
  Candidate Accepts Offer → HIRED 🎉
    ↓
  Audit Trail & Timeline Verification
    ↓
  Rejection Path → 6-Month Blacklist Verification
"""

import sys
import os
import io
from datetime import datetime, timezone, timedelta

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
from app.models.interview_slot import InterviewSlot
from app.models.interview_feedback import InterviewFeedback
from app.models.offer import Offer
from app.models.candidate_blacklist import CandidateBlacklist
from app.models.recruitment_task import RecruitmentTask
from app.models.audit_log import AuditLog
from app.core.security import create_access_token, hash_password

client = TestClient(app)


def run_enterprise_lifecycle_test():
    print("\n" + "=" * 70)
    print("  SKILLALIGN ENTERPRISE RECRUITMENT WORKFLOW — FULL E2E TEST")
    print("=" * 70 + "\n")

    db = SessionLocal()
    try:
        # 1. Setup Test Users
        recruiter = db.query(User).filter(User.email == "recruiter.enterprise@skillalign.dev").first()
        if not recruiter:
            recruiter = User(
                name="James Recruiter",
                email="recruiter.enterprise@skillalign.dev",
                password_hash=hash_password("Pass@123"),
                role_id=3,
                is_active=True,
            )
            db.add(recruiter)
            db.flush()

        hm = db.query(User).filter(User.email == "hm.sarah@skillalign.dev").first()
        if not hm:
            hm = User(
                name="Sarah HiringManager",
                email="hm.sarah@skillalign.dev",
                password_hash=hash_password("Pass@123"),
                role_id=2,
                is_active=True,
            )
            db.add(hm)
            db.flush()

        cand_user = db.query(User).filter(User.email == "rahul.sharma@candidate.dev").first()
        if not cand_user:
            cand_user = User(
                name="Rahul Sharma",
                email="rahul.sharma@candidate.dev",
                password_hash=hash_password("Pass@123"),
                role_id=4,
                is_active=True,
            )
            db.add(cand_user)
            db.flush()

        cand_profile = db.query(Candidate).filter(Candidate.user_id == cand_user.id).first()
        if not cand_profile:
            cand_profile = Candidate(
                user_id=cand_user.id,
                full_name="Rahul Sharma",
                phone="+919876543210",
                total_experience_years=2.5,
                city="Bangalore",
            )
            db.add(cand_profile)
            db.flush()

        # Create Job
        job = db.query(Job).filter(Job.title == "Junior Python Developer (E2E Test)").first()
        if not job:
            job = Job(
                title="Junior Python Developer (E2E Test)",
                description="Looking for Python, FastAPI, and PostgreSQL developer.",
                department="Engineering",
                min_experience_years=1.0,
                status="active",
                created_by=hm.id,
            )
            db.add(job)
            db.flush()

        # Create Skills
        py_skill = db.query(Skill).filter(Skill.name == "Python").first()
        if not py_skill:
            py_skill = Skill(name="Python", category="Programming")
            db.add(py_skill)
            db.flush()

        # Create MatchResult
        match_result = db.query(MatchResult).filter(
            MatchResult.job_id == job.id,
            MatchResult.candidate_id == cand_profile.id
        ).first()

        if not match_result:
            match_result = MatchResult(
                job_id=job.id,
                candidate_id=cand_profile.id,
                recruiter_id=recruiter.id,
                overall_score=94.0,
                status="matched",
                pipeline_state="CANDIDATE_MATCHED",
            )
            db.add(match_result)
            db.flush()
        else:
            match_result.pipeline_state = "CANDIDATE_MATCHED"
            match_result.hiring_manager_id = None
            match_result.shortlist_note = None
            match_result.submitted_to_hm_at = None
            match_result.hm_reviewed_at = None
            match_result.hm_rejection_reason = None
            db.flush()

        match_id = match_result.id

        # Clean up any leftover test data for this match_id
        db.query(Offer).filter(Offer.match_result_id == match_id).delete()
        interviews = db.query(Interview).filter(Interview.match_result_id == match_id).all()
        for itw in interviews:
            db.query(InterviewFeedback).filter(InterviewFeedback.interview_id == itw.id).delete()
            db.query(InterviewSlot).filter(InterviewSlot.interview_id == itw.id).delete()
            db.delete(itw)
        db.query(RecruitmentTask).filter(RecruitmentTask.match_result_id == match_id).delete()
        db.query(AuditLog).filter(AuditLog.entity_id == match_id, AuditLog.entity_type == "MatchResult").delete()
        db.commit()

        # Clean up candidate 2 if already exists from prior run
        cand2_user = db.query(User).filter(User.email == "decline.test@candidate.dev").first()
        if cand2_user:
            cand2_prof = db.query(Candidate).filter(Candidate.user_id == cand2_user.id).first()
            if cand2_prof:
                db.query(CandidateBlacklist).filter(CandidateBlacklist.candidate_id == cand2_prof.id).delete()
                mr2_list = db.query(MatchResult).filter(MatchResult.candidate_id == cand2_prof.id).all()
                for m2 in mr2_list:
                    db.query(Offer).filter(Offer.match_result_id == m2.id).delete()
                    db.delete(m2)
            db.commit()

        # Generate JWT Auth Tokens
        recruiter_token = create_access_token(data={"sub": str(recruiter.id), "role": "Recruiter"})
        hm_token = create_access_token(data={"sub": str(hm.id), "role": "HR"})
        cand_token = create_access_token(data={"sub": str(cand_user.id), "role": "Candidate"})

        rec_headers = {"Authorization": f"Bearer {recruiter_token}"}
        hm_headers = {"Authorization": f"Bearer {hm_token}"}
        cand_headers = {"Authorization": f"Bearer {cand_token}"}

        match_id = match_result.id
        print(f"[*] Initialized Test Application ID: {match_id} (Rahul Sharma → {job.title})")
        print(f"[*] Initial State: {match_result.pipeline_state}")

        # ─────────────────────────────────────────────────────────────────────
        # STEP 1: Recruiter Shortlists Candidate
        # ─────────────────────────────────────────────────────────────────────
        print("\n--- STEP 1: Recruiter Shortlists Candidate ---")
        res = client.post(
            f"/api/workflow/{match_id}/shortlist",
            json={"note": "Top score in Python & FastAPI. Highly recommended."},
            headers=rec_headers,
        )
        assert res.status_code == 200, f"Shortlist failed: {res.text}"
        data = res.json()
        print(f"✓ Shortlisted! Pipeline State: {data['pipeline_state']}")
        assert data["pipeline_state"] == "CANDIDATE_SHORTLISTED"

        # ─────────────────────────────────────────────────────────────────────
        # STEP 2: Recruiter Submits to Hiring Manager
        # ─────────────────────────────────────────────────────────────────────
        print("\n--- STEP 2: Recruiter Submits to Hiring Manager ---")
        res = client.post(
            f"/api/workflow/{match_id}/submit-to-hm",
            json={"hiring_manager_id": hm.id, "note": "Please review for round 1 technical interview."},
            headers=rec_headers,
        )
        assert res.status_code == 200, f"Submit to HM failed: {res.text}"
        data = res.json()
        print(f"✓ Submitted to HM! Pipeline State: {data['pipeline_state']}, HM: {data['hiring_manager_name']}")
        assert data["pipeline_state"] == "SENT_TO_HIRING_MANAGER"

        # ─────────────────────────────────────────────────────────────────────
        # STEP 3: HM Reviews Candidate
        # ─────────────────────────────────────────────────────────────────────
        print("\n--- STEP 3: HM Reviews Candidate ---")
        res = client.post(f"/api/workflow/{match_id}/hm-review", headers=hm_headers)
        assert res.status_code == 200, f"HM Review failed: {res.text}"
        data = res.json()
        print(f"✓ In Review! Pipeline State: {data['pipeline_state']}")
        assert data["pipeline_state"] == "HIRING_MANAGER_REVIEW"

        # ─────────────────────────────────────────────────────────────────────
        # STEP 4: HM Requests Interview & Proposes ≥ 2 Slots
        # ─────────────────────────────────────────────────────────────────────
        print("\n--- STEP 4: HM Requests Interview & Proposes 2 Slots ---")
        now = datetime.now(timezone.utc)
        slot1_start = now + timedelta(days=2, hours=10)
        slot1_end = slot1_start + timedelta(minutes=45)
        slot2_start = now + timedelta(days=3, hours=14)
        slot2_end = slot2_start + timedelta(minutes=45)

        slots_payload = [
            {"slot_datetime": slot1_start.isoformat(), "slot_end_datetime": slot1_end.isoformat()},
            {"slot_datetime": slot2_start.isoformat(), "slot_end_datetime": slot2_end.isoformat()},
        ]

        res = client.post(
            f"/api/workflow/{match_id}/request-interview",
            json={
                "slots": slots_payload,
                "interview_type": "technical",
                "meeting_link": "https://meet.google.com/test-e2e-session",
            },
            headers=hm_headers,
        )
        assert res.status_code in (200, 201), f"Request interview failed: {res.text}"
        interview_data = res.json()
        interview_id = interview_data["id"]
        print(f"✓ Interview Created (ID: {interview_id}) with {len(interview_data['slots'])} Proposed Slots!")
        assert len(interview_data["slots"]) >= 2

        # ─────────────────────────────────────────────────────────────────────
        # STEP 5: Recruiter Forwards Slots to Candidate
        # ─────────────────────────────────────────────────────────────────────
        print("\n--- STEP 5: Recruiter Forwards Slots to Candidate ---")
        res = client.post(f"/api/workflow/{match_id}/send-slots-to-candidate", headers=rec_headers)
        assert res.status_code == 200, f"Send slots failed: {res.text}"
        print("✓ Slots dispatched to candidate via email link!")

        # Verify Interview slot token from DB
        db.expire_all()
        interview_obj = db.query(Interview).filter(Interview.id == interview_id).first()
        slot_token = interview_obj.slot_token
        proposed_slot_id = interview_obj.slots[0].id
        print(f"✓ Generated Secure Token: {slot_token[:12]}...")

        # ─────────────────────────────────────────────────────────────────────
        # STEP 6: Candidate Selects a Time Slot (Public with Token)
        # ─────────────────────────────────────────────────────────────────────
        print("\n--- STEP 6: Candidate Selects a Time Slot (Public Endpoint) ---")
        res = client.post(
            f"/api/workflow/interviews/{interview_id}/select-slot",
            json={"token": slot_token, "slot_id": proposed_slot_id},
        )
        assert res.status_code == 200, f"Candidate slot selection failed: {res.text}"
        data = res.json()
        print(f"✓ Slot Selected by Candidate! Pipeline State: {data['pipeline_state']}")
        assert data["pipeline_state"] == "CANDIDATE_SLOT_SELECTED"

        # ─────────────────────────────────────────────────────────────────────
        # STEP 7: Recruiter Confirms Selected Slot
        # ─────────────────────────────────────────────────────────────────────
        print("\n--- STEP 7: Recruiter Confirms Selected Slot ---")
        res = client.post(f"/api/workflow/{match_id}/confirm-interview", headers=rec_headers)
        assert res.status_code == 200, f"Confirm interview failed: {res.text}"
        print("✓ Interview Confirmed! All parties received calendar invites.")

        # ─────────────────────────────────────────────────────────────────────
        # STEP 8: Interview Completed
        # ─────────────────────────────────────────────────────────────────────
        print("\n--- STEP 8: Interview Completed ---")
        res = client.post(
            f"/api/workflow/{match_id}/complete-interview",
            json={"notes": "Completed 45 min live coding session on FastAPI and database schemas."},
            headers=rec_headers,
        )
        assert res.status_code == 200, f"Complete interview failed: {res.text}"
        print("✓ Interview marked Completed! Task dispatched to Hiring Manager for feedback.")

        # ─────────────────────────────────────────────────────────────────────
        # STEP 9: Hiring Manager Submits Structured GO Feedback
        # ─────────────────────────────────────────────────────────────────────
        print("\n--- STEP 9: Hiring Manager Submits 5-Star Ratings & GO Decision ---")
        res = client.post(
            f"/api/workflow/{match_id}/hm-feedback",
            json={
                "go_no_go": "GO",
                "technical_rating": 5,
                "communication_rating": 4,
                "problem_solving_rating": 5,
                "role_fit_rating": 5,
                "overall_rating": 5,
                "comments": "Exceptional coding speed, clean architecture, and great articulation. Strong GO.",
            },
            headers=hm_headers,
        )
        assert res.status_code == 201, f"HM feedback failed: {res.text}"
        fb_data = res.json()
        print(f"✓ HM Decision Recorded: {fb_data['go_no_go']} (Overall: {fb_data['overall_rating']}/5 Stars)!")

        # Verify state is COMPENSATION_DISCUSSION
        db.expire_all()
        mr_curr = db.query(MatchResult).filter(MatchResult.id == match_id).first()
        print(f"✓ Current State: {mr_curr.pipeline_state}")
        assert mr_curr.pipeline_state == "COMPENSATION_DISCUSSION"

        # ─────────────────────────────────────────────────────────────────────
        # STEP 10: Recruiter Creates & Sends Formal Offer Letter
        # ─────────────────────────────────────────────────────────────────────
        print("\n--- STEP 10: Recruiter Creates & Sends Formal Offer ---")
        offer_joining = (now + timedelta(days=14)).isoformat()
        offer_expiry = (now + timedelta(days=7)).isoformat()

        res = client.post(
            f"/api/workflow/{match_id}/create-offer",
            json={
                "proposed_salary": 720000.0,
                "salary_min": 650000.0,
                "salary_max": 850000.0,
                "salary_currency": "INR",
                "employment_type": "Full-time",
                "joining_date": offer_joining,
                "offer_expiry_date": offer_expiry,
                "location": "Bangalore",
                "work_mode": "Hybrid",
                "additional_terms": "Standard medical insurance + ₹50,000 learning budget.",
            },
            headers=rec_headers,
        )
        assert res.status_code in (200, 201), f"Create offer failed: {res.text}"
        offer_data = res.json()
        offer_id = offer_data["id"]
        print(f"✓ Offer Drafted (ID: {offer_id}) — CTC: ₹{offer_data['proposed_salary']:,.2f}")

        # Send offer
        res = client.post(f"/api/offers/{offer_id}/send", headers=rec_headers)
        assert res.status_code == 200, f"Send offer failed: {res.text}"
        offer_sent = res.json()
        print(f"✓ Offer Dispatched to Candidate! Status: {offer_sent['status']}")

        # Retrieve offer token
        db.expire_all()
        offer_obj = db.query(Offer).filter(Offer.id == offer_id).first()
        offer_token = offer_obj.offer_token

        # ─────────────────────────────────────────────────────────────────────
        # STEP 11: Candidate Accepts Formal Offer → HIRED!
        # ─────────────────────────────────────────────────────────────────────
        print("\n--- STEP 11: Candidate Accepts Offer ---")
        res = client.post(
            f"/api/offers/{offer_id}/respond",
            json={"token": offer_token, "accept": True, "note": "Thrilled to accept and join the team!"},
        )
        assert res.status_code == 200, f"Accept offer failed: {res.text}"
        db.expire_all()
        mr_final = db.query(MatchResult).filter(MatchResult.id == match_id).first()
        print(f"🎉 CANDIDATE STATUS FINALIZED: {mr_final.pipeline_state} (HIRED)!")
        assert mr_final.pipeline_state == "HIRED"

        # ─────────────────────────────────────────────────────────────────────
        # STEP 12: Audit Trail & Timeline Verification
        # ─────────────────────────────────────────────────────────────────────
        print("\n--- STEP 12: Full Lifecycle Audit Log Verification ---")
        res = client.get(f"/api/workflow/{match_id}/timeline", headers=rec_headers)
        assert res.status_code == 200, f"Timeline fetch failed: {res.text}"
        timeline_events = res.json()
        print(f"✓ Audit Trail contains {len(timeline_events)} immutable event logs:")
        for idx, evt in enumerate(timeline_events, 1):
            actor = evt.get("actor_name") or "System"
            from_s = evt.get("from_state") or "-"
            to_s = evt.get("to_state") or "-"
            print(f"   [{idx}] {evt['action']:<28} | {from_s} → {to_s} (by {actor})")

        assert len(timeline_events) >= 8

        # ─────────────────────────────────────────────────────────────────────
        # STEP 13: Rejection & 6-Month Blacklist Verification
        # ─────────────────────────────────────────────────────────────────────
        print("\n--- STEP 13: Decline Path & 6-Month Blacklist Test ---")
        # Create second candidate to test rejection path
        cand2_user = db.query(User).filter(User.email == "decline.test@candidate.dev").first()
        if not cand2_user:
            cand2_user = User(name="Vikram Singh", email="decline.test@candidate.dev", password_hash=hash_password("Pass@123"), role_id=4, is_active=True)
            db.add(cand2_user)
            db.flush()

        cand2_prof = db.query(Candidate).filter(Candidate.user_id == cand2_user.id).first()
        if not cand2_prof:
            cand2_prof = Candidate(user_id=cand2_user.id, full_name="Vikram Singh", phone="+919111122222", total_experience_years=3.0)
            db.add(cand2_prof)
            db.flush()

        mr2 = MatchResult(job_id=job.id, candidate_id=cand2_prof.id, recruiter_id=recruiter.id, overall_score=88.0, status="offer", pipeline_state="COMPENSATION_DISCUSSION")
        db.add(mr2)
        db.commit()

        # Create offer & send
        res = client.post(
            f"/api/workflow/{mr2.id}/create-offer",
            json={"proposed_salary": 680000.0, "salary_currency": "INR", "employment_type": "Full-time"},
            headers=rec_headers,
        )
        assert res.status_code in (200, 201), f"Create offer 2 failed: {res.text}"
        offer2_id = res.json()["id"]
        res = client.post(f"/api/offers/{offer2_id}/send", headers=rec_headers)

        db.expire_all()
        offer2_obj = db.query(Offer).filter(Offer.id == offer2_id).first()
        offer2_token = offer2_obj.offer_token

        # Candidate declines
        res = client.post(
            f"/api/offers/{offer2_id}/respond",
            json={"token": offer2_token, "accept": False, "note": "Received higher compensation elsewhere."},
        )
        assert res.status_code == 200

        db.expire_all()
        mr2_after = db.query(MatchResult).filter(MatchResult.id == mr2.id).first()
        print(f"✓ Rejected candidate state: {mr2_after.pipeline_state}")
        assert mr2_after.pipeline_state == "BLACKLISTED"

        # Check blacklist table
        bl_entry = db.query(CandidateBlacklist).filter(CandidateBlacklist.candidate_id == cand2_prof.id, CandidateBlacklist.is_active == True).first()
        assert bl_entry is not None, "Blacklist entry not created!"
        print(f"✓ Blacklist record created! Active until: {bl_entry.blacklisted_until.strftime('%Y-%m-%d')}")

        # Check matching exclude/flag
        res = client.get(f"/api/matching/jobs/{job.id}/shortlist-candidates?exclude_blacklisted=false", headers=rec_headers)
        assert res.status_code == 200
        cand_list = res.json()["candidates"]
        vikram_entry = next((c for c in cand_list if c["candidate_id"] == cand2_prof.id), None)
        assert vikram_entry is not None
        assert vikram_entry["is_blacklisted"] == True
        print(f"✓ Matching engine accurately flags blacklisted candidate (is_blacklisted={vikram_entry['is_blacklisted']})")

        print("\n" + "=" * 70)
        print("  🎉 ALL 13 ENTERPRISE WORKFLOW LIFECYCLE TESTS PASSED PERFECTLY!")
        print("=" * 70 + "\n")

    finally:
        db.close()


if __name__ == "__main__":
    run_enterprise_lifecycle_test()
