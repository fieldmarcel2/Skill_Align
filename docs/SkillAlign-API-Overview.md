# SkillAlign API — Architecture Overview

## Project Purpose

SkillAlign is an **enterprise recruitment automation platform** that orchestrates the full
hiring lifecycle from job requisition to candidate onboarding. It replaces manual spreadsheets
and fragmented email workflows with a structured, role-driven system backed by AI-powered
candidate-job matching.

---

## Architecture

```
Frontend (React/Vite)         Backend (FastAPI/Python)       Database
─────────────────────         ────────────────────────       ────────
React + TypeScript     ──►    FastAPI REST API               PostgreSQL (Neon/Render)
Vite dev proxy                JWT Bearer auth                SQLAlchemy ORM
Axios HTTP client             Role-based access control      Alembic migrations
                              Pydantic schemas               S3 (AWS resume storage)
                              OpenAPI 3.1 auto-generated     Redis + Celery (async tasks)
                              SendGrid (transactional email)
                              Gemini AI (matching + parsing)
```

---

## Authentication Flow

```
Client                          Backend
──────                          ───────
POST /api/auth/login ──────────► Verify email + bcrypt password
                    ◄──────────  JWT access_token (HS256, 60-min expiry)

Authorization: Bearer <token> ─► Decode JWT → look up User → check is_active
                                  Raise 401 if invalid/blacklisted/expired
                                  Return User object to route handler
```

**Phone OTP flow:**
```
POST /api/auth/send-otp ─► Generate 6-digit OTP (5-min TTL) → SMS via Twilio
POST /api/auth/verify-otp ► Verify OTP → login or auto-register Candidate → JWT
```

---

## Role-Based Access Control

| Role | ID | Created By | Key Permissions |
|------|----|------------|-----------------|
| Admin | 1 | System seed | Full platform access |
| HR | 2 | Admin | Create jobs, approve candidates, schedule interviews, manage offers |
| Recruiter | 3 | Admin | Screen candidates, claim candidates, create tasks, run matching |
| Candidate | 4 | Self-register | Manage own profile, upload resume, view own pipeline |

---

## API Module Summary

### Authentication (`/api/auth`)
- Email/password registration and login
- Phone OTP login with auto-registration
- Password reset via secure email token
- JWT logout (token blacklisting) and token refresh

### Users (`/api/users`)
- Admin provisions HR and Recruiter accounts
- List users, get stats, update or deactivate

### Skills (`/api/skills`)
- Skill master list with category grouping
- Admin CRUD, all roles can read

### Jobs (`/api/jobs`)
- HR creates job requisitions with required/preferred skills and weights
- Recruiter assignment to jobs (HR assigns, Recruiter views)
- Job publish triggers automatic matching

### Candidates (`/api/candidates`)
- Self-service profile (personal info, education, experience, work preferences)
- Skill portfolio management
- Pipeline status view and hiring journey timeline

### Candidate Resumes (`/api/candidates/{id}/resume*`)
- Async upload: S3 storage → text extraction → Gemini AI parsing
- Auto-skill sync from parsed resume
- Status polling endpoint
- Pre-signed URL download

### Matching Engine (`/api/matching`)
- Weighted AI scoring: skill match, experience, education, work mode, location
- Results: `overall_score`, `skill_score`, `experience_score`, `education_score`
- Evidence: matched skills, missing skills, partial matches, skill gaps
- Manual re-run support + automatic triggers on job publish/resume upload

### Workflow (`/api/workflow`)
Full recruitment state machine:

```
MATCHED
  └─► [Recruiter] Shortlist → SHORTLISTED
        └─► [Recruiter] Submit to HM → SUBMITTED_TO_HM
              └─► [HM] Start Review → HM_REVIEW
                    ├─► [HM] Reject → HIRING_MANAGER_REJECTED
                    └─► [HM] GO → Request Interview
                          └─► [Recruiter] Send slots → INTERVIEW_SLOTS_SENT
                                └─► [Candidate] Select slot → INTERVIEW_CONFIRMED
                                      └─► [Recruiter] Complete → INTERVIEW_COMPLETED
                                            └─► [HM] GO feedback → OFFER_STAGE
                                                  └─► [Recruiter] Create Offer → OFFER_CREATED
                                                        └─► [Recruiter] Submit to HM → OFFER_PENDING_HM
                                                              └─► [HM] Approve → OFFER_APPROVED
                                                                    └─► [Recruiter] Send → OFFER_SENT
                                                                          ├─► [Candidate] Accept → HIRED
                                                                          └─► [Candidate] Reject → OFFER_REJECTED
```

### Offers (`/api/offers`)
- Offer creation with CTC, employment type, work mode, joining date
- HM approval gate with change-request flow
- PDF generation (Weasyprint/HTML)
- Candidate accept/reject with token-based public URL

### Interviews (`/api/interviews`)
- Schedule interviews with type, mode, meeting link, date/time
- Slot-based scheduling with candidate selection
- Feedback and status tracking
- SendGrid email notification to candidate

### Notifications (`/api/notifications`)
- In-app notifications with read/unread state
- HR dispatches notifications to any user
- All users manage their own inbox

### Recruitment Communication (`/api/jobs/{id}/messages`)
- Threaded job-level discussions between HR and Recruiters
- Candidate-scoped review notes (private or shared)

### Recruitment Tasks (`/api/jobs/{id}/tasks`, `/api/recruiter/tasks`)
- HR assigns tasks to Recruiters with priority and due dates
- Task lifecycle: OPEN → IN_PROGRESS → COMPLETED / CANCELLED

### Recruiter Operations (`/api/recruiter`)
- Dashboard stats (assigned jobs, candidates, pending tasks)
- Candidate queue with filters (score, status, assignment)
- "Assign to Me" claiming with race-condition safety

### Admin Management (`/api/admin`)
- Paginated user list with search and role/status filters
- Extended user profiles (candidate resume, skills, created jobs)
- Toggle user active/deactivated
- Comprehensive hiring audit logs with category filtering

---

## How to Access Swagger UI

1. Start backend: `cd backend && uvicorn main:app --reload`
2. Open: <http://127.0.0.1:8000/docs>
3. Click **Authorize 🔒** → enter your JWT token → **Authorize**

## How to Access ReDoc

- Open: <http://127.0.0.1:8000/redoc>
- Or open: `docs/SkillAlign-API-Documentation.html` (standalone, no server needed)

## How to Regenerate Documentation

```powershell
# 1. Export OpenAPI spec from running server
Invoke-WebRequest -Uri "http://127.0.0.1:8000/openapi.json" -OutFile "docs/openapi.json"

# 2. Generate standalone HTML
npx @redocly/cli build-docs docs/openapi.json -o docs/SkillAlign-API-Documentation.html
```

---

## Documentation Maintenance Principles

- **The FastAPI source code is the single source of truth.**
- `docs/openapi.json` is a generated export — never edit it manually.
- `docs/SkillAlign-API-Documentation.html` is a generated artifact — regenerate after API changes.
- To improve documentation, edit: `summary=`, `description=`, and Pydantic model docstrings in the router files.
- Do not create a parallel `swagger.yaml` — this creates documentation drift.
