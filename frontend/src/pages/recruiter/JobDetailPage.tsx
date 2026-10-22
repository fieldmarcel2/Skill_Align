import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { jobsApi, recruiterApi, workflowApi } from "../../services/api";
import { Job, MatchResult, ActionCenterItem } from "../../types";
import { useToast } from "../../components/ui/toast";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { ScoreBadge } from "../../components/common/ScoreBadge";
import {
  ArrowLeft,
  Briefcase,
  Building,
  Building2,
  Clock,
  Loader2,
  Save,
  Inbox,
  Users,
  CalendarCheck,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  User,
  Settings,
  Sparkles,
  ChevronRight,
  TrendingUp,
  MapPin,
  Search,
  Filter,
  GraduationCap,
  X,
  ShieldCheck,
  Copy,
  Check,
} from "lucide-react";

export const JobDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const jobId = Number(id);
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  const isAdmin = user?.role?.name === "Admin";
  const backPath = isAdmin ? "/admin" : "/recruiter";
  const backLabel = isAdmin ? "Back to Admin Dashboard" : "Back to Recruiter Dashboard";
  const actionCenterPath = `/recruiter/action-center?job_id=${jobId}`;
  const candidatesPath = `/recruiter/candidates?job_id=${jobId}`;

  const [job, setJob] = useState<Job | null>(null);
  const [candidates, setCandidates] = useState<MatchResult[]>([]);
  const [actionItems, setActionItems] = useState<ActionCenterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Active view tab: "pipeline" | "details" | "edit"
  const [activeTab, setActiveTab] = useState<"pipeline" | "details" | "edit">("pipeline");

  // Pipeline search & filter
  const [pipelineSearch, setPipelineSearch] = useState("");
  const [pipelineFilter, setPipelineFilter] = useState<string>("all");
  // Candidate match threshold filter (defaults to 30% qualification threshold)
  const [minThreshold] = useState<number>(30);
  const [hideBelowThreshold, setHideBelowThreshold] = useState<boolean>(true);

  // Form states for editing
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [clientName, setClientName] = useState("");
  const [minExpYears, setMinExpYears] = useState<number>(0);
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"draft" | "active" | "closed">("active");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [jobData, candidateData, actionsData] = await Promise.all([
          jobsApi.getById(jobId),
          recruiterApi.getJobCandidates(jobId, { page_size: 100 }).catch(() => []),
          !isAdmin ? workflowApi.getActionCenter(jobId).catch(() => []) : Promise.resolve([]),
        ]);

        setJob(jobData);
        setTitle(jobData.title);
        setDepartment(jobData.department || "");
        setClientName(jobData.client_name || "");
        setMinExpYears(jobData.min_experience_years);
        setDescription(jobData.description || "");
        setStatus(jobData.status);

        setCandidates(candidateData);
        setActionItems(actionsData);
      } catch (err: any) {
        toast.error(err.response?.data?.detail || "Failed to load job requisition details.");
      } finally {
        setIsLoading(false);
      }
    };

    if (jobId) fetchData();
  }, [jobId]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updated = await jobsApi.update(jobId, {
        title,
        department,
        client_name: clientName,
        min_experience_years: Number(minExpYears),
        description,
        status,
      });
      setJob(updated);
      toast.success("Job details updated successfully.");
      setActiveTab("details");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to update job.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyReqId = () => {
    if (!job?.id) return;
    navigator.clipboard.writeText(String(job.id));
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
    toast.success(`Copied Requisition ID #${job.id}`);
  };

  // Pipeline metrics
  const totalCandidates = candidates.length;
  const screeningNeeded = candidates.filter(
    (c) => c.status === "matched" || c.pipeline_state === "CANDIDATE_MATCHED"
  ).length;
  const shortlistedCount = candidates.filter(
    (c) =>
      c.status === "screened" ||
      c.status === "approved_by_hr" ||
      c.pipeline_state === "CANDIDATE_SHORTLISTED" ||
      c.pipeline_state === "SENT_TO_HIRING_MANAGER" ||
      c.pipeline_state === "HIRING_MANAGER_REVIEW"
  ).length;
  const interviewsCount = candidates.filter(
    (c) =>
      c.status === "interview_scheduled" ||
      c.status === "technical_interview" ||
      c.status === "hr_interview" ||
      c.pipeline_state?.includes("INTERVIEW") ||
      c.pipeline_state === "CANDIDATE_SLOT_SELECTED"
  ).length;
  const offersCount = candidates.filter(
    (c) =>
      c.status === "offer" ||
      c.pipeline_state === "OFFER_CREATED" ||
      c.pipeline_state === "OFFER_SENT"
  ).length;
  const hiredCount = candidates.filter(
    (c) =>
      c.status === "hired" ||
      c.pipeline_state === "OFFER_ACCEPTED" ||
      c.pipeline_state === "HIRED"
  ).length;

  // Filtered candidate list
  const filteredCandidates = useMemo(() => {
    return candidates.filter((cand) => {
      // Text search
      const q = pipelineSearch.toLowerCase().trim();
      if (q) {
        const name = (cand.candidate?.full_name || "").toLowerCase();
        const degree = (cand.candidate?.education_degree || "").toLowerCase();
        const city = (cand.candidate?.city || "").toLowerCase();
        if (!name.includes(q) && !degree.includes(q) && !city.includes(q)) {
          return false;
        }
      }

      // Filter category
      if (pipelineFilter === "all") {
        // Fall through to threshold check
      } else if (pipelineFilter === "matched") {
        if (cand.status !== "matched" && cand.pipeline_state !== "CANDIDATE_MATCHED") return false;
      } else if (pipelineFilter === "hm_review") {
        if (
          cand.pipeline_state !== "CANDIDATE_SHORTLISTED" &&
          cand.pipeline_state !== "SENT_TO_HIRING_MANAGER" &&
          cand.pipeline_state !== "HIRING_MANAGER_REVIEW" &&
          cand.status !== "screened" &&
          cand.status !== "approved_by_hr"
        ) return false;
      } else if (pipelineFilter === "interviews") {
        if (
          !cand.pipeline_state?.includes("INTERVIEW") &&
          !cand.status?.includes("interview") &&
          cand.pipeline_state !== "CANDIDATE_SLOT_SELECTED"
        ) return false;
      } else if (pipelineFilter === "offers") {
        if (
          !cand.pipeline_state?.includes("OFFER") &&
          cand.pipeline_state !== "HIRED" &&
          cand.status !== "offer" &&
          cand.status !== "hired"
        ) return false;
      }

      // Score threshold filter: if active, hide non-matches (< minThreshold%)
      const rawScore = Number(cand.overall_score) || 0;
      const scorePct = rawScore > 1 ? rawScore : rawScore * 100;
      if (hideBelowThreshold && scorePct < minThreshold) {
        return false;
      }

      return true;
    });
  }, [candidates, pipelineSearch, pipelineFilter, hideBelowThreshold, minThreshold]);

  const getPipelineStateBadge = (state?: string, status?: string) => {
    if (state === "OFFER_ACCEPTED" || state === "HIRED" || status === "hired") {
      return {
        label: "Hired",
        className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
        dot: "bg-emerald-500",
      };
    }
    if (state?.startsWith("OFFER") || status === "offer") {
      return {
        label: "Offer Stage",
        className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
        dot: "bg-amber-500",
      };
    }
    if (state?.includes("INTERVIEW") || state === "CANDIDATE_SLOT_SELECTED" || status?.includes("interview")) {
      return {
        label: "Interviewing",
        className: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
        dot: "bg-purple-500",
      };
    }
    if (state === "CANDIDATE_SHORTLISTED" || state === "SENT_TO_HIRING_MANAGER" || state === "HIRING_MANAGER_REVIEW" || status === "screened") {
      return {
        label: "HM Review",
        className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
        dot: "bg-blue-500",
      };
    }
    if (state === "HM_REJECTED" || state === "OFFER_REJECTED" || status === "rejected") {
      return {
        label: "Rejected",
        className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
        dot: "bg-rose-500",
      };
    }
    return {
      label: "Matched",
      className: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
      dot: "bg-indigo-500",
    };
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 space-y-3">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-xs font-semibold text-muted-foreground">Loading job requisition workspace...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* ── Breadcrumb & Top Bar ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          to={backPath}
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
        >
          <span className="p-1 rounded-lg bg-secondary/80 border border-border group-hover:bg-secondary transition-colors">
            <ArrowLeft className="h-3.5 w-3.5 text-foreground" />
          </span>
          {backLabel}
        </Link>

        <button
          onClick={handleCopyReqId}
          type="button"
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground text-xs font-mono font-semibold border border-border/80 transition-colors cursor-pointer self-start sm:self-auto"
          title="Click to copy Requisition ID"
        >
          <span>REQ-ID #{job?.id}</span>
          {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 opacity-60" />}
        </button>
      </div>

      {/* ── Requisition Hero Header Card ─────────────────────────────────── */}
      <div className="bg-card border border-border/80 rounded-2xl p-6 sm:p-7 shadow-xs relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-primary/10 via-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                <Building2 className="w-3.5 h-3.5" />
                {job?.department || "Technology"}
              </span>

              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  job?.status === "active"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    : job?.status === "draft"
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {job?.status || "Active"}
              </span>

              {job?.client_name && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-secondary text-secondary-foreground border border-border">
                  <Building className="w-3 h-3 text-muted-foreground" />
                  {job.client_name}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground tracking-tight font-outfit">
              {job?.title}
            </h1>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground pt-1">
              <span className="flex items-center gap-1.5 font-medium">
                <Briefcase className="w-3.5 h-3.5 text-primary" />
                Minimum Experience: <strong className="text-foreground font-semibold">{job?.min_experience_years}+ Years</strong>
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                Created: <strong className="text-foreground font-semibold">{job?.created_at ? new Date(job.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "Recent"}</strong>
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                Work Mode: <strong className="text-foreground font-semibold capitalize">{job?.work_mode || "Hybrid"}</strong>
              </span>
            </div>
          </div>

          {/* Action Center & All Candidates Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {!isAdmin && (
              <Link
                to={actionCenterPath}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm font-bold shadow-md shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Inbox className="w-4 h-4" />
                <span>Open Action Center</span>
                {actionItems.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-black shadow-xs">
                    {actionItems.length}
                  </span>
                )}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}

            <Link
              to={candidatesPath}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] ${
                isAdmin
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20"
                  : "bg-card hover:bg-secondary text-foreground border border-border/80 shadow-xs"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>All Candidates ({totalCandidates})</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Operational Requisition Metrics (6 Uniform Cards) ─────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-3.5">
        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs space-y-2 hover:border-indigo-500/30 transition-all">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">Applicants</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black font-outfit text-foreground tracking-tight">{totalCandidates}</div>
          <p className="text-[11px] text-muted-foreground truncate">In requisition pipeline</p>
        </div>

        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs space-y-2 hover:border-blue-500/30 transition-all">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">Screening</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black font-outfit text-blue-600 dark:text-blue-400 tracking-tight">{screeningNeeded}</div>
          <p className="text-[11px] text-muted-foreground truncate">Pending recruiter review</p>
        </div>

        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs space-y-2 hover:border-purple-500/30 transition-all">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">HM Review</span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Briefcase className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black font-outfit text-foreground tracking-tight">{shortlistedCount}</div>
          <p className="text-[11px] text-muted-foreground truncate">Under HM evaluation</p>
        </div>

        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs space-y-2 hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">Interviews</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CalendarCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black font-outfit text-emerald-600 dark:text-emerald-400 tracking-tight">{interviewsCount}</div>
          <p className="text-[11px] text-muted-foreground truncate">Scheduled or active</p>
        </div>

        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs space-y-2 hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">Offers Sent</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <FileCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black font-outfit text-amber-600 dark:text-amber-400 tracking-tight">{offersCount}</div>
          <p className="text-[11px] text-muted-foreground truncate">Awaiting acceptance</p>
        </div>

        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs space-y-2 hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">Hires Secured</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black font-outfit text-emerald-600 dark:text-emerald-400 tracking-tight">{hiredCount}</div>
          <p className="text-[11px] text-muted-foreground truncate">Offers accepted</p>
        </div>
      </div>

      {/* ── Tabs Navigation ──────────────────────────────────────────────── */}
      <div className="border-b border-border/80 flex items-center gap-2 overflow-x-auto pb-px">
        <button
          type="button"
          onClick={() => setActiveTab("pipeline")}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "pipeline"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Stage-by-Stage Pipeline ({candidates.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("details")}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "details"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Job Description & Skills ({job?.job_skills.length || 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("edit")}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "edit"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          }`}
        >
          <Settings className="w-4 h-4" />
          Edit Requisition Settings
        </button>
      </div>

      {/* ── TAB 1: STAGE-BY-STAGE PIPELINE ───────────────────────────────── */}
      {activeTab === "pipeline" && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Controls: Search + Stage Filter Chips */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/80 rounded-2xl p-3.5 sm:p-4 shadow-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={pipelineSearch}
                onChange={(e) => setPipelineSearch(e.target.value)}
                placeholder="Search candidates by name, degree, city..."
                className="w-full pl-9 pr-8 py-2 text-xs bg-background border border-border/80 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              {pipelineSearch && (
                <button
                  onClick={() => setPipelineSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { key: "all", label: `All (${filteredCandidates.length})` },
                  { key: "matched", label: "Matched" },
                  { key: "hm_review", label: "HM Review" },
                  { key: "interviews", label: "Interviews" },
                  { key: "offers", label: "Offers/Hires" },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setPipelineFilter(item.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      pipelineFilter === item.key
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Threshold Toggle */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground flex items-center gap-2 cursor-pointer select-none bg-secondary/50 px-3 py-1.5 rounded-xl border border-border/70 hover:bg-secondary transition">
                  <input
                    type="checkbox"
                    checked={hideBelowThreshold}
                    onChange={(e) => setHideBelowThreshold(e.target.checked)}
                    className="rounded text-primary focus:ring-primary/40 h-3.5 w-3.5 accent-primary cursor-pointer"
                  />
                  <span className="font-medium text-foreground">
                    Filter &lt;{minThreshold}% non-matches
                  </span>
                  {candidates.some((c) => {
                    const s = Number(c.overall_score) || 0;
                    return (s > 1 ? s : s * 100) < minThreshold;
                  }) && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-semibold">
                      {candidates.filter((c) => {
                        const s = Number(c.overall_score) || 0;
                        return (s > 1 ? s : s * 100) < minThreshold;
                      }).length} hidden
                    </span>
                  )}
                </label>
              </div>
            </div>
          </div>

          {filteredCandidates.length === 0 ? (
            <div className="p-16 text-center bg-card border border-dashed border-border rounded-2xl space-y-3">
              <Users className="w-10 h-10 text-muted-foreground mx-auto opacity-40" />
              <h4 className="text-sm font-bold text-foreground">
                {candidates.length === 0
                  ? "No Candidates in this Requisition Pipeline"
                  : `No candidates meet the ${minThreshold}% qualification threshold`}
              </h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                {candidates.length === 0
                  ? "Run the AI matching engine or browse the global candidate pool to source talent for this role."
                  : `${candidates.length} scored candidates currently have <${minThreshold}% match (0% skill overlap). Uncheck the filter above to view non-matching profiles.`}
              </p>
              {candidates.length > 0 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHideBelowThreshold(false)}
                    className="text-xs rounded-xl"
                  >
                    Show All {candidates.length} Scored Candidates (Including 0%)
                  </Button>
                  {pipelineSearch && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPipelineSearch("")}
                      className="text-xs rounded-xl"
                    >
                      Clear Search
                    </Button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCandidates.map((cand) => {
                const pState = cand.pipeline_state || "CANDIDATE_MATCHED";
                const score = cand.overall_score !== undefined
                  ? Math.round(cand.overall_score > 1 ? cand.overall_score : cand.overall_score * 100)
                  : 0;
                const stageBadge = getPipelineStateBadge(pState, cand.status);

                return (
                  <div
                    key={cand.id}
                    className="bg-card border border-border/80 hover:border-primary/40 hover:shadow-md rounded-2xl p-5 space-y-4 transition-all duration-200 flex flex-col justify-between group"
                  >
                    {/* Top Row: Avatar + Name + Score Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/20 via-indigo-500/20 to-purple-500/20 text-primary font-bold font-outfit text-base flex items-center justify-center shrink-0 border border-primary/25 shadow-xs">
                          {cand.candidate?.full_name ? cand.candidate.full_name.charAt(0).toUpperCase() : "C"}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate font-outfit">
                            {cand.candidate?.full_name || `Candidate #${cand.candidate_id}`}
                          </h4>
                          <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1.5">
                            <GraduationCap className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" />
                            <span className="truncate">
                              {cand.candidate?.education_degree ||
                                (cand.candidate?.total_experience_years
                                  ? `${cand.candidate.total_experience_years} yrs exp`
                                  : "Applicant")}
                            </span>
                          </p>
                        </div>
                      </div>
                      <ScoreBadge score={score} size="sm" showLabel />
                    </div>

                    {/* Middle: Stage Shift Pill & City */}
                    <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${stageBadge.className}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${stageBadge.dot}`} />
                        {stageBadge.label}
                      </span>
                      {cand.candidate?.city ? (
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-muted-foreground/70" /> {cand.candidate.city}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground font-mono">
                          ID: #{cand.candidate_id}
                        </span>
                      )}
                    </div>

                    {/* Bottom: Action buttons */}
                    <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                      <Link
                        to={`/recruiter/candidates/${cand.id}`}
                        className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-bold transition-colors"
                      >
                        <User className="w-3.5 h-3.5" />
                        Full Dossier
                      </Link>

                      {!isAdmin && (
                        <Link
                          to={actionCenterPath}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
                        >
                          Action Center
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: JOB SPECIFICATIONS & SKILLS ────────────────────────────── */}
      {activeTab === "details" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card className="border-border/80 bg-card rounded-2xl p-6 sm:p-7 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2 font-outfit">
                <Briefcase className="w-4 h-4 text-primary" /> Requisition Description & Scope
              </h3>
              <Badge variant="outline" className="text-[10px] font-mono">
                {job?.work_mode || "Hybrid"}
              </Badge>
            </div>
            <div className="text-xs sm:text-sm text-foreground/90 leading-relaxed whitespace-pre-line bg-secondary/30 p-5 rounded-xl border border-border/80">
              {job?.description || "No detailed job description provided for this requisition."}
            </div>
          </Card>

          <Card className="border-border/80 bg-card rounded-2xl p-6 sm:p-7 space-y-5 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2 font-outfit">
                <Sparkles className="w-4 h-4 text-primary" /> Required & Preferred Skills Benchmark ({job?.job_skills?.length || 0})
              </h3>
              <span className="text-xs text-muted-foreground font-medium">Standardized Competencies</span>
            </div>

            {(!job?.job_skills || job.job_skills.length === 0) ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No skill benchmarks specified for this job requisition.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {job.job_skills.map((js) => (
                  <div
                    key={js.id}
                    className="p-4 rounded-xl border border-border/80 bg-card hover:border-primary/40 shadow-xs flex items-center justify-between gap-3 transition-colors"
                  >
                    <div>
                      <span className="text-xs font-bold text-foreground block">{js.skill.name}</span>
                      <span className="text-[11px] text-muted-foreground block">{js.skill.category}</span>
                    </div>
                    <div className="text-right">
                      <Badge variant={js.requirement_type === "required" ? "default" : "secondary"}>
                        {js.requirement_type}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground block pt-1 font-mono">
                        Weight: {js.weight}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── TAB 3: EDIT REQUISITION SETTINGS ─────────────────────────────── */}
      {activeTab === "edit" && (
        <form onSubmit={handleUpdate} className="space-y-6 max-w-3xl animate-in fade-in duration-200">
          <Card className="border-border/80 bg-card rounded-2xl p-6 sm:p-7 space-y-5 shadow-xs">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2 font-outfit">
              <Settings className="w-4 h-4 text-primary" /> Edit Job Requisition Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">Job Title</label>
                <Input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">Department</label>
                <Input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">Client / Org Name</label>
                <Input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Minimum Experience (Years)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  required
                  value={minExpYears}
                  onChange={(e) => setMinExpYears(Number(e.target.value))}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">Requisition Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">Job Description</label>
                <textarea
                  rows={6}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background p-3.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 leading-relaxed"
                />
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-border">
              <Button type="submit" variant="default" disabled={isSaving} className="gap-2 font-bold shadow-sm">
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving Changes...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" /> Save Requisition Changes
                  </>
                )}
              </Button>
            </div>
          </Card>
        </form>
      )}
    </div>
  );
};

export default JobDetailPage;
