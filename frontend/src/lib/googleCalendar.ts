/**
 * Google Calendar Integration Utilities
 * ======================================
 * Generates Google Calendar event URLs that open pre-populated in Google Calendar.
 * No OAuth required — uses the public Google Calendar URL format.
 *
 * For full OAuth write-access (create events on user's calendar), you would need
 * to provide a Google Cloud OAuth Client ID in VITE_GOOGLE_CLIENT_ID.
 */

export interface CalendarEventParams {
  title: string;
  description?: string;
  location?: string;
  startDateTime: Date | string;
  endDateTime?: Date | string;
  /** Comma-separated email addresses */
  attendees?: string[];
}

/**
 * Format a Date to Google Calendar's yyyyMMddTHHmmssZ format
 */
function formatGoogleDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  // Google Calendar format: YYYYMMDDTHHmmssZ
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

/**
 * Generate a Google Calendar "Add to Calendar" URL for an event.
 * Opens Google Calendar in a new tab with the event pre-populated.
 */
export function buildGoogleCalendarUrl(params: CalendarEventParams): string {
  const { title, description, location, startDateTime, endDateTime, attendees } = params;

  const start = formatGoogleDate(startDateTime);

  // If no end time, default to 1 hour after start
  let end: string;
  if (endDateTime) {
    end = formatGoogleDate(endDateTime);
  } else {
    const startDate = typeof startDateTime === "string" ? new Date(startDateTime) : startDateTime;
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    end = formatGoogleDate(endDate);
  }

  const queryParams = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${start}/${end}`,
    ...(description && { details: description }),
    ...(location && { location }),
    ...(attendees?.length && { add: attendees.join(",") }),
  });

  return `https://www.google.com/calendar/render?${queryParams.toString()}`;
}

/**
 * Open Google Calendar in a new tab with the event pre-populated.
 */
export function openGoogleCalendar(params: CalendarEventParams): void {
  const url = buildGoogleCalendarUrl(params);
  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Build a calendar event for an interview scheduling scenario.
 */
export function buildInterviewCalendarEvent(params: {
  candidateName: string;
  jobTitle: string;
  companyName?: string;
  scheduledDate: Date | string;
  scheduledEnd?: Date | string;
  meetingLink?: string;
  interviewType?: string;
  recruiterName?: string;
}): CalendarEventParams {
  const {
    candidateName,
    jobTitle,
    companyName,
    scheduledDate,
    scheduledEnd,
    meetingLink,
    interviewType = "Interview",
    recruiterName,
  } = params;

  const title = `${interviewType}: ${candidateName} — ${jobTitle}${companyName ? ` @ ${companyName}` : ""}`;

  const descriptionParts = [
    `Candidate: ${candidateName}`,
    `Position: ${jobTitle}`,
    companyName ? `Organization: ${companyName}` : null,
    interviewType ? `Type: ${interviewType}` : null,
    recruiterName ? `Organized by: ${recruiterName}` : null,
    meetingLink ? `\nMeeting Link: ${meetingLink}` : null,
    "\nThis event was scheduled via SkillAlign Talent Intelligence Platform.",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    title,
    description: descriptionParts,
    location: meetingLink || "Virtual",
    startDateTime: scheduledDate,
    endDateTime: scheduledEnd,
  };
}

/**
 * Build a calendar event for an offer joining date reminder.
 */
export function buildJoiningDateCalendarEvent(params: {
  candidateName: string;
  jobTitle: string;
  companyName?: string;
  joiningDate: Date | string;
}): CalendarEventParams {
  const { candidateName, jobTitle, companyName, joiningDate } = params;
  return {
    title: `Joining Date: ${candidateName} — ${jobTitle}`,
    description: [
      `Candidate: ${candidateName}`,
      `Position: ${jobTitle}`,
      companyName ? `Organization: ${companyName}` : null,
      "Official joining date as per accepted offer letter.",
      "Scheduled via SkillAlign Talent Intelligence Platform.",
    ]
      .filter(Boolean)
      .join("\n"),
    startDateTime: joiningDate,
  };
}
