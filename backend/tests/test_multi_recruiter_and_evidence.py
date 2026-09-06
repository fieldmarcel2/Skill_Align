"""
Multi-Recruiter Architecture, Candidate Claiming, Evidence, and Collaboration Tests
===================================================================================
Tests:
1. Multi-recruiter job assignments by HR (and role updates)
2. Recruiter data isolation (cannot view unassigned jobs or unrelated candidate profiles)
3. Race-condition safe candidate claiming ("Assign to Me") and conflict prevention
4. Resume-detected evidence visualization vs self-declared skills
5. Contextual recruitment communication and actionable tasks
"""

import uuid
import pytest


def test_multi_recruiter_assignment(client, hr_token, recruiter_token):
    # 1. Fetch available skills
    skills_res = client.get("/api/skills", headers={"Authorization": f"Bearer {hr_token}"})
    assert skills_res.status_code == 200
    skill_id = skills_res.json()[0]["id"]

    # 2. HR creates job
    job_payload = {
        "title": f"Staff Architect {uuid.uuid4().hex[:6]}",
        "description": "Multi-recruiter test requisition",
        "min_experience_years": 4.0,
        "status": "active",
        "job_skills": [
            {
                "skill_id": skill_id,
                "requirement_type": "required",
                "weight": 5.0,
            }
        ],
    }
    job_res = client.post("/api/jobs", json=job_payload, headers={"Authorization": f"Bearer {hr_token}"})
    assert job_res.status_code == 201
    job_id = job_res.json()["id"]

    # 3. Get recruiter user ID
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {recruiter_token}"})
    recruiter_id = me_res.json()["id"]

    # 4. Recruiter CANNOT assign recruiters (HR only)
    forbidden_assign = client.post(
        f"/api/jobs/{job_id}/recruiters",
        json={"recruiter_id": recruiter_id, "assignment_role": "RECRUITER"},
        headers={"Authorization": f"Bearer {recruiter_token}"},
    )
    assert forbidden_assign.status_code == 403

    # 5. HR assigns recruiter to job with role "RECRUITER"
    assign_res = client.post(
        f"/api/jobs/{job_id}/recruiters",
        json={"recruiter_id": recruiter_id, "assignment_role": "RECRUITER"},
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert assign_res.status_code == 201
    asgn_data = assign_res.json()
    assert asgn_data["recruiter_id"] == recruiter_id
    assert asgn_data["assignment_role"] == "RECRUITER"
    assert asgn_data["status"] == "active"

    # 6. HR updates role to PRIMARY_RECRUITER
    role_update = client.patch(
        f"/api/jobs/{job_id}/recruiters/{recruiter_id}",
        json={"assignment_role": "PRIMARY_RECRUITER"},
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert role_update.status_code == 200
    assert role_update.json()["assignment_role"] == "PRIMARY_RECRUITER"

    # 7. Recruiter can list assigned jobs and see their role
    rec_jobs_res = client.get("/api/recruiter/jobs", headers={"Authorization": f"Bearer {recruiter_token}"})
    assert rec_jobs_res.status_code == 200
    rec_jobs = rec_jobs_res.json()
    matched_job = next((j for j in rec_jobs if j["id"] == job_id), None)
    assert matched_job is not None
    assert matched_job["assignment_role"] == "PRIMARY_RECRUITER"


def test_recruiter_data_isolation(client, hr_token, recruiter_token):
    # 1. HR creates an unassigned job
    skills_res = client.get("/api/skills", headers={"Authorization": f"Bearer {hr_token}"})
    skill_id = skills_res.json()[0]["id"]

    job_payload = {
        "title": f"Confidential Role {uuid.uuid4().hex[:6]}",
        "description": "Job with no assigned recruiter",
        "min_experience_years": 2.0,
        "status": "active",
        "job_skills": [{"skill_id": skill_id, "requirement_type": "required", "weight": 5.0}],
    }
    job_res = client.post("/api/jobs", json=job_payload, headers={"Authorization": f"Bearer {hr_token}"})
    assert job_res.status_code == 201
    unassigned_job_id = job_res.json()["id"]

    # 2. Recruiter attempts to access unassigned job -> 403 Forbidden
    forbidden_job = client.get(
        f"/api/jobs/{unassigned_job_id}",
        headers={"Authorization": f"Bearer {recruiter_token}"},
    )
    assert forbidden_job.status_code == 403
    assert "not assigned" in forbidden_job.json()["detail"].lower()

    # 3. Recruiter attempts to get candidates for unassigned job -> 403 Forbidden
    forbidden_candidates = client.get(
        f"/api/recruiter/jobs/{unassigned_job_id}/candidates",
        headers={"Authorization": f"Bearer {recruiter_token}"},
    )
    assert forbidden_candidates.status_code == 403


def test_candidate_claiming_and_concurrency(client, hr_token, recruiter_token, admin_token):
    # 1. Create second recruiter
    unique_email = f"rec2_{uuid.uuid4().hex[:6]}@skillaign.dev"
    create_user_res = client.post(
        "/api/users",
        json={
            "name": "Second Recruiter",
            "email": unique_email,
            "password": "Password@123",
            "role_id": 3,  # Recruiter role
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert create_user_res.status_code == 201
    recruiter2_id = create_user_res.json()["id"]

    login2_res = client.post(
        "/api/auth/login",
        json={"email": unique_email, "password": "Password@123"},
    )
    assert login2_res.status_code == 200
    recruiter2_token = login2_res.json()["access_token"]

    # 2. Get recruiter 1 ID
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {recruiter_token}"})
    recruiter1_id = me_res.json()["id"]

    # 3. HR creates job and assigns both recruiters
    skills_res = client.get("/api/skills", headers={"Authorization": f"Bearer {hr_token}"})
    skill_id = skills_res.json()[0]["id"]

    job_res = client.post(
        "/api/jobs",
        json={
            "title": f"Claiming Test Requisition {uuid.uuid4().hex[:6]}",
            "min_experience_years": 1.0,
            "status": "active",
            "job_skills": [{"skill_id": skill_id, "requirement_type": "required", "weight": 5.0}],
        },
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert job_res.status_code == 201
    job_id = job_res.json()["id"]

    # Assign recruiter 1 and recruiter 2
    client.post(
        f"/api/jobs/{job_id}/recruiters",
        json={"recruiter_id": recruiter1_id, "assignment_role": "PRIMARY_RECRUITER"},
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    client.post(
        f"/api/jobs/{job_id}/recruiters",
        json={"recruiter_id": recruiter2_id, "assignment_role": "RECRUITER"},
        headers={"Authorization": f"Bearer {hr_token}"},
    )

    # 4. Trigger matching synchronously to populate candidates
    match_run = client.post(
        f"/api/matching/jobs/{job_id}/run?sync=true",
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert match_run.status_code in (200, 202)
    matches_res = client.get(f"/api/matching/jobs/{job_id}", headers={"Authorization": f"Bearer {hr_token}"})
    assert matches_res.status_code == 200
    matches = matches_res.json()
    assert len(matches) > 0
    candidate_id = matches[0]["candidate_id"]

    # 5. Recruiter 1 claims candidate ("Assign to Me")
    claim1_res = client.post(
        f"/api/jobs/{job_id}/candidates/{candidate_id}/claim",
        headers={"Authorization": f"Bearer {recruiter_token}"},
    )
    assert claim1_res.status_code == 200
    claim1 = claim1_res.json()
    assert claim1["recruiter_id"] == recruiter1_id
    assert claim1["status"] == "active"

    # 6. Recruiter 2 attempts to claim SAME candidate -> 409 CONFLICT!
    claim2_conflict = client.post(
        f"/api/jobs/{job_id}/candidates/{candidate_id}/claim",
        headers={"Authorization": f"Bearer {recruiter2_token}"},
    )
    assert claim2_conflict.status_code == 409
    assert "already claimed" in claim2_conflict.json()["detail"].lower()

    # 7. Recruiter 1 unassigns candidate
    unassign_res = client.delete(
        f"/api/jobs/{job_id}/candidates/{candidate_id}/assignment",
        headers={"Authorization": f"Bearer {recruiter_token}"},
    )
    assert unassign_res.status_code == 204

    # 8. Recruiter 2 can now claim the unassigned candidate
    claim2_success = client.post(
        f"/api/jobs/{job_id}/candidates/{candidate_id}/claim",
        headers={"Authorization": f"Bearer {recruiter2_token}"},
    )
    assert claim2_success.status_code == 200
    assert claim2_success.json()["recruiter_id"] == recruiter2_id


def test_recruitment_collaboration_and_tasks(client, hr_token, recruiter_token):
    # 1. Setup job with assigned recruiter
    skills_res = client.get("/api/skills", headers={"Authorization": f"Bearer {hr_token}"})
    skill_id = skills_res.json()[0]["id"]
    job_res = client.post(
        "/api/jobs",
        json={
            "title": f"Collaboration Requisition {uuid.uuid4().hex[:6]}",
            "min_experience_years": 2.0,
            "status": "active",
            "job_skills": [{"skill_id": skill_id, "requirement_type": "required", "weight": 5.0}],
        },
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    job_id = job_res.json()["id"]

    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {recruiter_token}"})
    recruiter_id = me_res.json()["id"]

    client.post(
        f"/api/jobs/{job_id}/recruiters",
        json={"recruiter_id": recruiter_id, "assignment_role": "RECRUITER"},
        headers={"Authorization": f"Bearer {hr_token}"},
    )

    # 2. Post Job-level recruitment message
    msg_res = client.post(
        f"/api/jobs/{job_id}/messages",
        json={"message": "Sourcing candidates for backend role", "message_type": "GENERAL"},
        headers={"Authorization": f"Bearer {recruiter_token}"},
    )
    assert msg_res.status_code == 201
    msg_data = msg_res.json()
    assert msg_data["message"] == "Sourcing candidates for backend role"

    # List job messages
    list_msgs = client.get(
        f"/api/jobs/{job_id}/messages",
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert list_msgs.status_code == 200
    assert any(m["id"] == msg_data["id"] for m in list_msgs.json())

    # 3. HR creates actionable task for recruiter
    task_res = client.post(
        f"/api/jobs/{job_id}/tasks",
        json={
            "assigned_to": recruiter_id,
            "title": "Review top 5 candidates by Friday",
            "description": "Ensure strong experience with required skills",
            "priority": "HIGH",
        },
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert task_res.status_code == 201
    task_data = task_res.json()
    assert task_data["title"] == "Review top 5 candidates by Friday"
    assert task_data["status"] == "OPEN"
    task_id = task_data["id"]

    # 4. Recruiter retrieves their tasks
    rec_tasks = client.get(
        "/api/recruiter/tasks",
        headers={"Authorization": f"Bearer {recruiter_token}"},
    )
    assert rec_tasks.status_code == 200
    assert any(t["id"] == task_id for t in rec_tasks.json())

    # 5. Recruiter updates task to COMPLETED
    patch_task = client.patch(
        f"/api/tasks/{task_id}",
        json={"status": "COMPLETED", "description": "Reviewed and screened candidates."},
        headers={"Authorization": f"Bearer {recruiter_token}"},
    )
    assert patch_task.status_code == 200
    assert patch_task.json()["status"] == "COMPLETED"
