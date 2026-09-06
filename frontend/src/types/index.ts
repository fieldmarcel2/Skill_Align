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
}

export interface ParsedExperience {
  title: string;
  company?: string;
  duration?: string;
  years?: number;
}

export interface ParsedResumeData {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  skills: { name: string; category: string }[];
  total_experience_years: number;
  education: ParsedEducation[];
  education_degree?: string | null;
  education_institution?: string | null;
  experience: ParsedExperience[];
  certifications: string[];
  projects: string[];
}

export interface Candidate {
  id: number;
  user_id?: number;
  full_name: string;
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
  original_s3_key: string;
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
  interview_date: string;
  interview_type: string;
  meeting_link?: string | null;
  interview_mode?: string | null;
  scheduled_end?: string | null;
  feedback?: string | null;
  status: "scheduled" | "completed" | "cancelled";
  created_at: string;
  scheduler_name?: string | null;
  candidate_name?: string | null;
  job_title?: string | null;
}


export interface Notification {
  id: number;
  user_id: number;
  channel: string;
  subject: string;
  body: string;
  status: string;
  created_at: string;
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
  processing_status?: "queued" | "processing" | "completed" | "failed" | "stale" | string;
  matched_by_version?: string;
  matched_at: string;
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

