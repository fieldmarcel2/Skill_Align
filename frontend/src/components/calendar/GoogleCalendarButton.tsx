import React from "react";
import { Calendar, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { buildGoogleCalendarUrl, type CalendarEventParams } from "../../lib/googleCalendar";
import { cn } from "../../lib/utils";

interface GoogleCalendarButtonProps extends CalendarEventParams {
  /** Button label text */
  label?: string;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Visual variant */
  variant?: "default" | "outline" | "ghost" | "success";
}

const SIZE_CLASSES = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
  lg: "px-5 py-2.5 text-sm gap-2",
};

const VARIANT_CLASSES = {
  default:
    "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-sm shadow-blue-500/20 border border-blue-400/30",
  outline:
    "bg-transparent border border-blue-500/50 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10",
  ghost:
    "bg-transparent text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 border border-transparent",
  success:
    "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-sm shadow-emerald-500/20 border border-emerald-400/30",
};

/**
 * GoogleCalendarButton
 * =====================
 * Renders a "Add to Google Calendar" button that opens a pre-populated
 * Google Calendar event in a new tab. No OAuth required.
 *
 * Usage:
 * ```tsx
 * <GoogleCalendarButton
 *   title="Interview: John Doe — Senior Engineer"
 *   startDateTime={new Date("2025-01-15T10:00:00")}
 *   endDateTime={new Date("2025-01-15T11:00:00")}
 *   description="Technical interview via Zoom"
 *   location="https://zoom.us/j/abc"
 * />
 * ```
 */
export const GoogleCalendarButton: React.FC<GoogleCalendarButtonProps> = ({
  label = "Add to Google Calendar",
  className,
  size = "sm",
  variant = "outline",
  ...eventParams
}) => {
  const calendarUrl = buildGoogleCalendarUrl(eventParams);

  return (
    <motion.a
      href={calendarUrl}
      target="_blank"
      rel="noopener noreferrer"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "inline-flex items-center rounded-xl font-semibold transition-all duration-200 cursor-pointer no-underline",
        SIZE_CLASSES[size],
        VARIANT_CLASSES[variant],
        className
      )}
      title="Open this event in Google Calendar"
    >
      {/* Google Calendar icon using SVG for authenticity */}
      <svg
        viewBox="0 0 48 48"
        className={cn("shrink-0", size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4")}
        aria-hidden="true"
      >
        <rect x="4" y="4" width="40" height="40" rx="4" fill="#fff" />
        <rect x="4" y="4" width="40" height="40" rx="4" fill="none" stroke="#dadce0" strokeWidth="2" />
        <path d="M33 4h7a4 4 0 0 1 4 4v7H33V4z" fill="#1a73e8" />
        <path d="M4 4h7v11H4V4z" fill="#1a73e8" />
        <path d="M4 33h7v11H4a4 4 0 0 1-4-4v-7z" fill="#1a73e8" />
        <path d="M33 33h11v7a4 4 0 0 1-4 4h-7V33z" fill="#1a73e8" />
        <rect x="4" y="15" width="40" height="18" fill="#e8f0fe" />
        <rect x="11" y="4" width="26" height="11" fill="#fff" />
        <rect x="11" y="33" width="26" height="11" fill="#fff" />
        <text x="24" y="28" textAnchor="middle" fontSize="14" fontWeight="700" fill="#1a73e8" fontFamily="sans-serif">
          {new Date().getDate()}
        </text>
      </svg>
      <span className="truncate">{label}</span>
      <ExternalLink className={cn("shrink-0 opacity-60", size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5")} />
    </motion.a>
  );
};

export default GoogleCalendarButton;
