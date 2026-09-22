# Volume 03: Functional Specification Document (FSD) & Use Cases

This volume contains the complete engineering-grade **Functional Specification Document (FSD)** and **Detailed Use Case Specifications** for SkillAlign, verified against the active codebase.

---

## 1. Feature Inventory & Implementation Status Matrix

| Feature ID | Feature Name | Primary Actor | Implementation Status | Core Implementation Files |
| :--- | :--- | :--- | :--- | :--- |
| **F-001** | Candidate Self-Registration | Candidate | **Implemented** | [auth.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/routers/auth.py), [RegisterPage.tsx](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/frontend/src/pages/auth/RegisterPage.tsx) |
| **F-002** | Multi-Factor Authentication (Email/Password + Phone OTP) | All Users | **Implemented** | [auth_service.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/services/auth_service.py), [otp_service.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/services/otp_service.py) |
| **F-003** | Password Reset via Cryptographic Token | All Users | **Implemented** | [auth_service.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/services/auth_service.py), [ForgotPasswordPage.tsx](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/frontend/src/pages/auth/ForgotPasswordPage.tsx) |
| **F-004** | Resume Document Upload (PDF, DOCX, DOC, TXT) | Candidate | **Implemented** | [resume.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/routers/resume.py), [resume_service.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/services/resume_service.py) |
| **F-005** | Deterministic Text Extraction & Layout Preservation | System | **Implemented** | [resume_text_extractor.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/services/resume_text_extractor.py) |
| **F-006** | Rule-Based Resume Parsing & Evidence Extraction | System | **Implemented** | [resume_txt_parser.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/services/resume_txt_parser.py) |
| **F-007** | Candidate Profile & Skill Management | Candidate | **Implemented** | [candidates.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/routers/candidates.py), [CandidateProfilePage.tsx](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/frontend/src/pages/candidate/CandidateProfilePage.tsx) |
| **F-008** | Job Requisition Creation & Skill Weighting (1-5) | HR / Admin | **Implemented** | [jobs.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/routers/jobs.py), [HRCreateJobPage.tsx](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/frontend/src/pages/hr/HRCreateJobPage.tsx) |
| **F-009** | Multi-Factor Algorithmic Candidate Matching | Recruiter / HR | **Implemented** | [matching_service.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/services/matching_service.py), [matching.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/routers/matching.py) |
| **F-010** | Explainable Match Breakdown & Resume Evidence Viewer | Recruiter / HR | **Implemented** | [matching_service.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/services/matching_service.py), [RecruiterCandidateDetailPage.tsx](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/frontend/src/pages/recruiter/RecruiterCandidateDetailPage.tsx) |
| **F-011** | Recruiter Candidate Claiming & Concurrency Lock | Recruiter | **Implemented** | [recruiter.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/routers/recruiter.py), [candidate_recruiter_assignment.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/models/candidate_recruiter_assignment.py) |
| **F-012** | Recruiter Shortlisting & Submission to Hiring Manager | Recruiter | **Implemented** | [workflow.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/routers/workflow.py), [ShortlistSubmissionPage.tsx](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/frontend/src/pages/recruiter/ShortlistSubmissionPage.tsx) |
| **F-013** | Hiring Manager Candidate Review & Decisioning | HR / HM | **Implemented** | [workflow_service.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/services/workflow_service.py), [HMCandidateReviewPage.tsx](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/frontend/src/pages/hr/HMCandidateReviewPage.tsx) |
| **F-014** | Multi-Round Interview Template Configuration | HR / Admin | **Implemented** | [job_interview_round.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/models/job_interview_round.py), [jobs.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/routers/jobs.py) |
| **F-015** | Interview Slot Proposal & Public Token Generation | Recruiter | **Implemented** | [workflow_service.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/services/workflow_service.py), [RequestInterviewModal.tsx](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/frontend/src/components/workflow/RequestInterviewModal.tsx) |
| **F-016** | Candidate Self-Service Slot Selection (Public/Authenticated) | Candidate | **Implemented** | [SlotSelectionPage.tsx](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/frontend/src/pages/candidate/SlotSelectionPage.tsx), [workflow.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/routers/workflow.py) |
| **F-017** | Interview Execution & Structured HM Evaluation Scorecard | HR / HM | **Implemented** | [interview_feedback.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/models/interview_feedback.py), [HMFeedbackPage.tsx](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/frontend/src/pages/hr/HMFeedbackPage.tsx) |
| **F-018** | Compensation Discussion & Offer Drafting | Recruiter | **Implemented** | [workflow_service.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/services/workflow_service.py), [RecruiterOfferPage.tsx](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/frontend/src/pages/recruiter/RecruiterOfferPage.tsx) |
| **F-019** | HR Executive Offer Approval & Revisions | HR Manager | **Implemented** | [HMOfferReviewPage.tsx](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/frontend/src/pages/hr/HMOfferReviewPage.tsx), [offer.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/models/offer.py) |
| **F-020** | ReportLab Corporate Offer Letter PDF Compilation | System | **Implemented** | [offer_pdf_service.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/services/offer_pdf_service.py) |
| **F-021** | Public Tokenized Offer Letter Acceptance / Rejection | Candidate | **Implemented** | [CandidateOfferPage.tsx](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/frontend/src/pages/candidate/CandidateOfferPage.tsx), [workflow.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/routers/workflow.py) |
| **F-022** | Automated 6-Month Cooling-Off Blacklisting | System | **Implemented** | [candidate_blacklist.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/models/candidate_blacklist.py), [workflow_service.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/services/workflow_service.py) |
| **F-023** | Recruiter Action Center & Operational Tasks | Recruiter | **Implemented** | [tasks.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/routers/tasks.py), [ActionCenterPage.tsx](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/frontend/src/pages/recruiter/ActionCenterPage.tsx) |
| **F-024** | Multi-Channel Transactional Notifications (In-App & Email) | System | **Implemented** | [notifications.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/routers/notifications.py), [email_service.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/services/email_service.py) |
| **F-025** | Admin System Console, User Management & Taxonomy | Admin | **Implemented** | [admin.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/routers/admin.py), [AdminDashboard.tsx](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/frontend/src/pages/admin/AdminDashboard.tsx) |
| **F-026** | Google Gemini Semantic Analysis & Fit Assessment | Recruiter / HR | **Implemented** | [gemini_service.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/services/gemini_service.py), [matching.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/routers/matching.py) |

---

## 2. Detailed Feature Specifications (FSD)

### F-004: Resume Document Upload & Multi-Format Text Extraction
* **Feature ID**: `F-004`
* **Feature Name**: Resume Document Upload & Text Extraction
* **Primary Actor**: Candidate
* **Purpose**: Allows candidates to upload resumes in PDF, DOCX, DOC, or TXT format (up to 10MB) for server-side storage and deterministic text extraction.
* **Preconditions**: Candidate is authenticated with a valid JWT token.
* **Trigger**: Candidate selects a file and clicks "Upload Resume" in the UI.
* **Main Flow**:
  1. Frontend validates file extension (`.pdf`, `.docx`, `.doc`, `.txt`) and size ($\le 10$ MB).
  2. Client submits multipart form-data to `POST /api/candidates/me/resume`.
  3. API checks MIME type and calls `resume_service.store_resume_and_queue()`.
  4. Backend sanitizes filename to prevent directory traversal (`sanitize_filename()`).
  5. File binary is uploaded to AWS S3 or Local Storage via `StorageManager`.
  6. `resume_text_extractor.extract_text_from_file()` invokes `pdfplumber` for PDF, `python-docx` for DOCX, or multi-encoding decoder for TXT.
  7. Plain extracted text is saved to S3 under `resumes/extracted/{candidate_id}/{filename}.txt`.
  8. Extracted text is passed to `resume_txt_parser.parse_resume_text()`.
  9. Candidate record is updated with raw text, parsed JSON metadata, and sync timestamp.
* **Alternative Flows**:
  - *Celery Active*: If Redis/Celery worker is responsive, processing is queued asynchronously under `task_id` with status `processing`.
  - *Celery Inactive*: Fallback executes immediately in-process synchronously, returning status `completed`.
* **Error Conditions**:
  - File $>10$ MB $\to$ Returns `413 Request Entity Too Large`.
  - Invalid format (e.g. `.exe`, `.zip`) $\to$ Returns `400 Bad Request`.
  - Corrupted/scanned image PDF with no text $\to$ Returns `422 Unprocessable Entity`.
* **Database Dependencies**: `candidates`, `candidate_skills`, `skills`.
* **API Dependencies**: `POST /api/candidates/me/resume`, `GET /api/candidates/me/resume/status`.

---

### F-008: Job Requisition Creation & Requirement Weighting
* **Feature ID**: `F-008`
* **Feature Name**: Job Requisition Creation & Skill Weighting
* **Primary Actor**: HR Manager, Admin
* **Purpose**: Creates enterprise job openings with required skill criteria, weights, and interview round templates.
* **Preconditions**: User is logged in with `HR` or `Admin` role.
* **Trigger**: User fills out the job creation form at `/hr/jobs/create` and clicks "Publish Job".
* **Main Flow**:
  1. User inputs Title, Department, Location, Work Mode (`Remote`, `Hybrid`, `Onsite`), Min Experience, Description.
  2. User selects required skills from global taxonomy and assigns integer weights (1 to 5) and requirement type (`MUST_HAVE` or `NICE_TO_HAVE`).
  3. User optionally defines interview rounds (e.g., Round 1: Technical Screening, Round 2: System Design).
  4. Frontend sends payload to `POST /api/jobs`.
  5. FastAPI validates request schema `JobCreate`.
  6. Service creates `Job` record and associated `JobSkill` records within a single database transaction.
  7. Returns created `JobOut` object.
* **Error Conditions**:
  - Missing title or experience $<0$ $\to$ Returns `422 Validation Error`.
  - Unauthorized role (Candidate or Recruiter) $\to$ Returns `403 Forbidden`.
* **Database Dependencies**: `jobs`, `job_skills`, `skills`, `job_interview_rounds`.
* **API Dependencies**: `POST /api/jobs`, `GET /api/skills`.

---

### F-009: Multi-Factor Algorithmic Candidate Matching
* **Feature ID**: `F-009`
* **Feature Name**: Multi-Factor Algorithmic Candidate Matching
* **Primary Actor**: Recruiter, HR Manager, Admin
* **Purpose**: Evaluates all candidate profiles against a job requisition using a 4-factor scoring model.
* **Preconditions**: Target Job Requisition exists and contains at least one `JobSkill`.
* **Trigger**: Recruiter clicks "Run Matching Engine" on Job Detail page.
* **Main Flow**:
  1. Client calls `POST /api/matching/run/{job_id}`.
  2. Service queries all active candidates and their associated `candidate_skills`.
  3. For each candidate, `calculate_candidate_match_score()` evaluates:
     - **Skill Score (60%)**: Weighted sum of matched skill proficiency factors (with 1.15x evidence multiplier) divided by total job skill weight.
     - **Experience Score (20%)**: Candidate experience compared against job minimum threshold.
     - **Education Score (10%)**: Degree presence evaluation.
     - **Work Mode Score (10%)**: Compatibility check between candidate preference and job mode.
  4. Upserts `MatchResult` records with `overall_score`, `recruiter_id`, and `status = 'matched'`.
  5. Sorts results in descending order of `overall_score`.
  6. Returns structured `MatchRunResponse` with full skill breakdowns.
* **Error Conditions**:
  - Non-existent `job_id` $\to$ Returns `404 Not Found`.
  - Non-privileged role $\to$ Returns `403 Forbidden`.
* **Database Dependencies**: `jobs`, `job_skills`, `candidates`, `candidate_skills`, `match_results`.
* **API Dependencies**: `POST /api/matching/run/{job_id}`, `GET /api/matching/job/{job_id}`.

---

### F-018: Compensation Discussion & Offer Drafting
* **Feature ID**: `F-018`
* **Feature Name**: Compensation Discussion & Offer Drafting
* **Primary Actor**: Recruiter
* **Purpose**: Allows recruiters to configure structured financial and operational terms for a candidate offer.
* **Preconditions**: Application is in state `COMPENSATION_DISCUSSION` or `INTERVIEW_GO`.
* **Trigger**: Recruiter submits offer terms at `/recruiter/offers/create`.
* **Main Flow**:
  1. Recruiter fills Base Salary, Performance Bonus, Signing Bonus, Relocation Allowance, Equity/Stock Options, Joining Date, Expiry Date, Work Location.
  2. Recruiter enters customized terms and conditions for Annexure B.
  3. Client calls `POST /api/workflow/create-offer`.
  4. Backend verifies state transition `COMPENSATION_DISCUSSION` $\to$ `OFFER_CREATED`.
  5. Computes Total Annual CTC ($Base + Bonus + Signing + Relocation$).
  6. Generates cryptographically secure `response_token` (`secrets.token_urlsafe(32)`).
  7. Creates `Offer` record with `status = 'DRAFT'` or `'PENDING_HR_APPROVAL'`.
  8. Logs audit entry in `audit_logs` and dispatches notification to HR.
* **Database Dependencies**: `match_results`, `offers`, `audit_logs`, `notifications`.
* **API Dependencies**: `POST /api/workflow/create-offer`, `GET /api/offers/{id}`.

---

### F-020: ReportLab Corporate Offer Letter PDF Compilation
* **Feature ID**: `F-020`
* **Feature Name**: ReportLab Corporate Offer Letter PDF Compilation
* **Primary Actor**: System (Triggered on Demand or Offer Approval)
* **Purpose**: Compiles a pixel-perfect, multi-page corporate PDF offer letter with dual annexures.
* **Preconditions**: `Offer` record exists with valid financial terms and associated `Candidate` and `Job`.
* **Trigger**: Recruiter, HR, or Candidate requests PDF download.
* **Main Flow**:
  1. Client calls `GET /api/offers/{id}/pdf`.
  2. `OfferPDFService.generate(offer, candidate, job, recruiter, hm)` is invoked.
  3. ReportLab builds document canvas using standard A4 geometry and corporate color palette (`#0F172A`, `#1D4ED8`, `#B45309`).
  4. Page 1: Official Corporate Header, Reference Number, Candidate Block, Salutation, Appointment Terms Table.
  5. Page 2 (Annexure A): Structured Annual and Monthly Compensation Schedule with Total CTC.
  6. Page 3 (Annexure B): Key Employment Conditions, Probation, Notice Period, Confidentiality, Dual Signature Block.
  7. Two-Pass `NumberedCanvas` compiles dynamic running footers ("Page X of Y").
  8. Binary bytes returned with header `Content-Type: application/pdf`.
* **Database Dependencies**: `offers`, `match_results`, `candidates`, `jobs`, `users`.
* **API Dependencies**: `GET /api/offers/{id}/pdf`.

---

## 3. Detailed Use Case Specifications

### UC-001: Candidate Registration & Resume Onboarding
* **Actor**: Candidate
* **Goal**: Create an account, upload a resume, and review parsed skills.
* **Preconditions**: Candidate has a valid email address and a PDF/DOCX resume.
* **Trigger**: Candidate accesses `/register`.
* **Main Success Scenario**:
  1. Candidate enters Full Name, Email, Password, and Phone Number.
  2. System creates `User` (Role: Candidate) and linked `Candidate` record.
  3. System returns JWT token; Candidate is redirected to `/candidate/profile`.
  4. Candidate uploads `resume.pdf`.
  5. System extracts text via `pdfplumber` and executes rule parser.
  6. Candidate views extracted Education, Experience, and Skills tagged with Evidence Snippets.
* **Alternative Scenarios**:
  - *Phone OTP*: Candidate enters phone number, receives 6-digit SMS code, verifies OTP, and logs in.
* **Postconditions**: Profile is populated and candidate is immediately discoverable by matching engine.

---

### UC-005: Recruiter Runs Matching & Screens Shortlist
* **Actor**: Recruiter
* **Goal**: Find top-matching candidates for an active job requisition and submit them to the Hiring Manager.
* **Preconditions**: Job Requisition has required skills defined.
* **Trigger**: Recruiter clicks "Run Matching" on `/recruiter/jobs/{id}`.
* **Main Success Scenario**:
  1. Matching engine evaluates all candidates and displays ranked list sorted by `overall_score`.
  2. Recruiter claims Candidate A (`POST /api/recruiter/claims`).
  3. Recruiter inspects Candidate A's match breakdown (Matched Skills, Missing Skills, Evidence Snippets).
  4. Recruiter clicks "Shortlist" and enters submission notes (`POST /api/workflow/submit-to-hm`).
  5. State advances to `SENT_TO_HIRING_MANAGER`.
  6. In-app notification and email are dispatched to the assigned Hiring Manager.
* **Postconditions**: Candidate appears in HR's Decision Dashboard.

---

### UC-012: Candidate Selects Interview Slot via Public Token
* **Actor**: Candidate
* **Goal**: Select a preferred interview time slot without friction.
* **Preconditions**: Recruiter has proposed interview slots (`INTERVIEW_SLOTS_PROPOSED`).
* **Trigger**: Candidate receives email invite with secure link `/select-slot?token={selection_token}`.
* **Main Success Scenario**:
  1. Candidate opens slot selection link in browser.
  2. System resolves `Interview` record via `selection_token` without requiring login.
  3. System renders available time slots in candidate's local time zone.
  4. Candidate selects Slot 2 (e.g., "Thursday, 2:00 PM - 3:00 PM").
  5. Client calls `POST /api/workflow/select-slot`.
  6. System marks selected slot as `selected`, cancels alternative slots, and transitions state to `CANDIDATE_SLOT_SELECTED`.
  7. Recruiter receives notification to generate video meeting link.
* **Postconditions**: Interview time is locked; calendar confirmation is dispatched.

---

### UC-018: Candidate Reviews Formal Offer & Decides
* **Actor**: Candidate
* **Goal**: Review compensation package and accept or decline employment offer.
* **Preconditions**: Offer has been approved by HR and dispatched (`OFFER_SENT`).
* **Trigger**: Candidate accesses link `/offers/{id}?token={response_token}`.
* **Main Success Scenario (Acceptance)**:
  1. Candidate inspects Base Salary, Bonuses, Benefits, and downloads ReportLab PDF.
  2. Candidate clicks "Accept Offer", enters digital signature name, and confirms.
  3. Client calls `POST /api/offers/respond` with `decision = "ACCEPT"`.
  4. Backend transitions Offer to `ACCEPTED` and application to `HIRED`.
  5. System triggers confetti animation in UI and notifies HR & Recruiter.
* **Alternative Scenario (Decline)**:
  1. Candidate clicks "Decline Offer" and enters reason.
  2. Client calls `POST /api/offers/respond` with `decision = "REJECT"`.
  3. Backend transitions Offer to `DECLINED`, application to `OFFER_REJECTED`, and creates a `CandidateBlacklist` record for **180 days**.
* **Postconditions**: Candidate is either marked `HIRED` or placed on active 6-month cooling off.

---

*Proceed to [Volume 04: Matching Engine & Resume Processing](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/docs/04_MATCHING_ENGINE_AND_RESUME_PROCESSING.md) for complete mathematical proofs, complexity analysis, and resume parsing algorithms.*
