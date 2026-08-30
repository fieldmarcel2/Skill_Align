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
  proficiency_level: "Beginner" | "Intermediate" | "Expert";
  years_experience: number;
}

export interface Candidate {
  id: number;
  user_id?: number;
  full_name: string;
  phone?: string;
  resume_file_path?: string;
  resume_s3_key?: string | null;
  resume_filename?: string | null;
  resume_uploaded_at?: string | null;
  total_experience_years: number;
  skills: CandidateSkill[];
}

export interface ResumeUrlResponse {
  resume_url: string;
  filename?: string | null;
  expires_in_seconds: number;
}

export interface ResumeUploadResponse {
  message: string;
  candidate_id: number;
  resume_filename: string;
  resume_s3_key: string;
  resume_uploaded_at: string;
}

export interface Interview {
  id: number;
  match_result_id: number;
  scheduled_by: number;
  interview_date: string;
  interview_type: string;
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

export interface MatchResult {
  id: number;
  job_id: number;
  candidate_id: number;
  recruiter_id?: number | null;
  overall_score: number;
  status: PipelineStatus;
  matched_at: string;
  updated_at?: string;
  meets_experience: boolean;
  job?: Job;
  candidate: Candidate;
  interviews?: Interview[];
}

export interface MatchRunResponse {
  job_id: number;
  total_candidates: number;
  results: MatchResult[];
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
