"""
Authentication & Authorization Tests
"""

import uuid
import pytest


def test_health_check(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"


def test_candidate_registration_and_login(client):
    unique_email = f"testcand_{uuid.uuid4().hex[:8]}@example.com"
    payload = {
        "name": "Test Candidate",
        "email": unique_email,
        "password": "Password@123"
    }

    # 1. Register
    reg_res = client.post("/api/auth/register", json=payload)
    assert reg_res.status_code == 201
    data = reg_res.json()
    assert data["email"] == unique_email
    assert data["role"]["name"] == "Candidate"
    assert "password_hash" not in data

    # 2. Login
    login_res = client.post("/api/auth/login", json={
        "email": unique_email,
        "password": "Password@123"
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    assert token is not None

    # 3. Get /me
    me_res = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert me_res.status_code == 200
    assert me_res.json()["email"] == unique_email


def test_login_invalid_password(client):
    res = client.post("/api/auth/login", json={
        "email": "admin@skillaign.dev",
        "password": "WrongPassword999!"
    })
    assert res.status_code == 401


def test_authorization_matrix(client, candidate_token, hr_token, recruiter_token):
    # Candidate cannot access Admin users API
    res = client.get(
        "/api/users",
        headers={"Authorization": f"Bearer {candidate_token}"}
    )
    assert res.status_code == 403

    # HR cannot create jobs
    res = client.post(
        "/api/jobs",
        json={"title": "HR Job Attempt", "skills": []},
        headers={"Authorization": f"Bearer {hr_token}"}
    )
    assert res.status_code == 403

    # Candidate cannot run matching engine
    res = client.post(
        "/api/matching/jobs/1/run",
        headers={"Authorization": f"Bearer {candidate_token}"}
    )
    assert res.status_code == 403

    # Recruiter cannot schedule interviews (HR only)
    res = client.post(
        "/api/interviews",
        json={"match_result_id": 1, "interview_date": "2026-09-01T10:00:00Z"},
        headers={"Authorization": f"Bearer {recruiter_token}"}
    )
    assert res.status_code == 403
