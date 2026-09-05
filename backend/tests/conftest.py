"""
Pytest configuration and shared test fixtures for SkillAlign.
"""

import sys
import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ensure backend directory is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.database.base import Base
from app.database.session import get_db
from app.core.config import settings

# Test client against live FastAPI app
@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def admin_token(client):
    # Log in as seeded Admin
    response = client.post("/api/auth/login", json={
        "email": "admin@skillaign.dev",
        "password": "Admin@123"
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def hr_token(client):
    # Log in as seeded HR
    response = client.post("/api/auth/login", json={
        "email": "hr@skillaign.dev",
        "password": "HR@12345"
    })
    assert response.status_code == 200, f"HR login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def recruiter_token(client):
    # Log in as seeded Recruiter
    response = client.post("/api/auth/login", json={
        "email": "recruiter@skillaign.dev",
        "password": "Rec@12345"
    })
    assert response.status_code == 200, f"Recruiter login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def candidate_token(client):
    # Log in as seeded Candidate
    response = client.post("/api/auth/login", json={
        "email": "alice@candidate.dev",
        "password": "Alice@123"
    })
    assert response.status_code == 200, f"Candidate login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="session", autouse=True)
def cleanup_test_users():
    yield
    # Session teardown: clean up any ephemeral test accounts
    from app.database.session import SessionLocal
    from app.models.user import User
    from app.services.user_service import delete_user

    db = SessionLocal()
    try:
        test_users = db.query(User).filter(
            (User.name.like("Candidate %")) |
            (User.name.like("Test Candidate%")) |
            (User.name.like("Candidate A%")) |
            (User.name.like("Candidate B%")) |
            (User.name.like("Temp Test%"))
        ).all()
        for u in test_users:
            try:
                delete_user(db, u.id)
            except Exception:
                pass
    finally:
        db.close()

