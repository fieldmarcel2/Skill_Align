export type RoleName = "Admin" | "HR" | "Recruiter" | "Candidate";

export type PipelineStatus =
  | "matched"
  | "screened"
  | "approved_by_hr"
  | "interview_scheduled"
  | "screening"
  | "technical_interview"
  | "hr_interview"
  | "offer"
  | "hired"
  | "rejected";

export interface Role {
  id: number;
  name: RoleName;
}

export interface User {
  id: number;
  name: string;
  email?: string | null;
  phone_number?: string | null;
  role: Role;
  is_active: boolean;
  created_at: string;
}

export interface PaginatedUsersResponse {
  data: User[];
  total_items: number;
  total_pages: number;
  current_page: number;
}

export interface Skill {
  id: number;
  name: string;
  category: string;
}

export interface JobSkillIn {
  skill_id: number;
  requirement_type: "required" | "preferred";
  weight: number;
}

export interface JobSkill {
  id: number;
  skill: Skill;
  requirement_type: "required" | "preferred";
  weight: number;
}

export interface Job {
  id: number;
  title: string;
  description?: string;
  department?: string;
  client_name?: string;
  min_experience_years: number;
  work_mode?: string | null;
  location_city?: string | null;
  location_state?: string | null;
  location_country?: string | null;
  urgency?: string | null;
  shift_timing?: string | null;
  travel_requirements?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string | null;
  status: "draft" | "active" | "closed";
  created_at: string;
  updated_at: string;
  creator: {
    id: number;
    name: string;
    email?: string | null;
    phone_number?: string | null;
  };
  job_skills: JobSkill[];
}

export interface JobPipelineSummary {
  id: number;
  title: string;
  department?: string | null;
  client_name?: string | null;
  status: string;
  min_experience_years: number;
  work_mode?: string | null;
  required_skills_count: number;
  total_candidates: number;
  in_screening_count: number;
  in_interview_count: number;
  in_offer_count: number;
  hired_count: number;
  has_active_pipeline: boolean;
  sourcing_needed: boolean;
}


export interface CandidateSkill {
  id: number;
  skill: Skill;
  proficiency_level?: "Beginner" | "Intermediate" | "Expert" | null;
  years_experience: number;
  source?: "manual" | "resume_extracted" | "ai_inferred" | string;
  evidence_text?: string | null;
}

export interface ParsedEducation {
  degree: string;
  institution: string;
  year?: string | null;
  grade?: string | null;
}

export interface ParsedExperience {
  title: string;
  company?: string;
  duration?: string;
  years?: number;
  highlights?: string[];
}

export interface ParsedProject {
  title: string;
  duration?: string | null;
  technologies?: string[];
  bullets?: string[];
  description?: string;
}

export interface ParsedSkillItem {
  name: string;
  category: string;
  evidence?: string | null;
}

export interface ParsedResumeData {
  name?: string | null;
  headline?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  summary?: string | null;
  skills: ParsedSkillItem[];
  categorized_skills?: Record<string, string[]>;
  total_experience_years: number;
  education: ParsedEducation[];
  education_degree?: string | null;
  education_institution?: string | null;
  experience: ParsedExperience[];
  certifications: string[];
  projects: string[];
  structured_projects?: ParsedProject[];
  additional_info?: {
    date_of_birth?: string | null;
    career_interests?: string[];
    location?: string | null;
  };
}

export interface Candidate {
  id: number;
  user_id?: number;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  resume_file_path?: string | null;
  resume_s3_key?: string | null;
  resume_extracted_text_s3_key?: string | null;
  resume_filename?: string | null;
  resume_uploaded_at?: string | null;
  resume_parsed_at?: string | null;
  education_degree?: string | null;
  education_institution?: string | null;
  extracted_data?: string | null;
  total_experience_years: number;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  country?: string | null;
  work_authorization?: string | null;
  preferred_work_mode?: "WFH" | "WFO" | "Hybrid" | null;
  notice_period?: string | null;
  current_ctc?: number | null;
  expected_ctc?: number | null;
  hiring_status?: string | null;
  skills: CandidateSkill[];
}

export interface ResumeUrlResponse {
  resume_url: string;
  filename?: string | null;
  expires_in_seconds: number;
}

export interface ResumeTextResponse {
  candidate_id: number;
  filename?: string | null;
  raw_text: string;
  extracted_text_s3_key?: string | null;
  parsed_at?: string | null;
}

export interface ParsedResumeResponse {
  candidate_id: number;
  parsed_data: ParsedResumeData;
  parsed_at?: string | null;
}

export interface ResumeUploadResponse {
  status?: string;
  message: string;
  candidate_id: number;
  filename: string;
  format?: string;
  original_s3_key?: string;
  resume_s3_key?: string;
  resume_file_path?: string;
  extracted_text_s3_key?: string | null;
  uploaded_at: string;
  parsed_at?: string | null;
  parsed_data?: ParsedResumeData | null;
  auto_added_skills?: string[];
}

export interface Interview {
  id: number;
  match_result_id: number;
  scheduled_by: number;
  job_id?: number | null;
  interview_date?: string | null;
  interview_type: string;
  meeting_link?: string | null;
  interview_mode?: string | null;
  scheduled_end?: string | null;
  feedback?: string | null;
  status: "scheduled" | "pending_slot" | "completed" | "cancelled" | string;
  created_at: string;
  scheduler_name?: string | null;
  candidate_name?: string | null;
  job_title?: string | null;
  company_name?: string | null;
  slot_token?: string | null;
  pipeline_state?: PipelineState | string | null;
  slots?: InterviewSlot[];
}


export interface Notification {
  id: number;
  user_id: number;
  channel: string;
  subject: string;
  body: string;
  status: string;
  created_at: string;
  is_read?: boolean;
  notification_type?: string | null;
  match_result_id?: number | null;
  action_url?: string | null;
}

export interface SkillMatchBreakdown {
  skill_id: number;
  skill_name: string;
  requirement_type: string;
  weight: number;
  candidate_proficiency?: string | null;
  candidate_years?: number | null;
  skill_score: number;
  source?: "resume" | "manual" | string | null;
  evidence_text?: string | null;
}

export interface MatchResult {
  id: number;
  job_id: number;
  candidate_id: number;
  recruiter_id?: number | null;
  overall_score: number;
  status: PipelineStatus;
  pipeline_state?: PipelineState;
  hiring_manager_id?: number | null;
  hiring_manager_name?: string | null;
  shortlist_note?: string | null;
  submitted_to_hm_at?: string | null;
  hm_reviewed_at?: string | null;
  hm_rejection_reason?: string | null;
  processing_status?: "queued" | "processing" | "completed" | "failed" | "stale" | string;
  matched_by_version?: string;
  matched_at: string;
  created_at?: string;
  updated_at?: string;
  meets_experience: boolean;
  matched_skills?: string[];
  missing_skills?: string[];
  skill_breakdown?: SkillMatchBreakdown[];
  explanation?: string | null;
  job?: Job;
  candidate: Candidate;
  interviews?: Interview[];
  assigned_recruiter?: {
    id: number;
    name: string;
    email?: string | null;
    claimed_at?: string;
  } | null;
  assignment_status?: "unassigned" | "claimed" | string | null;
  resume_detected_skills?: Array<{
    skill_id: number;
    skill_name: string;
    evidence_text?: string | null;
  }>;
  self_declared_skills?: Array<{
    skill_id: number;
    skill_name: string;
    proficiency_level?: string | null;
    years_experience?: number;
  }>;
  pending_tasks_count?: number;
  is_blacklisted?: boolean;
  blacklist_reason?: string | null;
  blacklisted_until?: string | null;
  blacklist_display_message?: string | null;
}

export interface MatchRunResponse {
  job_id: number;
  status?: string;
  message?: string;
  task_id?: string | null;
  total_candidates?: number;
  results?: MatchResult[];
}

export interface MatchStatusResponse {
  job_id: number;
  processing_status: string;
  total_candidates: number;
  matched_candidates: number;
  last_matched_at?: string | null;
}

export interface ResumeStatusResponse {
  candidate_id: number;
  processing_status: string;
  filename?: string | null;
  parsed_at?: string | null;
}

export interface Scorecard {
  id: number;
  match_result_id: number;
  reviewer_id?: number;
  reviewer?: { id: number; name: string };
  communication_score: number;
  technical_score: number;
  overall_impression?: string;
  created_at: string;
}

export interface AdminStats {
  total_users: number;
  active_users: number;
  hr_users: number;
  recruiters: number;
  candidates: number;
  total_skills: number;
}

export const PIPELINE_STAGE_LABELS: Record<string, string> = {
  matched: "Matched",
  screened: "Screened by Recruiter",
  approved_by_hr: "Approved by HR",
  interview_scheduled: "Interview Scheduled",
  screening: "Screening",
  technical_interview: "Technical Interview",
  hr_interview: "HR Interview",
  offer: "Offer Extended",
  hired: "Hired",
  rejected: "Rejected",
};

export const PIPELINE_COLUMNS: string[] = [
  "matched",
  "screened",
  "approved_by_hr",
  "interview_scheduled",
  "offer",
  "hired",
];

export interface JobRecruiterAssignment {
  id: number;
  job_id: number;
  recruiter_id: number;
  assigned_by: number;
  assignment_role: "PRIMARY_RECRUITER" | "RECRUITER" | "SOURCER" | string;
  status: "active" | "removed" | string;
  assigned_at: string;
  removed_at?: string | null;
  recruiter?: {
    id: number;
    name: string;
    email?: string | null;
  } | null;
  assigner?: {
    id: number;
    name: string;
    email?: string | null;
  } | null;
}

export interface CandidateRecruiterAssignment {
  id: number;
  job_id: number;
  candidate_id: number;
  recruiter_id: number;
  assigned_by: number;
  status: "active" | "completed" | "unassigned" | string;
  assigned_at: string;
  completed_at?: string | null;
  recruiter?: {
    id: number;
    name: string;
    email?: string | null;
  } | null;
  assigner?: {
    id: number;
    name: string;
    email?: string | null;
  } | null;
}

export interface RecruitmentMessage {
  id: number;
  job_id: number;
  candidate_id?: number | null;
  sender_id: number;
  message: string;
  message_type: "GENERAL" | "SCREENING_NOTE" | "HR_REQUEST" | "RECOMMENDATION" | "SYSTEM" | string;
  is_private: boolean;
  created_at: string;
  read_at?: string | null;
  sender_name?: string | null;
  sender_role?: string | null;
}

export interface RecruitmentTask {
  id: number;
  job_id: number;
  candidate_id?: number | null;
  assigned_to: number;
  created_by: number;
  title: string;
  description?: string | null;
  status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | string;
  due_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  assignee_name?: string | null;
  creator_name?: string | null;
  job_title?: string | null;
  candidate_name?: string | null;
}

export interface RecruiterDashboardStats {
  assigned_jobs_count: number;
  total_candidates_count: number;
  pending_review_count: number;
  screened_count: number;
  pending_tasks_count: number;
}

export interface RecruiterJobItem {
  id: number;
  title: string;
  status: string;
  min_experience_years: number;
  work_mode?: string | null;
  created_at: string;
  assignment_role: string;
  total_candidates: number;
  pending_review: number;
  assigned_to_me: number;
}

// ── Enterprise Recruitment Workflow Types ───────────────────────────────────

export type PipelineState =
  | "CANDIDATE_MATCHED"
  | "CANDIDATE_SHORTLISTED"
  | "SENT_TO_HIRING_MANAGER"
  | "HIRING_MANAGER_REVIEW"
  | "HIRING_MANAGER_REJECTED"
  | "INTERVIEW_REQUESTED"
  | "INTERVIEW_SLOTS_PROPOSED"
  | "WAITING_FOR_CANDIDATE_SLOT"
  | "CANDIDATE_SLOT_SELECTED"
  | "INTERVIEW_CONFIRMED"
  | "INTERVIEW_COMPLETED"
  | "WAITING_FOR_HM_FEEDBACK"
  | "INTERVIEW_GO"
  | "INTERVIEW_NO_GO"
  | "COMPENSATION_DISCUSSION"
  | "OFFER_CREATED"
  | "OFFER_SENT"
  | "OFFER_ACCEPTED"
  | "OFFER_REJECTED"
  | "BLACKLISTED"
  | "HIRED"
  | "ON_HOLD_DUE_TO_HIRING"
  | "REJECTED";

export interface InterviewSlot {
  id: number;
  interview_id: number;
  slot_datetime: string;
  slot_end_datetime?: string | null;
  status: "proposed" | "selected" | "cancelled" | string;
  proposer_name?: string | null;
}

export interface InterviewFeedback {
  id: number;
  interview_id: number;
  match_result_id: number;
  reviewer_id?: number | null;
  reviewer_name?: string | null;
  go_no_go: "GO" | "NO_GO" | string;
  technical_rating?: number | null;
  communication_rating?: number | null;
  problem_solving_rating?: number | null;
  role_fit_rating?: number | null;
  overall_rating?: number | null;
  comments?: string | null;
  submitted_at: string;
}

export interface Offer {
  id: number;
  match_result_id: number;
  candidate_id: number;
  job_id: number;
  created_by?: number | null;
  salary_currency: string;
  salary_min?: number | null;
  salary_max?: number | null;
  proposed_salary?: number | null;
  fixed_compensation?: number | null;
  variable_compensation?: number | null;
  total_compensation?: number | null;
  bonus?: number | null;
  joining_bonus?: number | null;
  other_benefits?: string | null;
  notice_period?: string | null;
  expected_joining_date?: string | null;
  override_reason?: string | null;
  override_approved_by?: number | null;
  role_scope?: string | null;
  employment_type?: string | null;
  joining_date?: string | null;
  joining_timeline?: string | null;
  offer_expiry_date?: string | null;
  location?: string | null;
  work_mode?: string | null;
  additional_terms?: string | null;
  status: "DRAFT" | "PENDING_HM_REVIEW" | "HM_CHANGES_REQUESTED" | "HM_APPROVED" | "OFFER_READY" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED" | string;
  sent_at?: string | null;
  responded_at?: string | null;
  candidate_response_note?: string | null;
  accepted_at?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
  // Offer Approval Workflow (v2)
  workflow_state?: string | null;
  submitted_to_hm_at?: string | null;
  approved_by?: number | null;
  approved_at?: string | null;
  hm_approved_at?: string | null;
  hm_comments?: string | null;
  recruiter_comments?: string | null;
  // PDF fields & Versioning
  pdf_version?: number;
  pdf_file_name?: string | null;
  pdf_file_size?: number | null;
  pdf_generated_at?: string | null;
  pdf_storage_key?: string | null;
  expires_at?: string | null;
  has_pdf?: boolean;
  // Derived
  candidate_name?: string | null;
  candidate_email?: string | null;
  job_title?: string | null;
  company_name?: string | null;
  recruiter_name?: string | null;
  hiring_manager_name?: string | null;
}

export interface OfferStats {
  draft: number;
  pending_hm_review: number;
  hm_changes_requested: number;
  hm_approved: number;
  offer_ready: number;
  sent: number;
  accepted: number;
  rejected: number;
  expired: number;
  total: number;
}

export interface CandidateBlacklist {
  id: number;
  candidate_id: number;
  match_result_id?: number | null;
  reason?: string | null;
  blacklisted_at: string;
  blacklisted_until: string;
  is_active: boolean;
  candidate_name?: string | null;
}

export interface WorkflowState {
  match_result_id: number;
  pipeline_state: PipelineState;
  hiring_manager_id?: number | null;
  hiring_manager_name?: string | null;
  shortlist_note?: string | null;
  submitted_to_hm_at?: string | null;
  hm_reviewed_at?: string | null;
  hm_rejection_reason?: string | null;
}

export interface AuditLogEntry {
  id: number;
  actor_id?: number | null;
  actor_name?: string | null;
  action: string;
  entity_type: string;
  from_state?: string | null;
  to_state?: string | null;
  details?: string | null;
  created_at: string;
}

export interface ActionCenterItem {
  task_id: number;
  action_type: string;
  title: string;
  description?: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | string;
  match_result_id?: number | null;
  candidate_id?: number | null;
  candidate_name?: string | null;
  job_id?: number | null;
  job_title?: string | null;
  pipeline_state?: PipelineState | null;
  due_at?: string | null;
  created_at: string;
}

export interface HMDashboardItem {
  match_result_id: number;
  candidate_name: string;
  job_title: string;
  overall_score: number;
  pipeline_state: PipelineState;
  submitted_to_hm_at?: string | null;
  hm_reviewed_at?: string | null;
  recruiter_name?: string | null;
  job_id?: number | null;
  interview_date?: string | null;
  note?: string | null;
}

export interface InterviewWithSlots {
  id: number;
  match_result_id: number;
  interview_type: string;
  meeting_link?: string | null;
  interview_mode?: string | null;
  interview_date?: string | null;
  scheduled_end?: string | null;
  status: string;
  slot_token?: string | null;
  candidate_selection_at?: string | null;
  confirmed_at?: string | null;
  created_at: string;
  slots: InterviewSlot[];
  hm_feedback?: InterviewFeedback | null;
  candidate_name?: string | null;
  job_title?: string | null;
  interviewer_technical_rating?: number | null;
  interviewer_communication_rating?: number | null;
  interviewer_problem_solving_rating?: number | null;
  interviewer_role_fit_rating?: number | null;
  interviewer_overall_rating?: number | null;
  interviewer_comments?: string | null;
  interviewer_name?: string | null;
  interviewer_submitted_at?: string | null;
  // Multi-round fields (v3)
  round_number: number;
  round_name?: string | null;
  round_type: string;
  round_status: string;
  is_additional_round: boolean;
  duration_minutes?: number | null;
  // HM per-round evaluation
  hm_recommendation?: string | null;
  hm_technical_rating?: number | null;
  hm_communication_rating?: number | null;
  hm_problem_solving_rating?: number | null;
  hm_role_fit_rating?: number | null;
  hm_overall_rating?: number | null;
  hm_comments?: string | null;
  hm_feedback_submitted_at?: string | null;
}

export interface ShortlistCandidatesResponse {
  job_id: number;
  job_title: string;
  total_candidates: number;
  min_score_filter: number;
  candidates: Array<{
    match_result_id: number;
    candidate_id: number;
    candidate_name: string;
    email?: string | null;
    phone?: string | null;
    overall_score: number;
    pipeline_state: PipelineState;
    total_experience_years: number;
    meets_experience: boolean;
    matched_skills: string[];
    missing_skills: string[];
    is_blacklisted: boolean;
    blacklist_until?: string | null;
    education?: string | null;
    current_location?: string | null;
  }>;
}

// Configuration helper for visual rendering of pipeline stages
export const PIPELINE_STATE_CONFIG: Record<
  PipelineState,
  { label: string; stepNumber: number; color: string; bg: string; badge: string; isTerminal?: boolean }
> = {
  CANDIDATE_MATCHED: { label: "Matched", stepNumber: 1, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30", badge: "Matched" },
  CANDIDATE_SHORTLISTED: { label: "Shortlisted", stepNumber: 2, color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/30", badge: "Shortlisted" },
  SENT_TO_HIRING_MANAGER: { label: "Sent to HM", stepNumber: 3, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30", badge: "Pending HM Review" },
  HIRING_MANAGER_REVIEW: { label: "HM Reviewing", stepNumber: 3, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30", badge: "In HM Review" },
  HIRING_MANAGER_REJECTED: { label: "HM Rejected", stepNumber: 3, color: "text-red-400", bg: "bg-red-500/10 border-red-500/30", badge: "HM Rejected", isTerminal: true },
  INTERVIEW_REQUESTED: { label: "Interview Requested", stepNumber: 4, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/30", badge: "Interview Requested" },
  INTERVIEW_SLOTS_PROPOSED: { label: "Slots Proposed", stepNumber: 4, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/30", badge: "Slots Proposed" },
  WAITING_FOR_CANDIDATE_SLOT: { label: "Waiting for Candidate", stepNumber: 4, color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/30", badge: "Awaiting Candidate Slot" },
  CANDIDATE_SLOT_SELECTED: { label: "Slot Selected", stepNumber: 4, color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/30", badge: "Slot Chosen" },
  INTERVIEW_CONFIRMED: { label: "Interview Confirmed", stepNumber: 4, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30", badge: "Interview Confirmed" },
  INTERVIEW_COMPLETED: { label: "Interview Done", stepNumber: 5, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30", badge: "Interview Completed" },
  WAITING_FOR_HM_FEEDBACK: { label: "Feedback Awaiting", stepNumber: 5, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30", badge: "Needs HM Feedback" },
  INTERVIEW_GO: { label: "Interview Passed (GO)", stepNumber: 6, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30", badge: "GO Decision" },
  INTERVIEW_NO_GO: { label: "Interview Failed (NO-GO)", stepNumber: 6, color: "text-red-400", bg: "bg-red-500/10 border-red-500/30", badge: "NO-GO Decision", isTerminal: true },
  COMPENSATION_DISCUSSION: { label: "Compensation Phase", stepNumber: 7, color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/30", badge: "Compensation Phase" },
  OFFER_CREATED: { label: "Offer Drafted", stepNumber: 8, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30", badge: "Offer Drafted" },
  OFFER_SENT: { label: "Offer Sent", stepNumber: 8, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30", badge: "Offer Sent" },
  OFFER_ACCEPTED: { label: "Offer Accepted", stepNumber: 9, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30", badge: "Offer Accepted" },
  OFFER_REJECTED: { label: "Offer Declined", stepNumber: 9, color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/30", badge: "Offer Declined", isTerminal: true },
  BLACKLISTED: { label: "Blacklisted (6 Mo)", stepNumber: 10, color: "text-red-500", bg: "bg-red-600/10 border-red-600/30", badge: "Blacklisted", isTerminal: true },
  HIRED: { label: "Hired 🎉", stepNumber: 10, color: "text-green-400", bg: "bg-green-500/10 border-green-500/30", badge: "Hired", isTerminal: true },
  ON_HOLD_DUE_TO_HIRING: { label: "On Hold (Hired)", stepNumber: 10, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30", badge: "On Hold", isTerminal: true },
  REJECTED: { label: "Rejected", stepNumber: 10, color: "text-gray-400", bg: "bg-gray-500/10 border-gray-500/30", badge: "Rejected", isTerminal: true },
};

// ─── Admin Hiring Audit Logs Types ──────────────────────────────────────────
export type HiringLogCategory = "ALL" | "OFFERS" | "INTERVIEWS" | "REVIEWS" | "SOURCING" | "TASKS";

export interface HiringAuditLogEntry {
  id: number;
  action: string;
  action_label: string;
  category: "OFFERS" | "INTERVIEWS" | "REVIEWS" | "SOURCING" | "TASKS" | string;
  actor_id?: number | null;
  actor_name?: string | null;
  actor_email?: string | null;
  actor_role?: string | null;
  job_id?: number | null;
  job_title?: string | null;
  job_department?: string | null;
  candidate_id?: number | null;
  candidate_name?: string | null;
  match_result_id?: number | null;
  interview_id?: number | null;
  from_state?: string | null;
  to_state?: string | null;
  details?: Record<string, any> | null;
  created_at: string;
  relative_time: string;
}

export interface HiringLogsMetrics {
  total_logs: number;
  total_hires: number;
  total_offers: number;
  total_interviews: number;
  recent_24h: number;
}

export interface HiringLogsResponse {
  items: HiringAuditLogEntry[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  metrics: HiringLogsMetrics;
}

export interface HiringLogsQueryParams {
  page?: number;
  page_size?: number;
  category?: string;
  action?: string;
  search?: string;
}

export interface HiringJourneyStep {
  title: string;
  description: string;
  status: "COMPLETED" | "CURRENT" | "PENDING";
  date: string;
}

export interface PreOnboardingChecklistItem {
  id: number;
  title: string;
  description: string;
  status: "COMPLETED" | "PENDING" | "IN_REVIEW";
  category: string;
}

export interface HiringDetails {
  candidate_name: string;
  job_title: string;
  company_name: string;
  position: string;
  employment_type: string;
  work_mode: string;
  location: string;
  joining_date: string;
  raw_joining_date?: string;
  joining_status: string;
  reporting_manager: string;
  recruiter: string;
  hiring_status: string;
  offer_id: number;
  match_id: number;
  ctc: number;
  currency: string;
  accepted_at: string;
  role_scope?: string;
  additional_terms?: string;
  pdf_version?: number;
  journey_timeline: HiringJourneyStep[];
  pre_onboarding_checklist: PreOnboardingChecklistItem[];
}

export interface CandidateHiringResponse {
  is_hired: boolean;
  candidate_hiring_status: string;
  hiring_details: HiringDetails | null;
}
