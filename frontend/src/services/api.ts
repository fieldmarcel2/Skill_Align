import axios, { AxiosError } from "axios";
import {
  User,
  Skill,
  Job,
  JobSkillIn,
  Candidate,
  CandidateSkill,
  MatchResult,
  MatchRunResponse,
  AdminStats,
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
      // If unauthorized, remove token and let AuthContext handle state
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
  register: async (data: { name: string; email: string; password: string; phone?: string }): Promise<User> => {
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
};

// ── User Management APIs (Admin) ─────────────────────────────────────────────
export const usersApi = {
  create: async (data: { name: string; email: string; password: string; role_id: number }): Promise<User> => {
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
      status?: string;
      skills?: JobSkillIn[];
    }
  ): Promise<Job> => {
    const res = await apiClient.put<Job>(`/api/jobs/${id}`, data);
    return res.data;
  },
};

// ── Candidates APIs ──────────────────────────────────────────────────────────
export const candidatesApi = {
  getMyProfile: async (): Promise<Candidate> => {
    const res = await apiClient.get<Candidate>("/api/candidates/me");
    return res.data;
  },
  createProfile: async (data: {
    full_name: string;
    phone?: string;
    total_experience_years: number;
  }): Promise<Candidate> => {
    const res = await apiClient.post<Candidate>("/api/candidates/me", data);
    return res.data;
  },
  updateProfile: async (data: {
    full_name?: string;
    phone?: string;
    total_experience_years?: number;
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

// ── Matching Engine APIs ─────────────────────────────────────────────────────
export const matchingApi = {
  runMatch: async (jobId: number): Promise<MatchRunResponse> => {
    const res = await apiClient.post<MatchRunResponse>(`/api/matching/jobs/${jobId}/run`);
    return res.data;
  },
  getMatches: async (jobId: number, status?: string): Promise<MatchResult[]> => {
    const params = status ? { status } : {};
    const res = await apiClient.get<MatchResult[]>(`/api/matching/jobs/${jobId}`, { params });
    return res.data;
  },
  updateStatus: async (matchId: number, newStatus: "matched" | "shortlisted" | "rejected"): Promise<MatchResult> => {
    const res = await apiClient.patch<MatchResult>(`/api/matching/${matchId}/status`, { status: newStatus });
    return res.data;
  },
  listShortlists: async (jobId?: number): Promise<MatchResult[]> => {
    const params = jobId ? { job_id: jobId } : {};
    const res = await apiClient.get<MatchResult[]>("/api/matching/shortlists", { params });
    return res.data;
  },
};
