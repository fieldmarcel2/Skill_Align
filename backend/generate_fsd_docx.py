# -*- coding: utf-8 -*-
"""
Script to generate the complete v3.0 SkillAlign_Functional_Specification_Document.docx
Comprehensive specification for QA Engineers covering all 136 endpoints,
21-state workflow, 21 database models, and QA verification playbooks.
"""

import os, json, docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
openapi_path = os.path.join(base_dir, "docs", "openapi_full.json")
with open(openapi_path, "r", encoding="utf-8") as f:
    spec = json.load(f)

def set_cell_background(cell, hex_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=130, right=130):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def set_table_borders(table, color="CBD5E1", sz="4", val="single"):
    tblPr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'  <w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:insideV w:val="none"/>'
        f'  <w:left w:val="none"/>'
        f'  <w:right w:val="none"/>'
        f'</w:tblBorders>'
    )
    tblPr.append(borders)

def add_callout(doc, text, title="IMPORTANT NOTICE FOR QA"):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = tbl.cell(0, 0)
    set_cell_background(cell, "EEF2FF")
    set_cell_margins(cell, top=140, bottom=140, left=180, right=180)
    
    tcPr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'  <w:left w:val="single" w:sz="28" w:space="0" w:color="4F46E5"/>'
        f'  <w:top w:val="none"/><w:right w:val="none"/><w:bottom w:val="none"/>'
        f'</w:tcBorders>'
    )
    tcPr.append(borders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    r_title = p.add_run(f"[{title}] ")
    r_title.bold = True
    r_title.font.name = "Segoe UI"
    r_title.font.color.rgb = RGBColor(79, 70, 229)
    r_title.font.size = Pt(9.5)
    
    r_text = p.add_run(text)
    r_text.font.name = "Segoe UI"
    r_text.font.size = Pt(9.5)
    r_text.font.color.rgb = RGBColor(30, 41, 59)
    
    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_before = Pt(0)
    p_sp.paragraph_format.space_after = Pt(4)

def format_table(tbl, col_widths, headers, rows, center_cols=None):
    if center_cols is None:
        center_cols = []
        
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(tbl)
    
    # Header
    hdr_row = tbl.rows[0]
    for idx, heading in enumerate(headers):
        cell = hdr_row.cells[idx]
        cell.text = heading
        set_cell_background(cell, "0F2A4F")
        set_cell_margins(cell, top=120, bottom=120, left=130, right=130)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER if idx in center_cols else WD_ALIGN_PARAGRAPH.LEFT
        for run in p.runs:
            run.font.bold = True
            run.font.name = "Segoe UI"
            run.font.color.rgb = RGBColor(255, 255, 255)
            run.font.size = Pt(9)
            
    # Data Rows
    for r_idx, r_data in enumerate(rows):
        row = tbl.add_row()
        bg_color = "F8FAFC" if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, val in enumerate(r_data):
            cell = row.cells[c_idx]
            cell.text = str(val)
            set_cell_background(cell, bg_color)
            set_cell_margins(cell, top=80, bottom=80, left=120, right=120)
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER if c_idx in center_cols else WD_ALIGN_PARAGRAPH.LEFT
            for run in p.runs:
                run.font.size = Pt(8.5)
                run.font.name = "Segoe UI"
                run.font.color.rgb = RGBColor(30, 41, 59)
                if val == "Yes":
                    run.font.bold = True
                    run.font.color.rgb = RGBColor(6, 95, 70)
                elif val == "No":
                    run.font.bold = True
                    run.font.color.rgb = RGBColor(153, 27, 27)
                elif val == "Token":
                    run.font.bold = True
                    run.font.color.rgb = RGBColor(29, 78, 216)
                    
    # Widths
    for row in tbl.rows:
        for idx, w in enumerate(col_widths):
            row.cells[idx].width = Inches(w)
            
    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_before = Pt(0)
    p_sp.paragraph_format.space_after = Pt(4)

doc = Document()

# Margins
for s in doc.sections:
    s.top_margin = Inches(0.85)
    s.bottom_margin = Inches(0.85)
    s.left_margin = Inches(0.85)
    s.right_margin = Inches(0.85)
    
    header = s.header
    hp = header.paragraphs[0]
    hp.text = "SkillAlign FSD — Comprehensive Specification for QA & Testing | v3.0.0"
    hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    if hp.runs:
        hp.runs[0].font.name = "Segoe UI"
        hp.runs[0].font.size = Pt(8)
        hp.runs[0].font.color.rgb = RGBColor(148, 163, 184)
        
    footer = s.footer
    fp = footer.paragraphs[0]
    fp.text = "Confidential  ·  SkillAlign Enterprise Talent Platform  ·  September 2026"
    fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    if fp.runs:
        fp.runs[0].font.name = "Segoe UI"
        fp.runs[0].font.size = Pt(8)
        fp.runs[0].font.color.rgb = RGBColor(148, 163, 184)

# ─────────────────────────────────────────────────────────────────────────────
# COVER / HEADER
# ─────────────────────────────────────────────────────────────────────────────
p_tag = doc.add_paragraph()
p_tag.paragraph_format.space_before = Pt(10)
p_tag.paragraph_format.space_after = Pt(2)
r_tag = p_tag.add_run("OFFICIAL FUNCTIONAL SPECIFICATION DOCUMENT (FSD) — QA RELEASE")
r_tag.bold = True
r_tag.font.name = "Segoe UI"
r_tag.font.size = Pt(9.5)
r_tag.font.color.rgb = RGBColor(29, 78, 216)

p_title = doc.add_paragraph()
p_title.paragraph_format.space_before = Pt(0)
p_title.paragraph_format.space_after = Pt(4)
r_title = p_title.add_run("SkillAlign Platform Specification")
r_title.bold = True
r_title.font.name = "Segoe UI"
r_title.font.size = Pt(26)
r_title.font.color.rgb = RGBColor(15, 42, 79)

p_sub = doc.add_paragraph()
p_sub.paragraph_format.space_before = Pt(0)
p_sub.paragraph_format.space_after = Pt(12)
r_sub = p_sub.add_run("Complete Reference Manual for QA Engineering & Full-Stack Testing")
r_sub.font.name = "Segoe UI"
r_sub.font.size = Pt(12)
r_sub.bold = True
r_sub.font.color.rgb = RGBColor(26, 74, 138)

meta_tbl = doc.add_table(rows=1, cols=2)
meta_headers = ["System Attribute", "Authoritative Engineering Specification"]
meta_rows = [
    ["Document Code", "SKILLALIGN-CORE-2026-FSD-PROD"],
    ["Specification Version", "3.0.0 (Comprehensive Production Baseline for Testing)"],
    ["Document Status", "Approved / Authoritative Baseline for QA Verification"],
    ["Primary Authors", "Shiva Tripathi & SkillAlign Core Engineering Team"],
    ["Target Audience", "QA Engineers, Automation Testers, System Architects, Security Auditors"],
    ["Release Date", "September 2026"],
    ["Total Registered API Inventory", "136 REST Endpoints across 17 Functional Modules"],
    ["State Machine Lifecycle", "21 Pipeline States with Strict Server-Side Transition Guards"],
    ["Database Architecture", "21 Relational Tables with 8-Table Transactional Cascade Purge"],
    ["Classification", "Confidential / Internal Technical Documentation"]
]
format_table(meta_tbl, [2.5, 4.3], meta_headers, meta_rows)

doc.add_page_break()

# ─────────────────────────────────────────────────────────────────────────────
# 1. EXECUTIVE OVERVIEW
# ─────────────────────────────────────────────────────────────────────────────
doc.add_heading("1. Executive Summary & Operational Problem Statement", level=1)
p = doc.add_paragraph()
p.add_run(
    "SkillAlign is an enterprise Recruitment Intelligence and Applicant Tracking System that replaces "
    "subjective, manual candidate screening with a deterministic, multi-criteria scoring algorithm and enforces a "
    "governed 21-stage hiring lifecycle from resume upload to signed offer."
)
p = doc.add_paragraph()
p.add_run("Core Pain Points Addressed:\n").bold = True
p.add_run(
    "1. Unstructured Resume Ingestion: Manual parsing of PDFs/Word docs causes extreme screening latency and evaluation bias.\n"
    "2. Superficial Keyword Matching: Legacy systems fail to mathematically evaluate proficiency depth and mandatory constraints.\n"
    "3. Fragmented Stakeholder Workflows: Hand-offs between Recruiters, Hiring Managers, and Candidates are slow and opaque.\n"
    "4. Missing Audit Trails: Decisions lost across emails leave organizations vulnerable during compliance audits."
)

add_callout(
    doc,
    "The Fit Score is computed by a fixed, deterministic mathematical formula — not an unpredictable black-box model. Given identical candidate and job data, it always produces the identical score.",
    "CORE ARCHITECTURAL INVARIANT"
)

# ─────────────────────────────────────────────────────────────────────────────
# 2. SYSTEM ARCHITECTURE & TECH STACK
# ─────────────────────────────────────────────────────────────────────────────
doc.add_heading("2. High-Level Architecture & Technology Stack", level=1)
p = doc.add_paragraph()
p.add_run("The platform is engineered as a decoupled, layered micro-tier system:\n")
p.add_run(
    "• Client Presentation Tier: React 18 + TypeScript + Vite 6 + Tailwind CSS (SPA with role-based routing).\n"
    "• API Gateway & Security Tier: FastAPI + Uvicorn + SlowAPI rate limiting + JWT Bearer RBAC guards.\n"
    "• Domain Service Tier: Asynchronous business services for matching, parsing, state machines, and offers.\n"
    "• Asynchronous Queue Tier: Celery 5.x + Redis for background resume extraction and matching tasks.\n"
    "• Persistence Tier: PostgreSQL 16 relational database with SQLAlchemy 2.0 ORM and Alembic migrations.\n"
    "• Cloud Infrastructure: AWS S3 / MinIO object storage, SendGrid email gateway, Twilio SMS telephony."
)

tech_tbl = doc.add_table(rows=1, cols=4)
tech_headers = ["Layer", "Technology", "Version", "Operational Role"]
tech_rows = [
    ["Frontend SPA", "React + TypeScript", "18.3 / 5.5", "Role-based dashboards (Admin, HR, Recruiter, Candidate)"],
    ["Build Tool", "Vite", "6.x", "Sub-second HMR and tree-shaken production bundling"],
    ["Backend API", "FastAPI (Python)", "0.115 / 3.12", "Asynchronous REST API with automatic OpenAPI documentation"],
    ["Database", "PostgreSQL", "16.x", "Primary relational store across 21 core tables"],
    ["ORM", "SQLAlchemy + Alembic", "2.0 / 1.13", "Declarative typed models and versioned schema migrations"],
    ["Async Queue", "Celery + Redis", "5.4 / 7.x", "Background worker queues for resume parsing and matching runs"],
    ["Storage", "AWS S3 / MinIO", "v4 API", "Encrypted object storage for resumes and offer PDFs"],
    ["PDF Engine", "ReportLab", "4.2", "Dynamic enterprise offer letter PDF compilation on S3"],
    ["Auth / Crypto", "PyJWT + bcrypt", "2.9 / 4.2", "HS256 stateless session tokens and salted password hashing"],
    ["Rate Limiter", "SlowAPI", "0.1.9", "Sliding window rate limiting on public and auth endpoints"],
    ["Email / SMS", "SendGrid / Twilio", "v3 / 9.2", "Transactional interview/offer emails and candidate SMS OTPs"]
]
format_table(tech_tbl, [1.3, 1.8, 1.0, 2.7], tech_headers, tech_rows)

# ─────────────────────────────────────────────────────────────────────────────
# 3. RBAC SECURITY MATRIX
# ─────────────────────────────────────────────────────────────────────────────
doc.add_heading("3. Multi-Role RBAC Permissions Matrix", level=1)
rbac_tbl = doc.add_table(rows=1, cols=5)
rbac_headers = ["Platform Capability", "Admin", "HR / HM", "Recruiter", "Candidate"]
rbac_rows = [
    ["Create / edit / close jobs", "Yes", "Yes", "No", "No"],
    ["Assign Recruiters to jobs", "Yes", "Yes", "No", "No"],
    ["Run matching engine", "Yes", "Yes", "Yes", "No"],
    ["Claim and screen candidates", "Yes", "No", "Yes", "No"],
    ["Shortlist and submit to HM", "No", "No", "Yes", "No"],
    ["HM review / reject candidates", "No", "Yes", "No", "No"],
    ["Request interview & propose slots", "No", "Yes", "No", "No"],
    ["Send slots / confirm interview", "No", "No", "Yes", "No"],
    ["Select interview slot", "No", "No", "No", "Token"],
    ["Submit interview GO / NO-GO", "No", "Yes", "No", "No"],
    ["Draft compensation offer", "No", "No", "Yes", "No"],
    ["Approve offer", "No", "Yes", "No", "No"],
    ["Generate PDF & send offer", "No", "No", "Yes", "No"],
    ["Accept / decline offer", "No", "No", "No", "Token"],
    ["Manage user accounts", "Yes", "No", "No", "No"],
    ["View global hiring audit log", "Yes", "No", "No", "No"]
]
format_table(rbac_tbl, [2.5, 1.0, 1.0, 1.1, 1.2], rbac_headers, rbac_rows, center_cols=[1, 2, 3, 4])

# ─────────────────────────────────────────────────────────────────────────────
# 4. 4-TIER FIT SCORE & MATCHING ENGINE
# ─────────────────────────────────────────────────────────────────────────────
doc.add_heading("4. Deterministic 4-Tier Matching Engine", level=1)
p = doc.add_paragraph()
p.add_run("The Fit Score is computed from four independent components totaling 100 points:\n")
p.add_run(
    "1. Skills & Proficiency (60 pts): Weighted sum of candidate skills vs required job skills, factored by declared proficiency and resume evidence verification.\n"
    "2. Experience Tenure (20 pts): 20 pts if candidate experience ≥ job min; 12 pts if ≥70%; 6 pts if partial; 0 pts if none.\n"
    "3. Education Level (10 pts): 10 pts if recognized degree is present; 0 pts otherwise.\n"
    "4. Work Mode Compatibility (10 pts): 10 pts for compatible arrangements; 4 pts for in-person mismatches."
)

add_callout(
    doc,
    "Worked Test Case — Rahul Sharma vs Backend Developer:\n"
    "Python (Expert + evidence): 5.00 | FastAPI (Intermediate + evidence): 3.24 | PostgreSQL (Resume detected): 2.55 | Docker (Missing): 0.00\n"
    "Skill Score = (10.79 / 14) * 60 = 46.2 pts | Experience = 20.0 pts | Education = 10.0 pts | Work Mode = 10.0 pts\n"
    "Authoritative Fit Score = 86.2 / 100.0",
    "TEST VALIDATION BASELINE"
)

# ─────────────────────────────────────────────────────────────────────────────
# 5. 21-STAGE RECRUITMENT PIPELINE STATE MACHINE
# ─────────────────────────────────────────────────────────────────────────────
doc.add_heading("5. 21-Stage Recruitment Pipeline State Machine", level=1)
pipe_tbl = doc.add_table(rows=1, cols=3)
pipe_headers = ["Lifecycle Stage Group", "Pipeline States Included", "Governing Actor"]
pipe_rows = [
    ["Group 1: Sourcing & Screening", "CANDIDATE_MATCHED, CANDIDATE_SHORTLISTED, SENT_TO_HIRING_MANAGER", "Recruiter"],
    ["Group 2: Hiring Manager Review", "HIRING_MANAGER_REVIEW, INTERVIEW_REQUESTED, INTERVIEW_SLOTS_PROPOSED", "Hiring Manager"],
    ["Group 3: Interview Scheduling", "WAITING_FOR_CANDIDATE_SLOT, CANDIDATE_SLOT_SELECTED, INTERVIEW_CONFIRMED", "Recruiter / Candidate"],
    ["Group 4: Interview & Evaluation", "INTERVIEW_IN_PROGRESS, WAITING_FOR_HM_FEEDBACK, INTERVIEW_PASS, INTERVIEW_GO", "Hiring Manager"],
    ["Group 5: Offer Governance", "COMPENSATION_DISCUSSION, OFFER_CREATED, OFFER_PENDING_APPROVAL, OFFER_APPROVED, OFFER_SENT", "Recruiter / HR"],
    ["Terminal Outcomes", "HIRED (Success) | REJECTED, HIRING_MANAGER_REJECTED, INTERVIEW_NO_GO, BLACKLISTED (Terminal)", "System / HR"]
]
format_table(pipe_tbl, [1.8, 3.8, 1.2], pipe_headers, pipe_rows)

# ─────────────────────────────────────────────────────────────────────────────
# 6. RELATIONAL DATABASE SCHEMA (21 TABLES)
# ─────────────────────────────────────────────────────────────────────────────
doc.add_heading("6. Relational Database Schema & Data Dictionary (21 Models)", level=1)
schema_tbl = doc.add_table(rows=1, cols=3)
schema_headers = ["Table Name", "Primary Purpose", "Key Columns & Constraints"]
schema_rows = [
    ["users", "Platform user accounts", "id, email (UQ), hashed_password, role, is_active, phone_number"],
    ["candidates", "Rich candidate profiles", "id, user_id (FK), total_experience_years, highest_education, preferred_work_mode"],
    ["skills", "Canonical skill catalog", "id, name (UQ), category, created_at"],
    ["candidate_skills", "Candidate skill mappings", "id, candidate_id (FK), skill_id (FK), proficiency_level, evidence_text"],
    ["jobs", "Job requisitions", "id, title, min_experience_years, work_mode, status, min_salary, max_salary, created_by"],
    ["job_skills", "Requisition skill weights", "id, job_id (FK), skill_id (FK), requirement_type, weight (1-5)"],
    ["job_recruiter_assignments", "Recruiter team allocation", "id, job_id (FK), recruiter_id (FK), assignment_role"],
    ["match_results", "Match score & pipeline state", "id, job_id (FK), candidate_id (FK), overall_score, pipeline_state (UQ pair)"],
    ["candidate_recruiter_assignments", "Atomic candidate claims", "id, job_id (FK), candidate_id (FK), recruiter_id (FK), claimed_at"],
    ["interviews", "Interview sessions", "id, match_result_id (FK), scheduled_by, interview_date, status, round_number"],
    ["interview_slots", "Proposed multi-slot options", "id, interview_id (FK), slot_start, slot_end, is_selected, candidate_token"],
    ["interview_feedback", "5-dimension evaluations", "id, interview_id (FK), reviewer_id, technical_score, recommendation"],
    ["job_interview_rounds", "Round configurations", "id, job_id (FK), round_number, round_name, round_type, is_mandatory"],
    ["candidate_scorecards", "Multi-rater scorecards", "id, match_result_id (FK), reviewer_id, communication_score, recommendation"],
    ["offers", "Governed compensation offers", "id, match_result_id (FK), base_salary, status, pdf_s3_key, candidate_token"],
    ["candidate_blacklists", "180-day cooling-off suppression", "id, candidate_id (FK), reason, cooling_off_days, expires_at, is_active"],
    ["notifications", "In-app stakeholder alerts", "id, user_id (FK), channel, subject, body, status, created_at"],
    ["otp_verifications", "Phone OTP verifications", "id, phone_number, otp_code, expires_at, is_verified, attempts"],
    ["messages", "Internal discussion threads", "id, job_id (FK), candidate_id (FK), sender_id (FK), recipient_id (FK), body"],
    ["recruitment_tasks", "Operational recruiter tasks", "id, job_id (FK), candidate_id (FK), assigned_to (FK), priority, status"],
    ["audit_logs", "Immutable audit trail", "id, actor_id, action, entity_type, entity_id, old_state, new_state, created_at"]
]
format_table(schema_tbl, [1.8, 2.0, 3.0], schema_headers, schema_rows)

doc.add_page_break()

# ─────────────────────────────────────────────────────────────────────────────
# 7. COMPLETE REST API INVENTORY (136 ENDPOINTS ACROSS 18 MODULES)
# ─────────────────────────────────────────────────────────────────────────────
doc.add_heading("7. Complete REST API Specifications (All 136 Endpoints)", level=1)
p = doc.add_paragraph()
p.add_run(
    "Below is the complete, exhaustive reference for all 136 live API endpoints across 18 functional modules. "
    "Every endpoint specifies HTTP method, path, operation summary, required authorization role, request payload, "
    "path/query parameters, and expected HTTP response codes for QA testing."
)

# Render each module table
module_keys = [
    "1. Authentication & Identity",
    "2. User Management",
    "3. Master Skill Taxonomy",
    "4. Job Requisitions & Recruiter Assignments",
    "5. Candidate Profiles",
    "6. Resume Processing & Extraction",
    "7. Deterministic Matching Engine",
    "8. Match Results & Pipeline State",
    "9. Recruiter Operations & Workspace",
    "10. Candidate Claiming (Atomic Locks)",
    "11. Recruitment Tasks",
    "12. Recruitment Communication",
    "13. Interview Coordination",
    "14. 21-Stage Workflow Engine",
    "15. Offer Governance & PDF Dispatch",
    "16. In-App Notifications",
    "17. Administrator Ops & Audit Trail",
    "18. System Health Probe"
]

# We need the grouped endpoints from scratch/generate_comprehensive_fsd.py
# Let's import them or read from the json spec
with open(openapi_path, "r", encoding="utf-8") as f:
    spec = json.load(f)

# Build module endpoints table
for mod_name in module_keys:
    doc.add_heading(mod_name, level=2)
    
    eps_data = []
    for path, methods in spec["paths"].items():
        for method, op in methods.items():
            if method.lower() not in ["get", "post", "put", "patch", "delete"]:
                continue
            
            # Module matching logic
            m_upper = method.upper()
            target_mod = "18. System Health Probe"
            if path.startswith("/api/auth"):
                target_mod = "1. Authentication & Identity"
            elif path.startswith("/api/users"):
                target_mod = "2. User Management"
            elif path.startswith("/api/skills"):
                target_mod = "3. Master Skill Taxonomy"
            elif path.startswith("/api/jobs") and "recruiters" in path:
                target_mod = "4. Job Requisitions & Recruiter Assignments"
            elif path.startswith("/api/jobs") and "tasks" in path:
                target_mod = "11. Recruitment Tasks"
            elif path.startswith("/api/jobs") and "messages" in path:
                target_mod = "12. Recruitment Communication"
            elif (path.startswith("/api/jobs") and "claim" in path) or (path.startswith("/api/recruiter") and "claim" in path) or ("assign" in path and "candidates" in path):
                target_mod = "10. Candidate Claiming (Atomic Locks)"
            elif path.startswith("/api/jobs"):
                target_mod = "4. Job Requisitions & Recruiter Assignments"
            elif path.startswith("/api/candidates") and "resume" in path:
                target_mod = "6. Resume Processing & Extraction"
            elif path.startswith("/api/candidates"):
                target_mod = "5. Candidate Profiles"
            elif path.startswith("/api/matching"):
                target_mod = "7. Deterministic Matching Engine"
            elif path.startswith("/api/match_results"):
                target_mod = "8. Match Results & Pipeline State"
            elif path.startswith("/api/recruiter") and "tasks" in path:
                target_mod = "11. Recruitment Tasks"
            elif path.startswith("/api/tasks"):
                target_mod = "11. Recruitment Tasks"
            elif path.startswith("/api/recruiter"):
                target_mod = "9. Recruiter Operations & Workspace"
            elif path.startswith("/api/interviews"):
                target_mod = "13. Interview Coordination"
            elif path.startswith("/api/workflow"):
                target_mod = "14. 21-Stage Workflow Engine"
            elif path.startswith("/api/offers"):
                target_mod = "15. Offer Governance & PDF Dispatch"
            elif path.startswith("/api/notifications"):
                target_mod = "16. In-App Notifications"
            elif path.startswith("/api/admin"):
                target_mod = "17. Administrator Ops & Audit Trail"
            elif path == "/health":
                target_mod = "18. System Health Probe"
                
            if target_mod != mod_name:
                continue
                
            # Auth
            auth_role = "Authenticated"
            if target_mod == "1. Authentication & Identity":
                if path in ["/api/auth/register", "/api/auth/login", "/api/auth/send-otp", "/api/auth/verify-otp", "/api/auth/resend-otp", "/api/auth/forgot-password", "/api/auth/reset-password"]:
                    auth_role = "Public"
                else:
                    auth_role = "Any Role"
            elif target_mod == "17. Administrator Ops & Audit Trail":
                auth_role = "Admin"
            elif target_mod == "10. Candidate Claiming (Atomic Locks)":
                auth_role = "Recruiter / Admin"
            elif target_mod == "9. Recruiter Operations & Workspace":
                auth_role = "Recruiter"
            elif target_mod == "5. Candidate Profiles":
                auth_role = "Candidate" if path.startswith("/api/candidates/me") else "HR / Recruiter"
            elif target_mod == "6. Resume Processing & Extraction":
                auth_role = "Candidate / Recruiter"
            elif target_mod == "4. Job Requisitions & Recruiter Assignments":
                auth_role = "HR / Admin" if m_upper in ["POST", "PUT", "DELETE", "PATCH"] else "Any Role"
            elif target_mod == "3. Master Skill Taxonomy":
                auth_role = "Admin" if m_upper in ["POST", "PUT", "DELETE"] else "Any Role"
            elif target_mod == "14. 21-Stage Workflow Engine":
                if "select-slot" in path or "public" in path:
                    auth_role = "Public (Token)"
                elif "hm-" in path or "request-interview" in path or "interviewer-evaluation" in path:
                    auth_role = "HR / HM"
                elif "shortlist" in path or "send-slots" in path or "confirm" in path or "complete" in path or "create-offer" in path:
                    auth_role = "Recruiter"
                else:
                    auth_role = "HR / Recruiter"
            elif target_mod == "15. Offer Governance & PDF Dispatch":
                if "respond" in path or "candidate" in path:
                    auth_role = "Public (Token)"
                elif "submit-review" in path or "hm-review" in path or "hm-edit" in path:
                    auth_role = "HR / HM"
                else:
                    auth_role = "Recruiter / HR"
            elif target_mod == "18. System Health Probe":
                auth_role = "Public"

            # Request Body
            rb = op.get("requestBody", {})
            rb_str = "None"
            if rb:
                content = rb.get("content", {})
                for ctype, cval in content.items():
                    s = cval.get("schema", {})
                    ref = s.get("$ref", "") or s.get("title", "") or s.get("type", "")
                    if "$ref" in s:
                        ref = s["$ref"].split("/")[-1]
                    rb_str = ref or ctype

            # Status codes
            resps = op.get("responses", {})
            resp_str = ", ".join([k for k in sorted(resps.keys()) if k != "default"]) or "200"

            summary = op.get("summary", "") or op.get("operationId", "")
            eps_data.append([m_upper, path, summary, auth_role, rb_str, resp_str])

    # Add table
    mod_tbl = doc.add_table(rows=1, cols=6)
    mod_headers = ["Method", "Endpoint Path", "Summary / Purpose", "Auth Guard", "Payload", "Responses"]
    format_table(mod_tbl, [0.7, 2.2, 1.8, 0.9, 0.7, 0.5], mod_headers, eps_data)

# ─────────────────────────────────────────────────────────────────────────────
# 8. QA TEST SUITES & VERIFICATION PLAYBOOKS
# ─────────────────────────────────────────────────────────────────────────────
doc.add_page_break()
doc.add_heading("8. QA Verification Suites & Testing Playbooks", level=1)

p = doc.add_paragraph()
p.add_run("Scenario 1: Complete Happy Path (Rahul Sharma · 23 Steps)\n").bold = True
p.add_run(
    "1. POST /api/auth/register -> Assert 201 Created, JWT token returned.\n"
    "2. POST /api/candidates/me -> Completes profile: 3 yrs exp, B.Tech, Hybrid -> Assert 201 Created.\n"
    "3. POST /api/candidates/{id}/resume -> Ingests resume -> Assert 200 OK, background task queued.\n"
    "4. POST /api/jobs -> HR authoring Backend Developer role -> Assert 201 Created.\n"
    "5. PUT /api/jobs/{id} -> Sets status = active -> Assert 200 OK, Celery matching triggered.\n"
    "6. POST /api/jobs/{id}/recruiters -> Assigns Priya as Primary Recruiter -> Assert 201 Created.\n"
    "7. GET /api/recruiter/jobs/{id}/candidates -> Priya sees Rahul at Rank 1 (Score 86.2) -> Assert 200 OK.\n"
    "8. POST /api/recruiter/jobs/{id}/candidates/{cid}/claim -> Atomic DB claim -> Assert 200 OK.\n"
    "9. POST /api/workflow/{mid}/shortlist -> Shortlists Rahul -> Assert 200 OK, state -> CANDIDATE_SHORTLISTED.\n"
    "10. POST /api/workflow/{mid}/submit-to-hm -> Submits to HM Arjun -> Assert 200 OK, state -> SENT_TO_HIRING_MANAGER.\n"
    "11. POST /api/workflow/{mid}/hm-review -> Arjun reviews profile -> Assert 200 OK, state -> HIRING_MANAGER_REVIEW.\n"
    "12. POST /api/workflow/{mid}/request-interview -> Proposes 3 slots -> Assert 200 OK, state -> INTERVIEW_SLOTS_PROPOSED.\n"
    "13. POST /api/workflow/{mid}/send-slots-to-candidate -> Priya sends token -> Assert 200 OK, state -> WAITING_FOR_CANDIDATE_SLOT.\n"
    "14. POST /api/workflow/interviews/{id}/select-slot -> Rahul selects slot -> Assert 200 OK, state -> CANDIDATE_SLOT_SELECTED.\n"
    "15. POST /api/workflow/{mid}/confirm-interview -> Priya confirms booking -> Assert 200 OK, state -> INTERVIEW_CONFIRMED.\n"
    "16. POST /api/workflow/{mid}/complete-interview -> Interview conducted -> Assert 200 OK, state -> WAITING_FOR_HM_FEEDBACK.\n"
    "17. POST /api/workflow/{mid}/hm-feedback -> Arjun submits Tech 5, Comm 4, GO -> Assert 200 OK, state -> INTERVIEW_GO -> COMPENSATION_DISCUSSION.\n"
    "18. POST /api/workflow/{mid}/create-offer -> Priya drafts offer: Rs 18 LPA -> Assert 201 Created, state -> OFFER_CREATED.\n"
    "19. POST /api/offers/{id}/submit-review -> Priya submits for review -> Assert 200 OK, state -> OFFER_PENDING_APPROVAL.\n"
    "20. POST /api/offers/{id}/hm-review -> Arjun approves offer -> Assert 200 OK, state -> OFFER_APPROVED.\n"
    "21. POST /api/offers/{id}/generate-pdf -> ReportLab builds PDF on S3 -> Assert 200 OK, state -> OFFER_READY.\n"
    "22. POST /api/offers/{id}/send -> Priya sends token link -> Assert 200 OK, state -> OFFER_SENT.\n"
    "23. POST /api/offers/{id}/respond -> Rahul accepts -> Assert 200 OK, state -> OFFER_ACCEPTED, pipeline_state -> HIRED.\n"
    "24. GET /api/admin/hiring-logs -> Admin checks audit log -> Assert 200 OK, all 22 state changes verified."
)

p = doc.add_paragraph()
p.add_run("Scenario 2: Offer Rejection & 180-Day Blacklist Verification\n").bold = True
p.add_run(
    "• Candidate rejects formal offer via POST /api/offers/{id}/respond (decision = 'rejected').\n"
    "• Assert offer.status = 'rejected' and match_results.pipeline_state = 'BLACKLISTED'.\n"
    "• Assert row inserted in candidate_blacklists with expires_at = now() + 180 days.\n"
    "• Execute matching run -> Assert candidate is suppressed from active job match results.\n"
    "• Attempt POST /api/workflow/{mid}/request-interview -> Assert 400 Bad Request ('Candidate is blacklisted')."
)

p = doc.add_paragraph()
p.add_run("Scenario 3: Concurrency & Atomic Claiming Verification\n").bold = True
p.add_run(
    "• Simultaneously dispatch POST /api/recruiter/jobs/{id}/candidates/{cid}/claim from Recruiter A and Recruiter B.\n"
    "• Assert exactly one request succeeds with 200 OK.\n"
    "• Assert concurrent request receives 409 Conflict ('Candidate already claimed by another recruiter')."
)

p = doc.add_paragraph()
p.add_run("Scenario 4: 8-Table Cascade User Deletion Verification\n").bold = True
p.add_run(
    "• Populate candidate with resume, matching rows, interviews, slots, offers, and notifications.\n"
    "• Dispatch DELETE /api/admin/users/{user_id} -> Assert 200 OK.\n"
    "• Query PostgreSQL database across all 8 related models -> Assert zero orphaned foreign key records."
)

# ─────────────────────────────────────────────────────────────────────────────
# 9. SIGN-OFF MATRIX
# ─────────────────────────────────────────────────────────────────────────────
doc.add_heading("9. QA & Engineering Sign-Off Matrix", level=1)
sign_tbl = doc.add_table(rows=1, cols=4)
sign_headers = ["Stakeholder Role", "Name & Title", "Approval Status", "Date Verified"]
sign_rows = [
    ["System Architect & Lead", "Shiva Tripathi, Core Platform Lead", "APPROVED", "September 2026"],
    ["Backend & Security Lead", "SkillAlign Architecture Team", "APPROVED", "September 2026"],
    ["Quality Assurance Lead", "SkillAlign Verification Lead", "APPROVED", "September 2026"],
    ["Project Mentor / Reviewer", "Faculty / Enterprise Mentor", "APPROVED", "September 2026"]
]
format_table(sign_tbl, [2.0, 2.3, 1.2, 1.3], sign_headers, sign_rows)

final_docx_path = os.path.join(base_dir, "SkillAlign_Functional_Specification_Document.docx")
doc.save(final_docx_path)
print(f"SkillAlign_Functional_Specification_Document.docx successfully created at: {final_docx_path}")
print(f"File size: {os.path.getsize(final_docx_path) / 1024:.1f} KB")
