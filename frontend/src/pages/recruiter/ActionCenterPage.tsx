import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Inbox,
  Send,
  CalendarCheck,
  FileCheck,
  Clock,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Search,
  Activity,
  Layers,
  User,
  Briefcase,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  Zap,
  Target,
  Video,
  Calendar,
  ExternalLink,
  Filter,
  Users,
  PlusCircle,
  FileText,
  ShieldCheck,
  List,
  LayoutGrid,
  Check,
  Eye,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { workflowApi, jobsApi, interviewsApi } from "../../services/api";
import { ActionCenterItem, PipelineState, Job, Interview, AuditLogEntry } from "../../types";
import ActionCenterCard from "../../components/workflow/ActionCenterCard";
import { PipelineStateBar } from "../../components/workflow/PipelineStateBar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";

// State machine: maps each pipeline state to next valid transitions
const STATE_MACHINE: Record<string, { label: string; next: string[]; color: string }> = {
  CANDIDATE_MATCHED:        { label: "Matched",              next: ["CANDIDATE_SHORTLISTED"],                            color: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-800/60 dark:text-indigo-300" },
  CANDIDATE_SHORTLISTED:    { label: "Shortlisted",          next: ["SENT_TO_HIRING_MANAGER"],                           color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800/60 dark:text-blue-300" },
  SENT_TO_HIRING_MANAGER:   { label: "Sent to HM",           next: ["HIRING_MANAGER_REVIEW"],                            color: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:border-sky-800/60 dark:text-sky-300" },
  HIRING_MANAGER_REVIEW:    { label: "HM Reviewing",         next: ["INTERVIEW_SLOTS_PROPOSED", "REJECTED"],             color: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:border-purple-800/60 dark:text-purple-300" },
  INTERVIEW_SLOTS_PROPOSED: { label: "Slots Proposed",       next: ["WAITING_FOR_CANDIDATE_SLOT"],                       color: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800/60 dark:text-amber-300" },
  WAITING_FOR_CANDIDATE_SLOT: { label: "Awaiting Candidate", next: ["CANDIDATE_SLOT_SELECTED"],                          color: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800/60 dark:text-amber-300" },
  CANDIDATE_SLOT_SELECTED:  { label: "Slot Selected",        next: ["INTERVIEW_CONFIRMED"],                              color: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:border-cyan-800/60 dark:text-cyan-300" },
  INTERVIEW_CONFIRMED:      { label: "Interview Confirmed",  next: ["INTERVIEW_COMPLETED"],                              color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-300" },
  INTERVIEW_COMPLETED:      { label: "Interview Done",       next: ["INTERVIEW_GO", "INTERVIEW_NO_GO"],                  color: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:border-purple-800/60 dark:text-purple-300" },
  INTERVIEW_GO:             { label: "GO Decision",          next: ["OFFER_CREATED"],                                    color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-300" },
  INTERVIEW_NO_GO:          { label: "NO-GO Decision",       next: ["REJECTED"],                                         color: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800/60 dark:text-rose-300" },
  OFFER_CREATED:            { label: "Offer Created",        next: ["OFFER_SENT"],                                       color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-300" },
  OFFER_SENT:               { label: "Offer Sent",           next: ["OFFER_ACCEPTED", "OFFER_REJECTED"],                 color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800/60 dark:text-blue-300" },
  OFFER_ACCEPTED:           { label: "Offer Accepted",       next: ["HIRED"],                                            color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-300" },
  HIRED:                    { label: "Hired ✓",              next: [],                                                   color: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/60 dark:border-emerald-700 dark:text-emerald-200" },
  REJECTED:                 { label: "Rejected",             next: [],                                                   color: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800/60 dark:text-rose-300" },
};

export const ActionCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Job ID filter from query parameter
  const rawJobId = searchParams.get("job_id");
  const selectedJobId = rawJobId ? parseInt(rawJobId, 10) : undefined;

  // Active section tab
  const [activeTab, setActiveTab] = useState<"attention" | "schedule" | "activity">("attention");

  // Data states
  const [jobs, setJobs] = useState<Job[]>([]);
  const [items, setItems] = useState<ActionCenterItem[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [activityLogs, setActivityLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // View Mode & Pagination states (High Density Optimization)
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [priorityTab, setPriorityTab] = useState<"ALL" | "URGENT" | "HIGH" | "MEDIUM">("ALL");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [stateMachineModalItem, setStateMachineModalItem] = useState<ActionCenterItem | null>(null);

  // Filters within Needs Attention
  const [search, setSearch] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  // Load available jobs for filter selector
  useEffect(() => {
    const loadJobs = async () => {
      try {
        const data = await jobsApi.list();
        setJobs(data);
      } catch (e) {
        console.error("Failed to load jobs list:", e);
      }
    };
    loadJobs();
  }, []);

  // Fetch Action Center Items, Schedule, and Activity
  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [actionData, interviewsData, activityData] = await Promise.all([
        workflowApi.getActionCenter(selectedJobId),
        interviewsApi.list().catch(() => []),
        workflowApi.getRecentActivity(selectedJobId, 25).catch(() => []),
      ]);

      setItems(actionData);

      // Filter interviews if specific job selected
      if (selectedJobId) {
        setInterviews(interviewsData.filter((i) => i.job_id === selectedJobId));
      } else {
        setInterviews(interviewsData);
      }

      setActivityLogs(activityData);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load Action Center data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();

    const handleUpdate = () => {
      fetchAllData();
    };
    window.addEventListener("action-center-updated", handleUpdate);
    return () => window.removeEventListener("action-center-updated", handleUpdate);
  }, [selectedJobId]);

  const handleJobChange = (jobIdStr: string) => {
    if (!jobIdStr || jobIdStr === "ALL") {
      searchParams.delete("job_id");
    } else {
      searchParams.set("job_id", jobIdStr);
    }
    setSearchParams(searchParams);
    setPage(1);
  };

  const handleCompleteTask = async (item: ActionCenterItem) => {
    setActionLoadingId(item.task_id);
    setError(null);
    try {
      await workflowApi.completeTask(item.task_id);
      setSuccessMsg(`Task "${item.title}" marked as completed.`);
      await fetchAllData();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to mark task as completed.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleExecuteAction = async (item: ActionCenterItem) => {
    if (!item.match_result_id) return;
    setActionLoadingId(item.task_id);
    setError(null);
    setSuccessMsg(null);

    try {
      if (item.action_type === "SEND_SLOTS_TO_CANDIDATE") {
        await workflowApi.sendSlotsToCandidate(item.match_result_id);
        setSuccessMsg(`Interview slots sent to ${item.candidate_name || "candidate"}.`);
        await fetchAllData();
      } else if (item.action_type === "CONFIRM_INTERVIEW") {
        await workflowApi.confirmInterview(item.match_result_id);
        setSuccessMsg(`Interview booking confirmed for ${item.candidate_name || "candidate"}. Calendar invite dispatched.`);
        await fetchAllData();
      } else if (item.action_type === "CREATE_OFFER" || item.action_type === "SEND_OFFER" || item.action_type === "UPDATE_OFFER") {
        navigate(`/recruiter/offers/create?match_id=${item.match_result_id}`);
      } else if (item.action_type === "SCREEN_CANDIDATE" || item.action_type === "SUBMIT_TO_HM") {
        navigate(`/recruiter/candidates/${item.match_result_id}`);
      } else {
        navigate(`/recruiter/candidates/${item.match_result_id}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Action failed to execute. Please try again.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filter items based on priority tab, type, and search
  const filteredItems = items.filter((item) => {
    if (priorityTab !== "ALL" && item.priority !== priorityTab) return false;
    if (typeFilter !== "ALL" && item.action_type !== typeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = item.candidate_name?.toLowerCase().includes(q);
      const matchJob = item.job_title?.toLowerCase().includes(q);
      const matchTitle = item.title?.toLowerCase().includes(q);
      if (!matchName && !matchJob && !matchTitle) return false;
    }
    return true;
  });

  const urgentCount = items.filter((i) => i.priority === "URGENT").length;
  const highCount = items.filter((i) => i.priority === "HIGH").length;
  const standardCount = items.filter((i) => i.priority !== "URGENT" && i.priority !== "HIGH").length;

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + pageSize);

  const currentJobObj = jobs.find((j) => j.id === selectedJobId);

  const getActionConfig = (actionType: string) => {
    switch (actionType) {
      case "SCREEN_CANDIDATE":
        return {
          icon: <Eye className="w-3.5 h-3.5 text-indigo-500" />,
          btnLabel: "Screen Candidate",
          tag: "Screening",
          badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
        };
      case "SUBMIT_TO_HM":
        return {
          icon: <Briefcase className="w-3.5 h-3.5 text-blue-500" />,
          btnLabel: "Submit to HM",
          tag: "Shortlist",
          badgeColor: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
        };
      case "SEND_SLOTS_TO_CANDIDATE":
        return {
          icon: <Send className="w-3.5 h-3.5 text-amber-500" />,
          btnLabel: "Send Slots",
          tag: "Slots Dispatch",
          badgeColor: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
        };
      case "CONFIRM_INTERVIEW":
        return {
          icon: <CalendarCheck className="w-3.5 h-3.5 text-cyan-500" />,
          btnLabel: "Confirm Booking",
          tag: "Booking",
          badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800",
        };
      case "COLLECT_FEEDBACK":
        return {
          icon: <MessageSquare className="w-3.5 h-3.5 text-purple-500" />,
          btnLabel: "Review Feedback",
          tag: "HM Evaluation",
          badgeColor: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
        };
      case "CREATE_OFFER":
        return {
          icon: <FileCheck className="w-3.5 h-3.5 text-emerald-500" />,
          btnLabel: "Draft Offer",
          tag: "Interview GO",
          badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
        };
      case "SEND_OFFER":
        return {
          icon: <Send className="w-3.5 h-3.5 text-primary" />,
          btnLabel: "Dispatch Offer",
          tag: "Offer Ready",
          badgeColor: "bg-primary/10 text-primary border-primary/20",
        };
      default:
        return {
          icon: <Clock className="w-3.5 h-3.5 text-muted-foreground" />,
          btnLabel: "View Details",
          tag: "Action",
          badgeColor: "bg-secondary text-secondary-foreground border-border",
        };
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* ── Top Header & Filter Strip ────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-2">
            <Inbox className="w-3.5 h-3.5" />
            Recruiter Operational Inbox
          </div>
          <h1 className="text-2xl font-bold font-outfit text-foreground tracking-tight flex items-center gap-3">
            Action Center
            {currentJobObj && (
              <span className="text-sm font-normal text-muted-foreground">
                / {currentJobObj.title}
              </span>
            )}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time operational workspace answering: <em>What does the recruiter need to do next?</em>
          </p>
        </div>

        {/* Requisition Dropdown Selector & Refresh */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800/80 rounded-lg px-3 py-1.5 shadow-xs">
            <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground font-medium">Requisition:</span>
            <select
              value={selectedJobId ? String(selectedJobId) : "ALL"}
              onChange={(e) => handleJobChange(e.target.value)}
              className="bg-transparent text-xs text-foreground font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Assigned Requisitions</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title} {job.client_name ? `(${job.client_name})` : ""}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={fetchAllData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 text-foreground text-xs font-semibold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-primary" : "text-muted-foreground"}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between shadow-xs">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">✕</button>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between shadow-xs">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">✕</button>
        </div>
      )}

      {/* ── Operational Metric Summary Cards ─────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl border border-slate-200/90 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/60 backdrop-blur-md shadow-xs space-y-1">
          <div className="text-xs font-medium text-muted-foreground flex items-center justify-between">
            <span>Needs Attention</span>
            <Inbox className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground font-outfit">{items.length}</div>
          <div className="text-[11px] text-muted-foreground">Actionable candidates in pipeline</div>
        </div>

        <div className="p-4 rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-950/25 backdrop-blur-md shadow-xs space-y-1">
          <div className="text-xs font-medium text-rose-700 dark:text-rose-300 flex items-center justify-between">
            <span>Urgent Actions</span>
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-700 dark:text-rose-400 font-outfit">{urgentCount}</div>
          <div className="text-[11px] text-rose-600/80 dark:text-rose-300/80">Immediate bookings & offer decisions</div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200/90 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/60 backdrop-blur-md shadow-xs space-y-1">
          <div className="text-xs font-medium text-muted-foreground flex items-center justify-between">
            <span>Upcoming Interviews</span>
            <CalendarCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-foreground font-outfit">{interviews.length}</div>
          <div className="text-[11px] text-muted-foreground">Scheduled rounds requiring attendance</div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200/90 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/60 backdrop-blur-md shadow-xs space-y-1">
          <div className="text-xs font-medium text-muted-foreground flex items-center justify-between">
            <span>Active Requisitions</span>
            <Briefcase className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-foreground font-outfit">{jobs.length}</div>
          <div className="text-[11px] text-muted-foreground">Open enterprise positions assigned</div>
        </div>
      </div>

      {/* ── Section Navigation Tabs ──────────────────────────────────────── */}
      <div className="flex border-b border-border/80 gap-6 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab("attention")}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === "attention"
              ? "border-primary text-foreground font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Inbox className="w-4 h-4 text-primary" />
          Needs Attention
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary font-mono font-bold">
            {items.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("schedule")}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === "schedule"
              ? "border-primary text-foreground font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          Upcoming Schedule
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold">
            {interviews.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("activity")}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === "activity"
              ? "border-primary text-foreground font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          Recent Pipeline Activity
        </button>
      </div>

      {/* ── TAB 1: NEEDS ATTENTION (OPTIMIZED HIGH-DENSITY INTERACTION) ── */}
      {activeTab === "attention" && (
        <div className="space-y-4">
          {/* Priority Pill Filters & View Density Switcher */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 bg-white/90 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/80 rounded-xl shadow-xs">
            {/* Priority Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setPriorityTab("ALL");
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  priorityTab === "ALL"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                All Actions ({items.length})
              </button>

              <button
                type="button"
                onClick={() => {
                  setPriorityTab("URGENT");
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  priorityTab === "URGENT"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-secondary text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                Urgent ({urgentCount})
              </button>

              <button
                type="button"
                onClick={() => {
                  setPriorityTab("HIGH");
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  priorityTab === "HIGH"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-secondary text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                High Priority ({highCount})
              </button>

              <button
                type="button"
                onClick={() => {
                  setPriorityTab("MEDIUM");
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  priorityTab === "MEDIUM"
                    ? "bg-slate-700 text-white shadow-xs"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                Standard ({standardCount})
              </button>
            </div>

            {/* View Mode Controls & Page Size */}
            <div className="flex items-center gap-2 self-end lg:self-auto">
              <span className="text-xs text-muted-foreground font-medium">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none cursor-pointer"
              >
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
              </select>

              <div className="flex items-center bg-secondary p-0.5 rounded-lg border border-border">
                <button
                  type="button"
                  title="Dense Queue Table View"
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                    viewMode === "table"
                      ? "bg-background text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Card Grid View"
                  onClick={() => setViewMode("cards")}
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                    viewMode === "cards"
                      ? "bg-background text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Search and Category Filter */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white/90 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/80 rounded-xl shadow-xs">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Filter actionable candidates, roles, or action types..."
                className="w-full pl-9 pr-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
            >
              <option value="ALL">All Action Categories</option>
              <option value="SCREEN_CANDIDATE">Candidate Screening</option>
              <option value="SEND_SLOTS_TO_CANDIDATE">Slots Proposal</option>
              <option value="CONFIRM_INTERVIEW">Booking Confirmation</option>
              <option value="COLLECT_FEEDBACK">HM Evaluation Collection</option>
              <option value="CREATE_OFFER">Offer Drafting</option>
              <option value="SEND_OFFER">Offer Letter Dispatch</option>
            </select>
          </div>

          {/* Tasks Container */}
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center bg-white/90 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/80 rounded-xl space-y-2 shadow-xs">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <h3 className="text-base font-bold text-foreground font-outfit">All Requisition Tasks Completed</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No open candidates or pending tasks requiring immediate action for this filter.
              </p>
            </div>
          ) : viewMode === "table" ? (
            /* ── HIGH DENSITY TABLE VIEW (OPTIMAL UX — ~46px per row) ── */
            <div className="bg-white/95 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/80 rounded-xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border/80 bg-slate-50/80 dark:bg-slate-950/60 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3.5">Priority</th>
                      <th className="py-2.5 px-3">Action & Category</th>
                      <th className="py-2.5 px-3">Candidate</th>
                      <th className="py-2.5 px-3">Requisition</th>
                      <th className="py-2.5 px-3">Pipeline Stage</th>
                      <th className="py-2.5 px-2 text-center">State Machine</th>
                      <th className="py-2.5 px-3 text-right">Quick Action</th>
                      <th className="py-2.5 px-2 text-center">Resolve</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {paginatedItems.map((item) => {
                      const config = getActionConfig(item.action_type);
                      const isUrgent = item.priority === "URGENT";
                      const isHigh = item.priority === "HIGH";
                      const pStateInfo = item.pipeline_state ? STATE_MACHINE[item.pipeline_state] : null;

                      const initials = (item.candidate_name || "Talent")
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2);

                      return (
                        <tr
                          key={item.task_id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                        >
                          {/* Priority Column */}
                          <td className="py-2.5 px-3.5 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                isUrgent
                                  ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800"
                                  : isHigh
                                  ? "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800"
                                  : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isUrgent ? "bg-rose-500 animate-pulse" : isHigh ? "bg-amber-500" : "bg-blue-500"
                                }`}
                              />
                              {item.priority}
                            </span>
                          </td>

                          {/* Action Title & Category */}
                          <td className="py-2.5 px-3 min-w-[200px]">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold border shrink-0 ${config.badgeColor}`}
                              >
                                {config.tag}
                              </span>
                              <span className="font-semibold text-foreground truncate max-w-[240px] text-xs">
                                {item.title}
                              </span>
                            </div>
                            {item.description && (
                              <p className="text-[11px] text-muted-foreground truncate max-w-[280px] mt-0.5">
                                {item.description}
                              </p>
                            )}
                          </td>

                          {/* Candidate Column */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 border border-border flex items-center justify-center font-outfit font-bold text-[10px] text-foreground shrink-0">
                                {initials}
                              </div>
                              {item.match_result_id ? (
                                <Link
                                  to={`/recruiter/candidates/${item.match_result_id}`}
                                  className="font-bold text-foreground hover:text-primary transition-colors truncate max-w-[130px]"
                                >
                                  {item.candidate_name || "Candidate"}
                                </Link>
                              ) : (
                                <span className="font-medium text-foreground truncate max-w-[130px]">
                                  {item.candidate_name || "Candidate"}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Requisition */}
                          <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground text-xs">
                            <span className="font-medium text-foreground truncate max-w-[150px] block">
                              {item.job_title || "Requisition"}
                            </span>
                          </td>

                          {/* Current Stage */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {item.pipeline_state ? (
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${
                                  pStateInfo ? pStateInfo.color : "bg-muted text-muted-foreground border-border"
                                }`}
                              >
                                {pStateInfo ? pStateInfo.label : item.pipeline_state}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-[10px]">—</span>
                            )}
                          </td>

                          {/* State Machine Modal Trigger */}
                          <td className="py-2.5 px-2 text-center whitespace-nowrap">
                            {item.pipeline_state ? (
                              <button
                                type="button"
                                title="Inspect Pipeline State Machine"
                                onClick={() => setStateMachineModalItem(item)}
                                className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                              >
                                <GitBranch className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>

                          {/* Action Button */}
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleExecuteAction(item)}
                              disabled={actionLoadingId === item.task_id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                            >
                              <span>{config.btnLabel}</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </td>

                          {/* Resolve Checkmark */}
                          <td className="py-2.5 px-2 text-center whitespace-nowrap">
                            <button
                              type="button"
                              title="Mark task as completed / dismissed"
                              onClick={() => handleCompleteTask(item)}
                              disabled={actionLoadingId === item.task_id}
                              className="p-1.5 rounded-md text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/15 border border-transparent hover:border-emerald-500/30 transition-all cursor-pointer disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* ── CARD GRID VIEW (ALTERNATIVE WITH PAGINATION) ── */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {paginatedItems.map((item) => (
                <div
                  key={item.task_id}
                  className="rounded-xl overflow-hidden border border-slate-200/90 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/60 backdrop-blur-md shadow-xs flex flex-col justify-between"
                >
                  <ActionCenterCard
                    item={item}
                    onExecuteAction={handleExecuteAction}
                    onCompleteTask={handleCompleteTask}
                    loading={actionLoadingId === item.task_id}
                  />
                  <div className="px-4 py-2 bg-slate-50/60 dark:bg-slate-950/40 border-t border-border flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Pipeline State: <strong>{item.pipeline_state || "Active"}</strong></span>
                    <button
                      type="button"
                      onClick={() => setStateMachineModalItem(item)}
                      className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
                    >
                      <GitBranch className="w-3 h-3" />
                      View State Machine
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── PAGINATION BAR ────────────────────────────────────────────── */}
          {filteredItems.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white/90 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/80 rounded-xl shadow-xs text-xs">
              <span className="text-muted-foreground">
                Showing{" "}
                <strong className="text-foreground font-semibold">
                  {startIndex + 1}
                </strong>{" "}
                to{" "}
                <strong className="text-foreground font-semibold">
                  {Math.min(startIndex + pageSize, filteredItems.length)}
                </strong>{" "}
                of{" "}
                <strong className="text-foreground font-semibold">
                  {filteredItems.length}
                </strong>{" "}
                tasks
              </span>

              <div className="flex items-center gap-1.5 self-center sm:self-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="h-8 px-2.5 text-xs gap-1 cursor-pointer disabled:opacity-40"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Previous
                </Button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((p, idx, arr) => (
                    <React.Fragment key={p}>
                      {idx > 0 && arr[idx - 1] !== p - 1 && (
                        <span className="px-1 text-muted-foreground">…</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setPage(p)}
                        className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          currentPage === p
                            ? "bg-primary text-primary-foreground shadow-xs font-bold"
                            : "bg-secondary text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  ))}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="h-8 px-2.5 text-xs gap-1 cursor-pointer disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: UPCOMING SCHEDULE ─────────────────────────────────────── */}
      {activeTab === "schedule" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground font-outfit uppercase tracking-wider flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Confirmed & Scheduled Interviews
            </h3>
            <span className="text-xs text-muted-foreground">
              {interviews.length} upcoming session{interviews.length !== 1 ? "s" : ""}
            </span>
          </div>

          {interviews.length === 0 ? (
            <div className="p-12 text-center bg-white/90 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/80 rounded-xl space-y-2 shadow-xs">
              <Calendar className="w-10 h-10 text-muted-foreground mx-auto" />
              <h4 className="text-sm font-bold text-foreground font-outfit">No Interviews Scheduled</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No interview rounds are currently scheduled for the selected requisition filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {interviews.map((iv) => {
                const dateObj = iv.interview_date ? new Date(iv.interview_date) : null;
                const isToday = dateObj ? new Date().toDateString() === dateObj.toDateString() : false;

                return (
                  <div
                    key={iv.id}
                    className={`rounded-xl border p-5 space-y-3.5 transition-all shadow-xs bg-white/90 dark:bg-slate-900/60 backdrop-blur-md ${
                      isToday
                        ? "border-emerald-500/50 shadow-md"
                        : "border-slate-200/90 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        {isToday && (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 mb-1.5">
                            Today
                          </span>
                        )}
                        <h4 className="text-sm font-bold text-foreground">
                          {iv.candidate_name || `Candidate #${iv.match_result_id}`}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {iv.job_title || "Requisition Position"}
                        </p>
                      </div>

                      <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-secondary text-secondary-foreground border border-border uppercase tracking-wide">
                        {iv.interview_type || "Technical"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/80">
                        <span className="text-[11px] text-muted-foreground block">Date & Time</span>
                        <span className="font-semibold text-foreground">
                          {dateObj ? dateObj.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Time TBD"}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/80">
                        <span className="text-[11px] text-muted-foreground block">Mode</span>
                        <span className="font-semibold text-foreground capitalize">
                          {iv.interview_mode || "Video Conference"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      {iv.meeting_link ? (
                        <a
                          href={iv.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors"
                        >
                          <Video className="w-3.5 h-3.5" />
                          Join Meeting
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No link provided</span>
                      )}

                      <Link
                        to={`/recruiter/candidates/${iv.match_result_id}`}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                      >
                        Pipeline View
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: RECENT PIPELINE ACTIVITY ──────────────────────────────── */}
      {activeTab === "activity" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground font-outfit uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Real-Time Recruitment Pipeline Activity
            </h3>
            <span className="text-xs text-muted-foreground font-mono">
              Latest {activityLogs.length} events
            </span>
          </div>

          {activityLogs.length === 0 ? (
            <div className="p-12 text-center bg-white/90 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/80 rounded-xl space-y-2 shadow-xs">
              <Activity className="w-10 h-10 text-muted-foreground mx-auto" />
              <h4 className="text-sm font-bold text-foreground font-outfit">No Recent Audit Logs</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No recent activity records found for this requisition scope.
              </p>
            </div>
          ) : (
            <div className="bg-white/90 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/80 rounded-xl divide-y divide-slate-200/80 dark:divide-slate-800/80 overflow-hidden shadow-xs">
              {activityLogs.map((log) => (
                <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{log.actor_name || "System"}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-secondary text-secondary-foreground border border-border">
                        {log.action}
                      </span>
                    </div>

                    <div className="text-muted-foreground">
                      {log.from_state && log.to_state ? (
                        <span className="font-mono text-[11px] text-primary font-semibold">
                          {log.from_state} → {log.to_state}
                        </span>
                      ) : (
                        <span>{log.details || "Recruitment lifecycle transition"}</span>
                      )}
                    </div>
                  </div>

                  <span className="text-[11px] text-muted-foreground shrink-0 font-mono">
                    {new Date(log.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── STATE MACHINE DRILL-DOWN MODAL ─────────────────────────────── */}
      {stateMachineModalItem && (
        <Dialog open={Boolean(stateMachineModalItem)} onOpenChange={() => setStateMachineModalItem(null)}>
          <DialogContent className="max-w-lg bg-card border-border shadow-2xl space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold font-outfit text-foreground flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-primary" />
                Pipeline State Machine: {stateMachineModalItem.candidate_name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Requisition: {stateMachineModalItem.job_title} · Current stage inspection & authorized transitions
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-1">
              {stateMachineModalItem.pipeline_state && (
                <div className="space-y-3">
                  <PipelineStateBar
                    currentState={stateMachineModalItem.pipeline_state as PipelineState}
                    compact={false}
                  />

                  {STATE_MACHINE[stateMachineModalItem.pipeline_state] && (
                    <div className="p-3.5 rounded-lg bg-secondary/50 border border-border space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block flex items-center gap-1.5">
                        <Zap className="w-3 h-3 text-primary" />
                        Next Authorized Pipeline Transitions:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {STATE_MACHINE[stateMachineModalItem.pipeline_state].next.map((ns) => {
                          const conf = STATE_MACHINE[ns];
                          return (
                            <span
                              key={ns}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border flex items-center gap-1 ${
                                conf ? conf.color : "bg-secondary text-secondary-foreground border-border"
                              }`}
                            >
                              <ArrowRight className="w-2.5 h-2.5" />
                              {conf ? conf.label : ns}
                            </span>
                          );
                        })}
                        {STATE_MACHINE[stateMachineModalItem.pipeline_state].next.length === 0 && (
                          <span className="text-xs text-muted-foreground italic">
                            Terminal state reached. Candidate workflow finalized.
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {stateMachineModalItem.match_result_id && (
                <div className="pt-2 border-t border-border flex justify-between items-center">
                  <Link
                    to={`/recruiter/candidates/${stateMachineModalItem.match_result_id}`}
                    onClick={() => setStateMachineModalItem(null)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                  >
                    <Target className="w-3.5 h-3.5" />
                    Open Candidate Dossier
                    <ArrowRight className="w-3 h-3" />
                  </Link>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setStateMachineModalItem(null)}
                    className="text-xs h-8"
                  >
                    Close
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
