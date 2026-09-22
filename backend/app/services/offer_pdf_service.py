"""
Offer PDF Generation Service
==============================
Generates an executive-level, professional corporate offer letter PDF using ReportLab.

Output: A multi-page PDF offer letter containing:
  - Official Corporate Letterhead & Branding
  - Formal Offer Reference Number and Issuance Metadata
  - Candidate Addressee Block (with full name and contact info)
  - Formal Executive Salutation and Appointment Introduction
  - Structured Employment Terms & Position Details Schedule
  - Comprehensive Annual & Monthly Compensation Breakdown (Annexure A)
  - Key Employment Terms, Conditions, and Confidentiality (Annexure B)
  - Dual Execution / Corporate Sign-Off and Candidate Acceptance Declaration
  - Dynamic Page Numbering ("Page X of Y") & Running Footers

Usage:
    from app.services.offer_pdf_service import OfferPDFService
    pdf_bytes = OfferPDFService.generate(offer, candidate, job, recruiter, hm)
"""

import io
import logging
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger("skillalign.offer_pdf")

# ── ReportLab Imports ──────────────────────────────────────────────────────────
try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm, mm
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
        KeepTogether, PageBreak
    )
    from reportlab.platypus.flowables import HRFlowable
    from reportlab.pdfgen import canvas
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False
    logger.warning("ReportLab is not installed. PDF generation will not be available.")


# ── Color Palette ──────────────────────────────────────────────────────────────
COLOR_PRIMARY       = colors.HexColor("#0F172A")   # Slate 900 / Deep Navy
COLOR_SECONDARY     = colors.HexColor("#1E293B")   # Slate 800
COLOR_ACCENT        = colors.HexColor("#1D4ED8")   # Royal Blue
COLOR_ACCENT_LIGHT  = colors.HexColor("#EFF6FF")   # Blue 50 tint
COLOR_GOLD          = colors.HexColor("#B45309")   # Amber/Gold 700
COLOR_GOLD_LIGHT    = colors.HexColor("#FEF3C7")   # Amber 100
COLOR_EMERALD       = colors.HexColor("#047857")   # Emerald 700
COLOR_TEXT_MAIN     = colors.HexColor("#1E293B")   # Slate 800
COLOR_TEXT_MUTED    = colors.HexColor("#64748B")   # Slate 500
COLOR_BORDER        = colors.HexColor("#E2E8F0")   # Slate 200
COLOR_ROW_ALT       = colors.HexColor("#F8FAFC")   # Slate 50


def _fmt_currency(amount: Optional[float], currency: str = "INR") -> str:
    """Format a currency amount with standard separators."""
    if amount is None:
        return "—"
    if currency == "INR":
        return f"₹ {amount:,.2f}"
    return f"{currency} {amount:,.2f}"


def _fmt_date(dt: Optional[datetime]) -> str:
    """Format a datetime for display."""
    if dt is None:
        return "—"
    if hasattr(dt, "strftime"):
        return dt.strftime("%d %B %Y")
    return str(dt)[:10]


def _safe_str(val, fallback: str = "—") -> str:
    """Safely convert a value to string with fallback."""
    if val is None or str(val).strip() == "" or str(val).strip() == "None":
        return fallback
    return str(val).strip()


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas that adds official running headers and 'Page X of Y' footers.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count: int):
        self.saveState()
        page_w, page_h = A4

        # ── Running Header (on pages > 1) ─────────────────────────────────────
        if self._pageNumber > 1:
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(COLOR_TEXT_MUTED)
            self.drawString(2 * cm, page_h - 1.4 * cm, "SKILLALIGN TECHNOLOGIES — EMPLOYMENT OFFER LETTER")
            self.drawRightString(page_w - 2 * cm, page_h - 1.4 * cm, "PRIVATE & CONFIDENTIAL")
            self.setStrokeColor(COLOR_BORDER)
            self.setLineWidth(0.75)
            self.line(2 * cm, page_h - 1.55 * cm, page_w - 2 * cm, page_h - 1.55 * cm)

        # ── Running Footer (all pages) ─────────────────────────────────────────
        self.setStrokeColor(COLOR_BORDER)
        self.setLineWidth(0.75)
        self.line(2 * cm, 1.8 * cm, page_w - 2 * cm, 1.8 * cm)

        self.setFont("Helvetica", 7.5)
        self.setFillColor(COLOR_TEXT_MUTED)
        self.drawString(
            2 * cm,
            1.35 * cm,
            "SkillAlign Technologies Pvt. Ltd. | CIN: U72200KA2024PTC184201 | Confidential Document"
        )
        self.drawRightString(
            page_w - 2 * cm,
            1.35 * cm,
            f"Page {self._pageNumber} of {page_count}"
        )
        self.restoreState()


class OfferPDFService:
    """Generates corporate offer letter PDFs using ReportLab."""

    @staticmethod
    def generate(
        offer,
        candidate,
        job,
        recruiter=None,
        hm_user=None,
        company_name: str = "SkillAlign Technologies Pvt. Ltd.",
    ) -> bytes:
        """
        Generate a comprehensive, executive-grade corporate offer letter PDF.

        Args:
            offer: Offer ORM model instance
            candidate: Candidate ORM model instance
            job: Job ORM model instance
            recruiter: User ORM instance for the recruiter
            hm_user: User ORM instance for the hiring manager
            company_name: Company branding name

        Returns:
            PDF bytes
        """
        if not REPORTLAB_AVAILABLE:
            raise RuntimeError(
                "ReportLab is not installed. Run: pip install reportlab"
            )

        # ── Resolve Candidate Identity Robustly ────────────────────────────────
        # Candidate model has full_name; User model has name.
        cand_user = getattr(candidate, "user", None)
        mr = getattr(offer, "match_result", None)
        mr_candidate = getattr(mr, "candidate", None) if mr else None
        mr_user = getattr(mr_candidate, "user", None) if mr_candidate else None

        raw_name = (
            getattr(candidate, "full_name", None)
            or getattr(candidate, "name", None)
            or (getattr(cand_user, "name", None) if cand_user else None)
            or (getattr(cand_user, "full_name", None) if cand_user else None)
            or (getattr(mr_candidate, "full_name", None) if mr_candidate else None)
            or (getattr(mr_user, "name", None) if mr_user else None)
            or getattr(offer, "candidate_name", None)
        )
        cand_name = _safe_str(raw_name, fallback="Valued Candidate")

        cand_email = _safe_str(
            getattr(candidate, "email", None)
            or (getattr(cand_user, "email", None) if cand_user else None)
            or (getattr(mr_user, "email", None) if mr_user else None)
        )

        cand_phone = _safe_str(
            getattr(candidate, "phone", None)
            or (getattr(cand_user, "phone_number", None) if cand_user else None)
            or (getattr(mr_candidate, "phone", None) if mr_candidate else None)
        )

        cand_city = _safe_str(
            getattr(candidate, "city", None)
            or getattr(candidate, "address", None)
            or (getattr(mr_candidate, "city", None) if mr_candidate else None),
            fallback="Bangalore, India"
        )

        # ── Job & Personnel Info ───────────────────────────────────────────────
        job_title = _safe_str(getattr(job, "title", None), fallback="Software Engineer")
        job_dept = _safe_str(getattr(job, "department", None), fallback="Engineering & Technology")
        job_loc = _safe_str(getattr(job, "location", None) or getattr(job, "location_city", None), fallback="Bangalore, Karnataka, India")

        hm_name = "Hiring Authority"
        if hm_user:
            hm_name = _safe_str(getattr(hm_user, "name", None) or getattr(hm_user, "full_name", None), "Hiring Manager")
        rec_name = "Talent Acquisition Team"
        if recruiter:
            rec_name = _safe_str(getattr(recruiter, "name", None) or getattr(recruiter, "full_name", None), "Talent Acquisition Team")

        # ── Offer & Financial Info ─────────────────────────────────────────────
        pdf_ver = getattr(offer, "pdf_version", 1) or 1
        offer_ref = f"SKA-OFF-{datetime.now(timezone.utc).year}-{offer.id:05d}"
        issue_date = _fmt_date(datetime.now(timezone.utc))
        curr = offer.salary_currency or "INR"

        proposed_val = float(offer.proposed_salary) if getattr(offer, "proposed_salary", None) else 0.0
        total_comp_val = float(offer.total_compensation) if getattr(offer, "total_compensation", None) else proposed_val
        fixed_comp_val = float(offer.fixed_compensation) if getattr(offer, "fixed_compensation", None) else (total_comp_val * 0.85 if total_comp_val else None)
        var_comp_val = float(offer.variable_compensation) if getattr(offer, "variable_compensation", None) else (total_comp_val * 0.15 if total_comp_val else None)
        bonus_val = float(offer.bonus) if getattr(offer, "bonus", None) else None
        joining_bonus_val = float(offer.joining_bonus) if getattr(offer, "joining_bonus", None) else None
        other_benefits_val = _safe_str(getattr(offer, "other_benefits", None), fallback="")

        total_comp_str = _fmt_currency(total_comp_val if total_comp_val > 0 else None, curr)
        fixed_comp_str = _fmt_currency(fixed_comp_val, curr)
        var_comp_str = _fmt_currency(var_comp_val, curr)

        joining_date = _fmt_date(getattr(offer, "expected_joining_date", None) or offer.joining_date)
        if joining_date == "—":
            joining_date = "Mutually agreed upon acceptance"

        expiry_date = _fmt_date(offer.offer_expiry_date or offer.expires_at)
        if expiry_date == "—":
            expiry_date = "7 calendar days from issuance"

        work_mode = _safe_str(getattr(offer, "work_mode", None), fallback="Hybrid (Office / Remote)")
        location = _safe_str(getattr(offer, "location", None) or job_loc, fallback="Bangalore Office")
        emp_type = _safe_str(getattr(offer, "employment_type", None), fallback="Full-Time Regular")
        notice_period = _safe_str(getattr(offer, "notice_period", None) or getattr(offer, "joining_timeline", None), fallback="30 Days")
        role_scope = _safe_str(getattr(offer, "role_scope", None), fallback="")
        additional_terms = _safe_str(getattr(offer, "additional_terms", None), fallback="")

        # ── Setup Document ─────────────────────────────────────────────────────
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=1.8 * cm,
            leftMargin=1.8 * cm,
            topMargin=1.8 * cm,
            bottomMargin=2.2 * cm,
            title=f"Employment Offer Letter — {cand_name}",
            author=company_name,
            subject="Official Employment Proposal",
        )

        styles = getSampleStyleSheet()
        story = []

        # ── Typographic Styles ─────────────────────────────────────────────────
        co_title_style = ParagraphStyle(
            "CoTitle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=15,
            textColor=COLOR_PRIMARY,
            leading=18,
            spaceAfter=2,
        )
        co_sub_style = ParagraphStyle(
            "CoSubtitle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=7.5,
            textColor=COLOR_TEXT_MUTED,
            leading=10,
        )
        ref_badge_style = ParagraphStyle(
            "RefBadge",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8,
            textColor=COLOR_PRIMARY,
            alignment=TA_RIGHT,
            leading=11,
        )
        ref_meta_style = ParagraphStyle(
            "RefMeta",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=7.5,
            textColor=COLOR_TEXT_MUTED,
            alignment=TA_RIGHT,
            leading=10,
        )
        doc_heading_style = ParagraphStyle(
            "DocHeading",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=16,
            textColor=COLOR_PRIMARY,
            alignment=TA_CENTER,
            spaceBefore=10,
            spaceAfter=4,
            leading=20,
        )
        doc_subheading_style = ParagraphStyle(
            "DocSubHeading",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8.5,
            textColor=COLOR_ACCENT,
            alignment=TA_CENTER,
            spaceAfter=12,
            leading=11,
        )
        section_title_style = ParagraphStyle(
            "SectionTitle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=10,
            textColor=COLOR_PRIMARY,
            spaceBefore=10,
            spaceAfter=5,
            leading=13,
        )
        body_style = ParagraphStyle(
            "BodyStandard",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9,
            textColor=COLOR_TEXT_MAIN,
            leading=13.5,
            spaceAfter=6,
            alignment=TA_JUSTIFY,
        )
        body_bold_style = ParagraphStyle(
            "BodyBold",
            parent=body_style,
            fontName="Helvetica-Bold",
        )
        table_label_style = ParagraphStyle(
            "TableLabel",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8.5,
            textColor=COLOR_SECONDARY,
            leading=11,
        )
        table_val_style = ParagraphStyle(
            "TableVal",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            textColor=COLOR_TEXT_MAIN,
            leading=11,
        )
        table_val_mono = ParagraphStyle(
            "TableValMono",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8.5,
            textColor=COLOR_PRIMARY,
            leading=11,
        )
        th_style = ParagraphStyle(
            "TableHeader",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8.5,
            textColor=colors.white,
            leading=11,
        )
        sign_label_style = ParagraphStyle(
            "SignLabel",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8.5,
            textColor=COLOR_PRIMARY,
            leading=11,
            alignment=TA_CENTER,
        )
        sign_sub_style = ParagraphStyle(
            "SignSub",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=7.5,
            textColor=COLOR_TEXT_MUTED,
            leading=10,
            alignment=TA_CENTER,
        )

        # ── 1. Header / Letterhead ─────────────────────────────────────────────
        header_table_data = [
            [
                Paragraph(
                    f"<b>{company_name.upper()}</b><br/>"
                    f"<font color='#64748B'>Registered Office: Prestige Tech Park, Outer Ring Road, Bangalore - 560103<br/>"
                    f"CIN: U72200KA2024PTC184201 | Web: www.skillalign.ai | Email: hr@skillalign.ai</font>",
                    co_title_style,
                ),
                Paragraph(
                    f"<b>OFFER REFERENCE:</b> {offer_ref}<br/>"
                    f"<b>ISSUE DATE:</b> {issue_date}<br/>"
                    f"<font color='#B45309'><b>CONFIDENTIAL & PRIVILEGED</b></font>",
                    ref_badge_style,
                ),
            ]
        ]
        header_table = Table(header_table_data, colWidths=["65%", "35%"])
        header_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(header_table)
        story.append(HRFlowable(width="100%", thickness=2, color=COLOR_PRIMARY, spaceAfter=8, spaceBefore=4))

        # ── 2. Addressee & Document Title ──────────────────────────────────────
        story.append(Paragraph("FORMAL OFFER OF EMPLOYMENT", doc_heading_style))
        story.append(Paragraph(f"POSITION: {job_title.upper()} | REQUISITION REF: SKA-REQ-{offer.job_id:04d}", doc_subheading_style))

        # Candidate Addressee Box
        addressee_data = [
            [
                Paragraph(
                    f"<b>To,</b><br/>"
                    f"<font size='10'><b>{cand_name}</b></font><br/>"
                    f"<font color='#64748B'>Email: {cand_email} | Phone: {cand_phone}<br/>"
                    f"Location / Address: {cand_city}</font>",
                    body_style
                )
            ]
        ]
        addressee_table = Table(addressee_data, colWidths=["100%"])
        addressee_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), COLOR_ROW_ALT),
            ("BOX", (0, 0), (-1, -1), 0.75, COLOR_BORDER),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(addressee_table)
        story.append(Spacer(1, 8))

        # ── 3. Formal Opening Salutation ───────────────────────────────────────
        story.append(Paragraph(f"<b>Dear {cand_name},</b>", body_bold_style))
        story.append(Paragraph(
            f"On behalf of <b>{company_name}</b>, we are delighted to extend this formal offer of employment for the "
            f"position of <b>{job_title}</b> within the <b>{job_dept}</b> group. Following our comprehensive evaluation "
            f"and interview process, we are impressed by your qualifications, skills, and the value you will bring to our team.",
            body_style
        ))
        story.append(Paragraph(
            "This letter, together with the Annexures attached hereto, sets out the key terms, compensation parameters, "
            "and conditions governing your employment with the Company.",
            body_style
        ))
        story.append(Spacer(1, 4))

        # ── 4. Appointment Parameters Schedule ─────────────────────────────────
        story.append(Paragraph("1. POSITION & APPOINTMENT PARAMETERS", section_title_style))

        def _row(label: str, val: str):
            return [
                Paragraph(f"<b>{label}</b>", table_label_style),
                Paragraph(val, table_val_style),
            ]

        appointment_data = [
            _row("Position Title", job_title),
            _row("Business Unit / Dept", job_dept),
            _row("Reporting Authority", hm_name),
            _row("Talent Acquisition Partner", rec_name),
            _row("Employment Category", emp_type),
            _row("Work Arrangement", work_mode),
            _row("Primary Base Location", location),
            _row("Proposed Commencement Date", joining_date),
            _row("Offer Validity Window", f"Valid until <b>{expiry_date}</b>"),
        ]
        appt_table = Table(appointment_data, colWidths=["32%", "68%"])
        appt_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), COLOR_ROW_ALT),
            ("ROWBACKGROUNDS", (1, 0), (1, -1), [colors.white, COLOR_ROW_ALT]),
            ("BOX", (0, 0), (-1, -1), 0.75, COLOR_BORDER),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, COLOR_BORDER),
            ("TOPPADDING", (0, 0), (-1, -1), 4.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4.5),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(appt_table)
        story.append(Spacer(1, 8))

        # ── 5. Compensation & Benefits (Annexure A) ────────────────────────────
        story.append(Paragraph("2. COMPENSATION & BENEFITS SCHEDULE (ANNEXURE A)", section_title_style))
        story.append(Paragraph(
            f"Your total annual compensation package (Cost to Company - CTC) is structured as <b>{total_comp_str}</b> "
            f"per annum, subject to applicable statutory deductions, provident fund contributions, and tax withholdings.",
            body_style
        ))

        # Financial breakdown table
        comp_rows = [
            [
                Paragraph("Compensation Component", th_style),
                Paragraph("Annual Structure (INR)", th_style),
                Paragraph("Monthly Equivalent (INR)", th_style),
            ],
            [
                Paragraph("<b>Total Cost to Company (CTC)</b>", table_label_style),
                Paragraph(f"<b>{total_comp_str}</b>", table_val_mono),
                Paragraph(
                    _fmt_currency(total_comp_val / 12 if total_comp_val else None, curr),
                    table_val_mono
                ),
            ],
        ]

        if fixed_comp_val and fixed_comp_val > 0:
            comp_rows.append([
                Paragraph("Fixed Base Salary Component", table_label_style),
                Paragraph(fixed_comp_str, table_val_style),
                Paragraph(_fmt_currency(fixed_comp_val / 12, curr), table_val_style),
            ])

        if var_comp_val and var_comp_val > 0:
            comp_rows.append([
                Paragraph("Performance Incentive / Variable Pay", table_label_style),
                Paragraph(var_comp_str, table_val_style),
                Paragraph("Paid annually upon performance review", table_val_style),
            ])

        if joining_bonus_val and joining_bonus_val > 0:
            comp_rows.append([
                Paragraph("Sign-On / Joining Bonus (One-Time)", table_label_style),
                Paragraph(_fmt_currency(joining_bonus_val, curr), table_val_style),
                Paragraph("Payable with first month payroll", table_val_style),
            ])

        if bonus_val and bonus_val > 0:
            comp_rows.append([
                Paragraph("Annual Retention Bonus", table_label_style),
                Paragraph(_fmt_currency(bonus_val, curr), table_val_style),
                Paragraph("Subject to 12-month tenure completion", table_val_style),
            ])

        if other_benefits_val:
            comp_rows.append([
                Paragraph("Health, Wellness & Additional Perks", table_label_style),
                Paragraph(other_benefits_val, table_val_style),
                Paragraph("Corporate Group Insurance & Benefits", table_val_style),
            ])

        comp_table = Table(comp_rows, colWidths=["42%", "30%", "28%"])
        comp_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), COLOR_PRIMARY),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("BACKGROUND", (0, 1), (-1, 1), COLOR_GOLD_LIGHT),
            ("ROWBACKGROUNDS", (0, 2), (-1, -1), [colors.white, COLOR_ROW_ALT]),
            ("BOX", (0, 0), (-1, -1), 0.75, COLOR_BORDER),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, COLOR_BORDER),
            ("TOPPADDING", (0, 0), (-1, -1), 4.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4.5),
            ("LEFTPADDING", (0, 0), (-1, -1), 7),
            ("RIGHTPADDING", (0, 0), (-1, -1), 7),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(comp_table)
        story.append(Spacer(1, 8))

        # ── 6. Role Scope (if present) ─────────────────────────────────────────
        if role_scope and role_scope != "—":
            story.append(Paragraph("3. ROLE CHARTER & CORE RESPONSIBILITIES", section_title_style))
            story.append(Paragraph(role_scope, body_style))
            story.append(Spacer(1, 4))

        # ── 7. Terms & Conditions (Annexure B) ─────────────────────────────────
        story.append(Paragraph("4. KEY EMPLOYMENT TERMS & CONDITIONS (ANNEXURE B)", section_title_style))
        terms = [
            "<b>Background Verification:</b> This offer is contingent upon satisfactory verification of your professional credentials, academic qualifications, previous employment history, and criminal background checks.",
            "<b>Probationary Period:</b> You will be on probation for an initial period of 90 days from your date of joining, during which your performance and integration will be assessed for confirmation.",
            "<b>Confidentiality & Non-Disclosure:</b> You agree to protect all confidential information, proprietary technical assets, client data, and trade secrets of SkillAlign Technologies in perpetuity.",
            "<b>Intellectual Property:</b> All inventions, software code, processes, algorithms, and designs developed during your employment shall be the sole and exclusive property of the Company.",
            f"<b>Separation & Notice Period:</b> Following probation confirmation, either party may terminate employment by providing <b>{notice_period}</b> written notice or basic salary in lieu thereof.",
            f"<b>Offer Acceptance Protocol:</b> Please execute this offer by signing and returning a copy, or by submitting digital acceptance via the SkillAlign candidate portal on or before <b>{expiry_date}</b>.",
        ]
        if additional_terms and additional_terms != "—":
            terms.append(f"<b>Special Stipulations:</b> {additional_terms}")

        for i, term_txt in enumerate(terms, 1):
            story.append(Paragraph(f"{i}. {term_txt}", body_style))

        story.append(Spacer(1, 10))

        # ── 8. Dual Execution & Acceptance Block ───────────────────────────────
        story.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER, spaceBefore=4, spaceAfter=8))
        story.append(Paragraph("5. EXECUTION & ACCEPTANCE DECLARATION", section_title_style))

        story.append(Paragraph(
            f"I, <b>{cand_name}</b>, hereby acknowledge receipt of this offer letter. I confirm that I have read, "
            f"understood, and voluntarily agree to the terms, compensation structure, and employment stipulations "
            f"contained herein.",
            body_style
        ))
        story.append(Spacer(1, 8))

        sig_data = [
            [
                Paragraph("<b>FOR SKILLALIGN TECHNOLOGIES</b>", sign_label_style),
                Paragraph(f"<b>CANDIDATE ACCEPTANCE ({cand_name.upper()})</b>", sign_label_style),
            ],
            [
                Paragraph(
                    "<br/><font color='#1D4ED8'><b>[DIGITALLY AUTHORIZED]</b></font><br/>"
                    "__________________________________<br/>"
                    f"<b>{hm_name}</b><br/>"
                    "<font color='#64748B' size='7.5'>Authorized Corporate Signatory<br/>SkillAlign Technologies Pvt. Ltd.</font>",
                    sign_sub_style
                ),
                Paragraph(
                    "<br/><br/>"
                    "__________________________________<br/>"
                    f"<b>{cand_name}</b><br/>"
                    "<font color='#64748B' size='7.5'>Signature & Formal Acceptance<br/>"
                    f"Date: ________________________</font>",
                    sign_sub_style
                ),
            ]
        ]
        sig_table = Table(sig_data, colWidths=["50%", "50%"])
        sig_table.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.75, COLOR_BORDER),
            ("BACKGROUND", (0, 0), (-1, 0), COLOR_ROW_ALT),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, COLOR_BORDER),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
            ("RIGHTPADDING", (0, 0), (-1, -1), 12),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))

        # Keep signature section together
        story.append(KeepTogether([sig_table]))

        # ── Build Document with NumberedCanvas ─────────────────────────────────
        doc.build(story, canvasmaker=NumberedCanvas)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        logger.info(
            f"Generated executive offer PDF for offer_id={offer.id}, candidate='{cand_name}', size={len(pdf_bytes)} bytes"
        )
        return pdf_bytes
