# Volume 02: End-to-End Workflows & State Machines

This volume details the complete end-to-end recruitment lifecycle implemented in SkillAlign, providing role-specific workflow flowcharts, the formal mathematical transition matrix for the 21-state enterprise state machine, business rules, and multi-tier Data Flow Diagrams (DFDs).

---

## 1. Complete End-to-End Recruitment Workflow

SkillAlign orchestrates a collaborative, multi-stakeholder recruitment lifecycle connecting Candidates, Recruiters, HR / Hiring Managers, and System Admins.

```mermaid
flowchart TD
    Start([Candidate Signs Up / Logs In]) --> UploadResume[Uploads Resume - PDF / DOCX / TXT]
    UploadResume --> ParseResume[Resume Extractor & Deterministic Parser Runs]
    ParseResume --> ProfileSync[Profile Populated & Skills Cataloged with Evidence]
    
    HROpenJob[HR Manager Creates Job Requisition & Defines Weighted Skills] --> JobActive[Job Requisition Active in Platform]
    
    ProfileSync --> MatchEngine[Recruiter Triggers Multi-Factor Matching Engine]
    JobActive --> MatchEngine
    
    MatchEngine --> MatchRank[Ranked Candidate Match Results Generated]
    MatchRank --> RecScreen{Recruiter Screens Candidate}
    
    RecScreen -- "Reject" --> StateReject[Status: REJECTED]
    RecScreen -- "Shortlist" --> ShortlistHM[Submit Shortlist to Hiring Manager]
    
    ShortlistHM --> HMReview{Hiring Manager Review}
    HMReview -- "Decline" --> StateHMReject[Status: HIRING_MANAGER_REJECTED]
    HMReview -- "Request Interview" --> RequestInv[HR Requests Interview Round]
    
    RequestInv --> ProposeSlots[Recruiter Proposes 2-4 Interview Slots]
    ProposeSlots --> CandSelectSlot[Candidate Selects Preferred Slot via Public Token]
    CandSelectSlot --> InvConfirmed[Recruiter Confirms Slot & Sends Calendar Invites]
    
    InvConfirmed --> InvConducted[Interview Conducted via Zoom / Meet]
    InvConducted --> HMFeedback{HM Submits Scorecard & Decision}
    
    HMFeedback -- "No-Go" --> StateNoGo[Status: INTERVIEW_NO_GO / REJECTED]
    HMFeedback -- "Next Round" --> RequestInv
    HMFeedback -- "Go / Recommend Offer" --> CompDiscuss[Compensation Discussion]
    
    CompDiscuss --> DraftOffer[Recruiter Drafts Offer Terms & Salary]
    DraftOffer --> HRApproval{HR Reviews & Approves Offer}
    
    HRApproval -- "Revise" --> DraftOffer
    HRApproval -- "Approve" --> GenPDF[ReportLab Generates Formal Offer PDF]
    
    GenPDF --> SendOffer[Offer Dispatched to Candidate via Email]
    SendOffer --> CandResponse{Candidate Decision}
    
    CandResponse -- "Accept Offer" --> StatusHired([Status: HIRED 🎉])
    CandResponse -- "Decline Offer" --> StatusBlacklist([Status: BLACKLISTED - 6-Month Cooling Off])
```

---

## 2. Role-Specific Workflows

### 2.1 Candidate Workflow
```mermaid
flowchart TD
    C1[Visit Landing Page] --> C2{Account Exists?}
    C2 -- "No" --> C3[Register with Name, Email, Password or Phone OTP]
    C2 -- "Yes" --> C4[Login & Receive JWT Access Token]
    C3 --> C4
    C4 --> C5[Navigate to Candidate Profile]
    C5 --> C6[Upload Resume - PDF, DOCX, DOC, or TXT]
    C6 --> C7[View Parsed Profile, Education, Experience & Extracted Skills]
    C7 --> C8[Add Self-Declared Skills & Set Proficiency Levels]
    C8 --> C9[Monitor Application Progress on Candidate Dashboard]
    C9 --> C10{Interview Requested?}
    C10 -- "Yes" --> C11[Access Slot Selection Page via Secure Token]
    C11 --> C12[Select Preferred Date & Time Slot]
    C12 --> C13[Receive Confirmed Meeting Link & Email]
    C13 --> C14[Attend Technical / HR Interview]
    C14 --> C15{Offer Issued?}
    C15 -- "Yes" --> C16[Access Offer Portal & Download ReportLab PDF]
    C16 --> C17{Candidate Action}
    C17 -- "Accept" --> C18[Sign Digitally & Accept Position - HIRED]
    C17 -- "Decline" --> C19[Decline Offer - 6-Month Cooling-Off Applied]
```

### 2.2 HR / Hiring Manager Workflow
```mermaid
flowchart TD
    H1[Login as HR / Hiring Manager] --> H2[HR Dashboard]
    H2 --> H3[Create Job Requisition]
    H3 --> H4[Assign Required Skills, Proficiency & Weights 1-5]
    H4 --> H5[Configure Multi-Round Interview Templates]
    H5 --> H6[Monitor Recruiter-Submitted Shortlists]
    H6 --> H7{Review Candidate Profile}
    H7 -- "Reject" --> H8[Provide Rejection Reason - Status: HIRING_MANAGER_REJECTED]
    H7 -- "Approve" --> H9[Request Interview Round - Technical / Managerial]
    H9 --> H10[Wait for Recruiter & Candidate Slot Coordination]
    H10 --> H11[Conduct Interview Round]
    H11 --> H12[Submit Structured Evaluation & Scorecard]
    H12 --> H13{Evaluation Outcome}
    H13 -- "No-Go" --> H14[Mark INTERVIEW_NO_GO - Rejection Notified]
    H13 -- "Next Round" --> H9
    H13 -- "Go" --> H15[Mark INTERVIEW_GO - Advance to Compensation Discussion]
    H15 --> H16[Review Recruiter-Drafted Offer Letter & Salary Breakdown]
    H16 --> H17{Offer Approval}
    H17 -- "Request Changes" --> H18[Return to Recruiter for Revision]
    H17 -- "Approve" --> H19[Approve Offer - Dispatched to Candidate]
    H19 --> H20[Track Hiring Pipeline Metrics & Department Analytics]
```

### 2.3 Recruiter Workflow
```mermaid
flowchart TD
    R1[Login as Recruiter] --> R2[Access Recruiter Dashboard & Action Center]
    R2 --> R3[Inspect Active Job Requisitions]
    R3 --> R4[Trigger Multi-Factor Matching Engine on Job]
    R4 --> R5[View Ranked Candidate Fit Scores & Breakdown]
    R5 --> R6[Claim Candidate for Sourcing Pipeline]
    R6 --> R7[Inspect Resume Evidence & Verified Skills]
    R7 --> R8{Screening Decision}
    R8 -- "Reject" --> R9[Mark Rejected with Audit Reason]
    R8 -- "Shortlist" --> R10[Submit Candidate with Recruiter Notes to Hiring Manager]
    R10 --> R11[Wait for HM Interview Request]
    R11 --> R12[Propose 2-4 Available Interview Slots]
    R12 --> R13[Candidate Selects Slot via Token Link]
    R13 --> R14[Confirm Meeting Link - Zoom / Google Meet]
    R14 --> R15[Track Interview Completion & HM Evaluation]
    R15 --> R16[Engage in Compensation Discussion with Candidate]
    R16 --> R17[Draft Offer Details - Base, Variable, Relocation, Joining Date]
    R17 --> R18[Submit Offer for HR Executive Approval]
    R18 --> R19[Dispatched Approved Offer PDF & Track Acceptance]
```

### 2.4 Admin Workflow
```mermaid
flowchart TD
    A1[Login as System Admin] --> A2[Access Admin Console]
    A2 --> A3[Manage System Users - Create HR, Recruiter, Admin Accounts]
    A3 --> A4[Deactivate / Reactivate User Accounts]
    A2 --> A5[Curate Global Skill Taxonomy - Add, Categorize, Rename]
    A2 --> A6[Audit System Security & Inspect Global Audit Log Timeline]
    A2 --> A7[Inspect System Health & Database Performance Metrics]
```

---

## 3. Enterprise Status & State Machines

### 3.1 21-State Recruitment Workflow State Machine
The core candidate-job relationship is governed by the `pipeline_state` column on [MatchResult](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/models/match_result.py). Every transition is verified against the `VALID_TRANSITIONS` dictionary in [workflow_service.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/services/workflow_service.py):

```mermaid
stateDiagram-v2
    [*] --> CANDIDATE_MATCHED
    
    CANDIDATE_MATCHED --> CANDIDATE_SHORTLISTED: Recruiter Shortlists
    CANDIDATE_MATCHED --> SENT_TO_HIRING_MANAGER: Direct Submission
    CANDIDATE_MATCHED --> REJECTED: Reject
    
    CANDIDATE_SHORTLISTED --> SENT_TO_HIRING_MANAGER: Submit to HM
    CANDIDATE_SHORTLISTED --> REJECTED: Reject
    
    SENT_TO_HIRING_MANAGER --> HIRING_MANAGER_REVIEW: HM Opens Candidate
    SENT_TO_HIRING_MANAGER --> REJECTED: Reject
    
    HIRING_MANAGER_REVIEW --> HIRING_MANAGER_REJECTED: HM Declines Candidate
    HIRING_MANAGER_REVIEW --> INTERVIEW_REQUESTED: HM Requests Interview
    HIRING_MANAGER_REVIEW --> REJECTED: Reject
    
    HIRING_MANAGER_REJECTED --> REJECTED: Finalized
    
    INTERVIEW_REQUESTED --> INTERVIEW_SLOTS_PROPOSED: Recruiter Adds Slots
    INTERVIEW_REQUESTED --> REJECTED: Reject
    
    INTERVIEW_SLOTS_PROPOSED --> WAITING_FOR_CANDIDATE_SLOT: Notification Sent
    INTERVIEW_SLOTS_PROPOSED --> REJECTED: Reject
    
    WAITING_FOR_CANDIDATE_SLOT --> CANDIDATE_SLOT_SELECTED: Candidate Picks Slot
    WAITING_FOR_CANDIDATE_SLOT --> REJECTED: Reject
    
    CANDIDATE_SLOT_SELECTED --> INTERVIEW_CONFIRMED: Recruiter Confirms
    CANDIDATE_SLOT_SELECTED --> REJECTED: Reject
    
    INTERVIEW_CONFIRMED --> INTERVIEW_COMPLETED: Interview Occurs
    INTERVIEW_CONFIRMED --> REJECTED: Reject
    
    INTERVIEW_COMPLETED --> WAITING_FOR_HM_FEEDBACK: Awaiting Scorecard
    INTERVIEW_COMPLETED --> REJECTED: Reject
    
    WAITING_FOR_HM_FEEDBACK --> INTERVIEW_GO: Positive Evaluation
    WAITING_FOR_HM_FEEDBACK --> INTERVIEW_NO_GO: Negative Evaluation
    WAITING_FOR_HM_FEEDBACK --> REJECTED: Reject
    
    INTERVIEW_NO_GO --> REJECTED: Rejection Finalized
    
    INTERVIEW_GO --> INTERVIEW_REQUESTED: Request Next Round
    INTERVIEW_GO --> COMPENSATION_DISCUSSION: Proceed to Offer
    INTERVIEW_GO --> REJECTED: Reject
    
    COMPENSATION_DISCUSSION --> OFFER_CREATED: Recruiter Drafts Terms
    COMPENSATION_DISCUSSION --> REJECTED: Reject
    
    OFFER_CREATED --> OFFER_SENT: HR Approves & Dispatches
    OFFER_CREATED --> REJECTED: Reject
    
    OFFER_SENT --> OFFER_ACCEPTED: Candidate Accepts
    OFFER_SENT --> OFFER_REJECTED: Candidate Declines
    OFFER_SENT --> REJECTED: Offer Rescinded
    
    OFFER_ACCEPTED --> HIRED: Final Onboarding
    OFFER_REJECTED --> BLACKLISTED: 6-Month Cooling-Off Applied
    
    BLACKLISTED --> [*]
    HIRED --> [*]
    REJECTED --> [*]
```

### 3.2 Formal State Transition Matrix
| Source State (`from_state`) | Permitted Target States (`to_state`) | Required User Role | Triggering API Endpoint |
| :--- | :--- | :--- | :--- |
| `CANDIDATE_MATCHED` | `CANDIDATE_SHORTLISTED`, `SENT_TO_HIRING_MANAGER`, `HIRING_MANAGER_REVIEW`, `INTERVIEW_REQUESTED`, `INTERVIEW_SLOTS_PROPOSED`, `REJECTED` | Recruiter, HR, Admin | `POST /api/workflow/shortlist` |
| `CANDIDATE_SHORTLISTED` | `SENT_TO_HIRING_MANAGER`, `HIRING_MANAGER_REVIEW`, `INTERVIEW_REQUESTED`, `INTERVIEW_SLOTS_PROPOSED`, `REJECTED` | Recruiter, HR, Admin | `POST /api/workflow/submit-to-hm` |
| `SENT_TO_HIRING_MANAGER` | `HIRING_MANAGER_REVIEW`, `INTERVIEW_REQUESTED`, `INTERVIEW_SLOTS_PROPOSED`, `REJECTED` | HR, Admin | `POST /api/workflow/hm-review` |
| `HIRING_MANAGER_REVIEW` | `HIRING_MANAGER_REJECTED`, `INTERVIEW_REQUESTED`, `INTERVIEW_SLOTS_PROPOSED`, `REJECTED` | HR, Admin | `POST /api/workflow/hm-reject`, `POST /api/workflow/request-interview` |
| `HIRING_MANAGER_REJECTED`| `REJECTED` | HR, Recruiter, Admin | `POST /api/workflow/reject` |
| `INTERVIEW_REQUESTED` | `INTERVIEW_SLOTS_PROPOSED`, `WAITING_FOR_CANDIDATE_SLOT`, `CANDIDATE_SLOT_SELECTED`, `REJECTED` | Recruiter, HR, Admin | `POST /api/workflow/send-slots` |
| `INTERVIEW_SLOTS_PROPOSED`| `WAITING_FOR_CANDIDATE_SLOT`, `CANDIDATE_SLOT_SELECTED`, `INTERVIEW_CONFIRMED`, `REJECTED` | Recruiter, Candidate, Admin | `POST /api/workflow/select-slot` |
| `WAITING_FOR_CANDIDATE_SLOT`| `CANDIDATE_SLOT_SELECTED`, `INTERVIEW_CONFIRMED`, `REJECTED` | Candidate, Recruiter, Admin | `POST /api/workflow/select-slot` |
| `CANDIDATE_SLOT_SELECTED`| `INTERVIEW_CONFIRMED`, `REJECTED` | Recruiter, HR, Admin | `POST /api/workflow/confirm-interview` |
| `INTERVIEW_CONFIRMED` | `INTERVIEW_COMPLETED`, `REJECTED` | Recruiter, HR, Admin | `POST /api/workflow/complete-interview` |
| `INTERVIEW_COMPLETED` | `WAITING_FOR_HM_FEEDBACK`, `INTERVIEW_GO`, `COMPENSATION_DISCUSSION`, `REJECTED` | HR, Admin | `POST /api/workflow/hm-feedback` |
| `WAITING_FOR_HM_FEEDBACK`| `INTERVIEW_GO`, `INTERVIEW_NO_GO`, `COMPENSATION_DISCUSSION`, `REJECTED` | HR, Admin | `POST /api/workflow/hm-feedback` |
| `INTERVIEW_GO` | `COMPENSATION_DISCUSSION`, `INTERVIEW_REQUESTED`, `REJECTED` | Recruiter, HR, Admin | `POST /api/workflow/compensation` |
| `INTERVIEW_NO_GO` | `REJECTED` | HR, Recruiter, Admin | `POST /api/workflow/reject` |
| `COMPENSATION_DISCUSSION`| `OFFER_CREATED`, `INTERVIEW_REQUESTED`, `REJECTED` | Recruiter, HR, Admin | `POST /api/workflow/create-offer` |
| `OFFER_CREATED` | `OFFER_SENT`, `OFFER_CREATED`, `REJECTED` | HR, Recruiter, Admin | `POST /api/workflow/send-offer` |
| `OFFER_SENT` | `OFFER_ACCEPTED`, `OFFER_REJECTED`, `REJECTED` | Candidate, HR, Admin | `POST /api/offers/respond` |
| `OFFER_ACCEPTED` | `HIRED` | HR, Recruiter, Admin | Automated / Manual Transition |
| `OFFER_REJECTED` | `BLACKLISTED` | System Automated | Enforced via `workflow_service.py` |
| `BLACKLISTED` | Terminal State (No outgoing transitions) | System | N/A |
| `HIRED` | Terminal State (No outgoing transitions) | System | N/A |
| `REJECTED` | Terminal State (No outgoing transitions) | System | N/A |

### 3.3 Supporting Sub-Entity State Machines

#### 3.3.1 Offer Entity State Machine (`Offer.status`)
```mermaid
stateDiagram-v2
    [*] --> DRAFT: Recruiter Drafts Offer
    DRAFT --> PENDING_HR_APPROVAL: Submitted for Approval
    PENDING_HR_APPROVAL --> DRAFT: HR Requests Revision
    PENDING_HR_APPROVAL --> APPROVED_BY_HR: HR Approves Offer
    APPROVED_BY_HR --> SENT: Dispatched via SendGrid with Token
    SENT --> ACCEPTED: Candidate Signs & Accepts
    SENT --> DECLINED: Candidate Rejects
    SENT --> EXPIRED: Expiration Date Reached
    SENT --> CANCELLED: Offer Rescinded by Company
    ACCEPTED --> [*]
    DECLINED --> [*]
    EXPIRED --> [*]
    CANCELLED --> [*]
```

#### 3.3.2 Interview Slot State Machine (`InterviewSlot.status`)
```mermaid
stateDiagram-v2
    [*] --> proposed: Recruiter Adds Available Slot
    proposed --> selected: Candidate Selects Slot via Token
    selected --> confirmed: Recruiter Confirms & Meeting Link Added
    proposed --> cancelled: Interview Cancelled / Other Slot Picked
    selected --> cancelled: Slot Overwritten
    confirmed --> [*]
    cancelled --> [*]
```

#### 3.3.3 Candidate 6-Month Blacklist State Machine (`CandidateBlacklist`)
```mermaid
stateDiagram-v2
    [*] --> ActiveBlacklist: Candidate Declines Offer / Fails Final Stage
    ActiveBlacklist --> ActiveBlacklist: Filtered out from HR Screened Queue
    ActiveBlacklist --> ExpiredBlacklist: Current Time > blacklisted_until (6 Months)
    ExpiredBlacklist --> ReEligible: Candidate Allowed in New Matching Runs
    ReEligible --> [*]
```

---

## 4. Business Rules & Governance Policies

The following business rules are strictly encoded in the application logic:

1. **Requisition Ownership & Skill Weighting**:
   - Only **HR** and **Admin** users can create or edit Job Requisitions ([jobs.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/routers/jobs.py)).
   - Every job must specify between 1 and 20 skills, each with a required integer weight from **1** (low) to **5** (critical) and requirement type (`MUST_HAVE` or `NICE_TO_HAVE`).
2. **Matching Engine Determinism**:
   - Matching is 100% deterministic and reproducible. Running matching multiple times on the same candidate and job yields the exact same floating-point score ([matching_service.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/services/matching_service.py)).
   - Candidates without a single matching skill receive an overall score of strictly **0.00**.
3. **Resume Evidence Multiplier**:
   - Skills self-declared by candidates receive standard proficiency factors (`Beginner` = 0.40, `Intermediate` = 0.70, `Expert` = 1.00).
   - Skills detected in the candidate's resume with extracted contextual evidence snippets receive a **1.15x multiplier bonus** (capped at 1.00).
4. **Recruiter Claiming & Conflict Prevention**:
   - Recruiters can claim unassigned candidates for active jobs ([recruiter.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/routers/recruiter.py)).
   - Claiming assigns `recruiter_id` on the `MatchResult` and creates a record in `candidate_recruiter_assignments` with `status = 'active'`.
5. **Interview Slot Selection**:
   - When proposing interview slots, recruiters must provide between 1 and 5 non-conflicting time windows.
   - Candidates can select a slot via a cryptographically random public token (`interview.selection_token`) without requiring prior system login.
6. **Hiring Manager Evaluation Integrity**:
   - An interview cannot be marked `INTERVIEW_COMPLETED` without recording the completion timestamp.
   - Go/No-Go feedback requires numeric ratings (1-5) across Communication, Technical Competency, and Problem Solving, accompanied by qualitative notes.
7. **Offer Approval Dual-Control**:
   - Recruiters draft offers, but cannot dispatch them directly without explicit HR Manager approval (`Offer.status == 'APPROVED_BY_HR'`).
8. **Automated 6-Month Cooling-Off (Blacklisting)**:
   - If a candidate declines a formal offer (`OFFER_REJECTED` / `DECLINED`), the system automatically creates a `CandidateBlacklist` record with `blacklisted_until = now() + 180 days`.
   - Blacklisted candidates are automatically suppressed and flagged in recruiter match queries until the expiration date.

---

## 5. System Data Flow Diagrams (DFDs)

### 5.1 Level-1 DFD: Candidate Resume Ingestion & Profile Synchronization

```mermaid
flowchart LR
    Candidate([Candidate]) -- "1. Uploads PDF/DOCX" --> API[Resume API Router]
    API -- "2. Raw Bytes" --> StorMgr[Storage Manager]
    StorMgr -- "3. Store Original" --> S3[(AWS S3 / Local Disk)]
    API -- "4. Raw Bytes" --> Extractor[Text Extractor pdfplumber]
    Extractor -- "5. Clean Plaintext" --> Parser[Deterministic Rule Parser]
    Parser -- "6. Structured JSON" --> DB[(PostgreSQL)]
    DB -- "7. Sync Skills" --> CandSkills[(candidate_skills)]
    DB -- "8. Update Profile" --> CandRecord[(candidates)]
```

### 5.2 Level-1 DFD: Multi-Factor Candidate-Job Matching Flow

```mermaid
flowchart LR
    Recruiter([Recruiter]) -- "1. Run Match(job_id)" --> MatchAPI[Matching Router]
    MatchAPI -- "2. Fetch Job & Skills" --> DB[(PostgreSQL)]
    DB -- "3. Job Data (Weights, Min Exp, Mode)" --> MatchEngine[Matching Service]
    DB -- "4. All Candidate Records & Skills" --> MatchEngine
    MatchEngine -- "5. Calculate 4 Factors" --> MathLogic[Scoring Matrix]
    MathLogic -- "6. overall_score (0-100)" --> DB
    DB -- "7. Persist MatchResults" --> MatchResults[(match_results)]
    MatchResults -- "8. Ranked Matches" --> Recruiter
```

### 5.3 Level-1 DFD: Offer Drafting, Approval & PDF Generation Flow

```mermaid
flowchart LR
    Recruiter([Recruiter]) -- "1. Draft Offer Terms" --> WorkAPI[Workflow Router]
    WorkAPI -- "2. Create Offer (DRAFT)" --> DB[(PostgreSQL)]
    HR([HR Manager]) -- "3. Review & Approve" --> WorkAPI
    WorkAPI -- "4. Status: APPROVED" --> PDFEngine[ReportLab OfferPDFService]
    PDFEngine -- "5. Annexure A/B Binary PDF" --> S3[(Storage Subsystem)]
    WorkAPI -- "6. Send Email + Secure Token" --> SendGrid[SendGrid API]
    SendGrid -- "7. Email with Token Link" --> Candidate([Candidate])
    Candidate -- "8. Accept / Decline" --> OfferAPI[Offers Router]
    OfferAPI -- "9. Update Status / Trigger Blacklist" --> DB
```

---

*Proceed to [Volume 03: Functional Specification Document & Use Cases](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/docs/03_FUNCTIONAL_SPECIFICATION_DOCUMENT.md) for detailed feature requirements and testable use cases.*
