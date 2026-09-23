# Functional Specification Document (FSD)
## SkillAlign: Intelligent Recruitment, Candidate-Job Matching & Enterprise ATS Platform

---

### Document Control

| Attribute | Specification Details |
| :--- | :--- |
| **Document Title** | Functional Specification Document (FSD) — SkillAlign Enterprise Platform |
| **Project Identifier** | SKILLALIGN-CORE-2026-PROD |
| **Document Version** | **3.0.0 (Comprehensive Production Baseline for QA & Testing)** |
| **Document Status** | **Approved / Authoritative Specification** |
| **Target Audience** | QA Engineers, Automation Testers, Full-Stack Engineers, System Architects, Security Auditors |
| **Author / Lead Architect** | Shiva Tripathi & SkillAlign Core Engineering Team |
| **Release Date** | September 2026 |
| **Classification** | Confidential / Official Technical Specification |
| **API Inventory Scope** | **136 Registered Endpoints across 17 Functional Modules** |
| **Pipeline Workflow Scope** | **21-Stage State Machine with Strict Transition Enforcement** |
| **Data Architecture Scope** | **21 Relational Database Models with Transactional Cascade Controls** |

---

### Revision History

| Version | Release Date | Primary Contributor | Description of Changes & QA Scope |
| :--- | :--- | :--- | :--- |
| **v1.0.0** | August 2026 | Core Engineering Lead | Initial functional draft covering relational schema, JWT auth, and basic candidate profiles. |
| **v1.4.0** | August 2026 | Backend Lead | Integration of AWS S3 dual-path resume storage, plain-text extraction, and deterministic parsing. |
| **v1.8.0** | September 2026 | Security & Integration | Dual-mode authentication (Email + Twilio SMS OTP), anti-flooding rate limiters, and RBAC guards. |
| **v2.0.0** | September 2026 | Full Architecture Team | Baseline FSD: Deterministic 4-tier match formula, collaborative ATS Kanban, 8-table cascade deletion, 59-endpoint Postman suite, SendGrid & Gemini AI integrations. |
| **v3.0.0** | September 2026 | Chief System Architect | **Major Comprehensive Expansion for QA Engineering**: Full documentation of all 136 live REST API endpoints; complete 21-stage recruitment state machine transition matrix; multi-round interview scheduling with token slot selection; ReportLab PDF offer generation with S3 presigned links; candidate response triggers with 180-day cooling-off blacklist; atomic candidate claiming with `SELECT FOR UPDATE` DB locks; real-time recruiter-HM messaging threads and task assignments; immutable audit trail logging; and exhaustive QA verification test playbooks. |

---

## 1. Executive Summary & Business Architecture

### 1.1 Problem Statement
Modern enterprise talent acquisition operations face acute technical and operational bottlenecks:
1. **Unstructured Resume Ingestion & Subjective Screening**: Recruiters spend up to 40 hours per vacancy manually reviewing unstructured PDF and Word documents. Human evaluation is slow, inconsistent, and subject to cognitive fatigue.
2. **Superficial Keyword Matching**: Legacy Applicant Tracking Systems (ATS) rely on basic keyword substring searches rather than deterministic, multi-criteria scoring that accounts for proficiency depth, mandatory constraint enforcement, and verifiable experience.
3. **Fragmented Stakeholder Workflows**: Hand-offs between Technical Recruiters (sourcing and shortlisting), Hiring Managers (interview evaluation and offer decisions), and Candidates (scheduling and offer response) occur across disconnected tools, leading to high candidate drop-off and delayed hiring cycles.
4. **Compliance & Audit Blindspots**: Decisions made via private emails or spreadsheets lack immutable auditability, exposing organizations to compliance disputes and loss of institutional hiring context.

### 1.2 Solution Vision: The SkillAlign Platform
SkillAlign is an enterprise-grade, cloud-native Recruitment, Candidate-Job Alignment, and Applicant Tracking System. The platform unifies the end-to-end recruitment lifecycle through:
- **Deterministic Multi-Criteria Matching Engine**: Computes transparent, mathematical alignment scores (0.0% to 100.0%) across Skills & Proficiency (60%), Experience Tenure (20%), Education (10%), and Work Mode Compatibility (10%), enforced by a mandatory skill zero-gate.
- **Asynchronous Dual-Storage Resume Pipeline**: Ingests PDF, DOCX, and TXT resumes into AWS S3/MinIO, extracts clean text via `pdfplumber` and `python-docx`, identifies sections and evidence snippets, and maps terms to a canonical master skill taxonomy via background Celery tasks.
- **21-Stage Controlled Hiring State Machine**: Enforces a strict, role-gated lifecycle from `CANDIDATE_MATCHED` to `HIRED` or `BLACKLISTED`. Invalid state transitions are rejected server-side with HTTP 400/403 errors.
- **Zero-Friction Candidate Coordination**: Interview slot selection and formal offer acceptance/rejection are handled via secure, single-use, time-limited cryptographic tokens delivered via SendGrid email — requiring no platform login from the candidate.
- **Offer Governance & PDF Compilation**: Enforces salary band compliance before HR review, auto-revokes approved offers upon recruiter post-approval edits, and dynamically generates enterprise PDF offer letters via ReportLab.
- **Atomic Concurrency Protection**: Race-condition-safe candidate claiming via database-level `SELECT FOR UPDATE` locks, guaranteeing that concurrent recruiters cannot claim the same candidate simultaneously.
- **Defense-in-Depth Security & Audit Logging**: RBAC enforced at the FastAPI dependency layer, SlowAPI rate limiting against brute-force attacks, bcrypt password hashing, and immutable recording of every state transition in PostgreSQL `audit_logs`.

---

## 2. System Architecture & Technology Stack

SkillAlign utilizes a decoupled, six-tier enterprise architecture separating client presentation, API security gateway, domain micro-services, background async processing, relational persistence, and cloud storage.

```mermaid
graph TB
    subgraph "Client Presentation Layer (Vite + React 18 + TS)"
        UI_Admin["Admin Console (/admin)"]
        UI_HR["HR Workspace (/hr)"]
        UI_Recruiter["Recruiter Portal (/recruiter)"]
        UI_Candidate["Candidate Dashboard (/candidate)"]
        UI_Public["Public Landing & Token Portals"]
    end

    subgraph "API Gateway & Security Layer (FastAPI + Uvicorn)"
        FastAPI_App["FastAPI REST Application (:8000)"]
        CORS_Middleware["CORS Origin Validator"]
        Rate_Limiter["SlowAPI Rate Limiter (IP/Endpoint)"]
        JWT_Guard["JWT Bearer Authentication & RBAC Dependencies"]
        Request_Logger["Request ID & Timing Middleware"]
    end

    subgraph "Domain Service Tier (Python 3.12)"
        Svc_Auth["Auth & OTP Service (Twilio SMS)"]
        Svc_Matching["Deterministic Matching Engine"]
        Svc_Resume["Resume Extractor (pdfplumber/docx)"]
        Svc_Workflow["21-Stage Workflow State Engine"]
        Svc_Offers["Offer Governance & ReportLab PDF Generator"]
        Svc_Jobs["Job Requisition & Recruiter Allocator"]
        Svc_Audit["Immutable Audit Logger"]
        Svc_Gemini["Google Gemini AI Narrative Engine"]
    end

    subgraph "Async Processing & Messaging Tier"
        Celery_Worker["Celery 5.x Distributed Workers"]
        Redis_Broker[("Redis Broker & Result Cache (:6379)")]
    end

    subgraph "Persistence & Cloud Infrastructure"
        DB_Postgres[("PostgreSQL 16 Relational Database")]
        Storage_S3[("AWS S3 / MinIO Object Store")]
        Twilio_Network["Twilio Telephony Network (SMS)"]
        SendGrid_Gateway["SendGrid Transactional Mail Gateway"]
        Gemini_Cloud["Google Gemini AI API"]
    end

    UI_Admin --> FastAPI_App
    UI_HR --> FastAPI_App
    UI_Recruiter --> FastAPI_App
    UI_Candidate --> FastAPI_App
    UI_Public --> FastAPI_App

    FastAPI_App --> CORS_Middleware
    CORS_Middleware --> Rate_Limiter
    Rate_Limiter --> JWT_Guard
    JWT_Guard --> Request_Logger

    Request_Logger --> Svc_Auth
    Request_Logger --> Svc_Matching
    Request_Logger --> Svc_Resume
    Request_Logger --> Svc_Workflow
    Request_Logger --> Svc_Offers
    Request_Logger --> Svc_Jobs
    Request_Logger --> Svc_Audit
    Request_Logger --> Svc_Gemini

    Svc_Resume --> Celery_Worker
    Svc_Matching --> Celery_Worker
    Celery_Worker <--> Redis_Broker

    Svc_Auth --> Twilio_Network
    Svc_Offers --> SendGrid_Gateway
    Svc_Workflow --> SendGrid_Gateway
    Svc_Gemini --> Gemini_Cloud

    Svc_Offers --> Storage_S3
    Svc_Resume --> Storage_S3
    Svc_Workflow --> DB_Postgres
    Svc_Audit --> DB_Postgres
    Svc_Jobs --> DB_Postgres
```

### 2.1 Technology Stack Specifications

| Architectural Tier | Selected Technology | Version | Purpose in SkillAlign |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React + TypeScript | 18.3.x / 5.5 | Role-based SPA dashboards, reactive Kanban boards, and candidate portals |
| **Frontend Build Tool** | Vite | 6.x | Lightning-fast HMR development server and optimized production bundling |
| **Frontend Styling** | Tailwind CSS | 3.4.x | Utility-first responsive styling, dark/light modes, and custom design system |
| **Backend Framework** | FastAPI (Python) | 0.115.x / 3.12 | High-performance asynchronous REST API with auto OpenAPI generation |
| **ASGI Web Server** | Uvicorn | 0.30.x | Production-grade asynchronous web server implementation |
| **Relational Database** | PostgreSQL | 16.x | Primary ACID-compliant relational persistence across 21 core tables |
| **ORM & Migrations** | SQLAlchemy / Alembic | 2.0.x / 1.13 | Declarative object-relational mapping and version-controlled schema migrations |
| **Async Task Queue** | Celery + Redis | 5.4.x / 7.x | Distributed background task execution for resume parsing and matching runs |
| **Cloud File Storage** | AWS S3 / MinIO | S3 API v4 | Encrypted object storage for original resumes, extracted text, and offer PDFs |
| **Resume Text Extraction** | pdfplumber / python-docx | 0.11 / 1.1 | Layout-aware PDF and Word text extraction with metadata identification |
| **Dynamic PDF Engine** | ReportLab | 4.2.x | Server-side compilation of formal offer letter PDFs with company branding |
| **Authentication & Crypto** | JWT (HS256) / bcrypt | PyJWT 2.9 / 4.2 | Stateless tamper-proof session tokens and one-way salted password hashing |
| **Rate Limiting Engine** | SlowAPI (Redis backend) | 0.1.9 | IP-based sliding window rate limiters protecting authentication endpoints |
| **Transactional Email** | SendGrid API | v3 | Template-driven transactional delivery of interview links and offer PDFs |
| **SMS Telephony Gateway**| Twilio Messaging API | 9.2.x | High-throughput SMS OTP dispatch for passwordless candidate authentication |
| **Generative AI (Advisory)**| Google Gemini API | 1.5 Flash | Optional plain-language candidate evaluation summaries and interview questions |

---

## 3. Multi-Role RBAC Security Architecture

SkillAlign enforces strict Role-Based Access Control (RBAC). User accounts belong to exactly one of four distinct roles, encoded into the JWT `role` claim and verified on every request by FastAPI dependency guards.

### 3.1 Role Hierarchy & Capabilities

```
                  ┌────────────────────────┐
                  │     Administrator      │  (Global System & User Governance)
                  └───────────┬────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
  ┌────────────────────────┐      ┌────────────────────────┐
  │  HR / Hiring Manager   │      │   Technical Recruiter  │
  │ (Requisitions, Reviews,│      │(Sourcing, Screening,   │
  │  Interviews, Approvals)│      │ Claiming, Offer Draft) │
  └────────────────────────┘      └────────────────────────┘
              │                               │
              └───────────────┬───────────────┘
                              │
                              ▼
                  ┌────────────────────────┐
                  │       Candidate        │  (Profile, Resume, Slot & Offer Tokens)
                  └────────────────────────┘
```

### 3.2 Role Permissions Matrix

| Functional Capability | Administrator | HR / Hiring Manager | Technical Recruiter | Candidate | Public Token |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Self-Registration & Password Login** | — | — | — | Yes | Yes |
| **Phone OTP Authentication** | — | — | — | Yes | Yes |
| **Password Reset via Email** | Yes | Yes | Yes | Yes | Yes |
| **Create / Update / Close Jobs** | Yes | **Yes (Owner)** | No | No | No |
| **Assign Recruiters to Jobs** | Yes | **Yes (Owner)** | No | No | No |
| **Manage Canonical Skill Taxonomy** | **Yes (Exclusive)** | No | No | No | No |
| **Trigger Matching Engine Execution** | Yes | Yes | **Yes** | No | No |
| **View Ranked Candidate Match List** | Yes | Yes | **Yes** | No | No |
| **Claim Candidate (Atomic Lock)** | Yes | No | **Yes (Exclusive)** | No | No |
| **Screen & Shortlist Candidate** | Yes | No | **Yes** | No | No |
| **Submit Shortlist to Hiring Manager**| No | No | **Yes** | No | No |
| **HM Review & Candidate Decision** | No | **Yes (Exclusive)** | No | No | No |
| **Propose Interview Time Slots** | No | **Yes (Exclusive)** | No | No | No |
| **Dispatch Slot Link to Candidate** | No | No | **Yes** | No | No |
| **Select Preferred Interview Slot** | No | No | No | Token | **Yes (Token)** |
| **Confirm Interview Booking** | No | No | **Yes** | No | No |
| **Submit 5-Dimension Interview Rubric**| No | **Yes (Exclusive)** | No | No | No |
| **Draft Compensation Offer** | No | No | **Yes** | No | No |
| **Review & Approve/Reject Offer** | No | **Yes (Exclusive)** | No | No | No |
| **Generate ReportLab PDF Offer** | No | No | **Yes** | No | No |
| **Dispatch Offer Letter to Candidate** | No | No | **Yes** | No | No |
| **Accept / Decline Formal Offer** | No | No | No | Token | **Yes (Token)** |
| **Manage Platform User Accounts** | **Yes (Exclusive)** | No | No | No | No |
| **Execute 8-Table Cascade Purge** | **Yes (Exclusive)** | No | No | No | No |
| **Access Global Audit Trail** | **Yes (Exclusive)** | No | No | No | No |

---

## 4. Core Algorithms & Domain Business Logic

### 4.1 4-Tier Deterministic Fit Score Model

The SkillAlign Matching Engine computes an authoritative, explainable alignment score between 0.0% and 100.0% for any job-candidate pair:

$$	ext{Fit Score} = 	ext{SkillScore}_{(60)} + 	ext{ExpScore}_{(20)} + 	ext{EduScore}_{(10)} + 	ext{WorkModeScore}_{(10)}$$

#### 1. Skill Proficiency Component (Max 60 Points)
- Every required and preferred skill in `job_skills` has a weight $W_i \in [1, 5]$ and type (`MUST-HAVE` or `NICE-TO-HAVE`).
- Candidate skills in `candidate_skills` possess a proficiency factor $P_i \in [0.0, 1.0]$ based on declared level and resume evidence validation:
  - **Expert** with Resume Evidence: $1.00$
  - **Expert** (Manual only): $0.85$
  - **Intermediate** with Resume Evidence: $0.81$
  - **Intermediate** (Manual only): $0.65$
  - **Beginner** with Resume Evidence: $0.50$
  - **Beginner** (Manual only): $0.35$
  - **Resume Detected** (Implicit): $0.85$
  - **Missing**: $0.00$
- **Mandatory Skill Zero-Gate**: If a candidate lacks a `MUST-HAVE` skill, a severe penalty factor is applied:

$$	ext{SkillScore} = \left( rac{\sum (P_i 	imes W_i)}{\sum W_i} ight) 	imes 60$$

#### 2. Experience Tenure Component (Max 20 Points)
Evaluates candidate total years of experience against `jobs.min_experience_years`:
- Candidate Experience $\ge$ Job Minimum: **20.0 Points** (100%)
- Candidate Experience $\ge 70\%$ of Minimum: **12.0 Points** (60%)
- Candidate Experience $> 0$: **6.0 Points** (30%)
- Zero Experience / Unspecified: **0.0 Points** (0%)

#### 3. Education Qualification Component (Max 10 Points)
- Recognized degree/diploma present in candidate profile: **10.0 Points**
- No formal qualification recorded: **0.0 Points**

#### 4. Work Mode Compatibility Component (Max 10 Points)
- Full compatibility (Exact match, or Candidate/Job allows `Remote`): **10.0 Points**
- Work mode mismatch (e.g. Candidate requires `Remote`, Job mandates `On-site`): **4.0 Points**

---

### 4.2 21-Stage Recruitment Workflow State Machine

Candidate applications transition through a rigorous state machine stored in `match_results.pipeline_state`. Transitions are guarded server-side:

```
[CANDIDATE_MATCHED]
        │  (Recruiter screens)
        ▼
[CANDIDATE_SHORTLISTED]
        │  (Recruiter submits)
        ▼
[SENT_TO_HIRING_MANAGER]
        │  (HM opens review)
        ▼
[HIRING_MANAGER_REVIEW] ───────(HM rejects)───────► [HIRING_MANAGER_REJECTED] ✗
        │  (HM requests interview)
        ▼
[INTERVIEW_REQUESTED]
        │  (HM proposes ≥2 slots)
        ▼
[INTERVIEW_SLOTS_PROPOSED]
        │  (Recruiter dispatches token link)
        ▼
[WAITING_FOR_CANDIDATE_SLOT]
        │  (Candidate selects slot via token)
        ▼
[CANDIDATE_SLOT_SELECTED]
        │  (Recruiter confirms + meeting link)
        ▼
[INTERVIEW_CONFIRMED]
        │  (Interview conducted)
        ▼
[INTERVIEW_COMPLETED]
        │  (Awaiting evaluation)
        ▼
[WAITING_FOR_HM_FEEDBACK]
        ├───(Decision = NO-GO)───► [INTERVIEW_NO_GO] ✗
        ├───(Decision = PASS)─────► [INTERVIEW_REQUESTED] (Loop for next round)
        └───(Decision = GO)
                │
                ▼
      [INTERVIEW_GO]
                │  (Advance to offer discussion)
                ▼
    [COMPENSATION_DISCUSSION]
                │  (Recruiter drafts offer)
                ▼
         [OFFER_CREATED]
                │  (Submit for HR approval)
                ▼
      [OFFER_PENDING_APPROVAL]
                │  (HR approves)
                ▼
         [OFFER_APPROVED]
                │  (ReportLab compiles PDF on S3)
                ▼
           [OFFER_SENT]
                │  (Candidate token response)
                ├─────────────────────────────────────────┐
                ▼                                         ▼
         [OFFER_ACCEPTED]                          [OFFER_REJECTED]
                │                                         │
                ▼                                         ▼
            [HIRED] ✓                              [BLACKLISTED] ✗
                                                 (180-day cooling off)
```

---

## 5. Relational Database Schema & Data Dictionary

SkillAlign persists operational data across 21 relational tables in PostgreSQL 16:

1. **`users`**: Platform identity accounts (id, email, hashed_password, full_name, role, is_active, phone_number, created_at, updated_at).
2. **`candidates`**: Rich candidate profiles (id, user_id, full_name, email, phone, current_title, summary, total_experience_years, highest_education, preferred_work_mode, city, state, country, notice_period_days, current_ctc, expected_ctc, resume_url, created_at, updated_at).
3. **`skills`**: Canonical master taxonomy catalog (id, name, category, created_at).
4. **`candidate_skills`**: Candidate skill mappings with proficiency and resume evidence (id, candidate_id, skill_id, proficiency_level, years_experience, evidence_text, source, created_at).
5. **`jobs`**: Job requisitions (id, title, description, department, client_name, min_experience_years, work_mode, location_city, location_state, status, min_salary, max_salary, created_by, created_at, updated_at).
6. **`job_skills`**: Requisition skill requirements (id, job_id, skill_id, requirement_type, weight, created_at).
7. **`job_recruiter_assignments`**: Recruiter role allocations per job (id, job_id, recruiter_id, assignment_role, assigned_by, created_at).
8. **`match_results`**: Scored alignment and pipeline state (id, job_id, candidate_id, overall_score, skill_score, experience_score, education_score, work_mode_score, status, pipeline_state, matched_by, notes, created_at, updated_at).
9. **`candidate_recruiter_assignments`**: Atomic candidate claims (id, job_id, candidate_id, recruiter_id, assigned_by, claimed_at, is_active).
10. **`interviews`**: Scheduled interview sessions (id, match_result_id, scheduled_by, interview_date, interview_type, meeting_link, interview_mode, scheduled_end, feedback, status, round_number, created_at, updated_at).
11. **`interview_slots`**: Proposed multi-slot options (id, interview_id, proposed_by, slot_start, slot_end, is_selected, candidate_token, token_expires_at, created_at).
12. **`interview_feedback`**: Structured 5-dimension evaluations (id, interview_id, reviewer_id, technical_score, communication_score, problem_solving_score, role_fit_score, overall_score, recommendation, strengths, areas_of_improvement, submitted_at).
13. **`job_interview_rounds`**: Requisition round configurations (id, job_id, round_number, round_name, round_type, description, is_mandatory, created_at).
14. **`candidate_scorecards`**: Multi-rater feedback records (id, match_result_id, reviewer_id, communication_score, technical_score, cultural_score, notes, recommendation, created_at).
15. **`offers`**: Governed compensation offers (id, match_result_id, created_by, base_salary, variable_pay, joining_bonus, other_benefits, work_mode, work_location, joining_date, expiry_date, status, pdf_s3_key, pdf_presigned_url, candidate_token, token_expires_at, hr_approved_by, hr_approved_at, justification, candidate_responded_at, candidate_response_notes, created_at, updated_at).
16. **`candidate_blacklists`**: 180-day cooling-off suppression records (id, candidate_id, reason, cooling_off_days, blacklisted_at, expires_at, created_by, is_active).
17. **`notifications`**: In-app stakeholder alerts (id, user_id, channel, subject, body, status, created_at).
18. **`otp_verifications`**: Ephemeral phone OTP verifications (id, phone_number, otp_code, expires_at, is_verified, attempts, created_at).
19. **`messages`**: Internal recruiter-HM discussion threads (id, job_id, candidate_id, sender_id, recipient_id, subject, body, message_type, is_read, created_at).
20. **`recruitment_tasks`**: Recruiter operational tasks (id, job_id, candidate_id, assigned_to, created_by, title, description, priority, due_date, status, completed_at, created_at, updated_at).
21. **`audit_logs`**: Immutable compliance audit trail (id, actor_id, action, entity_type, entity_id, old_state, new_state, metadata_json, created_at).

---

## 6. Complete REST API Specifications (136 Endpoints)

Below is the exhaustive inventory of all 136 live endpoints across 17 functional modules, complete with HTTP methods, paths, summaries, required authorization roles, request schemas, parameters, expected status codes, and specific QA testing assertions.


### 1. Authentication & Identity (11 Endpoints)
*Manages user registration, credential login, passwordless phone OTP, password reset, token refresh, and session termination.*

| Method | Endpoint Path | Summary & Purpose | Auth Role | Request Body | Path/Query Params | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Candidate self-registration | **Public** | `RegisterRequest` | None | `201`, `422` |
| `POST` | `/api/auth/login` | User login | **Public** | `LoginRequest` | None | `200`, `422` |
| `GET` | `/api/auth/me` | Get current user profile | **Any Role** | None | None | `200` |
| `PUT` | `/api/auth/me` | Update current user profile | **Any Role** | `UserUpdateMeRequest` | None | `200`, `422` |
| `POST` | `/api/auth/send-otp` | Request OTP for phone login | **Public** | `SendOTPRequest` | None | `200`, `422` |
| `POST` | `/api/auth/verify-otp` | Verify OTP and login | **Public** | `VerifyOTPRequest` | None | `200`, `422` |
| `POST` | `/api/auth/resend-otp` | Resend OTP | **Public** | `SendOTPRequest` | None | `200`, `422` |
| `POST` | `/api/auth/forgot-password` | Request password reset | **Public** | `ForgotPasswordRequest` | None | `200`, `422` |
| `POST` | `/api/auth/reset-password` | Reset password with token | **Public** | `ResetPasswordRequest` | None | `200`, `422` |
| `POST` | `/api/auth/logout` | User logout | **Any Role** | None | None | `200` |
| `POST` | `/api/auth/refresh` | Refresh access token | **Any Role** | None | None | `200` |

**QA Testing Verification Checklist for Module:**
- **Positive Verification**: Execute `POST /api/auth/register` with valid credentials for `Public` role. Verify HTTP status `201`.
- **RBAC Security Guard**: Attempt request without `Authorization` header -> Verify `401 Unauthorized`. Attempt with non-permitted role -> Verify `403 Forbidden`.
- **Validation Gate**: Submit invalid/empty JSON payload -> Verify `422 Unprocessable Entity` with field error breakdown.

### 2. User Management (6 Endpoints)
*User administrative operations, recruiter directory queries, user profile updates, and platform statistics.*

| Method | Endpoint Path | Summary & Purpose | Auth Role | Request Body | Path/Query Params | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/users` | Create HR or Recruiter user | **Authenticated** | `UserCreate` | None | `201`, `422` |
| `GET` | `/api/users` | List all users | **Authenticated** | None | `role_id` (string, query, Optional) | `200`, `422` |
| `GET` | `/api/users/stats` | Admin dashboard statistics | **Authenticated** | None | None | `200` |
| `GET` | `/api/users/recruiters` | List active recruiters (HR & Admin) | **Authenticated** | None | None | `200` |
| `GET` | `/api/users/{user_id}` | Get user by ID | **Authenticated** | None | `user_id` (integer, path, Required) | `200`, `422` |
| `PUT` | `/api/users/{user_id}` | Update user | **Authenticated** | `UserUpdate` | `user_id` (integer, path, Required) | `200`, `422` |

**QA Testing Verification Checklist for Module:**
- **Positive Verification**: Execute `POST /api/users` with valid credentials for `Authenticated` role. Verify HTTP status `201`.
- **RBAC Security Guard**: Attempt request without `Authorization` header -> Verify `401 Unauthorized`. Attempt with non-permitted role -> Verify `403 Forbidden`.
- **Validation Gate**: Submit invalid/empty JSON payload -> Verify `422 Unprocessable Entity` with field error breakdown.

### 3. Master Skill Taxonomy (5 Endpoints)
*Administrator-curated canonical master skill taxonomy ensuring consistent skill naming across candidate profiles and job requisitions.*

| Method | Endpoint Path | Summary & Purpose | Auth Role | Request Body | Path/Query Params | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/skills` | Create skill (Admin only) | **Admin** | `SkillCreate` | None | `201`, `422` |
| `GET` | `/api/skills` | List all skills (All authenticated roles) | **Any Role** | None | `category` (string, query, Optional) | `200`, `422` |
| `GET` | `/api/skills/{skill_id}` | Get skill by ID (All authenticated roles) | **Any Role** | None | `skill_id` (integer, path, Required) | `200`, `422` |
| `PUT` | `/api/skills/{skill_id}` | Update skill (Admin only) | **Admin** | `SkillUpdate` | `skill_id` (integer, path, Required) | `200`, `422` |
| `DELETE` | `/api/skills/{skill_id}` | Delete skill (Admin only) | **Admin** | None | `skill_id` (integer, path, Required) | `204`, `422` |

**QA Testing Verification Checklist for Module:**
- **Positive Verification**: Execute `POST /api/skills` with valid credentials for `Admin` role. Verify HTTP status `201`.
- **RBAC Security Guard**: Attempt request without `Authorization` header -> Verify `401 Unauthorized`. Attempt with non-permitted role -> Verify `403 Forbidden`.
- **Validation Gate**: Submit invalid/empty JSON payload -> Verify `422 Unprocessable Entity` with field error breakdown.

### 4. Job Requisitions & Recruiter Assignments (10 Endpoints)
*HR-owned job authoring, skill weighting, experience thresholds, salary bands, and multi-role recruiter team assignments.*

| Method | Endpoint Path | Summary & Purpose | Auth Role | Request Body | Path/Query Params | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/jobs` | Create a new job requisition (HR / Admin only) | **HR / Admin** | `JobCreate` | None | `201`, `422` |
| `GET` | `/api/jobs` | List jobs | **Any Role** | None | `status` (string, query, Optional)<br>`my_jobs_only` (boolean, query, Optional) | `200`, `422` |
| `GET` | `/api/jobs/pipeline-summary` | Get pipeline candidate summaries for all jobs | **Any Role** | None | None | `200` |
| `GET` | `/api/jobs/{job_id}` | Get job by ID | **Any Role** | None | `job_id` (integer, path, Required) | `200`, `422` |
| `PUT` | `/api/jobs/{job_id}` | Update job requisition (HR / Admin only) | **HR / Admin** | `JobUpdate` | `job_id` (integer, path, Required) | `200`, `422` |
| `DELETE` | `/api/jobs/{job_id}` | Delete a job requisition (HR / Admin only) | **HR / Admin** | None | `job_id` (integer, path, Required) | `204`, `422` |
| `POST` | `/api/jobs/{job_id}/recruiters` | Assign a recruiter to a job (HR / Admin only) | **HR / Admin** | `JobRecruiterAssignmentIn` | `job_id` (integer, path, Required) | `201`, `422` |
| `GET` | `/api/jobs/{job_id}/recruiters` | List recruiters assigned to a job requisition | **Any Role** | None | `job_id` (integer, path, Required) | `200`, `422` |
| `DELETE` | `/api/jobs/{job_id}/recruiters/{recruiter_id}` | Remove a recruiter from a job (HR / Admin only) | **HR / Admin** | None | `job_id` (integer, path, Required)<br>`recruiter_id` (integer, path, Required) | `204`, `422` |
| `PATCH` | `/api/jobs/{job_id}/recruiters/{recruiter_id}` | Update a recruiter's role on a job (HR / Admin only) | **HR / Admin** | `JobRecruiterUpdateRole` | `job_id` (integer, path, Required)<br>`recruiter_id` (integer, path, Required) | `200`, `422` |

**QA Testing Verification Checklist for Module:**
- **Positive Verification**: Execute `POST /api/jobs` with valid credentials for `HR / Admin` role. Verify HTTP status `201`.
- **RBAC Security Guard**: Attempt request without `Authorization` header -> Verify `401 Unauthorized`. Attempt with non-permitted role -> Verify `403 Forbidden`.
- **Validation Gate**: Submit invalid/empty JSON payload -> Verify `422 Unprocessable Entity` with field error breakdown.

### 5. Candidate Profiles (9 Endpoints)
*Candidate profile self-management, declared skills with proficiency levels, and recruiter candidate profile lookups.*

| Method | Endpoint Path | Summary & Purpose | Auth Role | Request Body | Path/Query Params | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/candidates/me` | Get own candidate profile | **Candidate** | None | None | `200` |
| `PUT` | `/api/candidates/me` | Update candidate profile | **Candidate** | `CandidateProfileUpdate` | None | `200`, `422` |
| `POST` | `/api/candidates/me` | Create candidate profile | **Candidate** | `CandidateProfileCreate` | None | `201`, `422` |
| `GET` | `/api/candidates/me/pipeline` | Get candidate's job matches and pipeline statuses | **Candidate** | None | None | `200` |
| `GET` | `/api/candidates/me/hiring` | Get candidate hiring details, journey timeline, and onboarding status | **Candidate** | None | None | `200` |
| `POST` | `/api/candidates/me/skills` | Add skill to profile | **Candidate** | `CandidateSkillIn` | None | `201`, `422` |
| `PUT` | `/api/candidates/me/skills/{skill_id}` | Update skill proficiency or years | **Candidate** | `CandidateSkillUpdate` | `skill_id` (integer, path, Required) | `200`, `422` |
| `DELETE` | `/api/candidates/me/skills/{skill_id}` | Remove skill from profile | **Candidate** | None | `skill_id` (integer, path, Required) | `200`, `422` |
| `GET` | `/api/candidates/{candidate_id}` | View candidate profile by ID (HR & Recruiter) | **HR / Recruiter** | None | `candidate_id` (integer, path, Required) | `200`, `422` |

**QA Testing Verification Checklist for Module:**
- **Positive Verification**: Execute `GET /api/candidates/me` with valid credentials for `Candidate` role. Verify HTTP status `200`.
- **RBAC Security Guard**: Attempt request without `Authorization` header -> Verify `401 Unauthorized`. Attempt with non-permitted role -> Verify `403 Forbidden`.
- **Validation Gate**: Submit invalid/empty JSON payload -> Verify `422 Unprocessable Entity` with field error breakdown.

### 6. Resume Processing & Extraction (8 Endpoints)
*Asynchronous multi-format resume ingestion (PDF/DOCX/TXT), plain-text extraction, NLP section detection, and S3 file management.*

| Method | Endpoint Path | Summary & Purpose | Auth Role | Request Body | Path/Query Params | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/candidates/me/resume` | Upload resume (PDF/DOC/DOCX) | **Candidate / Recruiter** | `Body_upload_resume_api_candidates_me_resume_post` | None | `200`, `422` |
| `POST` | `/api/candidates/{candidate_id}/resume` | Upload Candidate Resume (PDF, DOCX, TXT) — Async Processing | **Candidate / Recruiter** | `Body_upload_candidate_resume_api_candidates__candidate_id__resume_post` | `candidate_id` (integer, path, Required) | `202`, `422` |
| `GET` | `/api/candidates/{candidate_id}/resume` | Get Pre-signed S3 URL to View/Download Original Resume | **Candidate / Recruiter** | None | `candidate_id` (integer, path, Required) | `200`, `422` |
| `DELETE` | `/api/candidates/{candidate_id}/resume` | Delete Candidate Resume & Extracted Documents from Storage | **Candidate / Recruiter** | None | `candidate_id` (integer, path, Required) | `200`, `422` |
| `GET` | `/api/candidates/{candidate_id}/resume/status` | Get Resume Processing Status | **Candidate / Recruiter** | None | `candidate_id` (integer, path, Required) | `200`, `422` |
| `GET` | `/api/candidates/{candidate_id}/resume/text` | Get Extracted Plain Text (.txt) of Candidate Resume | **Candidate / Recruiter** | None | `candidate_id` (integer, path, Required) | `200`, `422` |
| `GET` | `/api/candidates/{candidate_id}/resume/parsed` | Get Structured Parsed Data (Skills, Experience, Education, Certifications) | **Candidate / Recruiter** | None | `candidate_id` (integer, path, Required) | `200`, `422` |
| `POST` | `/api/candidates/{candidate_id}/resume/reparse` | Reparse Existing Resume Text with Enhanced Deterministic Extractor | **Candidate / Recruiter** | None | `candidate_id` (integer, path, Required) | `200`, `422` |

**QA Testing Verification Checklist for Module:**
- **Positive Verification**: Execute `POST /api/candidates/me/resume` with valid credentials for `Candidate / Recruiter` role. Verify HTTP status `200`.
- **RBAC Security Guard**: Attempt request without `Authorization` header -> Verify `401 Unauthorized`. Attempt with non-permitted role -> Verify `403 Forbidden`.
- **Validation Gate**: Submit invalid/empty JSON payload -> Verify `422 Unprocessable Entity` with field error breakdown.

### 7. Deterministic Matching Engine (10 Endpoints)
*Rule-based candidate-to-job matching engine computing deterministic Fit Scores (0–100) and optional Gemini AI candidate narrative analysis.*

| Method | Endpoint Path | Summary & Purpose | Auth Role | Request Body | Path/Query Params | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/matching/jobs/{job_id}/run` | Queue matching engine for a job (Recruiter/HR/Admin) | **Authenticated** | None | `job_id` (integer, path, Required)<br>`sync` (boolean, query, Optional) | `202`, `422` |
| `GET` | `/api/matching/jobs/{job_id}/status` | Get matching processing status for a job (Recruiter/HR/Admin) | **Authenticated** | None | `job_id` (integer, path, Required) | `200`, `422` |
| `GET` | `/api/matching/jobs/{job_id}` | Get ranked match results for a job (HR & Recruiter) | **Authenticated** | None | `job_id` (integer, path, Required)<br>`status` (string, query, Optional) | `200`, `422` |
| `GET` | `/api/matching/screened` | List screened candidates ready for HR approval (HR) | **Authenticated** | None | `job_id` (string, query, Optional) | `200`, `422` |
| `PATCH` | `/api/matching/{match_id}/status` | Update candidate pipeline status (Role-enforced) | **Authenticated** | `MatchStatusUpdate` | `match_id` (integer, path, Required) | `200`, `422` |
| `GET` | `/api/matching/shortlists` | List active pipeline candidates (Recruiter & HR) | **Authenticated** | None | `job_id` (string, query, Optional) | `200`, `422` |
| `POST` | `/api/matching/{match_id}/scorecard` | Add feedback scorecard for a candidate (HR & Recruiter) | **Authenticated** | `ScorecardCreate` | `match_id` (integer, path, Required) | `201`, `422` |
| `GET` | `/api/matching/{match_id}/scorecards` | Get all scorecards for a match result (HR & Recruiter) | **Authenticated** | None | `match_id` (integer, path, Required) | `200`, `422` |
| `GET` | `/api/matching/{match_id}/ai-analysis` | Get Gemini AI candidate fit analysis & tailored interview questions (HR & Recruiter) | **Authenticated** | None | `match_id` (integer, path, Required) | `200`, `422` |
| `GET` | `/api/matching/jobs/{job_id}/shortlist-candidates` | Get ranked candidates for shortlisting with filters (Recruiter/HR) | **Authenticated** | None | `job_id` (integer, path, Required)<br>`min_score` (number, query, Optional)<br>`top_n` (string, query, Optional)<br>`exclude_blacklisted` (boolean, query, Optional) | `200`, `422` |

**QA Testing Verification Checklist for Module:**
- **Positive Verification**: Execute `POST /api/matching/jobs/{job_id}/run` with valid credentials for `Authenticated` role. Verify HTTP status `202`.
- **RBAC Security Guard**: Attempt request without `Authorization` header -> Verify `401 Unauthorized`. Attempt with non-permitted role -> Verify `403 Forbidden`.
- **Validation Gate**: Submit invalid/empty JSON payload -> Verify `422 Unprocessable Entity` with field error breakdown.

### 8. Match Results & Pipeline State (3 Endpoints)
*Match outcome records, screened candidate queries, and initial pipeline qualification state transitions.*

| Method | Endpoint Path | Summary & Purpose | Auth Role | Request Body | Path/Query Params | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/match_results/screened` | List screened candidates for HR | **Authenticated** | None | `job_id` (string, query, Optional) | `200`, `422` |
| `GET` | `/api/match_results/{match_id}` | Get match result by ID | **Authenticated** | None | `match_id` (integer, path, Required) | `200`, `422` |
| `PATCH` | `/api/match_results/{match_id}/status` | Update candidate pipeline status (Role-checked) | **Authenticated** | `MatchStatusUpdate` | `match_id` (integer, path, Required) | `200`, `422` |

**QA Testing Verification Checklist for Module:**
- **Positive Verification**: Execute `GET /api/match_results/screened` with valid credentials for `Authenticated` role. Verify HTTP status `200`.
- **RBAC Security Guard**: Attempt request without `Authorization` header -> Verify `401 Unauthorized`. Attempt with non-permitted role -> Verify `403 Forbidden`.
- **Validation Gate**: Submit invalid/empty JSON payload -> Verify `422 Unprocessable Entity` with field error breakdown.

### 9. Recruiter Operations & Workspace (5 Endpoints)
*Recruiter dashboard metrics, candidate review queues for assigned jobs, and candidate scorecard inspection.*

| Method | Endpoint Path | Summary & Purpose | Auth Role | Request Body | Path/Query Params | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/recruiter/dashboard-stats` | Get recruiter dashboard overview metrics | **Recruiter** | None | None | `200` |
| `GET` | `/api/recruiter/jobs` | List all jobs actively assigned to the current recruiter | **Recruiter** | None | None | `200` |
| `GET` | `/api/recruiter/jobs/{job_id}/candidates` | Get candidate match results for a specific assigned job | **Recruiter** | None | `job_id` (integer, path, Required)<br>`search` (string, query, Optional)<br>`min_score` (string, query, Optional)<br>`status` (string, query, Optional)<br>`assigned_to_me` (string, query, Optional)<br>`assignment_status` (string, query, Optional)<br>`page` (integer, query, Optional)<br>`page_size` (integer, query, Optional) | `200`, `422` |
| `GET` | `/api/recruiter/candidates` | Global candidate search across all assigned jobs for the recruiter | **Recruiter** | None | `job_id` (string, query, Optional)<br>`search` (string, query, Optional)<br>`min_score` (string, query, Optional)<br>`status` (string, query, Optional)<br>`assigned_to_me` (string, query, Optional)<br>`assignment_status` (string, query, Optional)<br>`page` (integer, query, Optional)<br>`page_size` (integer, query, Optional) | `200`, `422` |
| `GET` | `/api/recruiter/jobs/{job_id}/candidates/{candidate_id}` | Get full candidate review profile and match breakdown for a job | **Recruiter** | None | `job_id` (integer, path, Required)<br>`candidate_id` (integer, path, Required) | `200`, `422` |

**QA Testing Verification Checklist for Module:**
- **Positive Verification**: Execute `GET /api/recruiter/dashboard-stats` with valid credentials for `Recruiter` role. Verify HTTP status `200`.
- **RBAC Security Guard**: Attempt request without `Authorization` header -> Verify `401 Unauthorized`. Attempt with non-permitted role -> Verify `403 Forbidden`.
- **Validation Gate**: Submit invalid/empty JSON payload -> Verify `422 Unprocessable Entity` with field error breakdown.

### 10. Candidate Claiming (Atomic Locks) (6 Endpoints)
*Race-condition-safe candidate claiming using database-level SELECT FOR UPDATE row locking to prevent concurrent recruiter collisions.*

| Method | Endpoint Path | Summary & Purpose | Auth Role | Request Body | Path/Query Params | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/recruiter/jobs/{job_id}/candidates/{candidate_id}/claim` | Claim candidate for screening ('Assign to Me') | **Recruiter / Admin** | None | `job_id` (integer, path, Required)<br>`candidate_id` (integer, path, Required) | `200`, `422` |
| `POST` | `/api/recruiter/jobs/{job_id}/candidates/{candidate_id}/assign` | Assign candidate to a recruiter (HR or Primary Recruiter) | **Recruiter / Admin** | `CandidateRecruiterAssignmentIn` | `job_id` (integer, path, Required)<br>`candidate_id` (integer, path, Required) | `200`, `422` |
| `DELETE` | `/api/recruiter/jobs/{job_id}/candidates/{candidate_id}/assignment` | Unassign candidate from current recruiter | **Recruiter / Admin** | None | `job_id` (integer, path, Required)<br>`candidate_id` (integer, path, Required) | `204`, `422` |
| `POST` | `/api/jobs/{job_id}/candidates/{candidate_id}/claim` | Claim candidate for screening ('Assign to Me') | **Recruiter / Admin** | None | `job_id` (integer, path, Required)<br>`candidate_id` (integer, path, Required) | `200`, `422` |
| `POST` | `/api/jobs/{job_id}/candidates/{candidate_id}/assign` | Assign candidate to a recruiter (HR or Primary Recruiter) | **Recruiter / Admin** | `CandidateRecruiterAssignmentIn` | `job_id` (integer, path, Required)<br>`candidate_id` (integer, path, Required) | `200`, `422` |
| `DELETE` | `/api/jobs/{job_id}/candidates/{candidate_id}/assignment` | Unassign candidate from current recruiter | **Recruiter / Admin** | None | `job_id` (integer, path, Required)<br>`candidate_id` (integer, path, Required) | `204`, `422` |

**QA Testing Verification Checklist for Module:**
- **Positive Verification**: Execute `POST /api/recruiter/jobs/{job_id}/candidates/{candidate_id}/claim` with valid credentials for `Recruiter / Admin` role. Verify HTTP status `200`.
- **RBAC Security Guard**: Attempt request without `Authorization` header -> Verify `401 Unauthorized`. Attempt with non-permitted role -> Verify `403 Forbidden`.
- **Validation Gate**: Submit invalid/empty JSON payload -> Verify `422 Unprocessable Entity` with field error breakdown.

### 11. Recruitment Tasks (4 Endpoints)
*Collaborative HR-to-Recruiter task assignment with priority levels, due dates, and completion status tracking.*

| Method | Endpoint Path | Summary & Purpose | Auth Role | Request Body | Path/Query Params | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/recruiter/tasks` | List all recruitment tasks assigned to current recruiter | **Authenticated** | None | `status` (string, query, Optional) | `200`, `422` |
| `GET` | `/api/jobs/{job_id}/tasks` | List tasks associated with a job requisition or candidate | **Authenticated** | None | `job_id` (integer, path, Required)<br>`candidate_id` (string, query, Optional) | `200`, `422` |
| `POST` | `/api/jobs/{job_id}/tasks` | Create a recruitment task for an assigned recruiter (HR / Admin) | **Authenticated** | `RecruitmentTaskCreate` | `job_id` (integer, path, Required)<br>`candidate_id` (string, query, Optional) | `201`, `422` |
| `PATCH` | `/api/tasks/{task_id}` | Update recruitment task status or notes | **Authenticated** | `RecruitmentTaskUpdate` | `task_id` (integer, path, Required) | `200`, `422` |

**QA Testing Verification Checklist for Module:**
- **Positive Verification**: Execute `GET /api/recruiter/tasks` with valid credentials for `Authenticated` role. Verify HTTP status `200`.
- **RBAC Security Guard**: Attempt request without `Authorization` header -> Verify `401 Unauthorized`. Attempt with non-permitted role -> Verify `403 Forbidden`.
- **Validation Gate**: Submit invalid/empty JSON payload -> Verify `422 Unprocessable Entity` with field error breakdown.

### 12. Recruitment Communication (4 Endpoints)
*Internal discussion message threads scoped to specific jobs and candidates between Recruiters and Hiring Managers.*

| Method | Endpoint Path | Summary & Purpose | Auth Role | Request Body | Path/Query Params | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/jobs/{job_id}/messages` | List job-level recruitment collaboration messages | **Authenticated** | None | `job_id` (integer, path, Required) | `200`, `422` |
| `POST` | `/api/jobs/{job_id}/messages` | Send a job-level recruitment message | **Authenticated** | `RecruitmentMessageCreate` | `job_id` (integer, path, Required) | `201`, `422` |
| `GET` | `/api/jobs/{job_id}/candidates/{candidate_id}/messages` | List candidate-specific discussion messages for this job requisition | **Authenticated** | None | `job_id` (integer, path, Required)<br>`candidate_id` (integer, path, Required) | `200`, `422` |
| `POST` | `/api/jobs/{job_id}/candidates/{candidate_id}/messages` | Send a candidate review note or recommendation for this job requisition | **Authenticated** | `RecruitmentMessageCreate` | `job_id` (integer, path, Required)<br>`candidate_id` (integer, path, Required) | `201`, `422` |

**QA Testing Verification Checklist for Module:**
- **Positive Verification**: Execute `GET /api/jobs/{job_id}/messages` with valid credentials for `Authenticated` role. Verify HTTP status `200`.
- **RBAC Security Guard**: Attempt request without `Authorization` header -> Verify `401 Unauthorized`. Attempt with non-permitted role -> Verify `403 Forbidden`.
- **Validation Gate**: Submit invalid/empty JSON payload -> Verify `422 Unprocessable Entity` with field error breakdown.

### 13. Interview Coordination (5 Endpoints)
*Legacy and baseline interview scheduling, meeting link attachment, and candidate interview lookups.*

| Method | Endpoint Path | Summary & Purpose | Auth Role | Request Body | Path/Query Params | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/interviews` | Schedule an interview (HR Only) | **Authenticated** | `InterviewCreate` | None | `201`, `422` |
| `GET` | `/api/interviews` | List all interviews (HR, Recruiter & Admin) | **Authenticated** | None | `status` (string, query, Optional) | `200`, `422` |
| `GET` | `/api/interviews/my` | List candidate's scheduled and pending interviews (Candidate) | **Authenticated** | None | None | `200` |
| `GET` | `/api/interviews/{interview_id}` | Get interview by ID | **Authenticated** | None | `interview_id` (integer, path, Required) | `200`, `422` |
| `PATCH` | `/api/interviews/{interview_id}` | Update interview status or feedback (HR & Admin) | **Authenticated** | `InterviewUpdate` | `interview_id` (integer, path, Required) | `200`, `422` |

**QA Testing Verification Checklist for Module:**
- **Positive Verification**: Execute `POST /api/interviews` with valid credentials for `Authenticated` role. Verify HTTP status `201`.
- **RBAC Security Guard**: Attempt request without `Authorization` header -> Verify `401 Unauthorized`. Attempt with non-permitted role -> Verify `403 Forbidden`.
- **Validation Gate**: Submit invalid/empty JSON payload -> Verify `422 Unprocessable Entity` with field error breakdown.

### 14. 21-Stage Workflow Engine (24 Endpoints)
*Strictly enforced state machine orchestrating candidate shortlisting, HM review, multi-slot proposing, token selection, feedback, and offer advances.*

| Method | Endpoint Path | Summary & Purpose | Auth Role | Request Body | Path/Query Params | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/workflow/tasks/{task_id}/complete` | Mark an Action Center task as completed | **Recruiter** | None | `task_id` (integer, path, Required) | `200`, `422` |
| `POST` | `/api/workflow/{match_id}/shortlist` | Recruiter: Shortlist a candidate | **Recruiter** | `ShortlistRequest` | `match_id` (integer, path, Required) | `200`, `422` |
| `POST` | `/api/workflow/{match_id}/submit-to-hm` | Recruiter: Submit candidate to Hiring Manager | **HR / Recruiter** | `SubmitToHMRequest` | `match_id` (integer, path, Required) | `200`, `422` |
| `POST` | `/api/workflow/{match_id}/send-slots-to-candidate` | Recruiter: Forward interview slots to candidate | **Recruiter** | None | `match_id` (integer, path, Required) | `200`, `422` |
| `POST` | `/api/workflow/{match_id}/confirm-interview` | Recruiter: Confirm the candidate's selected slot | **Recruiter** | None | `match_id` (integer, path, Required) | `200`, `422` |
| `POST` | `/api/workflow/{match_id}/complete-interview` | Recruiter: Mark interview as completed and submit competency ratings | **Recruiter** | `CompleteInterviewRequest` | `match_id` (integer, path, Required) | `200`, `422` |
| `POST` | `/api/workflow/{match_id}/interviewer-evaluation` | Recruiter/Interviewer: Save structured competency evaluation | **HR / HM** | `CompleteInterviewRequest` | `match_id` (integer, path, Required) | `200`, `422` |
| `POST` | `/api/workflow/{match_id}/create-offer` | Recruiter: Create a compensation offer (DRAFT) | **Recruiter** | `CreateOfferRequest` | `match_id` (integer, path, Required) | `201`, `422` |
| `POST` | `/api/workflow/{match_id}/hm-review` | Hiring Manager: Start reviewing a candidate | **HR / HM** | None | `match_id` (integer, path, Required) | `200`, `422` |
| `POST` | `/api/workflow/{match_id}/hm-reject` | Hiring Manager: Reject a candidate | **HR / HM** | `HMRejectRequest` | `match_id` (integer, path, Required) | `200`, `422` |
| `POST` | `/api/workflow/{match_id}/request-interview` | Hiring Manager: Request interview with slot proposals (min 2 slots) | **HR / HM** | `RequestInterviewRequest` | `match_id` (integer, path, Required) | `201`, `422` |
| `POST` | `/api/workflow/{match_id}/hm-feedback` | Hiring Manager: Submit GO/NO-GO interview feedback | **HR / HM** | `HMFeedbackRequest` | `match_id` (integer, path, Required) | `201`, `422` |
| `POST` | `/api/workflow/interviews/{interview_id}/select-slot` | Candidate: Select an interview slot (token-authenticated or logged-in candidate) | **Public (Token)** | `SelectSlotRequest` | `interview_id` (integer, path, Required) | `200`, `422` |
| `GET` | `/api/workflow/{match_id}/timeline` | Get full application timeline (audit trail) | **HR / Recruiter** | None | `match_id` (integer, path, Required) | `200`, `422` |
| `GET` | `/api/workflow/action-center` | Recruiter: Get Action Center — all pending workflow actions | **HR / Recruiter** | None | `job_id` (string, query, Optional) | `200`, `422` |
| `GET` | `/api/workflow/action-center/count` | Recruiter: Get Action Center item counts for badge polling | **HR / Recruiter** | None | `job_id` (string, query, Optional) | `200`, `422` |
| `GET` | `/api/workflow/recent-activity` | Recruiter: Get recent recruitment activity logs | **HR / Recruiter** | None | `job_id` (string, query, Optional)<br>`limit` (integer, query, Optional) | `200`, `422` |
| `GET` | `/api/workflow/hm-dashboard` | Hiring Manager: Get dashboard items (pending reviews, feedback required) | **HR / HM** | None | None | `200` |
| `GET` | `/api/workflow/{match_id}/interview` | Get interview details with slots and feedback for an application | **HR / Recruiter** | None | `match_id` (integer, path, Required) | `200`, `422` |
| `GET` | `/api/workflow/{match_id}/state` | Get current workflow state for an application | **HR / Recruiter** | None | `match_id` (integer, path, Required) | `200`, `422` |
| `GET` | `/api/workflow/public/slots/{interview_id}` | Public: Get interview slots for candidate selection (token required) | **Public (Token)** | None | `interview_id` (integer, path, Required)<br>`token` (string, query, Required) | `200`, `422` |
| `GET` | `/api/workflow/{match_id}/interviews` | Get all interview rounds for an application | **HR / Recruiter** | None | `match_id` (integer, path, Required) | `200`, `422` |
| `POST` | `/api/workflow/{match_id}/interviews/add-round` | Add an on-demand additional interview round | **HR / Recruiter** | None | `match_id` (integer, path, Required)<br>`round_name` (string, query, Required)<br>`round_type` (string, query, Optional)<br>`duration_minutes` (integer, query, Optional) | `200`, `422` |
| `POST` | `/api/workflow/interviews/{interview_id}/round-feedback` | HM: Submit per-round feedback and GO/PASS/NO-GO decision | **HR / Recruiter** | None | `interview_id` (integer, path, Required)<br>`recommendation` (string, query, Required)<br>`is_final_round` (boolean, query, Optional)<br>`technical_rating` (string, query, Optional)<br>`communication_rating` (string, query, Optional)<br>`problem_solving_rating` (string, query, Optional)<br>`role_fit_rating` (string, query, Optional)<br>`overall_rating` (string, query, Optional)<br>`comments` (string, query, Optional) | `200`, `422` |

**QA Testing Verification Checklist for Module:**
- **Positive Verification**: Execute `POST /api/workflow/tasks/{task_id}/complete` with valid credentials for `Recruiter` role. Verify HTTP status `200`.
- **RBAC Security Guard**: Attempt request without `Authorization` header -> Verify `401 Unauthorized`. Attempt with non-permitted role -> Verify `403 Forbidden`.
- **Validation Gate**: Submit invalid/empty JSON payload -> Verify `422 Unprocessable Entity` with field error breakdown.

### 15. Offer Governance & PDF Dispatch (14 Endpoints)
*Offer drafting, salary band validation, HR approval gating, ReportLab PDF generation on S3, secure candidate token response, and 180-day blacklist cooling-off.*

| Method | Endpoint Path | Summary & Purpose | Auth Role | Request Body | Path/Query Params | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/offers/stats` | Get count of offers across states | **Recruiter / HR** | None | None | `200` |
| `GET` | `/api/offers/pending-review` | HM: List offers pending HM review | **Recruiter / HR** | None | None | `200` |
| `GET` | `/api/offers` | List offers filtered by workflow state/status | **Recruiter / HR** | None | `status` (string, query, Optional)<br>`job_id` (string, query, Optional)<br>`access_token` (string, query, Optional) | `200`, `422` |
| `GET` | `/api/offers/{offer_id}` | Get offer details | **Recruiter / HR** | None | `offer_id` (integer, path, Required)<br>`token` (string, query, Optional)<br>`access_token` (string, query, Optional) | `200`, `422` |
| `PATCH` | `/api/offers/{offer_id}` | Recruiter: Update a DRAFT or approved offer | **Recruiter / HR** | `UpdateOfferRequest` | `offer_id` (integer, path, Required) | `200`, `422` |
| `GET` | `/api/offers/by-match/{match_id}` | Get offer details for a match result | **Recruiter / HR** | None | `match_id` (integer, path, Required) | `200`, `422` |
| `PATCH` | `/api/offers/{offer_id}/hm-edit` | HM: Edit permitted offer fields during review | **HR / HM** | `HMUpdateOfferRequest` | `offer_id` (integer, path, Required) | `200`, `422` |
| `POST` | `/api/offers/{offer_id}/send` | Recruiter: Send offer to candidate | **Recruiter / HR** | None | `offer_id` (integer, path, Required) | `200`, `422` |
| `POST` | `/api/offers/{offer_id}/respond` | Candidate: Accept or reject offer (public, token-authenticated) | **Public (Token)** | `OfferRespondRequest` | `offer_id` (integer, path, Required) | `200`, `422` |
| `POST` | `/api/offers/{offer_id}/submit-review` | Recruiter: Submit offer to HM for approval | **HR / HM** | None | `offer_id` (integer, path, Required)<br>`recruiter_notes` (string, query, Optional) | `200`, `422` |
| `POST` | `/api/offers/{offer_id}/hm-review` | HM: Approve or request changes to an offer | **HR / HM** | None | `offer_id` (integer, path, Required)<br>`action` (string, query, Required)<br>`hm_notes` (string, query, Optional) | `200`, `422` |
| `POST` | `/api/offers/{offer_id}/generate-pdf` | Recruiter: Generate official PDF offer letter | **Recruiter / HR** | None | `offer_id` (integer, path, Required) | `200`, `422` |
| `GET` | `/api/offers/{offer_id}/pdf` | Download or view generated offer PDF (Candidate, Recruiter, HR, Admin, or via token) | **Recruiter / HR** | None | `offer_id` (integer, path, Required)<br>`token` (string, query, Optional)<br>`access_token` (string, query, Optional) | `200`, `422` |
| `GET` | `/api/offers/candidate/{token}/pdf` | Candidate: Download secure offer PDF using secure token | **Public (Token)** | None | `token` (string, path, Required) | `200`, `422` |

**QA Testing Verification Checklist for Module:**
- **Positive Verification**: Execute `GET /api/offers/stats` with valid credentials for `Recruiter / HR` role. Verify HTTP status `200`.
- **RBAC Security Guard**: Attempt request without `Authorization` header -> Verify `401 Unauthorized`. Attempt with non-permitted role -> Verify `403 Forbidden`.
- **Validation Gate**: Submit invalid/empty JSON payload -> Verify `422 Unprocessable Entity` with field error breakdown.

### 16. In-App Notifications (6 Endpoints)
*Cross-role asynchronous notification delivery for key workflow state transitions, interview confirmations, and offer actions.*

| Method | Endpoint Path | Summary & Purpose | Auth Role | Request Body | Path/Query Params | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/notifications` | Create and dispatch notification (HR Only) | **Authenticated** | `NotificationCreate` | None | `201`, `422` |
| `GET` | `/api/notifications` | List all notifications (HR & Admin) | **Authenticated** | None | `user_id` (string, query, Optional) | `200`, `422` |
| `GET` | `/api/notifications/my` | Get current user's notifications | **Authenticated** | None | None | `200` |
| `PATCH` | `/api/notifications/{notification_id}/read` | Mark notification as read | **Authenticated** | None | `notification_id` (integer, path, Required) | `200`, `422` |
| `POST` | `/api/notifications/mark-all-read` | Mark all current user notifications as read | **Authenticated** | None | None | `200` |
| `DELETE` | `/api/notifications/{notification_id}` | Dismiss or delete notification | **Authenticated** | None | `notification_id` (integer, path, Required) | `200`, `422` |

**QA Testing Verification Checklist for Module:**
- **Positive Verification**: Execute `POST /api/notifications` with valid credentials for `Authenticated` role. Verify HTTP status `201`.
- **RBAC Security Guard**: Attempt request without `Authorization` header -> Verify `401 Unauthorized`. Attempt with non-permitted role -> Verify `403 Forbidden`.
- **Validation Gate**: Submit invalid/empty JSON payload -> Verify `422 Unprocessable Entity` with field error breakdown.

### 17. Administrator Ops & Audit Trail (5 Endpoints)
*Global user account control, active/inactive toggles, transactional 8-table cascade deletion, and immutable hiring audit logs.*

| Method | Endpoint Path | Summary & Purpose | Auth Role | Request Body | Path/Query Params | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/users` | List all users with pagination, search, and filters (Admin only) | **Admin** | None | `page` (integer, query, Optional)<br>`page_size` (integer, query, Optional)<br>`search` (string, query, Optional)<br>`role` (string, query, Optional)<br>`status` (string, query, Optional) | `200`, `422` |
| `GET` | `/api/admin/users/{user_id}/detail` | Get extended user detail (Admin only) | **Admin** | None | `user_id` (integer, path, Required) | `200`, `422` |
| `PATCH` | `/api/admin/users/{user_id}/toggle-status` | Toggle user active/deactivated status (Admin only) | **Admin** | None | `user_id` (integer, path, Required) | `200`, `422` |
| `DELETE` | `/api/admin/users/{user_id}` | Permanently delete a user (Admin only) | **Admin** | None | `user_id` (integer, path, Required) | `200`, `422` |
| `GET` | `/api/admin/hiring-logs` | Get comprehensive recruitment and hiring audit logs (Admin only) | **Admin** | None | `page` (integer, query, Optional)<br>`page_size` (integer, query, Optional)<br>`category` (string, query, Optional)<br>`action` (string, query, Optional)<br>`search` (string, query, Optional) | `200`, `422` |

**QA Testing Verification Checklist for Module:**
- **Positive Verification**: Execute `GET /api/admin/users` with valid credentials for `Admin` role. Verify HTTP status `200`.
- **RBAC Security Guard**: Attempt request without `Authorization` header -> Verify `401 Unauthorized`. Attempt with non-permitted role -> Verify `403 Forbidden`.
- **Validation Gate**: Submit invalid/empty JSON payload -> Verify `422 Unprocessable Entity` with field error breakdown.

### 18. System Health Probe (1 Endpoints)
*Container orchestration liveness probe returning service health, version, and runtime environment.*

| Method | Endpoint Path | Summary & Purpose | Auth Role | Request Body | Path/Query Params | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/health` | Health Check | **Public** | None | None | `200` |

**QA Testing Verification Checklist for Module:**
- **Positive Verification**: Execute `GET /health` with valid credentials for `Public` role. Verify HTTP status `200`.
- **RBAC Security Guard**: Attempt request without `Authorization` header -> Verify `401 Unauthorized`. Attempt with non-permitted role -> Verify `403 Forbidden`.
- **Validation Gate**: Submit invalid/empty JSON payload -> Verify `422 Unprocessable Entity` with field error breakdown.

---

## 7. QA Test Suites & End-to-End Verification Playbooks

### Test Scenario 1: Complete Happy Path (Rahul Sharma · 23 Sequential Steps)
1. `POST /api/auth/register` (Rahul registers candidate account) -> Assert `201 Created`, JWT received.
2. `POST /api/candidates/me` (Completes profile: 3 yrs exp, B.Tech, Hybrid) -> Assert `201 Created`.
3. `POST /api/candidates/{id}/resume` (Uploads resume PDF) -> Assert `200 OK`, Celery task queued.
4. `POST /api/jobs` (Arjun HR creates Backend Developer job with skill weights) -> Assert `201 Created`.
5. `PUT /api/jobs/{id}` (Arjun sets status = active) -> Assert `200 OK`, matching queued.
6. `POST /api/jobs/{id}/recruiters` (Assigns Priya as Primary Recruiter) -> Assert `201 Created`.
7. `GET /api/recruiter/jobs/{id}/candidates` (Priya sees Rahul at Rank 1, Fit Score 86.2) -> Assert `200 OK`.
8. `POST /api/recruiter/jobs/{id}/candidates/{cid}/claim` (Atomic DB lock claim) -> Assert `200 OK`.
9. `POST /api/workflow/{mid}/shortlist` (Priya shortlists with note) -> Assert `200 OK`, state -> `CANDIDATE_SHORTLISTED`.
10. `POST /api/workflow/{mid}/submit-to-hm` (Submits to Arjun) -> Assert `200 OK`, state -> `SENT_TO_HIRING_MANAGER`.
11. `POST /api/workflow/{mid}/hm-review` (Arjun opens review) -> Assert `200 OK`, state -> `HIRING_MANAGER_REVIEW`.
12. `POST /api/workflow/{mid}/request-interview` (Arjun requests interview with 3 slots) -> Assert `200 OK`, state -> `INTERVIEW_SLOTS_PROPOSED`.
13. `POST /api/workflow/{mid}/send-slots-to-candidate` (Priya sends token email) -> Assert `200 OK`, state -> `WAITING_FOR_CANDIDATE_SLOT`.
14. `POST /api/workflow/interviews/{id}/select-slot` (Rahul selects slot via token) -> Assert `200 OK`, state -> `CANDIDATE_SLOT_SELECTED`.
15. `POST /api/workflow/{mid}/confirm-interview` (Priya attaches Meet link) -> Assert `200 OK`, state -> `INTERVIEW_CONFIRMED`.
16. `POST /api/workflow/{mid}/complete-interview` (Session marked complete) -> Assert `200 OK`, state -> `WAITING_FOR_HM_FEEDBACK`.
17. `POST /api/workflow/{mid}/hm-feedback` (Arjun submits Tech 5, Comm 4, Decision: GO) -> Assert `200 OK`, state -> `INTERVIEW_GO` -> `COMPENSATION_DISCUSSION`.
18. `POST /api/workflow/{mid}/create-offer` (Priya drafts offer: ₹18 LPA) -> Assert `201 Created`, state -> `OFFER_CREATED`.
19. `POST /api/offers/{id}/submit-review` (Priya submits for HR review) -> Assert `200 OK`, state -> `OFFER_PENDING_APPROVAL`.
20. `POST /api/offers/{id}/hm-review` (Arjun approves offer) -> Assert `200 OK`, state -> `OFFER_APPROVED`.
21. `POST /api/offers/{id}/generate-pdf` (ReportLab generates PDF on S3) -> Assert `200 OK`, state -> `OFFER_READY`.
22. `POST /api/offers/{id}/send` (Priya dispatches offer token to Rahul) -> Assert `200 OK`, state -> `OFFER_SENT`.
23. `POST /api/offers/{id}/respond` (Rahul clicks Accept) -> Assert `200 OK`, state -> `OFFER_ACCEPTED`, pipeline_state -> `HIRED`.
24. `GET /api/admin/hiring-logs` (Admin inspects audit trail) -> Assert `200 OK`, all 22 transitions present.

### Test Scenario 2: Offer Rejection & 180-Day Blacklist Verification
- Execute Steps 1–22 of Happy Path.
- At Step 23, candidate submits `POST /api/offers/{id}/respond` with `decision = "rejected"`.
- Assert `offer.status == "rejected"`.
- Assert `match_results.pipeline_state == "BLACKLISTED"`.
- Assert row inserted in `candidate_blacklists` with `expires_at = now() + 180 days`.
- Execute `POST /api/matching/jobs/{id}/run` -> Assert candidate is suppressed from match results.
- Attempt `POST /api/workflow/{mid}/request-interview` -> Assert `400 Bad Request` with message "Candidate is blacklisted".

### Test Scenario 3: Concurrency & Atomic Claiming Verification (`SELECT FOR UPDATE`)
- Setup two recruiter test clients (Recruiter A and Recruiter B).
- Simultaneously dispatch `POST /api/recruiter/jobs/{id}/candidates/{cid}/claim` for the same candidate.
- Assert exactly one request receives `200 OK` and claims ownership.
- Assert the concurrent request receives `409 Conflict` ("Candidate already claimed by another recruiter").

### Test Scenario 4: Salary Band Exceedance Gate
- Author job requisition with `min_salary = 1500000` and `max_salary = 2000000`.
- Attempt `POST /api/workflow/{mid}/create-offer` with `base_salary = 2500000` without justification.
- Assert `400 Bad Request` ("Salary exceeds maximum band without written justification").
- Re-attempt with `justification = "Candidate possesses exceptional architectural credentials"`.
- Assert `201 Created`.

### Test Scenario 5: Post-Approval Offer Modification Revocation
- Offer reaches `OFFER_APPROVED` state.
- Recruiter executes `PATCH /api/offers/{id}` modifying `base_salary`.
- Assert `offer.status` automatically reverts to `draft`.
- Assert `offer.hr_approved_by` is set to `null`.
- Assert `audit_logs` records `ACTION = "OFFER_APPROVAL_REVOKED"`.

### Test Scenario 6: SlowAPI Anti-Brute-Force Rate Limiting
- Rapidly dispatch 10 sequential requests to `POST /api/auth/send-otp` within 30 seconds from same IP.
- Assert requests 1–5 receive `200 OK`.
- Assert requests 6+ receive `429 Too Many Requests` with retry-after header.

### Test Scenario 7: 8-Table Transactional Cascade Purge
- Create candidate, upload resume, complete matching, schedule interview, draft offer, and record notifications.
- Execute `DELETE /api/admin/users/{user_id}`.
- Assert `200 OK`.
- Query `candidates`, `candidate_skills`, `match_results`, `interviews`, `interview_slots`, `offers`, `notifications`, and `users`.
- Assert zero orphaned records remaining.

---

## 8. Appendix: Environment Configuration & Automation Reference

### 8.1 Critical Environment Variables

| Variable Key | Required Type | Example Value | Description |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL URI | `postgresql://user:pass@localhost:5432/skillalign` | Main relational database connection string |
| `REDIS_URL` | Redis URI | `redis://localhost:6379/0` | Celery task broker and rate limiter cache |
| `SECRET_KEY` | Cryptographic String | `sec_09a8f7b6c5d4e3f2...` | 32+ byte string used for HS256 JWT signing |
| `ACCESS_TOKEN_EXPIRE_MINUTES`| Integer | `1440` (24 Hours) | Lifespan of session JWT access tokens |
| `AWS_ACCESS_KEY_ID` | String | `AKIAIOSFODNN7EXAMPLE` | AWS S3 / MinIO access credentials |
| `AWS_SECRET_ACCESS_KEY` | String | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` | AWS S3 secret credential |
| `S3_BUCKET_NAME` | String | `skillalign-production-assets` | Target bucket for resumes and offer PDFs |
| `SENDGRID_API_KEY` | String | `SG.xxxxxxxxxxxxxxxxxxxxxx` | API key for transactional email delivery |
| `TWILIO_ACCOUNT_SID` | String | `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | Twilio telephony account identifier |
| `TWILIO_AUTH_TOKEN` | String | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | Twilio telephony authentication secret |
| `TWILIO_PHONE_NUMBER` | E.164 String | `+15551234567` | Verified sender phone number for SMS OTPs |
| `GEMINI_API_KEY` | String | `AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxx` | Google Gemini AI semantic analysis API key |

---
*End of Functional Specification Document (FSD) — SkillAlign Enterprise Platform v3.0.0*
