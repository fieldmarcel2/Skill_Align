"""
Unit Tests for Deterministic Rule-Based Resume Parsing
======================================================
Tests:
- Email extraction
- Phone extraction
- Name extraction
- Skill matching against master taxonomy
- Experience calculation
- Degree & institution extraction
- Certification extraction
- Project extraction
"""

import pytest
from app.services.resume_txt_parser import (
    parse_resume_text,
    extract_email,
    extract_phone,
    extract_name,
    extract_skills,
    extract_experience,
    extract_education,
    extract_certifications,
)


SAMPLE_RESUME_TEXT = """
Amit Kumar
amit.kumar@example.com | +91 9876543210
Bangalore, India

PROFESSIONAL SUMMARY
Results-driven Senior Backend Engineer with 4.5 years of experience building high-throughput FastAPI and Django microservices on AWS.

TECHNICAL SKILLS
Languages: Python, JavaScript, TypeScript, Go
Backend: FastAPI, Django, Flask, Node.js, REST API, GraphQL
Databases: PostgreSQL, Redis, MongoDB, MySQL
DevOps & Cloud: Docker, Kubernetes, AWS, Terraform, CI/CD, Git, Linux
Testing: Pytest, Jest

WORK EXPERIENCE
Senior Software Engineer | Tech Innovations Pvt Ltd
2021 - Present
• Designed and maintained scalable RESTful microservices in FastAPI and PostgreSQL.
• Reduced API latency by 40% using Redis caching and asynchronous query execution.
• Built CI/CD automated deployment pipelines on AWS using Docker and GitHub Actions.

Software Developer | Cloud Systems Inc
2019 - 2021
• Developed data ingestion workers using Python, Pandas, and MySQL.
• Collaborated in an Agile Scrum team to deliver sprint milestones.

EDUCATION
Bachelor of Technology in Computer Science & Engineering
National Institute of Technology
Graduation Year: 2019

CERTIFICATIONS
• AWS Certified Solutions Architect - Associate
• Certified Kubernetes Administrator (CKA)

KEY PROJECTS
• SkillAlign Recruitment Engine: High-performance deterministic scoring system.
• Real-Time Analytics Pipeline: Scalable event ingestion using Kafka and Redis.
"""


def test_extract_contact_info():
    email = extract_email(SAMPLE_RESUME_TEXT)
    assert email == "amit.kumar@example.com"

    phone = extract_phone(SAMPLE_RESUME_TEXT)
    assert phone is not None
    assert "9876543210" in phone.replace(" ", "")

    name = extract_name(SAMPLE_RESUME_TEXT)
    assert name == "Amit Kumar"


def test_extract_skills_from_sample():
    master_skills = ["Python", "FastAPI", "PostgreSQL", "Docker", "AWS", "Redis", "Kubernetes", "Pytest"]
    skills = extract_skills(SAMPLE_RESUME_TEXT, master_skills=master_skills)
    skill_names = [s["name"] for s in skills]

    assert "Python" in skill_names
    assert "FastAPI" in skill_names
    assert "PostgreSQL" in skill_names
    assert "Docker" in skill_names
    assert "AWS" in skill_names
    assert "Redis" in skill_names


def test_extract_experience_and_years():
    total_exp, positions = extract_experience(SAMPLE_RESUME_TEXT, "")
    assert total_exp >= 4.0
    titles = [p["title"] for p in positions]
    assert any("Software Engineer" in t or "Developer" in t for t in titles)


def test_extract_education_and_degree():
    edu = extract_education(SAMPLE_RESUME_TEXT, "")
    assert len(edu) >= 1
    deg = edu[0]["degree"]
    assert "Bachelor of Technology" in deg or "B.Tech" in deg


def test_extract_certifications():
    certs = extract_certifications(SAMPLE_RESUME_TEXT)
    assert len(certs) >= 1
    assert any("AWS Certified" in c for c in certs)


def test_parse_full_resume_structure():
    parsed = parse_resume_text(SAMPLE_RESUME_TEXT)
    assert parsed["name"] == "Amit Kumar"
    assert parsed["email"] == "amit.kumar@example.com"
    assert parsed["total_experience_years"] >= 4.0
    assert len(parsed["skills"]) >= 5
    assert len(parsed["education"]) >= 1
    assert len(parsed["certifications"]) >= 1
    assert len(parsed["projects"]) >= 1
