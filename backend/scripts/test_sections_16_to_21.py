"""
End-to-End Verification Test for Sections 16, 17, 18, 19, 20, 21
================================================================
"""

import os
import sys
import io
import json
from datetime import datetime, timezone, timedelta

# Set console output encoding to utf-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database.session import SessionLocal
from app.models.user import User
from app.models.candidate import Candidate
from app.models.job import Job
from app.models.match_result import MatchResult
from app.models.interview import Interview
from app.models.interview_slot import InterviewSlot
from app.models.interview_feedback import InterviewFeedback
from app.models.offer import Offer
from app.models.recruitment_task import RecruitmentTask
from app.models.audit_log import AuditLog
from app.models.candidate_blacklist import CandidateBlacklist
from app.services import workflow_service, matching_service
from app.schemas.workflow import (
    CreateOfferRequest,
    UpdateOfferRequest,
    HMFeedbackRequest,
    CompleteInterviewRequest,
)
from app.core.security import hash_password
from fastapi import HTTPException


def run_tests():
    db = SessionLocal()
    print("=" * 70)
    print("STARTING E2E VERIFICATION FOR SECTIONS 16 - 21")
    print("=" * 70)

    try:
        # 1. Setup / Find Recruiter & HM
        recruiter = db.query(User).filter(User.email == "recruiter.sec16@skillalign.dev").first()
        if not recruiter:
            recruiter = User(
                name="Siddharth Recruiter",
                email="recruiter.sec16@skillalign.dev",
                password_hash=hash_password("Pass@123"),
                role_id=3,
                is_active=True,
            )
            db.add(recruiter)
            db.flush()

        hm = db.query(User).filter(User.email == "hm.sec16@skillalign.dev").first()
        if not hm:
            hm = User(
                name="Priya HiringManager",
                email="hm.sec16@skillalign.dev",
                password_hash=hash_password("Pass@123"),
                role_id=2,
                is_active=True,
            )
            db.add(hm)
            db.flush()

        print(f"✓ Found/Created Recruiter: {recruiter.name} (ID: {recruiter.id})")
        print(f"✓ Found/Created Hiring Manager: {hm.name} (ID: {hm.id})")

        # 2. Setup Test Candidates
        cand1_user = db.query(User).filter(User.email == "aarav.test@candidate.dev").first()
        if not cand1_user:
            cand1_user = User(
                name="Aarav Mehta",
                email="aarav.test@candidate.dev",
                password_hash=hash_password("Pass@123"),
                role_id=4,
                is_active=True,
            )
            db.add(cand1_user)
            db.flush()

        cand1 = db.query(Candidate).filter(Candidate.user_id == cand1_user.id).first()
        if not cand1:
            cand1 = Candidate(
                user_id=cand1_user.id,
                full_name="Aarav Mehta",
                phone="+919876543211",
                total_experience_years=3.0,
                city="Bangalore",
            )
            db.add(cand1)
            db.flush()

        cand2_user = db.query(User).filter(User.email == "vikram.reject@candidate.dev").first()
        if not cand2_user:
            cand2_user = User(
                name="Vikram Sen",
                email="vikram.reject@candidate.dev",
                password_hash=hash_password("Pass@123"),
                role_id=4,
                is_active=True,
            )
            db.add(cand2_user)
            db.flush()

        cand2 = db.query(Candidate).filter(Candidate.user_id == cand2_user.id).first()
        if not cand2:
            cand2 = Candidate(
                user_id=cand2_user.id,
                full_name="Vikram Sen",
                phone="+919876543212",
                total_experience_years=4.0,
                city="Hyderabad",
            )
            db.add(cand2)
            db.flush()

        # 3. Setup Test Job
        job = db.query(Job).filter(Job.title == "Junior Python Developer (Sections 16-21 Test)").first()
        if not job:
            job = Job(
                title="Junior Python Developer (Sections 16-21 Test)",
                description="Python, FastAPI, Postgres, cloud deployment.",
                department="Engineering",
                min_experience_years=2.0,
                status="active",
                created_by=hm.id,
            )
            db.add(job)
            db.flush()

        # 4. Setup MatchResult for Candidate 1
        mr1 = db.query(MatchResult).filter(
            MatchResult.job_id == job.id,
            MatchResult.candidate_id == cand1.id
        ).first()
        if not mr1:
            mr1 = MatchResult(
                job_id=job.id,
                candidate_id=cand1.id,
                recruiter_id=recruiter.id,
                hiring_manager_id=hm.id,
                overall_score=91.0,
                status="screened",
                pipeline_state="INTERVIEW_CONFIRMED",
            )
            db.add(mr1)
            db.flush()
        else:
            mr1.pipeline_state = "INTERVIEW_CONFIRMED"
            mr1.status = "screened"
            mr1.recruiter_id = recruiter.id
            mr1.hiring_manager_id = hm.id
            db.flush()

        # Clean prior interview / offer data for mr1
        db.query(Offer).filter(Offer.match_result_id == mr1.id).delete()
        for itw in db.query(Interview).filter(Interview.match_result_id == mr1.id).all():
            db.query(InterviewFeedback).filter(InterviewFeedback.interview_id == itw.id).delete()
            db.query(InterviewSlot).filter(InterviewSlot.interview_id == itw.id).delete()
            db.delete(itw)
        db.query(RecruitmentTask).filter(RecruitmentTask.match_result_id == mr1.id).delete()
        db.query(AuditLog).filter(AuditLog.match_result_id == mr1.id).delete()
        db.commit()

        # Create scheduled interview for mr1
        interview1 = Interview(
            match_result_id=mr1.id,
            scheduled_by=recruiter.id,
            interview_date=datetime.now(timezone.utc) - timedelta(hours=1),
            interview_type="Technical Round 1",
            interview_mode="video",
            meeting_link="https://meet.google.com/sec16-test",
            status="scheduled",
        )
        db.add(interview1)
        db.commit()
        db.refresh(interview1)
        print(f"\n[Setup] Created Test Application 1 (MatchResult ID: {mr1.id}, Interview ID: {interview1.id})")

        # ---------------------------------------------------------------------
        # 1. STRUCTURED COMPETENCY RATINGS & INTERVIEW COMPLETION
        # ---------------------------------------------------------------------
        print("\n--- TEST 1: Recruiter/Interviewer Competency Ratings ---")
        eval_data = CompleteInterviewRequest(
            technical_rating=5,
            communication_rating=4,
            problem_solving_rating=5,
            role_fit_rating=4,
            overall_rating=5,
            comments="Outstanding algorithm design and system breakdown. Clear articulation.",
        )
        mr1 = workflow_service.complete_interview(
            db, mr1, recruiter, interview1,
            technical_rating=5,
            communication_rating=4,
            problem_solving_rating=5,
            role_fit_rating=4,
            overall_rating=5,
            comments="Outstanding algorithm design and system breakdown. Clear articulation.",
        )

        assert interview1.status == "completed", f"Expected completed, got {interview1.status}"
        assert interview1.interviewer_technical_rating == 5
        assert interview1.interviewer_communication_rating == 4
        assert interview1.interviewer_problem_solving_rating == 5
        assert interview1.interviewer_role_fit_rating == 4
        assert interview1.interviewer_overall_rating == 5
        assert "Outstanding algorithm design" in interview1.interviewer_comments
        assert interview1.interviewer_id == recruiter.id
        assert interview1.interviewer_submitted_at is not None
        assert mr1.pipeline_state == "WAITING_FOR_HM_FEEDBACK"
        print("✓ Interview marked completed with 5 structured ratings & qualitative comments saved.")
        print(f"✓ Pipeline state advanced to '{mr1.pipeline_state}'")

        # Verify task created for HM
        hm_task = (
            db.query(RecruitmentTask)
            .filter(
                RecruitmentTask.match_result_id == mr1.id,
                RecruitmentTask.action_type == "FEEDBACK_REQUIRED",
            )
            .first()
        )
        assert hm_task is not None, "HM feedback task must be created"
        print(f"✓ HM task created: '{hm_task.title}' assigned to HM ID {hm_task.assigned_to}")

        # ---------------------------------------------------------------------
        # 2. SECTION 16 & 17: NO-GO WORKFLOW TEST
        # ---------------------------------------------------------------------
        print("\n--- TEST 2: Section 16 & 17: HM NO-GO Decision ---")
        # Setup MatchResult 2 for Candidate 2
        mr2 = db.query(MatchResult).filter(
            MatchResult.job_id == job.id,
            MatchResult.candidate_id == cand2.id
        ).first()
        if not mr2:
            mr2 = MatchResult(
                job_id=job.id,
                candidate_id=cand2.id,
                recruiter_id=recruiter.id,
                hiring_manager_id=hm.id,
                overall_score=78.0,
                status="screened",
                pipeline_state="WAITING_FOR_HM_FEEDBACK",
            )
            db.add(mr2)
            db.flush()
        else:
            mr2.pipeline_state = "WAITING_FOR_HM_FEEDBACK"
            mr2.status = "screened"
            mr2.recruiter_id = recruiter.id
            mr2.hiring_manager_id = hm.id
            db.flush()

        # Clean prior interview / offer data for mr2
        db.query(Offer).filter(Offer.match_result_id == mr2.id).delete()
        for itw in db.query(Interview).filter(Interview.match_result_id == mr2.id).all():
            db.query(InterviewFeedback).filter(InterviewFeedback.interview_id == itw.id).delete()
            db.query(InterviewSlot).filter(InterviewSlot.interview_id == itw.id).delete()
            db.delete(itw)
        db.query(CandidateBlacklist).filter(CandidateBlacklist.candidate_id == cand2.id).delete()
        db.commit()

        interview2 = Interview(
            match_result_id=mr2.id,
            scheduled_by=recruiter.id,
            interview_date=datetime.now(timezone.utc) - timedelta(hours=2),
            interview_type="Culture & System Design",
            status="completed",
            interviewer_overall_rating=3,
        )
        db.add(interview2)
        db.commit()
        db.refresh(interview2)

        nogo_feedback = HMFeedbackRequest(
            go_no_go="NO_GO",
            technical_rating=2,
            communication_rating=2,
            problem_solving_rating=3,
            role_fit_rating=2,
            overall_rating=2,
            comments="Insufficient depth in distributed systems. Not ready for senior band.",
        )
        mr2, fb_nogo = workflow_service.submit_hm_feedback(
            db, mr2, hm, interview2,
            go_no_go="NO_GO",
            technical_rating=2,
            communication_rating=2,
            problem_solving_rating=3,
            role_fit_rating=2,
            overall_rating=2,
            comments="Insufficient depth in distributed systems. Not ready for senior band.",
        )

        assert mr2.status == "rejected", f"Expected rejected, got {mr2.status}"
        assert mr2.pipeline_state == "REJECTED", f"Expected REJECTED, got {mr2.pipeline_state}"
        assert mr2.hm_rejection_reason == "Insufficient depth in distributed systems. Not ready for senior band."
        print("✓ HM submitted NO-GO: Candidate status → 'rejected', pipeline → 'REJECTED'")

        # Verify audit log details
        audit_nogo = (
            db.query(AuditLog)
            .filter(
                AuditLog.match_result_id == mr2.id,
                AuditLog.action == "HM_FEEDBACK_NO_GO",
            )
            .first()
        )
        assert audit_nogo is not None, "NO-GO audit log must exist"
        log_details = json.loads(audit_nogo.details or "{}")
        assert log_details.get("decision_maker") == hm.name
        assert log_details.get("decision_reason") == nogo_feedback.comments
        assert "interview_details" in log_details
        print("✓ Audit log verified: Recorded decision maker, timestamp, reason, and interview details.")

        # ---------------------------------------------------------------------
        # 3. SECTION 16 & 17: GO WORKFLOW TEST
        # ---------------------------------------------------------------------
        print("\n--- TEST 3: Section 16 & 17: HM GO Decision ---")
        go_feedback = HMFeedbackRequest(
            go_no_go="GO",
            technical_rating=5,
            communication_rating=5,
            problem_solving_rating=5,
            role_fit_rating=4,
            overall_rating=5,
            comments="Exceptional problem-solving depth and culture fit. Highly recommended.",
        )
        mr1, fb_go = workflow_service.submit_hm_feedback(
            db, mr1, hm, interview1,
            go_no_go="GO",
            technical_rating=5,
            communication_rating=5,
            problem_solving_rating=5,
            role_fit_rating=4,
            overall_rating=5,
            comments="Exceptional problem-solving depth and culture fit. Highly recommended.",
        )

        assert mr1.pipeline_state == "COMPENSATION_DISCUSSION", f"Expected COMPENSATION_DISCUSSION, got {mr1.pipeline_state}"
        print(f"✓ HM submitted GO: Pipeline advanced to '{mr1.pipeline_state}'")

        # Verify recruiter action item generated
        recruiter_task = (
            db.query(RecruitmentTask)
            .filter(
                RecruitmentTask.match_result_id == mr1.id,
                RecruitmentTask.action_type == "CREATE_OFFER",
            )
            .first()
        )
        assert recruiter_task is not None, "Recruiter CREATE_OFFER task must be created"
        assert recruiter_task.assigned_to == recruiter.id
        print(f"✓ Recruiter received action item: '{recruiter_task.title}' (Priority: {recruiter_task.priority})")

        # ---------------------------------------------------------------------
        # 4. SECTION 18 & 19: PHASE 2 COMPENSATION & OFFER MANAGEMENT
        # ---------------------------------------------------------------------
        print("\n--- TEST 4: Section 18 & 19: Phase 2 Compensation & Offer Management ---")
        create_offer_data = CreateOfferRequest(
            salary_min=600000.0,
            salary_max=800000.0,
            proposed_salary=720000.0,
            salary_currency="INR",
            role_scope="Core engineering delivery, architecture implementation, and team mentoring.",
            employment_type="Full-time",
            joining_timeline="15 - 30 Days",
            joining_date=datetime.now(timezone.utc) + timedelta(days=22),
            offer_expiry_date=datetime.now(timezone.utc) + timedelta(days=7),
            location="Bangalore",
            work_mode="Hybrid",
            additional_terms="Standard probation period of 3 months applies. Comprehensive health coverage included.",
        )
        mr1, offer1 = workflow_service.create_offer(
            db, mr1, recruiter,
            proposed_salary=720000.0,
            salary_min=600000.0,
            salary_max=800000.0,
            salary_currency="INR",
            role_scope="Core engineering delivery, architecture implementation, and team mentoring.",
            employment_type="Full-time",
            joining_timeline="15 - 30 Days",
            joining_date=datetime.now(timezone.utc) + timedelta(days=22),
            offer_expiry_date=datetime.now(timezone.utc) + timedelta(days=7),
            location="Bangalore",
            work_mode="Hybrid",
            additional_terms="Standard probation period of 3 months applies. Comprehensive health coverage included.",
        )

        assert offer1.status == "DRAFT"
        assert offer1.proposed_salary == 720000.0
        assert offer1.salary_min == 600000.0
        assert offer1.salary_max == 800000.0
        assert offer1.salary_currency == "INR"
        assert offer1.role_scope == create_offer_data.role_scope
        assert offer1.joining_timeline == "15 - 30 Days"
        assert mr1.pipeline_state == "OFFER_CREATED"
        print("✓ Section 18: Offer drafted with Salary Band (₹6,00,000 - ₹8,00,000), Proposed (₹7,20,000), Scope, Timeline.")

        # Recruiter sends offer (Section 19)
        mr1, offer1, token1 = workflow_service.send_offer(
            db, mr1, offer1, recruiter
        )
        assert offer1.status == "SENT"
        assert offer1.offer_token is not None
        assert mr1.pipeline_state == "OFFER_SENT"
        print(f"✓ Section 19: Offer sent to candidate. Token: {token1[:8]}... Status: {offer1.status}")

        # ---------------------------------------------------------------------
        # 5. SECTION 20: CANDIDATE OFFER ACCEPTANCE
        # ---------------------------------------------------------------------
        print("\n--- TEST 5: Section 20: Candidate Offer Acceptance ---")
        mr1_accepted, offer1_accepted = workflow_service.candidate_respond_to_offer(
            db, offer1, token=token1, accept=True, note="Delighted to accept and join the team!"
        )
        assert offer1_accepted.status == "ACCEPTED"
        assert mr1_accepted.pipeline_state == "HIRED"
        assert mr1_accepted.status == "hired"
        print("✓ Candidate accepted offer: Pipeline → 'HIRED', Status → 'hired', Offer → 'ACCEPTED'")

        # ---------------------------------------------------------------------
        # 6. SECTION 21: OFFER REJECTION + 6-MONTH BLACKLIST
        # ---------------------------------------------------------------------
        print("\n--- TEST 6: Section 21: Offer Rejection & 6-Month Blacklist ---")
        # Reset mr2 to COMPENSATION_DISCUSSION to test candidate offer rejection
        mr2.pipeline_state = "COMPENSATION_DISCUSSION"
        mr2.status = "screened"
        db.commit()

        mr2, offer2 = workflow_service.create_offer(
            db, mr2, recruiter,
            proposed_salary=720000.0,
            salary_min=600000.0,
            salary_max=800000.0,
            salary_currency="INR",
            role_scope="Core engineering delivery, architecture implementation, and team mentoring.",
            employment_type="Full-time",
            joining_timeline="15 - 30 Days",
            joining_date=datetime.now(timezone.utc) + timedelta(days=22),
            offer_expiry_date=datetime.now(timezone.utc) + timedelta(days=7),
            location="Bangalore",
            work_mode="Hybrid",
            additional_terms="Standard probation period of 3 months applies. Comprehensive health coverage included.",
        )
        mr2, offer2, token2 = workflow_service.send_offer(
            db, mr2, offer2, recruiter
        )

        # Candidate 2 rejects offer
        now_utc = datetime.now(timezone.utc)
        mr2, offer2 = workflow_service.candidate_respond_to_offer(
            db, offer2, token=token2, accept=False, note="Accepted competing offer elsewhere."
        )

        assert offer2.status == "REJECTED"
        assert mr2.pipeline_state == "BLACKLISTED"
        assert mr2.status == "rejected"
        print("✓ Offer rejected: Pipeline → 'BLACKLISTED', Offer → 'REJECTED'")

        # Verify 6-month blacklist record
        blacklist = (
            db.query(CandidateBlacklist)
            .filter(
                CandidateBlacklist.candidate_id == cand2.id,
                CandidateBlacklist.is_active == True,
            )
            .order_by(CandidateBlacklist.blacklisted_at.desc())
            .first()
        )
        assert blacklist is not None, "CandidateBlacklist record must exist"
        diff_days = (blacklist.blacklisted_until - now_utc).days
        assert 175 <= diff_days <= 185, f"Expected approx 183 days cooldown, got {diff_days}"
        print(f"✓ 6-Month Blacklist created: From {blacklist.blacklisted_at.strftime('%d %b %Y')} until {blacklist.blacklisted_until.strftime('%d %b %Y')} ({diff_days} days)")

        # Verify candidate does NOT appear in interview recommendations
        screened_matches = matching_service.get_screened_matches(db, job.id)
        matching_cand_ids = [m.candidate_id for m in screened_matches]
        assert cand2.id not in matching_cand_ids, "Blacklisted candidate must NOT appear in interview recommendations"
        print("✓ Section 21 Rule 1 Verified: Blacklisted candidate excluded from interview recommendations.")

        # Verify candidate is blocked from interview scheduling
        print("✓ Section 21 Rule 2: Attempting to schedule interview for blacklisted candidate...")
        try:
            workflow_service.request_interview(
                db,
                mr2,
                hm,
                slots=[
                    {
                        "slot_datetime": datetime.now(timezone.utc) + timedelta(days=2),
                        "slot_end_datetime": datetime.now(timezone.utc) + timedelta(days=2, hours=1),
                    },
                    {
                        "slot_datetime": datetime.now(timezone.utc) + timedelta(days=3),
                        "slot_end_datetime": datetime.now(timezone.utc) + timedelta(days=3, hours=1),
                    },
                ],
                interview_type="Tech Round",
            )
            assert False, "Should have raised HTTPException 400"
        except HTTPException as exc:
            assert exc.status_code == 400
            assert "Candidate unavailable for interview consideration until" in exc.detail
            print(f"✓ Section 21 Rule 2 Verified: Interview scheduling correctly blocked with: '{exc.detail}'")

        # Verify candidate profile still exists and is not permanently deleted
        cand_in_db = db.query(Candidate).filter(Candidate.id == cand2.id).first()
        assert cand_in_db is not None, "Candidate must NOT be permanently deleted"
        print(f"✓ Section 21 Rule 3 Verified: Candidate {cand_in_db.full_name} still exists in database.")

        print("\n" + "=" * 70)
        print("ALL TESTS FOR SECTIONS 16 - 21 PASSED SUCCESSFULLY! 🎯")
        print("=" * 70)

    finally:
        db.close()


if __name__ == "__main__":
    run_tests()
