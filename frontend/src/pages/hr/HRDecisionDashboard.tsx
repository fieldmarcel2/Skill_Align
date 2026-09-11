import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { workflowApi, offerApi, jobsApi } from "../../services/api";
import { HMDashboardItem, Offer, Job } from "../../types";
import { useToast } from "../../components/ui/toast";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import {
  CheckSquare,
  BookmarkCheck,
  CalendarCheck,
  MessageSquare,
  FileCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Briefcase,
  ArrowRight,
  Filter,
  RefreshCw,
  Loader2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Send,
  Eye,
  Calendar,
  DollarSign,
  TrendingUp,
} from "lucide-react";

export const HRDecisionDashboard: React.FC = () => {
  const toast = useToast();
  const navigate = useNavigate();

  // Data states
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("ALL");

  const [pendingReviews, setPendingReviews] = useState<HMDashboardItem[]>([]);
  const [feedbackRequired, setFeedbackRequired] = useState<HMDashboardItem[]>([]);
  const [interviewsInProgress, setInterviewsInProgress] = useState<HMDashboardItem[]>([]);
  const [pendingOffers, setPendingOffers] = useState<Offer[]>([]);

  // Active Gate Tab: "shortlist" | "slots" | "evaluation" | "offers"
  const [activeGate, setActiveGate] = useState<"shortlist" | "slots" | "evaluation" | "offers">("shortlist");

  // Rejection modal state
  const [rejectModalItem, setRejectModalItem] = useState<{ matchId: number; candidateName: string } | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [hmData, offersData, jobsData] = await Promise.all([
        workflowApi.getHMDashboard().catch(() => null),
        offerApi.getPendingHMOffers().catch(() => []),
        jobsApi.list().catch(() => []),
      ]);

      if (hmData) {
        setPendingReviews(hmData.pending_review || []);
        setFeedbackRequired(hmData.feedback_required || []);
        setInterviewsInProgress(hmData.interview_in_progress || []);
      }
      setPendingOffers(offersData || []);
      setJobs(jobsData || []);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to load decision dashboard items.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter items by selected job requisition
  const filterHMDashboardItems = (items: HMDashboardItem[]): HMDashboardItem[] => {
    if (selectedJobId === "ALL") return items;
    const jid = parseInt(selectedJobId, 10);
    return items.filter((item) => item.job_id === jid);
  };

  const filterOffers = (items: Offer[]): Offer[] => {
    if (selectedJobId === "ALL") return items;
    const jid = parseInt(selectedJobId, 10);
    return items.filter((item) => item.job_id === jid);
  };

  const filteredShortlists = filterHMDashboardItems(pendingReviews);
  const filteredSlots = filterHMDashboardItems(interviewsInProgress);
  const filteredFeedback = filterHMDashboardItems(feedbackRequired);
  const filteredOffers = filterOffers(pendingOffers);

  const totalDecisionsPending =
    filteredShortlists.length + filteredSlots.length + filteredFeedback.length + filteredOffers.length;

  // Gate 1: Approve Shortlist
  const handleApproveShortlist = async (matchId: number, candidateName?: string) => {
    setActionLoadingId(matchId);
    try {
      await workflowApi.hmReview(matchId);
      toast.success(`Shortlist approved for ${candidateName || "candidate"}. Candidate progressed to next stage.`);
      await fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to approve shortlist.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Gate 1: Reject Shortlist
  const handleConfirmReject = async () => {
    if (!rejectModalItem) return;
    setActionLoadingId(rejectModalItem.matchId);
    try {
      await workflowApi.hmReject(rejectModalItem.matchId, rejectReason || "Candidate does not meet hiring criteria.");
      toast.info(`Candidate ${rejectModalItem.candidateName} has been rejected.`);
      setRejectModalItem(null);
      setRejectReason("");
      await fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to reject candidate.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Gate 3: Fast GO / NO-GO Decision
  const handleEvaluationDecision = async (matchId: number, decision: "GO" | "NO_GO", candidateName?: string) => {
    setActionLoadingId(matchId);
    try {
      await workflowApi.submitHMFeedback(matchId, {
        go_no_go: decision,
        overall_rating: decision === "GO" ? 5 : 2,
        comments: decision === "GO" ? "Passed interview round. Authorized for offer discussion." : "Did not meet evaluation rubric.",
      });
      toast.success(
        decision === "GO"
          ? `Interview Passed (GO) for ${candidateName || "candidate"}. Recruiter notified to draft offer.`
          : `Candidate marked NO-GO.`
      );
      await fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to record evaluation decision.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Gate 4: Approve Offer
  const handleApproveOffer = async (offerId: number, candidateName?: string) => {
    setActionLoadingId(offerId);
    try {
      await offerApi.hmReviewOffer(offerId, "APPROVE", "Offer package approved by HRM.");
      toast.success(`Offer package approved for ${candidateName || "candidate"}. Ready for candidate dispatch.`);
      await fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to approve offer.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Gate 4: Request Offer Changes
  const handleRequestOfferChanges = async (offerId: number) => {
    setActionLoadingId(offerId);
    try {
      await offerApi.hmReviewOffer(offerId, "REQUEST_CHANGES", "Please adjust compensation or terms.");
      toast.info("Offer returned to recruiter for compensation revisions.");
      await fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to request changes.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const getInitials = (name?: string) =>
    (name || "Talent")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-2">
            <CheckSquare className="w-3.5 h-3.5" />
            Recruiter-to-HRM Decision Authority Hub
          </div>
          <h1 className="text-2xl font-bold font-outfit text-foreground tracking-tight flex items-center gap-3">
            Recruiter Decision Calls
            {totalDecisionsPending > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                {totalDecisionsPending} Pending Sign-Off{totalDecisionsPending !== 1 ? "s" : ""}
              </span>
            )}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Dedicated command center for every critical gate where Recruiters request HR authorization and sign-off.
          </p>
        </div>

        {/* Filter by Requisition & Refresh */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800/80 rounded-lg px-3 py-1.5 shadow-xs">
            <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground font-medium">Requisition:</span>
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="bg-transparent text-xs text-foreground font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Requisitions</option>
              {jobs.map((job) => (
                <option key={job.id} value={String(job.id)}>
                  {job.title} {job.client_name ? `(${job.client_name})` : ""}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 text-foreground text-xs font-semibold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-primary" : "text-muted-foreground"}`} />
            Sync Calls
          </button>
        </div>
      </div>

      {/* ── 4 Gate Metric Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <button
          type="button"
          onClick={() => setActiveGate("shortlist")}
          className={`p-4 rounded-xl border text-left transition-all shadow-xs cursor-pointer ${
            activeGate === "shortlist"
              ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-sm"
              : "border-slate-200/90 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700"
          }`}
        >
          <div className="text-xs font-medium text-muted-foreground flex items-center justify-between">
            <span>Gate 1: Shortlists</span>
            <BookmarkCheck className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold font-outfit text-foreground mt-1">
            {filteredShortlists.length}
          </div>
          <div className="text-[11px] text-muted-foreground">Recruiter candidate sign-offs</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveGate("slots")}
          className={`p-4 rounded-xl border text-left transition-all shadow-xs cursor-pointer ${
            activeGate === "slots"
              ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-sm"
              : "border-slate-200/90 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700"
          }`}
        >
          <div className="text-xs font-medium text-muted-foreground flex items-center justify-between">
            <span>Gate 2: Slot Proposals</span>
            <CalendarCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-outfit text-foreground mt-1">
            {filteredSlots.length}
          </div>
          <div className="text-[11px] text-muted-foreground">Candidate interview bookings</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveGate("evaluation")}
          className={`p-4 rounded-xl border text-left transition-all shadow-xs cursor-pointer ${
            activeGate === "evaluation"
              ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-sm"
              : "border-slate-200/90 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700"
          }`}
        >
          <div className="text-xs font-medium text-muted-foreground flex items-center justify-between">
            <span>Gate 3: GO / NO-GO</span>
            <MessageSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-outfit text-foreground mt-1">
            {filteredFeedback.length}
          </div>
          <div className="text-[11px] text-muted-foreground">Post-interview evaluations</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveGate("offers")}
          className={`p-4 rounded-xl border text-left transition-all shadow-xs cursor-pointer ${
            activeGate === "offers"
              ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-sm"
              : "border-slate-200/90 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700"
          }`}
        >
          <div className="text-xs font-medium text-muted-foreground flex items-center justify-between">
            <span>Gate 4: Offer Sign-Offs</span>
            <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-outfit text-foreground mt-1">
            {filteredOffers.length}
          </div>
          <div className="text-[11px] text-muted-foreground">Compensation package approval</div>
        </button>
      </div>

      {/* ── Gate Navigation Tabs ──────────────────────────────────────────── */}
      <div className="flex border-b border-border/80 gap-6 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveGate("shortlist")}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeGate === "shortlist"
              ? "border-primary text-foreground font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <BookmarkCheck className="w-4 h-4 text-primary" />
          Shortlist Sign-Offs
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary font-mono font-bold">
            {filteredShortlists.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveGate("slots")}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeGate === "slots"
              ? "border-primary text-foreground font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <CalendarCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          Slot Allocation & Schedules
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 font-mono font-bold">
            {filteredSlots.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveGate("evaluation")}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeGate === "evaluation"
              ? "border-primary text-foreground font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <MessageSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          Post-Interview Evaluations (GO/NO-GO)
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 font-mono font-bold">
            {filteredFeedback.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveGate("offers")}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeGate === "offers"
              ? "border-primary text-foreground font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          Formal Offer Sign-Offs
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold">
            {filteredOffers.length}
          </span>
        </button>
      </div>

      {/* ── GATE 1: SHORTLIST SIGN-OFFS ───────────────────────────────────── */}
      {activeGate === "shortlist" && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : filteredShortlists.length === 0 ? (
            <div className="p-12 text-center bg-white/90 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/80 rounded-xl space-y-2 shadow-xs">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <h3 className="text-base font-bold font-outfit text-foreground">No Pending Shortlists for Review</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                All recruiter shortlists have been authorized. When a recruiter screens and submits a candidate to HM, they will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredShortlists.map((item) => (
                <div
                  key={item.match_result_id}
                  className="bg-white/95 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/80 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-outfit font-bold text-xs text-foreground shrink-0 shadow-xs">
                      {getInitials(item.candidate_name)}
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] px-2 py-0.5 rounded-md font-semibold bg-primary/10 text-primary border border-primary/20">
                          Recruiter Shortlist
                        </span>
                        {item.overall_score !== undefined && (
                          <span className="text-[11px] px-2 py-0.5 rounded-md font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60">
                            {Math.round(Number(item.overall_score) > 1 ? Number(item.overall_score) : Number(item.overall_score) * 100)}% Match
                          </span>
                        )}
                        <span className="text-[10px] px-2 py-0.5 rounded bg-secondary text-muted-foreground border border-border font-mono">
                          {item.pipeline_state || "SENT_TO_HIRING_MANAGER"}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-foreground truncate">
                        {item.candidate_name || `Candidate #${item.match_result_id}`}
                      </h4>

                      <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{item.job_title}</span>
                        {item.recruiter_name && (
                          <span>Submitted by <strong className="text-foreground">{item.recruiter_name}</strong></span>
                        )}
                        {item.submitted_to_hm_at && (
                          <span className="text-[11px] font-mono">
                            {new Date(item.submitted_to_hm_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {item.note && (
                        <p className="text-xs text-muted-foreground bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/80 p-2 rounded-lg mt-1 italic">
                          "{item.note}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Sign-Off Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 md:self-center">
                    <Button
                      size="sm"
                      onClick={() => handleApproveShortlist(item.match_result_id, item.candidate_name)}
                      disabled={actionLoadingId === item.match_result_id}
                      className="gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Approve for Interview
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRejectModalItem({ matchId: item.match_result_id, candidateName: item.candidate_name || "Candidate" })}
                      disabled={actionLoadingId === item.match_result_id}
                      className="gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Decline
                    </Button>

                    <Link
                      to={`/hr/candidates/${item.match_result_id}/review`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs font-semibold border border-border shadow-xs transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                      Full Dossier
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── GATE 2: INTERVIEW SLOTS & SCHEDULES ───────────────────────────── */}
      {activeGate === "slots" && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : filteredSlots.length === 0 ? (
            <div className="p-12 text-center bg-white/90 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/80 rounded-xl space-y-2 shadow-xs">
              <CalendarCheck className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <h3 className="text-base font-bold font-outfit text-foreground">No Pending Slot Decisions</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No candidate interview slots are currently awaiting confirmation or action from HRM.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSlots.map((item) => (
                <div
                  key={item.match_result_id}
                  className="bg-white/95 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/80 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-purple-300 flex items-center justify-center font-outfit font-bold text-xs shrink-0 shadow-xs">
                      {getInitials(item.candidate_name)}
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] px-2 py-0.5 rounded-md font-semibold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60">
                          Interview Coordination
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-secondary text-muted-foreground border border-border font-mono">
                          {item.pipeline_state || "INTERVIEW_SCHEDULED"}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-foreground">
                        {item.candidate_name || `Candidate #${item.match_result_id}`}
                      </h4>

                      <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{item.job_title}</span>
                        {item.interview_date && (
                          <span className="flex items-center gap-1 font-mono text-foreground">
                            <Calendar className="w-3 h-3 text-muted-foreground" />
                            {new Date(item.interview_date).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 md:self-center">
                    <Link
                      to={`/hr/candidates/${item.match_result_id}/review`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-xs transition-colors"
                    >
                      <CalendarCheck className="w-3.5 h-3.5" />
                      Manage Schedule & Slots
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── GATE 3: POST-INTERVIEW GO/NO-GO EVALUATION ────────────────────── */}
      {activeGate === "evaluation" && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : filteredFeedback.length === 0 ? (
            <div className="p-12 text-center bg-white/90 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/80 rounded-xl space-y-2 shadow-xs">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <h3 className="text-base font-bold font-outfit text-foreground">No Post-Interview Evaluations Pending</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Recruiters and hiring managers have submitted evaluations for all completed candidate rounds.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFeedback.map((item) => (
                <div
                  key={item.match_result_id}
                  className="bg-white/95 dark:bg-slate-900/60 backdrop-blur-md border border-amber-200/80 dark:border-amber-900/50 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 flex items-center justify-center font-outfit font-bold text-xs shrink-0 shadow-xs">
                      {getInitials(item.candidate_name)}
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] px-2 py-0.5 rounded-md font-semibold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60">
                          GO / NO-GO Decision Required
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-secondary text-muted-foreground border border-border font-mono">
                          {item.pipeline_state || "WAITING_FOR_HM_FEEDBACK"}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-foreground">
                        {item.candidate_name || `Candidate #${item.match_result_id}`}
                      </h4>

                      <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{item.job_title}</span>
                        {item.interview_date && (
                          <span>Interview completed on {new Date(item.interview_date).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Fast Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 md:self-center">
                    <Button
                      size="sm"
                      onClick={() => handleEvaluationDecision(item.match_result_id, "GO", item.candidate_name)}
                      disabled={actionLoadingId === item.match_result_id}
                      className="gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Authorize GO (Pass to Offer)
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEvaluationDecision(item.match_result_id, "NO_GO", item.candidate_name)}
                      disabled={actionLoadingId === item.match_result_id}
                      className="gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      NO-GO
                    </Button>

                    <Link
                      to={`/hr/interviews/${item.match_result_id}/feedback`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs font-semibold border border-border shadow-xs transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                      Rubric & Scorecard
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── GATE 4: FORMAL OFFER SIGN-OFFS ────────────────────────────────── */}
      {activeGate === "offers" && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : filteredOffers.length === 0 ? (
            <div className="p-12 text-center bg-white/90 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/80 rounded-xl space-y-2 shadow-xs">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <h3 className="text-base font-bold font-outfit text-foreground">No Pending Offers Requiring Sign-Off</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                All drafted offer packages have been authorized by HRM.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOffers.map((offer) => (
                <div
                  key={offer.id}
                  className="bg-white/95 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/80 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-outfit font-bold text-xs shrink-0 shadow-xs">
                      <DollarSign className="w-5 h-5" />
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] px-2 py-0.5 rounded-md font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60">
                          Offer Package Sign-Off
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-secondary text-muted-foreground border border-border font-mono">
                          {offer.status}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-foreground">
                        {offer.candidate_name || `Candidate #${offer.match_result_id}`}
                      </h4>

                      <div className="flex flex-wrap items-center gap-x-4 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">
                          Proposed CTC: {offer.salary_currency || "INR"} {Number(offer.proposed_salary || 0).toLocaleString()}
                        </span>
                        {offer.employment_type && (
                          <span>Type: <strong className="text-foreground">{offer.employment_type}</strong></span>
                        )}
                        {offer.joining_date && (
                          <span>Joining: <strong className="text-foreground">{new Date(offer.joining_date).toLocaleDateString()}</strong></span>
                        )}
                      </div>

                      {offer.recruiter_comments && (
                        <p className="text-xs text-muted-foreground bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/80 p-2 rounded-lg mt-1 italic">
                          "{offer.recruiter_comments}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Offer Sign-Off Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 md:self-center">
                    <Button
                      size="sm"
                      onClick={() => handleApproveOffer(offer.id, offer.candidate_name || undefined)}
                      disabled={actionLoadingId === offer.id}
                      className="gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Sign Off & Authorize Offer
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRequestOfferChanges(offer.id)}
                      disabled={actionLoadingId === offer.id}
                      className="gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 cursor-pointer"
                    >
                      Request Revisions
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Rejection Reason Modal ────────────────────────────────────────── */}
      {rejectModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-md p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-5 h-5" />
              <h3 className="text-base font-bold text-foreground">Confirm Candidate Rejection</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Are you sure you want to decline <strong>{rejectModalItem.candidateName}</strong>? Please provide a brief note for audit compliance.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="E.g. Insufficient production experience with required tech stack..."
              rows={3}
              className="w-full p-2.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary resize-none"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRejectModalItem(null);
                  setRejectReason("");
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmReject}
                disabled={actionLoadingId === rejectModalItem.matchId}
                className="bg-rose-600 hover:bg-rose-500 text-white"
              >
                {actionLoadingId === rejectModalItem.matchId ? "Processing..." : "Confirm Rejection"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default HRDecisionDashboard;
