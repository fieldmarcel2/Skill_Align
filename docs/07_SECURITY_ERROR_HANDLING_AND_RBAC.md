# Volume 07: Security Architecture, RBAC & Sequence Diagrams

This volume details the security architecture, Role-Based Access Control (RBAC) enforcement, rate limiting, error propagation mechanisms, and 8 comprehensive Mermaid sequence diagrams representing the core operational flows of SkillAlign.

---

## 1. Role-Based Access Control (RBAC) Matrix

SkillAlign enforces role permissions at both the API Gateway layer ([dependencies.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/core/dependencies.py)) and within domain service handlers ([workflow_service.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/services/workflow_service.py)).

| System Capability / Operation | Admin | HR / Hiring Manager | Recruiter | Candidate |
| :--- | :---: | :---: | :---: | :---: |
| **Candidate Self-Registration** | ✗ | ✗ | ✗ | **✓** |
| **Manage Users & Role Assignment** | **✓** | ✗ | ✗ | ✗ |
| **Curate Global Skill Taxonomy** | **✓** | **✓** (Add only) | ✗ | ✗ |
| **Create & Edit Job Requisitions** | **✓** | **✓** | ✗ | ✗ |
| **Trigger Matching Engine** | **✓** | **✓** | **✓** | ✗ |
| **Claim Candidate Ownership** | **✓** | ✗ | **✓** | ✗ |
| **Screen / Shortlist Candidates** | **✓** | ✗ | **✓** | ✗ |
| **Review Shortlist (HM Decision)**| **✓** | **✓** | ✗ | ✗ |
| **Request Interview Round** | **✓** | **✓** | ✗ | ✗ |
| **Propose Interview Slots** | **✓** | **✓** | **✓** | ✗ |
| **Select Preferred Interview Slot** | **✓** | ✗ | ✗ | **✓** (via Token) |
| **Conduct Interview & Submit Scorecard**| **✓** | **✓** | ✗ | ✗ |
| **Draft Offer Financial Terms** | **✓** | ✗ | **✓** | ✗ |
| **Approve Formal Offer Letter** | **✓** | **✓** | ✗ | ✗ |
| **Accept / Decline Offer** | ✗ | ✗ | ✗ | **✓** (via Token) |
| **View Full Platform Audit Timeline**| **✓** | Limited (Job scoped)| Limited (Assigned)| Limited (Self) |

---

## 2. Security Architecture Deep Dive

```
┌────────────────────────────────────────────────────────────────────────┐
│                     Layered Security Defenses                          │
├────────────────────────────┬───────────────────────────────────────────┤
│ 1. Transport Security      │ HTTPS Strict Transport + CORS Whitelist   │
│ 2. Edge & Rate Limiting    │ SlowAPI Memory Limiter (5/min on Auth)    │
│ 3. Cryptographic Storage   │ Bcrypt Password Hashing (Salt + 72-Byte)  │
│ 4. Identity & Token Claims │ HS256 JWT Signed Claims + Expire UTC      │
│ 5. Public Action Security  │ High-Entropy SHA-256 Tokens (32 Bytes)    │
│ 6. Input & SQL Injection   │ Pydantic v2 DTOs + SQLAlchemy Params      │
│ 7. File Upload Sanitation  │ Extension/MIME Whitelist + Path Stripping │
└────────────────────────────┴───────────────────────────────────────────┘
```

### 2.1 Password Hashing & Token Cryptography
* **Password Hashing**: Implemented in [security.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/core/security.py) using `bcrypt.hashpw()` with standard salt generation. Truncates input strings to 72 bytes to strictly conform to bcrypt specifications.
* **JWT Access Tokens**: Encoded via `python-jose` using HMAC-SHA256 (`HS256`) signed with `JWT_SECRET_KEY`. Payloads include subject (`sub`), role name (`role`), user email (`email`), and UTC expiry (`exp`).
* **Password Reset & Public Action Tokens**: Generated using `secrets.token_urlsafe(32)` providing 256 bits of cryptographic entropy. Reset tokens stored in PostgreSQL as SHA-256 hashes (`hash_reset_token()`) preventing database leak exploitation.

### 2.2 SlowAPI Rate Limiting
Configured on sensitive public endpoints in [auth.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/routers/auth.py):
* `POST /api/auth/send-otp`: `5/minute` per client IP.
* `POST /api/auth/verify-otp`: `10/minute` per client IP.
* `POST /api/auth/forgot-password`: `5/minute` per client IP.
* `POST /api/auth/reset-password`: `5/minute` per client IP.

### 2.3 File Upload Sanitation & Storage Security
* **Allowed Extensions**: Whitelist enforced (`.pdf`, `.docx`, `.doc`, `.txt`).
* **MIME Validation**: Checks `UploadFile.content_type` against application MIME headers.
* **Directory Traversal Defense**: Filenames sanitized using `re.sub(r"[^a-zA-Z0-9._-]", "_", os.path.basename(filename))`.
* **Isolated Object Storage**: Resumes stored under segmented paths: `resumes/original/{candidate_id}/{safe_filename}`.

---

## 3. Error Handling Architecture

SkillAlign implements a standardized, non-leaking exception propagation model:

```mermaid
flowchart TD
    DBErr[Database / Integrity Error] --> SvcLayer[Service Layer Catch]
    SvcLayer --> HTTPEx[Raise fastapi.HTTPException]
    HTTPEx --> GlobalHandler[FastAPI Exception Middleware]
    
    GlobalHandler --> Sanitize{DEBUG == True?}
    Sanitize -- "Yes" --> DevResp[JSONResponse: Detailed Error & Stack]
    Sanitize -- "No" --> ProdResp[JSONResponse: Sanitized Generic Error]
    
    ProdResp -- "HTTP 4xx / 5xx" --> Axios[Frontend Axios Client Interceptor]
    Axios -- "401 Unauthorized" --> EvictToken[Purge LocalStorage & Redirect to /login]
    Axios -- "Other Errors" --> Toast[Trigger User-Facing Error Notification Toast]
```

---

## 4. End-to-End Sequence Diagrams

### 4.1 Sequence Diagram: User Authentication & JWT Issuance

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Candidate
    participant UI as React Frontend (LoginPage.tsx)
    participant API as FastAPI Router (auth.py)
    participant Svc as AuthService (auth_service.py)
    participant Sec as Security (security.py)
    participant DB as PostgreSQL Database

    User->>UI: Enter Email & Password
    UI->>API: POST /api/auth/login {email, password}
    API->>Svc: login(db, LoginRequest)
    Svc->>DB: Query User by Email
    DB-->>Svc: User Record (with hashed_password & role)
    
    alt User Not Found or Inactive
        Svc-->>API: raise HTTPException(401, "Invalid credentials")
        API-->>UI: HTTP 401 Unauthorized
        UI-->>User: Display "Invalid email or password"
    else User Found
        Svc->>Sec: verify_password(plain_password, hashed_password)
        alt Password Mismatch
            Sec-->>Svc: False
            Svc-->>API: raise HTTPException(401, "Invalid credentials")
            API-->>UI: HTTP 401 Unauthorized
        else Password Valid
            Sec-->>Svc: True
            Svc->>Sec: create_access_token({"sub": user.id, "role": role.name})
            Sec-->>Svc: Encoded JWT String
            Svc-->>API: TokenResponse(access_token, token_type="bearer", user)
            API-->>UI: HTTP 200 OK + JWT Token JSON
            UI->>UI: Save Token to localStorage & Update AuthContext
            UI-->>User: Redirect to Role-Specific Dashboard
        end
    end
```

---

### 4.2 Sequence Diagram: Resume Upload, Text Extraction & Deterministic Parsing

```mermaid
sequenceDiagram
    autonumber
    actor Candidate as Candidate
    participant UI as CandidateProfilePage.tsx
    participant API as Resume Router (resume.py)
    participant Svc as ResumeService (resume_service.py)
    participant Stor as StorageManager (S3 / Local)
    participant Ext as TextExtractor (pdfplumber)
    participant Parse as ResumeTxtParser (resume_txt_parser.py)
    participant DB as PostgreSQL Database

    Candidate->>UI: Upload "john_doe_resume.pdf" (600 KB)
    UI->>API: POST /api/candidates/me/resume (multipart/form-data)
    API->>Svc: store_resume_and_queue(db, candidate, file)
    Svc->>Svc: Sanitize Filename -> "john_doe_resume.pdf"
    Svc->>Stor: Upload Original PDF to S3 ("resumes/original/12/john_doe_resume.pdf")
    Stor-->>Svc: S3 Storage Key Confirmed
    
    Svc->>Ext: extract_text_from_file(pdf_bytes, filename)
    Ext->>Ext: pdfplumber.open() -> Extract Text Layout & Clean Glyphs
    Ext-->>Svc: Clean Plaintext String
    
    Svc->>Stor: Upload Extracted Text to S3 ("resumes/extracted/12/john_doe_resume.txt")
    Svc->>DB: Query Master Skills Catalog
    DB-->>Svc: List of All Taxonomy Skills
    
    Svc->>Parse: parse_resume_text(raw_text, master_skills)
    Parse->>Parse: Segment Sections (Summary, Skills, Experience, Education)
    Parse->>Parse: Extract Skills & Contextual Evidence Sentences
    Parse-->>Svc: Structured Parsed Profile Dictionary
    
    Svc->>DB: Update Candidate (raw_text, parsed_json, education, tenure)
    Svc->>DB: Upsert candidate_skills (source='resume', evidence_text=snippet)
    DB-->>Svc: Transaction Committed
    Svc-->>API: Extraction & Parsing Summary Response
    API-->>UI: HTTP 200 OK + Parsed Profile JSON
    UI-->>Candidate: Render Parsed Skills, Evidence Badges & Experience
```

---

### 4.3 Sequence Diagram: Multi-Factor Candidate Matching Execution

```mermaid
sequenceDiagram
    autonumber
    actor Recruiter as Recruiter
    participant UI as JobDetailPage.tsx
    participant API as Matching Router (matching.py)
    participant Svc as MatchingService (matching_service.py)
    participant DB as PostgreSQL Database

    Recruiter->>UI: Click "Run Matching Engine"
    UI->>API: POST /api/matching/run/{job_id}
    API->>Svc: run_job_matching(db, job_id, current_user)
    Svc->>DB: Fetch Job Record with job_skills (Weights 1-5, Min Exp, Mode)
    DB-->>Svc: Job Entity & Required Skills
    Svc->>DB: Fetch All Candidates with candidate_skills & evidence
    DB-->>Svc: Candidate Entities List
    
    loop For Every Candidate in Database
        Svc->>Svc: calculate_candidate_match_score(job, candidate)
        Svc->>Svc: Evaluate Skill Coverage (60%) + 1.15x Evidence Multiplier
        Svc->>Svc: Evaluate Experience vs Minimum Threshold (20%)
        Svc->>Svc: Evaluate Education Degree (10%)
        Svc->>Svc: Evaluate Work Mode Compatibility (10%)
        Svc->>Svc: Compute overall_score (0.00 to 100.00)
        Svc->>DB: Upsert MatchResult (job_id, candidate_id, overall_score, status='matched')
    end
    
    DB-->>Svc: Batch Upsert Committed
    Svc->>Svc: Sort Match Results Descending by overall_score
    Svc-->>API: MatchRunResponse (total_candidates, ranked_results)
    API-->>UI: HTTP 200 OK + Ranked Candidates JSON
    UI-->>Recruiter: Display Ranked Candidate Cards with Match Percentage
```

---

### 4.4 Sequence Diagram: Interview Slot Coordination & Candidate Selection

```mermaid
sequenceDiagram
    autonumber
    actor Recruiter as Recruiter
    actor Candidate as Candidate
    participant UI_Rec as Recruiter Portal
    participant UI_Cand as SlotSelectionPage.tsx
    participant API as Workflow Router (workflow.py)
    participant Svc as WorkflowService (workflow_service.py)
    participant Email as EmailService (SendGrid)
    participant DB as PostgreSQL Database

    Recruiter->>UI_Rec: Propose 3 Time Slots for Technical Round
    UI_Rec->>API: POST /api/workflow/send-slots {match_id, slots, duration=45}
    API->>Svc: send_interview_slots(db, match_id, slots, recruiter)
    Svc->>Svc: Validate State Transition -> INTERVIEW_SLOTS_PROPOSED
    Svc->>Svc: Generate Cryptographic Token: secrets.token_urlsafe(32)
    Svc->>DB: Create Interview Record (selection_token, token_expires_at)
    Svc->>DB: Insert 3 InterviewSlot Records (status='proposed')
    Svc->>DB: Insert AuditLog (action='SLOTS_SENT')
    Svc->>Email: send_interview_slot_selection_email(candidate_email, token_link)
    Email-->>Candidate: Email Invite: "Select your interview slot for Backend Role"
    
    Candidate->>UI_Cand: Open Link: /select-slot?token={selection_token}
    UI_Cand->>API: GET /api/workflow/interviews/by-token?token={token}
    API->>DB: Query Interview & Proposed Slots by Token
    DB-->>API: Interview Details & Slots
    API-->>UI_Cand: Return Slot Options
    
    Candidate->>UI_Cand: Select Thursday 2:00 PM Slot & Confirm
    UI_Cand->>API: POST /api/workflow/select-slot {selection_token, slot_id}
    API->>Svc: select_interview_slot(db, selection_token, slot_id)
    Svc->>DB: Update Selected Slot -> status='selected'
    Svc->>DB: Cancel Alternative Slots -> status='cancelled'
    Svc->>DB: Advance MatchResult -> pipeline_state='CANDIDATE_SLOT_SELECTED'
    Svc->>DB: Insert AuditLog & Recruiter Notification
    DB-->>Svc: Transaction Committed
    Svc-->>API: Success Response
    API-->>UI_Cand: HTTP 200 OK
    UI_Cand-->>Candidate: Display Confirmation Screen
```

---

### 4.5 Sequence Diagram: Hiring Manager Evaluation & Go/No-Go Decision

```mermaid
sequenceDiagram
    autonumber
    actor HM as Hiring Manager (HR)
    participant UI as HMFeedbackPage.tsx
    participant API as Workflow Router (workflow.py)
    participant Svc as WorkflowService (workflow_service.py)
    participant DB as PostgreSQL Database

    HM->>UI: Open Candidate Evaluation Form
    HM->>UI: Input Ratings: Tech=5/5, Comm=4/5, ProblemSolving=5/5, Decision="GO"
    HM->>UI: Submit Scorecard
    UI->>API: POST /api/workflow/hm-feedback {match_id, technical_score, communication_score, problem_solving_score, recommendation="GO", notes}
    API->>Svc: submit_hm_feedback(db, match_id, data, current_user)
    Svc->>Svc: Validate State Transition: WAITING_FOR_HM_FEEDBACK -> INTERVIEW_GO
    Svc->>DB: Insert InterviewFeedback Record
    Svc->>DB: Update Interview Record -> status='completed'
    Svc->>DB: Update MatchResult -> pipeline_state='INTERVIEW_GO'
    Svc->>DB: Insert AuditLog (action='HM_FEEDBACK_SUBMITTED', details='GO')
    Svc->>DB: Create RecruitmentTask for Recruiter ("Initiate Compensation Discussion")
    DB-->>Svc: Transaction Committed
    Svc-->>API: WorkflowStateOut Response
    API-->>UI: HTTP 200 OK
    UI-->>HM: Display "Feedback Recorded — Candidate Advanced to Offer Stage"
```

---

### 4.6 Sequence Diagram: Offer Drafting, Approval, ReportLab PDF & Acceptance

```mermaid
sequenceDiagram
    autonumber
    actor Recruiter as Recruiter
    actor HM as HR Manager
    actor Candidate as Candidate
    participant UI_Rec as RecruiterOfferPage.tsx
    participant UI_HM as HMOfferReviewPage.tsx
    participant UI_Cand as CandidateOfferPage.tsx
    participant API as Workflow / Offers Router
    participant Svc as WorkflowService
    participant PDF as OfferPDFService (ReportLab)
    participant DB as PostgreSQL Database

    Recruiter->>UI_Rec: Draft Terms: Base=$140k, Bonus=$15k, Joining="Oct 15", Expiry="Sep 30"
    UI_Rec->>API: POST /api/workflow/create-offer
    API->>Svc: create_offer(db, match_id, offer_data, recruiter)
    Svc->>DB: Create Offer (status='DRAFT' / 'PENDING_HR_APPROVAL')
    Svc->>DB: Update MatchResult -> pipeline_state='OFFER_CREATED'
    
    HM->>UI_HM: Review Offer Terms & Financial Breakdown
    HM->>UI_HM: Click "Approve & Dispatch Offer"
    UI_HM->>API: POST /api/workflow/send-offer {match_id}
    API->>Svc: send_offer_to_candidate(db, match_id, hm_user)
    Svc->>PDF: generate(offer, candidate, job, recruiter, hm)
    PDF->>PDF: Compile Multi-Page Corporate PDF with Annexures A & B
    PDF-->>Svc: Raw PDF Binary Bytes
    Svc->>DB: Update Offer (status='APPROVED_BY_HR', sent_at=now())
    Svc->>DB: Update MatchResult -> pipeline_state='OFFER_SENT'
    
    Candidate->>UI_Cand: Access Link: /offers/{id}?token={response_token}
    UI_Cand->>API: GET /api/offers/{id}/pdf
    API-->>UI_Cand: Stream Application/PDF Bytes
    UI_Cand-->>Candidate: Render Pixel-Perfect Offer Letter PDF
    
    alt Candidate Accepts
        Candidate->>UI_Cand: Click "Accept Offer" & Sign Digitally
        UI_Cand->>API: POST /api/offers/respond {token, decision='ACCEPT'}
        API->>Svc: respond_to_offer(db, token, decision='ACCEPT')
        Svc->>DB: Update Offer -> status='ACCEPTED'
        Svc->>DB: Update MatchResult -> pipeline_state='HIRED'
        Svc->>DB: Insert AuditLog & Notify All Parties
        API-->>UI_Cand: HTTP 200 OK
        UI_Cand-->>Candidate: Trigger Confetti Animation & Welcome Message 🎉
    else Candidate Declines
        Candidate->>UI_Cand: Click "Decline Offer" & Input Reason
        UI_Cand->>API: POST /api/offers/respond {token, decision='REJECT'}
        API->>Svc: respond_to_offer(db, token, decision='REJECT')
        Svc->>DB: Update Offer -> status='DECLINED'
        Svc->>DB: Update MatchResult -> pipeline_state='OFFER_REJECTED'
        Svc->>DB: Create CandidateBlacklist (blacklisted_until = now() + 180 days)
        API-->>UI_Cand: HTTP 200 OK
        UI_Cand-->>Candidate: Display Rejection Acknowledgment
    end
```

---

*Proceed to [Volume 08: Codebase Structure, Deployment & Engineering Decisions](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/docs/08_FRONTEND_AND_BACKEND_CODEBASE_STRUCTURE.md) for codebase organization and architectural decision records.*
