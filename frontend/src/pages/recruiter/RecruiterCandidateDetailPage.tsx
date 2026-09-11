import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  UserCheck,
  CheckCircle2,
  XCircle,
  FileText,
  FileCheck,
  Clock,
  MapPin,
  Briefcase,
  Sparkles,
  ShieldCheck,
  Quote,
  MessageSquare,
  Send,
  Lock,
  ListTodo,
  Download,
  AlertCircle,
  User,
  GraduationCap,
  ExternalLink,
  ChevronRight,
  Info,
  Video,
  Calendar,
  Copy,
  Check,
  RefreshCw,
  Search,
  Bot,
  Layers,
  DollarSign,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { recruiterApi, matchingApi, communicationApi, tasksApi, resumeApi, workflowApi, offerApi } from "../../services/api";
import { MatchResult, RecruitmentMessage, RecruitmentTask, PipelineState, AuditLogEntry } from "../../types";
import { cn } from "../../lib/utils";
import PipelineStateBar from "../../components/workflow/PipelineStateBar";
import CandidateTimeline from "../../components/workflow/CandidateTimeline";
import InterviewerEvaluationModal from "../../components/workflow/InterviewerEvaluationModal";
import InterviewerEvaluationDisplayCard from "../../components/workflow/InterviewerEvaluationDisplayCard";
import { MultiRoundInterviewSection } from "../../components/workflow/MultiRoundInterviewSection";
import { InterviewWithSlots, Offer } from "../../types";

export const RecruiterCandidateDetailPage: React.FC = () => {
  const { jobId, candidateId } = useParams<{ jobId: string; candidateId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const numJobId = Number(jobId);
  const numCandidateId = Number(candidateId);

  const [match, setMatch] = useState<MatchResult | null>(null);
  const [messages, setMessages] = useState<RecruitmentMessage[]>([]);
  const [tasks, setTasks] = useState<RecruitmentTask[]>([]);
  const [timeline, setTimeline] = useState<AuditLogEntry[]>([]);
  const [activeInterviewDetails, setActiveInterviewDetails] = useState<InterviewWithSlots | null>(null);
  const [interviewRounds, setInterviewRounds] = useState<InterviewWithSlots[]>([]);
  const [candidateOffer, setCandidateOffer] = useState<Offer | null>(null);
  const [showInterviewerEvalModal, setShowInterviewerEvalModal] = useState<boolean>(false);
  const [isEditingEvaluation, setIsEditingEvaluation] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workflowSuccess, setWorkflowSuccess] = useState<string | null>(null);

  // Gemini AI Analysis state
  const [aiAnalysis, setAiAnalysis] = useState<{
    semantic_fit_score?: number;
    ai_summary?: string;
    key_strengths?: string[];
    skill_gaps?: string[];
    suggested_interview_questions?: string[];
  } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // UI state
  const [copiedLink, setCopiedLink] = useState(false);
  const [skillFilter, setSkillFilter] = useState<"all" | "verified" | "missing">("all");
  const [resumeSkillSearch, setResumeSkillSearch] = useState("");

  // Communication state
  const [newMessage, setNewMessage] = useState("");
  const [messageType, setMessageType] = useState("SCREENING_NOTE");
  const [isPrivate, setIsPrivate] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"evidence" | "resume" | "notes" | "tasks" | "timeline">("evidence");

  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [numJobId, numCandidateId]);

  const loadData = async () => {
    if (!numCandidateId) return;
    try {
      setLoading(true);
      setError(null);

      let matchRes: MatchResult;
      let actualJobId = numJobId;
      let actualCandidateId = numCandidateId;

      if (numJobId && numCandidateId) {
        matchRes = await recruiterApi.getCandidateDetail(numJobId, numCandidateId);
      } else {
        matchRes = await matchingApi.getMatchById(numCandidateId);
        actualJobId = matchRes.job_id;
        actualCandidateId = matchRes.candidate_id;
      }

      const [msgRes, taskRes] = await Promise.all([
        communicationApi.listCandidateMessages(actualJobId, actualCandidateId).catch(() => []),
        tasksApi.getJobTasks(actualJobId, actualCandidateId).catch(() => []),
      ]);

      setMatch(matchRes);
      setMessages(msgRes);
      setTasks(taskRes);

      // Load timeline, interview details, and offer
      if (matchRes?.id) {
        try {
          const tRes = await workflowApi.getTimeline(matchRes.id);
          setTimeline(tRes);
        } catch {
          // timeline
        }
        try {
          const roundsRes = await workflowApi.getMatchInterviews(matchRes.id);
          setInterviewRounds(roundsRes);
          if (roundsRes.length > 0) {
            setActiveInterviewDetails(roundsRes[roundsRes.length - 1]);
          }
        } catch {
          try {
            const intRes = await workflowApi.getInterviewDetails(matchRes.id);
            setActiveInterviewDetails(intRes);
            if (intRes) setInterviewRounds([intRes]);
          } catch {
            // no active interview
          }
        }
        try {
          const offRes = await offerApi.getOfferByMatch(matchRes.id);
          setCandidateOffer(offRes);
        } catch {
          // no offer yet
        }
      }

      // Trigger Gemini AI analysis
      if (matchRes?.id) {
        loadAiAnalysis(matchRes.id);
      }

      // Attempt to load resume download url if available
      try {
        const rUrl = await resumeApi.getUrl(numCandidateId);
        if (rUrl?.resume_url) setResumeUrl(rUrl.resume_url);
      } catch (err) {
        // Resume download might not be generated yet, silent fallback
      }
    } catch (err: any) {
      console.error("Failed to load candidate details:", err);
      setError(err?.response?.data?.detail || "Failed to load candidate review context.");
    } finally {
      setLoading(false);
    }
  };

  const loadAiAnalysis = async (matchId: number) => {
    try {
      setAiLoading(true);
      const res = await matchingApi.getAiAnalysis(matchId);
      setAiAnalysis(res);
    } catch (err) {
      console.warn("Could not load AI fit analysis:", err);
    } finally {
      setAiLoading(false);
    }
  };

  // Claim candidate ("Assign to Me")
  const handleClaim = async () => {
    if (!match) return;
    try {
      setActionLoading(true);
      await recruiterApi.claimCandidate(numJobId, numCandidateId);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Could not claim candidate.");
    } finally {
      setActionLoading(false);
    }
  };

  // Unassign candidate
  const handleUnassign = async () => {
    if (!match || !window.confirm("Release this candidate back to the unassigned queue?")) return;
    try {
      setActionLoading(true);
      await recruiterApi.unassignCandidate(numJobId, numCandidateId);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Could not unassign candidate.");
    } finally {
      setActionLoading(false);
    }
  };

  // Update pipeline status
  const handleStatusTransition = async (newStatus: "screened" | "approved_by_hr" | "rejected") => {
    if (!match) return;
    try {
      setActionLoading(true);
      await matchingApi.updateStatus(match.id, newStatus);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to update candidate status.");
    } finally {
      setActionLoading(false);
    }
  };

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !numJobId || !numCandidateId) return;
    try {
      setSendingMessage(true);
      const sent = await communicationApi.sendCandidateMessage(numJobId, numCandidateId, {
        message: newMessage.trim(),
        message_type: messageType,
        is_private: isPrivate,
      });
      setMessages((prev) => [...prev, sent]);
      setNewMessage("");
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to post message.");
    } finally {
      setSendingMessage(false);
    }
  };

  // Update task status
  const handleTaskStatus = async (taskId: number, newStatus: string) => {
    try {
      await tasksApi.updateTask(taskId, { status: newStatus });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to update task status.");
    }
  };

  const handleCopyMeetingLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSendSlots = async () => {
    if (!match?.id) return;
    setActionLoading(true);
    setError(null);
    setWorkflowSuccess(null);
    try {
      await workflowApi.sendSlotsToCandidate(match.id);
      setWorkflowSuccess("Interview slots sent to candidate via email!");
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to send interview slots.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmInterview = async () => {
    if (!match?.id) return;
    setActionLoading(true);
    setError(null);
    setWorkflowSuccess(null);
    try {
      await workflowApi.confirmInterview(match.id);
      setWorkflowSuccess("Candidate's selected slot confirmed! Confirmation sent.");
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to confirm interview.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteInterview = () => {
    setIsEditingEvaluation(false);
    setShowInterviewerEvalModal(true);
  };

  const handleSaveEvaluation = async (ratings: {
    technical_rating: number;
    communication_rating: number;
    problem_solving_rating: number;
    role_fit_rating: number;
    overall_rating: number;
    comments?: string;
  }) => {
    if (!match?.id) return;
    setActionLoading(true);
    setError(null);
    setWorkflowSuccess(null);
    try {
      if (isEditingEvaluation) {
        await workflowApi.saveInterviewerEvaluation(match.id, ratings);
        setWorkflowSuccess("Competency evaluation ratings updated successfully!");
      } else {
        await workflowApi.completeInterview(match.id, ratings);
        setWorkflowSuccess("Interview completed & competency ratings recorded! Hiring Manager has been notified to provide GO/NO-GO feedback.");
      }
      setShowInterviewerEvalModal(false);
      setIsEditingEvaluation(false);
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to submit interviewer evaluation.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6 text-center">
          <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
          <h2 className="text-lg font-bold text-destructive mb-2">Access Denied or Not Found</h2>
          <p className="text-sm text-muted-foreground mb-4">{error || "Unable to load candidate details."}</p>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
        </div>
      </div>
    );
  }

  const candidate = match.candidate;
  const job = match.job;

  // Assignment status handling (supporting both 'claimed' and 'assigned')
  const isAssigned =
    (match.assignment_status === "claimed" || match.assignment_status === "assigned") &&
    Boolean(match.assigned_recruiter);
  const isClaimedByMe = isAssigned && match.assigned_recruiter?.id === user?.id;
  const isClaimedByOther = isAssigned && match.assigned_recruiter?.id !== user?.id;
  const isUnassigned = !isAssigned;

  // Normalize match score to 0-100 (resolving the 7400% bug)
  const rawScore = Number(match.overall_score) || 0;
  const scorePercent = Math.round(rawScore > 1 ? rawScore : rawScore * 100);

  // Scheduled interviews for this candidate
  const candidateInterviews = match.interviews || [];
  const latestInterview = candidateInterviews.length > 0 ? candidateInterviews[0] : null;

  // Pipeline stage flags to prevent conflicting interview/offer status indicators
  const isHiredOrAccepted =
    candidateOffer?.status === "ACCEPTED" ||
    match.pipeline_state === "HIRED" ||
    match.status === "hired";

  const isOfferPhase =
    [
      "COMPENSATION_DISCUSSION",
      "OFFER_CREATED",
      "OFFER_SENT",
      "OFFER_ACCEPTED",
      "HIRED",
    ].includes(match.pipeline_state || "") || Boolean(candidateOffer);

  // Filter skills
  const filteredSkills = (match.skill_breakdown || []).filter((sk) => {
    if (skillFilter === "verified") return sk.source === "resume" || Boolean(sk.evidence_text);
    if (skillFilter === "missing") return sk.skill_score === 0;
    return true;
  });

  // Filter resume detected skills
  const filteredResumeSkills = (match.resume_detected_skills || []).filter((sk) => {
    const name = (sk as any).name || (sk as any).skill_name || "";
    return name.toLowerCase().includes(resumeSkillSearch.toLowerCase());
  });

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 animate-in fade-in duration-300">
      {/* Top Breadcrumb & Back */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/recruiter" className="hover:text-primary transition-colors">
            Recruiter Dashboard
          </Link>
          <ChevronRight className="w-4 h-4" />
          {job ? (
            <Link to={`/recruiter?jobId=${job.id}`} className="hover:text-primary transition-colors">
              {job.title}
            </Link>
          ) : (
            <span>Job #{numJobId}</span>
          )}
          <ChevronRight className="w-4 h-4" />
          <span className="font-semibold text-foreground">{candidate?.full_name}</span>
        </div>

        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-xs font-medium text-muted-foreground hover:text-foreground transition shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Candidates
        </button>
      </div>

      {/* Workflow Notifications */}
      {workflowSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between shadow-sm">
          <span>{workflowSuccess}</span>
          <button onClick={() => setWorkflowSuccess(null)} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Interactive Pipeline State Machine */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
        {/* Basic state bar */}
        <PipelineStateBar currentState={(match.pipeline_state || "CANDIDATE_MATCHED") as PipelineState} />

        {/* Next valid state transitions + Action Center link */}
        {(() => {
          const stateTransitions: Record<string, { label: string; color: string; desc: string }[]> = {
            CANDIDATE_MATCHED:         [{ label: "→ Shortlist", color: "border-blue-500/40 text-blue-300 bg-blue-500/10", desc: "Shortlist this candidate" }],
            CANDIDATE_SHORTLISTED:     [{ label: "→ Submit to HM", color: "border-sky-500/40 text-sky-300 bg-sky-500/10", desc: "Send to Hiring Manager" }],
            INTERVIEW_SLOTS_PROPOSED:  [{ label: "→ Send Slots to Candidate", color: "border-cyan-500/40 text-cyan-300 bg-cyan-500/10", desc: "Recruiter action in Action Center" }],
            CANDIDATE_SLOT_SELECTED:   [{ label: "→ Confirm Interview", color: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10", desc: "Confirm selected slot" }],
            INTERVIEW_CONFIRMED:       [{ label: "→ Complete & Evaluate", color: "border-amber-500/40 text-amber-300 bg-amber-500/10", desc: "Rate competencies post-interview" }],
            INTERVIEW_GO:              [{ label: "→ Create Compensation Offer", color: "border-lime-500/40 text-lime-300 bg-lime-500/10", desc: "Draft and submit offer" }],
            OFFER_CREATED:             [{ label: "→ Send Offer Letter", color: "border-purple-500/40 text-purple-300 bg-purple-500/10", desc: "Send offer to candidate" }],
          };

          const currentTransitions = stateTransitions[match.pipeline_state || ""];
          const hasActionCenterTask = ["INTERVIEW_SLOTS_PROPOSED", "CANDIDATE_SLOT_SELECTED", "INTERVIEW_GO", "OFFER_CREATED"].includes(match.pipeline_state || "");

          if (!currentTransitions && !hasActionCenterTask) return null;

          return (
            <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center gap-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Next Actions:</span>
              {currentTransitions?.map((t) => (
                <span key={t.label} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${t.color}`} title={t.desc}>
                  {t.label}
                </span>
              ))}
              {hasActionCenterTask && (
                <Link
                  to="/recruiter/action-center"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-300 text-xs font-bold hover:bg-rose-500/20 transition-colors"
                >
                  ⚡ Execute in Action Center
                  <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          );
        })()}
      </div>

      {/* Main Candidate Header Card */}

      <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Left: Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                {candidate?.full_name}
              </h1>

              {/* Assignment Badge */}
              {isClaimedByMe ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  <UserCheck className="w-3.5 h-3.5" />
                  Assigned to You
                </span>
              ) : isClaimedByOther ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-secondary text-muted-foreground border border-border">
                  <User className="w-3.5 h-3.5" />
                  Claimed by {match.assigned_recruiter?.name}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Unassigned
                </span>
              )}

              {/* Pipeline Stage Badge */}
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                {match.pipeline_state || match.status.replace(/_/g, " ")}
              </span>
            </div>

            {/* Sub-meta details */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              {job && (
                <span className="flex items-center gap-1 text-foreground font-medium">
                  <Briefcase className="w-3.5 h-3.5 text-primary" />
                  {job.title}
                </span>
              )}
              {candidate?.total_experience_years !== undefined && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {candidate.total_experience_years} Years Experience
                </span>
              )}
              {(candidate?.city || candidate?.state) && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {[candidate.city, candidate.state, candidate.country].filter(Boolean).join(", ")}
                </span>
              )}
              {candidate?.education_degree && (
                <span className="flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5" />
                  {candidate.education_degree}
                </span>
              )}
            </div>
          </div>

          {/* Right: Match Score Gauge & Quick Actions */}
          <div className="flex items-center gap-4 self-stretch lg:self-auto justify-between lg:justify-end">
            <div className="flex items-center gap-3 pr-4 border-r border-border/80">
              <div
                className={cn(
                  "w-16 h-16 rounded-2xl border flex flex-col items-center justify-center p-2 shadow-sm",
                  scorePercent >= 80
                    ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/30"
                    : scorePercent >= 65
                    ? "text-sky-500 bg-sky-500/10 border-sky-500/30"
                    : scorePercent >= 50
                    ? "text-amber-500 bg-amber-500/10 border-amber-500/30"
                    : "text-rose-500 bg-rose-500/10 border-rose-500/30"
                )}
              >
                <span className="text-2xl font-black leading-none">{scorePercent}%</span>
                <span className="text-[10px] font-bold uppercase tracking-wider mt-1">Match</span>
              </div>
              <div className="text-xs text-muted-foreground leading-tight">
                <span className="font-semibold text-foreground block">Deterministic Match</span>
                Resume Evidence + Experience
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Enterprise Workflow Specific Actions */}
              {job && ["CANDIDATE_MATCHED", "CANDIDATE_SHORTLISTED"].includes(match.pipeline_state || "") && (
                <Link
                  to={`/recruiter/jobs/${job.id}/shortlist`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  Submit to HM
                </Link>
              )}

              {match.pipeline_state === "INTERVIEW_SLOTS_PROPOSED" && (
                <button
                  type="button"
                  onClick={handleSendSlots}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send Slots to Candidate
                </button>
              )}

              {match.pipeline_state === "CANDIDATE_SLOT_SELECTED" && (
                <button
                  type="button"
                  onClick={handleConfirmInterview}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Confirm Selected Slot
                </button>
              )}

              {match.pipeline_state === "INTERVIEW_CONFIRMED" && (
                <button
                  type="button"
                  onClick={handleCompleteInterview}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white transition shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Complete & Rate Competencies
                </button>
              )}

              {match.pipeline_state === "WAITING_FOR_HM_FEEDBACK" && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <Clock className="w-3.5 h-3.5" />
                  Awaiting HM Decision
                </span>
              )}

              {["INTERVIEW_GO", "COMPENSATION_DISCUSSION"].includes(match.pipeline_state || "") && (
                <Link
                  to={`/recruiter/offers/create?match_id=${match.id}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  Phase 2: Compensation
                </Link>
              )}

              {match.pipeline_state === "OFFER_CREATED" && (
                <Link
                  to={`/recruiter/offers/create?match_id=${match.id}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send Offer Letter
                </Link>
              )}

              <Link
                to={`/applications/${match.id}/timeline`}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground border border-border transition"
              >
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                Audit Log
              </Link>
              {isUnassigned ? (
                <button
                  type="button"
                  onClick={handleClaim}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
                >
                  <UserCheck className="w-4 h-4" />
                  Assign to Me
                </button>
              ) : isClaimedByMe ? (
                <>
                  {match.status === "matched" && (
                    <button
                      type="button"
                      onClick={() => handleStatusTransition("screened")}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Screen & Endorse
                    </button>
                  )}
                  {match.status === "screened" && (
                    <button
                      type="button"
                      onClick={() => handleStatusTransition("approved_by_hr")}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Recommend to HR
                    </button>
                  )}
                  {match.status !== "rejected" && (
                    <button
                      type="button"
                      onClick={() => handleStatusTransition("rejected")}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-secondary hover:bg-rose-500/10 text-rose-500 border border-border transition"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleUnassign}
                    disabled={actionLoading}
                    className="px-2.5 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground border border-border hover:bg-secondary transition"
                    title="Release claim back to pool"
                  >
                    Release Claim
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleClaim}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-secondary hover:bg-primary/10 text-foreground border border-border transition"
                  title="Claim ownership from another recruiter"
                >
                  <UserCheck className="w-3.5 h-3.5 text-primary" />
                  Take Ownership
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── SCHEDULED INTERVIEWS & VIDEO LINKS BANNER ────────────────────── */}
      {isHiredOrAccepted ? (
        <div className="relative overflow-hidden bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-foreground text-base">
                    Candidate Hired & Offer Formalized
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    HIRED • OFFER ACCEPTED
                  </span>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Candidate has successfully cleared all interview evaluation stages and accepted the official employment offer.</span>
                </p>
              </div>
            </div>

            {candidateOffer && (
              <Link
                to={`/recruiter/offers/${candidateOffer.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition shrink-0"
              >
                <FileCheck className="w-3.5 h-3.5" />
                View Finalized Offer
              </Link>
            )}
          </div>
        </div>
      ) : latestInterview && !isOfferPhase && (
        <div className="relative overflow-hidden bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-sky-500/10 border border-emerald-500/30 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-foreground text-base">
                    {latestInterview.status === "pending_slot"
                      ? `${latestInterview.interview_type || "Technical Interview"} Slot Selection Pending`
                      : `${latestInterview.interview_type || "Technical Interview"} Scheduled`}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    {latestInterview.status?.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  <span>
                    {latestInterview.interview_date
                      ? new Date(latestInterview.interview_date).toLocaleString([], {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Date TBD"}
                  </span>
                  {latestInterview.scheduler_name && (
                    <span className="text-muted-foreground/80">• Coordinated by {latestInterview.scheduler_name}</span>
                  )}
                </p>
              </div>
            </div>

            {/* Meeting Link Actions */}
            {latestInterview.meeting_link && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <a
                  href={latestInterview.meeting_link}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
                >
                  <Video className="w-3.5 h-3.5" />
                  Join Video Call
                  <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
                </a>

                <button
                  type="button"
                  onClick={() => handleCopyMeetingLink(latestInterview.meeting_link!)}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-card border border-border hover:bg-secondary text-foreground transition shadow-sm"
                  title="Copy meeting link to clipboard"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-500">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* HR Preparation Notes */}
          {latestInterview.feedback && (
            <div className="text-xs bg-card/60 backdrop-blur-sm border border-emerald-500/20 rounded-xl p-3 text-muted-foreground flex items-start gap-2">
              <Info className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <strong className="text-foreground">HR Coordinator Note:</strong> {latestInterview.feedback}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 21. CANDIDATE BLACKLIST / COOLDOWN ALERT ───────────────────── */}
      {match.is_blacklisted && (
        <div className="relative overflow-hidden bg-rose-500/10 border-2 border-rose-500/40 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-rose-400 text-sm">
              <AlertCircle className="w-5 h-5 text-rose-400" />
              Candidate Unavailable for Interview Consideration
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-500/20 text-rose-400 border border-rose-500/40">
              6-Month Cooldown
            </span>
          </div>
          <p className="text-xs text-foreground font-semibold">
            {match.blacklist_display_message || `Candidate unavailable for interview consideration until ${match.blacklisted_until}.`}
          </p>
          <p className="text-xs text-muted-foreground">
            Reason: {match.blacklist_reason || "Candidate declined formal offer. 6-month placement cooldown in effect."}
          </p>
        </div>
      )}

      {/* ── MULTI-ROUND INTERVIEW PROGRESSION & TIMELINE ─────────────────── */}
      {(interviewRounds.length > 0 || [
        "INTERVIEW_REQUESTED",
        "INTERVIEW_SLOTS_PROPOSED",
        "WAITING_FOR_CANDIDATE_SLOT",
        "CANDIDATE_SLOT_SELECTED",
        "INTERVIEW_CONFIRMED",
        "WAITING_FOR_HM_FEEDBACK",
        "COMPENSATION_DISCUSSION",
        "OFFER_CREATED",
        "OFFER_SENT",
        "OFFER_ACCEPTED",
        "HIRED",
      ].includes(match.pipeline_state || "")) && (
        <MultiRoundInterviewSection
          matchId={match.id}
          candidateName={match.candidate.full_name}
          rounds={interviewRounds}
          onRoundsUpdated={loadData}
          canManageRounds={!isHiredOrAccepted}
          isOfferPhase={isOfferPhase}
        />
      )}

      {/* ── INTERVIEWER COMPETENCY EVALUATION SCORECARD ─────────────────── */}
      {(activeInterviewDetails?.interviewer_overall_rating || match.pipeline_state === "WAITING_FOR_HM_FEEDBACK") && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Interviewer Competency Evaluation Scorecard
            </h3>
            {match.pipeline_state === "WAITING_FOR_HM_FEEDBACK" && (
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/30 font-semibold">
                Awaiting Hiring Manager GO / NO-GO Decision
              </span>
            )}
          </div>
          <InterviewerEvaluationDisplayCard
            interview={activeInterviewDetails || undefined}
            onEdit={() => {
              setIsEditingEvaluation(true);
              setShowInterviewerEvalModal(true);
            }}
          />
        </div>
      )}

      {/* ── 18. PHASE 2 — COMPENSATION & OFFER MANAGEMENT ───────────────── */}
      {["COMPENSATION_DISCUSSION", "OFFER_CREATED", "OFFER_SENT", "OFFER_ACCEPTED", "HIRED"].includes(match.pipeline_state || "") && (
        <div className="relative overflow-hidden bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-emerald-500/10 border-2 border-amber-500/30 rounded-2xl p-6 shadow-md space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-3">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-500 block">
                Section 18
              </span>
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-amber-500" />
                Phase 2 — Compensation & Offer Stage
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Recruiter manages this stage • Coordinated by {match.assigned_recruiter?.name || user?.name || "Assigned Recruiter"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                candidateOffer?.status === "ACCEPTED" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                candidateOffer?.status === "SENT" ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" :
                candidateOffer?.status === "REJECTED" ? "bg-rose-500/20 text-rose-400 border-rose-500/30" :
                "bg-amber-500/20 text-amber-400 border-amber-500/30"
              }`}>
                Offer Status: {candidateOffer?.status || "DRAFT"}
              </span>
              <Link
                to={`/recruiter/offers/create?match_id=${match.id}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white transition shadow-sm"
              >
                <FileCheck className="w-3.5 h-3.5" />
                {candidateOffer?.id ? "Edit / Send Offer" : "Draft Offer"}
              </Link>
            </div>
          </div>

          {/* 4 Core Pillars: Candidate, Job, Hiring Manager, Recruiter */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-card/80 border border-border">
              <span className="text-[11px] text-muted-foreground block font-medium">Candidate</span>
              <span className="font-bold text-foreground block truncate">{candidate?.full_name}</span>
              <span className="text-[10px] text-muted-foreground">{candidate?.total_experience_years || 0} yrs exp</span>
            </div>
            <div className="p-3 rounded-xl bg-card/80 border border-border">
              <span className="text-[11px] text-muted-foreground block font-medium">Job Requisition</span>
              <span className="font-bold text-foreground block truncate">{job?.title}</span>
              <span className="text-[10px] text-muted-foreground">{job?.department || "Engineering"}</span>
            </div>
            <div className="p-3 rounded-xl bg-card/80 border border-border">
              <span className="text-[11px] text-muted-foreground block font-medium">Hiring Manager</span>
              <span className="font-bold text-foreground block truncate">
                {match.hiring_manager_name || candidateOffer?.hiring_manager_name || "Assigned HM"}
              </span>
              <span className="text-[10px] text-emerald-500 font-semibold">GO Decision Recorded</span>
            </div>
            <div className="p-3 rounded-xl bg-card/80 border border-border">
              <span className="text-[11px] text-muted-foreground block font-medium">Managing Recruiter</span>
              <span className="font-bold text-foreground block truncate">
                {match.assigned_recruiter?.name || user?.name || "Assigned Recruiter"}
              </span>
              <span className="text-[10px] text-muted-foreground">Compensation Lead</span>
            </div>
          </div>

          {/* Compensation Highlights: Salary Band, Proposed Salary, Currency */}
          <div className="p-4 bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-transparent border border-amber-500/30 rounded-xl flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider block">
                Salary Band
              </span>
              <span className="text-lg sm:text-xl font-mono font-bold text-amber-500">
                {candidateOffer?.salary_currency === "INR" || !candidateOffer?.salary_currency ? "₹" : candidateOffer.salary_currency}{" "}
                {(candidateOffer?.salary_min || 600000).toLocaleString("en-IN")} –{" "}
                {candidateOffer?.salary_currency === "INR" || !candidateOffer?.salary_currency ? "₹" : candidateOffer.salary_currency}{" "}
                {(candidateOffer?.salary_max || 800000).toLocaleString("en-IN")}
              </span>
            </div>

            <div>
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider block">
                Proposed Salary
              </span>
              <span className="text-xl sm:text-2xl font-mono font-extrabold text-emerald-500">
                {candidateOffer?.salary_currency === "INR" || !candidateOffer?.salary_currency ? "₹" : candidateOffer.salary_currency}{" "}
                {(candidateOffer?.proposed_salary || 720000).toLocaleString("en-IN")}
              </span>
            </div>

            <div>
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider block">
                Currency
              </span>
              <span className="text-base font-bold text-foreground font-mono">
                {candidateOffer?.salary_currency || "INR"} (₹)
              </span>
            </div>
          </div>

          {/* Role Scope, Employment Type, Timeline, Location, Work Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
            <div className="sm:col-span-2 p-3 rounded-xl bg-card/80 border border-border">
              <span className="text-[11px] text-muted-foreground block font-medium">Role Scope</span>
              <span className="text-foreground leading-relaxed block font-medium mt-0.5">
                {candidateOffer?.role_scope || "Core engineering delivery, architecture implementation, and team mentoring."}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-card/80 border border-border">
              <span className="text-[11px] text-muted-foreground block font-medium">Employment Type</span>
              <span className="font-bold text-foreground block mt-0.5">
                {candidateOffer?.employment_type || "Full-time"}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-card/80 border border-border">
              <span className="text-[11px] text-muted-foreground block font-medium">Joining Timeline</span>
              <span className="font-bold text-foreground block mt-0.5">
                {candidateOffer?.joining_timeline || (candidateOffer?.joining_date ? new Date(candidateOffer.joining_date).toLocaleDateString() : "15 - 30 Days")}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-card/80 border border-border">
              <span className="text-[11px] text-muted-foreground block font-medium">Location & Mode</span>
              <span className="font-bold text-foreground block mt-0.5">
                {candidateOffer?.location || job?.location_city || "Bangalore"} ({candidateOffer?.work_mode || job?.work_mode || "Hybrid"})
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── AI CANDIDATE FIT & INSIGHTS ─────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-card via-card to-primary/[0.04] border border-primary/20 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-border/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-foreground text-base flex items-center gap-1.5">
                  AI Candidate Fit Analysis
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500 animate-pulse" />
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-primary/15 text-primary border border-primary/30 tracking-wider">
                  AI INSIGHTS
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Synthesized evaluation of resume text, candidate experience, and job requirements.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {aiAnalysis?.semantic_fit_score && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-xs font-bold text-primary">
                <span>Semantic Alignment:</span>
                <span className="text-sm font-black">{aiAnalysis.semantic_fit_score}%</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => match?.id && loadAiAnalysis(match.id)}
              disabled={aiLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-secondary text-xs font-semibold text-muted-foreground hover:text-foreground transition disabled:opacity-50"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", aiLoading && "animate-spin text-primary")} />
              {aiLoading ? "Analyzing..." : "Refresh AI"}
            </button>
          </div>
        </div>

        {aiLoading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-3 text-center">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary"></div>
            <p className="text-xs text-muted-foreground">
              AI is examining candidate evidence and synthesizing role alignment insights...
            </p>
          </div>
        ) : aiAnalysis ? (
          <div className="space-y-4">
            {/* Executive Summary */}
            {aiAnalysis.ai_summary && (
              <div className="p-4 rounded-xl bg-secondary/40 border border-border/80 text-xs leading-relaxed text-foreground space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary block">
                  Executive Candidate Summary
                </span>
                <p className="text-sm text-foreground/90 font-medium">{aiAnalysis.ai_summary}</p>
              </div>
            )}

            {/* Strengths & Skill Gaps Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Strengths */}
              {aiAnalysis.key_strengths && aiAnalysis.key_strengths.length > 0 && (
                <div className="p-4 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/20 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Key Candidate Strengths
                  </span>
                  <ul className="space-y-1.5">
                    {aiAnalysis.key_strengths.map((str, idx) => (
                      <li key={idx} className="text-xs text-foreground/90 flex items-start gap-2">
                        <span className="text-emerald-500 font-bold">•</span>
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Gaps / Verification Areas */}
              {aiAnalysis.skill_gaps && aiAnalysis.skill_gaps.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-500/[0.04] border border-amber-500/20 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" /> Verification Areas & Gaps
                  </span>
                  <ul className="space-y-1.5">
                    {aiAnalysis.skill_gaps.map((gap, idx) => (
                      <li key={idx} className="text-xs text-foreground/90 flex items-start gap-2">
                        <span className="text-amber-500 font-bold">•</span>
                        <span>{gap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border gap-6">
        <button
          onClick={() => setActiveTab("evidence")}
          className={cn(
            "pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2",
            activeTab === "evidence"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Quote className="w-4 h-4" />
          Resume Evidence & Skill Breakdown
        </button>

        <button
          onClick={() => setActiveTab("resume")}
          className={cn(
            "pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2",
            activeTab === "resume"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <FileText className="w-4 h-4" />
          Extracted Resume & Timeline
        </button>

        <button
          onClick={() => setActiveTab("notes")}
          className={cn(
            "pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2",
            activeTab === "notes"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <MessageSquare className="w-4 h-4" />
          Job Collaboration Notes ({messages.length})
        </button>

        <button
          onClick={() => setActiveTab("tasks")}
          className={cn(
            "pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2",
            activeTab === "tasks"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <ListTodo className="w-4 h-4" />
          Assigned Tasks ({tasks.length})
        </button>

        <button
          onClick={() => setActiveTab("timeline")}
          className={cn(
            "pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2",
            activeTab === "timeline"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Clock className="w-4 h-4" />
          Lifecycle Audit Log ({timeline.length})
        </button>
      </div>

      {/* TAB CONTENT: Evidence & Skill Breakdown */}
      {activeTab === "evidence" && (
        <div className="space-y-6">
          {/* Evidence Philosophy Banner */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground space-y-1">
              <span className="font-bold text-foreground block">
                Evidence-Based Verification Philosophy:
              </span>
              <p>
                Skills detected directly in the resume text are awarded higher credibility (80%–100% factor)
                as <strong className="text-emerald-500 font-semibold">Resume Verified</strong> along with
                the actual extracted sentence evidence. Candidate unverified entries are marked as{" "}
                <strong className="text-amber-500 font-semibold">Self-Declared</strong>.
              </p>
            </div>
          </div>

          {/* Required Skills Section Header with Filters */}
          <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/80 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  Job Required Skills & Extracted Resume Evidence
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Breakdown of how candidate qualifications compare against job requisition requirements.
                </p>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 bg-secondary/50 p-1 rounded-xl border border-border text-xs">
                <button
                  type="button"
                  onClick={() => setSkillFilter("all")}
                  className={cn(
                    "px-3 py-1 rounded-lg font-bold transition",
                    skillFilter === "all" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  All ({match.skill_breakdown?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setSkillFilter("verified")}
                  className={cn(
                    "px-3 py-1 rounded-lg font-bold transition",
                    skillFilter === "verified" ? "bg-card text-emerald-500 shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Verified ({match.skill_breakdown?.filter((s) => s.source === "resume" || s.evidence_text).length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setSkillFilter("missing")}
                  className={cn(
                    "px-3 py-1 rounded-lg font-bold transition",
                    skillFilter === "missing" ? "bg-card text-rose-500 shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Missing ({match.skill_breakdown?.filter((s) => s.skill_score === 0).length || 0})
                </button>
              </div>
            </div>

            {/* Skill Cards Grid */}
            <div className="grid gap-3.5">
              {filteredSkills.length > 0 ? (
                filteredSkills.map((sk) => {
                  const isResumeDetected = sk.source === "resume" || Boolean(sk.evidence_text);
                  const hasEvidence = Boolean(sk.evidence_text);

                  return (
                    <div
                      key={sk.skill_id}
                      className={cn(
                        "rounded-xl border p-4 transition-all duration-200 space-y-3",
                        isResumeDetected
                          ? "bg-emerald-500/[0.03] border-emerald-500/25 hover:border-emerald-500/40"
                          : sk.skill_score === 0
                          ? "bg-rose-500/[0.02] border-rose-500/20"
                          : "bg-secondary/30 border-border hover:border-border/80"
                      )}
                    >
                      {/* Skill Card Header */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-foreground">{sk.skill_name}</span>

                          {/* Requirement Type Badge */}
                          <span
                            className={cn(
                              "text-[10px] px-2 py-0.5 rounded-md font-bold uppercase border",
                              sk.requirement_type?.toLowerCase() === "required"
                                ? "bg-primary/10 text-primary border-primary/20"
                                : "bg-secondary text-muted-foreground border-border"
                            )}
                          >
                            {sk.requirement_type} (Weight: {sk.weight})
                          </span>

                          {/* Source Verification Badge */}
                          {isResumeDetected ? (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              Resume Verified
                            </span>
                          ) : sk.skill_score > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-secondary text-muted-foreground font-semibold border border-border">
                              <User className="w-3 h-3" />
                              Self-Declared Only
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-500 font-bold border border-rose-500/20">
                              <XCircle className="w-3 h-3" />
                              Not Detected
                            </span>
                          )}
                        </div>

                        {/* Skill Score Pill */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Match Factor:</span>
                          <span
                            className={cn(
                              "text-xs font-black px-2 py-0.5 rounded-lg border",
                              sk.skill_score >= 0.8
                                ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/30"
                                : sk.skill_score >= 0.5
                                ? "text-sky-500 bg-sky-500/10 border-sky-500/30"
                                : sk.skill_score > 0
                                ? "text-amber-500 bg-amber-500/10 border-amber-500/30"
                                : "text-rose-500 bg-rose-500/10 border-rose-500/20"
                            )}
                          >
                            {Math.round(sk.skill_score * 100)}%
                          </span>
                        </div>
                      </div>

                      {/* Evidence Snippet Callout */}
                      {hasEvidence ? (
                        <div className="pl-3.5 border-l-2 border-emerald-500 bg-emerald-500/10 dark:bg-emerald-950/30 rounded-r-xl p-3 text-xs text-emerald-900 dark:text-emerald-200">
                          <div className="flex items-start gap-2">
                            <Quote className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 opacity-80" />
                            <div className="space-y-1">
                              <p className="italic leading-relaxed font-medium">"{sk.evidence_text}"</p>
                              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">
                                Extracted from resume text
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : isResumeDetected ? (
                        <div className="text-xs text-muted-foreground italic pl-3 border-l-2 border-border/80">
                          Detected in parsed candidate resume tokens.
                        </div>
                      ) : sk.skill_score > 0 ? (
                        <div className="text-xs text-muted-foreground pl-3 border-l-2 border-border/80">
                          Candidate self-declared proficiency:{" "}
                          <strong className="text-foreground">{sk.candidate_proficiency || "Not specified"}</strong>{" "}
                          ({sk.candidate_years || 0} years experience). No resume evidence verified.
                        </div>
                      ) : (
                        <div className="text-xs text-rose-500/90 italic pl-3 border-l-2 border-rose-500/40">
                          Missing required skill: no declaration or resume evidence found.
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-muted-foreground italic text-center py-6">
                  No skills matching the current filter.
                </p>
              )}
            </div>
          </div>

          {/* Missing Skills Warning Card */}
          {match.missing_skills && match.missing_skills.length > 0 && (
            <div className="bg-card border border-rose-500/30 rounded-2xl p-5 shadow-sm space-y-2.5">
              <h3 className="text-sm font-extrabold text-rose-500 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-500" />
                Missing Required Skills ({match.missing_skills.length})
              </h3>
              <p className="text-xs text-muted-foreground">
                The candidate has not provided resume evidence or profile declarations for these requisition skills:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {match.missing_skills.map((s) => (
                  <span
                    key={s}
                    className="px-3 py-1 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Two-Column Grid: Resume Detected Skills vs Self-Declared Skills */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: All Resume Detected Skills */}
            <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-500" />
                  All Resume-Detected Skills ({match.resume_detected_skills?.length || 0})
                </h3>
              </div>

              {/* Quick Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Filter extracted resume skills..."
                  value={resumeSkillSearch}
                  onChange={(e) => setResumeSkillSearch(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-border bg-secondary/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {filteredResumeSkills.length > 0 ? (
                  filteredResumeSkills.map((sk: any, idx: number) => {
                    const skillName = sk.name || sk.skill_name || "Extracted Skill";
                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-secondary/40 border border-border/70 text-xs space-y-1.5 hover:border-emerald-500/40 transition"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-foreground">{skillName}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
                            {sk.category || "General"}
                          </span>
                        </div>
                        {sk.evidence_text && (
                          <div className="text-muted-foreground text-[11px] italic pl-2.5 border-l-2 border-emerald-500/60 leading-relaxed">
                            "{sk.evidence_text}"
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-muted-foreground italic text-center py-4">
                    {resumeSkillSearch ? "No skills matching search." : "No resume skills extracted."}
                  </p>
                )}
              </div>
            </div>

            {/* Right: Candidate Self-Declared Skills */}
            <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm space-y-3.5">
              <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Self-Declared Profile Skills ({match.self_declared_skills?.length || 0})
              </h3>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {match.self_declared_skills && match.self_declared_skills.length > 0 ? (
                  match.self_declared_skills.map((sk: any, idx: number) => {
                    const skillName = sk.name || sk.skill_name || "Skill";
                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-secondary/40 border border-border/70 text-xs flex items-center justify-between hover:border-primary/40 transition"
                      >
                        <div>
                          <span className="font-extrabold text-foreground block">{skillName}</span>
                          <span className="text-[10px] text-muted-foreground">{sk.category || "General"}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-secondary text-foreground border border-border">
                            {sk.proficiency_level || "Not Rated"}
                          </span>
                          <span className="text-[10px] text-muted-foreground block mt-1">
                            {sk.years_experience || 0} yrs experience
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-muted-foreground italic text-center py-4">No self-declared skills.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Extracted Resume & Timeline */}
      {activeTab === "resume" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-foreground">Extracted Resume Information</h3>
            {resumeUrl && (
              <a
                href={resumeUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold transition shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Download Original Resume
              </a>
            )}
          </div>

          {/* Education & Experience Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Education */}
            <div className="bg-card border border-border/80 rounded-xl p-5 shadow-sm space-y-3">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-primary" />
                Education
              </h4>
              {candidate?.education_degree || candidate?.education_institution ? (
                <div className="p-3 rounded-lg bg-secondary/50 border border-border/60 text-xs space-y-1">
                  <div className="font-bold text-foreground">{candidate.education_degree || "Degree"}</div>
                  <div className="text-muted-foreground">{candidate.education_institution || "Institution"}</div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No formal education record parsed.</p>
              )}
            </div>

            {/* Career & Work Preferences */}
            <div className="bg-card border border-border/80 rounded-xl p-5 shadow-sm space-y-3">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" />
                Employment & Compensation
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-secondary/40 border border-border/50">
                  <span className="text-muted-foreground block text-[11px]">Notice Period</span>
                  <span className="font-semibold text-foreground">{candidate?.notice_period || "Not specified"}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-secondary/40 border border-border/50">
                  <span className="text-muted-foreground block text-[11px]">Work Mode</span>
                  <span className="font-semibold text-foreground">{candidate?.preferred_work_mode || "Any"}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-secondary/40 border border-border/50">
                  <span className="text-muted-foreground block text-[11px]">Current CTC</span>
                  <span className="font-semibold text-foreground">
                    {candidate?.current_ctc ? `₹${candidate.current_ctc.toLocaleString()}` : "Not disclosed"}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-secondary/40 border border-border/50">
                  <span className="text-muted-foreground block text-[11px]">Expected CTC</span>
                  <span className="font-semibold text-foreground">
                    {candidate?.expected_ctc ? `₹${candidate.expected_ctc.toLocaleString()}` : "Negotiable"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Job Collaboration Notes */}
      {activeTab === "notes" && (
        <div className="bg-card border border-border/80 rounded-xl p-5 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-border/80 pb-4">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                Contextual Discussion on Candidate for {job?.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Notes posted here are strictly scoped to this requisition and visible to assigned recruiters & HR job owner.
              </p>
            </div>
          </div>

          {/* Message List */}
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {messages.length === 0 ? (
              <p className="text-xs text-muted-foreground italic text-center py-6">
                No discussion notes posted yet for this candidate.
              </p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "p-3.5 rounded-xl border text-xs space-y-1.5",
                    m.sender_id === user?.id
                      ? "bg-primary/5 border-primary/20 ml-6"
                      : "bg-secondary/60 border-border mr-6"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{m.sender_name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-secondary text-muted-foreground font-semibold border border-border">
                        {m.sender_role}
                      </span>
                      {m.message_type && m.message_type !== "GENERAL" && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/10 text-primary font-bold">
                          {m.message_type.replace(/_/g, " ")}
                        </span>
                      )}
                      {m.is_private && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-500 font-medium">
                          <Lock className="w-3 h-3" /> Private Note
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-foreground whitespace-pre-wrap leading-relaxed">{m.message}</p>
                </div>
              ))
            )}
          </div>

          {/* Message Input Form */}
          <form onSubmit={handleSendMessage} className="space-y-3 pt-3 border-t border-border/80">
            <div className="flex items-center gap-3">
              <select
                value={messageType}
                onChange={(e) => setMessageType(e.target.value)}
                className="text-xs rounded-lg border border-border bg-card px-2.5 py-1.5 text-foreground"
              >
                <option value="SCREENING_NOTE">Screening Note</option>
                <option value="RECOMMENDATION">Recommendation to HR</option>
                <option value="HR_REQUEST">Question for HR</option>
                <option value="GENERAL">General Note</option>
              </select>

              <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-0"
                />
                Private to Recruiters
              </label>
            </div>

            <div className="flex items-end gap-2">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Write a screening note or observation about candidate's resume evidence..."
                rows={3}
                className="flex-1 text-xs rounded-xl border border-border bg-card p-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="submit"
                disabled={sendingMessage || !newMessage.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 disabled:opacity-50 transition shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                Post Note
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB CONTENT: Assigned Tasks */}
      {activeTab === "tasks" && (
        <div className="bg-card border border-border/80 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <ListTodo className="w-4 h-4 text-primary" />
            Actionable Tasks for this Candidate
          </h3>

          <div className="space-y-3">
            {tasks.length === 0 ? (
              <p className="text-xs text-muted-foreground italic text-center py-6">
                No actionable recruitment tasks assigned for this candidate.
              </p>
            ) : (
              tasks.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-xl border border-border/80 bg-secondary/30 flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">{t.title}</span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                          t.priority === "URGENT" || t.priority === "HIGH"
                            ? "bg-rose-500/10 text-rose-500"
                            : "bg-secondary text-muted-foreground"
                        )}
                      >
                        {t.priority}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Assigned to: <strong className="text-foreground">{t.assignee_name}</strong>
                      </span>
                    </div>
                    {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                    {t.due_at && (
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Due: {new Date(t.due_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  {/* Task Status Dropdown */}
                  <div className="shrink-0">
                    <select
                      value={t.status}
                      onChange={(e) => handleTaskStatus(t.id, e.target.value)}
                      className={cn(
                        "text-xs font-bold rounded-lg border px-2.5 py-1.5 transition",
                        t.status === "COMPLETED"
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                          : t.status === "IN_PROGRESS"
                          ? "bg-sky-500/10 text-sky-600 border-sky-500/30"
                          : "bg-card text-muted-foreground border-border"
                      )}
                    >
                      <option value="OPEN">OPEN</option>
                      <option value="IN_PROGRESS">IN PROGRESS</option>
                      <option value="COMPLETED">COMPLETED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Lifecycle Audit Timeline */}
      {activeTab === "timeline" && (
        <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Complete Lifecycle Audit History
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Full chronological sequence of application submissions, reviews, slot negotiations, and decisions.
              </p>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {timeline.length} Recorded Events
            </span>
          </div>
          <CandidateTimeline timeline={timeline} />
        </div>
      )}

      {/* Structured Competency Ratings Evaluation Modal */}
      {showInterviewerEvalModal && match && (
        <InterviewerEvaluationModal
          isOpen={showInterviewerEvalModal}
          onClose={() => {
            setShowInterviewerEvalModal(false);
            setIsEditingEvaluation(false);
          }}
          matchId={match.id}
          candidateName={candidate?.full_name || "Candidate"}
          jobTitle={job?.title || "Position"}
          isCompleteFlow={!isEditingEvaluation}
          onSuccess={async () => {
            setWorkflowSuccess(
              isEditingEvaluation
                ? "Competency evaluation ratings updated successfully!"
                : "Interview completed & competency ratings recorded! Hiring Manager has been notified to provide GO/NO-GO feedback."
            );
            setShowInterviewerEvalModal(false);
            setIsEditingEvaluation(false);
            await loadData();
          }}
          initialRatings={
            activeInterviewDetails?.interviewer_overall_rating
              ? {
                  technical_rating: activeInterviewDetails.interviewer_technical_rating,
                  communication_rating: activeInterviewDetails.interviewer_communication_rating,
                  problem_solving_rating: activeInterviewDetails.interviewer_problem_solving_rating,
                  role_fit_rating: activeInterviewDetails.interviewer_role_fit_rating,
                  overall_rating: activeInterviewDetails.interviewer_overall_rating,
                  comments: activeInterviewDetails.interviewer_comments,
                }
              : undefined
          }
        />
      )}
    </div>
  );
};
