import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "../components/common/ProtectedRoute";
import { DashboardLayout } from "../components/layout/DashboardLayout";

// Public pages
import { LandingPage } from "../pages/LandingPage";
import { LoginPage } from "../pages/auth/LoginPage";
import { RegisterPage } from "../pages/auth/RegisterPage";

// Admin pages
import { AdminDashboard } from "../pages/admin/AdminDashboard";
import { UsersPage } from "../pages/admin/UsersPage";
import { SkillsPage } from "../pages/admin/SkillsPage";
import { AdminUserDetailPage } from "../pages/admin/AdminUserDetailPage";

// HR pages
import { HRDashboard } from "../pages/hr/HRDashboard";
import { HRJobMatchesPage } from "../pages/hr/HRJobMatchesPage";
import { HRShortlistsPage } from "../pages/hr/HRShortlistsPage";
import { HiringPipelinePage } from "../pages/hr/HiringPipelinePage";
import { HRCreateJobPage } from "../pages/hr/HRCreateJobPage";

// Recruiter pages
import { RecruiterDashboard } from "../pages/recruiter/RecruiterDashboard";
import { JobDetailPage } from "../pages/recruiter/JobDetailPage";
import { ShortlistsPage } from "../pages/recruiter/ShortlistsPage";
import { RecruiterCandidatesPage } from "../pages/recruiter/RecruiterCandidatesPage";
import { RecruiterCandidateDetailPage } from "../pages/recruiter/RecruiterCandidateDetailPage";

// Candidate pages
import { CandidateDashboard } from "../pages/candidate/CandidateDashboard";
import { CandidateProfilePage } from "../pages/candidate/CandidateProfilePage";
import { CandidateSkillsPage } from "../pages/candidate/CandidateSkillsPage";

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Admin Protected Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["Admin"]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="users/:id" element={<AdminUserDetailPage />} />
        <Route path="skills" element={<SkillsPage />} />
      </Route>

      {/* HR Protected Routes */}
      <Route
        path="/hr"
        element={
          <ProtectedRoute allowedRoles={["HR"]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HRDashboard />} />
        <Route path="jobs/create" element={<HRCreateJobPage />} />
        <Route path="jobs/:id/matches" element={<HRJobMatchesPage />} />
        <Route path="shortlists" element={<HRShortlistsPage />} />
        <Route path="pipeline" element={<HiringPipelinePage />} />
      </Route>

      {/* Recruiter Protected Routes */}
      <Route
        path="/recruiter"
        element={
          <ProtectedRoute allowedRoles={["Recruiter"]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<RecruiterDashboard />} />
        <Route path="jobs/:id" element={<JobDetailPage />} />
        <Route path="candidates" element={<RecruiterCandidatesPage />} />
        <Route path="jobs/:jobId/candidates/:candidateId" element={<RecruiterCandidateDetailPage />} />
        <Route path="candidates/:candidateId" element={<RecruiterCandidateDetailPage />} />
        <Route path="shortlists" element={<ShortlistsPage />} />
      </Route>

      {/* Candidate Protected Routes */}
      <Route
        path="/candidate"
        element={
          <ProtectedRoute allowedRoles={["Candidate"]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<CandidateDashboard />} />
        <Route path="profile" element={<CandidateProfilePage />} />
        <Route path="skills" element={<CandidateSkillsPage />} />
      </Route>

      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
