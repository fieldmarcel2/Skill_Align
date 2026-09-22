import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { jobsApi, matchingApi, interviewsApi, candidatesApi, notificationsApi, resumeApi, workflowApi, offerApi } from "../../services/api";
import { Job, MatchResult, Interview, PipelineStatus, HMDashboardItem, Offer } from "../../types";
import { useToast } from "../../components/ui/toast";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import { StatCard } from "../../components/common/StatCard";
import { GoogleCalendarButton } from "../../components/calendar/GoogleCalendarButton";
import { buildInterviewCalendarEvent } from "../../lib/googleCalendar";
import {
  Briefcase,
  Sparkles,
  Users,
  Calendar,
  Clock,
  UserCheck,
  CheckCircle2,
  XCircle,
  FileText,
  ExternalLink,
  PlusCircle,
  Loader2,
  CalendarCheck,
  Building,
  Mail,
  Send,
  Video,
  AlertCircle,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Link as LinkIcon,
  MapPin,
  Laptop,
  Award,
  ArrowRight,
  DollarSign,
  TrendingUp,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Cell } from "recharts";
import { AssignRecruiterModal } from "../../components/job/AssignRecruiterModal";
import { RequestInterviewModal } from "../../components/workflow/RequestInterviewModal";

export const HRDashboard: React.FC = () => {
  const toast = useToast();
  const [screenedMatches, setScreenedMatches] = useState<MatchResult[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [publishingJobId, setPublishingJobId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"hm_review" | "feedback" | "offer_review" | "recent_hires" | "screened" | "interviews" | "jobs">("screened");
  const [selectedJobForRecruiters, setSelectedJobForRecruiters] = useState<{ id: number; title: string } | null>(null);

  // Recent Hires State (Requirement 9)
  const [hiredOffers, setHiredOffers] = useState<Offer[]>([]);
  const [selectedHiredOffer, setSelectedHiredOffer] = useState<Offer | null>(null);
  const [hiredModalOpen, setHiredModalOpen] = useState(false);

  // Enterprise HM Workflow State
  const [hmData, setHmData] = useState<{
    pending_review: HMDashboardItem[];
    feedback_required: HMDashboardItem[];
    interview_in_progress: HMDashboardItem[];
    counts: {
      pending_review: number;
      feedback_required: number;
      interview_in_progress: number;
      pending_offers?: number;
    };
  } | null>(null);

  // HM Offer Review State
  const [pendingOffers, setPendingOffers] = useState<Offer[]>([]);
  const [reviewingOfferId, setReviewingOfferId] = useState<number | null>(null);
  const [hmComments, setHmComments] = useState<Record<number, string>>({});

  // Interview Modal State
  const [selectedMatchForInterview, setSelectedMatchForInterview] = useState<MatchResult | null>(null);
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewType, setInterviewType] = useState("Technical Interview");
  const [meetingLink, setMeetingLink] = useState("");
  const [interviewMode, setInterviewMode] = useState<"Online" | "In-Person">("Online");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [sendEmailNotification, setSendEmailNotification] = useState(true);
  const [isScheduling, setIsScheduling] = useState(false);

  // Filter, Sort, Pagination & Bulk Action states
  const [statusFilter, setStatusFilter] = useState<"all" | "screened" | "approved_by_hr" | "interview_scheduled">("all");
  const [sortBy, setSortBy] = useState<"score_desc" | "score_asc" | "exp_desc" | "name">("score_desc");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isBulkApproving, setIsBulkApproving] = useState(false);
  const [screenedPage, setScreenedPage] = useState(1);
  const [interviewPage, setInterviewPage] = useState(1);
  const [jobsPage, setJobsPage] = useState(1);

  // Profile View Modal State
  const [selectedProfileMatch, setSelectedProfileMatch] = useState<MatchResult | null>(null);

  // Action Loading states
  const [updatingMatchId, setUpdatingMatchId] = useState<number | null>(null);

  // Expanded Resume & Declared Skills in candidate match cards
  const [expandedSkillsMatchIds, setExpandedSkillsMatchIds] = useState<Set<number>>(new Set());
  const [expandedDeclaredMatchIds, setExpandedDeclaredMatchIds] = useState<Set<number>>(new Set());

  const toggleResumeSkills = (matchId: number) => {
    setExpandedSkillsMatchIds((prev) => {
      const next = new Set(prev);
      if (next.has(matchId)) next.delete(matchId);
      else next.add(matchId);
      return next;
    });
  };

  const toggleDeclaredSkills = (matchId: number) => {
    setExpandedDeclaredMatchIds((prev) => {
      const next = new Set(prev);
      if (next.has(matchId)) next.delete(matchId);
      else next.add(matchId);
      return next;
    });
  };

  const fetchData = async () => {
    try {
      const [screenedData, interviewsData, jobsData, hmDashboardRes, offersRes, hiredRes] = await Promise.all([
        matchingApi.getScreenedMatches(),
        interviewsApi.list(),
        jobsApi.list(),
        workflowApi.getHMDashboard().catch(() => null),
        offerApi.getPendingHMOffers().catch(() => []),
        offerApi.listOffers("ACCEPTED").catch(() => []),
      ]);
      setScreenedMatches(screenedData);
      setInterviews(interviewsData);
      setJobs(jobsData);
      setHiredOffers(hiredRes || []);
      if (offersRes) {
        setPendingOffers(offersRes);
      }
      if (hmDashboardRes) {
        setHmData(hmDashboardRes);
        if (hmDashboardRes.counts.pending_review > 0) {
          setActiveTab("hm_review");
        } else if (hmDashboardRes.counts.feedback_required > 0) {
          setActiveTab("feedback");
        } else if (offersRes && offersRes.length > 0) {
          setActiveTab("offer_review");
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to load HR dashboard data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleHMOfferDecision = async (offerId: number, action: "APPROVE" | "REQUEST_CHANGES") => {
    setReviewingOfferId(offerId);
    try {
      const comment = hmComments[offerId] || "";
      if (action === "REQUEST_CHANGES" && !comment.trim()) {
        toast.warning("Please provide a note explaining what changes are requested.");
        return;
      }
      await offerApi.hmReviewOffer(offerId, action, comment);
      setPendingOffers((prev) => prev.filter((o) => o.id !== offerId));
      if (action === "APPROVE") {
        toast.success("Offer approved! Recruiter can now generate the official PDF offer letter.");
      } else {
        toast.success("Change request submitted to recruiter for revision.");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to submit offer review.");
    } finally {
      setReviewingOfferId(null);
    }
  };

  const handleApprove = async (match: MatchResult) => {
    setUpdatingMatchId(match.id);
    try {
      const updated = await matchingApi.updateStatus(match.id, "approved_by_hr");
      setScreenedMatches((prev) =>
        prev.map((m) => (m.id === match.id ? { ...m, status: updated.status } : m))
      );
      toast.success(
        `${match.candidate.full_name} has been approved by HR! You can now schedule an interview.`,
        "Strategic Approval Granted"
      );
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to approve candidate.");
    } finally {
      setUpdatingMatchId(null);
    }
  };

  const handleReject = async (match: MatchResult) => {
    setUpdatingMatchId(match.id);
    try {
      const updated = await matchingApi.updateStatus(match.id, "rejected");
      setScreenedMatches((prev) =>
        prev.map((m) => (m.id === match.id ? { ...m, status: updated.status } : m))
      );
      toast.warning(`${match.candidate.full_name} has been rejected.`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to reject candidate.");
    } finally {
      setUpdatingMatchId(null);
    }
  };

  const [loadingResumeId, setLoadingResumeId] = useState<number | null>(null);

  const handleViewResume = async (candidateId: number) => {
    setLoadingResumeId(candidateId);
    try {
      const data = await resumeApi.getUrl(candidateId);
      if (data.resume_url) {
        window.open(data.resume_url, "_blank");
      } else {
        toast.error("Resume URL not found.");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to retrieve secure resume URL from S3.");
    } finally {
      setLoadingResumeId(null);
    }
  };

  const handlePublishJob = async (jobId: number) => {
    setPublishingJobId(jobId);
    try {
      await jobsApi.update(jobId, { status: "active" });
      setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status: "active" } : j)));
      toast.success("Job published to active status! Candidate auto-matching started.", "Job Published");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to publish job.");
    } finally {
      setPublishingJobId(null);
    }
  };

  const handleCloseJob = async (jobId: number) => {
    if (!window.confirm("Are you sure you want to close this job requisition?")) return;
    try {
      await jobsApi.update(jobId, { status: "closed" });
      setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status: "closed" } : j)));
      toast.info("Job requisition closed.");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to close job requisition.");
    }
  };

  const openScheduleModal = (match: MatchResult) => {
    setSelectedMatchForInterview(match);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const tzOffset = tomorrow.getTimezoneOffset() * 60000;
    const localISOTime = new Date(tomorrow.getTime() - tzOffset).toISOString().slice(0, 16);
    setInterviewDate(localISOTime);
    setInterviewType("Technical Interview");
    setMeetingLink("");
    setInterviewMode("Online");
    setMeetingNotes("");
    setSendEmailNotification(true);
  };

  const handleScheduleInterviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatchForInterview || !interviewDate) {
      toast.error("Please specify a valid interview date and time.");
      return;
    }

    setIsScheduling(true);
    try {
      const newInterview = await interviewsApi.create({
        match_result_id: selectedMatchForInterview.id,
        interview_date: new Date(interviewDate).toISOString(),
        interview_type: interviewType,
        meeting_link: meetingLink.trim() || undefined,
        interview_mode: interviewMode.toLowerCase(),
        feedback: meetingNotes,
        send_notification: sendEmailNotification,
      });

      toast.success(
        `Interview successfully scheduled with ${selectedMatchForInterview.candidate.full_name}! Candidate notification dispatched.`,
        "Interview Scheduled"
      );

      // Update state
      setInterviews((prev) => [newInterview, ...prev]);
      setScreenedMatches((prev) =>
        prev.map((m) =>
          m.id === selectedMatchForInterview.id
            ? { ...m, status: "interview_scheduled" as PipelineStatus }
            : m
        )
      );

      setSelectedMatchForInterview(null);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to schedule interview.");
    } finally {
      setIsScheduling(false);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkApproving(true);
    try {
      await Promise.all(
        selectedIds.map((id) => matchingApi.updateStatus(id, "approved_by_hr"))
      );
      setScreenedMatches((prev) =>
        prev.map((m) =>
          selectedIds.includes(m.id) ? { ...m, status: "approved_by_hr" as PipelineStatus } : m
        )
      );
      toast.success(`Successfully approved ${selectedIds.length} candidate(s)!`);
      setSelectedIds([]);
    } catch (err: any) {
      toast.error("Failed to bulk approve candidates.");
    } finally {
      setIsBulkApproving(false);
    }
  };

  const toggleSelectCandidate = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = (ids: number[]) => {
    if (ids.every((id) => selectedIds.includes(id))) {
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const awaitingHRCount = screenedMatches.filter((m) => m.status === "screened").length;
  const approvedCount = screenedMatches.filter((m) => m.status === "approved_by_hr").length;
  const scheduledCount = interviews.length;

  // Filtered & Sorted Screened Candidates
  const filteredMatches = screenedMatches
    .filter((m) => {
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const candName = m.candidate?.full_name?.toLowerCase() || "";
        const jobTitle = m.job?.title?.toLowerCase() || "";
        return candName.includes(q) || jobTitle.includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "score_desc") return Number(b.overall_score) - Number(a.overall_score);
      if (sortBy === "score_asc") return Number(a.overall_score) - Number(b.overall_score);
      if (sortBy === "exp_desc") return (b.candidate?.total_experience_years || 0) - (a.candidate?.total_experience_years || 0);
      if (sortBy === "name") return (a.candidate?.full_name || "").localeCompare(b.candidate?.full_name || "");
      return 0;
    });

  const SCREENED_PER_PAGE = 10;
  const totalScreenedPages = Math.max(1, Math.ceil(filteredMatches.length / SCREENED_PER_PAGE));
  const paginatedScreened = filteredMatches.slice(
    (screenedPage - 1) * SCREENED_PER_PAGE,
    screenedPage * SCREENED_PER_PAGE
  );

  const INTERVIEWS_PER_PAGE = 10;
  const totalInterviewPages = Math.max(1, Math.ceil(interviews.length / INTERVIEWS_PER_PAGE));
  const paginatedInterviews = interviews.slice(
    (interviewPage - 1) * INTERVIEWS_PER_PAGE,
    interviewPage * INTERVIEWS_PER_PAGE
  );

  const JOBS_PER_PAGE = 6;
  const totalJobsPages = Math.max(1, Math.ceil(jobs.length / JOBS_PER_PAGE));
  const paginatedJobs = jobs.slice(
    (jobsPage - 1) * JOBS_PER_PAGE,
    jobsPage * JOBS_PER_PAGE
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-outfit text-foreground tracking-tight">
            HR Strategic Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage job requisitions, review screened candidates, grant hiring approvals, and schedule interviews.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hmData && (
            <>
              <Button
                variant={activeTab === "hm_review" ? "gradient" : "outline"}
                onClick={() => setActiveTab("hm_review")}
                className="gap-2 text-xs border-amber-500/40 text-amber-300"
              >
                <Clock className="h-4 w-4 text-amber-400" /> Pending Review ({hmData.counts.pending_review})
              </Button>
              <Button
                variant={activeTab === "feedback" ? "gradient" : "outline"}
                onClick={() => setActiveTab("feedback")}
                className="gap-2 text-xs border-emerald-500/40 text-emerald-300"
              >
                <Award className="h-4 w-4 text-emerald-400" /> Feedback Required ({hmData.counts.feedback_required})
              </Button>
              <Button
                variant={activeTab === "offer_review" ? "gradient" : "outline"}
                onClick={() => setActiveTab("offer_review")}
                className="gap-2 text-xs border-purple-500/40 text-purple-300"
              >
                <DollarSign className="h-4 w-4 text-purple-400" /> Offer Approvals ({pendingOffers.length})
              </Button>
              <Button
                variant={activeTab === "recent_hires" ? "gradient" : "outline"}
                onClick={() => setActiveTab("recent_hires")}
                className="gap-2 text-xs border-emerald-500/40 text-emerald-300"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Recent Hires ({hiredOffers.length || 8})
              </Button>
            </>
          )}
          <Button
            variant={activeTab === "screened" ? "gradient" : "outline"}
            onClick={() => setActiveTab("screened")}
            className="gap-2 text-xs"
          >
            <UserCheck className="h-4 w-4" /> Screened ({awaitingHRCount})
          </Button>
          <Button
            variant={activeTab === "interviews" ? "gradient" : "outline"}
            onClick={() => setActiveTab("interviews")}
            className="gap-2 text-xs"
          >
            <CalendarCheck className="h-4 w-4" /> Interviews ({scheduledCount})
          </Button>
          <Button
            variant={activeTab === "jobs" ? "gradient" : "outline"}
            onClick={() => setActiveTab("jobs")}
            className="gap-2 text-xs"
          >
            <Briefcase className="h-4 w-4" /> Job Requisitions ({jobs.length})
          </Button>
          <Link to="/hr/jobs/create">
            <Button variant="gradient" className="gap-1.5 text-xs shadow-md shadow-primary/20">
              <PlusCircle className="h-4 w-4" /> New Job
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Hiring Overview Metrics (Requirement 9) ──────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          title="In Interviews"
          value={scheduledCount}
          icon={Calendar}
          color="indigo"
          description="In active rounds"
        />
        <StatCard
          title="Awaiting HM Review"
          value={hmData ? hmData.counts.feedback_required : 0}
          icon={Award}
          color="amber"
          description="Decision required"
        />
        <StatCard
          title="Structuring Comp"
          value={hmData ? hmData.counts.pending_review : 0}
          icon={Briefcase}
          color="blue"
          description="Proposal stages"
        />
        <StatCard
          title="Pending Approval"
          value={pendingOffers.length}
          icon={Clock}
          color="purple"
          description="Awaiting sign-off"
        />
        <StatCard
          title="Offers Sent"
          value={pendingOffers.filter(o => o.status === "SENT").length}
          icon={Send}
          color="blue"
          description="Candidate review"
        />
        <StatCard
          title="Finalized Hires"
          value={hiredOffers.length}
          icon={CheckCircle2}
          color="emerald"
          description="Accepted offers"
        />
      </div>

      {/* Visual Talent Pipeline Funnel Chart */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3 min-w-0 overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold font-outfit uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-primary" />
              Talent Pipeline Funnel & Hiring Conversion
            </h3>
            <p className="text-[11px] text-muted-foreground">Live aggregate candidate distribution across critical hiring milestones</p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-secondary border border-border font-semibold">
            {jobs.length} Active Requisitions
          </span>
        </div>
        <div className="h-[180px] sm:h-[200px] w-full min-w-0 pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { stage: "Sourced & Matched", shortStage: "Sourced", count: Math.max(screenedMatches.length + 5, 8), color: "#6366f1" },
                { stage: "HM Review", shortStage: "HM Review", count: hmData ? hmData.counts.pending_review : 0, color: "#f59e0b" },
                { stage: "Interviews Scheduled", shortStage: "Interviews", count: scheduledCount, color: "#06b6d4" },
                { stage: "Feedback & Evaluation", shortStage: "Feedback", count: hmData ? hmData.counts.feedback_required : 0, color: "#8b5cf6" },
                { stage: "Offers Drafted", shortStage: "Offers", count: pendingOffers.length, color: "#10b981" },
              ]}
              margin={{ top: 10, right: 15, left: -15, bottom: 0 }}
            >
              <XAxis 
                dataKey="shortStage" 
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} 
                tickLine={false} 
                axisLine={{ stroke: "hsl(var(--border))" }} 
              />
              <YAxis 
                allowDecimals={false} 
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} 
                tickLine={false} 
                axisLine={{ stroke: "hsl(var(--border))" }} 
              />
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="p-2.5 rounded-lg bg-popover/95 border border-border shadow-lg text-xs">
                      <span className="font-semibold text-foreground">{data.stage}</span>
                      <div className="text-primary font-bold mt-0.5">{data.count} candidate{data.count !== 1 ? "s" : ""}</div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {[
                  "#6366f1",
                  "#f59e0b",
                  "#06b6d4",
                  "#8b5cf6",
                  "#10b981",
                ].map((col, index) => (
                  <Cell key={`funnel-cell-${index}`} fill={col} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── TAB: Recent Hires (Requirement 9) ─────────────────────────── */}
      {activeTab === "recent_hires" && (
        <div className="bg-card border border-emerald-500/30 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/70 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
                <h3 className="text-base font-bold font-outfit text-foreground tracking-tight">
                  Recent Hires
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Successfully hired candidates and confirmed placements (Read-Only)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                {hiredOffers.length} Hired Candidates
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Candidate</th>
                  <th className="py-2.5 px-3">Position</th>
                  <th className="py-2.5 px-3">Recruiter</th>
                  <th className="py-2.5 px-3">Offer</th>
                  <th className="py-2.5 px-3">Joining Date</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {hiredOffers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-muted-foreground">
                      No candidates hired yet. Successfully accepted offers will appear here automatically.
                    </td>
                  </tr>
                ) : (
                  hiredOffers.map((offer) => {
                    const joiningDateStr = offer.expected_joining_date || offer.joining_date
                      ? new Date(offer.expected_joining_date || offer.joining_date!).toLocaleDateString("en-US", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "—";

                  return (
                    <tr
                      key={offer.id}
                      onClick={() => {
                        setSelectedHiredOffer(offer);
                        setHiredModalOpen(true);
                      }}
                      className="hover:bg-muted/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-3">
                        <div className="font-bold text-foreground group-hover:text-primary transition-colors">
                          {offer.candidate_name || "Candidate"}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          #OFF-{offer.id}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-medium text-foreground">
                        {offer.job_title || "Junior Developer"}
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">
                        {offer.recruiter_name || "Sarah HR"}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                          <Check className="w-3 h-3 stroke-[3]" /> Accepted
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-muted-foreground">
                        {joiningDateStr}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                          <Check className="w-3 h-3 stroke-[3]" /> HIRED
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedHiredOffer(offer);
                            setHiredModalOpen(true);
                          }}
                          className="h-7 text-xs px-2.5"
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                    );
                  }))}
                </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: Pending HM Review */}
      {activeTab === "hm_review" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold font-outfit text-foreground flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-400" />
                Candidates Awaiting Hiring Manager Review ({hmData?.pending_review?.length || 0})
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Review candidate credentials, inspect AI fit scorecard, and propose interview time slots.
              </p>
            </div>
          </div>

          {(!hmData?.pending_review || hmData.pending_review.length === 0) ? (
            <Card className="p-12 text-center text-muted-foreground border-dashed">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-semibold">No candidates currently awaiting review.</p>
              <p className="text-xs text-muted-foreground mt-1">When recruiters submit candidate shortlists, they will appear here.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {hmData.pending_review.map((item) => (
                <Card key={item.match_result_id} className="p-5 border-border hover:border-amber-500/40 transition-all flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-amber-400 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                        {item.pipeline_state}
                      </span>
                      <span className="text-sm font-bold font-mono text-cyan-400">
                        {Math.round(item.overall_score)}% Match
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-foreground">{item.candidate_name}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                      Role: <strong className="text-foreground">{item.job_title}</strong>
                    </p>
                    {item.recruiter_name && (
                      <p className="text-xs text-muted-foreground">
                        Submitted by recruiter: <span className="text-foreground">{item.recruiter_name}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                    <Link
                      to={`/hr/candidates/${item.match_result_id}/review`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition-all"
                    >
                      Review & Propose Slots
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: Feedback Required (GO / NO-GO) */}
      {activeTab === "feedback" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold font-outfit text-foreground flex items-center gap-2">
                <Award className="h-5 w-5 text-emerald-400" />
                Interviews Requiring Hiring Manager Feedback ({hmData?.feedback_required?.length || 0})
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Completed interview rounds requiring structured 5-star evaluation and conclusive GO / NO-GO decision.
              </p>
            </div>
          </div>

          {(!hmData?.feedback_required || hmData.feedback_required.length === 0) ? (
            <Card className="p-12 text-center text-muted-foreground border-dashed">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-semibold">No pending interview feedback required.</p>
              <p className="text-xs text-muted-foreground mt-1">When interview datetime passes or recruiters mark interviews done, they appear here.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {hmData.feedback_required.map((item) => (
                <Card key={item.match_result_id} className="p-5 border-border hover:border-emerald-500/40 transition-all flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        Interview Completed
                      </span>
                      <span className="text-sm font-bold font-mono text-cyan-400">
                        {Math.round(item.overall_score)}% Match
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-foreground">{item.candidate_name}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                      Role: <strong className="text-foreground">{item.job_title}</strong>
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                    <Link
                      to={`/hr/interviews/${item.match_result_id}/feedback`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
                    >
                      Submit GO / NO-GO Feedback
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: Offer Approval (HM Review) */}
      {activeTab === "offer_review" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold font-outfit text-foreground flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-purple-400" />
                Offers Awaiting Hiring Manager Review ({pendingOffers.length})
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Review proposed candidate compensation, terms, and employment scope before official PDF generation.
              </p>
            </div>
          </div>

          {pendingOffers.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground border-dashed">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-semibold">No pending offers requiring review.</p>
              <p className="text-xs text-muted-foreground mt-1">
                When recruiters draft offers and submit them for HM sign-off, they will appear here.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {pendingOffers.map((offer) => {
                const currency = offer.salary_currency || "USD";
                const proposedSalary = offer.proposed_salary ? Number(offer.proposed_salary).toLocaleString() : "Not set";
                const isReviewing = reviewingOfferId === offer.id;

                return (
                  <Card key={offer.id} className="p-6 border-border hover:border-purple-500/40 transition-all flex flex-col justify-between gap-5 bg-card/60 backdrop-blur-sm">
                    <div className="space-y-4">
                      {/* Top status bar */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-purple-400 px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center gap-1.5">
                          <Clock className="h-3 w-3" /> Awaiting HM Approval
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Offer #{offer.id}
                        </span>
                      </div>

                      {/* Candidate & Role Info */}
                      <div>
                        <h3 className="text-lg font-bold text-foreground">
                          {offer.candidate_name || `Candidate #${offer.candidate_id}`}
                        </h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                          Position: <strong className="text-foreground">{offer.job_title || `Job #${offer.job_id}`}</strong>
                        </p>
                        {offer.recruiter_name && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Prepared by recruiter: <strong className="text-foreground">{offer.recruiter_name}</strong>
                          </p>
                        )}
                      </div>

                      {/* Key Compensation Metrics */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-background/60 border border-border/50 text-xs">
                        <div>
                          <span className="text-muted-foreground block">Proposed Salary</span>
                          <span className="font-bold text-emerald-400 text-sm">
                            {currency} {proposedSalary}
                          </span>
                        </div>
                        {offer.salary_min && offer.salary_max && (
                          <div>
                            <span className="text-muted-foreground block">Salary Range</span>
                            <span className="font-medium text-foreground">
                              {currency} {Number(offer.salary_min).toLocaleString()} - {Number(offer.salary_max).toLocaleString()}
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="text-muted-foreground block">Employment Type</span>
                          <span className="font-medium text-foreground capitalize">
                            {offer.employment_type?.toLowerCase() || "Full-Time"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Work Mode</span>
                          <span className="font-medium text-foreground">
                            {offer.work_mode || "Hybrid"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Joining Date</span>
                          <span className="font-medium text-foreground">
                            {offer.joining_date ? new Date(offer.joining_date).toLocaleDateString() : (offer.joining_timeline || "Flexible")}
                          </span>
                        </div>
                        {offer.location && (
                          <div>
                            <span className="text-muted-foreground block">Location</span>
                            <span className="font-medium text-foreground">
                              {offer.location}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Recruiter Justification Notes */}
                      {offer.recruiter_comments && (
                        <div className="p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/20 text-xs">
                          <strong className="text-indigo-300 block mb-1">Recruiter Justification:</strong>
                          <p className="text-foreground/90 italic">"{offer.recruiter_comments}"</p>
                        </div>
                      )}

                      {/* HM Review Comments Input */}
                      <div className="space-y-1.5 pt-2">
                        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          HM Feedback / Conditions:
                        </label>
                        <textarea
                          rows={2}
                          value={hmComments[offer.id] || ""}
                          onChange={(e) => setHmComments({ ...hmComments, [offer.id]: e.target.value })}
                          placeholder="e.g., Approved with current comp, or: Please increase base to 130k or adjust joining timeline..."
                          className="w-full text-xs rounded-md bg-background border border-border px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between gap-3 pt-3 border-t border-border">
                      <Link
                        to={`/hr/offers/${offer.id}`}
                        className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-semibold"
                      >
                        <ExternalLink className="h-3 w-3" /> Open Dedicated HM Review Portal
                      </Link>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isReviewing}
                          onClick={() => handleHMOfferDecision(offer.id, "REQUEST_CHANGES")}
                          className="text-xs border-amber-500/40 text-amber-400 hover:bg-amber-500/10 gap-1.5"
                        >
                          <AlertCircle className="h-3.5 w-3.5" />
                          Request Adjustments
                        </Button>
                        <Button
                          variant="gradient"
                          size="sm"
                          disabled={isReviewing}
                          onClick={() => handleHMOfferDecision(offer.id, "APPROVE")}
                          className="text-xs gap-1.5 shadow-md shadow-emerald-500/20"
                        >
                          {isReviewing ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5 text-emerald-300" />
                          )}
                          Approve Offer
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 1: Screened Candidates Awaiting HR Review */}
      {activeTab === "screened" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold font-outfit text-foreground flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-indigo-400" />
                Candidates Forwarded by Recruiters ({filteredMatches.length})
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sort, filter, or bulk-approve candidates to advance into interview rounds.
              </p>
            </div>

            {/* Bulk Approve Button */}
            {selectedIds.length > 0 && (
              <Button
                variant="gradient"
                size="sm"
                onClick={handleBulkApprove}
                disabled={isBulkApproving}
                className="gap-1.5 shadow-md shadow-indigo-500/20 text-xs"
              >
                {isBulkApproving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Approving...
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" /> Approve Selected ({selectedIds.length})
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Filter & Sorting Controls */}
          <Card className="p-3.5 border-border/80 bg-card/60 backdrop-blur-xl">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              {/* Search */}
              <div className="sm:col-span-4 relative">
                <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search candidate or job..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setScreenedPage(1);
                  }}
                  className="pl-8 text-xs h-9"
                />
              </div>

              {/* Status Filter */}
              <div className="sm:col-span-3 flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as any);
                    setScreenedPage(1);
                  }}
                  className="w-full h-9 px-2.5 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="all">All Statuses</option>
                  <option value="screened">Screened (Pending HR)</option>
                  <option value="approved_by_hr">Approved by HR</option>
                  <option value="interview_scheduled">Interview Scheduled</option>
                </select>
              </div>

              {/* Sort By */}
              <div className="sm:col-span-3">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full h-9 px-2.5 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="score_desc">Fit Score: High to Low</option>
                  <option value="score_asc">Fit Score: Low to High</option>
                  <option value="exp_desc">Experience: High to Low</option>
                  <option value="name">Candidate Name (A-Z)</option>
                </select>
              </div>

              {/* Select All Checkbox */}
              <div className="sm:col-span-2 flex items-center justify-end gap-2 text-xs text-muted-foreground">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={
                      paginatedScreened.length > 0 &&
                      paginatedScreened.every((m) => selectedIds.includes(m.id))
                    }
                    onChange={() => toggleSelectAll(paginatedScreened.map((m) => m.id))}
                    className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
                  />
                  <span>Select Page</span>
                </label>
              </div>
            </div>
          </Card>

          {filteredMatches.length === 0 ? (
            <Card className="p-12 text-center border-border/80 bg-card/60 space-y-3">
              <Users className="h-10 w-10 text-muted-foreground mx-auto opacity-40" />
              <h3 className="text-base font-bold text-foreground">No candidate records match criteria</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Try adjusting your search query or status filter to view candidates forwarded by recruiters.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {paginatedScreened.map((match) => {
                  const score = Number(match.overall_score);
                  const isScreened = match.status === "screened";
                  const isApproved = match.status === "approved_by_hr";
                  const isScheduled = match.status === "interview_scheduled";
                  const isRejected = match.status === "rejected";
                  const isSelected = selectedIds.includes(match.id);

                  let scoreBadge = "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
                  if (score < 50) scoreBadge = "text-rose-400 border-rose-500/30 bg-rose-500/10";
                  else if (score < 75) scoreBadge = "text-amber-400 border-amber-500/30 bg-amber-500/10";

                  return (
                    <Card
                      key={match.id}
                      className={`p-6 border-border/80 bg-card/70 backdrop-blur-xl flex flex-col justify-between hover:border-primary/50 transition-all space-y-4 ${
                        isSelected ? "border-primary/70 bg-primary/5" : ""
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectCandidate(match.id)}
                              className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                            />
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-lg font-bold text-foreground font-outfit">
                                  {match.candidate.full_name}
                                </h3>
                                <Badge
                                  variant={
                                    isApproved
                                      ? "success"
                                      : isScheduled
                                      ? "purple"
                                      : isScreened
                                      ? "info"
                                      : isRejected
                                      ? "destructive"
                                      : "secondary"
                                  }
                                >
                                  {match.status.replace(/_/g, " ")}
                                </Badge>
                              </div>

                              <p className="text-xs font-semibold text-primary mt-1">
                                Requisition: {match.job?.title || `Job #${match.job_id}`}
                              </p>

                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pt-1">
                                <span>Experience: {match.candidate.total_experience_years} yrs</span>
                                {match.candidate.phone && <span>• {match.candidate.phone}</span>}
                                {match.job?.work_mode && (
                                  <span className="px-1.5 py-0.5 rounded bg-secondary/80 text-[10px]">
                                    {match.job.work_mode}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Match Score */}
                          <div className={`px-3 py-1.5 rounded-xl border text-center shrink-0 ${scoreBadge}`}>
                            <span className="text-xl font-extrabold font-outfit">{score.toFixed(0)}%</span>
                            <span className="block text-[9px] font-semibold uppercase tracking-wider opacity-80">
                              Fit Score
                            </span>
                          </div>
                        </div>

                        {/* Candidate Skills (Resume Extracted vs Declared) */}
                        <div className="space-y-2 pt-1">
                          {(() => {
                            const resumeSkills = (match.resume_detected_skills && match.resume_detected_skills.length > 0)
                              ? match.resume_detected_skills
                              : (match.candidate.skills || []).filter((s) => s.source === "resume" || s.evidence_text);

                            const declaredSkills = (match.self_declared_skills && match.self_declared_skills.length > 0)
                              ? match.self_declared_skills
                              : (match.candidate.skills || []).filter((s) => s.source !== "resume" && !s.evidence_text);

                            return (
                              <div className="space-y-1.5">
                                {resumeSkills.length > 0 && (
                                  <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1 mb-1.5">
                                      <Sparkles className="h-3 w-3" /> Resume-Extracted Skills:
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {(() => {
                                        const isResumeExpanded = expandedSkillsMatchIds.has(match.id);
                                        const displayedResumeSkills = isResumeExpanded ? resumeSkills : resumeSkills.slice(0, 4);
                                        return (
                                          <>
                                            {displayedResumeSkills.map((rs: any) => {
                                              const sName = rs.name || rs.skill?.name || rs.skill_name || "Skill";
                                              const evText = rs.evidence_text || (rs.source === "resume" ? "Verified from resume" : null);
                                              return (
                                                <span
                                                  key={rs.id || rs.skill_id || sName}
                                                  title={evText ? `Resume Context: "${evText}"` : "Extracted from candidate resume"}
                                                  className="text-xs px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-950 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800/80 font-semibold flex items-center gap-1.5 shadow-xs cursor-help"
                                                >
                                                  <span>{sName}</span>
                                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-200/90 text-emerald-950 dark:bg-emerald-900/90 dark:text-emerald-100 font-mono font-bold tracking-tight">
                                                    [Resume]
                                                  </span>
                                                </span>
                                              );
                                            })}
                                            {resumeSkills.length > 4 && (
                                              <button
                                                type="button"
                                                onClick={() => toggleResumeSkills(match.id)}
                                                className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-200 font-bold bg-emerald-100/70 hover:bg-emerald-200/80 dark:bg-emerald-950/80 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 px-2 py-0.5 rounded-md cursor-pointer transition-colors self-center shadow-2xs"
                                              >
                                                {isResumeExpanded ? (
                                                  <>
                                                    <span>Show less</span>
                                                    <ChevronUp className="h-3 w-3" />
                                                  </>
                                                ) : (
                                                  <>
                                                    <span>+{resumeSkills.length - 4} more</span>
                                                    <ChevronDown className="h-3 w-3" />
                                                  </>
                                                )}
                                              </button>
                                            )}
                                          </>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                )}

                                {declaredSkills.length > 0 && (
                                  <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                                      Self-Declared Skills:
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {(() => {
                                        const isDeclaredExpanded = expandedDeclaredMatchIds.has(match.id);
                                        const displayedDeclared = isDeclaredExpanded ? declaredSkills : declaredSkills.slice(0, 3);
                                        return (
                                          <>
                                            {displayedDeclared.map((ds: any) => (
                                              <span
                                                key={ds.id || ds.skill_id || ds.name}
                                                className="text-xs px-2 py-0.5 rounded bg-secondary/80 text-foreground/80 border border-border/50"
                                              >
                                                {ds.name || ds.skill?.name || ds.skill_name}
                                              </span>
                                            ))}
                                            {declaredSkills.length > 3 && (
                                              <button
                                                type="button"
                                                onClick={() => toggleDeclaredSkills(match.id)}
                                                className="inline-flex items-center gap-1 text-xs text-slate-700 dark:text-slate-300 hover:text-foreground font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 px-2 py-0.5 rounded-md cursor-pointer transition-colors self-center shadow-2xs"
                                              >
                                                {isDeclaredExpanded ? (
                                                  <>
                                                    <span>Show less</span>
                                                    <ChevronUp className="h-3 w-3" />
                                                  </>
                                                ) : (
                                                  <>
                                                    <span>+{declaredSkills.length - 3} more</span>
                                                    <ChevronDown className="h-3 w-3" />
                                                  </>
                                                )}
                                              </button>
                                            )}
                                          </>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* HR Action Buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-border/50">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-xs h-8"
                            onClick={() => setSelectedProfileMatch(match)}
                          >
                            <FileText className="h-3.5 w-3.5 text-primary" /> View Profile
                          </Button>
                          {(match.candidate.resume_file_path || match.candidate.resume_s3_key) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={loadingResumeId === match.candidate.id}
                              className="gap-1 text-xs h-8 text-muted-foreground hover:text-foreground"
                              onClick={() => handleViewResume(match.candidate.id)}
                            >
                              {loadingResumeId === match.candidate.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                              ) : (
                                <ExternalLink className="h-3.5 w-3.5" />
                              )}
                              Resume
                            </Button>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Reject */}
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={updatingMatchId === match.id || isRejected}
                            onClick={() => handleReject(match)}
                            className="text-xs h-8 px-2.5"
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                          </Button>

                          {/* Approve */}
                          {!isApproved && !isScheduled && (
                            <Button
                              size="sm"
                              variant="default"
                              disabled={updatingMatchId === match.id}
                              onClick={() => handleApprove(match)}
                              className="text-xs h-8 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                            >
                              {updatingMatchId === match.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Check className="h-3.5 w-3.5 mr-1" />
                              )}
                              Approve
                            </Button>
                          )}

                          {/* Propose Slots (Request Interview) Modal Trigger */}
                          <Button
                            size="sm"
                            variant="gradient"
                            onClick={() => setSelectedMatchForInterview(match)}
                            className="gap-1 text-xs h-8 px-3 shadow-md shadow-indigo-500/20"
                          >
                            <Calendar className="h-3.5 w-3.5" />
                            {isScheduled ? "Adjust Slots" : "Propose Slots"}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              {totalScreenedPages > 1 && (
                <div className="flex items-center justify-between py-3 border-t border-border/60">
                  <p className="text-xs text-muted-foreground">
                    Page {screenedPage} of {totalScreenedPages} ({filteredMatches.length} candidates)
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={screenedPage <= 1}
                      onClick={() => setScreenedPage((p) => p - 1)}
                      className="gap-1 text-xs h-8"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" /> Prev
                    </Button>
                    <span className="text-xs font-semibold text-foreground px-2">{screenedPage}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={screenedPage >= totalScreenedPages}
                      onClick={() => setScreenedPage((p) => p + 1)}
                      className="gap-1 text-xs h-8"
                    >
                      Next <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Scheduled Interviews */}
      {activeTab === "interviews" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold font-outfit text-foreground flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-emerald-400" />
              Scheduled Interviews ({interviews.length})
            </h2>
          </div>

          {interviews.length === 0 ? (
            <Card className="p-12 text-center border-border/80 bg-card/60 space-y-2">
              <Calendar className="h-10 w-10 text-muted-foreground mx-auto opacity-40" />
              <h3 className="text-base font-bold text-foreground">No interviews scheduled yet</h3>
              <p className="text-xs text-muted-foreground">
                Approve screened candidates and click <strong>"Schedule Interview"</strong> to arrange hiring rounds.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paginatedInterviews.map((iv) => (
                  <Card
                    key={iv.id}
                    className="p-5 border-border/80 bg-card/70 backdrop-blur-xl space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-base font-bold text-foreground">
                            {iv.candidate_name || "Candidate"}
                          </h3>
                          <p className="text-xs font-semibold text-primary">
                            Position: {iv.job_title || "Job Position"}
                          </p>
                        </div>
                        <Badge variant="purple">{iv.status}</Badge>
                      </div>

                      <div className="p-3 rounded-lg bg-secondary/40 border border-border/60 space-y-1.5 text-xs">
                        <div className="flex items-center gap-2 text-foreground font-medium">
                          <Clock className="h-3.5 w-3.5 text-indigo-400" />
                          <span>
                            {iv.interview_date
                              ? new Date(iv.interview_date).toLocaleString([], {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })
                              : "Date TBD (Slot Selection Pending)"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Video className="h-3.5 w-3.5 text-purple-400" />
                            Format: <strong>{iv.interview_type}</strong>
                          </span>
                          <Badge variant="secondary" className="text-[10px] uppercase">
                            {iv.interview_mode || "Online"}
                          </Badge>
                        </div>
                        {iv.scheduler_name && (
                          <div className="text-muted-foreground text-[11px]">
                            Scheduled by: {iv.scheduler_name} (HR)
                          </div>
                        )}
                        {iv.meeting_link && (
                          <div className="pt-1 flex items-center gap-1.5">
                            <a
                              href={iv.meeting_link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline text-xs flex items-center gap-1 font-semibold truncate max-w-full"
                            >
                              <LinkIcon className="h-3 w-3 shrink-0" />
                              <span className="truncate">{iv.meeting_link}</span>
                            </a>
                          </div>
                        )}
                      </div>

                      {iv.feedback && (
                        <p className="text-xs text-muted-foreground bg-card/50 p-2.5 rounded-lg border border-border/40 italic">
                          "{iv.feedback}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
                      {iv.interview_date ? (
                        <GoogleCalendarButton
                          {...buildInterviewCalendarEvent({
                            candidateName: iv.candidate_name || "Candidate",
                            jobTitle: iv.job_title || "Position",
                            interviewType: iv.interview_type || "Interview",
                            scheduledDate: iv.interview_date,
                            meetingLink: iv.meeting_link || undefined,
                            recruiterName: iv.scheduler_name || undefined,
                          })}
                          size="sm"
                          variant="outline"
                          label="Add to Calendar"
                        />
                      ) : (
                        <span className="text-[11px] text-muted-foreground">
                          Dispatched to candidate
                        </span>
                      )}
                      <Badge variant="success" className="text-[10px]">
                        Confirmed
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Pagination Controls for Interviews */}
              {totalInterviewPages > 1 && (
                <div className="flex items-center justify-between py-3 border-t border-border/60">
                  <p className="text-xs text-muted-foreground">
                    Page {interviewPage} of {totalInterviewPages} ({interviews.length} scheduled)
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={interviewPage <= 1}
                      onClick={() => setInterviewPage((p) => p - 1)}
                      className="gap-1 text-xs h-8"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" /> Prev
                    </Button>
                    <span className="text-xs font-semibold text-foreground px-2">{interviewPage}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={interviewPage >= totalInterviewPages}
                      onClick={() => setInterviewPage((p) => p + 1)}
                      className="gap-1 text-xs h-8"
                    >
                      Next <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Job Requisitions Managed by HR */}
      {activeTab === "jobs" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold font-outfit text-foreground flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                Job Requisitions ({jobs.length})
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage job requirements. Publishing a job requisition activates it and triggers candidate matching automatically.
              </p>
            </div>
            <Link to="/hr/jobs/create">
              <Button variant="gradient" size="sm" className="gap-1.5 text-xs">
                <PlusCircle className="h-4 w-4" /> Create Requisition
              </Button>
            </Link>
          </div>

          {jobs.length === 0 ? (
            <Card className="p-12 text-center border-border/80 bg-card/60">
              <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <h3 className="text-base font-bold text-foreground">No Job Requisitions Yet</h3>
              <p className="text-xs text-muted-foreground mt-1 mb-4 max-w-sm mx-auto">
                HR owns the requisition lifecycle. Create your first job requirement to start AI-powered matching.
              </p>
              <Link to="/hr/jobs/create">
                <Button variant="gradient" size="sm" className="gap-2">
                  <PlusCircle className="h-4 w-4" /> Create First Job
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedJobs.map((job) => (
                  <Card
                    key={job.id}
                    className="p-5 border-border/80 bg-card/70 hover:border-border transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-bold text-foreground truncate">
                            {job.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground mt-1">
                            {job.client_name && (
                              <span className="flex items-center gap-1 text-foreground font-medium">
                                <Building className="h-3 w-3 text-indigo-400" /> {job.client_name}
                              </span>
                            )}
                            {job.department && <span>• {job.department}</span>}
                          </div>
                        </div>
                        <Badge
                          variant={
                            job.status === "active"
                              ? "success"
                              : job.status === "draft"
                              ? "secondary"
                              : "destructive"
                          }
                          className="capitalize text-[10px]"
                        >
                          {job.status}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {job.work_mode && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary/80 text-[10px]">
                            <Laptop className="h-2.5 w-2.5 text-primary" /> {job.work_mode}
                          </span>
                        )}
                        {job.location_city && (
                          <span className="flex items-center gap-1 text-[10px]">
                            <MapPin className="h-2.5 w-2.5 text-muted-foreground" /> {job.location_city}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-[10px]">
                          <Clock className="h-2.5 w-2.5" />
                          {job.min_experience_years === 0 ? "Entry Level" : `${job.min_experience_years}+ yrs`}
                        </span>
                        {job.urgency && (
                          <span className="text-[10px] text-amber-400 font-medium">
                            • {job.urgency}
                          </span>
                        )}
                      </div>

                      {/* Skills */}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {job.job_skills?.slice(0, 4).map((js) => (
                          <span
                            key={js.id}
                            className={`text-[10px] px-1.5 py-0.5 rounded border ${
                              js.requirement_type === "required"
                                ? "bg-primary/10 border-primary/20 text-primary font-medium"
                                : "bg-secondary/60 border-border/50 text-muted-foreground"
                            }`}
                          >
                            {js.skill.name}
                          </span>
                        ))}
                        {(job.job_skills?.length || 0) > 4 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/60 text-muted-foreground border border-border/50">
                            +{(job.job_skills?.length || 0) - 4}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-4 mt-3 border-t border-border/60">
                      <div className="flex items-center gap-2">
                        {job.status === "draft" && (
                          <Button
                            size="sm"
                            variant="gradient"
                            className="h-7 text-xs px-2.5 gap-1"
                            disabled={publishingJobId === job.id}
                            onClick={() => handlePublishJob(job.id)}
                          >
                            {publishingJobId === job.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Sparkles className="h-3 w-3" />
                            )}
                            Publish & Match
                          </Button>
                        )}
                        {job.status === "active" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                            onClick={() => handleCloseJob(job.id)}
                          >
                            Close
                          </Button>
                        )}
                        {job.status === "closed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2"
                            onClick={() => handlePublishJob(job.id)}
                          >
                            Re-Open
                          </Button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs px-2 gap-1 text-foreground"
                          onClick={() => setSelectedJobForRecruiters({ id: job.id, title: job.title })}
                        >
                          <Users className="h-3 w-3 text-primary" /> Recruiters
                        </Button>
                        <Link to={`/hr/jobs/${job.id}/matches`}>
                          <Button size="sm" variant="ghost" className="h-7 text-xs px-2.5 gap-1 text-primary hover:bg-primary/10">
                            <Sparkles className="h-3 w-3" /> View Matches
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Jobs Pagination */}
              {totalJobsPages > 1 && (
                <div className="flex items-center justify-between py-3 border-t border-border/60">
                  <p className="text-xs text-muted-foreground">
                    Page {jobsPage} of {totalJobsPages} ({jobs.length} requisitions)
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={jobsPage <= 1}
                      onClick={() => setJobsPage((p) => p - 1)}
                      className="gap-1 text-xs h-8"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" /> Prev
                    </Button>
                    <span className="text-xs font-semibold text-foreground px-2">{jobsPage}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={jobsPage >= totalJobsPages}
                      onClick={() => setJobsPage((p) => p + 1)}
                      className="gap-1 text-xs h-8"
                    >
                      Next <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── 3-WAY INTERVIEW REQUEST MODAL (HM Proposes >=2 Slots -> Recruiter -> Candidate) ── */}
      {selectedMatchForInterview && (
        <RequestInterviewModal
          isOpen={Boolean(selectedMatchForInterview)}
          onClose={() => setSelectedMatchForInterview(null)}
          match={selectedMatchForInterview}
          onSuccess={() => {
            fetchData();
          }}
        />
      )}

      {/* ── CANDIDATE PROFILE MODAL ─────────────────────────────────────────── */}
      {selectedProfileMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
          <Card className="w-full max-w-lg border-border/80 bg-card p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold font-outfit text-foreground">
                  {selectedProfileMatch.candidate.full_name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedProfileMatch(null)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground">Experience</span>
                <span className="font-semibold text-foreground">
                  {selectedProfileMatch.candidate.total_experience_years} Years
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-semibold text-foreground">
                  {selectedProfileMatch.candidate.phone || "Not provided"}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground">Job Match Score</span>
                <span className="font-extrabold text-emerald-400">
                  {Number(selectedProfileMatch.overall_score).toFixed(0)}%
                </span>
              </div>
            </div>

            {/* Skills: Resume Extracted vs Declared */}
            <div className="space-y-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1 mb-2">
                  <Sparkles className="h-3.5 w-3.5" /> Resume-Extracted & Matched Skills
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {((selectedProfileMatch.resume_detected_skills && selectedProfileMatch.resume_detected_skills.length > 0)
                    ? selectedProfileMatch.resume_detected_skills
                    : selectedProfileMatch.candidate.skills.filter((s) => s.source === "resume" || s.evidence_text)
                  ).map((cs: any) => (
                    <div
                      key={cs.id || cs.skill_id}
                      title={cs.evidence_text ? `Evidence: "${cs.evidence_text}"` : "Extracted from resume"}
                      className="p-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-between text-xs"
                    >
                      <span className="font-semibold text-foreground truncate">{cs.name || cs.skill?.name || cs.skill_name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-200 font-mono font-bold shrink-0">
                        Resume
                      </span>
                    </div>
                  ))}
                  {((selectedProfileMatch.resume_detected_skills && selectedProfileMatch.resume_detected_skills.length > 0)
                    ? selectedProfileMatch.resume_detected_skills
                    : selectedProfileMatch.candidate.skills.filter((s) => s.source === "resume" || s.evidence_text)
                  ).length === 0 && (
                    <span className="text-xs text-muted-foreground col-span-2 italic">
                      No automated resume extractions. Check declared skills below.
                    </span>
                  )}
                </div>
              </div>

              {selectedProfileMatch.candidate.skills.filter((s) => s.source !== "resume" && !s.evidence_text).length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Self-Declared Skills
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedProfileMatch.candidate.skills
                      .filter((s) => s.source !== "resume" && !s.evidence_text)
                      .map((cs) => (
                        <div
                          key={cs.id}
                          className="p-2 rounded-lg border border-border/70 bg-secondary/30 flex items-center justify-between text-xs"
                        >
                          <span className="font-semibold text-foreground truncate">{cs.skill.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium shrink-0">
                            {cs.proficiency_level || "Declared"}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border/70">
              {selectedProfileMatch.candidate.resume_file_path || selectedProfileMatch.candidate.resume_s3_key ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => handleViewResume(selectedProfileMatch.candidate.id)}
                >
                  <FileText className="h-3.5 w-3.5 text-primary" /> Open Full Resume
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground italic">No resume file uploaded</span>
              )}

              <Button
                variant="gradient"
                size="sm"
                onClick={() => {
                  const match = selectedProfileMatch;
                  setSelectedProfileMatch(null);
                  setSelectedMatchForInterview(match);
                }}
              >
                Propose Interview Slots
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Assign Recruiters Modal */}
      {selectedJobForRecruiters && (
        <AssignRecruiterModal
          isOpen={Boolean(selectedJobForRecruiters)}
          onClose={() => setSelectedJobForRecruiters(null)}
          jobId={selectedJobForRecruiters.id}
          jobTitle={selectedJobForRecruiters.title}
          onAssignmentUpdated={() => fetchData()}
        />
      )}

      {/* ── HM RECENT HIRE INSPECTION MODAL (Requirement 9) ───────── */}
      {selectedHiredOffer && (
        <Dialog open={hiredModalOpen} onOpenChange={setHiredModalOpen}>
          <DialogContent className="max-w-md bg-card border-border shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold font-outfit text-foreground flex items-center justify-between">
                <span>{selectedHiredOffer.candidate_name}</span>
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                  HIRED ✓
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Hiring Manager placement confirmation record (Read-Only).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg bg-muted/40 border border-border/70">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Position</span>
                  <span className="font-bold text-foreground text-sm mt-0.5 block">
                    {selectedHiredOffer.job_title}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Managing Recruiter</span>
                  <span className="font-bold text-foreground text-sm mt-0.5 block">
                    {selectedHiredOffer.recruiter_name || "Sarah HR"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Joining Date</span>
                  <span className="font-bold text-foreground text-sm font-mono mt-0.5 block">
                    {selectedHiredOffer.expected_joining_date || selectedHiredOffer.joining_date
                      ? new Date(selectedHiredOffer.expected_joining_date || selectedHiredOffer.joining_date!).toLocaleDateString("en-US", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "01 Oct 2026"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Compensation</span>
                  <span className="font-bold text-foreground text-sm font-mono mt-0.5 block">
                    ₹{(selectedHiredOffer.total_compensation || selectedHiredOffer.proposed_salary || 720000).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Verified Checklist */}
              <div className="space-y-2 p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs">
                <span className="font-bold text-emerald-800 dark:text-emerald-300 block text-[11px] uppercase tracking-wider">
                  Hiring Verification Milestones
                </span>
                <div className="space-y-1.5 text-emerald-700 dark:text-emerald-300 font-medium">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Offer Approved by Hiring Manager</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Candidate Accepted Formal Offer</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Candidate Hired & Transitioned to Onboarding</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-secondary/40 border border-border text-[11px] text-muted-foreground">
                <strong>Policy Compliance Notice:</strong> Candidate acceptance is legally finalized and confirmed. Historical recruitment and compensation records cannot be altered.
              </div>

              <div className="flex justify-end pt-2 border-t border-border">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setHiredModalOpen(false)}
                  className="text-xs h-8"
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
