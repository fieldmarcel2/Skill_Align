import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { jobsApi, matchingApi } from "../../services/api";
import { Job, MatchResult, JobPipelineSummary } from "../../types";
import { useToast } from "../../components/ui/toast";
import { Card } from "../../components/ui/card";
import { HiringPipelineBoard } from "../../components/pipeline/HiringPipelineBoard";
import { Button } from "../../components/ui/button";
import {
  Briefcase,
  Loader2,
  Kanban,
  RefreshCw,
  Users,
  Calendar,
  TrendingUp,
  Award,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  ExternalLink,
  Layers,
  Search,
} from "lucide-react";

export const HiringPipelinePage: React.FC = () => {
  const toast = useToast();
  const navigate = useNavigate();

  // Data states
  const [jobs, setJobs] = useState<Job[]>([]);
  const [summaries, setSummaries] = useState<JobPipelineSummary[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState<boolean>(true);
  const [isLoadingMatches, setIsLoadingMatches] = useState<boolean>(false);
  const [isTriggeringMatch, setIsTriggeringMatch] = useState<boolean>(false);

  // Tab filter for jobs: "active" | "empty" | "all"
  const [requisitionTab, setRequisitionTab] = useState<"active" | "empty" | "all">("active");
  const [searchJobQuery, setSearchJobQuery] = useState<string>("");

  const fetchJobsAndSummaries = async () => {
    try {
      const [jobsData, summaryData] = await Promise.all([
        jobsApi.list(),
        jobsApi.getPipelineSummary().catch(() => []),
      ]);

      setJobs(jobsData);
      setSummaries(summaryData);

      // Auto-select first job if none selected
      if (jobsData.length > 0 && selectedJobId === null) {
        // Prefer a job with active candidates if available
        const activeSummary = summaryData.find((s) => s.total_candidates > 0);
        setSelectedJobId(activeSummary ? activeSummary.id : jobsData[0].id);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to load job requisitions.");
    } finally {
      setIsLoadingJobs(false);
    }
  };

  useEffect(() => {
    fetchJobsAndSummaries();
  }, []);

  const fetchMatches = useCallback(
    async (jobId: number) => {
      setIsLoadingMatches(true);
      try {
        const data = await matchingApi.getMatches(jobId);
        const active = data.filter((m) => m.status !== "rejected");
        setMatches(active);
      } catch (err: any) {
        toast.error(err.response?.data?.detail || "Failed to load match results.");
      } finally {
        setIsLoadingMatches(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    if (selectedJobId !== null) {
      fetchMatches(selectedJobId);
    }
  }, [selectedJobId, fetchMatches]);

  // Trigger 1-click AI matching for empty or updated jobs
  const handleTriggerMatching = async (jobId: number) => {
    setIsTriggeringMatch(true);
    try {
      const res = await matchingApi.runMatch(jobId);
      toast.success(
        res.message || "Matching engine executed! Sourced new matching candidates."
      );
      // Refresh summaries and match list
      await Promise.all([fetchJobsAndSummaries(), fetchMatches(jobId)]);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to run matching engine.");
    } finally {
      setIsTriggeringMatch(false);
    }
  };

  const selectedJob = jobs.find((j) => j.id === selectedJobId);

  // Groupings for Requisition Tabs
  const activeSummaries = summaries.filter((s) => s.total_candidates > 0);
  const emptySummaries = summaries.filter((s) => s.total_candidates === 0);

  // Filtered jobs based on tab & search
  const filteredJobs = jobs.filter((job) => {
    const summary = summaries.find((s) => s.id === job.id);
    const candidateCount = summary ? summary.total_candidates : 0;

    if (requisitionTab === "active" && candidateCount === 0) return false;
    if (requisitionTab === "empty" && candidateCount > 0) return false;

    if (searchJobQuery.trim()) {
      const q = searchJobQuery.toLowerCase();
      const matchTitle = job.title.toLowerCase().includes(q);
      const matchDept = job.department?.toLowerCase().includes(q);
      if (!matchTitle && !matchDept) return false;
    }
    return true;
  });

  // Compute pipeline metrics for selected job
  const pipelineMetrics = React.useMemo(() => {
    if (!matches.length) return null;
    const inInterview = matches.filter((m) =>
      ["interview_scheduled", "approved_by_hr", "technical_interview", "hr_interview"].includes(
        m.status || ""
      )
    ).length;
    const inOffer = matches.filter((m) => m.status === "offer").length;
    const hired = matches.filter((m) => m.status === "hired").length;
    const avgScore = matches.length
      ? Math.round(
          matches.reduce((sum, m) => {
            const raw = Number(m.overall_score) || 0;
            return sum + (raw > 1 ? raw : raw * 100);
          }, 0) / matches.length
        )
      : 0;
    return { inInterview, inOffer, hired, avgScore };
  }, [matches]);

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      {/* ── Top Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <span>HR Command</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-semibold">Hiring Pipeline & Sourcing Hub</span>
          </div>
          <h1 className="text-2xl font-bold font-outfit text-foreground tracking-tight flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
              <Kanban className="h-5 w-5" />
            </div>
            Hiring Pipeline
          </h1>
          <p className="text-xs text-muted-foreground mt-1.5 ml-12">
            Real-time stage progression, automated sourcing intelligence, and interview coordination across all requisitions.
          </p>
        </div>

        <div className="flex items-center gap-2 ml-12 sm:ml-0">
          {selectedJobId && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-xs bg-white/90 dark:bg-slate-900/80 border-slate-200/90 dark:border-slate-800/80 cursor-pointer shadow-xs"
              onClick={() => {
                fetchJobsAndSummaries();
                fetchMatches(selectedJobId);
              }}
              disabled={isLoadingMatches}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoadingMatches ? "animate-spin text-primary" : ""}`} />
              Sync Pipeline
            </Button>
          )}
        </div>
      </div>

      {/* ── Pipeline Metrics Banner (when candidates exist) ────────────────── */}
      {pipelineMetrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-xl border border-slate-200/90 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/60 backdrop-blur-md shadow-xs space-y-1">
            <div className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              <span>Active in Pipeline</span>
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-bold text-foreground font-outfit">{matches.length}</div>
            <div className="text-[11px] text-muted-foreground">Candidates in active stages</div>
          </div>

          <div className="p-4 rounded-xl border border-purple-200/80 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-950/20 backdrop-blur-md shadow-xs space-y-1">
            <div className="text-xs font-medium text-purple-700 dark:text-purple-300 flex items-center justify-between">
              <span>In Interview</span>
              <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-400 font-outfit">{pipelineMetrics.inInterview}</div>
            <div className="text-[11px] text-purple-600/80 dark:text-purple-300/80">Scheduled or passed to rounds</div>
          </div>

          <div className="p-4 rounded-xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 backdrop-blur-md shadow-xs space-y-1">
            <div className="text-xs font-medium text-amber-800 dark:text-amber-300 flex items-center justify-between">
              <span>Offer Stage</span>
              <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-800 dark:text-amber-400 font-outfit">{pipelineMetrics.inOffer}</div>
            <div className="text-[11px] text-amber-700/80 dark:text-amber-300/80">Pending decision or accepted</div>
          </div>

          <div className="p-4 rounded-xl border border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 backdrop-blur-md shadow-xs space-y-1">
            <div className="text-xs font-medium text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
              <span>Avg Match Quality</span>
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 font-outfit">{pipelineMetrics.avgScore}%</div>
            <div className="text-[11px] text-emerald-600/80 dark:text-emerald-300/80">Composite AI relevance score</div>
          </div>
        </div>
      )}

      {/* ── Requisition Selector Hub with Pipeline Intelligence ─────────────── */}
      <div className="bg-white/90 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        {/* Top Controls: Tabs & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/80">
          <div className="flex items-center gap-1.5 p-1 bg-secondary/80 rounded-xl">
            <button
              type="button"
              onClick={() => setRequisitionTab("active")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                requisitionTab === "active"
                  ? "bg-white dark:bg-slate-800 text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Active Pipelines</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-primary/10 text-primary font-bold">
                {activeSummaries.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setRequisitionTab("empty")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                requisitionTab === "empty"
                  ? "bg-white dark:bg-slate-800 text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>Sourcing Needed</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold">
                {emptySummaries.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setRequisitionTab("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                requisitionTab === "all"
                  ? "bg-white dark:bg-slate-800 text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>All Requisitions</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-secondary text-muted-foreground font-semibold">
                {jobs.length}
              </span>
            </button>
          </div>

          <div className="relative min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchJobQuery}
              onChange={(e) => setSearchJobQuery(e.target.value)}
              placeholder="Search requisitions..."
              className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Job Requisition Pills with Live Candidate Badges */}
        {isLoadingJobs ? (
          <div className="flex items-center gap-2 text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-xs">Loading requisitions and pipeline counts...</span>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
            {requisitionTab === "empty"
              ? "All active job requisitions currently have matched candidates in the pipeline!"
              : "No job requisitions found matching the current search criteria."}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 pt-1">
            {filteredJobs.map((job) => {
              const summary = summaries.find((s) => s.id === job.id);
              const count = summary ? summary.total_candidates : 0;
              const isSelected = selectedJobId === job.id;

              return (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => setSelectedJobId(job.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-white dark:bg-slate-900/80 text-foreground border-slate-200/90 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <Briefcase className="h-3.5 w-3.5 opacity-70 shrink-0" />
                  <span className="max-w-[170px] truncate">{job.title}</span>
                  {job.department && (
                    <span className="text-[10px] font-normal opacity-60">· {job.department}</span>
                  )}

                  {/* Candidate Badge */}
                  {count > 0 ? (
                    <span
                      className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      {count}
                    </span>
                  ) : (
                    <span
                      className={`ml-1 px-1.5 py-0.5 rounded-md text-[9px] font-semibold border ${
                        isSelected
                          ? "bg-white/20 text-white border-white/30"
                          : "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60"
                      }`}
                    >
                      0 · Sourcing Needed
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Selected Requisition Meta Bar ──────────────────────────────────── */}
      {selectedJob && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground px-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <Briefcase className="h-3.5 w-3.5 text-primary" />
              <span>{selectedJob.title}</span>
            </div>
            {selectedJob.client_name && <span>({selectedJob.client_name})</span>}
            <span>·</span>
            <span>Min {selectedJob.min_experience_years || 0} yrs exp</span>
            <span>·</span>
            <span>{selectedJob.job_skills?.length || 0} required skills</span>
            <span>·</span>
            <span>
              <strong className="text-foreground font-bold">{matches.length}</strong> candidates in pipeline
            </span>
            {selectedJob.work_mode && (
              <>
                <span>·</span>
                <span className="font-semibold text-foreground/80">{selectedJob.work_mode}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={`/recruiter/candidates?job_id=${selectedJob.id}`}
              className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
            >
              <span>View Matching Pool</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      {/* ── Pipeline Body: Intelligent Sourcing Hub vs Full Kanban Board ──── */}
      {selectedJobId && (
        isLoadingMatches ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground animate-pulse">Loading pipeline stage data...</p>
          </div>
        ) : matches.length === 0 ? (
          /* ── Intelligent Sourcing Hub for Empty Requisitions ────────────── */
          <Card className="p-8 sm:p-10 bg-white/95 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/80 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60 text-xs font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Sourcing & Matching Action Required
                </div>
                <h3 className="text-xl font-bold font-outfit text-foreground tracking-tight">
                  No Active Candidates for {selectedJob?.title || "this Requisition"}
                </h3>
                <p className="text-xs text-muted-foreground max-w-xl">
                  This job requisition has 0 candidates in the pipeline. Candidates appear here when the AI matching engine scans the talent pool and ranks them against the requisition's criteria.
                </p>
              </div>

              {/* 1-Click Match Trigger */}
              <div className="shrink-0">
                <Button
                  onClick={() => handleTriggerMatching(selectedJobId)}
                  disabled={isTriggeringMatch}
                  className="gap-2 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm cursor-pointer"
                >
                  {isTriggeringMatch ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Scanning Candidate Pool...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Run AI Matching Engine Now
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Requisition Criteria Snapshot */}
            {selectedJob && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 space-y-3">
                <div className="text-xs font-bold text-foreground font-outfit uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-primary" />
                  Target Sourcing Profile & Required Skills
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedJob.job_skills && selectedJob.job_skills.length > 0 ? (
                    selectedJob.job_skills.map((js) => (
                      <span
                        key={js.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-foreground shadow-2xs"
                      >
                        <span>{js.skill.name}</span>
                        <span className="text-[10px] text-muted-foreground">({js.requirement_type})</span>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground italic">No specific skills tagged for this requisition</span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1 border-t border-border">
                  <span>Minimum Experience: <strong className="text-foreground font-semibold">{selectedJob.min_experience_years || 0} years</strong></span>
                  <span>Work Mode: <strong className="text-foreground font-semibold">{selectedJob.work_mode || "Hybrid"}</strong></span>
                  {selectedJob.department && <span>Department: <strong className="text-foreground font-semibold">{selectedJob.department}</strong></span>}
                </div>
              </div>
            )}

            {/* Action options */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to={`/recruiter/candidates?job_id=${selectedJobId}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs font-semibold border border-border shadow-2xs transition-colors"
              >
                <Users className="w-3.5 h-3.5 text-muted-foreground" />
                Browse Entire Candidate Pool
              </Link>

              <Link
                to="/hr/jobs/create"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs font-semibold border border-border shadow-2xs transition-colors"
              >
                <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                Modify Requisition Criteria
              </Link>
            </div>
          </Card>
        ) : (
          /* ── Full Interactive Kanban Board ──────────────────────────────── */
          <HiringPipelineBoard
            key={selectedJobId}
            initialMatches={matches}
            onMatchesUpdate={setMatches}
          />
        )
      )}
    </div>
  );
};

export default HiringPipelinePage;

