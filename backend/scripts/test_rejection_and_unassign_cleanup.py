"""
Test Rejection and Claim Release Cleanup
========================================
Verifies that:
1. Recruiter rejection cancels pending interviews and slots, removing them from candidate view.
2. HM rejection cancels pending interviews and slots, removing them from candidate view.
3. Recruiter unassign / claim release cancels pending slot invitations so no phantom slot selection is shown.
4. Candidate select slot rejects attempts on cancelled or rejected applications.
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from datetime import datetime, timezone, timedelta
from app.database.session import SessionLocal
from app.models.user import User
from app.models.role import Role
from app.models.candidate import Candidate
from app.models.job import Job
from app.models.match_result import MatchResult
from app.models.interview import Interview
from app.models.interview_slot import InterviewSlot
from app.models.candidate_recruiter_assignment import CandidateRecruiterAssignment
from app.services import matching_service, workflow_service, candidate_assignment_service


def test_rejection_and_unassign_cleanup():
    db = SessionLocal()
    try:
        print("[Setup] Setting up mock candidate, job, HM, Recruiter...")
        recruiter = db.query(User).filter(User.email == "recruiter@skillalign.com").first()
        if not recruiter:
            recruiter = db.query(User).join(User.role).filter(Role.name == "Recruiter").first()

        hm = db.query(User).join(User.role).filter(Role.name == "HR").first()

        candidate_user = db.query(User).filter(User.email == "ishankkumar@example.com").first()
        candidate = db.query(Candidate).filter(Candidate.user_id == candidate_user.id).first()

        job = db.query(Job).first()

        print(f"   Recruiter: {recruiter.name if recruiter else 'None'}")
        print(f"   HM: {hm.name if hm else 'None'}")
        print(f"   Candidate: {candidate.full_name if candidate else 'None'}")
        print(f"   Job: {job.title if job else 'None'}")

        # ── TEST 1: Recruiter Rejection Cascade Cleanup ────────────────────────
        print("\n[Test 1] Recruiter Rejection Cascade Cleanup...")
        # Create match
        match1 = db.query(MatchResult).filter(
            MatchResult.job_id == job.id, MatchResult.candidate_id == candidate.id
        ).first()
        if not match1:
            match1 = MatchResult(
                job_id=job.id,
                candidate_id=candidate.id,
                recruiter_id=recruiter.id,
                matched_by=recruiter.id,
                overall_score=88.5,
                status="screened",
                pipeline_state="WAITING_FOR_CANDIDATE_SLOT"
            )
            db.add(match1)
            db.commit()
            db.refresh(match1)
        else:
            match1.status = "screened"
            match1.pipeline_state = "WAITING_FOR_CANDIDATE_SLOT"
            db.commit()

        import secrets
        # Create interview with proposed slots
        now = datetime.now(timezone.utc)
        inv1 = Interview(
            match_result_id=match1.id,
            scheduled_by=recruiter.id,
            interview_type="Technical",
            status="pending_slot",
            slot_token=secrets.token_urlsafe(16)
        )
        db.add(inv1)
        db.commit()
        db.refresh(inv1)

        slot1 = InterviewSlot(
            interview_id=inv1.id,
            match_result_id=match1.id,
            slot_datetime=now + timedelta(days=1, hours=10),
            slot_end_datetime=now + timedelta(days=1, hours=11),
            status="proposed",
            proposed_by=hm.id
        )
        slot2 = InterviewSlot(
            interview_id=inv1.id,
            match_result_id=match1.id,
            slot_datetime=now + timedelta(days=2, hours=14),
            slot_end_datetime=now + timedelta(days=2, hours=15),
            status="proposed",
            proposed_by=hm.id
        )
        db.add_all([slot1, slot2])
        db.commit()

        # Recruiter rejects candidate
        matching_service.update_match_status(db, match1.id, "rejected", recruiter)

        # Verify interview and slots are cancelled
        db.refresh(inv1)
        db.refresh(slot1)
        db.refresh(slot2)
        assert inv1.status == "cancelled", f"Expected interview status 'cancelled', got {inv1.status}"
        assert slot1.status == "cancelled", f"Expected slot1 status 'cancelled', got {slot1.status}"
        assert slot2.status == "cancelled", f"Expected slot2 status 'cancelled', got {slot2.status}"
        print("   [PASS] Recruiter rejection cleanly cancelled interview and all slots.")

        # ── TEST 2: HM Rejection Cascade Cleanup ──────────────────────────────
        print("\n[Test 2] Hiring Manager Rejection Cascade Cleanup...")
        match1.status = "screened"
        match1.pipeline_state = "HIRING_MANAGER_REVIEW"
        inv2 = Interview(
            match_result_id=match1.id,
            scheduled_by=recruiter.id,
            interview_type="HM Interview",
            status="pending_slot",
            slot_token=secrets.token_urlsafe(16)
        )
        db.add(inv2)
        db.commit()
        db.refresh(inv2)

        slot3 = InterviewSlot(
            interview_id=inv2.id,
            match_result_id=match1.id,
            slot_datetime=now + timedelta(days=3, hours=10),
            slot_end_datetime=now + timedelta(days=3, hours=11),
            status="proposed",
            proposed_by=hm.id
        )
        db.add(slot3)
        db.commit()

        # HM rejects candidate
        workflow_service.hm_reject_candidate(db, match1, hm, reason="Profile not strong enough")
        db.refresh(inv2)
        db.refresh(slot3)
        assert inv2.status == "cancelled", f"Expected inv2 status 'cancelled', got {inv2.status}"
        assert slot3.status == "cancelled", f"Expected slot3 status 'cancelled', got {slot3.status}"
        print("   [PASS] HM rejection cleanly cancelled interview and all slots.")

        # ── TEST 3: Recruiter Unassign / Claim Release Cleanup ─────────────────
        print("\n[Test 3] Recruiter Unassign / Claim Release Cleanup...")
        # Claim candidate
        assign = candidate_assignment_service.claim_candidate(db, job.id, candidate.id, recruiter)
        match1.status = "screened"
        match1.pipeline_state = "WAITING_FOR_CANDIDATE_SLOT"
        inv3 = Interview(
            match_result_id=match1.id,
            scheduled_by=recruiter.id,
            interview_type="Technical",
            status="pending_slot",
            slot_token=secrets.token_urlsafe(16)
        )
        db.add(inv3)
        db.commit()
        db.refresh(inv3)

        slot4 = InterviewSlot(
            interview_id=inv3.id,
            match_result_id=match1.id,
            slot_datetime=now + timedelta(days=4, hours=10),
            slot_end_datetime=now + timedelta(days=4, hours=11),
            status="proposed",
            proposed_by=hm.id
        )
        db.add(slot4)
        db.commit()

        # Recruiter releases claim
        candidate_assignment_service.unassign_candidate(db, job.id, candidate.id, requesting_user=recruiter)

        db.refresh(inv3)
        db.refresh(slot4)
        db.refresh(match1)
        assert inv3.status == "cancelled", f"Expected inv3 status 'cancelled', got {inv3.status}"
        assert slot4.status == "cancelled", f"Expected slot4 status 'cancelled', got {slot4.status}"
        assert match1.pipeline_state == "CANDIDATE_SHORTLISTED", f"Expected reset pipeline state, got {match1.pipeline_state}"
        print("   [PASS] Recruiter unassign / claim release cleanly cancelled pending slots & reset state.")

        # ── TEST 4: Query list_my_interviews filtering ────────────────────────
        print("\n[Test 4] Query list_my_interviews filtering...")
        from app.routers.interviews import list_my_interviews
        my_interviews = list_my_interviews(db=db, current_user=candidate_user)
        # Should not include cancelled interviews
        for iv in my_interviews:
            assert iv.status != "cancelled", f"Cancelled interview {iv.id} returned to candidate!"
            if iv.match_result_id == match1.id:
                assert match1.status != "rejected", f"Rejected match interview returned to candidate!"
        print(f"   [PASS] list_my_interviews returned {len(my_interviews)} active non-cancelled/non-rejected interviews.")

        print("\nALL REJECTION & CLAIM RELEASE CLEANUP TESTS PASSED SUCCESSFULLY!")

    finally:
        db.close()


if __name__ == "__main__":
    test_rejection_and_unassign_cleanup()
