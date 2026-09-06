import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Search,
  Filter,
  Users,
  Briefcase,
  SlidersHorizontal,
  RefreshCw,
  UserCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { recruiterApi, matchingApi } from "../../services/api";
import { MatchResult, RecruiterJobItem } from "../../types";
import { CandidateCard } from "../../components/candidate/CandidateCard";
import { cn } from "../../lib/utils";

export const RecruiterCandidatesPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL Query Params
  const initialJobId = searchParams.get("jobId") ? Number(searchParams.get("jobId")) : undefined;

  // Filters State
  const [selectedJobId, setSelectedJobId] = useState<number | undefined>(initialJobId);
  const [searchTerm, setSearchTerm] = useState("");
  const [minScore, setMinScore] = useState<number | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [assignmentFilter, setAssignmentFilter] = useState<string>("all"); // 'all', 'assigned_to_me', 'unassigned'

  // Data State
  const [jobs, setJobs] = useState<RecruiterJobItem[]>([]);
  const [candidates, setCandidates] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load assigned jobs on mount
  useEffect(() => {
    loadAssignedJobs();
  }, []);

  // Fetch candidates whenever filters change
  useEffect(() => {
    loadCandidates();
  }, [selectedJobId, minScore, statusFilter, assignmentFilter]);

  const loadAssignedJobs = async () => {
    try {
      const assigned = await recruiterApi.getAssignedJobs();
      setJobs(assigned);
    } catch (err) {
      console.error("Failed to load assigned jobs:", err);
    }
  };

  const loadCandidates = async () => {
    try {
      setLoading(true);
      const params: any = {};
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
    } catch (err) {
      console.error("Failed to load candidates pool:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Candidate Work Queue & Pool
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Review matched candidates, inspect parsed resume evidence, and claim candidates for screening.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setRefreshing(true);
            loadCandidates();
          }}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-secondary text-xs font-semibold text-muted-foreground hover:text-foreground transition shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
          Refresh Pool
        </button>
      </div>

      {jobs.length === 0 && !loading && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3 text-amber-600 dark:text-amber-400 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <span className="font-bold">No Job Requisitions Assigned:</span> You do not have any active job requisitions assigned to your recruiter queue yet. Please request your HR manager to assign requisitions to you in order to review and screen matched candidates.
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search candidates by name or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Job Filter Dropdown */}
          <div className="w-full md:w-60">
            <select
              value={selectedJobId || ""}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : undefined;
                setSelectedJobId(val);
                if (val) setSearchParams({ jobId: String(val) });
                else setSearchParams({});
              }}
              className="w-full py-2 px-3 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
            className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 transition shadow-sm"
          >
            Search
          </button>
        </form>

        {/* Secondary Filter Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
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
                onClick={() => setAssignmentFilter(btn.id)}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-semibold transition border",
                  assignmentFilter === btn.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary/60 text-muted-foreground border-border hover:text-foreground"
                )}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Min Score Dropdown */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Min Score:</span>
              <select
                value={minScore === undefined ? "" : minScore}
                onChange={(e) => setMinScore(e.target.value ? Number(e.target.value) : undefined)}
                className="py-1 px-2 rounded-lg border border-border bg-background text-foreground text-xs"
              >
                <option value="">Any Score</option>
                <option value="0.80">80%+ (High)</option>
                <option value="0.65">65%+ (Good)</option>
                <option value="0.50">50%+ (Moderate)</option>
              </select>
            </div>

            {/* Stage Dropdown */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Stage:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="py-1 px-2 rounded-lg border border-border bg-background text-foreground text-xs"
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

      {/* Candidates List / Grid */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : candidates.length === 0 ? (
        <div className="bg-card border border-border/80 rounded-2xl p-12 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto" />
          <h3 className="text-base font-bold text-foreground">No Candidates Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {selectedJobId
              ? "No candidate matches found matching the selected filters for this job."
              : "No candidates currently available across your assigned job requisitions."}
          </p>
          {(searchTerm || minScore || statusFilter || assignmentFilter !== "all") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setMinScore(undefined);
                setStatusFilter("");
                setAssignmentFilter("all");
              }}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
        </div>
      )}
    </div>
  );
};
