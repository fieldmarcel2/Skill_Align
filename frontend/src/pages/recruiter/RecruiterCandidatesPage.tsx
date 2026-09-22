import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Search,
  Users,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { recruiterApi, matchingApi, jobsApi } from "../../services/api";
import { MatchResult, RecruiterJobItem } from "../../types";
import { CandidateCard } from "../../components/candidate/CandidateCard";
import { cn } from "../../lib/utils";

export const RecruiterCandidatesPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL Query Params - support both snake_case and camelCase
  const qJobId = searchParams.get("job_id") || searchParams.get("jobId");
  const initialJobId = qJobId ? Number(qJobId) : undefined;

  // Filters State
  const [selectedJobId, setSelectedJobId] = useState<number | undefined>(initialJobId);
  const [searchTerm, setSearchTerm] = useState("");
  const [minScore, setMinScore] = useState<number | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [assignmentFilter, setAssignmentFilter] = useState<string>("all"); // 'all', 'assigned_to_me', 'unassigned'

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCandidates, setTotalCandidates] = useState(0);

  // Data State
  const [jobs, setJobs] = useState<RecruiterJobItem[]>([]);
  const [candidates, setCandidates] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Synchronize state when URL query params change
  useEffect(() => {
    const currentParam = searchParams.get("job_id") || searchParams.get("jobId");
    setSelectedJobId(currentParam ? Number(currentParam) : undefined);
    setPage(1);
  }, [searchParams]);

  // Load assigned jobs on mount
  useEffect(() => {
    loadAssignedJobs();
  }, []);

  // Fetch candidates whenever filters or pagination change
  useEffect(() => {
    loadCandidates();
  }, [selectedJobId, minScore, statusFilter, assignmentFilter, page, pageSize]);

  const loadAssignedJobs = async () => {
    try {
      const assigned = await recruiterApi.getAssignedJobs();
      if (assigned && assigned.length > 0) {
        setJobs(assigned);
      } else {
        const allJobs = await jobsApi.list();
        setJobs(
          allJobs.map((j) => ({
            id: j.id,
            title: j.title,
            status: j.status,
            min_experience_years: j.min_experience_years,
            work_mode: j.work_mode,
            created_at: j.created_at,
            assignment_role: "RECRUITER",
            total_candidates: 0,
            pending_review: 0,
            assigned_to_me: 0,
          }))
        );
      }
    } catch (err) {
      console.error("Failed to load assigned jobs:", err);
    }
  };

  const loadCandidates = async () => {
    try {
      setLoading(true);
      const params: any = {
        page,
        page_size: pageSize,
      };
      if (selectedJobId) params.job_id = selectedJobId;
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (minScore !== undefined) params.min_score = minScore;
      if (statusFilter) params.status = statusFilter;

      if (assignmentFilter === "assigned_to_me") {
        params.assigned_to_me = true;
      } else if (assignmentFilter === "unassigned") {
        params.assignment_status = "unassigned";
      }

      const results = await recruiterApi.getAllCandidates(params);
      setCandidates(results);
      const total = (results as any).total !== undefined ? (results as any).total : results.length;
      setTotalCandidates(total);
    } catch (err) {
      console.error("Failed to load candidates pool:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadCandidates();
  };

  const handleClaimCandidate = async (jobId: number, candidateId: number) => {
    try {
      await recruiterApi.claimCandidate(jobId, candidateId);
      await loadCandidates();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to claim candidate.");
    }
  };

  const handleScreenCandidate = async (matchId: number, status: "screened" | "rejected") => {
    try {
      await matchingApi.updateStatus(matchId, status);
      await loadCandidates();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to update candidate status.");
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCandidates / pageSize));
  const startIndex = totalCandidates === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, totalCandidates);

  // Generate pagination range with ellipses
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("...");
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Recruiter Talent Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <Users className="w-7 h-7 text-primary" />
            Global Candidate Pool & Work Queue
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review algorithmic match rankings, inspect parsed resume evidence, and triage talent across all active requisitions.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setRefreshing(true);
              loadCandidates();
            }}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border/80 bg-card hover:bg-secondary text-xs font-semibold text-foreground transition-all duration-200 shadow-sm hover:shadow"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-primary", refreshing && "animate-spin")} />
            <span>Refresh Pool</span>
          </button>
        </div>
      </div>

      {jobs.length === 0 && !loading && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3 text-amber-700 dark:text-amber-400 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <span className="font-bold">No Job Requisitions Assigned:</span> You do not have any active job requisitions assigned to your recruiter queue yet. Please request your HR manager to assign requisitions to you in order to review and screen matched candidates.
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search talent pool by candidate name, skill, or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-border/80 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
          </div>

          {/* Job Filter Dropdown */}
          <div className="w-full md:w-72">
            <select
              value={selectedJobId || ""}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : undefined;
                setSelectedJobId(val);
                setPage(1);
                if (val) setSearchParams({ jobId: String(val) });
                else setSearchParams({});
              }}
              className="w-full py-2.5 px-3.5 text-xs rounded-xl border border-border/80 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            >
              <option value="">All Assigned Jobs ({jobs.length})</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} ({j.assignment_role.replace("_", " ")})
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 transition shadow-sm"
          >
            Filter
          </button>
        </form>

        {/* Secondary Filter Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/60">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
              Assignment:
            </span>
            {[
              { id: "all", label: "All Candidates" },
              { id: "assigned_to_me", label: "Claimed by Me" },
              { id: "unassigned", label: "Unassigned Queue" },
            ].map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => {
                  setAssignmentFilter(btn.id);
                  setPage(1);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition border",
                  assignmentFilter === btn.id
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-secondary/60 text-muted-foreground border-border/80 hover:text-foreground hover:bg-secondary"
                )}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Min Score Dropdown */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-medium">Score:</span>
              <select
                value={minScore === undefined ? "" : minScore}
                onChange={(e) => {
                  setMinScore(e.target.value ? Number(e.target.value) : undefined);
                  setPage(1);
                }}
                className="py-1.5 px-2.5 rounded-lg border border-border/80 bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="">Any Score</option>
                <option value="0.80">80%+ (Top Match)</option>
                <option value="0.65">65%+ (Strong Match)</option>
                <option value="0.50">50%+ (Moderate Match)</option>
              </select>
            </div>

            {/* Stage Dropdown */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-medium">Stage:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="py-1.5 px-2.5 rounded-lg border border-border/80 bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="">All Stages</option>
                <option value="matched">Matched (Pending Review)</option>
                <option value="screened">Screened</option>
                <option value="approved_by_hr">Approved by HR</option>
                <option value="interview_scheduled">Interview Scheduled</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Results Header with Count & Per-Page Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div className="text-xs text-muted-foreground font-medium">
          {loading ? (
            <span>Loading candidates...</span>
          ) : (
            <span>
              Showing <strong className="text-foreground">{startIndex}</strong> -{" "}
              <strong className="text-foreground">{endIndex}</strong> of{" "}
              <strong className="text-foreground">{totalCandidates}</strong> candidate matches
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-muted-foreground">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="py-1 px-2 rounded-lg border border-border/80 bg-card text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
          >
            <option value={6}>6 per page</option>
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
          </select>
        </div>
      </div>

      {/* Candidates List / Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[360px] bg-card border border-border/70 rounded-2xl p-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-3"></div>
          <p className="text-xs text-muted-foreground font-medium">Fetching candidate pool intelligence...</p>
        </div>
      ) : candidates.length === 0 ? (
        <div className="bg-card border border-border/80 rounded-2xl p-12 text-center space-y-3">
          <AlertCircle className="w-12 h-12 text-muted-foreground/60 mx-auto" />
          <h3 className="text-base font-bold text-foreground">No Candidates Found</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {selectedJobId
              ? "No candidate matches found matching the selected filters for this job requisition."
              : "No candidates currently available across your assigned job requisitions."}
          </p>
          {(searchTerm || minScore !== undefined || statusFilter || assignmentFilter !== "all") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setMinScore(undefined);
                setStatusFilter("");
                setAssignmentFilter("all");
                setPage(1);
              }}
              className="text-xs font-semibold text-primary hover:underline pt-1 inline-block"
            >
              Reset all active filters
            </button>
          )}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        >
          {candidates.map((match) => (
            <CandidateCard
              key={`${match.job_id}-${match.candidate_id}`}
              match={match}
              currentUserId={user?.id}
              onClaim={handleClaimCandidate}
              onScreen={handleScreenCandidate}
              showJobTitle={!selectedJobId}
            />
          ))}
        </motion.div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-muted-foreground">
            Page <strong className="text-foreground">{page}</strong> of{" "}
            <strong className="text-foreground">{totalPages}</strong>
          </div>

          <div className="flex items-center gap-1.5">
            {/* First Page */}
            <button
              type="button"
              onClick={() => setPage(1)}
              disabled={page === 1}
              aria-label="First page"
              className="p-1.5 rounded-lg border border-border/80 bg-background text-foreground hover:bg-secondary disabled:opacity-30 disabled:pointer-events-none transition"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            {/* Previous Page */}
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Previous page"
              className="p-1.5 rounded-lg border border-border/80 bg-background text-foreground hover:bg-secondary disabled:opacity-30 disabled:pointer-events-none transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Numeric Page Buttons */}
            <div className="flex items-center gap-1">
              {getPageNumbers().map((num, idx) =>
                num === "..." ? (
                  <span key={`dots-${idx}`} className="px-2 text-xs text-muted-foreground font-semibold">
                    ...
                  </span>
                ) : (
                  <button
                    key={`page-${num}`}
                    type="button"
                    onClick={() => setPage(Number(num))}
                    className={cn(
                      "min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold transition",
                      page === num
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "border border-border/80 bg-background text-foreground hover:bg-secondary"
                    )}
                  >
                    {num}
                  </button>
                )
              )}
            </div>

            {/* Next Page */}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              aria-label="Next page"
              className="p-1.5 rounded-lg border border-border/80 bg-background text-foreground hover:bg-secondary disabled:opacity-30 disabled:pointer-events-none transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Last Page */}
            <button
              type="button"
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              aria-label="Last page"
              className="p-1.5 rounded-lg border border-border/80 bg-background text-foreground hover:bg-secondary disabled:opacity-30 disabled:pointer-events-none transition"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
