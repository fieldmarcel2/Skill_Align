"""
Core API Tests: Skills, Jobs, Candidates, and Matching Engine
"""

import uuid
import pytest


def test_skills_crud(client, admin_token, candidate_token):
    skill_name = f"GraphQL_{uuid.uuid4().hex[:6]}"
    
    # 1. Admin creates skill
    res = client.post(
        "/api/skills",
        json={"name": skill_name, "category": "Backend"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 201
    skill_id = res.json()["id"]

    # 2. Candidate can list/read skills
    res = client.get(
        "/api/skills",
        headers={"Authorization": f"Bearer {candidate_token}"}
    )
    assert res.status_code == 200
    skills = res.json()
    assert any(s["id"] == skill_id for s in skills)

    # 3. Candidate cannot create skill
    res = client.post(
        "/api/skills",
        json={"name": "ForbiddenSkill", "category": "Backend"},
        headers={"Authorization": f"Bearer {candidate_token}"}
    )
    assert res.status_code == 403


def test_hr_job_lifecycle(client, hr_token, recruiter_token):
    # Fetch existing skill
    skills_res = client.get("/api/skills", headers={"Authorization": f"Bearer {hr_token}"})
    skill_id = skills_res.json()[0]["id"]

    # 1. HR creates job with skills & weights
    job_payload = {
        "title": "Cloud Architect",
        "description": "Designing cloud solutions",
        "department": "Infrastructure",
        "client_name": "Acme Corp",
        "min_experience_years": 3.0,
        "status": "active",
        "skills": [
            {
                "skill_id": skill_id,
                "requirement_type": "required",
                "weight": 5.0
            }
        ]
    }
    create_res = client.post(
        "/api/jobs",
        json=job_payload,
        headers={"Authorization": f"Bearer {hr_token}"}
    )
    assert create_res.status_code == 201
    job_data = create_res.json()
    assert job_data["title"] == "Cloud Architect"
    assert len(job_data["job_skills"]) == 1
    assert job_data["job_skills"][0]["weight"] == 5.0

    # 2. Recruiter attempts to create job -> 403 Forbidden
    recruiter_attempt = client.post(
        "/api/jobs",
        json=job_payload,
        headers={"Authorization": f"Bearer {recruiter_token}"}
    )
    assert recruiter_attempt.status_code == 403


def test_matching_engine_and_shortlist(client, hr_token, recruiter_token):
    # Fetch active jobs
    jobs_res = client.get("/api/jobs", headers={"Authorization": f"Bearer {hr_token}"})
    assert jobs_res.status_code == 200
    jobs = jobs_res.json()
    assert len(jobs) > 0
    test_job_id = jobs[0]["id"]

    # 1. HR runs match synchronously
    match_res = client.post(
        f"/api/matching/jobs/{test_job_id}/run?sync=true",
        headers={"Authorization": f"Bearer {hr_token}"}
    )
    assert match_res.status_code in (200, 202)

    # Fetch matches
    matches_res = client.get(
        f"/api/matching/jobs/{test_job_id}",
        headers={"Authorization": f"Bearer {hr_token}"}
    )
    assert matches_res.status_code == 200
    matches = matches_res.json()
    assert len(matches) > 0

    first_result = matches[0]
    match_id = first_result["id"]
    assert 0 <= first_result["overall_score"] <= 100

    # 2. HR shortlists candidate
    shortlist_res = client.patch(
        f"/api/matching/{match_id}/status",
        json={"status": "shortlisted"},
        headers={"Authorization": f"Bearer {hr_token}"}
    )
    assert shortlist_res.status_code == 200
    assert shortlist_res.json()["status"] == "shortlisted"

    # 3. Recruiter views shortlisted candidates
    sl_list_res = client.get(
        "/api/matching/shortlists",
        headers={"Authorization": f"Bearer {recruiter_token}"}
    )
    assert sl_list_res.status_code == 200
    sl_candidates = sl_list_res.json()
    assert any(c["id"] == match_id for c in sl_candidates)


def test_admin_user_management(client, admin_token):
    # 1. Admin lists all users (including phone-only and email-only users)
    users_res = client.get(
        "/api/users",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert users_res.status_code == 200
    users = users_res.json()
    assert len(users) > 0

    # 2. Admin gets dashboard stats
    stats_res = client.get(
        "/api/users/stats",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert "total_users" in stats
    assert "active_users" in stats

