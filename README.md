# SkillAlign

> **A modern recruitment and candidate-job matching platform that intelligently scores candidates against job requirements based on skills, proficiency, and experience.**

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Folder Structure](#4-folder-structure)
5. [Database Architecture](#5-database-architecture)
6. [Environment Setup](#6-environment-setup)
7. [Backend Setup](#7-backend-setup)
8. [Frontend Setup](#8-frontend-setup)
9. [Database Migration Commands](#9-database-migration-commands)
10. [Seed Commands](#10-seed-commands)
11. [Running the Application](#11-running-the-application)
12. [API Documentation](#12-api-documentation)
13. [Authentication Flow](#13-authentication-flow)
14. [Matching Algorithm](#14-matching-algorithm)
15. [Testing Instructions](#15-testing-instructions)

---

## 1. Project Overview

SkillAlign connects **Recruiters**, **HR**, and **Candidates** through a structured matching engine.

**Core workflow:**

```
Admin
 ↓ Creates HR and Recruiter accounts
Recruiter
 ↓ Creates Jobs with required/preferred skills and weights
Candidate
 ↓ Registers, builds profile, adds skills with proficiency levels
HR
 ↓ Runs matching engine for a job
 ↓ Reviews ranked candidates
 ↓ Shortlists or rejects candidates
Recruiter
 ↓ Views shortlisted candidates
 ↓ Reviews profile and resume
 ↓ Accepts or rejects
```

---

## 2. Architecture

```
SkillAlign/
├── backend/     — FastAPI + SQLAlchemy + PostgreSQL
└── frontend/    — React + Vite + Tailwind CSS + shadcn/ui
```

**Backend layered architecture:**

```
Routers   → thin HTTP layer (request/response only)
Services  → all business logic lives here
Models    → SQLAlchemy ORM definitions
Schemas   → Pydantic request/response models
Database  → session factory, base class
Core      → config, security, dependencies
```

---

## 3. Technology Stack

| Layer        | Technology                                  |
|--------------|---------------------------------------------|
| Backend      | Python 3.12+, FastAPI, Uvicorn              |
| ORM          | SQLAlchemy 2.x                              |
| Migrations   | Alembic                                     |
| Database     | PostgreSQL 15+                              |
| Auth         | JWT (python-jose), bcrypt (passlib)         |
| Validation   | Pydantic v2                                 |
| Frontend     | React 18, Vite, TypeScript                  |
| UI           | Tailwind CSS, shadcn/ui, Aceternity UI      |
| HTTP Client  | Axios                                       |
| Forms        | React Hook Form + Zod                       |
| Testing      | pytest, pytest-asyncio, httpx               |

---

## 4. Folder Structure

```
backend/
├── app/
│   ├── main.py               # FastAPI app factory
│   ├── core/
│   │   ├── config.py         # Pydantic Settings (env vars)
│   │   ├── security.py       # JWT + bcrypt helpers
│   │   └── dependencies.py   # get_current_user, role guards
│   ├── database/
│   │   ├── base.py           # DeclarativeBase
│   │   └── session.py        # SessionLocal, get_db()
│   ├── models/               # SQLAlchemy models (1 file per table)
│   ├── schemas/              # Pydantic request/response schemas
│   ├── routers/              # FastAPI route handlers (thin layer)
│   ├── services/             # Business logic
│   └── utils/                # File storage, validators
├── alembic/
│   ├── env.py
│   └── versions/
│       └── 001_initial_schema.py
├── scripts/
│   └── seed.py               # Database seeder
├── tests/
├── .env.example
├── alembic.ini
└── requirements.txt

frontend/
├── src/
│   ├── components/
│   │   ├── ui/               # shadcn/ui components
│   │   ├── layout/           # Sidebar, Header
│   │   └── common/           # Reusable components
│   ├── pages/
│   │   ├── auth/             # Login, Register
│   │   ├── admin/            # Admin dashboard
│   │   ├── hr/               # HR dashboard
│   │   ├── recruiter/        # Recruiter dashboard
│   │   └── candidate/        # Candidate dashboard
│   ├── services/
│   │   └── api.ts            # Axios API client
│   ├── hooks/
│   ├── context/              # Auth context
│   ├── types/                # TypeScript types
│   └── routes/               # React Router config
└── package.json
```

---

## 5. Database Architecture

### Core Tables (8)

```
roles               — Admin, HR, Recruiter, Candidate
users               — All authenticated users
skills              — Master skill list (Admin-managed)
jobs                — Job requisitions (Recruiter-created)
job_skills          — Skills required/preferred for a job
candidates          — Extended profile for Candidate users
candidate_skills    — Skills of a candidate with proficiency
match_results       — Matching engine output per job+candidate
```

### Relationships

```
roles ─── users ──┬─── jobs ──── job_skills ──── skills
                  │                │
                  │                └─── match_results ──── candidates
                  │                                              │
                  └─── candidates ──── candidate_skills ──── skills
```

### Key Constraints

| Table           | Constraint                                    |
|-----------------|-----------------------------------------------|
| users           | email UNIQUE, role_id FK → roles.id           |
| candidates      | user_id UNIQUE (one profile per user)         |
| job_skills      | (job_id, skill_id) UNIQUE                     |
| candidate_skills| (candidate_id, skill_id) UNIQUE               |
| match_results   | (job_id, candidate_id) UNIQUE                 |
| job_skills      | weight > 0, requirement_type IN (required, preferred) |
| candidate_skills| proficiency_level IN (Beginner, Intermediate, Expert) |
| match_results   | status IN (matched, shortlisted, rejected)    |
| match_results   | overall_score BETWEEN 0 AND 100              |

---

## 6. Environment Setup

### Prerequisites

- Python 3.12+
- PostgreSQL 15+ (running locally)
- Node.js 18+ (for frontend)

### Create the database

```sql
-- In psql or pgAdmin:
CREATE DATABASE skillaign;
```

### Backend environment

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your actual values
```

**Required variables:**

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/skillaign
JWT_SECRET_KEY=<generate with: python -c "import secrets; print(secrets.token_hex(32))">
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

### Frontend environment

```bash
cp frontend/.env.example frontend/.env
# Edit frontend/.env
```

```env
VITE_API_BASE_URL=http://localhost:8000
```

---

## 7. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate (Windows)
.venv\Scripts\activate

# Activate (macOS/Linux)
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

---

## 8. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install
```

---

## 9. Database Migration Commands

```bash
cd backend

# Apply all migrations (create tables)
alembic upgrade head

# Check current migration state
alembic current

# View migration history
alembic history

# Downgrade one step
alembic downgrade -1

# Downgrade to base (empty database)
alembic downgrade base

# Generate a new autogenerated migration after model changes
alembic revision --autogenerate -m "description"
```

> **Note (Windows):** If you see a UnicodeEncodeError, set:
> ```powershell
> $env:PYTHONIOENCODING="utf-8"
> ```

---

## 10. Seed Commands

```bash
cd backend

# Seed roles only (safe for production)
python -m scripts.seed --roles-only

# Seed everything — roles + skills + users + jobs + candidates
# DEV/STAGING ONLY — do NOT run on production
python -m scripts.seed --dev
```

**Development credentials (DEV ONLY — change before going to production):**

| Role      | Email                       | Password     |
|-----------|-----------------------------|--------------|
| Admin     | admin@skillaign.dev         | Admin@123    |
| HR        | hr@skillaign.dev            | HR@12345     |
| Recruiter | recruiter@skillaign.dev     | Rec@12345    |
| Candidate | alice@candidate.dev         | Alice@123    |
| Candidate | bob@candidate.dev           | Bob@12345    |

---

## 11. Running the Application

### Backend

```bash
cd backend
.venv\Scripts\activate   # Windows
# or: source .venv/bin/activate

uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm run dev
```

Access:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000
- **Swagger Docs:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

---

## 12. API Documentation

FastAPI generates interactive Swagger documentation at `/docs`.

| Prefix         | Description                            |
|----------------|----------------------------------------|
| `/api/auth`    | Register, login, current user          |
| `/api/users`   | Admin user management                  |
| `/api/skills`  | Skill CRUD (Admin) + read (all roles)  |
| `/api/jobs`    | Job management (Recruiter)             |
| `/api/candidates` | Candidate profile + skills         |
| `/api/matching`| Run matching, view results, shortlist  |

---

## 13. Authentication Flow

```
POST /api/auth/login
  { "email": "...", "password": "..." }
         ↓
   Validate email → find user
         ↓
   bcrypt.verify(password, password_hash)
         ↓
   Generate JWT: { user_id, role, exp }
         ↓
   Return: { "access_token": "...", "token_type": "bearer" }
         ↓
   Frontend stores token in memory / localStorage
         ↓
   Every request: Authorization: Bearer <token>
         ↓
   Backend: get_current_user() decodes JWT
         ↓
   Role-specific: require_admin(), require_hr(), etc.
```

**Public endpoints (no auth required):**
- `POST /api/auth/register` — Candidate self-registration only
- `POST /api/auth/login`
- `GET /health`

---

## 14. Matching Algorithm

Located in: `backend/app/services/matching_service.py`

### Proficiency Scores

| Level        | Score |
|--------------|-------|
| Beginner     | 0.40  |
| Intermediate | 0.70  |
| Expert       | 1.00  |

### Score Formula

```
For each job skill:
  if candidate has the skill:
    skill_score = proficiency_score (0.40 | 0.70 | 1.00)
  else:
    skill_score = 0

overall_score = SUM(skill_score × weight) / SUM(weight) × 100
```

**Example:**

```
Python    weight=5  candidate=Expert        → 1.00 × 5 = 5.00
FastAPI   weight=4  candidate=Intermediate  → 0.70 × 4 = 2.80
React     weight=2  candidate=Beginner      → 0.40 × 2 = 0.80
Docker    weight=3  candidate=missing       → 0.00 × 3 = 0.00

overall_score = (5.00 + 2.80 + 0.80 + 0.00) / (5+4+2+3) × 100
             = 8.60 / 14 × 100
             = 61.43
```

Score range: **0 → 100**, rounded to 2 decimal places.

### Experience Check

If `candidate.total_experience_years < job.min_experience_years`, the candidate's profile clearly flags an experience gap. The score is NOT penalised (the algorithm is skill-focused) but the gap is surfaced in the UI for HR review.

### Re-running Matching (Upsert)

When HR re-runs matching for the same job:
- If a `(job_id, candidate_id)` result already exists → it is **updated** with the new score
- Status is reset to `matched` so HR re-reviews the updated result
- If a candidate was previously `shortlisted` or `rejected`, this status is overwritten on re-run (intentional — re-matching means reconsideration)

---

## 15. Testing Instructions

```bash
cd backend
.venv\Scripts\activate

# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ -v --tb=short

# Run a specific test file
pytest tests/test_auth.py -v
```

**Test coverage targets:**

| Area            | Tests                                              |
|-----------------|----------------------------------------------------|
| Authentication  | Register, login, invalid password, JWT decode       |
| Authorization   | Role enforcement on protected endpoints             |
| Jobs            | Create job, add skills, invalid skill rejection     |
| Candidates      | Profile creation, skill management, duplicates      |
| Matching        | Score calculation, result persistence, upsert logic |
