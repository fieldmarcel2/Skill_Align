"""
Email Service using SendGrid
============================
Handles transactional email delivery for:
- Interview scheduling invitations (with Google Meet/Zoom link, calendar details)
- Application and pipeline status updates
- HR and recruiter alerts
"""

import logging
from typing import Optional
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content

from app.core.config import settings

logger = logging.getLogger(__name__)


def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: Optional[str] = None,
) -> bool:
    """
    Send an email via SendGrid API.
    Returns True if sent successfully, False otherwise.
    """
    if not settings.SENDGRID_API_KEY:
        logger.warning("SENDGRID_API_KEY is not configured. Email not sent.")
        return False

    from_email = settings.SENDGRID_FROM_EMAIL or "noreply@skilalign.com"

    try:
        sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
        message = Mail(
            from_email=Email(from_email, "SkillAlign Recruitment"),
            to_emails=To(to_email),
            subject=subject,
            plain_text_content=text_content or html_content,
            html_content=html_content,
        )
        response = sg.send(message)
        logger.info(f"SendGrid email dispatched to {to_email}. Status code: {response.status_code}")
        return response.status_code in [200, 201, 202]
    except Exception as e:
        logger.error(f"Failed to send email to {to_email} via SendGrid: {str(e)}")
        return False


def send_interview_scheduled_email(
    candidate_email: str,
    candidate_name: str,
    job_title: str,
    company: str,
    interview_date: str,
    interview_time: str,
    interview_mode: str,
    meeting_link: Optional[str],
    interviewer_name: str,
    recruiter_name: str = "HR Team",
    recruiter_email: Optional[str] = None,
) -> bool:
    """Send branded interview schedule notification email to candidate and optionally copy recruiter."""
    subject = f"Interview Scheduled: {job_title} at {company}"
    mode_display = interview_mode.capitalize() if interview_mode else "Online"
    link_display = (
        f'<p style="margin: 12px 0;"><strong>Meeting Link:</strong> <a href="{meeting_link}" style="color: #4F46E5; font-weight: 600;" target="_blank">{meeting_link}</a></p>'
        if meeting_link
        else '<p style="margin: 12px 0;"><strong>Location:</strong> Meeting details will be shared prior to the session.</p>'
    )

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background-color: #f8fafc; }}
        .container {{ max-width: 600px; margin: 24px auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }}
        .header {{ background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; padding: 32px 28px; text-align: left; }}
        .header h1 {{ margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }}
        .header p {{ margin: 6px 0 0 0; opacity: 0.9; font-size: 14px; }}
        .content {{ padding: 32px 28px; }}
        .card {{ background: #f1f5f9; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #4f46e5; }}
        .footer {{ padding: 20px 28px; background: #f8fafc; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Interview Scheduled</h1>
          <p>SkillAlign Talent Matching & Recruitment</p>
        </div>
        <div class="content">
          <p>Dear <strong>{candidate_name}</strong>,</p>
          <p>Your interview for the position of <strong>{job_title}</strong> at <strong>{company}</strong> has been officially scheduled.</p>
          
          <div class="card">
            <p style="margin: 6px 0;"><strong>Date:</strong> {interview_date}</p>
            <p style="margin: 6px 0;"><strong>Time:</strong> {interview_time}</p>
            <p style="margin: 6px 0;"><strong>Mode:</strong> {mode_display}</p>
            <p style="margin: 6px 0;"><strong>Interviewer:</strong> {interviewer_name}</p>
            {link_display}
          </div>

          <p>Please ensure you join on time and have your setup tested prior to the meeting. You can also view this and your other active rounds directly inside your <a href="http://localhost:5173/candidate" style="color: #4F46E5;">Candidate Dashboard</a>.</p>

          <p style="margin-top: 24px;">Best regards,<br><strong>{recruiter_name}</strong><br>SkillAlign Hiring Team</p>
        </div>
        <div class="footer">
          <p>&copy; 2026 SkillAlign Inc. All rights reserved. Automated message, do not reply directly.</p>
        </div>
      </div>
    </body>
    </html>
    """

    plain_text = f"""
Dear {candidate_name},

Your interview for the position of {job_title} at {company} has been scheduled.

Date: {interview_date}
Time: {interview_time}
Mode: {mode_display}
Meeting Link: {meeting_link or 'Details to follow'}
Interviewer: {interviewer_name}

Best regards,
{recruiter_name}
SkillAlign Hiring Team
    """.strip()

    res = send_email(candidate_email, subject, html_content, plain_text)

    if recruiter_email and recruiter_email != candidate_email:
        recruiter_subject = f"[Copy] Interview Scheduled: {candidate_name} for {job_title}"
        send_email(recruiter_email, recruiter_subject, html_content, plain_text)

    return res


def send_application_status_email(
    candidate_email: str,
    candidate_name: str,
    job_title: str,
    company: str,
    status_label: str,
    additional_details: str = "",
    recruiter_name: str = "Recruitment Team",
) -> bool:
    """Send application status update notification."""
    subject = f"Application Status Update: {job_title} at {company}"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; }}
        .container {{ max-width: 600px; margin: 24px auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }}
        .header {{ background: #4f46e5; color: #ffffff; padding: 28px; text-align: left; }}
        .header h1 {{ margin: 0; font-size: 20px; }}
        .content {{ padding: 28px; }}
        .card {{ background: #f8fafc; border-radius: 8px; padding: 18px; margin: 20px 0; border-left: 4px solid #4f46e5; }}
        .footer {{ padding: 16px 28px; background: #f8fafc; text-align: center; font-size: 12px; color: #64748b; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Application Update</h1>
        </div>
        <div class="content">
          <p>Dear <strong>{candidate_name}</strong>,</p>
          <p>Your application status for the position of <strong>{job_title}</strong> at <strong>{company}</strong> has been updated to:</p>
          <div class="card">
            <h3 style="margin:0; color:#4f46e5;">{status_label}</h3>
            {f'<p style="margin: 8px 0 0 0; font-size: 14px; color:#475569;">{additional_details}</p>' if additional_details else ''}
          </div>
          <p>You can track the progress of your application at any time by logging into your <a href="http://localhost:5173/candidate" style="color: #4F46E5;">SkillAlign Dashboard</a>.</p>
          <p style="margin-top: 24px;">Best regards,<br><strong>{recruiter_name}</strong></p>
        </div>
        <div class="footer">
          <p>&copy; 2026 SkillAlign Inc.</p>
        </div>
      </div>
    </body>
    </html>
    """

    plain_text = f"""
Dear {candidate_name},

Your application for {job_title} at {company} has been updated to: {status_label}.
{additional_details}

Regards,
{recruiter_name}
    """.strip()

    return send_email(candidate_email, subject, html_content, plain_text)


def send_interview_slot_selection_email(
    candidate_email: str,
    candidate_name: str,
    job_title: str,
    slots: list,
    selection_url: str,
) -> bool:
    """Send slot selection email to candidate with a secure link to pick a slot."""
    subject = f"Action Required: Choose Your Interview Slot — {job_title}"

    slots_html = ""
    for i, slot in enumerate(slots, 1):
        dt = slot.get("slot_datetime")
        if hasattr(dt, "strftime"):
            dt_str = dt.strftime("%d %b %Y at %I:%M %p %Z")
        else:
            dt_str = str(dt)[:16].replace("T", " ") if dt else "TBD"
        slots_html += f'<li style="margin: 8px 0; font-size: 15px;">Option {i}: <strong>{dt_str}</strong></li>'

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; background: #f8fafc; }}
        .container {{ max-width: 600px; margin: 24px auto; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }}
        .header {{ background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #fff; padding: 32px 28px; }}
        .header h1 {{ margin: 0; font-size: 22px; }}
        .content {{ padding: 32px 28px; }}
        .btn {{ display: inline-block; background: #4f46e5; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; margin: 20px 0; }}
        .footer {{ padding: 16px 28px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h1>Select Your Interview Slot</h1><p>SkillAlign Recruitment</p></div>
        <div class="content">
          <p>Dear <strong>{candidate_name}</strong>,</p>
          <p>Great news! You have been selected for an interview for the <strong>{job_title}</strong> position.</p>
          <p>Please choose one of the following available time slots:</p>
          <ul>{slots_html}</ul>
          <p>Click the button below to select your preferred time:</p>
          <a href="{selection_url}" class="btn">Select Interview Slot</a>
          <p style="font-size: 13px; color: #64748b;">This link is unique to you and will expire after selection. If you have any questions, please contact your recruiter.</p>
        </div>
        <div class="footer"><p>&copy; 2026 SkillAlign Inc. All rights reserved.</p></div>
      </div>
    </body>
    </html>
    """

    plain = f"""Dear {candidate_name},

You have been selected for an interview for the {job_title} position.
Please select your preferred time slot using the link below:
{selection_url}

Best regards,
SkillAlign Recruitment Team"""

    return send_email(candidate_email, subject, html_content, plain)


def send_interview_confirmation_email(
    candidate_email: str,
    candidate_name: str,
    job_title: str,
    interview_datetime,
    meeting_link: Optional[str] = None,
    recruiter_name: str = "Recruitment Team",
) -> bool:
    """Send interview confirmation email to candidate after recruiter confirms."""
    subject = f"Interview Confirmed: {job_title}"
    if hasattr(interview_datetime, "strftime"):
        dt_str = interview_datetime.strftime("%d %b %Y at %I:%M %p")
    else:
        dt_str = str(interview_datetime)[:16].replace("T", " ") if interview_datetime else "TBD"

    link_html = (
        f'<p><strong>Meeting Link:</strong> <a href="{meeting_link}" style="color:#4f46e5">{meeting_link}</a></p>'
        if meeting_link
        else "<p>Meeting details will be shared closer to the interview.</p>"
    )

    html_content = f"""
    <!DOCTYPE html><html><head><meta charset="utf-8">
    <style>
      body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; background: #f8fafc; }}
      .container {{ max-width: 600px; margin: 24px auto; background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }}
      .header {{ background: #059669; color: #fff; padding: 28px; }}
      .content {{ padding: 28px; }}
      .card {{ background: #f0fdf4; border-left: 4px solid #059669; border-radius: 8px; padding: 18px; margin: 16px 0; }}
      .footer {{ padding: 16px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }}
    </style></head><body>
    <div class="container">
      <div class="header"><h1 style="margin:0">✅ Interview Confirmed!</h1></div>
      <div class="content">
        <p>Dear <strong>{candidate_name}</strong>,</p>
        <p>Your interview for <strong>{job_title}</strong> has been officially confirmed.</p>
        <div class="card">
          <p style="margin:6px 0"><strong>Date & Time:</strong> {dt_str}</p>
          {link_html}
        </div>
        <p>Best regards,<br><strong>{recruiter_name}</strong><br>SkillAlign Hiring Team</p>
      </div>
      <div class="footer"><p>&copy; 2026 SkillAlign Inc.</p></div>
    </div></body></html>
    """

    plain = f"""Dear {candidate_name},
Your interview for {job_title} is confirmed for {dt_str}.
{f'Meeting Link: {meeting_link}' if meeting_link else ''}
Best regards, {recruiter_name}"""

    return send_email(candidate_email, subject, html_content, plain)


def send_offer_email(
    candidate_email: str,
    candidate_name: str,
    job_title: str,
    proposed_salary: Optional[float],
    currency: str = "INR",
    employment_type: Optional[str] = None,
    joining_date=None,
    offer_expiry_date=None,
    accept_url: str = "",
    recruiter_name: str = "Recruitment Team",
) -> bool:
    """Send offer letter email to candidate."""
    subject = f"🎉 Job Offer: {job_title} — SkillAlign"

    salary_str = f"{currency} {proposed_salary:,.0f}" if proposed_salary else "As discussed"
    joining_str = joining_date.strftime("%d %b %Y") if hasattr(joining_date, "strftime") else str(joining_date or "To be discussed")
    expiry_str = offer_expiry_date.strftime("%d %b %Y") if hasattr(offer_expiry_date, "strftime") else str(offer_expiry_date or "7 days from today")

    html_content = f"""
    <!DOCTYPE html><html><head><meta charset="utf-8">
    <style>
      body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; background: #f8fafc; }}
      .container {{ max-width: 600px; margin: 24px auto; background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }}
      .header {{ background: linear-gradient(135deg, #f59e0b, #d97706); color: #fff; padding: 32px 28px; }}
      .content {{ padding: 32px 28px; }}
      .card {{ background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 16px 0; }}
      .btn-accept {{ display: inline-block; background: #059669; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 8px 4px; }}
      .btn-reject {{ display: inline-block; background: #dc2626; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 8px 4px; }}
      .footer {{ padding: 16px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }}
    </style></head><body>
    <div class="container">
      <div class="header"><h1 style="margin:0">🎉 Congratulations!</h1><p style="margin:6px 0 0;opacity:.9">You have received a job offer</p></div>
      <div class="content">
        <p>Dear <strong>{candidate_name}</strong>,</p>
        <p>We are delighted to offer you the position of <strong>{job_title}</strong> at SkillAlign.</p>
        <div class="card">
          <p style="margin:6px 0"><strong>Position:</strong> {job_title}</p>
          <p style="margin:6px 0"><strong>Compensation:</strong> {salary_str} per annum</p>
          <p style="margin:6px 0"><strong>Employment Type:</strong> {employment_type or 'Full-time'}</p>
          <p style="margin:6px 0"><strong>Proposed Joining:</strong> {joining_str}</p>
          <p style="margin:6px 0"><strong>Offer Expires:</strong> {expiry_str}</p>
        </div>
        <p>Please review the offer and respond using the button below:</p>
        <a href="{accept_url}&accept=true" class="btn-accept">✓ Accept Offer</a>
        <a href="{accept_url}&accept=false" class="btn-reject">✗ Decline Offer</a>
        <p style="font-size:13px;color:#64748b;margin-top:24px;">
          Or visit your <a href="http://localhost:5173/candidate" style="color:#4f46e5">dashboard</a> to respond.
        </p>
        <p>Best regards,<br><strong>{recruiter_name}</strong><br>SkillAlign Hiring Team</p>
      </div>
      <div class="footer"><p>&copy; 2026 SkillAlign Inc.</p></div>
    </div></body></html>
    """

    plain = f"""Dear {candidate_name},
Congratulations! You have received an offer for {job_title}.
Salary: {salary_str}
Please respond using this link: {accept_url}
Best regards, {recruiter_name}"""

    return send_email(candidate_email, subject, html_content, plain)
