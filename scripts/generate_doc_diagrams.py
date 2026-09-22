"""
SkillAlign Technical Documentation Visual Diagram Generator
Generates high-resolution, publication-quality architecture diagrams, flowcharts,
ERDs, and sequence diagrams for inclusion in executive Word (.docx) documents.
"""

import os
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch
import numpy as np

# Output directory for rendered diagram assets
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "docs", "diagrams")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Modern Tech Enterprise Color Palette
NAVY_DARK = "#0F172A"
NAVY_BLUE = "#1E3A8A"
ELECTRIC_BLUE = "#2563EB"
SKY_BLUE = "#0284C7"
CYAN = "#0891B2"
EMERALD = "#059669"
GREEN_LIGHT = "#10B981"
AMBER = "#D97706"
ROSE = "#E11D48"
PURPLE = "#7C3AED"
SLATE_DARK = "#334155"
SLATE_MED = "#64748B"
SLATE_LIGHT = "#F8FAFC"
WHITE = "#FFFFFF"
BORDER_GRAY = "#CBD5E1"

def set_diagram_style(fig, ax, title, subtitle=None):
    ax.set_facecolor("#FAFAFC")
    fig.patch.set_facecolor("#FAFAFC")
    ax.axis('off')
    if title:
        fig.text(0.5, 0.96, title, fontsize=14, fontweight='bold', color=NAVY_DARK, ha='center', va='top')
    if subtitle:
        fig.text(0.5, 0.92, subtitle, fontsize=9.5, color=SLATE_MED, ha='center', va='top', style='italic')

def draw_box(ax, x, y, w, h, text, color=NAVY_BLUE, text_color=WHITE, fontsize=8.5, bold=True, radius=0.03, alpha=1.0, edgecolor=None, icon=None):
    if edgecolor is None:
        edgecolor = color
    box = FancyBboxPatch((x, y), w, h,
                         boxstyle=f"round,pad={radius},rounding_size={radius}",
                         facecolor=color, edgecolor=edgecolor, linewidth=1.5, alpha=alpha, zorder=3)
    ax.add_patch(box)
    full_text = f"{icon} {text}" if icon else text
    weight = 'bold' if bold else 'normal'
    ax.text(x + w/2, y + h/2, full_text, ha='center', va='center', fontsize=fontsize,
            color=text_color, fontweight=weight, zorder=4, wrap=True)
    return box

def draw_arrow(ax, x1, y1, x2, y2, color=SLATE_DARK, text=None, text_offset=(0, 0), rad=0.0, lw=1.5):
    arrow = patches.FancyArrowPatch((x1, y1), (x2, y2),
                                   connectionstyle=f"arc3,rad={rad}",
                                   arrowstyle="simple,head_width=5,head_length=6",
                                   color=color, linewidth=lw, zorder=2)
    ax.add_patch(arrow)
    if text:
        mx = (x1 + x2) / 2 + text_offset[0]
        my = (y1 + y2) / 2 + text_offset[1]
        ax.text(mx, my, text, ha='center', va='center', fontsize=7.5, color=SLATE_DARK,
                fontweight='semibold', backgroundcolor='#FAFAFC', zorder=5,
                bbox=dict(boxstyle='round,pad=0.2', facecolor='#FFFFFF', edgecolor=BORDER_GRAY, alpha=0.95))

# ==========================================
# 1. Master Platform Overview Diagram
# ==========================================
def gen_platform_overview():
    fig, ax = plt.subplots(figsize=(11, 7), dpi=300)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 7)
    set_diagram_style(fig, ax, "SkillAlign Enterprise Platform Ecosystem", "Unified Talent Acquisition, Resume Parsing & Multi-Factor Matching Architecture")

    # Portals
    draw_box(ax, 0.4, 5.2, 2.0, 1.0, "Candidate Portal\n- Self-Registration\n- Resume Upload\n- Slot Selection", color="#EFF6FF", text_color=NAVY_DARK, edgecolor=ELECTRIC_BLUE, fontsize=8, bold=False)
    draw_box(ax, 2.7, 5.2, 2.0, 1.0, "Recruiter Portal\n- Sourcing & Claiming\n- Multi-Factor Match\n- Offer Drafting", color="#EFF6FF", text_color=NAVY_DARK, edgecolor=ELECTRIC_BLUE, fontsize=8, bold=False)
    draw_box(ax, 5.0, 5.2, 2.0, 1.0, "HR / HM Portal\n- Requisition Setup\n- HM Shortlisting\n- Scorecard Review", color="#EFF6FF", text_color=NAVY_DARK, edgecolor=ELECTRIC_BLUE, fontsize=8, bold=False)
    draw_box(ax, 7.3, 5.2, 2.3, 1.0, "System Admin\n- User Governance\n- Taxonomy Catalog\n- Audit & Health Logs", color="#EFF6FF", text_color=NAVY_DARK, edgecolor=ELECTRIC_BLUE, fontsize=8, bold=False)

    # API Gateway
    draw_box(ax, 0.4, 3.8, 9.2, 0.8, "FastAPI REST API Gateway (Port 8000)\nJWT HS256 Authentication | SlowAPI Rate Limiting | Pydantic v2 DTOs | RBAC Dependencies", color=NAVY_BLUE, text_color=WHITE, fontsize=9)

    for x in [1.4, 3.7, 6.0, 8.45]:
        draw_arrow(ax, x, 5.2, x, 4.6, color=ELECTRIC_BLUE)

    # Domain Services
    draw_box(ax, 0.4, 2.2, 2.1, 1.0, "Resume Pipeline\n- pdfplumber / docx\n- Rule-Based Parser\n- Evidence Extractor", color="#F0FDF4", text_color=NAVY_DARK, edgecolor=EMERALD, fontsize=8)
    draw_box(ax, 2.75, 2.2, 2.1, 1.0, "Matching Engine\n- 4-Factor Weighted\n- Evidence Bonus (1.15x)\n- Zero-Match Guard", color="#F0FDF4", text_color=NAVY_DARK, edgecolor=EMERALD, fontsize=8)
    draw_box(ax, 5.1, 2.2, 2.1, 1.0, "21-State Machine\n- Shortlisting & Slots\n- HM Scorecards\n- 6-Mo Cooling Off", color="#F0FDF4", text_color=NAVY_DARK, edgecolor=EMERALD, fontsize=8)
    draw_box(ax, 7.45, 2.2, 2.15, 1.0, "Document & AI\n- ReportLab PDF Offers\n- Gemini AI Analysis\n- SendGrid / Twilio", color="#F0FDF4", text_color=NAVY_DARK, edgecolor=EMERALD, fontsize=8)

    for x in [1.45, 3.8, 6.15, 8.5]:
        draw_arrow(ax, x, 3.8, x, 3.2, color=NAVY_BLUE)

    # Persistence
    draw_box(ax, 0.4, 0.5, 2.8, 1.1, "PostgreSQL 15+ DB\n- 23 SQLAlchemy Models\n- 3NF / BCNF Normalization\n- Alembic Migrations", color="#FEF3C7", text_color=NAVY_DARK, edgecolor=AMBER, fontsize=8)
    draw_box(ax, 3.6, 0.5, 2.8, 1.1, "Celery + Redis Broker\n- Async Background Tasks\n- Sync In-Process Fallback\n- High Concurrency", color="#FEF3C7", text_color=NAVY_DARK, edgecolor=AMBER, fontsize=8)
    draw_box(ax, 6.8, 0.5, 2.8, 1.1, "AWS S3 / Storage\n- Resume Binary Storage\n- Extracted Text Cache\n- Compiled Offer PDFs", color="#FEF3C7", text_color=NAVY_DARK, edgecolor=AMBER, fontsize=8)

    for x in [1.8, 5.0, 8.2]:
        draw_arrow(ax, x, 2.2, x, 1.6, color=AMBER)

    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, "fig_00_platform_overview.png"), dpi=300, bbox_inches='tight')
    plt.close()

# ==========================================
# 2. Volume 01: 6-Tier Architecture Diagram
# ==========================================
def gen_vol01_architecture():
    fig, ax = plt.subplots(figsize=(11, 7.5), dpi=300)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 8)
    set_diagram_style(fig, ax, "SkillAlign 6-Tier System Architecture", "Strict Separation of Concerns across Presentation, Edge, API, Domain, Queue, and Persistence")

    layers = [
        ("1. Presentation Tier (React 18 + TS + Vite + Tailwind CSS)", 6.8, ELECTRIC_BLUE, "Single Page App | Candidate, Recruiter, HR/HM, Admin Dashboards | Role Route Guards"),
        ("2. Security & Edge Tier (FastAPI Dependencies & SlowAPI)", 5.6, NAVY_BLUE, "CORS Whitelist | HS256 JWT Token Validator | Bcrypt (72-byte safe) | Memory Rate Limiting"),
        ("3. REST API Routing Tier (15 Modular FastAPI Routers)", 4.4, SKY_BLUE, "Auth, Jobs, Candidates, Resume, Matching, Recruiter, Workflow, Offers, Tasks, Audit, Admin"),
        ("4. Domain Service & Business Logic Tier (Python 3.11)", 3.2, EMERALD, "Matching Engine (4-Factor) | Resume Text Extractor & Parser | 21-State Machine | ReportLab PDF | Gemini AI"),
        ("5. Asynchronous Queue & Messaging Tier (Celery + Redis)", 2.0, AMBER, "Background Task Workers | Resume Ingestion Queue | SendGrid Email & Twilio SMS Dispatchers"),
        ("6. Persistence & Relational Data Tier (PostgreSQL 15+ & S3)", 0.8, ROSE, "23 Normalized Tables (SQLAlchemy 2.0) | Alembic Migrations | S3 Object & Local File Storage")
    ]

    for title, y, color, desc in layers:
        draw_box(ax, 0.5, y, 9.0, 0.9, f"{title}\n{desc}", color=color, text_color=WHITE, fontsize=8.5, radius=0.02)
        if y > 0.8:
            draw_arrow(ax, 5.0, y, 5.0, y - 0.3, color=NAVY_DARK, lw=2.0)

    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, "fig_01_arch_layers.png"), dpi=300, bbox_inches='tight')
    plt.close()

# ==========================================
# 3. Volume 02: 21-State Recruitment State Machine
# ==========================================
def gen_vol02_state_machine():
    fig, ax = plt.subplots(figsize=(12, 8.5), dpi=300)
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 9)
    set_diagram_style(fig, ax, "SkillAlign 21-State Recruitment Lifecycle State Machine", "Formal State Transitions Governing Sourcing, Screening, Multi-Round Interviews, Offers, and Cooling-Off")

    # Group 1: Sourcing & Matching
    draw_box(ax, 0.4, 7.5, 2.0, 0.8, "MATCHED\n(Algorithmic Match)", color=SLATE_DARK, fontsize=8)
    draw_box(ax, 2.8, 7.5, 2.0, 0.8, "RECRUITER_CLAIMED\n(Claimed by Recruiter)", color=ELECTRIC_BLUE, fontsize=8)
    draw_box(ax, 5.2, 7.5, 2.0, 0.8, "RECRUITER_SCREENED\n(Recruiter Reviewed)", color=ELECTRIC_BLUE, fontsize=8)
    draw_box(ax, 7.6, 7.5, 2.0, 0.8, "SHORTLISTED\n(Submitted to HM)", color=PURPLE, fontsize=8)

    draw_arrow(ax, 2.4, 7.9, 2.8, 7.9, color=ELECTRIC_BLUE)
    draw_arrow(ax, 4.8, 7.9, 5.2, 7.9, color=ELECTRIC_BLUE)
    draw_arrow(ax, 7.2, 7.9, 7.6, 7.9, color=PURPLE)

    # Rejections from Sourcing
    draw_box(ax, 10.0, 7.5, 1.6, 0.8, "REJECTED\n(Recruiter)", color=ROSE, fontsize=7.5)
    draw_arrow(ax, 6.2, 7.5, 10.0, 7.7, color=ROSE, text="Reject", rad=0.2)

    # Group 2: HM Review & Interview Round Coordination
    draw_box(ax, 7.6, 5.8, 2.0, 0.8, "HM_REVIEWING\n(Hiring Mgr Review)", color=PURPLE, fontsize=8)
    draw_box(ax, 10.0, 5.8, 1.6, 0.8, "HM_REJECTED\n(HM Declined)", color=ROSE, fontsize=7.5)
    draw_arrow(ax, 8.6, 7.5, 8.6, 6.6, color=PURPLE)
    draw_arrow(ax, 9.6, 6.2, 10.0, 6.2, color=ROSE, text="Decline")

    draw_box(ax, 5.0, 5.8, 2.2, 0.8, "INTERVIEW_REQUESTED\n(Round Configured)", color=SKY_BLUE, fontsize=8)
    draw_arrow(ax, 7.6, 6.2, 7.2, 6.2, color=SKY_BLUE, text="Request")

    draw_box(ax, 2.4, 5.8, 2.2, 0.8, "SLOTS_PROPOSED\n(2-4 Slots Created)", color=SKY_BLUE, fontsize=8)
    draw_arrow(ax, 5.0, 6.2, 4.6, 6.2, color=SKY_BLUE)

    draw_box(ax, 0.4, 5.8, 1.8, 0.8, "SLOT_SELECTED\n(Candidate Picked)", color=CYAN, fontsize=8)
    draw_arrow(ax, 2.4, 6.2, 2.2, 6.2, color=CYAN)

    # Group 3: Interview Execution & Evaluation
    draw_box(ax, 0.4, 4.0, 2.0, 0.8, "INTERVIEW_CONFIRMED\n(Invites Sent)", color=CYAN, fontsize=8)
    draw_arrow(ax, 1.3, 5.8, 1.3, 4.8, color=CYAN)

    draw_box(ax, 2.8, 4.0, 2.0, 0.8, "INTERVIEW_COMPLETED\n(Conducted)", color=NAVY_BLUE, fontsize=8)
    draw_arrow(ax, 2.4, 4.4, 2.8, 4.4, color=NAVY_BLUE)

    draw_box(ax, 5.2, 4.0, 2.2, 0.8, "INTERVIEW_EVALUATED\n(Scorecard Submitted)", color=NAVY_BLUE, fontsize=8)
    draw_arrow(ax, 4.8, 4.4, 5.2, 4.4, color=NAVY_BLUE)

    draw_box(ax, 7.8, 4.0, 1.8, 0.8, "INTERVIEW_GO\n(Approved Offer)", color=EMERALD, fontsize=8)
    draw_box(ax, 10.0, 4.0, 1.6, 0.8, "INTERVIEW_NO_GO\n(Rejected)", color=ROSE, fontsize=7.5)
    draw_arrow(ax, 7.4, 4.4, 7.8, 4.4, color=EMERALD, text="Go")
    draw_arrow(ax, 6.3, 4.0, 10.0, 4.2, color=ROSE, text="No-Go", rad=0.2)
    draw_arrow(ax, 6.3, 4.8, 6.1, 5.8, color=SKY_BLUE, text="Next Round", rad=-0.2)

    # Group 4: Offer Pipeline & Final States
    draw_box(ax, 7.8, 2.2, 2.2, 0.8, "COMPENSATION_DISC\n(Salary Negotiated)", color=AMBER, fontsize=8)
    draw_arrow(ax, 8.7, 4.0, 8.7, 3.0, color=AMBER)

    draw_box(ax, 5.2, 2.2, 2.2, 0.8, "OFFER_DRAFTED\n(Recruiter Draft)", color=AMBER, fontsize=8)
    draw_arrow(ax, 7.8, 2.6, 7.4, 2.6, color=AMBER)

    draw_box(ax, 2.6, 2.2, 2.2, 0.8, "OFFER_APPROVED\n(HR Approved & PDF)", color=EMERALD, fontsize=8)
    draw_arrow(ax, 5.2, 2.6, 4.8, 2.6, color=EMERALD)

    draw_box(ax, 0.4, 2.2, 1.8, 0.8, "OFFER_EXTENDED\n(Dispatched)", color=ELECTRIC_BLUE, fontsize=8)
    draw_arrow(ax, 2.6, 2.6, 2.2, 2.6, color=ELECTRIC_BLUE)

    # Terminal States
    draw_box(ax, 1.5, 0.5, 3.5, 1.0, "HIRED (Final State)\nCandidate Accepted Offer\nPosition Filled Successfully", color=EMERALD, text_color=WHITE, fontsize=9, bold=True)
    draw_box(ax, 6.5, 0.5, 4.5, 1.0, "BLACKLISTED / COOLING_OFF\nCandidate Declined Offer\n6-Month Cooling-Off Applied (180 Days)", color=ROSE, text_color=WHITE, fontsize=8.5, bold=True)

    draw_arrow(ax, 1.3, 2.2, 2.5, 1.5, color=EMERALD, text="Accept")
    draw_arrow(ax, 1.3, 2.2, 7.5, 1.5, color=ROSE, text="Decline", rad=0.2)

    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, "fig_02_state_machine.png"), dpi=300, bbox_inches='tight')
    plt.close()

# ==========================================
# 4. Volume 02: End-to-End Workflow Flowchart
# ==========================================
def gen_vol02_recruitment_lifecycle():
    fig, ax = plt.subplots(figsize=(11, 8.5), dpi=300)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    set_diagram_style(fig, ax, "End-to-End Recruitment Lifecycle Workflow", "Complete Multi-Role Flow from Resume Ingestion to Onboarding or Cooling-Off")

    steps = [
        (0.5, 8.8, 4.0, 0.8, "1. Candidate Signs Up & Uploads Resume\n(PDF/DOCX Extracted & Skills Cataloged)", ELECTRIC_BLUE),
        (5.5, 8.8, 4.0, 0.8, "2. HR Manager Publishes Requisition\n(Required Skills, Weights 1-5 & Work Mode)", NAVY_BLUE),
        (3.0, 7.4, 4.0, 0.8, "3. Multi-Factor Matching Engine\n(Skill 60%, Exp 20%, Edu 10%, Mode 10%)", PURPLE),
        (0.5, 6.0, 4.0, 0.8, "4. Recruiter Sourcing & Screening\n(Claims Candidate & Inspects Evidence)", ELECTRIC_BLUE),
        (5.5, 6.0, 4.0, 0.8, "5. HM Shortlist Review & Decision\n(Approve for Interview or Reject)", NAVY_BLUE),
        (0.5, 4.6, 4.0, 0.8, "6. Interview Coordination & Slot Booking\n(Recruiter Proposes -> Candidate Selects)", SKY_BLUE),
        (5.5, 4.6, 4.0, 0.8, "7. Interview Execution & HM Scorecard\n(Go / No-Go Decision & Evaluation)", NAVY_BLUE),
        (0.5, 3.2, 4.0, 0.8, "8. Compensation & Offer Drafting\n(Salary Terms & Joining Date Setup)", AMBER),
        (5.5, 3.2, 4.0, 0.8, "9. HR Approval & ReportLab PDF Gen\n(Formal Offer Letter with Crypto Token)", EMERALD),
        (3.0, 1.8, 4.0, 0.8, "10. Candidate Decision via Token\n(Accept Offer or Decline Position)", CYAN),
        (0.5, 0.5, 4.0, 0.8, "Status: HIRED\n(Candidate Onboarded Successfully)", EMERALD),
        (5.5, 0.5, 4.0, 0.8, "Status: 6-Month Cooling-Off\n(Candidate Blacklisted for 180 Days)", ROSE),
    ]

    for x, y, w, h, text, col in steps:
        draw_box(ax, x, y, w, h, text, color=col, fontsize=8)

    draw_arrow(ax, 2.5, 8.8, 4.0, 8.2, color=SLATE_DARK)
    draw_arrow(ax, 7.5, 8.8, 6.0, 8.2, color=SLATE_DARK)
    draw_arrow(ax, 5.0, 7.4, 2.5, 6.8, color=SLATE_DARK)
    draw_arrow(ax, 4.5, 6.4, 5.5, 6.4, color=SLATE_DARK, text="Shortlist")
    draw_arrow(ax, 7.5, 6.0, 2.5, 5.4, color=SLATE_DARK, text="Approved")
    draw_arrow(ax, 4.5, 5.0, 5.5, 5.0, color=SLATE_DARK, text="Confirmed")
    draw_arrow(ax, 7.5, 4.6, 2.5, 4.0, color=SLATE_DARK, text="Go")
    draw_arrow(ax, 4.5, 3.6, 5.5, 3.6, color=SLATE_DARK, text="Drafted")
    draw_arrow(ax, 7.5, 3.2, 5.0, 2.6, color=SLATE_DARK, text="Dispatched")
    draw_arrow(ax, 4.0, 1.8, 2.5, 1.3, color=EMERALD, text="Accept")
    draw_arrow(ax, 6.0, 1.8, 7.5, 1.3, color=ROSE, text="Decline")

    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, "fig_02_recruitment_lifecycle.png"), dpi=300, bbox_inches='tight')
    plt.close()

# ==========================================
# 5. Volume 02: Role Workflows (Candidate, HM, Recruiter)
# ==========================================
def gen_vol02_role_workflows():
    fig, (ax1, ax2, ax3) = plt.subplots(1, 3, figsize=(13, 8), dpi=300)
    for ax in [ax1, ax2, ax3]:
        ax.set_facecolor("#FAFAFC")
        ax.axis('off')
    fig.patch.set_facecolor("#FAFAFC")
    fig.text(0.5, 0.97, "SkillAlign Role-Specific Workflows", fontsize=14, fontweight='bold', color=NAVY_DARK, ha='center')

    # Candidate
    ax1.set_title("Candidate Workflow", fontsize=11, fontweight='bold', color=ELECTRIC_BLUE, pad=10)
    c_steps = ["1. Register / Login (JWT)", "2. Upload Resume (PDF/DOCX)", "3. Verify Parsed Skills", "4. Select Interview Slot", "5. Attend Interview Round", "6. Accept / Decline Offer"]
    for i, step in enumerate(c_steps):
        draw_box(ax1, 0.1, 0.85 - i*0.14, 0.8, 0.09, step, color=ELECTRIC_BLUE, fontsize=7.5)
        if i < len(c_steps) - 1:
            draw_arrow(ax1, 0.5, 0.85 - i*0.14, 0.5, 0.85 - (i+1)*0.14 + 0.09, color=SLATE_DARK)

    # HM
    ax2.set_title("HR / Hiring Manager Workflow", fontsize=11, fontweight='bold', color=NAVY_BLUE, pad=10)
    h_steps = ["1. Create Job Requisition", "2. Set Skill Weights (1-5)", "3. Review Recruiter Shortlist", "4. Request Interview Round", "5. Submit Evaluation Scorecard", "6. Review & Approve Offer"]
    for i, step in enumerate(h_steps):
        draw_box(ax2, 0.1, 0.85 - i*0.14, 0.8, 0.09, step, color=NAVY_BLUE, fontsize=7.5)
        if i < len(h_steps) - 1:
            draw_arrow(ax2, 0.5, 0.85 - i*0.14, 0.5, 0.85 - (i+1)*0.14 + 0.09, color=SLATE_DARK)

    # Recruiter
    ax3.set_title("Recruiter Workflow", fontsize=11, fontweight='bold', color=PURPLE, pad=10)
    r_steps = ["1. Inspect Active Jobs", "2. Trigger Matching Engine", "3. Claim Matching Candidates", "4. Review Resume Evidence", "5. Propose 2-4 Interview Slots", "6. Draft Financial Terms & Offer"]
    for i, step in enumerate(r_steps):
        draw_box(ax3, 0.1, 0.85 - i*0.14, 0.8, 0.09, step, color=PURPLE, fontsize=7.5)
        if i < len(r_steps) - 1:
            draw_arrow(ax3, 0.5, 0.85 - i*0.14, 0.5, 0.85 - (i+1)*0.14 + 0.09, color=SLATE_DARK)

    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, "fig_02_role_workflows.png"), dpi=300, bbox_inches='tight')
    plt.close()

# ==========================================
# 6. Volume 03: Feature Map & Action Architecture
# ==========================================
def gen_vol03_feature_map():
    fig, ax = plt.subplots(figsize=(11, 7.5), dpi=300)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 8)
    set_diagram_style(fig, ax, "SkillAlign Functional Feature Inventory & Module Flow", "Complete End-to-End Functional Capabilities Spanning Features F-001 through F-026")

    modules = [
        ("Authentication & Identity (F-001 - F-003)", 6.6, ELECTRIC_BLUE, "Candidate Registration | SMS OTP Auth (Twilio) | Password Reset Tokens | JWT HS256"),
        ("Resume Ingestion & Parsing (F-004 - F-007)", 5.4, NAVY_BLUE, "pdfplumber Extraction | DOCX Parser | Rule-Based Evidence Engine | Candidate Profile Sync"),
        ("Requisitions & Matching (F-008 - F-010)", 4.2, PURPLE, "Job Weighting (1-5) | 4-Factor Matching (60/20/10/10) | Evidence Multipliers | Explainability"),
        ("Recruiter Operations & Claiming (F-011 - F-013)", 3.0, SKY_BLUE, "Candidate Claim Locks | Recruiter Screening | Action Center Tasks | HM Shortlist Submission"),
        ("Interview Management & Scoring (F-014 - F-017)", 1.8, EMERALD, "Round Templates | Tokenized Slot Picker | Google Meet/Zoom Links | HM Scorecards"),
        ("Offer Generation & Governance (F-018 - F-026)", 0.6, AMBER, "Compensation Terms | HR Approval | ReportLab PDF Engine | 6-Month Blacklist / Cooling-Off")
    ]

    for title, y, col, desc in modules:
        draw_box(ax, 0.5, y, 9.0, 0.9, f"{title}\n{desc}", color=col, text_color=WHITE, fontsize=8.5, radius=0.02)
        if y > 0.6:
            draw_arrow(ax, 5.0, y, 5.0, y - 0.3, color=NAVY_DARK, lw=1.8)

    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, "fig_03_fsd_feature_map.png"), dpi=300, bbox_inches='tight')
    plt.close()

# ==========================================
# 7. Volume 04: Matching Engine Breakdown
# ==========================================
def gen_vol04_matching_engine():
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5.5), dpi=300)
    fig.patch.set_facecolor("#FAFAFC")

    labels = ['Skills & Proficiency\n(60 pts / 60%)', 'Experience Relevance\n(20 pts / 20%)', 'Education Qualification\n(10 pts / 10%)', 'Work Mode Fit\n(10 pts / 10%)']
    sizes = [60, 20, 10, 10]
    colors = [ELECTRIC_BLUE, EMERALD, AMBER, PURPLE]
    explode = (0.05, 0, 0, 0)

    wedges, texts, autotexts = ax1.pie(sizes, explode=explode, labels=labels, autopct='%1.0f%%',
                                      startangle=140, colors=colors, textprops=dict(color=NAVY_DARK, fontsize=8.5))
    for at in autotexts:
        at.set_color(WHITE)
        at.set_weight('bold')
    ax1.set_title("Multi-Factor Matching Engine Weight Distribution", fontsize=11, fontweight='bold', color=NAVY_DARK, pad=15)

    ax2.set_facecolor("#FAFAFC")
    categories = ['Beginner\n(Base: 0.40)', 'Intermediate\n(Base: 0.70)', 'Expert\n(Base: 1.00)']
    unverified = [0.40, 0.70, 1.00]
    verified = [0.46, 0.81, 1.00]

    x = np.arange(len(categories))
    width = 0.35

    rects1 = ax2.bar(x - width/2, unverified, width, label='Unverified (Self-Declared)', color=SLATE_MED)
    rects2 = ax2.bar(x + width/2, verified, width, label='Evidence-Backed (+15% Bonus)', color=EMERALD)

    ax2.set_ylabel('Proficiency Scoring Factor f(s)', fontsize=9, fontweight='bold', color=NAVY_DARK)
    ax2.set_title('Resume Evidence Multiplier Bonus Impact', fontsize=11, fontweight='bold', color=NAVY_DARK, pad=15)
    ax2.set_xticks(x)
    ax2.set_xticklabels(categories, fontsize=8.5)
    ax2.legend(loc='lower right', fontsize=8)
    ax2.set_ylim(0, 1.2)
    ax2.grid(axis='y', linestyle='--', alpha=0.3)

    for r in rects1 + rects2:
        h = r.get_height()
        ax2.annotate(f'{h:.2f}', xy=(r.get_x() + r.get_width() / 2, h), xytext=(0, 3),
                     textcoords="offset points", ha='center', va='bottom', fontsize=8, fontweight='bold')

    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, "fig_04_matching_engine.png"), dpi=300, bbox_inches='tight')
    plt.close()

# ==========================================
# 8. Volume 04: Resume Ingestion Pipeline
# ==========================================
def gen_vol04_resume_pipeline():
    fig, ax = plt.subplots(figsize=(11, 6), dpi=300)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 6)
    set_diagram_style(fig, ax, "Deterministic Resume Extraction & Evidence Parsing Pipeline", "High-Speed, Reproducible Parsing with pdfplumber, python-docx, and Regex Taxonomies")

    draw_box(ax, 0.5, 4.2, 2.0, 1.2, "1. File Upload\n- PDF / DOCX / TXT\n- Max 10MB Check\n- Filename Sanitized", color=NAVY_BLUE, fontsize=8)
    draw_box(ax, 2.8, 4.2, 2.0, 1.2, "2. Text Extractor\n- pdfplumber layout\n- python-docx paras\n- Multi-encoding UTF-8", color=ELECTRIC_BLUE, fontsize=8)
    draw_box(ax, 5.1, 4.2, 2.0, 1.2, "3. Section Segmenter\n- Boundary Regex\n- Experience Block\n- Education Block", color=SKY_BLUE, fontsize=8)
    draw_box(ax, 7.4, 4.2, 2.1, 1.2, "4. Taxonomy Matcher\n- Exact & Alias Match\n- Context Snippets\n- Zero Hallucination", color=EMERALD, fontsize=8)

    draw_arrow(ax, 2.5, 4.8, 2.8, 4.8, color=NAVY_DARK)
    draw_arrow(ax, 4.8, 4.8, 5.1, 4.8, color=NAVY_DARK)
    draw_arrow(ax, 7.1, 4.8, 7.4, 4.8, color=NAVY_DARK)

    draw_box(ax, 1.5, 1.2, 3.2, 1.4, "Storage Tier (Dual Mode)\n- Raw Binary in S3 / Local\n- Extracted Text Cached in S3\n- Sub-Second Text Retrieval", color=AMBER, fontsize=8)
    draw_box(ax, 5.3, 1.2, 3.2, 1.4, "Database Synchronization\n- Candidate Profile Updated\n- CandidateSkill + Evidence Text\n- Structured JSON Profile Ready", color=PURPLE, fontsize=8)

    draw_arrow(ax, 3.8, 4.2, 3.1, 2.6, color=AMBER, text="Save Raw/Text")
    draw_arrow(ax, 8.4, 4.2, 6.9, 2.6, color=PURPLE, text="Persist Skills")

    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, "fig_04_resume_pipeline.png"), dpi=300, bbox_inches='tight')
    plt.close()

# ==========================================
# 9. Volume 05: Comprehensive ERD Diagram
# ==========================================
def gen_vol05_erd():
    fig, ax = plt.subplots(figsize=(12, 8.5), dpi=300)
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 9)
    set_diagram_style(fig, ax, "SkillAlign Relational Database Entity-Relationship Diagram (ERD)", "23 Normalized SQLAlchemy Models Adhering to 3NF/BCNF with Full Referential Constraints")

    # Core entities
    draw_box(ax, 0.4, 7.2, 2.2, 1.2, "ROLES\n- id (PK)\n- name (UNIQUE)\n- description", color=NAVY_BLUE, fontsize=7.5)
    draw_box(ax, 3.0, 7.2, 2.5, 1.2, "USERS\n- id (PK)\n- email (UNIQUE)\n- hashed_password\n- role_id (FK -> Roles)", color=NAVY_BLUE, fontsize=7.5)
    draw_box(ax, 6.0, 7.2, 2.5, 1.2, "JOBS\n- id (PK)\n- title, department\n- min_experience\n- created_by (FK -> Users)", color=ELECTRIC_BLUE, fontsize=7.5)
    draw_box(ax, 9.0, 7.2, 2.5, 1.2, "SKILLS\n- id (PK)\n- name (UNIQUE)\n- category\n- aliases (JSON)", color=SKY_BLUE, fontsize=7.5)

    draw_arrow(ax, 2.6, 7.8, 3.0, 7.8, color=NAVY_DARK, text="1:N")
    draw_arrow(ax, 5.5, 7.8, 6.0, 7.8, color=NAVY_DARK, text="1:N")

    # Middle layer
    draw_box(ax, 0.4, 4.8, 2.5, 1.3, "CANDIDATES\n- id (PK)\n- user_id (FK -> Users, UQ)\n- phone, location, exp\n- parsed_data (JSON)", color=EMERALD, fontsize=7.5)
    draw_box(ax, 3.3, 4.8, 2.5, 1.3, "CANDIDATE_SKILLS\n- id (PK)\n- candidate_id (FK)\n- skill_id (FK)\n- proficiency, evidence_text", color=EMERALD, fontsize=7.5)
    draw_box(ax, 6.2, 4.8, 2.5, 1.3, "JOB_SKILLS\n- id (PK)\n- job_id (FK)\n- skill_id (FK)\n- weight (1-5), is_mandatory", color=ELECTRIC_BLUE, fontsize=7.5)
    draw_box(ax, 9.1, 4.8, 2.5, 1.3, "JOB_INTERVIEW_ROUNDS\n- id (PK)\n- job_id (FK)\n- round_number, round_name\n- evaluator_role", color=ELECTRIC_BLUE, fontsize=7.5)

    draw_arrow(ax, 3.5, 7.2, 1.6, 6.1, color=EMERALD, text="1:1")
    draw_arrow(ax, 1.6, 4.8, 3.3, 5.4, color=EMERALD, text="1:N")
    draw_arrow(ax, 9.5, 7.2, 4.5, 6.1, color=SKY_BLUE, text="1:N")
    draw_arrow(ax, 7.2, 7.2, 7.2, 6.1, color=ELECTRIC_BLUE, text="1:N")
    draw_arrow(ax, 9.5, 7.2, 7.8, 6.1, color=SKY_BLUE, text="1:N")
    draw_arrow(ax, 7.2, 7.2, 9.8, 6.1, color=ELECTRIC_BLUE, text="1:N")

    # Bottom layer: Recruitment & Interviews
    draw_box(ax, 0.4, 2.2, 2.6, 1.4, "MATCH_RESULTS\n- id (PK)\n- job_id (FK)\n- candidate_id (FK)\n- overall_score, state\n- skill_score, exp_score", color=PURPLE, fontsize=7.5)
    draw_box(ax, 3.3, 2.2, 2.5, 1.4, "INTERVIEWS\n- id (PK)\n- match_result_id (FK)\n- round_number, state\n- scheduled_time, meet_link", color=PURPLE, fontsize=7.5)
    draw_box(ax, 6.2, 2.2, 2.5, 1.4, "INTERVIEW_FEEDBACKS\n- id (PK)\n- interview_id (FK)\n- interviewer_id (FK)\n- decision (GO/NO_GO), score", color=PURPLE, fontsize=7.5)
    draw_box(ax, 9.1, 2.2, 2.5, 1.4, "OFFERS\n- id (PK)\n- match_result_id (FK, UQ)\n- base_salary, bonus\n- status, token, pdf_url", color=AMBER, fontsize=7.5)

    draw_arrow(ax, 1.6, 4.8, 1.6, 3.6, color=PURPLE, text="1:N")
    draw_arrow(ax, 7.2, 4.8, 2.2, 3.6, color=PURPLE, text="1:N")
    draw_arrow(ax, 3.0, 2.9, 3.3, 2.9, color=PURPLE, text="1:N")
    draw_arrow(ax, 5.8, 2.9, 6.2, 2.9, color=PURPLE, text="1:N")
    draw_arrow(ax, 3.0, 2.3, 9.1, 2.3, color=AMBER, text="1:1", rad=-0.2)

    # Ancillary tables
    draw_box(ax, 0.4, 0.4, 2.6, 1.1, "AUDIT_LOGS\n- id (PK), actor_id (FK)\n- action, prev_state, new_state\n- timestamp, metadata", color=SLATE_DARK, fontsize=7.5)
    draw_box(ax, 3.3, 0.4, 2.5, 1.1, "NOTIFICATIONS\n- id (PK), user_id (FK)\n- title, message, is_read\n- type, link_url", color=SLATE_DARK, fontsize=7.5)
    draw_box(ax, 6.2, 0.4, 2.5, 1.1, "RECRUITMENT_TASKS\n- id (PK), user_id (FK)\n- match_result_id (FK)\n- task_type, is_completed", color=SLATE_DARK, fontsize=7.5)
    draw_box(ax, 9.1, 0.4, 2.5, 1.1, "CANDIDATE_BLACKLISTS\n- id (PK), candidate_id (FK)\n- reason, expires_at (180d)\n- cooling_off_active", color=ROSE, fontsize=7.5)

    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, "fig_05_erd.png"), dpi=300, bbox_inches='tight')
    plt.close()

# ==========================================
# 10. Volume 06: API Gateway & Router Flow
# ==========================================
def gen_vol06_api_gateway():
    fig, ax = plt.subplots(figsize=(11, 7), dpi=300)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 7)
    set_diagram_style(fig, ax, "SkillAlign REST API Gateway & Request Dispatch Architecture", "15 Modular FastAPI Routers, JWT Interceptors & RBAC Dependency Guards")

    draw_box(ax, 0.5, 5.2, 2.0, 1.2, "Client Request\nAxios Client (api.ts)\nBearer JWT Header\nAuto 401 Eviction", color=ELECTRIC_BLUE, fontsize=8)
    draw_box(ax, 3.2, 5.2, 2.2, 1.2, "FastAPI Middleware\nCORS Whitelist\nSlowAPI Rate Limiter\nException Handler", color=NAVY_BLUE, fontsize=8)
    draw_box(ax, 6.1, 5.2, 3.4, 1.2, "RBAC Security Dependencies\nrequire_admin | require_hr\nrequire_recruiter | get_current_user", color=PURPLE, fontsize=8)

    draw_arrow(ax, 2.5, 5.8, 3.2, 5.8, color=SLATE_DARK)
    draw_arrow(ax, 5.4, 5.8, 6.1, 5.8, color=SLATE_DARK)

    routers = [
        ("Auth (/api/auth)", 0.5, 3.4, EMERALD),
        ("Jobs (/api/jobs)", 2.9, 3.4, EMERALD),
        ("Candidates (/api/candidates)", 5.3, 3.4, EMERALD),
        ("Matching (/api/matching)", 7.7, 3.4, EMERALD),
        ("Workflow (/api/workflow)", 0.5, 2.0, SKY_BLUE),
        ("Offers (/api/offers)", 2.9, 2.0, SKY_BLUE),
        ("Tasks (/api/tasks)", 5.3, 2.0, SKY_BLUE),
        ("Admin (/api/admin)", 7.7, 2.0, SKY_BLUE),
    ]

    for name, x, y, col in routers:
        draw_box(ax, x, y, 2.0, 0.9, name, color=col, fontsize=7.5)

    draw_box(ax, 0.5, 0.4, 9.0, 1.0, "SQLAlchemy 2.0 ORM Session (get_db)\nTransaction Commit / Rollback | Connection Pool | Parameterized Query Execution", color=AMBER, text_color=NAVY_DARK, fontsize=8.5)

    for x in [1.5, 3.9, 6.3, 8.7]:
        draw_arrow(ax, 7.8, 5.2, x, 4.3, color=PURPLE)
        draw_arrow(ax, x, 2.0, x, 1.4, color=AMBER)

    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, "fig_06_api_gateway.png"), dpi=300, bbox_inches='tight')
    plt.close()

# ==========================================
# 11. Volume 07: Security Architecture & Sequences
# ==========================================
def gen_vol07_security():
    fig, ax = plt.subplots(figsize=(11, 7), dpi=300)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 7.5)
    set_diagram_style(fig, ax, "SkillAlign Multi-Layered Security Architecture", "7 Defense-in-Depth Layers Protecting Authentication, API Endpoints, Data, and Storage")

    sec_layers = [
        ("Layer 1: Transport & Network Security", 6.2, ELECTRIC_BLUE, "HTTPS Strict Transport Security | Strict CORS Whitelist for Approved Frontends"),
        ("Layer 2: Edge & Rate Limiting Defense", 5.2, NAVY_BLUE, "SlowAPI In-Memory Rate Limiter (5 requests/min on Auth/OTP endpoints per IP)"),
        ("Layer 3: Cryptographic Identity & Authentication", 4.2, SKY_BLUE, "Direct Bcrypt Password Hashing with Standard Salt | 72-Byte Truncation Guard"),
        ("Layer 4: Stateless Session & Token Claims", 3.2, PURPLE, "HS256 HMAC-SHA256 JWT Signed Claims (Subject, Role, Email, UTC Expiration)"),
        ("Layer 5: Public Tokenized Workflow Security", 2.2, EMERALD, "High-Entropy 256-Bit (32-byte) Cryptographic Tokens for Slot Picker & Offer Signing"),
        ("Layer 6: Input Validation & ORM Parameterization", 1.2, AMBER, "Pydantic v2 Strict DTO Schema Validation | SQLAlchemy Parameterized SQL against Injection"),
        ("Layer 7: File Upload Sanitation & Sandbox Storage", 0.2, ROSE, "MIME & Extension Whitelist (.pdf/.docx) | Traversal Stripping | S3 Secure Buckets")
    ]

    for title, y, col, desc in sec_layers:
        draw_box(ax, 0.6, y, 8.8, 0.8, f"{title}\n{desc}", color=col, text_color=WHITE, fontsize=8.5, radius=0.02)

    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, "fig_07_security_layers.png"), dpi=300, bbox_inches='tight')
    plt.close()

def gen_vol07_sequences():
    # 1. Login & Auth Sequence
    fig, ax = plt.subplots(figsize=(11, 6.5), dpi=300)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 7.5)
    set_diagram_style(fig, ax, "User Authentication & JWT Issuance Sequence", "Secure Bcrypt Password Verification & HS256 JWT Token Signing")

    actors = [("Candidate / User", 1.2, ELECTRIC_BLUE), ("React Frontend", 3.6, SKY_BLUE), ("FastAPI (auth.py)", 6.0, NAVY_BLUE), ("AuthService & DB", 8.6, EMERALD)]
    for name, x, col in actors:
        draw_box(ax, x - 0.9, 6.6, 1.8, 0.6, name, color=col, fontsize=8)
        ax.plot([x, x], [0.6, 6.6], color=BORDER_GRAY, linestyle='--', linewidth=1.2, zorder=1)

    msgs = [
        (1.2, 3.6, 5.8, "1. Enter Email & Password", ELECTRIC_BLUE),
        (3.6, 6.0, 5.1, "2. POST /api/auth/login {email, password}", NAVY_BLUE),
        (6.0, 8.6, 4.4, "3. Query User Record & Verify Bcrypt Hash", EMERALD),
        (8.6, 6.0, 3.7, "4. Return Valid User -> Sign HS256 JWT Token", EMERALD),
        (6.0, 3.6, 3.0, "5. Return 200 OK + JWT Access Token", NAVY_BLUE),
        (3.6, 3.6, 2.2, "6. Save JWT in localStorage & AuthContext", SKY_BLUE),
        (3.6, 1.2, 1.4, "7. Redirect to Role-Tailored Dashboard", ELECTRIC_BLUE)
    ]
    for x1, x2, y, txt, col in msgs:
        draw_arrow(ax, x1, y, x2, y, color=col, text=txt, text_offset=(0, 0.12))

    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, "fig_07_seq_auth_jwt.png"), dpi=300, bbox_inches='tight')
    plt.close()

    # 2. Offer Generation Sequence
    fig, ax = plt.subplots(figsize=(11, 7.5), dpi=300)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 8.5)
    set_diagram_style(fig, ax, "Offer Letter Generation & Acceptance Sequence Flow", "End-to-End Compensation Negotiation, HR Approval, ReportLab PDF Compilation, and Candidate Signing")

    actors = [("Candidate", 1.0, ELECTRIC_BLUE), ("Recruiter", 3.2, PURPLE), ("Hiring Manager", 5.4, NAVY_BLUE), ("FastAPI Backend", 7.6, EMERALD), ("S3 / DB", 9.2, AMBER)]
    for name, x, col in actors:
        draw_box(ax, x - 0.7, 7.6, 1.4, 0.6, name, color=col, fontsize=8)
        ax.plot([x, x], [0.8, 7.6], color=BORDER_GRAY, linestyle='--', linewidth=1.2, zorder=1)

    msgs = [
        (3.2, 5.4, 7.0, "1. Propose Compensation Terms (Base + Bonus)", AMBER),
        (5.4, 7.6, 6.3, "2. PUT /api/offers/{id}/approve (HR Approval)", NAVY_BLUE),
        (7.6, 9.2, 5.6, "3. ReportLab Generates Offer PDF & Stores in S3", EMERALD),
        (7.6, 9.2, 4.9, "4. Generate 256-bit Public Token & Save DB", EMERALD),
        (7.6, 1.0, 4.2, "5. Send Email with Public Offer Portal Link", ELECTRIC_BLUE),
        (1.0, 7.6, 3.5, "6. Candidate Clicks Link & Downloads PDF", ELECTRIC_BLUE),
        (1.0, 7.6, 2.6, "7. POST /api/offers/public/{token}/accept (Signed)", EMERALD),
        (7.6, 9.2, 1.8, "8. Update State: HIRED & Log Audit Entry", EMERALD),
        (7.6, 3.2, 1.1, "9. Notify Recruiter & HM: Position Filled", PURPLE)
    ]
    for x1, x2, y, txt, col in msgs:
        draw_arrow(ax, x1, y, x2, y, color=col, text=txt, text_offset=(0, 0.12))

    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, "fig_07_seq_offer_generation.png"), dpi=300, bbox_inches='tight')
    plt.close()

# ==========================================
# 12. Volume 08: Infrastructure & Scalability
# ==========================================
def gen_vol08_deployment():
    fig, ax = plt.subplots(figsize=(11, 7), dpi=300)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 7)
    set_diagram_style(fig, ax, "SkillAlign Production Deployment & Infrastructure Topology", "Containerized Single-Host / Multi-Tier Cloud Deployment Architecture")

    draw_box(ax, 0.5, 4.8, 2.0, 1.4, "Client Browsers\n(Chrome / Safari)\nReact 18 SPA\nVite Production Build\nServed on Port 3000/5173", color=ELECTRIC_BLUE, fontsize=8)
    draw_box(ax, 3.2, 4.8, 1.8, 1.4, "Nginx / Gateway\nReverse Proxy\nSSL / TLS Termination\nStatic File Caching\nRate Limit Pass", color=NAVY_BLUE, fontsize=8)
    draw_arrow(ax, 2.5, 5.5, 3.2, 5.5, color=NAVY_DARK, text="HTTPS")

    draw_box(ax, 5.7, 4.8, 2.0, 1.4, "FastAPI Backend\nUvicorn ASGI (Port 8000)\n4-8 Worker Processes\nSQLAlchemy Engine Pool\nSync/Async Handlers", color=EMERALD, fontsize=8)
    draw_arrow(ax, 5.0, 5.5, 5.7, 5.5, color=NAVY_DARK, text="Proxy Pass")

    draw_box(ax, 8.2, 4.8, 1.4, 1.4, "External AI\nGoogle Gemini\nREST API\nSendGrid Mail\nTwilio SMS", color=PURPLE, fontsize=7.5)
    draw_arrow(ax, 7.7, 5.5, 8.2, 5.5, color=PURPLE, text="HTTPS")

    draw_box(ax, 3.2, 1.8, 2.0, 1.4, "Redis Broker\nIn-Memory Cache\nCelery Task Queue\nOTP Cooldown Store", color=ROSE, fontsize=8)
    draw_arrow(ax, 6.2, 4.8, 4.5, 3.2, color=ROSE, text="Enqueue Task")

    draw_box(ax, 0.5, 1.8, 2.0, 1.4, "Celery Workers\nResume Text Parsing\nAsync PDF Engine\nEmail Dispatchers", color=AMBER, fontsize=8)
    draw_arrow(ax, 3.2, 2.5, 2.5, 2.5, color=AMBER, text="Consume")

    draw_box(ax, 5.7, 1.8, 2.0, 1.4, "PostgreSQL 15+\nRelational Storage\n23 Normalized Tables\nConnection Pooling", color=NAVY_BLUE, fontsize=8)
    draw_arrow(ax, 6.7, 4.8, 6.7, 3.2, color=NAVY_BLUE, text="SQL Queries")

    draw_box(ax, 8.2, 1.8, 1.4, 1.4, "AWS S3 Bucket\nResume Blobs\nExtracted Txt\nOffer PDFs", color=SKY_BLUE, fontsize=7.5)
    draw_arrow(ax, 7.2, 4.8, 8.4, 3.2, color=SKY_BLUE, text="Boto3 Upload")

    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, "fig_08_deployment_topology.png"), dpi=300, bbox_inches='tight')
    plt.close()

# ==========================================
# 13. Volume 09: 15-Step API Demo Flow
# ==========================================
def gen_vol09_demo_flow():
    fig, ax = plt.subplots(figsize=(12, 6.5), dpi=300)
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 6.5)
    set_diagram_style(fig, ax, "15-Step End-to-End API / Postman Engineering Demo Flow", "Live Verification Sequence Traversing Authentication, Matching, Interviews, and Offer Letter Acceptance")

    steps = [
        ("1. Auth Login", 0.3, 4.8, ELECTRIC_BLUE),
        ("2. Register Cand", 2.3, 4.8, ELECTRIC_BLUE),
        ("3. Upload Resume", 4.3, 4.8, ELECTRIC_BLUE),
        ("4. Verify Profile", 6.3, 4.8, ELECTRIC_BLUE),
        ("5. HR Create Job", 8.3, 4.8, NAVY_BLUE),
        ("6. Run Matching", 10.3, 4.8, PURPLE),

        ("7. Inspect Fit", 10.3, 2.8, PURPLE),
        ("8. Claim Cand", 8.3, 2.8, ELECTRIC_BLUE),
        ("9. Submit Shortlist", 6.3, 2.8, PURPLE),
        ("10. Request Round", 4.3, 2.8, NAVY_BLUE),
        ("11. Propose Slots", 2.3, 2.8, SKY_BLUE),
        ("12. Pick Slot", 0.3, 2.8, CYAN),

        ("13. HM Go Feedback", 2.3, 0.8, NAVY_BLUE),
        ("14. Draft/Approve Offer", 5.3, 0.8, AMBER),
        ("15. Accept Offer PDF", 8.3, 0.8, EMERALD),
    ]

    for name, x, y, col in steps:
        draw_box(ax, x, y, 1.7, 0.9, name, color=col, fontsize=7.5)

    for x in [2.0, 4.0, 6.0, 8.0, 10.0]:
        draw_arrow(ax, x, 5.25, x + 0.3, 5.25, color=SLATE_DARK)

    draw_arrow(ax, 11.15, 4.8, 11.15, 3.7, color=SLATE_DARK)

    for x in [10.3, 8.3, 6.3, 4.3, 2.3]:
        draw_arrow(ax, x, 3.25, x - 0.3, 3.25, color=SLATE_DARK)

    draw_arrow(ax, 1.15, 2.8, 2.3, 1.5, color=SLATE_DARK, rad=0.2)

    draw_arrow(ax, 4.0, 1.25, 5.3, 1.25, color=SLATE_DARK)
    draw_arrow(ax, 7.0, 1.25, 8.3, 1.25, color=SLATE_DARK)

    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, "fig_09_api_demo_flow.png"), dpi=300, bbox_inches='tight')
    plt.close()

def main():
    print("[INFO] Generating high-resolution technical diagrams for SkillAlign documentation...")
    gen_platform_overview()
    print("[OK] Platform Overview Diagram generated.")
    gen_vol01_architecture()
    print("[OK] Volume 01 Architecture Diagram generated.")
    gen_vol02_state_machine()
    print("[OK] Volume 02 State Machine Diagram generated.")
    gen_vol02_recruitment_lifecycle()
    print("[OK] Volume 02 Lifecycle Diagram generated.")
    gen_vol02_role_workflows()
    print("[OK] Volume 02 Role Workflows Diagram generated.")
    gen_vol03_feature_map()
    print("[OK] Volume 03 Feature Map Diagram generated.")
    gen_vol04_matching_engine()
    print("[OK] Volume 04 Matching Engine Diagram generated.")
    gen_vol04_resume_pipeline()
    print("[OK] Volume 04 Resume Pipeline Diagram generated.")
    gen_vol05_erd()
    print("[OK] Volume 05 ERD Diagram generated.")
    gen_vol06_api_gateway()
    print("[OK] Volume 06 API Gateway Diagram generated.")
    gen_vol07_security()
    print("[OK] Volume 07 Security Layers Diagram generated.")
    gen_vol07_sequences()
    print("[OK] Volume 07 Sequence Diagrams generated.")
    gen_vol08_deployment()
    print("[OK] Volume 08 Deployment Diagram generated.")
    gen_vol09_demo_flow()
    print("[OK] Volume 09 API Demo Flow Diagram generated.")
    print("[SUCCESS] All 14 visual diagrams successfully rendered in docs/diagrams/!")

if __name__ == "__main__":
    main()
