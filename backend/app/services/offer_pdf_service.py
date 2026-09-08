"""
Offer PDF Generation Service
==============================
Generates a professional corporate offer letter PDF using ReportLab.

Output: A multi-page PDF offer letter containing:
  - Company header / branding
  - Offer reference number and date
  - Candidate details
  - Position and compensation details
  - Terms, conditions, and acceptance block

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
        HRFlowable, KeepTogether
    )
    from reportlab.platypus.flowables import HRFlowable
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False
    logger.warning("ReportLab is not installed. PDF generation will not be available.")


# ── Color Palette ──────────────────────────────────────────────────────────────
BRAND_PRIMARY   = colors.HexColor("#1A2E4A")   # Dark navy
BRAND_ACCENT    = colors.HexColor("#0066CC")   # Corporate blue
BRAND_LIGHT     = colors.HexColor("#E8F0F8")   # Light blue bg
BRAND_GOLD      = colors.HexColor("#C8922A")   # Gold accent
TEXT_PRIMARY    = colors.HexColor("#1A1A1A")   # Near-black
TEXT_SECONDARY  = colors.HexColor("#4A5568")   # Dark gray
TEXT_MUTED      = colors.HexColor("#718096")   # Muted gray
DIVIDER_COLOR   = colors.HexColor("#CBD5E0")   # Light divider


def _fmt_currency(amount: Optional[float], currency: str = "INR") -> str:
    """Format a currency amount."""
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
    return str(dt)


def _safe_str(val, fallback: str = "—") -> str:
    """Safely convert a value to string with fallback."""
    if val is None or str(val).strip() == "":
        return fallback
    return str(val).strip()


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
        Generate the PDF offer letter.

        Args:
            offer: Offer ORM model instance
            candidate: Candidate ORM model instance
            job: Job ORM model instance
            recruiter: User ORM instance for the recruiter
            hm_user: User ORM instance for the hiring manager
            company_name: Company name for branding

        Returns:
            PDF bytes

        Raises:
            RuntimeError: If ReportLab is not installed
        """
        if not REPORTLAB_AVAILABLE:
            raise RuntimeError(
                "ReportLab is not installed. Run: pip install reportlab"
            )

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2 * cm,
            leftMargin=2 * cm,
            topMargin=2.5 * cm,
            bottomMargin=2.5 * cm,
            title=f"Offer Letter — {_safe_str(getattr(candidate, 'name', None) or getattr(getattr(candidate, 'user', None), 'full_name', None))}",
            author=company_name,
            subject="Employment Offer Letter",
        )

        styles = getSampleStyleSheet()
        story = []

        # ── Custom Styles ──────────────────────────────────────────────────────
        h1 = ParagraphStyle("H1", parent=styles["Normal"],
            fontName="Helvetica-Bold", fontSize=22, textColor=BRAND_PRIMARY,
            spaceAfter=4, leading=26)
        h2 = ParagraphStyle("H2", parent=styles["Normal"],
            fontName="Helvetica-Bold", fontSize=13, textColor=BRAND_ACCENT,
            spaceBefore=14, spaceAfter=6, leading=16)
        h3 = ParagraphStyle("H3", parent=styles["Normal"],
            fontName="Helvetica-Bold", fontSize=11, textColor=TEXT_PRIMARY,
            spaceBefore=8, spaceAfter=4, leading=14)
        body = ParagraphStyle("Body", parent=styles["Normal"],
            fontName="Helvetica", fontSize=10, textColor=TEXT_PRIMARY,
            leading=15, spaceAfter=4)
        body_muted = ParagraphStyle("BodyMuted", parent=body,
            textColor=TEXT_SECONDARY)
        body_center = ParagraphStyle("BodyCenter", parent=body,
            alignment=TA_CENTER)
        body_justify = ParagraphStyle("BodyJustify", parent=body,
            alignment=TA_JUSTIFY, leading=16)
        label_style = ParagraphStyle("Label", parent=styles["Normal"],
            fontName="Helvetica-Bold", fontSize=9, textColor=TEXT_SECONDARY,
            leading=12)
        value_style = ParagraphStyle("Value", parent=styles["Normal"],
            fontName="Helvetica", fontSize=10, textColor=TEXT_PRIMARY,
            leading=13)
        small_note = ParagraphStyle("SmallNote", parent=styles["Normal"],
            fontName="Helvetica-Oblique", fontSize=8, textColor=TEXT_MUTED,
            leading=11)
        section_header = ParagraphStyle("SectionHeader", parent=styles["Normal"],
            fontName="Helvetica-Bold", fontSize=11, textColor=colors.white,
            leading=14, leftIndent=6)

        # ── Extract Data ───────────────────────────────────────────────────────
        # Candidate info
        cand_user = getattr(candidate, "user", None)
        cand_name = _safe_str(
            getattr(candidate, "name", None)
            or (getattr(cand_user, "full_name", None) if cand_user else None)
        )
        cand_email = _safe_str(
            getattr(candidate, "email", None)
            or (getattr(cand_user, "email", None) if cand_user else None)
        )
        cand_phone = _safe_str(getattr(candidate, "phone", None))
        cand_city = _safe_str(getattr(candidate, "city", None))

        # Job info
        job_title = _safe_str(getattr(job, "title", None))
        job_dept = _safe_str(getattr(job, "department", None))
        job_loc = _safe_str(getattr(job, "location", None))

        # HM / Recruiter
        hm_name = "Hiring Manager"
        if hm_user:
            hm_name = _safe_str(getattr(hm_user, "full_name", None), "Hiring Manager")
        rec_name = "Talent Acquisition Team"
        if recruiter:
            rec_name = _safe_str(getattr(recruiter, "full_name", None), "Talent Acquisition Team")

        # Offer details
        offer_ref = f"OL-{offer.id:06d}"
        issue_date = _fmt_date(datetime.now(timezone.utc))
        proposed_salary = _fmt_currency(
            float(offer.proposed_salary) if offer.proposed_salary else None,
            offer.salary_currency or "INR"
        )
        salary_band = ""
        if offer.salary_min and offer.salary_max:
            salary_band = (
                f"{_fmt_currency(float(offer.salary_min), offer.salary_currency)} — "
                f"{_fmt_currency(float(offer.salary_max), offer.salary_currency)}"
            )
        joining_date = _fmt_date(offer.joining_date)
        expiry_date = _fmt_date(offer.offer_expiry_date or offer.expires_at)
        work_mode = _safe_str(getattr(offer, "work_mode", None))
        location = _safe_str(getattr(offer, "location", None) or job_loc)
        emp_type = _safe_str(getattr(offer, "employment_type", None), "Full-time")
        joining_timeline = _safe_str(getattr(offer, "joining_timeline", None))
        role_scope = _safe_str(getattr(offer, "role_scope", None))
        additional_terms = _safe_str(getattr(offer, "additional_terms", None))

        # ── Header Section ─────────────────────────────────────────────────────
        # Company name + tagline
        header_data = [
            [
                Paragraph(f"<b>{company_name}</b>", ParagraphStyle("HeaderCo",
                    fontName="Helvetica-Bold", fontSize=16, textColor=BRAND_PRIMARY,
                    leading=20)),
                Paragraph(
                    f"<font color='#718096' size='8'>Offer Reference: {offer_ref}<br/>Issue Date: {issue_date}</font>",
                    ParagraphStyle("HeaderRef", fontName="Helvetica", fontSize=8,
                        textColor=TEXT_MUTED, leading=12, alignment=TA_RIGHT)
                ),
            ]
        ]
        header_table = Table(header_data, colWidths=["65%", "35%"])
        header_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ]))
        story.append(header_table)
        story.append(HRFlowable(width="100%", thickness=3, color=BRAND_PRIMARY,
                                spaceAfter=12, spaceBefore=8))

        # ── Title Block ────────────────────────────────────────────────────────
        story.append(Paragraph("OFFER OF EMPLOYMENT", h1))
        story.append(Paragraph(
            f"Congratulations, <b>{cand_name}</b>! We are delighted to extend this offer of employment.",
            body_justify
        ))
        story.append(Spacer(1, 10))

        # ── Candidate Details Block ────────────────────────────────────────────
        def _section_header(title):
            t = Table([[Paragraph(title, section_header)]], colWidths=["100%"])
            t.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), BRAND_PRIMARY),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("ROWBACKGROUNDS", (0, 0), (-1, -1), [BRAND_PRIMARY]),
            ]))
            return t

        def _detail_row(label, value):
            return [
                Paragraph(label, label_style),
                Paragraph(_safe_str(value), value_style)
            ]

        story.append(_section_header("CANDIDATE INFORMATION"))
        story.append(Spacer(1, 6))

        cand_table = Table([
            _detail_row("Full Name", cand_name),
            _detail_row("Email Address", cand_email),
            _detail_row("Phone Number", cand_phone),
            _detail_row("City / Location", cand_city),
        ], colWidths=["30%", "70%"])
        cand_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), BRAND_LIGHT),
            ("ROWBACKGROUNDS", (1, 0), (1, -1), [colors.white, colors.HexColor("#F7FAFC")]),
            ("LINEBELOW", (0, 0), (-1, -2), 0.5, DIVIDER_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        story.append(cand_table)
        story.append(Spacer(1, 14))

        # ── Position Details ───────────────────────────────────────────────────
        story.append(_section_header("POSITION DETAILS"))
        story.append(Spacer(1, 6))

        pos_table = Table([
            _detail_row("Position / Role", job_title),
            _detail_row("Department", job_dept),
            _detail_row("Employment Type", emp_type),
            _detail_row("Work Mode", work_mode),
            _detail_row("Work Location", location),
            _detail_row("Hiring Manager", hm_name),
            _detail_row("Talent Partner", rec_name),
        ], colWidths=["30%", "70%"])
        pos_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), BRAND_LIGHT),
            ("ROWBACKGROUNDS", (1, 0), (1, -1), [colors.white, colors.HexColor("#F7FAFC")]),
            ("LINEBELOW", (0, 0), (-1, -2), 0.5, DIVIDER_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        story.append(pos_table)
        story.append(Spacer(1, 14))

        # ── Compensation Table ─────────────────────────────────────────────────
        story.append(_section_header("COMPENSATION PACKAGE"))
        story.append(Spacer(1, 6))

        comp_data = [
            [Paragraph("Component", label_style), Paragraph("Details", label_style)],
            _detail_row("Proposed CTC (Annual)", proposed_salary),
        ]
        if salary_band:
            comp_data.append(_detail_row("Salary Band / Range", salary_band))
        comp_data.append(_detail_row("Currency", offer.salary_currency or "INR"))

        comp_table = Table(comp_data, colWidths=["30%", "70%"])
        comp_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), BRAND_ACCENT),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("BACKGROUND", (0, 1), (0, -1), BRAND_LIGHT),
            ("ROWBACKGROUNDS", (1, 1), (1, -1), [colors.white, colors.HexColor("#F7FAFC")]),
            ("LINEBELOW", (0, 0), (-1, -2), 0.5, DIVIDER_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(comp_table)
        story.append(Spacer(1, 14))

        # ── Joining Details ────────────────────────────────────────────────────
        story.append(_section_header("JOINING DETAILS"))
        story.append(Spacer(1, 6))

        join_rows = [_detail_row("Expected Joining Date", joining_date)]
        if joining_timeline:
            join_rows.append(_detail_row("Notice Period / Timeline", joining_timeline))
        join_rows.append(_detail_row("Offer Validity / Expiry", expiry_date))

        join_table = Table(join_rows, colWidths=["30%", "70%"])
        join_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), BRAND_LIGHT),
            ("ROWBACKGROUNDS", (1, 0), (1, -1), [colors.white, colors.HexColor("#F7FAFC")]),
            ("LINEBELOW", (0, 0), (-1, -2), 0.5, DIVIDER_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        story.append(join_table)
        story.append(Spacer(1, 14))

        # ── Role Scope ────────────────────────────────────────────────────────
        if role_scope and role_scope != "—":
            story.append(_section_header("ROLE SCOPE & RESPONSIBILITIES"))
            story.append(Spacer(1, 6))
            story.append(Paragraph(role_scope, body_justify))
            story.append(Spacer(1, 14))

        # ── Terms & Conditions ─────────────────────────────────────────────────
        story.append(_section_header("TERMS & CONDITIONS"))
        story.append(Spacer(1, 6))
        standard_terms = [
            "This offer is contingent upon successful completion of background verification and reference checks.",
            "You will be expected to adhere to the company's code of conduct, policies, and procedures.",
            "The compensation package outlined above is subject to applicable statutory deductions.",
            "This offer letter is valid until the expiry date mentioned above. Failure to respond by the expiry date will result in automatic withdrawal of this offer.",
            "The employment relationship is subject to the terms outlined in the formal employment agreement to be executed at joining.",
        ]
        if additional_terms and additional_terms != "—":
            standard_terms.append(additional_terms)

        for i, term in enumerate(standard_terms, 1):
            story.append(Paragraph(f"{i}. {term}", body_justify))
            story.append(Spacer(1, 3))
        story.append(Spacer(1, 14))

        # ── Acceptance Block ───────────────────────────────────────────────────
        story.append(HRFlowable(width="100%", thickness=1, color=DIVIDER_COLOR,
                                spaceBefore=6, spaceAfter=12))
        story.append(Paragraph("ACCEPTANCE ACKNOWLEDGMENT", h2))
        story.append(Paragraph(
            "By accepting this offer, you confirm that you have read, understood, and agree to the terms "
            "and conditions outlined in this offer letter. Please accept or decline this offer through "
            "the SkillAlign candidate portal using the secure link provided.",
            body_justify
        ))
        story.append(Spacer(1, 20))

        # Signature lines
        sig_data = [
            [
                Paragraph("_________________________________", body_center),
                Paragraph("_________________________________", body_center),
            ],
            [
                Paragraph(f"<b>{hm_name}</b>", body_center),
                Paragraph(f"<b>{cand_name}</b>", body_center),
            ],
            [
                Paragraph(f"<font color='#718096' size='8'>Hiring Manager<br/>{company_name}</font>", body_center),
                Paragraph(f"<font color='#718096' size='8'>Candidate<br/>Date: ________________________</font>", body_center),
            ],
        ]
        sig_table = Table(sig_data, colWidths=["50%", "50%"])
        sig_table.setStyle(TableStyle([
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 20),
            ("RIGHTPADDING", (0, 0), (-1, -1), 20),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        story.append(sig_table)

        # ── Footer ─────────────────────────────────────────────────────────────
        story.append(Spacer(1, 20))
        story.append(HRFlowable(width="100%", thickness=1, color=BRAND_PRIMARY, spaceBefore=4))
        story.append(Paragraph(
            f"<font color='#718096' size='8'>"
            f"This is an official document generated by {company_name} | "
            f"Offer Ref: {offer_ref} | Issued: {issue_date}"
            f"</font>",
            ParagraphStyle("Footer", parent=styles["Normal"],
                fontName="Helvetica", fontSize=8, textColor=TEXT_MUTED,
                alignment=TA_CENTER, leading=11, spaceBefore=4)
        ))

        # ── Build PDF ──────────────────────────────────────────────────────────
        doc.build(story)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        logger.info(f"Generated offer PDF for offer_id={offer.id}, size={len(pdf_bytes)} bytes")
        return pdf_bytes
