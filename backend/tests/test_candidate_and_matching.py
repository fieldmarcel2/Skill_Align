"""
Detailed Candidate Profile and Matching Calculation Tests
"""

import io
import pytest


def test_candidate_profile_and_skills(client, candidate_token):
    headers = {"Authorization": f"Bearer {candidate_token}"}

    # 1. Fetch own candidate profile
    profile_res = client.get("/api/candidates/me", headers=headers)
    assert profile_res.status_code == 200
    candidate_data = profile_res.json()
    assert bool(candidate_data["full_name"])

    # 2. Update profile experience
    update_res = client.put(
        "/api/candidates/me",
        json={"total_experience_years": 5.0, "phone": "+1-555-0199"},
        headers=headers
    )
    assert update_res.status_code == 200
    assert update_res.json()["total_experience_years"] == 5.0

    # 3. Add a new skill
    # Fetch a skill to add that candidate doesn't already have
    skills_res = client.get("/api/skills", headers=headers)
    all_skills = skills_res.json()
    existing_skill_ids = {s["skill"]["id"] for s in candidate_data.get("skills", [])}
    skill_to_add = next(s for s in all_skills if s["id"] not in existing_skill_ids)

    add_skill_res = client.post(
        "/api/candidates/me/skills",
        json={
            "skill_id": skill_to_add["id"],
            "proficiency_level": "Expert",
            "years_experience": 4.0
        },
        headers=headers
    )
    assert add_skill_res.status_code == 201
    updated_cand = add_skill_res.json()
    assert any(s["skill"]["id"] == skill_to_add["id"] and s["proficiency_level"] == "Expert" for s in updated_cand["skills"])

    # 4. Duplicate skill rejected
    dup_res = client.post(
        "/api/candidates/me/skills",
        json={
            "skill_id": skill_to_add["id"],
            "proficiency_level": "Beginner",
            "years_experience": 1.0
        },
        headers=headers
    )
    assert dup_res.status_code == 409


def test_resume_upload_validation(client, candidate_token):
    headers = {"Authorization": f"Bearer {candidate_token}"}

    # 1. Reject invalid file extension (.exe)
    fake_exe = io.BytesIO(b"malicious content")
    res = client.post(
        "/api/candidates/me/resume",
        files={"file": ("virus.exe", fake_exe, "application/octet-stream")},
        headers=headers
    )
    assert res.status_code == 400
    assert "Invalid file type" in res.json()["detail"]

    # 2. Accept valid PDF
    pdf_content = io.BytesIO(b"%PDF-1.4 Mock PDF Resume Content for Alice Johnson")
    res = client.post(
        "/api/candidates/me/resume",
        files={"file": ("alice_resume.pdf", pdf_content, "application/pdf")},
        headers=headers
    )
    assert res.status_code == 200
    assert res.json()["resume_file_path"] is not None


def test_matching_score_accuracy(client, hr_token, recruiter_token):
    # Create a job with known exact weights to test math:
    # Skill 1 (Python) -> weight 5 (Candidate is Expert: 1.0 -> 5.0)
    # Skill 2 (FastAPI) -> weight 4 (Candidate is Intermediate: 0.7 -> 2.8)
    # Total score = (5.0 + 2.8) / (5 + 4) * 100 = 7.8 / 9 * 100 = 86.67
    skills_res = client.get("/api/skills", headers={"Authorization": f"Bearer {hr_token}"})
    skills_map = {s["name"]: s["id"] for s in skills_res.json()}

    python_id = skills_map["Python"]
    fastapi_id = skills_map["FastAPI"]

    job_res = client.post(
        "/api/jobs",
        json={
            "title": "Math Verification Job",
            "min_experience_years": 2.0,
            "status": "active",
            "skills": [
                {"skill_id": python_id, "requirement_type": "required", "weight": 5.0},
                {"skill_id": fastapi_id, "requirement_type": "required", "weight": 4.0}
            ]
        },
        headers={"Authorization": f"Bearer {recruiter_token}"}
    )
    assert job_res.status_code == 201
    job_id = job_res.json()["id"]

    # Run match
    run_res = client.post(
        f"/api/matching/jobs/{job_id}/run",
        headers={"Authorization": f"Bearer {hr_token}"}
    )
    assert run_res.status_code == 200
    results = run_res.json()["results"]

    alice_result = next((r for r in results if r["candidate"]["id"] == 1 or r["candidate"]["full_name"] in ("Alice Johnson", "Shivanshu Tripathi")), None)
    assert alice_result is not None
    # Candidate has Python (Expert -> 1.0) and FastAPI (Intermediate -> 0.7)
    # Score = 7.8 / 9 * 100 = 86.67
    assert alice_result["overall_score"] == 86.67
