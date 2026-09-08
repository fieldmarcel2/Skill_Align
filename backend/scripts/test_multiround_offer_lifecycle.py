"""
SkillAlign: End-to-End Multi-Round Interview & Offer Approval-to-Delivery Verification
=======================================================================================
Validates the complete Phase 10 Enterprise Workflow:
  1. Recruiter Shortlist & Submission to Hiring Manager
  2. Round 1: Scheduling, Candidate Slot Selection & Confirmation
  3. Round 1: Interview Completion & Interviewer Competency Scorecard
  4. Round 1: HM Feedback with intermediate clearance [ PASS ]
  5. Round 2: On-Demand Round Creation ("System Architecture Deep Dive")
  6. Round 2: Completion & HM Final Approval [ GO ] → Advance to Compensation
  7. Offer Creation: Recruiter drafts compensation & terms (DRAFT)
  8. Offer Review Submission: Recruiter submits to HM (PENDING_HM_REVIEW)
  9. HM Review Cycle: HM requests adjustments (HM_CHANGES_REQUESTED)
 10. Recruiter Adjustment & Resubmission (PENDING_HM_REVIEW)
 11. HM Formal Approval: HM signs off (HM_APPROVED)
 12. Corporate PDF Generation: ReportLab engine compiles official letter (OFFER_READY)
 13. PDF Download Verification: Binary inspection of %PDF- stream
 14. Offer Dispatch: Recruiter sends offer to Candidate (SENT)
 15. Candidate Public Token Access & PDF Download
 16. Candidate Offer Acceptance → HIRED 🎉
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
from app.models.candidate import Candidate
from app.models.job import Job
from app.models.match_result import MatchResult
from app.models.interview import Interview
from app.models.interview_slot import InterviewSlot
from app.models.offer import Offer
from app.core.security import create_access_token, hash_password

client = TestClient(app)


def run_test():
    print("\n" + "=" * 76)
    print("  SKILLALIGN MULTI-ROUND INTERVIEWS & OFFER LIFECYCLE E2E VERIFICATION")
    print("=" * 76 + "\n")

    db = SessionLocal()
    try:
        # 1. Setup Test Users
        recruiter = db.query(User).filter(User.email == "recruiter.mr@skillalign.dev").first()
        if not recruiter:
            recruiter = User(
                name="Rachel Recruiter",
                email="recruiter.mr@skillalign.dev",
                password_hash=hash_password("Pass@123"),
                role_id=3,
                is_active=True,
            )
            db.add(recruiter)
            db.commit()
            db.refresh(recruiter)

        hm = db.query(User).filter(User.email == "hm.mr@skillalign.dev").first()
        if not hm:
            hm = User(
                name="Marcus Manager",
                email="hm.mr@skillalign.dev",
                password_hash=hash_password("Pass@123"),
                role_id=2,  # HR / Hiring Manager
                is_active=True,
            )
            db.add(hm)
            db.commit()
            db.refresh(hm)

        cand_user = db.query(User).filter(User.email == "cand.mr@skillalign.dev").first()
        if not cand_user:
            cand_user = User(
                name="Alex Candidate",
                email="cand.mr@skillalign.dev",
                password_hash=hash_password("Pass@123"),
                role_id=4,  # Candidate
                is_active=True,
            )
            db.add(cand_user)
            db.commit()
            db.refresh(cand_user)

        candidate = db.query(Candidate).filter(Candidate.user_id == cand_user.id).first()
        if not candidate:
            candidate = Candidate(
                user_id=cand_user.id,
                full_name="Alex Candidate",
                total_experience_years=6.0,
            )
            db.add(candidate)
            db.commit()
            db.refresh(candidate)

        job = db.query(Job).filter(Job.title == "Lead Platform Engineer (Multi-Round Demo)").first()
        if not job:
            job = Job(
                title="Lead Platform Engineer (Multi-Round Demo)",
                description="Lead platform architecture and distributed systems engineering.",
                created_by=recruiter.id,
                status="active",
                min_experience_years=5,
            )
            db.add(job)
            db.commit()
            db.refresh(job)

        match = db.query(MatchResult).filter(
            MatchResult.candidate_id == candidate.id,
            MatchResult.job_id == job.id
        ).first()

        if match:
            # Clean up previous runs
            db.query(Offer).filter(Offer.match_result_id == match.id).delete()
            interviews = db.query(Interview).filter(Interview.match_result_id == match.id).all()
            for iv in interviews:
                db.query(InterviewSlot).filter(InterviewSlot.interview_id == iv.id).delete()
                db.delete(iv)
            db.delete(match)
            db.commit()

        match = MatchResult(
            job_id=job.id,
            candidate_id=candidate.id,
            recruiter_id=recruiter.id,
            overall_score=94.5,
            status="matched",
            pipeline_state="CANDIDATE_MATCHED",
        )
        db.add(match)
        db.commit()
        db.refresh(match)

        recruiter_token = create_access_token({"sub": str(recruiter.id), "role": "Recruiter"})
        hm_token = create_access_token({"sub": str(hm.id), "role": "HR"})
        cand_token = create_access_token({"sub": str(cand_user.id), "role": "Candidate"})

        rec_headers = {"Authorization": f"Bearer {recruiter_token}"}
        hm_headers = {"Authorization": f"Bearer {hm_token}"}
        cand_headers = {"Authorization": f"Bearer {cand_token}"}

        print(f"[SETUP] Candidate: {candidate.full_name} (ID: {candidate.id})")
        print(f"[SETUP] Job: {job.title} (ID: {job.id})")
        print(f"[SETUP] MatchResult: ID {match.id}, State: {match.pipeline_state}")

        # STEP 1: Shortlist & Submit to HM
        print("\n--- STEP 1: Shortlist & Submit to HM ---")
        res = client.post(
            f"/api/workflow/{match.id}/shortlist",
            json={"note": "Top tier platform candidate."},
            headers=rec_headers,
        )
        assert res.status_code == 200, f"Shortlist failed: {res.text}"

        res = client.post(
            f"/api/workflow/{match.id}/submit-to-hm",
            json={"hiring_manager_id": hm.id, "note": "Submitting for technical assessment."},
            headers=rec_headers,
        )
        assert res.status_code == 200, f"Submit to HM failed: {res.text}"
        print("  [OK] Candidate submitted to HM.")

        # HM Reviews candidate (advances to HIRING_MANAGER_REVIEW)
        res = client.post(f"/api/workflow/{match.id}/hm-review", headers=hm_headers)
        assert res.status_code == 200, f"HM review failed: {res.text}"

        # STEP 2: HM Requests Interview with proposed slots
        print("\n--- STEP 2: HM Proposes Slots (Round 1) ---")
        d1 = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        d2 = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
        res = client.post(
            f"/api/workflow/{match.id}/request-interview",
            json={
                "slots": [
                    {"slot_datetime": d1, "duration_minutes": 60},
                    {"slot_datetime": d2, "duration_minutes": 60},
                ],
                "interview_type": "Technical Screening",
                "meeting_link": "https://meet.google.com/test-round1",
            },
            headers=hm_headers,
        )
        assert res.status_code in (200, 201), f"Request interview failed: {res.text}"
        interview_r1_id = res.json()["id"]
        print(f"  [OK] Round 1 interview created (ID: {interview_r1_id}) with proposed slots.")

        # STEP 3: Recruiter forwards slots to candidate
        print("\n--- STEP 3: Recruiter Forwards Slots ---")
        res = client.post(f"/api/workflow/{match.id}/send-slots-to-candidate", headers=rec_headers)
        assert res.status_code == 200, f"Forward slots failed: {res.text}"
        print("  [OK] Slots forwarded to candidate.")

        # STEP 4: Candidate selects slot
        print("\n--- STEP 4: Candidate Selects Slot ---")
        # Fetch slots for Round 1
        res = client.get(f"/api/workflow/{match.id}/interview", headers=rec_headers)
        assert res.status_code == 200, f"Get interview failed: {res.text}"
        slots = res.json()["slots"]
        assert len(slots) >= 2, f"Expected >=2 slots, got {len(slots)}"
        selected_slot_id = slots[0]["id"]

        res = client.post(
            f"/api/workflow/interviews/{interview_r1_id}/select-slot",
            json={"slot_id": selected_slot_id},
            headers=cand_headers,
        )
        assert res.status_code == 200, f"Select slot failed: {res.text}"
        print(f"  [OK] Candidate selected slot {selected_slot_id}.")

        # Recruiter confirms interview
        res = client.post(
            f"/api/workflow/{match.id}/confirm-interview",
            json={"meeting_link": "https://meet.google.com/confirmed-r1"},
            headers=rec_headers,
        )
        assert res.status_code == 200, f"Confirm interview failed: {res.text}"
        print("  [OK] Recruiter confirmed interview.")

        # STEP 5: Complete Round 1 & Submit Interviewer Scorecard
        print("\n--- STEP 5: Complete Round 1 & Interviewer Scorecard ---")
        res = client.post(
            f"/api/workflow/{match.id}/complete-interview",
            json={"notes": "Round 1 interview completed successfully."},
            headers=rec_headers,
        )
        assert res.status_code == 200, f"Complete interview failed: {res.text}"

        res = client.post(
            f"/api/workflow/{match.id}/interviewer-evaluation",
            json={
                "technical_rating": 4,
                "communication_rating": 5,
                "problem_solving_rating": 5,
                "role_fit_rating": 4,
                "overall_rating": 5,
                "comments": "Solid algorithmic foundations and communication.",
            },
            headers=rec_headers,
        )
        assert res.status_code == 200, f"Scorecard failed: {res.text}"
        print("  [OK] Round 1 marked complete; interviewer scorecard recorded.")

        # STEP 6: HM Submits Round 1 Feedback: [ PASS ] (Next round cleared!)
        print("\n--- STEP 6: HM Reviews Round 1 → [ PASS ] ---")
        res = client.post(
            f"/api/workflow/interviews/{interview_r1_id}/round-feedback",
            params={
                "recommendation": "PASS",
                "is_final_round": False,
                "technical_rating": 4,
                "communication_rating": 5,
                "problem_solving_rating": 5,
                "overall_rating": 5,
                "comments": "Cleared initial technical round. Recommend deep-dive architecture round.",
            },
            headers=hm_headers,
        )
        assert res.status_code == 200, f"Round feedback failed: {res.text}"
        print("  [OK] HM submitted PASS for Round 1.")

        # Verify Round 1 status in all rounds
        res = client.get(f"/api/workflow/{match.id}/interviews", headers=rec_headers)
        assert res.status_code == 200, f"Get match interviews failed: {res.text}"
        rounds_list = res.json()
        assert len(rounds_list) >= 1
        assert rounds_list[0]["hm_recommendation"] == "PASS"
        print(f"  [OK] Verified Round 1 hm_recommendation = 'PASS'.")

        # STEP 7: Add On-Demand Round 2 (System Architecture Deep Dive)
        print("\n--- STEP 7: Add On-Demand Round 2 ---")
        res = client.post(
            f"/api/workflow/{match.id}/interviews/add-round",
            params={
                "round_name": "System Architecture Deep-Dive",
                "round_type": "TECHNICAL",
                "duration_minutes": 60,
            },
            headers=rec_headers,
        )
        assert res.status_code == 200, f"Add round failed: {res.text}"
        r2_data = res.json()
        interview_r2_id = r2_data["id"]
        assert r2_data["round_number"] == 2
        assert r2_data["is_additional_round"] is True
        print(f"  [OK] Round 2 added successfully! (ID: {interview_r2_id}, Name: {r2_data['round_name']})")

        # Mark Round 2 complete for HM evaluation
        iv_r2 = db.query(Interview).filter(Interview.id == interview_r2_id).first()
        iv_r2.status = "COMPLETED"
        iv_r2.round_status = "COMPLETED"
        match.pipeline_state = "WAITING_FOR_HM_FEEDBACK"
        db.commit()

        # STEP 8: HM Evaluates Round 2 → [ GO ] (Final Clearance!)
        print("\n--- STEP 8: HM Reviews Round 2 → [ GO ] (Final Offer Clearance) ---")
        res = client.post(
            f"/api/workflow/interviews/{interview_r2_id}/round-feedback",
            params={
                "recommendation": "GO",
                "is_final_round": True,
                "technical_rating": 5,
                "communication_rating": 5,
                "problem_solving_rating": 5,
                "overall_rating": 5,
                "comments": "Exceptional architecture vision. Highest recommendation to hire.",
            },
            headers=hm_headers,
        )
        assert res.status_code == 200, f"Round 2 feedback failed: {res.text}"
        mr_state = res.json()
        assert mr_state["pipeline_state"] == "COMPENSATION_DISCUSSION", (
            f"Expected COMPENSATION_DISCUSSION, got {mr_state['pipeline_state']}"
        )
        print("  [OK] Round 2 approved with GO! Pipeline advanced to COMPENSATION_DISCUSSION.")

        # STEP 9: Recruiter Creates DRAFT Offer
        print("\n--- STEP 9: Recruiter Creates DRAFT Offer ---")
        res = client.post(
            f"/api/workflow/{match.id}/create-offer",
            json={
                "proposed_salary": 145000,
                "salary_currency": "USD",
                "employment_type": "Full-time",
                "joining_date": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
                "role_scope": "Lead engineer leading core distributed platform services.",
                "work_mode": "Hybrid",
                "location": "San Francisco, CA / Remote",
            },
            headers=rec_headers,
        )
        assert res.status_code in (200, 201), f"Create offer failed: {res.text}"
        offer_data = res.json()
        offer_id = offer_data["id"]
        assert offer_data["workflow_state"] == "DRAFT"
        print(f"  [OK] Offer created (ID: {offer_id}), workflow_state = 'DRAFT'.")

        # STEP 10: Recruiter Submits Offer to HM for Review
        print("\n--- STEP 10: Recruiter Submits Offer to HM ---")
        res = client.post(
            f"/api/offers/{offer_id}/submit-review",
            params={"recruiter_notes": "Proposed $145k base based on strong Round 2 feedback."},
            headers=rec_headers,
        )
        assert res.status_code == 200, f"Submit offer review failed: {res.text}"
        assert res.json()["workflow_state"] == "PENDING_HM_REVIEW"
        print("  [OK] Offer submitted to HM. workflow_state = 'PENDING_HM_REVIEW'.")

        # Verify HM sees it in pending reviews
        res = client.get("/api/offers/pending-review", headers=hm_headers)
        assert res.status_code == 200, f"Get pending offers failed: {res.text}"
        pending_ids = [o["id"] for o in res.json()]
        assert offer_id in pending_ids, f"Offer {offer_id} not found in HM pending reviews list: {pending_ids}"
        print(f"  [OK] Offer {offer_id} appears in HM pending reviews list.")

        # STEP 11: HM Requests Changes (Testing Revision Loop)
        print("\n--- STEP 11: HM Requests Changes ---")
        res = client.post(
            f"/api/offers/{offer_id}/hm-review",
            params={
                "action": "REQUEST_CHANGES",
                "hm_notes": "Please bump base to $150,000 to remain competitive against competitor offers.",
            },
            headers=hm_headers,
        )
        assert res.status_code == 200, f"HM request changes failed: {res.text}"
        assert res.json()["workflow_state"] == "HM_CHANGES_REQUESTED"
        print("  [OK] HM requested adjustments. workflow_state = 'HM_CHANGES_REQUESTED'.")

        # Recruiter adjusts salary and resubmits
        print("\n--- STEP 12: Recruiter Adjusts Offer & Resubmits ---")
        res = client.patch(
            f"/api/offers/{offer_id}",
            json={"proposed_salary": 150000},
            headers=rec_headers,
        )
        assert res.status_code == 200, f"Update offer failed: {res.text}"
        assert res.json()["proposed_salary"] == 150000

        res = client.post(
            f"/api/offers/{offer_id}/submit-review",
            params={"recruiter_notes": "Updated to $150,000 base as requested."},
            headers=rec_headers,
        )
        assert res.status_code == 200, f"Resubmit offer failed: {res.text}"
        assert res.json()["workflow_state"] == "PENDING_HM_REVIEW"
        print("  [OK] Recruiter updated salary to $150,000 and resubmitted.")

        # STEP 13: HM Approves Offer
        print("\n--- STEP 13: HM Approves Offer ---")
        res = client.post(
            f"/api/offers/{offer_id}/hm-review",
            params={"action": "APPROVE", "hm_notes": "Approved! Excellent comp package."},
            headers=hm_headers,
        )
        assert res.status_code == 200, f"HM approve failed: {res.text}"
        assert res.json()["workflow_state"] == "HM_APPROVED"
        print("  [OK] HM Approved! workflow_state = 'HM_APPROVED'.")

        # STEP 14: Recruiter Generates Corporate PDF Offer Letter
        print("\n--- STEP 14: Recruiter Generates PDF Offer Letter ---")
        res = client.post(f"/api/offers/{offer_id}/generate-pdf", headers=rec_headers)
        assert res.status_code == 200, f"Generate PDF failed: {res.text}"
        pdf_offer = res.json()
        assert pdf_offer["workflow_state"] == "OFFER_READY"
        assert pdf_offer["has_pdf"] is True
        assert pdf_offer["pdf_file_size"] > 0
        print(f"  [OK] PDF Generated! File: {pdf_offer['pdf_file_name']} ({pdf_offer['pdf_file_size']} bytes).")

        # STEP 15: Download & Verify PDF Content
        print("\n--- STEP 15: Verify PDF Stream Download ---")
        res = client.get(f"/api/offers/{offer_id}/pdf", headers=rec_headers)
        assert res.status_code == 200, f"Download PDF failed: {res.text}"
        assert res.headers["content-type"] == "application/pdf"
        assert res.content.startswith(b"%PDF-"), "Downloaded bytes do not match valid PDF magic header (%PDF-)"
        print(f"  [OK] PDF download verified (%PDF- header confirmed, {len(res.content)} bytes).")

        # STEP 16: Recruiter Sends Offer to Candidate
        print("\n--- STEP 16: Recruiter Dispatches Offer to Candidate ---")
        res = client.post(f"/api/offers/{offer_id}/send", headers=rec_headers)
        assert res.status_code == 200, f"Send offer failed: {res.text}"
        sent_offer = res.json()
        assert sent_offer["workflow_state"] == "SENT"
        print("  [OK] Offer dispatched to candidate. workflow_state = 'SENT'.")

        # Candidate downloads PDF via public secure token
        db_offer = db.query(Offer).filter(Offer.id == offer_id).first()
        token = db_offer.offer_token
        assert token is not None, "Offer token not found"

        res = client.get(f"/api/offers/candidate/{token}/pdf")
        assert res.status_code == 200, f"Candidate download PDF failed: {res.text}"
        assert res.headers["content-type"] == "application/pdf"
        assert res.content.startswith(b"%PDF-")
        print(f"  [OK] Candidate downloaded PDF using secure token.")

        # STEP 17: Candidate Accepts Offer → HIRED!
        print("\n--- STEP 17: Candidate Accepts Offer ---")
        res = client.post(
            f"/api/offers/{offer_id}/respond",
            json={"token": token, "accept": True, "note": "Thrilled to accept the platform lead position!"},
        )
        assert res.status_code == 200, f"Respond to offer failed: {res.text}"
        accepted_offer = res.json()
        assert accepted_offer["status"] == "ACCEPTED"

        db.refresh(match)
        assert match.pipeline_state in ("OFFER_ACCEPTED", "HIRED"), (
            f"Expected pipeline_state OFFER_ACCEPTED or HIRED, got {match.pipeline_state}"
        )
        print(f"  [OK] Candidate accepted offer! Match pipeline_state = '{match.pipeline_state}'.")

        print("\n" + "=" * 76)
        print("  ALL 17 ENTERPRISE MULTI-ROUND & OFFER APPROVAL STEPS PASSED! (100%)")
        print("=" * 76 + "\n")
        return True

    finally:
        db.close()


if __name__ == "__main__":
    success = run_test()
    if not success:
        sys.exit(1)
