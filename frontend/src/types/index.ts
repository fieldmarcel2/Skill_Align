export type RoleName = "Admin" | "HR" | "Recruiter" | "Candidate";

export interface Role {
  id: number;
  name: RoleName;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  is_active: boolean;
  created_at: string;
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
    email: string;
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
  full_name: string;
  phone?: string;
  resume_file_path?: string;
  total_experience_years: number;
  skills: CandidateSkill[];
}

export interface MatchResult {
  id: number;
  job_id: number;
  candidate_id: number;
  overall_score: number;
  status: "matched" | "shortlisted" | "rejected";
  matched_at: string;
  meets_experience: boolean;
  job?: Job;
  candidate: Candidate;
}

export interface MatchRunResponse {
  job_id: number;
  total_candidates: number;
  results: MatchResult[];
}

export interface AdminStats {
  total_users: number;
  active_users: number;
  hr_users: number;
  recruiters: number;
  candidates: number;
  total_skills: number;
}
