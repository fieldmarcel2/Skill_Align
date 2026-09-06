import axios, { AxiosError } from "axios";
import {
  User,
  Skill,
  Job,
  JobSkillIn,
  Candidate,
  ResumeUrlResponse,
  ResumeUploadResponse,
  ResumeTextResponse,
  ParsedResumeResponse,
  CandidateSkill,
  MatchResult,
  MatchRunResponse,
  MatchStatusResponse,
  ResumeStatusResponse,
  AdminStats,
  PaginatedUsersResponse,
  Scorecard,
  PipelineStatus,
  Interview,
  Notification,
  JobRecruiterAssignment,
  CandidateRecruiterAssignment,
  RecruitmentMessage,
  RecruitmentTask,
  RecruiterDashboardStats,
  RecruiterJobItem,
} from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: attach token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("skillalign_token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: auto-logout on 401
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      if (currentPath !== "/login" && currentPath !== "/register" && currentPath !== "/") {
        localStorage.removeItem("skillalign_token");
        window.location.href = "/login?expired=true";
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth APIs ────────────────────────────────────────────────────────────────
export const authApi = {
  register: async (data: { name: string; email: string; password: string; phone: string }): Promise<User> => {
    const res = await apiClient.post<User>("/api/auth/register", data);
    return res.data;
  },
  login: async (data: { email: string; password: string }): Promise<{ access_token: string }> => {
    const res = await apiClient.post<{ access_token: string }>("/api/auth/login", data);
    return res.data;
  },
  sendOtp: async (data: { phone: string }): Promise<{ message: string; dev_otp?: string }> => {
    const res = await apiClient.post<{ message: string; dev_otp?: string }>("/api/auth/send-otp", data);
    return res.data;
  },
  verifyOtp: async (data: { phone: string; otp: string }): Promise<{ access_token: string; user: User; is_new_user: boolean; message: string }> => {
    const res = await apiClient.post<{ access_token: string; user: User; is_new_user: boolean; message: string }>("/api/auth/verify-otp", data);
    return res.data;
  },
  resendOtp: async (data: { phone: string }): Promise<{ message: string; dev_otp?: string }> => {
    const res = await apiClient.post<{ message: string; dev_otp?: string }>("/api/auth/resend-otp", data);
    return res.data;
  },
  getMe: async (): Promise<User> => {
    const res = await apiClient.get<User>("/api/auth/me");
    return res.data;
  },
  updateMe: async (data: { name?: string; phone_number?: string; email?: string }): Promise<User> => {
    const res = await apiClient.put<User>("/api/auth/me", data);
    return res.data;
  },
};

// ── User Management APIs (Admin) ─────────────────────────────────────────────
export const usersApi = {
  create: async (data: { name: string; email: string; password: string; role_id: number; phone_number?: string }): Promise<User> => {
    const res = await apiClient.post<User>("/api/users", data);
    return res.data;
  },
  list: async (roleId?: number): Promise<User[]> => {
    const params = roleId ? { role_id: roleId } : {};
    const res = await apiClient.get<User[]>("/api/users", { params });
    return res.data;
  },
  getStats: async (): Promise<AdminStats> => {
    const res = await apiClient.get<AdminStats>("/api/users/stats");
    return res.data;
  },
  update: async (userId: number, data: { name?: string; is_active?: boolean }): Promise<User> => {
    const res = await apiClient.put<User>(`/api/users/${userId}`, data);
    return res.data;
  },
};

// ── Admin Management APIs ────────────────────────────────────────────────────
export const adminApi = {
  listUsers: async (params: {
    page?: number;
    page_size?: number;
    search?: string;
    role?: string;
    status?: string;
  }): Promise<PaginatedUsersResponse> => {
    const res = await apiClient.get<PaginatedUsersResponse>("/api/admin/users", { params });
    return res.data;
  },
  toggleUserStatus: async (userId: number): Promise<User> => {
    const res = await apiClient.patch<User>(`/api/admin/users/${userId}/toggle-status`);
    return res.data;
  },
  getUserDetail: async (userId: number): Promise<any> => {
    const res = await apiClient.get<any>(`/api/admin/users/${userId}/detail`);
    return res.data;
  },
  deleteUser: async (userId: number): Promise<{ message: string; id: number }> => {
    const res = await apiClient.delete<{ message: string; id: number }>(`/api/admin/users/${userId}`);
    return res.data;
  },
};

// ── Skills APIs ──────────────────────────────────────────────────────────────
export const skillsApi = {
  list: async (category?: string): Promise<Skill[]> => {
    const params = category ? { category } : {};
    const res = await apiClient.get<Skill[]>("/api/skills", { params });
    return res.data;
  },
  create: async (data: { name: string; category: string }): Promise<Skill> => {
    const res = await apiClient.post<Skill>("/api/skills", data);
    return res.data;
  },
  update: async (id: number, data: { name?: string; category?: string }): Promise<Skill> => {
    const res = await apiClient.put<Skill>(`/api/skills/${id}`, data);
    return res.data;
  },
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/skills/${id}`);
  },
};

// ── Jobs APIs ────────────────────────────────────────────────────────────────
export const jobsApi = {
  list: async (params?: { status?: string; my_jobs_only?: boolean }): Promise<Job[]> => {
    const res = await apiClient.get<Job[]>("/api/jobs", { params });
    return res.data;
  },
  getById: async (id: number): Promise<Job> => {
    const res = await apiClient.get<Job>(`/api/jobs/${id}`);
    return res.data;
  },
  create: async (data: {
    title: string;
    description?: string;
    department?: string;
    client_name?: string;
    min_experience_years: number;
    work_mode?: string;
    location_city?: string;
    location_state?: string;
    location_country?: string;
    urgency?: string;
    shift_timing?: string;
    travel_requirements?: string;
    status: string;
    skills: JobSkillIn[];
  }): Promise<Job> => {
    const res = await apiClient.post<Job>("/api/jobs", data);
    return res.data;
  },
  update: async (
    id: number,
    data: {
      title?: string;
      description?: string;
      department?: string;
      client_name?: string;
      min_experience_years?: number;
      work_mode?: string;
      location_city?: string;
      location_state?: string;
      location_country?: string;
      urgency?: string;
      shift_timing?: string;
      travel_requirements?: string;
      status?: string;
      skills?: JobSkillIn[];
    }
  ): Promise<Job> => {
    const res = await apiClient.put<Job>(`/api/jobs/${id}`, data);
    return res.data;
  },
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/jobs/${id}`);
  },
};

// ── Candidates APIs ──────────────────────────────────────────────────────────
export const candidatesApi = {
  getMyProfile: async (): Promise<Candidate> => {
    const res = await apiClient.get<Candidate>("/api/candidates/me");
    return res.data;
  },
  getMyPipeline: async (): Promise<MatchResult[]> => {
    const res = await apiClient.get<MatchResult[]>("/api/candidates/me/pipeline");
    return res.data;
  },
  createProfile: async (data: {
    full_name: string;
    phone?: string;
    total_experience_years: number;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
    work_authorization?: string;
    preferred_work_mode?: string;
    notice_period?: string;
    current_ctc?: number;
    expected_ctc?: number;
  }): Promise<Candidate> => {
    const res = await apiClient.post<Candidate>("/api/candidates/me", data);
    return res.data;
  },
  updateProfile: async (data: {
    full_name?: string;
    phone?: string;
    total_experience_years?: number;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
    work_authorization?: string;
    preferred_work_mode?: string;
    notice_period?: string;
    current_ctc?: number;
    expected_ctc?: number;
  }): Promise<Candidate> => {
    const res = await apiClient.put<Candidate>("/api/candidates/me", data);
    return res.data;
  },
  uploadResume: async (file: File): Promise<Candidate> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await apiClient.post<Candidate>("/api/candidates/me/resume", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
  addSkill: async (data: {
    skill_id: number;
    proficiency_level: string;
    years_experience: number;
  }): Promise<Candidate> => {
    const res = await apiClient.post<Candidate>("/api/candidates/me/skills", data);
    return res.data;
  },
  updateSkill: async (
    skillId: number,
    data: { proficiency_level?: string; years_experience?: number }
  ): Promise<Candidate> => {
    const res = await apiClient.put<Candidate>(`/api/candidates/me/skills/${skillId}`, data);
    return res.data;
  },
  removeSkill: async (skillId: number): Promise<Candidate> => {
    const res = await apiClient.delete<Candidate>(`/api/candidates/me/skills/${skillId}`);
    return res.data;
  },
  getById: async (candidateId: number): Promise<Candidate> => {
    const res = await apiClient.get<Candidate>(`/api/candidates/${candidateId}`);
    return res.data;
  },
  getResumeUrl: (candidateId: number): string => {
    return `${API_BASE_URL}/api/candidates/${candidateId}/resume`;
  },
};

// ── AWS S3 & Parsing Resume Management APIs ────────────────────────────────
export const resumeApi = {
  upload: async (candidateId: number, file: File): Promise<ResumeUploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await apiClient.post<ResumeUploadResponse>(`/api/candidates/${candidateId}/resume`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
  getUrl: async (candidateId: number): Promise<ResumeUrlResponse> => {
    const res = await apiClient.get<ResumeUrlResponse>(`/api/candidates/${candidateId}/resume`);
    return res.data;
  },
  getText: async (candidateId: number): Promise<ResumeTextResponse> => {
    const res = await apiClient.get<ResumeTextResponse>(`/api/candidates/${candidateId}/resume/text`);
    return res.data;
  },
  getParsed: async (candidateId: number): Promise<ParsedResumeResponse> => {
    const res = await apiClient.get<ParsedResumeResponse>(`/api/candidates/${candidateId}/resume/parsed`);
    return res.data;
  },
  delete: async (candidateId: number): Promise<{ message: string; candidate_id: number }> => {
    const res = await apiClient.delete<{ message: string; candidate_id: number }>(`/api/candidates/${candidateId}/resume`);
    return res.data;
  },
  getStatus: async (candidateId: number): Promise<ResumeStatusResponse> => {
    const res = await apiClient.get<ResumeStatusResponse>(`/api/candidates/${candidateId}/resume/status`);
    return res.data;
  },
};

// ── Matching Engine APIs ─────────────────────────────────────────────────────
export const matchingApi = {
  runMatch: async (jobId: number): Promise<MatchRunResponse> => {
    const res = await apiClient.post<MatchRunResponse>(`/api/matching/jobs/${jobId}/run`);
    return res.data;
  },
  getMatchStatus: async (jobId: number): Promise<MatchStatusResponse> => {
    const res = await apiClient.get<MatchStatusResponse>(`/api/matching/jobs/${jobId}/status`);
    return res.data;
  },
  getMatches: async (jobId: number, status?: string): Promise<MatchResult[]> => {
    const params = status ? { status } : {};
    const res = await apiClient.get<MatchResult[]>(`/api/matching/jobs/${jobId}`, { params });
    return res.data;
  },
  getMatchById: async (matchId: number): Promise<MatchResult> => {
    const res = await apiClient.get<MatchResult>(`/api/match_results/${matchId}`);
    return res.data;
  },
  getScreenedMatches: async (jobId?: number): Promise<MatchResult[]> => {
    const params = jobId ? { job_id: jobId } : {};
    const res = await apiClient.get<MatchResult[]>("/api/matching/screened", { params });
    return res.data;
  },
  updateStatus: async (matchId: number, newStatus: PipelineStatus): Promise<MatchResult> => {
    const res = await apiClient.patch<MatchResult>(`/api/match_results/${matchId}/status`, { status: newStatus });
    return res.data;
  },
  listShortlists: async (jobId?: number): Promise<MatchResult[]> => {
    const params = jobId ? { job_id: jobId } : {};
    const res = await apiClient.get<MatchResult[]>("/api/matching/shortlists", { params });
    return res.data;
  },
  createScorecard: async (
    matchId: number,
    data: { communication_score: number; technical_score: number; overall_impression?: string }
  ): Promise<Scorecard> => {
    const res = await apiClient.post<Scorecard>(`/api/matching/${matchId}/scorecard`, data);
    return res.data;
  },
  getScorecards: async (matchId: number): Promise<Scorecard[]> => {
    const res = await apiClient.get<Scorecard[]>(`/api/matching/${matchId}/scorecards`);
    return res.data;
  },
  getAiAnalysis: async (matchId: number): Promise<{
    match_id: number;
    job_title: string;
    candidate_name: string;
    algorithmic_score: number;
    semantic_fit_score: number;
    ai_summary: string;
    key_strengths: string[];
    skill_gaps: string[];
    suggested_interview_questions: string[];
  }> => {
    const res = await apiClient.get(`/api/matching/${matchId}/ai-analysis`);
    return res.data;
  },
};

// ── Interview Management APIs (HR Only) ───────────────────────────────────────
export const interviewsApi = {
  create: async (data: {
    match_result_id: number;
    interview_date: string;
    interview_type: string;
    meeting_link?: string;
    interview_mode?: string;
    scheduled_end?: string;
    feedback?: string;
    send_notification?: boolean;
  }): Promise<Interview> => {
    const res = await apiClient.post<Interview>("/api/interviews", data);
    return res.data;
  },
  list: async (status?: string): Promise<Interview[]> => {
    const params = status ? { status } : {};
    const res = await apiClient.get<Interview[]>("/api/interviews", { params });
    return res.data;
  },
  getMyInterviews: async (): Promise<Interview[]> => {
    const res = await apiClient.get<Interview[]>("/api/interviews/my");
    return res.data;
  },
  getById: async (id: number): Promise<Interview> => {
    const res = await apiClient.get<Interview>(`/api/interviews/${id}`);
    return res.data;
  },
  update: async (
    id: number,
    data: {
      interview_date?: string;
      interview_type?: string;
      meeting_link?: string;
      interview_mode?: string;
      scheduled_end?: string;
      feedback?: string;
      status?: string;
    }
  ): Promise<Interview> => {
    const res = await apiClient.patch<Interview>(`/api/interviews/${id}`, data);
    return res.data;
  },
};

// ── Notification APIs (HR & Candidates) ──────────────────────────────────────
export const notificationsApi = {
  create: async (data: {
    user_id: number;
    subject: string;
    body: string;
    channel?: string;
  }): Promise<Notification> => {
    const res = await apiClient.post<Notification>("/api/notifications", data);
    return res.data;
  },
  getMyNotifications: async (): Promise<Notification[]> => {
    const res = await apiClient.get<Notification[]>("/api/notifications/my");
    return res.data;
  },
  list: async (userId?: number): Promise<Notification[]> => {
    const params = userId ? { user_id: userId } : {};
    const res = await apiClient.get<Notification[]>("/api/notifications", { params });
    return res.data;
  },
};

// ── Multi-Recruiter Job Assignments (HR Only) ────────────────────────────────
export const recruiterAssignmentApi = {
  assignRecruiter: async (
    jobId: number,
    recruiterId: number,
    assignmentRole: string = "RECRUITER"
  ): Promise<JobRecruiterAssignment> => {
    const res = await apiClient.post<JobRecruiterAssignment>(`/api/jobs/${jobId}/recruiters`, {
      recruiter_id: recruiterId,
      assignment_role: assignmentRole,
    });
    return res.data;
  },
  removeRecruiter: async (jobId: number, recruiterId: number): Promise<void> => {
    await apiClient.delete(`/api/jobs/${jobId}/recruiters/${recruiterId}`);
  },
  updateRole: async (
    jobId: number,
    recruiterId: number,
    assignmentRole: string
  ): Promise<JobRecruiterAssignment> => {
    const res = await apiClient.patch<JobRecruiterAssignment>(
      `/api/jobs/${jobId}/recruiters/${recruiterId}`,
      { assignment_role: assignmentRole }
    );
    return res.data;
  },
  listJobRecruiters: async (jobId: number): Promise<JobRecruiterAssignment[]> => {
    const res = await apiClient.get<JobRecruiterAssignment[]>(`/api/jobs/${jobId}/recruiters`);
    return res.data;
  },
};

// ── Recruiter Operations & Claiming APIs ──────────────────────────────────────
export const recruiterApi = {
  getDashboardStats: async (): Promise<RecruiterDashboardStats> => {
    const res = await apiClient.get<RecruiterDashboardStats>("/api/recruiter/dashboard-stats");
    return res.data;
  },
  getAssignedJobs: async (): Promise<RecruiterJobItem[]> => {
    const res = await apiClient.get<RecruiterJobItem[]>("/api/recruiter/jobs");
    return res.data;
  },
  getJobCandidates: async (
    jobId: number,
    params?: {
      search?: string;
      min_score?: number;
      status?: string;
      assigned_to_me?: boolean;
      assignment_status?: string;
      page?: number;
      page_size?: number;
    }
  ): Promise<MatchResult[]> => {
    const res = await apiClient.get<MatchResult[]>(`/api/recruiter/jobs/${jobId}/candidates`, { params });
    return res.data;
  },
  getAllCandidates: async (
    params?: {
      job_id?: number;
      search?: string;
      min_score?: number;
      status?: string;
      assigned_to_me?: boolean;
      assignment_status?: string;
      page?: number;
      page_size?: number;
    }
  ): Promise<MatchResult[]> => {
    const res = await apiClient.get<MatchResult[]>("/api/recruiter/candidates", { params });
    return res.data;
  },
  getCandidateDetail: async (jobId: number, candidateId: number): Promise<MatchResult> => {
    const res = await apiClient.get<MatchResult>(`/api/recruiter/jobs/${jobId}/candidates/${candidateId}`);
    return res.data;
  },
  claimCandidate: async (jobId: number, candidateId: number): Promise<CandidateRecruiterAssignment> => {
    const res = await apiClient.post<CandidateRecruiterAssignment>(
      `/api/jobs/${jobId}/candidates/${candidateId}/claim`
    );
    return res.data;
  },
  assignCandidate: async (
    jobId: number,
    candidateId: number,
    recruiterId: number
  ): Promise<CandidateRecruiterAssignment> => {
    const res = await apiClient.post<CandidateRecruiterAssignment>(
      `/api/jobs/${jobId}/candidates/${candidateId}/assign`,
      { recruiter_id: recruiterId }
    );
    return res.data;
  },
  unassignCandidate: async (jobId: number, candidateId: number): Promise<void> => {
    await apiClient.delete(`/api/jobs/${jobId}/candidates/${candidateId}/assignment`);
  },
};

// ── Recruitment Communication APIs ────────────────────────────────────────────
export const communicationApi = {
  listJobMessages: async (jobId: number): Promise<RecruitmentMessage[]> => {
    const res = await apiClient.get<RecruitmentMessage[]>(`/api/jobs/${jobId}/messages`);
    return res.data;
  },
  sendJobMessage: async (
    jobId: number,
    data: { message: string; message_type?: string; is_private?: boolean }
  ): Promise<RecruitmentMessage> => {
    const res = await apiClient.post<RecruitmentMessage>(`/api/jobs/${jobId}/messages`, data);
    return res.data;
  },
  listCandidateMessages: async (jobId: number, candidateId: number): Promise<RecruitmentMessage[]> => {
    const res = await apiClient.get<RecruitmentMessage[]>(
      `/api/jobs/${jobId}/candidates/${candidateId}/messages`
    );
    return res.data;
  },
  sendCandidateMessage: async (
    jobId: number,
    candidateId: number,
    data: { message: string; message_type?: string; is_private?: boolean }
  ): Promise<RecruitmentMessage> => {
    const res = await apiClient.post<RecruitmentMessage>(
      `/api/jobs/${jobId}/candidates/${candidateId}/messages`,
      data
    );
    return res.data;
  },
};

// ── Recruitment Task APIs ─────────────────────────────────────────────────────
export const tasksApi = {
  getMyTasks: async (status?: string): Promise<RecruitmentTask[]> => {
    const params = status ? { status } : {};
    const res = await apiClient.get<RecruitmentTask[]>("/api/recruiter/tasks", { params });
    return res.data;
  },
  getJobTasks: async (jobId: number, candidateId?: number): Promise<RecruitmentTask[]> => {
    const params = candidateId ? { candidate_id: candidateId } : {};
    const res = await apiClient.get<RecruitmentTask[]>(`/api/jobs/${jobId}/tasks`, { params });
    return res.data;
  },
  createTask: async (
    jobId: number,
    data: {
      assigned_to: number;
      title: string;
      description?: string;
      priority?: string;
      due_at?: string;
    },
    candidateId?: number
  ): Promise<RecruitmentTask> => {
    const params = candidateId ? { candidate_id: candidateId } : {};
    const res = await apiClient.post<RecruitmentTask>(`/api/jobs/${jobId}/tasks`, data, { params });
    return res.data;
  },
  updateTask: async (
    taskId: number,
    data: { status?: string; priority?: string; description?: string }
  ): Promise<RecruitmentTask> => {
    const res = await apiClient.patch<RecruitmentTask>(`/api/tasks/${taskId}`, data);
    return res.data;
  },
};

