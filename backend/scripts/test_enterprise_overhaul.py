"""
Verification script for Enterprise UI/UX, Scalability, and Workflow Overhaul.
Tests:
1. Audit log auto-pruning to max 50 items.
2. S3 / storage provider integration with OfferPDFService.
3. Action Center endpoint with job_id filter.
"""

import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.session import SessionLocal
from app.models.audit_log import AuditLog
from app.models.offer import Offer
from app.models.candidate import Candidate
from app.models.job import Job
from app.services.audit_service import prune_audit_logs
from app.services.storage.storage_manager import get_storage
from app.services.offer_pdf_service import OfferPDFService

def test_audit_pruning():
    print("\n--- Testing Audit Log Auto-Pruning (Max 50) ---")
    db = SessionLocal()
    try:
        # Check initial count
        initial_count = db.query(AuditLog).count()
        print(f"Initial audit logs count: {initial_count}")

        # If count < 55, create a few test audit logs to test pruning
        if initial_count < 55:
            to_add = 55 - initial_count
            print(f"Adding {to_add} test audit logs to exceed 50...")
            for i in range(to_add):
                log = AuditLog(
                    action="TEST_LOG",
                    entity_type="TestEntity",
                    entity_id=i,
                    details=f"Test audit log entry {i}",
                )
                db.add(log)
            db.commit()
            print(f"Total audit logs after adding: {db.query(AuditLog).count()}")

        # Run pruning
        deleted = prune_audit_logs(db, max_keep=50)
        final_count = db.query(AuditLog).count()
        print(f"Pruning executed: deleted {deleted} records. Final count: {final_count}")
        assert final_count <= 50, f"Audit log count {final_count} exceeds 50!"
        print("[PASS] Audit log auto-pruning strictly caps records at <= 50.")
    finally:
        db.close()


def test_offer_pdf_generation_and_storage():
    print("\n--- Testing Offer PDF Generation & S3/Storage Integration ---")
    db = SessionLocal()
    try:
        offer = db.query(Offer).first()
        if not offer:
            print("No offer found in database. Creating a mock test offer...")
            job = db.query(Job).first()
            cand = db.query(Candidate).first()
            offer = Offer(
                match_result_id=1,
                job_id=job.id if job else 1,
                candidate_id=cand.id if cand else 1,
                proposed_salary=1200000,
                salary_currency="INR",
                employment_type="Full-Time",
                status="SENT",
            )
            db.add(offer)
            db.commit()
            db.refresh(offer)

        # Generate PDF bytes using OfferPDFService
        candidate = offer.candidate or db.query(Candidate).filter(Candidate.id == offer.candidate_id).first()
        job = offer.job or db.query(Job).filter(Job.id == offer.job_id).first()
        compensation = {
            "proposed_salary": offer.proposed_salary or 1500000,
            "currency": offer.salary_currency or "INR",
            "employment_type": offer.employment_type or "Full-Time Permanent",
            "joining_date": offer.joining_date.isoformat() if offer.joining_date else "2026-10-01",
            "joining_timeline": offer.joining_timeline or "30 Days",
            "offer_expiry_date": offer.offer_expiry_date.isoformat() if offer.offer_expiry_date else "2026-09-30",
            "role_scope": offer.role_scope or "Develop scalable cloud native services.",
            "location": offer.location or "Bangalore",
            "work_mode": offer.work_mode or "Hybrid",
            "additional_terms": offer.additional_terms or "Standard company medical and leave policy.",
        }

        print(f"Generating PDF for Offer #{offer.id} ({job.title if job else 'Position'})...")
        pdf_bytes = OfferPDFService.generate(offer, candidate, job, compensation)
        assert pdf_bytes is not None and len(pdf_bytes) > 1000, "Generated PDF is empty or invalid!"
        assert pdf_bytes[:4] == b"%PDF", f"PDF header invalid: {pdf_bytes[:4]}"
        print(f"Generated PDF successfully. Size: {len(pdf_bytes)} bytes. Magic header: %PDF")

        # Test storage provider (S3 or local fallback)
        storage = get_storage()
        print(f"Active Storage Provider: {storage.__class__.__name__}")
        key = f"offers/{offer.id}/offer_letter_{offer.id}.pdf"
        saved_key = storage.save_file(key, pdf_bytes, content_type="application/pdf")
        print(f"Saved file with key: {saved_key}")

        assert storage.file_exists(key), f"File {key} does not exist in storage provider!"
        retrieved_bytes = storage.get_file(key)
        print(f"[PASS] Offer PDF persisted and verified via {storage.__class__.__name__} ({len(retrieved_bytes)} bytes).")
    finally:
        db.close()


def test_action_center_job_filtering():
    print("\n--- Testing Recruiter Action Center Job Filtering ---")
    from app.routers.workflow import get_action_center
    from app.models.user import User

    db = SessionLocal()
    try:
        recruiter = db.query(User).filter(User.email == "recruiter@skillalign.dev").first()
        assert recruiter is not None, "Recruiter user not found!"

        all_items = get_action_center(job_id=None, db=db, current_user=recruiter)
        print(f"Global Action Center items for recruiter: {len(all_items)}")
        assert len(all_items) > 0, "Expected actionable items in Action Center!"

        # Test filtering by specific job
        job = db.query(Job).filter(Job.title.ilike("%Cloud%")).first()
        if job:
            job_items = get_action_center(job_id=job.id, db=db, current_user=recruiter)
            print(f"Action Center items for job '{job.title}' (ID {job.id}): {len(job_items)}")
            for item in job_items:
                assert item.job_id == job.id or item.job_title == job.title, f"Item {item.title} does not match job {job.id}!"
            print(f"[PASS] Job-specific filtering verified for '{job.title}'.")
    finally:
        db.close()


if __name__ == "__main__":
    try:
        test_audit_pruning()
        test_offer_pdf_generation_and_storage()
        test_action_center_job_filtering()
        print("\nAll enterprise backend verification tests PASSED!")
    except Exception as e:
        import traceback
        traceback.print_exc()
        sys.exit(1)
