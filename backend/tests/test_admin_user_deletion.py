"""
Test Suite: Admin User Deletion & Recruiter Cascade Deletion
Validates:
1. Admin cannot delete self.
2. Admin cannot delete another Admin.
3. Non-admin (recruiter, candidate) cannot delete users.
4. Admin can permanently delete a recruiter who has jobs, assignments, tasks, messages,
   match results, and audit logs, with zero constraint violations.
"""

import pytest
import uuid
from app.models.user import User
from app.models.job import Job
from app.models.job_skill import JobSkill
from app.models.skill import Skill
from app.models.candidate import Candidate
from app.models.match_result import MatchResult
from app.models.job_recruiter_assignment import JobRecruiterAssignment
from app.models.candidate_recruiter_assignment import CandidateRecruiterAssignment
from app.models.recruitment_task import RecruitmentTask
from app.models.recruitment_message import RecruitmentMessage
from app.models.audit_log import AuditLog
from app.core.security import hash_password
from app.database.session import SessionLocal


@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_admin_cannot_delete_self(client, admin_token, db_session):
    admin = db_session.query(User).join(User.role).filter(User.role.has(name="Admin")).first()
    assert admin is not None
    res = client.delete(
        f"/api/admin/users/{admin.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 403
    assert "cannot delete your own admin account" in res.json()["detail"].lower()


def test_admin_cannot_delete_other_admin(client, admin_token, db_session):
    admin_role = db_session.query(User).join(User.role).filter(User.role.has(name="Admin")).first().role
    other_admin = User(
        name="Other Admin",
        email=f"admin_{uuid.uuid4().hex[:6]}@example.com",
        password_hash=hash_password("AdminPass123!"),
        role_id=admin_role.id,
        is_active=True,
    )
    db_session.add(other_admin)
    db_session.commit()
    db_session.refresh(other_admin)

    res = client.delete(
        f"/api/admin/users/{other_admin.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 403
    assert "administrator accounts cannot be deleted" in res.json()["detail"].lower()

    # Cleanup manually
    db_session.delete(other_admin)
    db_session.commit()


def test_recruiter_cannot_delete_users(client, recruiter_token, db_session):
    res = client.delete(
        "/api/admin/users/9999",
        headers={"Authorization": f"Bearer {recruiter_token}"},
    )
    assert res.status_code == 403


def test_admin_recruiter_remove_cascades_cleanly(client, admin_token, db_session):
    from app.models.role import Role

    recruiter_role = db_session.query(Role).filter(Role.name == "Recruiter").first()
    candidate_role = db_session.query(Role).filter(Role.name == "Candidate").first()
    admin_user = db_session.query(User).join(User.role).filter(User.role.has(name="Admin")).first()

    # 1. Create a Recruiter to be removed
    recruiter = User(
        name=f"Recruiter To Remove {uuid.uuid4().hex[:4]}",
        email=f"recruiter_{uuid.uuid4().hex[:6]}@example.com",
        password_hash=hash_password("Recruiter123!"),
        role_id=recruiter_role.id,
        is_active=True,
    )
    db_session.add(recruiter)
    db_session.commit()
    db_session.refresh(recruiter)
    recruiter_id = recruiter.id

    # 2. Create Candidate for assignments
    cand_user = User(
        name="Candidate For Delete Test",
        email=f"cand_del_{uuid.uuid4().hex[:6]}@example.com",
        password_hash=hash_password("Candidate123!"),
        role_id=candidate_role.id,
        is_active=True,
    )
    db_session.add(cand_user)
    db_session.commit()
    db_session.refresh(cand_user)

    candidate = Candidate(
        user_id=cand_user.id,
        full_name="Candidate For Delete Test",
        total_experience_years=3.0,
    )
    db_session.add(candidate)
    db_session.commit()
    db_session.refresh(candidate)

    # 3. Create Job created by this recruiter
    job = Job(
        title="Test Job For Recruiter Deletion",
        description="Testing recruiter cascade",
        created_by=recruiter.id,
        status="active",
        min_experience_years=2.0,
    )
    db_session.add(job)
    db_session.commit()
    db_session.refresh(job)

    # 4. Create Job Recruiter Assignment
    job_assign = JobRecruiterAssignment(
        job_id=job.id,
        recruiter_id=recruiter.id,
        assigned_by=admin_user.id,
    )
    db_session.add(job_assign)

    # 5. Create Candidate Recruiter Assignment (claim)
    cand_assign = CandidateRecruiterAssignment(
        candidate_id=candidate.id,
        job_id=job.id,
        recruiter_id=recruiter.id,
        assigned_by=admin_user.id,
    )
    db_session.add(cand_assign)

    # 6. Create Recruitment Task
    task = RecruitmentTask(
        job_id=job.id,
        title="Review resume for cascade test",
        assigned_to=recruiter.id,
        created_by=recruiter.id,
        priority="medium",
        status="todo",
    )
    db_session.add(task)

    # 7. Create Recruitment Message
    msg = RecruitmentMessage(
        job_id=job.id,
        sender_id=recruiter.id,
        message="Test note from recruiter",
    )
    db_session.add(msg)

    # 8. Create MatchResult referencing recruiter
    mr = MatchResult(
        candidate_id=candidate.id,
        job_id=job.id,
        overall_score=85.0,
        status="shortlisted",
        matched_by=recruiter.id,
        recruiter_id=recruiter.id,
    )
    db_session.add(mr)

    # 9. Create AuditLog referencing recruiter
    audit = AuditLog(
        actor_id=recruiter.id,
        action="claim_candidate",
        entity_type="candidate",
        entity_id=candidate.id,
        job_id=job.id,
        candidate_id=candidate.id,
    )
    db_session.add(audit)

    db_session.commit()

    # Verify everything exists
    assert db_session.query(User).filter(User.id == recruiter_id).first() is not None
    assert db_session.query(JobRecruiterAssignment).filter(JobRecruiterAssignment.recruiter_id == recruiter_id).first() is not None

    # Call Admin Remove Endpoint
    res = client.delete(
        f"/api/admin/users/{recruiter_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert res.status_code == 200
    res_data = res.json()
    assert res_data["id"] == recruiter_id
    assert "permanently removed successfully" in res_data["message"].lower()

    # Verify database state after deletion
    # Recruiter is deleted
    assert db_session.query(User).filter(User.id == recruiter_id).first() is None
    # Assignments deleted
    assert db_session.query(JobRecruiterAssignment).filter(JobRecruiterAssignment.recruiter_id == recruiter_id).first() is None
    assert db_session.query(CandidateRecruiterAssignment).filter(CandidateRecruiterAssignment.recruiter_id == recruiter_id).first() is None
    # Tasks & messages deleted
    assert db_session.query(RecruitmentTask).filter(RecruitmentTask.assigned_to == recruiter_id).first() is None
    assert db_session.query(RecruitmentMessage).filter(RecruitmentMessage.sender_id == recruiter_id).first() is None

    # Cleanup candidate
    db_session.delete(candidate)
    db_session.delete(cand_user)
    db_session.commit()
