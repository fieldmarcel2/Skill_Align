import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "../components/common/ProtectedRoute";
import { DashboardLayout } from "../components/layout/DashboardLayout";

// Public pages
import { LandingPage } from "../pages/LandingPage";
import { LoginPage } from "../pages/auth/LoginPage";
import { RegisterPage } from "../pages/auth/RegisterPage";
import { SlotSelectionPage } from "../pages/candidate/SlotSelectionPage";
import { CandidateOfferPage } from "../pages/candidate/CandidateOfferPage";
import { ApplicationTimelinePage } from "../pages/candidate/ApplicationTimelinePage";

// Admin pages
import { AdminDashboard } from "../pages/admin/AdminDashboard";
import { UsersPage } from "../pages/admin/UsersPage";
import { SkillsPage } from "../pages/admin/SkillsPage";
import { AdminUserDetailPage } from "../pages/admin/AdminUserDetailPage";

// HR / Hiring Manager pages
import { HRDashboard } from "../pages/hr/HRDashboard";
import { HRDecisionDashboard } from "../pages/hr/HRDecisionDashboard";
import { HRJobMatchesPage } from "../pages/hr/HRJobMatchesPage";
import { HRShortlistsPage } from "../pages/hr/HRShortlistsPage";
import { HiringPipelinePage } from "../pages/hr/HiringPipelinePage";
import { HRCreateJobPage } from "../pages/hr/HRCreateJobPage";
import { HMCandidateReviewPage } from "../pages/hr/HMCandidateReviewPage";
import { HMFeedbackPage } from "../pages/hr/HMFeedbackPage";
import { HMOfferReviewPage } from "../pages/hr/HMOfferReviewPage";

// Recruiter pages
import { RecruiterDashboard } from "../pages/recruiter/RecruiterDashboard";
import { JobDetailPage } from "../pages/recruiter/JobDetailPage";
import { ShortlistsPage } from "../pages/recruiter/ShortlistsPage";
import { RecruiterCandidatesPage } from "../pages/recruiter/RecruiterCandidatesPage";
import { RecruiterCandidateDetailPage } from "../pages/recruiter/RecruiterCandidateDetailPage";
import { ActionCenterPage } from "../pages/recruiter/ActionCenterPage";
import { ShortlistSubmissionPage } from "../pages/recruiter/ShortlistSubmissionPage";
import { RecruiterOfferPage } from "../pages/recruiter/RecruiterOfferPage";

// Candidate pages
import { CandidateDashboard } from "../pages/candidate/CandidateDashboard";
import { CandidateProfilePage } from "../pages/candidate/CandidateProfilePage";
import { CandidateSkillsPage } from "../pages/candidate/CandidateSkillsPage";
import { CandidateHiringPage } from "../pages/candidate/CandidateHiringPage";

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/select-slot" element={<SlotSelectionPage />} />
      <Route path="/interviews/:interviewId/select-slot" element={<SlotSelectionPage />} />
      <Route path="/interviews/select-slot" element={<SlotSelectionPage />} />
      <Route path="/candidate/offers/:id" element={<CandidateOfferPage />} />
      <Route path="/offers/:id" element={<CandidateOfferPage />} />
      <Route path="/offers/respond" element={<CandidateOfferPage />} />
      <Route path="/applications/:id/timeline" element={<ApplicationTimelinePage />} />

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
        <Route path="applications/:id/timeline" element={<ApplicationTimelinePage />} />
      </Route>

      {/* HR (Hiring Manager) Protected Routes */}
      <Route
        path="/hr"
        element={
          <ProtectedRoute allowedRoles={["HR"]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HRDashboard />} />
        <Route path="decisions" element={<HRDecisionDashboard />} />
        <Route path="jobs/create" element={<HRCreateJobPage />} />
        <Route path="jobs/:id/matches" element={<HRJobMatchesPage />} />
        <Route path="candidates/:matchId/review" element={<HMCandidateReviewPage />} />
        <Route path="interviews/:matchId/feedback" element={<HMFeedbackPage />} />
        <Route path="applications/:id/timeline" element={<ApplicationTimelinePage />} />
        <Route path="shortlists" element={<HRShortlistsPage />} />
        <Route path="pipeline" element={<HiringPipelinePage />} />
        <Route path="offers/:offerId" element={<HMOfferReviewPage />} />
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
        <Route path="action-center" element={<ActionCenterPage />} />
        <Route path="jobs/:id" element={<JobDetailPage />} />
        <Route path="jobs/:jobId/shortlist" element={<ShortlistSubmissionPage />} />
        <Route path="candidates" element={<RecruiterCandidatesPage />} />
        <Route path="jobs/:jobId/candidates/:candidateId" element={<RecruiterCandidateDetailPage />} />
        <Route path="candidates/:candidateId" element={<RecruiterCandidateDetailPage />} />
        <Route path="offers/create" element={<RecruiterOfferPage />} />
        <Route path="offers/:id" element={<RecruiterOfferPage />} />
        <Route path="shortlists" element={<ShortlistsPage />} />
        <Route path="applications/:id/timeline" element={<ApplicationTimelinePage />} />
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
        <Route path="hiring" element={<CandidateHiringPage />} />
        <Route path="profile" element={<CandidateProfilePage />} />
        <Route path="skills" element={<CandidateSkillsPage />} />
        <Route path="offers/:id" element={<CandidateOfferPage />} />
        <Route path="applications/:id/timeline" element={<ApplicationTimelinePage />} />
      </Route>

      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
export default AppRoutes;
