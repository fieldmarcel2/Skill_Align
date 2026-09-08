import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  User,
  Mail,
  Phone,
  Briefcase,
  FileText,
  Calendar,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import { workflowApi, matchingApi, resumeApi, usersApi } from "../../services/api";
import { MatchResult, PipelineState } from "../../types";
import PipelineStateBar from "../../components/workflow/PipelineStateBar";
import MatchExplanationCard from "../../components/workflow/MatchExplanationCard";
import CandidateTimeline from "../../components/workflow/CandidateTimeline";
import SlotPicker, { SlotItem } from "../../components/workflow/SlotPicker";

export const HMCandidateReviewPage: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();

  const [match, setMatch] = useState<MatchResult | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals / Actions
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>("");

  const [showInterviewModal, setShowInterviewModal] = useState<boolean>(false);
  const [interviewType, setInterviewType] = useState<string>("technical");
  const [meetingLink, setMeetingLink] = useState<string>("");
  const [proposedSlots, setProposedSlots] = useState<SlotItem[]>([
    { id: "1", slot_datetime: "", duration_minutes: 45 },
    { id: "2", slot_datetime: "", duration_minutes: 45 },
  ]);

  const mid = parseInt(matchId || "0", 10);

  const fetchData = async () => {
    if (!mid) return;
    setLoading(true);
    setError(null);
    try {
      const matchData = await matchingApi.getMatchById(mid);
      setMatch(matchData);

      try {
        const timelineData = await workflowApi.getTimeline(mid);
        setTimeline(timelineData);
      } catch {
        // timeline might be empty or permissions
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load candidate application.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [mid]);

  // Handle HM mark in review
  const handleMarkInReview = async () => {
    setActionLoading(true);
    try {
      await workflowApi.hmReview(mid);
      setSuccessMsg("Application status updated to In HM Review.");
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to update review status.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle HM Reject
  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setError("Please provide a reason for rejecting this candidate.");
      return;
    }
    setActionLoading(true);
    try {
      await workflowApi.hmReject(mid, rejectReason);
      setShowRejectModal(false);
      setSuccessMsg("Candidate rejected and removed from active pipeline.");
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to reject candidate.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle HM Request Interview with >= 2 slots
  const handleRequestInterview = async () => {
    const validSlots = proposedSlots.filter((s) => s.slot_datetime);
    if (validSlots.length < 2) {
      setError("You must propose at least 2 interview time slots.");
      return;
    }

    setActionLoading(true);
    setError(null);
    try {
      const payloadSlots = validSlots.map((s) => {
        const start = new Date(s.slot_datetime);
        const end = new Date(start.getTime() + s.duration_minutes * 60000);
        return {
          slot_datetime: start.toISOString(),
          slot_end_datetime: end.toISOString(),
        };
      });

      await workflowApi.requestInterview(mid, {
        slots: payloadSlots,
        interview_type: interviewType,
        meeting_link: meetingLink || undefined,
      });

      setShowInterviewModal(false);
      setSuccessMsg("Interview requested successfully with proposed slots! Recruiter will forward them to candidate.");
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to submit interview request.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="p-8 text-center text-slate-400">
        <AlertCircle className="w-8 h-8 mx-auto text-rose-500 mb-2" />
        <p>Application not found.</p>
        <button
          onClick={() => navigate("/hr/dashboard")}
          className="mt-4 px-4 py-2 bg-slate-800 rounded-lg text-xs text-white"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const pipelineState = match.pipeline_state || "SENT_TO_HIRING_MANAGER";
  const candidate = match.candidate;
  const job = match.job;

  const canReview = pipelineState === "SENT_TO_HIRING_MANAGER";
  const canDecide = ["SENT_TO_HIRING_MANAGER", "HIRING_MANAGER_REVIEW"].includes(pipelineState);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/hr/dashboard"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to HM Dashboard
        </Link>

        {/* Quick Action Buttons */}
        {canDecide && (
          <div className="flex items-center gap-3">
            {canReview && (
              <button
                type="button"
                onClick={handleMarkInReview}
                disabled={actionLoading}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
              >
                Mark as In Review
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowRejectModal(true)}
              disabled={actionLoading}
              className="px-3.5 py-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 text-xs font-semibold border border-rose-500/30 transition-colors"
            >
              Reject Candidate
            </button>
            <button
              type="button"
              onClick={() => setShowInterviewModal(true)}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/25 transition-all"
            >
              <Calendar className="w-3.5 h-3.5" />
              Request Interview & Propose Slots
            </button>
          </div>
        )}
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">✕</button>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Pipeline State Bar */}
      <PipelineStateBar currentState={pipelineState as PipelineState} />

      {/* Main Grid: Profile & Scorecard on Left, Recruiter Notes & Timeline on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Candidate Profile & Match Scorecard */}
        <div className="lg:col-span-2 space-y-6">
          {/* Candidate Profile Summary Header */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 sm:p-6 space-y-4 shadow-lg shadow-black/20">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
                  {candidate.full_name?.charAt(0) || "C"}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{candidate.full_name}</h2>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-cyan-400" />
                    Applying for: <span className="text-cyan-300 font-semibold">{job?.title}</span>
                  </p>
                </div>
              </div>

              {candidate.resume_file_path && (
                <a
                  href={`/api/candidates/${candidate.id}/resume`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  View Resume
                </a>
              )}
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800 text-xs">
              <div>
                <span className="text-slate-500 block">Experience</span>
                <span className="text-slate-200 font-semibold">
                  {candidate.total_experience_years || 0} Years
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Location</span>
                <span className="text-slate-200 font-semibold">
                  {candidate.city || candidate.address || "Not specified"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Work Mode Pref</span>
                <span className="text-slate-200 font-semibold">
                  {candidate.preferred_work_mode || "Any"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Notice Period</span>
                <span className="text-slate-200 font-semibold">
                  {candidate.notice_period || "Immediate"}
                </span>
              </div>
            </div>

            {/* Recruiter Shortlist Note */}
            {match.shortlist_note && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-200">
                <span className="font-bold flex items-center gap-1.5 text-amber-400 mb-1">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Recruiter Shortlist Notes:
                </span>
                <p className="whitespace-pre-line">{match.shortlist_note}</p>
              </div>
            )}
          </div>

          {/* AI Match Explanation Card */}
          <MatchExplanationCard
            score={Number(match.overall_score)}
            matchedSkills={match.matched_skills}
            missingSkills={match.missing_skills}
            skillBreakdown={match.skill_breakdown}
            candidateExperience={Number(candidate.total_experience_years || 0)}
            requiredExperience={Number(job?.min_experience_years || 0)}
            meetsExperience={match.meets_experience}
            explanation={match.explanation}
          />
        </div>

        {/* Right Column (1 Col): Application Timeline & Actions */}
        <div className="space-y-6">
          {/* Review Actions Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              Hiring Manager Action
            </h4>

            {canDecide ? (
              <div className="space-y-2.5">
                <p className="text-xs text-slate-400">
                  Evaluate this candidate and proceed to propose interview time slots or reject.
                </p>
                <button
                  type="button"
                  onClick={() => setShowInterviewModal(true)}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/20 transition-all"
                >
                  <Calendar className="w-4 h-4" />
                  Request Interview (Propose Slots)
                </button>
                <button
                  type="button"
                  onClick={() => setShowRejectModal(true)}
                  disabled={actionLoading}
                  className="w-full py-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-colors"
                >
                  Reject Candidate
                </button>
              </div>
            ) : (
              <div className="text-xs text-slate-400 p-3 rounded-lg bg-slate-950/40 border border-slate-800">
                Current State: <span className="text-white font-semibold">{pipelineState}</span>.
                {pipelineState === "WAITING_FOR_HM_FEEDBACK" && (
                  <div className="mt-2">
                    <Link
                      to={`/hr/interviews/${mid}/feedback`}
                      className="inline-block w-full text-center py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold"
                    >
                      Submit GO / NO-GO Feedback
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Chronological Audit Timeline */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              Lifecycle Audit Trail
            </h4>
            <CandidateTimeline timeline={timeline} />
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400 font-bold">
              <XCircle className="w-5 h-5" />
              <h3>Reject Candidate</h3>
            </div>
            <p className="text-xs text-slate-400">
              Provide a clear reason for rejecting <strong className="text-white">{candidate.full_name}</strong>.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="E.g., Missing essential backend concurrency experience..."
              rows={3}
              className="w-full p-3 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500"
              required
            />
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={actionLoading}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                {actionLoading ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Interview & Propose Slots Modal */}
      {showInterviewModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-2xl w-full space-y-5 my-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-bold">
                <Calendar className="w-5 h-5 text-cyan-400" />
                <h3>Request Interview for {candidate.full_name}</h3>
              </div>
              <button
                onClick={() => setShowInterviewModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {/* Type & Meeting Link */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Interview Type</label>
                <select
                  value={interviewType}
                  onChange={(e) => setInterviewType(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white focus:border-cyan-500"
                >
                  <option value="technical">Technical Round</option>
                  <option value="managerial">Hiring Manager Round</option>
                  <option value="system_design">System Design Round</option>
                  <option value="screening">Initial Screening</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Meeting Link (Google Meet / Teams / Zoom)</label>
                <input
                  type="url"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  placeholder="https://meet.google.com/xyz-abc"
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white focus:border-cyan-500 font-mono text-xs"
                />
              </div>
            </div>

            {/* Slot Picker Component (enforces >= 2 slots) */}
            <SlotPicker
              slots={proposedSlots}
              onChange={setProposedSlots}
              minSlots={2}
            />

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowInterviewModal(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRequestInterview}
                disabled={actionLoading || proposedSlots.filter((s) => s.slot_datetime).length < 2}
                className="flex items-center gap-2 px-6 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/20 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                {actionLoading ? "Submitting..." : "Submit Slots to Recruiter"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default HMCandidateReviewPage;
