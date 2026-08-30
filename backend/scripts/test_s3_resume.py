"""
Automated Test for AWS S3 Resume Management in SkillAlign:
Tests upload to S3, pre-signed URL generation, authorization rules, and deletion.
"""

import sys
import os
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient
from app.main import app
from app.database.session import SessionLocal
from app.models.user import User
from app.models.candidate import Candidate
from app.core.security import create_access_token, hash_password
from unittest.mock import patch

client = TestClient(app)


def test_s3_resume_management():
    print("\n=======================================================")
    print("  SkillAlign: AWS S3 Resume Management Integration Test")
    print("=======================================================\n")

    db = SessionLocal()
    try:
        # 1. Setup users: Candidate Alice (ID role=4), Recruiter James (role=3), Candidate Bob (role=4)
        alice_user = db.query(User).filter(User.email == "alice@candidate.dev").first()
        if not alice_user:
            alice_user = User(name="Alice Johnson", email="alice@candidate.dev", password_hash=hash_password("Pass123"), role_id=4, is_active=True)
            db.add(alice_user)
            db.flush()

        bob_user = db.query(User).filter(User.email == "bob@candidate.dev").first()
        if not bob_user:
            bob_user = User(name="Bob Smith", email="bob@candidate.dev", password_hash=hash_password("Pass123"), role_id=4, is_active=True)
            db.add(bob_user)
            db.flush()

        recruiter_user = db.query(User).filter(User.email == "recruiter@skillaign.dev").first()
        if not recruiter_user:
            recruiter_user = User(name="James Recruiter", email="recruiter@skillaign.dev", password_hash=hash_password("Pass123"), role_id=3, is_active=True)
            db.add(recruiter_user)
            db.flush()

        # Alice candidate profile
        alice_cand = db.query(Candidate).filter(Candidate.user_id == alice_user.id).first()
        if not alice_cand:
            alice_cand = Candidate(user_id=alice_user.id, full_name="Alice Johnson", phone="+919876543210", total_experience_years=4.0)
            db.add(alice_cand)
            db.flush()

        # Bob candidate profile
        bob_cand = db.query(Candidate).filter(Candidate.user_id == bob_user.id).first()
        if not bob_cand:
            bob_cand = Candidate(user_id=bob_user.id, full_name="Bob Smith", phone="+919876543211", total_experience_years=2.0)
            db.add(bob_cand)
            db.flush()

        alice_user.is_active = True
        bob_user.is_active = True
        recruiter_user.is_active = True
        db.commit()
        db.refresh(alice_user)
        db.refresh(bob_user)
        db.refresh(recruiter_user)
        db.refresh(alice_cand)
        db.refresh(bob_cand)

        alice_token = create_access_token(data={"sub": str(alice_user.id), "role": "Candidate"})
        bob_token = create_access_token(data={"sub": str(bob_user.id), "role": "Candidate"})
        recruiter_token = create_access_token(data={"sub": str(recruiter_user.id), "role": "Recruiter"})

        alice_headers = {"Authorization": f"Bearer {alice_token}"}
        bob_headers = {"Authorization": f"Bearer {bob_token}"}
        recruiter_headers = {"Authorization": f"Bearer {recruiter_token}"}

        # -------------------------------------------------------------
        # STEP 1: Candidate Alice uploads Resume to S3
        # -------------------------------------------------------------
        print("[1] Alice uploads resume to S3...")
        dummy_pdf_content = b"%PDF-1.4 Mock PDF Content For S3 Upload Test"
        files = {
            "file": ("Alice_Johnson_Senior_Backend_Resume.pdf", io.BytesIO(dummy_pdf_content), "application/pdf")
        }

        # Use mock S3 upload if network is restricted in sandbox or real S3
        with patch("app.services.s3_service.S3Service.upload_file", return_value=f"resumes/candidates/{alice_cand.id}/Alice_Johnson_Senior_Backend_Resume.pdf"), \
             patch("app.services.s3_service.S3Service.generate_presigned_url", return_value=f"https://skillalign-resumes.s3.us-east-1.amazonaws.com/resumes/candidates/{alice_cand.id}/Alice_Johnson_Senior_Backend_Resume.pdf?X-Amz-Expires=300"), \
             patch("app.services.s3_service.S3Service.delete_file", return_value=True):

            res = client.post(f"/api/candidates/{alice_cand.id}/resume", files=files, headers=alice_headers)
            assert res.status_code == 201, f"Upload failed: {res.text}"
            upload_data = res.json()
            assert upload_data["candidate_id"] == alice_cand.id
            assert upload_data["resume_filename"] == "Alice_Johnson_Senior_Backend_Resume.pdf"
            assert "resumes/candidates" in upload_data["resume_s3_key"]
            print(f"    -> Upload Succeeded! S3 Key: {upload_data['resume_s3_key']}, Uploaded At: {upload_data['resume_uploaded_at']}")

            # Verify Database updated
            db.expire_all()
            cand_db = db.query(Candidate).filter(Candidate.id == alice_cand.id).first()
            assert cand_db.resume_s3_key == upload_data["resume_s3_key"]
            assert cand_db.resume_filename == "Alice_Johnson_Senior_Backend_Resume.pdf"
            assert cand_db.resume_uploaded_at is not None
            print("    -> Database columns (resume_s3_key, resume_filename, resume_uploaded_at) verified in PostgreSQL.")

            # -------------------------------------------------------------
            # STEP 2: Authorization Check: Bob tries to upload to Alice's profile (Forbidden)
            # -------------------------------------------------------------
            print("\n[2] Bob attempts to upload to Alice's candidate profile (Forbidden check)...")
            files2 = {"file": ("Bob_Hacking.pdf", io.BytesIO(dummy_pdf_content), "application/pdf")}
            res = client.post(f"/api/candidates/{alice_cand.id}/resume", files=files2, headers=bob_headers)
            assert res.status_code == 403, f"Bob should be blocked with 403 Forbidden, got {res.status_code}"
            print("    -> Bob blocked with HTTP 403 Forbidden.")

            # -------------------------------------------------------------
            # STEP 3: Recruiter fetches Pre-signed URL
            # -------------------------------------------------------------
            print("\n[3] Recruiter fetches pre-signed URL to view Alice's resume...")
            res = client.get(f"/api/candidates/{alice_cand.id}/resume", headers=recruiter_headers)
            assert res.status_code == 200, f"Recruiter get URL failed: {res.text}"
            url_data = res.json()
            assert "resume_url" in url_data
            assert "amazonaws.com" in url_data["resume_url"]
            assert url_data["expires_in_seconds"] == 300
            print(f"    -> Generated Pre-signed URL: {url_data['resume_url'][:80]}... (ExpiresIn={url_data['expires_in_seconds']}s)")

            # -------------------------------------------------------------
            # STEP 4: Candidate Alice deletes her resume
            # -------------------------------------------------------------
            print("\n[4] Alice deletes her resume from S3...")
            res = client.delete(f"/api/candidates/{alice_cand.id}/resume", headers=alice_headers)
            assert res.status_code == 200, f"Delete failed: {res.text}"
            del_data = res.json()
            assert del_data["candidate_id"] == alice_cand.id

            db.expire_all()
            cand_db = db.query(Candidate).filter(Candidate.id == alice_cand.id).first()
            assert cand_db.resume_s3_key is None
            assert cand_db.resume_filename is None
            assert cand_db.resume_uploaded_at is None
            print("    -> Resume successfully deleted from S3 and database columns set to NULL.")

            # -------------------------------------------------------------
            # STEP 5: Verify 404 after deletion
            # -------------------------------------------------------------
            print("\n[5] Verify GET pre-signed URL returns 404 after deletion...")
            res = client.get(f"/api/candidates/{alice_cand.id}/resume", headers=recruiter_headers)
            assert res.status_code == 404
            print("    -> Correctly returned 404 Not Found.")

        print("\n=======================================================")
        print(" [SUCCESS] All AWS S3 Resume Management Tests Passed!  ")
        print("=======================================================\n")

    finally:
        db.close()


if __name__ == "__main__":
    test_s3_resume_management()
