/**
 * Recruitment Lifecycle Stage Color System
 * =========================================
 * Provides consistent, enterprise-grade color coding across all pipeline stages.
 * Used by PipelineStateBar, CandidateCard, RecruiterDashboard, HRDashboard, etc.
 */

export interface StageColorConfig {
  /** Tailwind bg + border + text class string for badge/pill */
  badge: string;
  /** Tailwind text color */
  text: string;
  /** Tailwind background color (light tint) */
  bg: string;
  /** Tailwind border color */
  border: string;
  /** Tailwind dot/indicator color */
  dot: string;
  /** Hex color for recharts / SVG */
  hex: string;
  /** Human-readable label */
  label: string;
  /** Icon name suggestion */
  icon: string;
}

const STAGE_MAP: Record<string, StageColorConfig> = {
  // ── Initial Matching ─────────────────────────────────────────────────────────
  CANDIDATE_MATCHED: {
    badge: "bg-indigo-500/15 border-indigo-500/40 text-indigo-700 dark:text-indigo-300",
    text: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/30",
    dot: "bg-indigo-500",
    hex: "#6366f1",
    label: "AI Matched",
    icon: "Sparkles",
  },
  matched: {
    badge: "bg-indigo-500/15 border-indigo-500/40 text-indigo-700 dark:text-indigo-300",
    text: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/30",
    dot: "bg-indigo-500",
    hex: "#6366f1",
    label: "AI Matched",
    icon: "Sparkles",
  },
  // ── Screened ─────────────────────────────────────────────────────────────────
  CANDIDATE_SCREENED: {
    badge: "bg-blue-500/15 border-blue-500/40 text-blue-700 dark:text-blue-300",
    text: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    dot: "bg-blue-500",
    hex: "#3b82f6",
    label: "Screened",
    icon: "FileCheck",
  },
  screened: {
    badge: "bg-blue-500/15 border-blue-500/40 text-blue-700 dark:text-blue-300",
    text: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    dot: "bg-blue-500",
    hex: "#3b82f6",
    label: "Screened",
    icon: "FileCheck",
  },
  // ── Shortlisted ──────────────────────────────────────────────────────────────
  CANDIDATE_SHORTLISTED: {
    badge: "bg-cyan-500/15 border-cyan-500/40 text-cyan-700 dark:text-cyan-300",
    text: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
    dot: "bg-cyan-500",
    hex: "#06b6d4",
    label: "Shortlisted",
    icon: "BookmarkCheck",
  },
  shortlisted: {
    badge: "bg-cyan-500/15 border-cyan-500/40 text-cyan-700 dark:text-cyan-300",
    text: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
    dot: "bg-cyan-500",
    hex: "#06b6d4",
    label: "Shortlisted",
    icon: "BookmarkCheck",
  },
  approved_by_hr: {
    badge: "bg-cyan-500/15 border-cyan-500/40 text-cyan-700 dark:text-cyan-300",
    text: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
    dot: "bg-cyan-500",
    hex: "#06b6d4",
    label: "Shortlisted",
    icon: "BookmarkCheck",
  },
  // ── Hiring Manager Review ────────────────────────────────────────────────────
  SENT_TO_HIRING_MANAGER: {
    badge: "bg-sky-500/15 border-sky-500/40 text-sky-700 dark:text-sky-300",
    text: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/30",
    dot: "bg-sky-500",
    hex: "#0ea5e9",
    label: "HM Review",
    icon: "Users",
  },
  HIRING_MANAGER_REVIEW: {
    badge: "bg-sky-500/15 border-sky-500/40 text-sky-700 dark:text-sky-300",
    text: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/30",
    dot: "bg-sky-500",
    hex: "#0ea5e9",
    label: "HM Review",
    icon: "Users",
  },
  HIRING_MANAGER_REJECTED: {
    badge: "bg-orange-500/15 border-orange-500/40 text-orange-700 dark:text-orange-300",
    text: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    dot: "bg-orange-500",
    hex: "#f97316",
    label: "HM Declined",
    icon: "XCircle",
  },
  // ── Interview Stages ─────────────────────────────────────────────────────────
  INTERVIEW_REQUESTED: {
    badge: "bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300",
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    dot: "bg-amber-500",
    hex: "#f59e0b",
    label: "Interview Requested",
    icon: "Calendar",
  },
  INTERVIEW_SLOTS_PROPOSED: {
    badge: "bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300",
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    dot: "bg-amber-500",
    hex: "#f59e0b",
    label: "Slots Proposed",
    icon: "Calendar",
  },
  WAITING_FOR_CANDIDATE_SLOT: {
    badge: "bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300",
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    dot: "bg-amber-500",
    hex: "#f59e0b",
    label: "Awaiting Candidate",
    icon: "Clock",
  },
  CANDIDATE_SLOT_SELECTED: {
    badge: "bg-yellow-500/15 border-yellow-500/40 text-yellow-700 dark:text-yellow-300",
    text: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    dot: "bg-yellow-500",
    hex: "#eab308",
    label: "Slot Confirmed",
    icon: "CalendarCheck",
  },
  INTERVIEW_CONFIRMED: {
    badge: "bg-yellow-500/15 border-yellow-500/40 text-yellow-700 dark:text-yellow-300",
    text: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    dot: "bg-yellow-500",
    hex: "#eab308",
    label: "Interview Confirmed",
    icon: "Video",
  },
  interview_scheduled: {
    badge: "bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300",
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    dot: "bg-amber-500",
    hex: "#f59e0b",
    label: "Interview Scheduled",
    icon: "Calendar",
  },
  // ── Interview Feedback ───────────────────────────────────────────────────────
  INTERVIEW_COMPLETED: {
    badge: "bg-violet-500/15 border-violet-500/40 text-violet-700 dark:text-violet-300",
    text: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    dot: "bg-violet-500",
    hex: "#8b5cf6",
    label: "Interview Done",
    icon: "CheckCircle2",
  },
  WAITING_FOR_HM_FEEDBACK: {
    badge: "bg-violet-500/15 border-violet-500/40 text-violet-700 dark:text-violet-300",
    text: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    dot: "bg-violet-500",
    hex: "#8b5cf6",
    label: "Awaiting Feedback",
    icon: "MessageSquare",
  },
  INTERVIEW_GO: {
    badge: "bg-teal-500/15 border-teal-500/40 text-teal-700 dark:text-teal-300",
    text: "text-teal-600 dark:text-teal-400",
    bg: "bg-teal-500/10",
    border: "border-teal-500/30",
    dot: "bg-teal-500",
    hex: "#14b8a6",
    label: "Go Decision",
    icon: "ThumbsUp",
  },
  INTERVIEW_NO_GO: {
    badge: "bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300",
    text: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    dot: "bg-rose-500",
    hex: "#f43f5e",
    label: "No-Go Decision",
    icon: "ThumbsDown",
  },
  // ── Compensation & Offer ─────────────────────────────────────────────────────
  COMPENSATION_DISCUSSION: {
    badge: "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300",
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    dot: "bg-emerald-500",
    hex: "#10b981",
    label: "Compensation Review",
    icon: "DollarSign",
  },
  OFFER_CREATED: {
    badge: "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300",
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    dot: "bg-emerald-500",
    hex: "#10b981",
    label: "Offer Drafted",
    icon: "FileText",
  },
  OFFER_SENT: {
    badge: "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300",
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    dot: "bg-emerald-500",
    hex: "#10b981",
    label: "Offer Extended",
    icon: "Send",
  },
  offer: {
    badge: "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300",
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    dot: "bg-emerald-500",
    hex: "#10b981",
    label: "Offer Extended",
    icon: "Send",
  },
  // ── Final Outcomes ────────────────────────────────────────────────────────────
  OFFER_ACCEPTED: {
    badge: "bg-green-500/15 border-green-500/40 text-green-700 dark:text-green-300",
    text: "text-green-600 dark:text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/30",
    dot: "bg-green-500",
    hex: "#22c55e",
    label: "Offer Accepted",
    icon: "Award",
  },
  HIRED: {
    badge: "bg-green-500/15 border-green-500/40 text-green-700 dark:text-green-300",
    text: "text-green-600 dark:text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/30",
    dot: "bg-green-500",
    hex: "#22c55e",
    label: "Hired",
    icon: "Award",
  },
  hired: {
    badge: "bg-green-500/15 border-green-500/40 text-green-700 dark:text-green-300",
    text: "text-green-600 dark:text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/30",
    dot: "bg-green-500",
    hex: "#22c55e",
    label: "Hired",
    icon: "Award",
  },
  OFFER_REJECTED: {
    badge: "bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300",
    text: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    dot: "bg-rose-500",
    hex: "#f43f5e",
    label: "Offer Declined",
    icon: "XCircle",
  },
  BLACKLISTED: {
    badge: "bg-red-600/15 border-red-600/40 text-red-700 dark:text-red-300",
    text: "text-red-600 dark:text-red-400",
    bg: "bg-red-600/10",
    border: "border-red-600/30",
    dot: "bg-red-600",
    hex: "#dc2626",
    label: "Blacklisted",
    icon: "ShieldAlert",
  },
  REJECTED: {
    badge: "bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300",
    text: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    dot: "bg-rose-500",
    hex: "#f43f5e",
    label: "Not Selected",
    icon: "XCircle",
  },
  rejected: {
    badge: "bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300",
    text: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    dot: "bg-rose-500",
    hex: "#f43f5e",
    label: "Not Selected",
    icon: "XCircle",
  },
};

const DEFAULT_CONFIG: StageColorConfig = {
  badge: "bg-slate-500/15 border-slate-500/40 text-slate-700 dark:text-slate-300",
  text: "text-slate-600 dark:text-slate-400",
  bg: "bg-slate-500/10",
  border: "border-slate-500/30",
  dot: "bg-slate-500",
  hex: "#64748b",
  label: "In Progress",
  icon: "Clock",
};

/** Get stage color config for a pipeline state string */
export function getStageColor(stage: string | undefined | null): StageColorConfig {
  if (!stage) return DEFAULT_CONFIG;
  return STAGE_MAP[stage] || DEFAULT_CONFIG;
}

/** Get just the badge class string (most common use) */
export function getStageBadgeClass(stage: string | undefined | null): string {
  return getStageColor(stage).badge;
}

/** Get stage label */
export function getStageLabel(stage: string | undefined | null): string {
  return getStageColor(stage).label;
}

/** Get hex color for recharts */
export function getStageHex(stage: string | undefined | null): string {
  return getStageColor(stage).hex;
}
