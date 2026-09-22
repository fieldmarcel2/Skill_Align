# SkillAlign — Engineering Technical Documentation Package

Welcome to the comprehensive, engineering-level technical documentation suite for **SkillAlign** — an intelligent recruitment, resume parsing, and multi-factor candidate-job matching platform.

All documentation is available in both **Markdown (.md)** and executive-grade **Microsoft Word (.docx)** formats with embedded high-resolution visual flowcharts, sequence diagrams, ERDs, and architecture diagrams.

---

## 📚 Documentation Volumes Directory (Word .docx & Markdown)

The documentation is organized into 9 specialized, standalone technical volumes plus a unified master volume:

| Volume | Microsoft Word (.docx) Format | Markdown (.md) Format | Description & Core Coverage |
| :---: | :--- | :--- | :--- |
| **Master** | [**SkillAlign_Complete_System_Specification.docx**](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/docs/SkillAlign_Complete_System_Specification.docx) | *Consolidated Master* | Complete 9-volume unified engineering reference specification (4.0 MB). |
| **Guide** | [**SkillAlign_Master_Documentation_Guide.docx**](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/docs/SkillAlign_Master_Documentation_Guide.docx) | [README.md](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/docs/README.md) | Platform overview, volume index, and feature implementation matrix. |
| **01** | [**01_EXECUTIVE_OVERVIEW.docx**](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/docs/01_EXECUTIVE_OVERVIEW_AND_SYSTEM_ARCHITECTURE.docx) | [01_EXECUTIVE_OVERVIEW.md](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/docs/01_EXECUTIVE_OVERVIEW_AND_SYSTEM_ARCHITECTURE.md) | Problem statement, target actors, verified tech stack, 6-tier system architecture. |
| **02** | [**02_END_TO_END_WORKFLOWS.docx**](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/docs/02_END_TO_END_WORKFLOWS_AND_STATE_MACHINES.docx) | [02_END_TO_END_WORKFLOWS.md](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/docs/02_END_TO_END_WORKFLOWS_AND_STATE_MACHINES.md) | 21-state recruitment state machine, role workflows (Candidate, HR, Recruiter), DFDs. |
| **03** | [**03_FUNCTIONAL_SPECIFICATION.docx**](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/docs/03_FUNCTIONAL_SPECIFICATION_DOCUMENT.docx) | [03_FUNCTIONAL_SPECIFICATION.md](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/docs/03_FUNCTIONAL_SPECIFICATION_DOCUMENT.md) | Features F-001 through F-026, preconditions, main/alt flows, error matrices. |
| **04** | [**04_MATCHING_ENGINE.docx**](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/docs/04_MATCHING_ENGINE_AND_RESUME_PROCESSING.docx) | [04_MATCHING_ENGINE.md](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/docs/04_MATCHING_ENGINE_AND_RESUME_PROCESSING.md) | 4-factor scoring model (60% Skill + 20% Exp + 10% Edu + 10% Mode), evidence bonus, parser. |
| **05** | [**05_DATABASE_DESIGN_AND_ERD.docx**](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/docs/05_DATABASE_DESIGN_AND_ERD.docx) | [05_DATABASE_DESIGN_AND_ERD.md](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/docs/05_DATABASE_DESIGN_AND_ERD.md) | 23 SQLAlchemy models, 3NF/BCNF normalization, foreign key constraints, ERD diagram. |
| **06** | [**06_API_INVENTORY.docx**](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/docs/06_API_INVENTORY_AND_INTEGRATION_GUIDE.docx) | [06_API_INVENTORY.md](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/docs/06_API_INVENTORY_AND_INTEGRATION_GUIDE.md) | 54 REST endpoints, Axios JWT interceptors, API-to-Database traceability matrix. |
| **07** | [**07_SECURITY_ERROR_HANDLING.docx**](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/docs/07_SECURITY_ERROR_HANDLING_AND_RBAC.docx) | [07_SECURITY_ERROR_HANDLING_AND_RBAC.md](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/docs/07_SECURITY_ERROR_HANDLING_AND_RBAC.md) | 7-layer defense, SlowAPI rate limiting, Bcrypt, 8 detailed sequence diagrams. |
| **08** | [**08_CODEBASE_STRUCTURE.docx**](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/docs/08_FRONTEND_AND_BACKEND_CODEBASE_STRUCTURE.docx) | [08_FRONTEND_AND_BACKEND_CODEBASE_STRUCTURE.md](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/docs/08_FRONTEND_AND_BACKEND_CODEBASE_STRUCTURE.md) | Frontend/Backend tree, Celery/Redis, S3 storage, 100 to 1M scaling roadmap. |
| **09** | [**09_DEMO_SCRIPT_AND_QA.docx**](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/docs/09_ENGINEERING_DEMO_SCRIPT_AND_QA.docx) | [09_ENGINEERING_DEMO_SCRIPT_AND_QA.md](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/docs/09_ENGINEERING_DEMO_SCRIPT_AND_QA.md) | 15-step Postman flow, timed demo script, 25+ technical defense Q&As. |

---

## 🎨 High-Resolution Visual Flow Diagrams (`docs/diagrams/`)

All diagrams are rendered in vector-quality high-resolution PNG (300 DPI) and embedded in the Word documents:

* [**fig_00_platform_overview.png**](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/docs/diagrams/fig_00_platform_overview.png) — Master Platform Ecosystem Architecture
* [**fig_01_arch_layers.png**](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/docs/diagrams/fig_01_arch_layers.png) — 6-Tier Layered System Architecture
* [**fig_02_recruitment_lifecycle.png**](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/docs/diagrams/fig_02_recruitment_lifecycle.png) — End-to-End Recruitment Lifecycle Flowchart
* [**fig_02_role_workflows.png**](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/docs/diagrams/fig_02_role_workflows.png) — Role-Specific Workflows (Candidate, HR/HM, Recruiter)
* [**fig_02_state_machine.png**](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/docs/diagrams/fig_02_state_machine.png) — 21-State Recruitment State Machine Transition Graph
* [**fig_03_fsd_feature_map.png**](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/docs/diagrams/fig_03_fsd_feature_map.png) — Functional Feature Map & Architecture
* [**fig_04_matching_engine.png**](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/docs/diagrams/fig_04_matching_engine.png) — 4-Factor Matching Score Weight Distribution & Bonus Impact
* [**fig_04_resume_pipeline.png**](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/docs/diagrams/fig_04_resume_pipeline.png) — Deterministic Resume Extraction & Rule-Based Parsing
* [**fig_05_erd.png**](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/docs/diagrams/fig_05_erd.png) — 23-Entity Relational Database Schema & ERD
* [**fig_06_api_gateway.png**](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/docs/diagrams/fig_06_api_gateway.png) — FastAPI REST API Routing & Request Dispatch Flow
* [**fig_07_security_layers.png**](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/docs/diagrams/fig_07_security_layers.png) — 7-Layer Defense-in-Depth Security Model
* [**fig_07_seq_auth_jwt.png**](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/docs/diagrams/fig_07_seq_auth_jwt.png) — User Authentication & JWT Issuance Sequence
* [**fig_07_seq_offer_generation.png**](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/docs/diagrams/fig_07_seq_offer_generation.png) — Offer Letter Generation & PDF Signing Sequence
* [**fig_08_deployment_topology.png**](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/docs/diagrams/fig_08_deployment_topology.png) — Production Deployment & Cluster Topology
* [**fig_09_api_demo_flow.png**](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/docs/diagrams/fig_09_api_demo_flow.png) — 15-Step Live API / Postman Engineering Demo Flow

---

## 🛠️ Implementation Status Verification Summary

| Component / Subsystem | Implementation Status | Primary Code Files |
| :--- | :--- | :--- |
| **JWT Authentication & RBAC** | **Implemented** | [auth.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/routers/auth.py), [security.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/core/security.py), [dependencies.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/core/dependencies.py) |
| **Phone OTP Verification** | **Implemented** | [otp_service.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/services/otp_service.py), [sms_service.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/services/sms_service.py) |
| **Password Reset (SHA-256 Hash Tokens)** | **Implemented** | [auth_service.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/services/auth_service.py), [email_service.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/services/email_service.py) |
| **Deterministic Resume Text Extraction** | **Implemented** | [resume_text_extractor.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/services/resume_text_extractor.py) (pdfplumber, docx, txt) |
| **Rule-Based Resume Parser & Skill Sync** | **Implemented** | [resume_txt_parser.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/services/resume_txt_parser.py), [resume_service.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/services/resume_service.py) |
| **Multi-Factor Weighted Matching Engine** | **Implemented** | [matching_service.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/services/matching_service.py), [matching.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/routers/matching.py) |
| **Google Gemini Semantic Analysis** | **Implemented** | [gemini_service.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/services/gemini_service.py) (Direct REST API with fallback) |
| **21-State Recruitment State Machine** | **Implemented** | [workflow_service.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/services/workflow_service.py), [workflow.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/routers/workflow.py) |
| **Multi-Round Interview Management** | **Implemented** | [interviews.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/routers/interviews.py), [job_interview_round.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/models/job_interview_round.py) |
| **Candidate Slot Selection via Token** | **Implemented** | [CandidateSlotPickerModal.tsx](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/frontend/src/components/candidate/CandidateSlotPickerModal.tsx), [workflow_service.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/services/workflow_service.py) |
| **Interview Feedback & Go/No-Go Decision** | **Implemented** | [HMFeedbackPage.tsx](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/frontend/src/pages/hr/HMFeedbackPage.tsx), [interview_feedback.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/models/interview_feedback.py) |
| **Offer Letter Generation & ReportLab PDF** | **Implemented** | [offer_pdf_service.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/services/offer_pdf_service.py), [offer.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/models/offer.py) |
| **6-Month Rejection Blacklisting** | **Implemented** | [candidate_blacklist.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/models/candidate_blacklist.py), [workflow_service.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/services/workflow_service.py) |
| **Recruiter Claiming & Action Center** | **Implemented** | [recruiter.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/routers/recruiter.py), [ActionCenterPage.tsx](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/frontend/src/pages/recruiter/ActionCenterPage.tsx) |
| **In-App & Email Notifications (SendGrid)** | **Implemented** | [notification.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/models/notification.py), [email_service.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/services/email_service.py) |
| **Celery Async Worker / Redis Task Queue** | **Implemented** | [celery_app.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/celery_app.py), [resume_tasks.py](file:///c:/Users/shiva/OneDrive/Desktop/SkillAlign/backend/app/tasks/resume_tasks.py) |
| **LangChain / ChromaDB / Vector RAG** | **Not Implemented / Configured Only** | Present in dependencies/docs, but execution uses deterministic regex + direct Gemini REST. |

---

*Navigate to any document above to inspect the full engineering specifications, mathematical formulas, and live demo flows in Word or Markdown format.*
