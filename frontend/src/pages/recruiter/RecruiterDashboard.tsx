import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  jobsApi,
  matchingApi,
  recruiterApi,
  communicationApi,
  tasksApi,
  interviewsApi,
} from "../../services/api";
import {
  RecruiterJobItem,
  MatchResult,
  PipelineStatus,
  RecruiterDashboardStats,
  RecruitmentTask,
  RecruitmentMessage,
  Interview,
} from "../../types";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/ui/toast";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { StatCard } from "../../components/common/StatCard";
import { CandidateCard } from "../../components/candidate/CandidateCard";
import {
  Briefcase,
  Sparkles,
  Users,
  Clock,
  Building,
  UserCheck,
  Loader2,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
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
  Copy,
  Check,
} from "lucide-react";
import { cn } from "../../lib/utils";

const MATCH_PAGE_SIZE = 8;
const JOBS_PAGE_SIZE = 6;

export const RecruiterDashboard: React.FC = () => {
  const toast = useToast();
  const { user } = useAuth();

  // State
  const [assignedJobs, setAssignedJobs] = useState<RecruiterJobItem[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [dashboardStats, setDashboardStats] = useState<RecruiterDashboardStats | null>(null);
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

  // Tasks & Messages for selected job
  const [myTasks, setMyTasks] = useState<RecruitmentTask[]>([]);
  const [jobMessages, setJobMessages] = useState<RecruitmentMessage[]>([]);
  const [newMsgText, setNewMsgText] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

  // Matching async status
  const [matchingStatus, setMatchingStatus] = useState<Record<number, string>>({});

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [jobsData, statsData, tasksData, interviewsData] = await Promise.all([
        recruiterApi.getAssignedJobs(),
        recruiterApi.getDashboardStats().catch(() => null),
        tasksApi.getMyTasks().catch(() => []),
        interviewsApi.list().catch(() => []),
      ]);

      setAssignedJobs(jobsData);
      setDashboardStats(statsData);
      setMyTasks(tasksData);
      setScheduledInterviews(interviewsData);

      if (jobsData.length > 0) {
        const firstJobId = jobsData[0].id;
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
        toast.success("Candidate endorsed and sent to HR review!", "Screening Complete");
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
      toast.success("Message sent to HR & team.");
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

  const filteredMatches = currentMatches.filter((m) => {
    if (filterStatus !== "all" && m.status !== filterStatus) return false;
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
        </div>
      </div>

      {/* Top 5 Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard
          title="Assigned Jobs"
          value={dashboardStats?.assigned_jobs_count ?? assignedJobs.length}
          icon={Briefcase}
          description="Active requisitions"
        />
        <StatCard
          title="To Review"
          value={dashboardStats?.pending_review_count ?? 0}
          icon={Clock}
          description="Matched candidates"
        />
        <StatCard
          title="Total Matched"
          value={dashboardStats?.total_candidates_count ?? 0}
          icon={Sparkles}
          description="Algorithm evaluated"
        />
        <StatCard
          title="Screened"
          value={dashboardStats?.screened_count ?? 0}
          icon={CheckCircle2}
          description="Sent to HR review"
        />
        <StatCard
          title="Action Tasks"
          value={dashboardStats?.pending_tasks_count ?? myTasks.filter((t) => t.status === "OPEN").length}
          icon={ListTodo}
          description="Pending assignments"
        />
      </div>

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
              HR will assign you to active job requisitions to begin candidate screening.
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
                    <span className="text-muted-foreground">
                      <strong className="text-foreground font-semibold">{job.total_candidates}</strong> candidates
                    </span>
                    <span className="text-muted-foreground">
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
              Candidate Work Queue ({currentMatches.length})
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
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
                    Queue:
                  </span>
                  {[
                    { id: "all", label: "All Candidates" },
                    { id: "assigned_to_me", label: "Claimed by Me" },
                    { id: "unassigned", label: "Unassigned Pool" },
                  ].map((btn) => (
                    <button
                      key={btn.id}
                      onClick={() => setAssignmentFilter(btn.id)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-semibold transition border",
                        assignmentFilter === btn.id
                          ? "bg-primary text-primary-foreground border-primary"
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
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="text-xs rounded-lg border border-border bg-background px-2.5 py-1 text-foreground"
                  >
                    <option value="all">All Stages</option>
                    <option value="matched">Matched (Pending Review)</option>
                    <option value="screened">Screened</option>
                    <option value="approved_by_hr">Approved by HR</option>
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

              {/* Candidates Grid */}
              {paginatedMatches.length === 0 ? (
                <div className="p-10 rounded-2xl border border-dashed border-border text-center text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-semibold">No candidates match the selected filters.</p>
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
                Action Tasks Assigned by HR
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
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                    <Video className="w-4 h-4 text-emerald-500" />
                    Scheduled Candidate Interviews & Live Meeting Links
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Coordinated by HR. Recruiters have full visibility to join sessions and view candidate progress.
                  </p>
                </div>
                <Badge variant="success" className="text-xs">
                  {scheduledInterviews.length} Scheduled
                </Badge>
              </div>

              {scheduledInterviews.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground border border-dashed border-border/80 rounded-xl">
                  <Video className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-sm font-semibold text-foreground">No candidate interviews scheduled yet</p>
                  <p className="text-xs mt-1">
                    When HR schedules interviews for screened and approved candidates, meeting links will appear here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {scheduledInterviews.map((inv) => {
                    const isCopied = copiedInterviewId === inv.id;
                    return (
                      <div
                        key={inv.id}
                        className="p-5 rounded-2xl border border-border/80 bg-secondary/30 hover:border-emerald-500/40 transition-all space-y-3 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="font-extrabold text-base text-foreground block">
                              {inv.candidate_name || `Candidate Match #${inv.match_result_id}`}
                            </span>
                            <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-muted-foreground">
                              {inv.job_title && (
                                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                                  <Briefcase className="w-3 h-3 text-primary" />
                                  {inv.job_title}
                                </span>
                              )}
                              <span>•</span>
                              <span className="font-semibold text-primary">
                                {inv.interview_type || "Technical Interview"}
                              </span>
                            </div>
                          </div>

                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            {inv.status}
                          </span>
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

                        {/* Meeting Link & Actions */}
                        {inv.meeting_link && (
                          <div className="flex items-center gap-2 pt-1">
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
                          </div>
                        )}

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
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
