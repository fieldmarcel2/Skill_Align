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
