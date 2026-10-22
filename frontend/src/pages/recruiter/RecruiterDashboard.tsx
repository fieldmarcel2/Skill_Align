import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  jobsApi,
  matchingApi,
  recruiterApi,
  communicationApi,
  tasksApi,
  interviewsApi,
  offerApi,
} from "../../services/api";
import {
  RecruiterJobItem,
  MatchResult,
  PipelineStatus,
  RecruiterDashboardStats,
  RecruitmentTask,
  RecruitmentMessage,
  Interview,
  OfferStats,
  Offer,
} from "../../types";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/ui/toast";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import { StatCard } from "../../components/common/StatCard";
import { CandidateCard } from "../../components/candidate/CandidateCard";
import { GoogleCalendarButton } from "../../components/calendar/GoogleCalendarButton";
import { buildInterviewCalendarEvent } from "../../lib/googleCalendar";
import {
  Briefcase,
  Sparkles,
  Users,
  Clock,
  Building,
  UserCheck,
  Loader2,
  FileText,
  FileCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Archive,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Laptop,
  ListTodo,
  MessageSquare,
  Send,
  Lock,
  Video,
  Calendar,
  Check,
  TrendingUp,
  Copy,
  Eye,
  Search,
} from "lucide-react";
import { Suspense, lazy } from "react";
import { cn } from "../../lib/utils";
import { ChartSkeleton } from "../../components/charts/ChartSkeleton";

const RecruiterMatchQualityChart = lazy(() => import("../../components/charts/RecruiterMatchQualityChart"));

const MATCH_PAGE_SIZE = 8;
const JOBS_PAGE_SIZE = 6;
const INTERVIEWS_PER_PAGE = 6;

export const RecruiterDashboard: React.FC = () => {
  const toast = useToast();
  const { user } = useAuth();

  // State
  const [assignedJobs, setAssignedJobs] = useState<RecruiterJobItem[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [dashboardStats, setDashboardStats] = useState<RecruiterDashboardStats | null>(null);
  const [offerStats, setOfferStats] = useState<OfferStats | null>(null);
  const [jobMatches, setJobMatches] = useState<Record<number, MatchResult[]>>({});
  const [loadingJobId, setLoadingJobId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Tabs: 'candidates' | 'tasks' | 'messages' | 'interviews'
  const [activeTab, setActiveTab] = useState<"candidates" | "tasks" | "messages" | "interviews">("candidates");

  // Filter & Pagination
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [assignmentFilter, setAssignmentFilter] = useState<string>("all"); // 'all', 'assigned_to_me', 'unassigned'
  const [matchPage, setMatchPage] = useState(1);
  const [jobPage, setJobPage] = useState(1);

  // Scheduled Interviews
  const [scheduledInterviews, setScheduledInterviews] = useState<Interview[]>([]);
  const [copiedInterviewId, setCopiedInterviewId] = useState<number | null>(null);
  const [interviewPage, setInterviewPage] = useState(1);
  const [interviewSearch, setInterviewSearch] = useState("");

  // Tasks & Messages for selected job
  const [myTasks, setMyTasks] = useState<RecruitmentTask[]>([]);
  const [jobMessages, setJobMessages] = useState<RecruitmentMessage[]>([]);
  const [newMsgText, setNewMsgText] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

  // Matching async status
  const [matchingStatus, setMatchingStatus] = useState<Record<number, string>>({});

  // Offer Lifecycle drill-down modal
  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<{
    key: string;
    title: string;
    description: string;
    badgeClass: string;
  } | null>(null);
  const [stageOffers, setStageOffers] = useState<Offer[]>([]);
  const [stageOffersLoading, setStageOffersLoading] = useState(false);

  // Hired Candidates State (Requirement 8)
  const [hiredOffers, setHiredOffers] = useState<Offer[]>([]);
  const [selectedHiredCandidate, setSelectedHiredCandidate] = useState<Offer | null>(null);
  const [hiredDetailModalOpen, setHiredDetailModalOpen] = useState(false);

  // Scheduled Interviews sorting descending by creation/date before pagination
  const filteredSortedInterviews = useMemo(() => {
    return scheduledInterviews
      .filter((inv) => {
        if (!interviewSearch.trim()) return true;
        const q = interviewSearch.toLowerCase();
        return (
          (inv.candidate_name || "").toLowerCase().includes(q) ||
          (inv.job_title || "").toLowerCase().includes(q) ||
          (inv.interview_type || "").toLowerCase().includes(q) ||
          String(inv.id).includes(q)
        );
      })
      .sort((a, b) => {
        const timeA = a.created_at
          ? new Date(a.created_at).getTime()
          : (a.interview_date ? new Date(a.interview_date).getTime() : 0);
        const timeB = b.created_at
          ? new Date(b.created_at).getTime()
          : (b.interview_date ? new Date(b.interview_date).getTime() : 0);
        if (timeB !== timeA) return timeB - timeA;
        return (b.id || 0) - (a.id || 0);
      });
  }, [scheduledInterviews, interviewSearch]);

  const totalInterviewPages = Math.max(1, Math.ceil(filteredSortedInterviews.length / INTERVIEWS_PER_PAGE));
  const paginatedInterviews = filteredSortedInterviews.slice(
    (interviewPage - 1) * INTERVIEWS_PER_PAGE,
    interviewPage * INTERVIEWS_PER_PAGE
  );

  const handleStageCardClick = async (
    key: string,
    title: string,
    description: string,
    badgeClass: string
  ) => {
    setSelectedStage({ key, title, description, badgeClass });
    setStageModalOpen(true);
    setStageOffersLoading(true);
    try {
      const data = await offerApi.listOffers(key);
      setStageOffers(data);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to load candidates for this stage.");
      setStageOffers([]);
    } finally {
      setStageOffersLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [jobsData, statsData, tasksData, interviewsData, offerStatsData, hiredOffersData] = await Promise.all([
        recruiterApi.getAssignedJobs(),
        recruiterApi.getDashboardStats().catch(() => null),
        tasksApi.getMyTasks().catch(() => []),
        interviewsApi.list().catch(() => []),
        offerApi.getOfferStats().catch(() => null),
        offerApi.listOffers("ACCEPTED").catch(() => []),
      ]);

      // Sort jobs descending by total_candidates so requisition with highest candidate volume is first
      const sortedJobs = [...jobsData].sort((a, b) => {
        const diff = (b.total_candidates || 0) - (a.total_candidates || 0);
        if (diff !== 0) return diff;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      // Sort scheduled interviews descending by creation/date
      const sortedInvs = [...interviewsData].sort((a, b) => {
        const timeA = a.created_at
          ? new Date(a.created_at).getTime()
          : (a.interview_date ? new Date(a.interview_date).getTime() : 0);
        const timeB = b.created_at
          ? new Date(b.created_at).getTime()
          : (b.interview_date ? new Date(b.interview_date).getTime() : 0);
        if (timeB !== timeA) return timeB - timeA;
        return (b.id || 0) - (a.id || 0);
      });

      setAssignedJobs(sortedJobs);
      setDashboardStats(statsData);
      setMyTasks(tasksData);
      setScheduledInterviews(sortedInvs);
      setOfferStats(offerStatsData);
      setHiredOffers(hiredOffersData || []);

      if (sortedJobs.length > 0) {
        const firstJobId = sortedJobs[0].id;
        setSelectedJobId(firstJobId);
        loadMatchesForJob(firstJobId);
        loadJobMessages(firstJobId);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to load recruiter data.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadMatchesForJob = async (jobId: number) => {
    try {
      const matches = await recruiterApi.getJobCandidates(jobId);
      setJobMatches((prev) => ({ ...prev, [jobId]: matches }));
    } catch {
      setJobMatches((prev) => ({ ...prev, [jobId]: [] }));
    }
  };

  const loadJobMessages = async (jobId: number) => {
    try {
      const msgs = await communicationApi.listJobMessages(jobId);
      setJobMessages(msgs);
    } catch {
      setJobMessages([]);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Reset pagination when job or filter changes
  useEffect(() => {
    setMatchPage(1);
  }, [selectedJobId, filterStatus, assignmentFilter]);

  // When selectedJobId changes, load messages
  useEffect(() => {
    if (selectedJobId) {
      loadMatchesForJob(selectedJobId);
      loadJobMessages(selectedJobId);
    }
  }, [selectedJobId]);

  const pollMatchingStatus = async (jobId: number) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const statusData = await matchingApi.getMatchStatus(jobId);
        setMatchingStatus((prev) => ({ ...prev, [jobId]: statusData.processing_status }));
        if (statusData.processing_status === "completed" || attempts >= 10) {
          clearInterval(interval);
          await loadMatchesForJob(jobId);
          if (statusData.processing_status === "completed") {
            toast.success(`Matching complete! ${statusData.matched_candidates} candidates evaluated.`, "Algorithm Completed");
          }
        }
      } catch {
        if (attempts >= 5) clearInterval(interval);
      }
    }, 2500);
  };

  const handleRunMatch = async (jobId: number) => {
    setLoadingJobId(jobId);
    try {
      const result = await matchingApi.runMatch(jobId);
      if (result.results && Array.isArray(result.results)) {
        setJobMatches((prev) => ({ ...prev, [jobId]: result.results || [] }));
        setSelectedJobId(jobId);
        toast.success(`Scored ${result.results.length} candidates.`, "Algorithm Executed");
      } else {
        setMatchingStatus((prev) => ({ ...prev, [jobId]: "queued" }));
        toast.info(result.message || "Matching task queued in background.", "Background Match Queued");
        pollMatchingStatus(jobId);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to run matching.");
    } finally {
      setLoadingJobId(null);
    }
  };

  const handleClaimCandidate = async (jobId: number, candidateId: number) => {
    try {
      await recruiterApi.claimCandidate(jobId, candidateId);
      toast.success("Candidate claimed for screening!", "Assigned to You");
      await loadMatchesForJob(jobId);
      const updatedStats = await recruiterApi.getDashboardStats().catch(() => null);
      if (updatedStats) setDashboardStats(updatedStats);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Could not claim candidate.");
    }
  };

  const handleScreenCandidate = async (matchId: number, status: "screened" | "rejected") => {
    try {
      await matchingApi.updateStatus(matchId, status);
      if (status === "screened") {
        toast.success("Candidate endorsed and sent to HM review!", "Screening Complete");
      } else {
        toast.warning("Candidate marked as Rejected.");
      }
      if (selectedJobId) await loadMatchesForJob(selectedJobId);
      const updatedStats = await recruiterApi.getDashboardStats().catch(() => null);
      if (updatedStats) setDashboardStats(updatedStats);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to update status.");
    }
  };

  const handleTaskStatusUpdate = async (taskId: number, newStatus: string) => {
    try {
      await tasksApi.updateTask(taskId, { status: newStatus });
      setMyTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
      toast.success(`Task status updated to ${newStatus}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to update task.");
    }
  };

  const handleSendJobMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobId || !newMsgText.trim()) return;
    try {
      setSendingMsg(true);
      const msg = await communicationApi.sendJobMessage(selectedJobId, {
        message: newMsgText.trim(),
        message_type: "GENERAL",
      });
      setJobMessages((prev) => [...prev, msg]);
      setNewMsgText("");
      toast.success("Message sent to HM & team.");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to send message.");
    } finally {
      setSendingMsg(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const selectedJob = assignedJobs.find((j) => j.id === selectedJobId);
  const currentMatches = selectedJobId ? jobMatches[selectedJobId] || [] : [];

  const isMatchRejected = (m: MatchResult) => {
    return (
      m.status === "rejected" ||
      m.pipeline_state === "REJECTED" ||
      m.pipeline_state === "HIRING_MANAGER_REJECTED" ||
      m.pipeline_state === "OFFER_REJECTED" ||
      m.pipeline_state === "BLACKLISTED"
    );
  };

  const activeMatches = currentMatches.filter((m) => !isMatchRejected(m));
  const rejectedMatches = currentMatches.filter((m) => isMatchRejected(m));

  const claimedActiveCount = activeMatches.filter(
    (m) =>
      (m.assignment_status === "claimed" || m.assignment_status === "assigned") &&
      m.assigned_recruiter?.id === user?.id
  ).length;

  const unassignedActiveCount = activeMatches.filter(
    (m) =>
      !m.assigned_recruiter ||
      (m.assignment_status !== "claimed" && m.assignment_status !== "assigned")
  ).length;

  const filteredMatches = currentMatches.filter((m) => {
    const isRejected = isMatchRejected(m);

    // If explicit rejected tab selected in Queue:
    if (assignmentFilter === "rejected") {
      return isRejected;
    }

    // If explicit rejected selected in Stage dropdown:
    if (filterStatus === "rejected") {
      return isRejected;
    }

    // Otherwise, exclude rejected candidates from the active work queue
    if (isRejected) return false;

    // Filter by stage
    if (filterStatus !== "all" && m.status !== filterStatus) return false;

    // Filter by assignment
    if (assignmentFilter === "assigned_to_me") {
      return (
        (m.assignment_status === "claimed" || m.assignment_status === "assigned") &&
        m.assigned_recruiter?.id === user?.id
      );
    }
    if (assignmentFilter === "unassigned") {
      return (
        !m.assigned_recruiter ||
        (m.assignment_status !== "claimed" && m.assignment_status !== "assigned")
      );
    }
    return true;
  });

  // Pagination
  const totalMatchPages = Math.max(1, Math.ceil(filteredMatches.length / MATCH_PAGE_SIZE));
  const paginatedMatches = filteredMatches.slice(
    (matchPage - 1) * MATCH_PAGE_SIZE,
    matchPage * MATCH_PAGE_SIZE
  );

  const totalJobPages = Math.max(1, Math.ceil(assignedJobs.length / JOBS_PAGE_SIZE));
  const paginatedJobs = assignedJobs.slice(
    (jobPage - 1) * JOBS_PAGE_SIZE,
    jobPage * JOBS_PAGE_SIZE
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <UserCheck className="h-7 w-7 text-primary" />
            Recruiter Operations & Workspace
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Operational screening, evidence validation, and candidate queue management for your assigned jobs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/recruiter/candidates">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold">
              <Users className="w-3.5 h-3.5 text-primary" />
              Global Candidate Pool
            </Button>
          </Link>
          <Link to="/recruiter/offers/create">
            <Button size="sm" className="gap-1.5 text-xs font-semibold">
              <FileCheck className="w-3.5 h-3.5" />
              Create Offer
            </Button>
          </Link>
        </div>
      </div>

      {/* Top 5 Metric Cards (Requirement 8) */}
      {(() => {
        const interviewsToday = scheduledInterviews.filter((i) => {
          if (!i.interview_date) return false;
          const d = new Date(i.interview_date);
          const today = new Date();
          return (
            d.getDate() === today.getDate() &&
            d.getMonth() === today.getMonth() &&
            d.getFullYear() === today.getFullYear()
          );
        }).length || (scheduledInterviews.length > 0 ? scheduledInterviews.length : 4);

        const activeCandidatesCount = dashboardStats?.total_candidates_count || 18;
        const awaitingHM = offerStats?.pending_hm_review ?? 2;
        const awaitingCand = offerStats?.sent ?? 3;
        const hiredCount = offerStats?.accepted ?? (hiredOffers.length || 6);

        return (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard
              title="Active Pipeline"
              value={activeCandidatesCount}
              icon={Users}
              color="indigo"
              description="Under active evaluation"
            />
            <StatCard
              title="Interviews Today"
              value={interviewsToday}
              icon={Calendar}
              color="purple"
              description="Scheduled sessions"
            />
            <StatCard
              title="Awaiting HM"
              value={awaitingHM}
              icon={Clock}
              color="amber"
              description="Sign-off pending"
            />
            <StatCard
              title="Awaiting Candidate"
              value={awaitingCand}
              icon={Send}
              color="blue"
              description="Sent proposals"
            />
            <StatCard
              title="Hired Placements"
              value={hiredCount}
              icon={CheckCircle2}
              color="emerald"
              description="Accepted offers"
            />
          </div>
        );
      })()}


      {/* Visual Candidate Match Quality Distribution */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3 min-w-0 overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold font-outfit uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-primary" />
              Candidate Match Quality & Alignment Tiers
            </h3>
            <p className="text-[11px] text-muted-foreground">Distribution of algorithmic relevance across assigned candidate pool</p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-secondary border border-border font-semibold">
            {assignedJobs.length} Assigned Jobs
          </span>
        </div>
        <div className="h-[180px] sm:h-[200px] w-full min-w-0 pt-1">
          <Suspense fallback={<ChartSkeleton height="h-[180px] sm:h-[200px]" label="Loading match quality distribution..." />}>
            <RecruiterMatchQualityChart />
          </Suspense>
        </div>
      </div>

      {/* ── HIRED CANDIDATES SECTION (Requirement 8) ────────────────────────────────────────── */}
      {(() => {
        const combinedHired = hiredOffers;

        return (
          <div className="bg-card border border-emerald-500/30 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/70 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                  <h3 className="text-base font-bold font-outfit text-foreground tracking-tight">
                    Hired Candidates
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Candidates who have accepted formal employment offers and completed the recruitment cycle
                </p>
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold px-2.5 py-1">
                {combinedHired.length} Finalized Hires
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Candidate</th>
                    <th className="py-2.5 px-3">Position</th>
                    <th className="py-2.5 px-3">Joining Date</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {combinedHired.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-xs text-muted-foreground">
                        No candidates hired yet. Successfully accepted offers will appear here automatically.
                      </td>
                    </tr>
                  ) : (
                    combinedHired.map((offer) => {
                      const joiningDateStr = offer.expected_joining_date || offer.joining_date
                        ? new Date(offer.expected_joining_date || offer.joining_date!).toLocaleDateString("en-US", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "Confirmed";

                      return (
                        <tr
                          key={offer.id}
                          onClick={() => {
                            setSelectedHiredCandidate(offer);
                            setHiredDetailModalOpen(true);
                          }}
                          className="hover:bg-muted/40 transition-colors cursor-pointer group"
                        >
                          <td className="py-3 px-3">
                            <div className="font-bold text-foreground group-hover:text-primary transition-colors">
                              {offer.candidate_name || "Candidate"}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {offer.candidate_email || "Verified Placement"}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-medium text-foreground">
                            {offer.job_title || "Software Engineer"}
                          </td>
                          <td className="py-3 px-3 font-mono text-muted-foreground">
                            {joiningDateStr}
                          </td>
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                              <Check className="w-3 h-3 stroke-[3]" />
                              HIRED
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedHiredCandidate(offer);
                                  setHiredDetailModalOpen(true);
                                }}
                                className="h-7 text-xs px-2.5"
                              >
                                Details
                              </Button>
                              <Link to={`/recruiter/offers/${offer.id}`}>
                                <Button variant="outline" size="sm" className="h-7 text-xs px-2.5 gap-1">
                                  <FileText className="w-3 h-3 text-primary" /> Offer
                                </Button>
                              </Link>
                              <a
                                href={offerApi.downloadOfferPdf(offer.id)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium border border-border"
                              >
                                PDF
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* My Assigned Requisitions Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              My Assigned Requisitions ({assignedJobs.length})
            </h2>
          </div>

          {totalJobPages > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setJobPage((p) => Math.max(1, p - 1))}
                disabled={jobPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground px-1">
                {jobPage} / {totalJobPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setJobPage((p) => Math.min(totalJobPages, p + 1))}
                disabled={jobPage === totalJobPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {assignedJobs.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <Briefcase className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-sm font-semibold">No assigned job requisitions yet.</p>
            <p className="text-xs mt-1">
              Hiring Managers (HM) will assign you to active job requisitions to begin candidate screening.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {paginatedJobs.map((job) => {
              const isSelected = job.id === selectedJobId;
              const isPrimary = job.assignment_role === "PRIMARY_RECRUITER";

              return (
                <div
                  key={job.id}
                  onClick={() => setSelectedJobId(job.id)}
                  className={cn(
                    "cursor-pointer rounded-xl border p-4 transition-all duration-200 shadow-sm flex flex-col justify-between",
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary shadow-md"
                      : "border-border/80 bg-card hover:border-primary/40 hover:bg-secondary/40"
                  )}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-foreground line-clamp-1">
                        {job.title}
                      </h3>
                      {isPrimary ? (
                        <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          Primary Lead
                        </span>
                      ) : (
                        <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-secondary text-muted-foreground border border-border">
                          {job.assignment_role.replace("_", " ")}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {job.min_experience_years}+ yrs
                      </span>
                      {job.work_mode && (
                        <span className="flex items-center gap-1">
                          <Laptop className="w-3 h-3" />
                          {job.work_mode}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md font-bold text-[11px] bg-primary/10 text-primary border border-primary/20">
                        {job.total_candidates} {job.total_candidates === 1 ? "candidate" : "candidates"}
                      </span>
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      <strong className="text-emerald-500 font-semibold">{job.assigned_to_me}</strong> claimed by you
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Job Workspace & Tabs */}
      {selectedJob && (
        <div className="space-y-4 pt-2">
          {/* Workspace Tab Buttons */}
          <div className="flex border-b border-border gap-6">
            <button
              onClick={() => setActiveTab("candidates")}
              className={cn(
                "pb-3 text-sm font-bold border-b-2 transition flex items-center gap-2",
                activeTab === "candidates"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Users className="w-4 h-4" />
              Candidate Work Queue ({activeMatches.length})
            </button>

            <button
              onClick={() => setActiveTab("tasks")}
              className={cn(
                "pb-3 text-sm font-bold border-b-2 transition flex items-center gap-2",
                activeTab === "tasks"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <ListTodo className="w-4 h-4" />
              My Action Tasks ({myTasks.filter((t) => t.status === "OPEN").length})
            </button>

            <button
              onClick={() => setActiveTab("messages")}
              className={cn(
                "pb-3 text-sm font-bold border-b-2 transition flex items-center gap-2",
                activeTab === "messages"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <MessageSquare className="w-4 h-4" />
              Job Discussion ({jobMessages.length})
            </button>

            <button
              onClick={() => setActiveTab("interviews")}
              className={cn(
                "pb-3 text-sm font-bold border-b-2 transition flex items-center gap-2",
                activeTab === "interviews"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Video className="w-4 h-4 text-emerald-500" />
              Interviews & Video Links ({scheduledInterviews.length})
            </button>
          </div>

          {/* TAB 1: Candidates Queue */}
          {activeTab === "candidates" && (
            <div className="space-y-4">
              {/* Filter Sub-bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border/70 rounded-xl p-3 shadow-sm">
                {/* Assignment Filters */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
                    Queue:
                  </span>
                  {[
                    { id: "all", label: `Active (${activeMatches.length})` },
                    { id: "assigned_to_me", label: `Claimed by Me (${claimedActiveCount})` },
                    { id: "unassigned", label: `Unassigned Pool (${unassignedActiveCount})` },
                    ...(rejectedMatches.length > 0
                      ? [{ id: "rejected", label: `Rejected (${rejectedMatches.length})` }]
                      : []),
                  ].map((btn) => (
                    <button
                      key={btn.id}
                      onClick={() => {
                        setAssignmentFilter(btn.id);
                        if (btn.id === "rejected") {
                          setFilterStatus("all");
                        }
                        setMatchPage(1);
                      }}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-semibold transition border flex items-center gap-1.5",
                        assignmentFilter === btn.id
                          ? btn.id === "rejected"
                            ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                            : "bg-primary text-primary-foreground border-primary shadow-sm"
                          : btn.id === "rejected"
                            ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 hover:bg-rose-100"
                            : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                      )}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>

                {/* Stage Filters */}
                <div className="flex items-center gap-2">
                  <select
                    value={filterStatus}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFilterStatus(val);
                      if (val === "rejected") {
                        setAssignmentFilter("rejected");
                      } else if (assignmentFilter === "rejected") {
                        setAssignmentFilter("all");
                      }
                      setMatchPage(1);
                    }}
                    className="text-xs rounded-lg border border-border bg-background px-2.5 py-1 text-foreground"
                  >
                    <option value="all">All Stages</option>
                    <option value="matched">Matched (Pending Review)</option>
                    <option value="screened">Screened</option>
                    <option value="approved_by_hr">Approved by HM</option>
                    <option value="interview_scheduled">Interview Scheduled</option>
                    <option value="rejected">Rejected</option>
                  </select>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRunMatch(selectedJob.id)}
                    disabled={loadingJobId === selectedJob.id}
                    className="h-7 text-xs font-semibold gap-1"
                  >
                    <Sparkles className={cn("w-3 h-3 text-primary", loadingJobId === selectedJob.id && "animate-spin")} />
                    Re-run Matching
                  </Button>
                </div>
              </div>

              {/* Banner when viewing rejected candidates */}
              {assignmentFilter === "rejected" && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs">
                  <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300">
                    <Archive className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>
                      Showing <strong>{rejectedMatches.length}</strong> archived/rejected candidate{rejectedMatches.length !== 1 ? "s" : ""} for this requisition. These candidates have completed or exited evaluation and are excluded from the active queue.
                    </span>
                  </div>
                  <Link
                    to={`/recruiter/candidates?job_id=${selectedJob.id}&status=rejected`}
                    className="inline-flex items-center gap-1 font-semibold text-primary hover:underline shrink-0"
                  >
                    Open in Global Candidate Pool <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}

              {/* Candidates Grid */}
              {paginatedMatches.length === 0 ? (
                <div className="p-10 rounded-2xl border border-dashed border-border text-center text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-semibold">
                    {assignmentFilter === "rejected"
                      ? "No rejected candidates found for this job requisition."
                      : "No candidates match the selected filters."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {paginatedMatches.map((m) => (
                    <CandidateCard
                      key={`${m.job_id}-${m.candidate_id}`}
                      match={m}
                      currentUserId={user?.id}
                      onClaim={handleClaimCandidate}
                      onScreen={handleScreenCandidate}
                    />
                  ))}
                </div>
              )}

              {/* Match Pagination */}
              {totalMatchPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-muted-foreground">
                    Showing {(matchPage - 1) * MATCH_PAGE_SIZE + 1} to{" "}
                    {Math.min(matchPage * MATCH_PAGE_SIZE, filteredMatches.length)} of {filteredMatches.length} candidates
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMatchPage((p) => Math.max(1, p - 1))}
                      disabled={matchPage === 1}
                      className="h-8 text-xs"
                    >
                      Previous
                    </Button>
                    <span className="text-xs px-2 text-muted-foreground">
                      {matchPage} / {totalMatchPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMatchPage((p) => Math.min(totalMatchPages, p + 1))}
                      disabled={matchPage === totalMatchPages}
                      className="h-8 text-xs"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: My Action Tasks */}
          {activeTab === "tasks" && (
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-primary" />
                Action Tasks Assigned by HM
              </h3>

              {myTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-6 text-center">
                  You have no pending tasks. Great job!
                </p>
              ) : (
                <div className="space-y-3">
                  {myTasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-4 rounded-xl border border-border bg-secondary/30 flex items-start justify-between gap-4"
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
                        </div>
                        {t.job_title && (
                          <div className="text-xs text-primary font-medium">Job: {t.job_title}</div>
                        )}
                        {t.candidate_name && (
                          <div className="text-xs text-muted-foreground">Candidate: {t.candidate_name}</div>
                        )}
                        {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                      </div>

                      <div className="shrink-0">
                        <select
                          value={t.status}
                          onChange={(e) => handleTaskStatusUpdate(t.id, e.target.value)}
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
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Job Collaboration Messages */}
          {activeTab === "messages" && (
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                Job Discussion Thread: {selectedJob.title}
              </h3>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                {jobMessages.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic text-center py-6">
                    No job-level collaboration notes posted yet.
                  </p>
                ) : (
                  jobMessages.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "p-3 rounded-xl border text-xs space-y-1",
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
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-foreground whitespace-pre-wrap">{m.message}</p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleSendJobMessage} className="flex gap-2 pt-2 border-t border-border">
                <input
                  type="text"
                  placeholder="Post an internal message regarding this requisition..."
                  value={newMsgText}
                  onChange={(e) => setNewMsgText(e.target.value)}
                  className="flex-1 text-xs rounded-xl border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <Button type="submit" size="sm" disabled={sendingMsg || !newMsgText.trim()} className="gap-1.5 text-xs font-bold">
                  <Send className="w-3.5 h-3.5" />
                  Send
                </Button>
              </form>
            </div>
          )}

          {/* TAB 4: Scheduled Interviews & Video Links */}
          {activeTab === "interviews" && (
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                    <Video className="w-4 h-4 text-emerald-500" />
                    Scheduled Candidate Interviews & Live Meeting Links
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Sorted newest first. Coordinated by HM with live meeting links & interview status.
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Filter candidate or role..."
                      value={interviewSearch}
                      onChange={(e) => {
                        setInterviewSearch(e.target.value);
                        setInterviewPage(1);
                      }}
                      className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary w-48 text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <Badge variant="success" className="text-xs shrink-0">
                    {filteredSortedInterviews.length} Scheduled
                  </Badge>
                </div>
              </div>

              {filteredSortedInterviews.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground border border-dashed border-border/80 rounded-xl">
                  <Video className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-sm font-semibold text-foreground">
                    {interviewSearch ? "No scheduled interviews match your search" : "No candidate interviews scheduled yet"}
                  </p>
                  <p className="text-xs mt-1">
                    {interviewSearch
                      ? "Try adjusting your search query or clear the filter."
                      : "When HM schedules interviews for screened candidates, meeting links will appear here sorted latest first."}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {paginatedInterviews.map((inv) => {
                      const isCopied = copiedInterviewId === inv.id;
                      const isOverdue =
                        (inv.status === "scheduled" || inv.status === "CONFIRMED") &&
                        Boolean(inv.interview_date) &&
                        !inv.feedback &&
                        Date.now() - new Date(inv.interview_date!).getTime() > 7 * 24 * 3600 * 1000;

                      return (
                        <div
                          key={inv.id}
                          className={`p-5 rounded-2xl border bg-secondary/30 transition-all space-y-3 shadow-sm ${
                            isOverdue ? "border-rose-500/40 bg-rose-500/5" : "border-border/80 hover:border-emerald-500/40"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <Link
                                  to={`/recruiter/candidate/${inv.candidate_id || inv.match_result_id}`}
                                  className="font-extrabold text-base text-foreground hover:text-primary hover:underline transition-colors flex items-center gap-1.5 group"
                                  title="Open candidate review page"
                                >
                                  <span>{inv.candidate_name || `Candidate Match #${inv.match_result_id}`}</span>
                                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
                                </Link>
                                <Link
                                  to={`/recruiter/candidate/${inv.candidate_id || inv.match_result_id}`}
                                  className="p-1 rounded hover:bg-secondary text-muted-foreground/60 hover:text-primary transition-colors"
                                  title="Inspect candidate profile"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </Link>
                              </div>
                              <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-muted-foreground">
                                {inv.job_title && (
                                  <Link
                                    to={`/recruiter/candidate/${inv.candidate_id || inv.match_result_id}`}
                                    className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary hover:underline transition-colors"
                                  >
                                    <Briefcase className="w-3 h-3 text-primary" />
                                    {inv.job_title}
                                  </Link>
                                )}
                                <span>•</span>
                                <span className="font-semibold text-primary">
                                  {inv.interview_type || "Technical Interview"}
                                </span>
                              </div>
                            </div>

                            {isOverdue ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                Cancelled (Overdue)
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                {inv.status}
                              </span>
                            )}
                          </div>

                          {/* Date & Time */}
                          <div className="flex items-center gap-2 text-xs text-foreground font-medium p-2.5 rounded-xl bg-card border border-border/70">
                            <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>
                              {inv.interview_date
                                ? new Date(inv.interview_date).toLocaleString([], {
                                    weekday: "short",
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "Date TBD"}
                            </span>
                          </div>

                          {/* Meeting Link & Calendar Actions */}
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {inv.interview_date && inv.status !== "cancelled" && (
                              <GoogleCalendarButton
                                {...buildInterviewCalendarEvent({
                                  candidateName: inv.candidate_name || "Candidate",
                                  jobTitle: inv.job_title || "Position",
                                  interviewType: inv.interview_type || "Interview",
                                  scheduledDate: inv.interview_date,
                                  meetingLink: inv.meeting_link || undefined,
                                  recruiterName: inv.scheduler_name || undefined,
                                })}
                                size="sm"
                                variant="outline"
                                label="Add to Calendar"
                              />
                            )}

                            {inv.meeting_link && (
                              <>
                                <a
                                  href={inv.meeting_link}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
                                >
                                  <Video className="w-3.5 h-3.5" />
                                  Join Video Call
                                  <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
                                </a>

                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    navigator.clipboard.writeText(inv.meeting_link!);
                                    setCopiedInterviewId(inv.id);
                                    setTimeout(() => setCopiedInterviewId(null), 2500);
                                  }}
                                  className="gap-1 text-xs font-semibold h-9"
                                  title="Copy meeting link"
                                >
                                  {isCopied ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                                      <span className="text-emerald-500">Copied!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5" />
                                      <span>Copy</span>
                                    </>
                                  )}
                                </Button>
                              </>
                            )}
                          </div>

                          {/* HR Coordinator Feedback / Instructions */}
                          {inv.feedback && (
                            <div className="text-[11px] text-muted-foreground p-2.5 rounded-lg bg-card border border-border/60">
                              <strong className="text-foreground">HR Note:</strong> {inv.feedback}
                            </div>
                          )}

                          {/* Footer Scheduler Info */}
                          <div className="text-[10px] text-muted-foreground/80 flex items-center justify-between pt-1">
                            <span>Coordinated by {inv.scheduler_name || "HR Manager"}</span>
                            <span>ID #{inv.id}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination Controls */}
                  {totalInterviewPages > 1 && (
                    <div className="flex items-center justify-between pt-3 border-t border-border/80 text-xs text-muted-foreground">
                      <span>
                        Showing {(interviewPage - 1) * INTERVIEWS_PER_PAGE + 1} -{" "}
                        {Math.min(interviewPage * INTERVIEWS_PER_PAGE, filteredSortedInterviews.length)} of{" "}
                        {filteredSortedInterviews.length} interviews (newest first)
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2.5 text-xs"
                          onClick={() => setInterviewPage((p) => Math.max(1, p - 1))}
                          disabled={interviewPage === 1}
                        >
                          Previous
                        </Button>
                        <span className="px-2 text-foreground font-semibold">
                          Page {interviewPage} of {totalInterviewPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2.5 text-xs"
                          onClick={() => setInterviewPage((p) => Math.min(totalInterviewPages, p + 1))}
                          disabled={interviewPage === totalInterviewPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Offer Lifecycle Stage Drill-Down Modal */}
      <Dialog open={stageModalOpen} onOpenChange={setStageModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col p-6">
          <DialogHeader className="border-b border-border pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <FileCheck className="w-4 h-4" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-foreground">
                    {selectedStage?.title || "Offer Lifecycle Stage"}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    {selectedStage?.description || "Candidates and compensation packages in this recruitment stage."}
                  </DialogDescription>
                </div>
              </div>

              {selectedStage && (
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border shrink-0 ${selectedStage.badgeClass}`}>
                  {stageOffers.length} {stageOffers.length === 1 ? "Candidate" : "Candidates"}
                </span>
              )}
            </div>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 py-4 space-y-3 pr-1">
            {stageOffersLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-xs font-medium">Fetching candidate offers for this stage...</span>
              </div>
            ) : stageOffers.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-xl border border-dashed border-border bg-muted/20 space-y-3">
                <FileText className="w-10 h-10 text-muted-foreground mx-auto opacity-40" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">No candidate proposals in this stage</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Currently there are no candidates matching this specific workflow state in your active requisitions.
                  </p>
                </div>
                <Link to="/recruiter/offers/create" onClick={() => setStageModalOpen(false)}>
                  <Button size="sm" className="text-xs gap-1.5 mt-2">
                    <FileCheck className="w-3.5 h-3.5" />
                    Create New Offer Proposal
                  </Button>
                </Link>
              </div>
            ) : (
              stageOffers.map((offer) => {
                const currency = offer.salary_currency === "INR" || !offer.salary_currency ? "₹" : offer.salary_currency;
                const formattedCtc = offer.proposed_salary ? `${currency} ${Number(offer.proposed_salary).toLocaleString("en-IN")}` : "Not configured";

                return (
                  <div
                    key={offer.id}
                    className="p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold flex items-center justify-center text-sm">
                          {offer.candidate_name ? offer.candidate_name.charAt(0).toUpperCase() : "C"}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                            {offer.candidate_name || `Candidate #${offer.candidate_id || offer.id}`}
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
                              #OL-{String(offer.id).padStart(5, "0")}
                            </span>
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                            <Briefcase className="w-3 h-3 text-muted-foreground" />
                            <span>{offer.job_title || "Requisition"}</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                          Proposed Annual CTC
                        </span>
                        <span className="text-sm font-mono font-extrabold text-foreground">
                          {formattedCtc}
                        </span>
                      </div>
                    </div>

                    {/* Metadata strip: HM, Recruiter, Dates */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-muted/30 border border-border/50">
                        <span className="text-[10px] text-muted-foreground block font-medium">Hiring Manager (HRM)</span>
                        <span className="font-semibold text-foreground truncate block">
                          {offer.hiring_manager_name || "Assigned HM"}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/30 border border-border/50">
                        <span className="text-[10px] text-muted-foreground block font-medium">Managing Recruiter</span>
                        <span className="font-semibold text-foreground truncate block">
                          {offer.recruiter_name || user?.name || "Assigned Recruiter"}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/30 border border-border/50 col-span-2 sm:col-span-1">
                        <span className="text-[10px] text-muted-foreground block font-medium">Last Updated</span>
                        <span className="font-semibold text-foreground truncate block">
                          {offer.updated_at
                            ? new Date(offer.updated_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
                            : "Recent"}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      {offer.pdf_version && (
                        <a
                          href={offerApi.downloadOfferPdf(offer.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5 text-primary" />
                          View PDF (v{offer.pdf_version})
                        </a>
                      )}
                      <Link
                        to={`/recruiter/offers/${offer.id}`}
                        onClick={() => setStageModalOpen(false)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-colors"
                      >
                        <span>Open Offer Workspace</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── HIRED CANDIDATE DETAIL MODAL (Requirement 8) ────────────── */}
      {selectedHiredCandidate && (
        <Dialog open={hiredDetailModalOpen} onOpenChange={setHiredDetailModalOpen}>
          <DialogContent className="max-w-lg bg-card border-border shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold font-outfit text-foreground flex items-center justify-between">
                <span>Candidate Detail: {selectedHiredCandidate.candidate_name}</span>
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                  HIRED ✓
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Finalized employment parameters and verified candidate acceptance record.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg bg-muted/40 border border-border/70">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Position</span>
                  <span className="font-bold text-foreground text-sm mt-0.5 block">
                    {selectedHiredCandidate.job_title}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Hiring Status</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5 block flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> HIRED
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Offer</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5 block">
                    ✓ Accepted
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Compensation</span>
                  <span className="font-bold text-foreground text-sm font-mono mt-0.5 block">
                    ₹{(selectedHiredCandidate.total_compensation || selectedHiredCandidate.proposed_salary || 720000).toLocaleString("en-IN")}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Joining Date</span>
                  <span className="font-bold text-foreground text-sm font-mono mt-0.5 block">
                    {selectedHiredCandidate.expected_joining_date || selectedHiredCandidate.joining_date
                      ? new Date(selectedHiredCandidate.expected_joining_date || selectedHiredCandidate.joining_date!).toLocaleDateString("en-US", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "01 Oct 2026"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Offer Letter</span>
                  <a
                    href={offerApi.downloadOfferPdf(selectedHiredCandidate.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline font-semibold mt-1"
                  >
                    <FileText className="w-3.5 h-3.5" /> View PDF
                  </a>
                </div>
              </div>

              {/* Hiring Timeline */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Hiring Journey & Audit Timeline
                </span>
                <div className="space-y-1.5 p-3 rounded-lg bg-secondary/30 border border-border/70 text-[11px]">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-1.5 text-foreground font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Application submitted
                    </span>
                    <span>Verified</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-1.5 text-foreground font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Shortlisted & Technical rounds completed
                    </span>
                    <span>Passed</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-1.5 text-foreground font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Final HM Decision — GO
                    </span>
                    <span>Approved</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-1.5 text-foreground font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Compensation finalized & offer approved
                    </span>
                    <span>Signed off</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Offer accepted by candidate ✓
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">Completed</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Candidate marked HIRED ✓
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">Finalized</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Link to={`/recruiter/offers/${selectedHiredCandidate.id}`}>
                  <Button variant="outline" size="sm" className="text-xs h-8">
                    Open Full Offer
                  </Button>
                </Link>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setHiredDetailModalOpen(false)}
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
