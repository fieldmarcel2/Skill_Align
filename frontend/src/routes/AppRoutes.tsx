import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "../components/common/ProtectedRoute";
import { DashboardLayout } from "../components/layout/DashboardLayout";

// ── Sleek branded route loading fallback ─────────────────────────────────────
const RouteLoadingFallback: React.FC = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 space-y-4">
    <div className="relative">
      <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
      <div className="w-10 h-10 rounded-full border-2 border-cyan-400/20 border-b-cyan-400 animate-spin absolute inset-0 [animation-direction:reverse] [animation-duration:1.5s]" />
    </div>
    <span className="text-xs font-semibold tracking-wide text-muted-foreground animate-pulse">
      Loading SkillAlign...
    </span>
  </div>
);

// ── Lazy-loaded Public Pages ─────────────────────────────────────────────────
const LandingPage = lazy(() => import("../pages/LandingPage").then((m: any) => ({ default: m.LandingPage || m.default })));
const LoginPage = lazy(() => import("../pages/auth/LoginPage").then((m: any) => ({ default: m.LoginPage || m.default })));
const RegisterPage = lazy(() => import("../pages/auth/RegisterPage").then((m: any) => ({ default: m.RegisterPage || m.default })));
const ForgotPasswordPage = lazy(() => import("../pages/auth/ForgotPasswordPage").then((m: any) => ({ default: m.ForgotPasswordPage || m.default })));
const ResetPasswordPage = lazy(() => import("../pages/auth/ResetPasswordPage").then((m: any) => ({ default: m.ResetPasswordPage || m.default })));
const SlotSelectionPage = lazy(() => import("../pages/candidate/SlotSelectionPage").then((m: any) => ({ default: m.SlotSelectionPage || m.default })));
const CandidateOfferPage = lazy(() => import("../pages/candidate/CandidateOfferPage").then((m: any) => ({ default: m.CandidateOfferPage || m.default })));
const ApplicationTimelinePage = lazy(() => import("../pages/candidate/ApplicationTimelinePage").then((m: any) => ({ default: m.ApplicationTimelinePage || m.default })));

// ── Lazy-loaded Admin Pages ──────────────────────────────────────────────────
const AdminDashboard = lazy(() => import("../pages/admin/AdminDashboard").then((m: any) => ({ default: m.AdminDashboard || m.default })));
const UsersPage = lazy(() => import("../pages/admin/UsersPage").then((m: any) => ({ default: m.UsersPage || m.default })));
const SkillsPage = lazy(() => import("../pages/admin/SkillsPage").then((m: any) => ({ default: m.SkillsPage || m.default })));
const AdminUserDetailPage = lazy(() => import("../pages/admin/AdminUserDetailPage").then((m: any) => ({ default: m.AdminUserDetailPage || m.default })));

// ── Lazy-loaded HR / Hiring Manager Pages ────────────────────────────────────
const HRDashboard = lazy(() => import("../pages/hr/HRDashboard").then((m: any) => ({ default: m.HRDashboard || m.default })));
const HRDecisionDashboard = lazy(() => import("../pages/hr/HRDecisionDashboard").then((m: any) => ({ default: m.HRDecisionDashboard || m.default })));
const HRJobMatchesPage = lazy(() => import("../pages/hr/HRJobMatchesPage").then((m: any) => ({ default: m.HRJobMatchesPage || m.default })));
const HRShortlistsPage = lazy(() => import("../pages/hr/HRShortlistsPage").then((m: any) => ({ default: m.HRShortlistsPage || m.default })));
const HRCreateJobPage = lazy(() => import("../pages/hr/HRCreateJobPage").then((m: any) => ({ default: m.HRCreateJobPage || m.default })));
const HMCandidateReviewPage = lazy(() => import("../pages/hr/HMCandidateReviewPage").then((m: any) => ({ default: m.HMCandidateReviewPage || m.default })));
const HMFeedbackPage = lazy(() => import("../pages/hr/HMFeedbackPage").then((m: any) => ({ default: m.HMFeedbackPage || m.default })));
const HMOfferReviewPage = lazy(() => import("../pages/hr/HMOfferReviewPage").then((m: any) => ({ default: m.HMOfferReviewPage || m.default })));

// ── Lazy-loaded Recruiter Pages ──────────────────────────────────────────────
const RecruiterDashboard = lazy(() => import("../pages/recruiter/RecruiterDashboard").then((m: any) => ({ default: m.RecruiterDashboard || m.default })));
const JobDetailPage = lazy(() => import("../pages/recruiter/JobDetailPage").then((m: any) => ({ default: m.JobDetailPage || m.default })));
const ShortlistsPage = lazy(() => import("../pages/recruiter/ShortlistsPage").then((m: any) => ({ default: m.ShortlistsPage || m.default })));
const RecruiterCandidatesPage = lazy(() => import("../pages/recruiter/RecruiterCandidatesPage").then((m: any) => ({ default: m.RecruiterCandidatesPage || m.default })));
const RecruiterCandidateDetailPage = lazy(() => import("../pages/recruiter/RecruiterCandidateDetailPage").then((m: any) => ({ default: m.RecruiterCandidateDetailPage || m.default })));
const ActionCenterPage = lazy(() => import("../pages/recruiter/ActionCenterPage").then((m: any) => ({ default: m.ActionCenterPage || m.default })));
const ShortlistSubmissionPage = lazy(() => import("../pages/recruiter/ShortlistSubmissionPage").then((m: any) => ({ default: m.ShortlistSubmissionPage || m.default })));
const RecruiterOfferPage = lazy(() => import("../pages/recruiter/RecruiterOfferPage").then((m: any) => ({ default: m.RecruiterOfferPage || m.default })));

// ── Lazy-loaded Candidate Pages ──────────────────────────────────────────────
const CandidateDashboard = lazy(() => import("../pages/candidate/CandidateDashboard").then((m: any) => ({ default: m.CandidateDashboard || m.default })));
const CandidateProfilePage = lazy(() => import("../pages/candidate/CandidateProfilePage").then((m: any) => ({ default: m.CandidateProfilePage || m.default })));
const CandidateSkillsPage = lazy(() => import("../pages/candidate/CandidateSkillsPage").then((m: any) => ({ default: m.CandidateSkillsPage || m.default })));
const CandidateHiringPage = lazy(() => import("../pages/candidate/CandidateHiringPage").then((m: any) => ({ default: m.CandidateHiringPage || m.default })));

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
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
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="users/:id" element={<AdminUserDetailPage />} />
        <Route path="skills" element={<SkillsPage />} />
        <Route path="jobs/:id" element={<JobDetailPage />} />
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
        <Route path="dashboard" element={<HRDashboard />} />
        <Route path="interviews" element={<HRDashboard />} />
        <Route path="decisions" element={<HRDecisionDashboard />} />
        <Route path="jobs/create" element={<HRCreateJobPage />} />
        <Route path="jobs/:id/matches" element={<HRJobMatchesPage />} />
        <Route path="candidates/:matchId/review" element={<HMCandidateReviewPage />} />
        <Route path="interviews/:matchId/feedback" element={<HMFeedbackPage />} />
        <Route path="applications/:id/timeline" element={<ApplicationTimelinePage />} />
        <Route path="shortlists" element={<HRShortlistsPage />} />
        <Route path="pipeline" element={<Navigate to="/hr" replace />} />
        <Route path="offers/:offerId" element={<HMOfferReviewPage />} />
      </Route>

      {/* Recruiter Protected Routes */}
      <Route
        path="/recruiter"
        element={
          <ProtectedRoute allowedRoles={["Recruiter", "Admin"]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<RecruiterDashboard />} />
        <Route path="dashboard" element={<RecruiterDashboard />} />
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
        <Route path="dashboard" element={<CandidateDashboard />} />
        <Route path="hiring" element={<CandidateHiringPage />} />
        <Route path="profile" element={<CandidateProfilePage />} />
        <Route path="skills" element={<CandidateSkillsPage />} />
        <Route path="offers/:id" element={<CandidateOfferPage />} />
        <Route path="applications/:id/timeline" element={<ApplicationTimelinePage />} />
      </Route>

      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
};
export default AppRoutes;
