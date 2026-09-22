import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
  MapPin,
  Laptop,
} from "lucide-react";
import { workflowApi, matchingApi } from "../../services/api";
import { MatchResult, PipelineState } from "../../types";
import PipelineStateBar from "../../components/workflow/PipelineStateBar";
import MatchExplanationCard from "../../components/workflow/MatchExplanationCard";
import CandidateTimeline from "../../components/workflow/CandidateTimeline";
import SlotPicker, { SlotItem } from "../../components/workflow/SlotPicker";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent } from "../../components/ui/card";

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

  // Handle HM Request Interview & propose slots
  const handleRequestInterview = async () => {
    const validSlots = proposedSlots.filter((s) => s.slot_datetime && s.slot_datetime.trim() !== "");
    if (validSlots.length < 2) {
      setError("Please specify at least 2 distinct interview time slots for candidate selection.");
      return;
    }

    setActionLoading(true);
    try {
      await workflowApi.requestInterview(mid, {
        slots: validSlots.map((s) => ({
          slot_datetime: new Date(s.slot_datetime).toISOString(),
          slot_end_datetime: new Date(
            new Date(s.slot_datetime).getTime() + (s.duration_minutes || 45) * 60000
          ).toISOString(),
        })),
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
        <div className="w-9 h-9 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="p-12 text-center text-muted-foreground bg-card border border-border/80 rounded-2xl shadow-sm max-w-lg mx-auto my-12">
        <AlertCircle className="w-10 h-10 mx-auto text-rose-500 mb-3" />
        <h3 className="text-lg font-bold font-outfit text-foreground">Application Not Found</h3>
        <p className="text-xs text-muted-foreground mt-1">The requested candidate requisition record does not exist or has been archived.</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/hr/dashboard")}
          className="mt-5 text-xs font-semibold"
        >
          Return to Dashboard
        </Button>
      </div>
    );
  }

  const pipelineState = match.pipeline_state || "SENT_TO_HIRING_MANAGER";
  const candidate = match.candidate;
  const job = match.job;

  const canReview = pipelineState === "SENT_TO_HIRING_MANAGER";
  const canDecide = ["SENT_TO_HIRING_MANAGER", "HIRING_MANAGER_REVIEW"].includes(pipelineState);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="max-w-6xl mx-auto space-y-6 pb-16"
    >
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/hr/dashboard"
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Hiring Manager Requisitions</span>
          <span className="opacity-40">/</span>
          <span className="text-foreground font-bold">{candidate.full_name}</span>
        </Link>

        {/* Quick Action Buttons */}
        {canDecide && (
          <div className="flex items-center gap-2.5 flex-wrap">
            {canReview && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleMarkInReview}
                disabled={actionLoading}
                className="text-xs font-semibold"
              >
                Mark as In Review
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowRejectModal(true)}
              disabled={actionLoading}
              className="text-xs font-semibold text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
            >
              Reject Candidate
            </Button>
            <Button
              type="button"
              variant="gradient"
              size="sm"
              onClick={() => setShowInterviewModal(true)}
              disabled={actionLoading}
              className="gap-1.5 text-xs font-bold shadow-md shadow-indigo-500/20"
            >
              <Calendar className="w-3.5 h-3.5" />
              Request Interview & Propose Slots
            </Button>
          </div>
        )}
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-center justify-between shadow-xs">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            {error}
          </span>
          <button onClick={() => setError(null)} className="text-rose-700 dark:text-rose-400 hover:opacity-75 cursor-pointer font-bold ml-2">✕</button>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center justify-between shadow-xs">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            {successMsg}
          </span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 dark:text-emerald-400 hover:opacity-75 cursor-pointer font-bold ml-2">✕</button>
        </div>
      )}

      {/* Pipeline State Bar */}
      <PipelineStateBar currentState={pipelineState as PipelineState} />

      {/* Main Grid: Profile & Scorecard on Left, Recruiter Notes & Timeline on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Candidate Profile & Match Scorecard */}
        <div className="lg:col-span-2 space-y-6">
          {/* Candidate Profile Summary Header Card */}
          <Card className="border-border/80 bg-card/80 backdrop-blur-xl shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-5 sm:p-6 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-violet-600 text-primary-foreground font-bold text-xl flex items-center justify-center shadow-md">
                    {candidate.full_name?.charAt(0) || "C"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold font-outfit text-foreground">{candidate.full_name}</h2>
                      <Badge variant="secondary" className="text-[10px] font-mono">
                        ID #{candidate.id}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-primary" />
                      Applied Position: <span className="text-foreground font-semibold">{job?.title}</span>
                    </p>
                  </div>
                </div>

                {candidate.resume_file_path && (
                  <a
                    href={`/api/candidates/${candidate.id}/resume`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold">
                      <FileText className="w-3.5 h-3.5 text-primary" />
                      Download Resume
                    </Button>
                  </a>
                )}
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border/60 text-xs">
                <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Total Experience</span>
                  <span className="text-sm font-bold font-outfit text-foreground mt-0.5 block">
                    {candidate.total_experience_years || 0} Years
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Location</span>
                  <span className="text-sm font-bold font-outfit text-foreground mt-0.5 block truncate" title={candidate.city || candidate.address || "Not specified"}>
                    {candidate.city || candidate.address || "Not specified"}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Work Preference</span>
                  <span className="text-sm font-bold font-outfit text-foreground mt-0.5 block">
                    {candidate.preferred_work_mode || "Flexible"}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Notice Period</span>
                  <span className="text-sm font-bold font-outfit text-foreground mt-0.5 block">
                    {candidate.notice_period || "Immediate"}
                  </span>
                </div>
              </div>

              {/* Recruiter Shortlist Note */}
              {match.shortlist_note && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                  <span className="font-bold flex items-center gap-1.5 text-amber-700 dark:text-amber-400 text-xs uppercase tracking-wide">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Recruiter Shortlist Note:
                  </span>
                  <p className="whitespace-pre-line text-foreground/90">{match.shortlist_note}</p>
                </div>
              )}
            </CardContent>
          </Card>

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
          <Card className="border-border/80 bg-card/80 backdrop-blur-xl shadow-sm rounded-2xl">
            <CardContent className="p-5 space-y-4">
              <h4 className="text-sm font-bold font-outfit text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Hiring Manager Review Decisions
              </h4>

              {canDecide ? (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Evaluate this profile against role expectations. You can request multi-slot interview schedules or release the candidate.
                  </p>
                  <Button
                    type="button"
                    variant="gradient"
                    onClick={() => setShowInterviewModal(true)}
                    disabled={actionLoading}
                    className="w-full gap-2 text-xs font-bold shadow-md shadow-indigo-500/20"
                  >
                    <Calendar className="w-4 h-4" />
                    Request Interview (Propose Slots)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowRejectModal(true)}
                    disabled={actionLoading}
                    className="w-full text-xs font-semibold text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                  >
                    Reject Candidate
                  </Button>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-2">
                  <div>
                    Current State: <span className="text-foreground font-bold">{pipelineState.replace(/_/g, " ")}</span>
                  </div>
                  {pipelineState === "WAITING_FOR_HM_FEEDBACK" && (
                    <Link
                      to={`/hr/interviews/${mid}/feedback`}
                      className="block w-full"
                    >
                      <Button variant="gradient" size="sm" className="w-full text-xs font-bold mt-1">
                        Submit GO / NO-GO Feedback
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chronological Audit Timeline */}
          <Card className="border-border/80 bg-card/80 backdrop-blur-xl shadow-sm rounded-2xl">
            <CardContent className="p-5 space-y-4">
              <h4 className="text-sm font-bold font-outfit text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Requisition Audit Trail
              </h4>
              <CandidateTimeline timeline={timeline} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border/80 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl"
          >
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold">
              <XCircle className="w-5 h-5 text-rose-500" />
              <h3 className="font-outfit text-base">Reject Candidate Application</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Please specify the decision rationale for declining <strong className="text-foreground">{candidate.full_name}</strong>. This note will be recorded in the audit history.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="E.g., Insufficient cloud microservices architecture experience for senior level..."
              rows={3}
              className="w-full p-3 bg-muted/30 border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              required
            />
            <div className="flex justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowRejectModal(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleReject}
                disabled={actionLoading}
                className="text-xs font-bold"
              >
                {actionLoading ? "Rejecting..." : "Confirm Rejection"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Request Interview & Propose Slots Modal */}
      {showInterviewModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border/80 rounded-2xl p-6 max-w-2xl w-full space-y-5 my-8 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2 text-foreground font-bold">
                <Calendar className="w-5 h-5 text-primary" />
                <h3 className="font-outfit text-base">Request Interview · {candidate.full_name}</h3>
              </div>
              <button
                onClick={() => setShowInterviewModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Type & Meeting Link */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="block text-foreground font-semibold">Interview Format / Type</label>
                <select
                  value={interviewType}
                  onChange={(e) => setInterviewType(e.target.value)}
                  className="w-full p-2.5 bg-muted/30 border border-border rounded-xl text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="technical">Technical Assessment Round</option>
                  <option value="managerial">Hiring Manager Deep Dive</option>
                  <option value="system_design">System Architecture Round</option>
                  <option value="cultural">Culture & Values Fit</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-foreground font-semibold">Meeting URL (Google Meet / Teams)</label>
                <input
                  type="url"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  placeholder="https://meet.google.com/xyz-abc"
                  className="w-full p-2.5 bg-muted/30 border border-border rounded-xl text-foreground text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring"
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
            <div className="flex justify-end gap-2.5 pt-3 border-t border-border/60">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowInterviewModal(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="gradient"
                size="sm"
                onClick={handleRequestInterview}
                disabled={actionLoading || proposedSlots.filter((s) => s.slot_datetime).length < 2}
                className="gap-2 text-xs font-bold shadow-md shadow-indigo-500/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                {actionLoading ? "Submitting..." : "Submit Slots to Recruiter"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};
export default HMCandidateReviewPage;
