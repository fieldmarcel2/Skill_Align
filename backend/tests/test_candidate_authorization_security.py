"""
Security & Authorization Audit Tests for Candidate Endpoints
=============================================================
Validates:
1. Candidate A cannot access, view, upload, or delete Candidate B's resume (IDOR/BOLA prevention).
2. Candidate A cannot view Candidate B's private candidate profile or interview details.
3. Candidate endpoints (/api/candidates/me, /api/candidates/me/skills, etc.) strictly derive identity from JWT get_current_user().
4. Unauthenticated requests return 401 Unauthorized.
5. Role-based privilege escalation returns 403 Forbidden.
6. Sensitive fields (e.g. password_hash) are never leaked.
"""

import pytest
import uuid
import random
from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def candidate_a(client: TestClient):
    """Register and login candidate A."""
    uid = uuid.uuid4().hex[:8]
    email = f"cand_a_{uid}@example.com"
    pwd = "Password123!"
    phone = f"+9198{random.randint(10000000, 99999999)}"
    reg = client.post("/api/auth/register", json={
        "name": f"Candidate A {uid}",
        "email": email,
        "password": pwd,
        "phone": phone,
    })
    assert reg.status_code == 201
    user_data = reg.json()

    login = client.post("/api/auth/login", json={"email": email, "password": pwd})
    assert login.status_code == 200
    token = login.json()["access_token"]

    # Create candidate profile
    prof = client.post(
        "/api/candidates/me",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "full_name": f"Candidate A {uid}",
            "phone": phone,
            "total_experience_years": 3.0,
        }
    )
    assert prof.status_code in (201, 200)
    cand_profile = prof.json()

    return {
        "user_id": user_data["id"],
        "candidate_id": cand_profile["id"],
        "full_name": cand_profile["full_name"],
        "token": token,
        "email": email,
    }


@pytest.fixture(scope="module")
def candidate_b(client: TestClient):
    """Register and login candidate B."""
    uid = uuid.uuid4().hex[:8]
    email = f"cand_b_{uid}@example.com"
    pwd = "Password123!"
    phone = f"+9198{random.randint(10000000, 99999999)}"
    reg = client.post("/api/auth/register", json={
        "name": f"Candidate B {uid}",
        "email": email,
        "password": pwd,
        "phone": phone,
    })
    assert reg.status_code == 201
    user_data = reg.json()

    login = client.post("/api/auth/login", json={"email": email, "password": pwd})
    assert login.status_code == 200
    token = login.json()["access_token"]

    # Create candidate profile
    prof = client.post(
        "/api/candidates/me",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "full_name": f"Candidate B {uid}",
            "phone": phone,
            "total_experience_years": 5.0,
        }
    )
    assert prof.status_code in (201, 200)
    cand_profile = prof.json()

    return {
        "user_id": user_data["id"],
        "candidate_id": cand_profile["id"],
        "full_name": cand_profile["full_name"],
        "token": token,
        "email": email,
    }


def test_unauthenticated_request_returns_401(client: TestClient):
    """Unauthenticated access to protected candidate routes must return 401."""
    res = client.get("/api/candidates/me")
    assert res.status_code == 401
    assert "detail" in res.json()


def test_candidate_a_owns_its_own_profile_via_jwt(client: TestClient, candidate_a, candidate_b):
    """GET /api/candidates/me must only return the identity from JWT."""
    res_a = client.get("/api/candidates/me", headers={"Authorization": f"Bearer {candidate_a['token']}"})
    assert res_a.status_code == 200
    assert res_a.json()["id"] == candidate_a["candidate_id"]
    assert res_a.json()["full_name"] == candidate_a["full_name"]

    res_b = client.get("/api/candidates/me", headers={"Authorization": f"Bearer {candidate_b['token']}"})
    assert res_b.status_code == 200
    assert res_b.json()["id"] == candidate_b["candidate_id"]
    assert res_b.json()["full_name"] == candidate_b["full_name"]
    assert res_a.json()["id"] != res_b.json()["id"]


def test_candidate_a_cannot_view_candidate_b_profile_by_id(client: TestClient, candidate_a, candidate_b):
    """GET /api/candidates/{id} is restricted to HR/Recruiter/Admin; Candidate A gets 403."""
    res = client.get(
        f"/api/candidates/{candidate_b['candidate_id']}",
        headers={"Authorization": f"Bearer {candidate_a['token']}"},
    )
    assert res.status_code == 403
    assert "Access restricted" in res.json()["detail"] or "Forbidden" in res.json()["detail"]


def test_candidate_a_cannot_view_candidate_b_resume(client: TestClient, candidate_a, candidate_b):
    """Candidate A cannot generate presigned URL for Candidate B's resume."""
    res = client.get(
        f"/api/candidates/{candidate_b['candidate_id']}/resume",
        headers={"Authorization": f"Bearer {candidate_a['token']}"},
    )
    # If no resume uploaded, either 403 (forbidden) or 404 is returned, but never Candidate B's data
    assert res.status_code in (403, 404)


def test_candidate_a_cannot_delete_candidate_b_resume(client: TestClient, candidate_a, candidate_b):
    """Candidate A cannot delete Candidate B's resume."""
    res = client.delete(
        f"/api/candidates/{candidate_b['candidate_id']}/resume",
        headers={"Authorization": f"Bearer {candidate_a['token']}"},
    )
    assert res.status_code == 403
    assert "Forbidden" in res.json()["detail"]


def test_candidate_a_cannot_upload_to_candidate_b_profile(client: TestClient, candidate_a, candidate_b):
    """Candidate A cannot upload a resume file to Candidate B's candidate_id."""
    fake_pdf = b"%PDF-1.4 dummy pdf content for testing authorization"
    res = client.post(
        f"/api/candidates/{candidate_b['candidate_id']}/resume",
        headers={"Authorization": f"Bearer {candidate_a['token']}"},
        files={"file": ("fake_resume.pdf", fake_pdf, "application/pdf")},
    )
    assert res.status_code == 403
    assert "Forbidden" in res.json()["detail"]


def test_candidate_cannot_access_admin_or_recruiter_endpoints(client: TestClient, candidate_a):
    """Candidate cannot access Admin or Recruiter routes (Role guards enforce 403)."""
    # 1. Admin Users list
    res_admin = client.get(
        "/api/admin/users",
        headers={"Authorization": f"Bearer {candidate_a['token']}"},
    )
    assert res_admin.status_code == 403

    # 2. Recruiter Job creation
    res_job = client.post(
        "/api/jobs",
        headers={"Authorization": f"Bearer {candidate_a['token']}"},
        json={
            "title": "Unauthorized Job Post",
            "min_experience_years": 2,
            "status": "active",
            "skills": []
        }
    )
    assert res_job.status_code == 403


def test_no_sensitive_fields_in_auth_or_candidate_responses(client: TestClient, candidate_a):
    """Verify that password_hash, salts, or internal hashes are never exposed."""
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {candidate_a['token']}"})
    assert me_res.status_code == 200
    assert "password_hash" not in me_res.json()
    assert "password" not in me_res.json()

    cand_res = client.get("/api/candidates/me", headers={"Authorization": f"Bearer {candidate_a['token']}"})
    assert cand_res.status_code == 200
    assert "password_hash" not in cand_res.json()
