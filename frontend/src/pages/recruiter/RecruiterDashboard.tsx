import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { jobsApi, matchingApi, resumeApi } from "../../services/api";
import { Job, MatchResult, PipelineStatus } from "../../types";
import { useToast } from "../../components/ui/toast";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { StatCard } from "../../components/common/StatCard";
import {
  Briefcase,
  PlusCircle,
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
  Trash2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Laptop,
} from "lucide-react";

const MATCH_PAGE_SIZE = 10;
const JOBS_PAGE_SIZE = 6;

export const RecruiterDashboard: React.FC = () => {
  const toast = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [jobMatches, setJobMatches] = useState<Record<number, MatchResult[]>>({});
  const [loadingJobId, setLoadingJobId] = useState<number | null>(null);
  const [updatingMatchId, setUpdatingMatchId] = useState<number | null>(null);
  const [deletingJobId, setDeletingJobId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [matchPage, setMatchPage] = useState(1);
  const [jobPage, setJobPage] = useState(1);
  const [loadingResumeId, setLoadingResumeId] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      const jobsData = await jobsApi.list({ my_jobs_only: true });
      setJobs(jobsData);
      if (jobsData.length > 0) {
        setSelectedJobId(jobsData[0].id);
        loadMatchesForJob(jobsData[0].id);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to load recruiter data.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadMatchesForJob = async (jobId: number) => {
    try {
      const matches = await matchingApi.getMatches(jobId);
      // Deduplicate by candidate.id (keep the one with highest score)
      const deduped = Object.values(
        matches.reduce((acc: Record<number, MatchResult>, m) => {
          const existing = acc[m.candidate_id];
          if (!existing || Number(m.overall_score) > Number(existing.overall_score)) {
            acc[m.candidate_id] = m;
          }
          return acc;
        }, {})
      );
      setJobMatches((prev) => ({ ...prev, [jobId]: deduped }));
    } catch {
      setJobMatches((prev) => ({ ...prev, [jobId]: [] }));
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Reset pagination when job or filter changes
  useEffect(() => {
    setMatchPage(1);
  }, [selectedJobId, filterStatus]);

  const handleRunMatch = async (jobId: number) => {
    setLoadingJobId(jobId);
    try {
      const result = await matchingApi.runMatch(jobId);
      // Deduplicate results
      const deduped = Object.values(
        result.results.reduce((acc: Record<number, MatchResult>, m) => {
          const existing = acc[m.candidate_id];
          if (!existing || Number(m.overall_score) > Number(existing.overall_score)) {
            acc[m.candidate_id] = m;
          }
          return acc;
        }, {})
      );
      setJobMatches((prev) => ({ ...prev, [jobId]: deduped }));
      setSelectedJobId(jobId);
      toast.success(`Scored ${deduped.length} unique candidates.`, "Algorithm Executed");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to run matching.");
    } finally {
      setLoadingJobId(null);
    }
  };

  const handleDeleteJob = async (job: Job) => {
    if (!window.confirm(`Delete "${job.title}"? This action cannot be undone.`)) return;
    setDeletingJobId(job.id);
    try {
      await jobsApi.delete(job.id);
      setJobs((prev) => prev.filter((j) => j.id !== job.id));
      setJobMatches((prev) => {
        const copy = { ...prev };
        delete copy[job.id];
        return copy;
      });
      if (selectedJobId === job.id) {
        const remaining = jobs.filter((j) => j.id !== job.id);
        setSelectedJobId(remaining.length > 0 ? remaining[0].id : null);
      }
      toast.success(`Job "${job.title}" deleted successfully.`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to delete job.");
    } finally {
      setDeletingJobId(null);
    }
  };

  const handleUpdateStatus = async (matchId: number, newStatus: PipelineStatus, candidateName: string) => {
    setUpdatingMatchId(matchId);
    try {
      const updated = await matchingApi.updateStatus(matchId, newStatus);
      if (selectedJobId) {
        setJobMatches((prev) => ({
          ...prev,
          [selectedJobId]: (prev[selectedJobId] || []).map((m) =>
            m.id === matchId ? { ...m, status: updated.status } : m
          ),
        }));
      }
      if (newStatus === "screened") {
        toast.success(`${candidateName} sent to HR strategic review!`, "Screening Completed");
      } else if (newStatus === "rejected") {
        toast.warning(`${candidateName} marked as Rejected.`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to update candidate status.");
    } finally {
      setUpdatingMatchId(null);
    }
  };

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
      toast.error(err.response?.data?.detail || "Failed to retrieve resume URL.");
    } finally {
      setLoadingResumeId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeJobsCount = jobs.filter((j) => j.status === "active").length;
  const currentMatches = selectedJobId ? jobMatches[selectedJobId] || [] : [];
  const screenedCount = currentMatches.filter((m) => m.status === "screened").length;
  const selectedJob = jobs.find((j) => j.id === selectedJobId);

  const filteredMatches = currentMatches.filter((m) => {
    if (filterStatus === "all") return true;
    return m.status === filterStatus;
  });

  // Pagination
  const totalMatchPages = Math.max(1, Math.ceil(filteredMatches.length / MATCH_PAGE_SIZE));
  const paginatedMatches = filteredMatches.slice(
    (matchPage - 1) * MATCH_PAGE_SIZE,
    matchPage * MATCH_PAGE_SIZE
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight" style={{ fontFamily: "'Inter', sans-serif" }}>
            Recruiter Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Post job requisitions, run candidate matching, and screen talent for HR review.
          </p>
        </div>
        <Link to="/recruiter/jobs/create">
          <Button variant="gradient" className="gap-2 shadow-lg shadow-indigo-500/20">
            <PlusCircle className="h-4 w-4" /> Create Job Requisition
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          title="My Open Jobs"
          value={jobs.length}
          icon={Briefcase}
          color="indigo"
          description={`${activeJobsCount} active requisitions`}
        />
        <StatCard
          title="Candidates Screened"
          value={screenedCount}
          icon={UserCheck}
          color="emerald"
          description="Forwarded to HR pipeline"
        />
        <StatCard
          title="Matching Engine"
          value="Ready"
          icon={Sparkles}
          color="blue"
          description="AI-powered skill matching"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Job Requisitions */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2" style={{ fontFamily: "'Inter', sans-serif" }}>
              <Briefcase className="h-4 w-4 text-primary" /> My Requisitions ({jobs.length})
            </h2>
            <Link to="/recruiter/jobs/create" className="text-xs text-primary font-semibold hover:underline">
              + Post New
            </Link>
          </div>

          {jobs.length === 0 ? (
            <Card className="p-8 text-center border-border/80 bg-card/60">
              <Briefcase className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold text-foreground">No jobs posted yet</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Post your first job requisition to start matching candidates.
              </p>
              <Link to="/recruiter/jobs/create">
                <Button size="sm" variant="gradient">Create Job</Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-3">
              {jobs
                .slice((jobPage - 1) * JOBS_PAGE_SIZE, jobPage * JOBS_PAGE_SIZE)
                .map((job) => {
                  const isSelected = selectedJobId === job.id;
                  const matchesForThis = jobMatches[job.id] || [];

                  return (
                    <Card
                      key={job.id}
                      onClick={() => {
                        setSelectedJobId(job.id);
                        if (!jobMatches[job.id]) loadMatchesForJob(job.id);
                      }}
                      className={`p-4 cursor-pointer transition-all border ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-md shadow-primary/5"
                          : "border-border/80 bg-card/70 hover:border-border hover:bg-card/90"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-foreground truncate" style={{ fontFamily: "'Inter', sans-serif" }}>
                            {job.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                            {job.client_name && (
                              <span className="font-medium text-foreground flex items-center gap-1">
                                <Building className="h-3 w-3 text-indigo-400" /> {job.client_name}
                              </span>
                            )}
                            {job.department && (
                              <span>• {job.department}</span>
                            )}
                            {job.work_mode && (
                              <span className="flex items-center gap-1 px-1.5 py-0.2 rounded bg-secondary/80 text-[10px] font-medium text-foreground">
                                <Laptop className="h-2.5 w-2.5 text-primary" /> {job.work_mode}
                              </span>
                            )}
                            {job.location_city && (
                              <span className="flex items-center gap-1 text-[10px]">
                                <MapPin className="h-2.5 w-2.5 text-muted-foreground" /> {job.location_city}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {job.min_experience_years === 0 ? "Entry Level" : `Min ${job.min_experience_years} yrs`}
                            </span>
                            {job.urgency && (
                              <span className="text-[10px] text-amber-400 font-medium">
                                • {job.urgency}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant={job.status === "active" ? "success" : "secondary"}>
                          {job.status}
                        </Badge>
                      </div>

                      {/* Skills tags */}
                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {job.job_skills.slice(0, 5).map((js) => (
                          <span
                            key={js.id}
                            className="text-[11px] px-1.5 py-0.5 rounded bg-secondary/80 text-foreground border border-border/50"
                          >
                            {js.skill.name}
                          </span>
                        ))}
                        {job.job_skills.length > 5 && (
                          <span className="text-[11px] px-1.5 py-0.5 rounded bg-secondary/80 text-muted-foreground border border-border/50">
                            +{job.job_skills.length - 5} more
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/50">
                        <span className="text-[11px] text-muted-foreground font-medium">
                          {matchesForThis.length > 0
                            ? `${matchesForThis.length} applicant${matchesForThis.length !== 1 ? "s" : ""}`
                            : "No applicants"}
                        </span>
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="gradient"
                            className="gap-1.5 h-7 text-xs px-2.5"
                            disabled={loadingJobId === job.id}
                            onClick={() => handleRunMatch(job.id)}
                          >
                            {loadingJobId === job.id ? (
                              <><Loader2 className="h-3 w-3 animate-spin" /> Matching...</>
                            ) : (
                              <><Sparkles className="h-3 w-3" /> Run Match</>
                            )}
                          </Button>
                          <Link to={`/recruiter/jobs/${job.id}`}>
                            <Button size="sm" variant="outline" className="h-7 text-xs px-2">
                              Edit
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10"
                            disabled={deletingJobId === job.id}
                            onClick={() => handleDeleteJob(job)}
                            title="Delete job"
                          >
                            {deletingJobId === job.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}

              {/* Pagination Controls for Jobs List */}
              {Math.ceil(jobs.length / JOBS_PAGE_SIZE) > 1 && (
                <div className="flex items-center justify-between py-2 border-t border-border/60">
                  <p className="text-[11px] text-muted-foreground">
                    Page {jobPage} of {Math.ceil(jobs.length / JOBS_PAGE_SIZE)} ({jobs.length} jobs)
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={jobPage <= 1}
                      onClick={() => setJobPage((p) => p - 1)}
                      className="h-7 px-2 text-xs"
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <span className="text-xs font-semibold px-1">{jobPage}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={jobPage >= Math.ceil(jobs.length / JOBS_PAGE_SIZE)}
                      onClick={() => setJobPage((p) => p + 1)}
                      className="h-7 px-2 text-xs"
                    >
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Match Results & Screening Workspace */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2" style={{ fontFamily: "'Inter', sans-serif" }}>
                <Sparkles className="h-4 w-4 text-indigo-400" />
                {selectedJob ? `Matches: ${selectedJob.title}` : "Select a Job"}
              </h2>
              {selectedJob && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Review scores, open resumes, and screen candidates for HR.
                </p>
              )}
            </div>
            {selectedJob && (
              <Button
                size="sm"
                variant="gradient"
                disabled={loadingJobId === selectedJob.id}
                onClick={() => handleRunMatch(selectedJob.id)}
                className="gap-1.5 text-xs shadow-md shadow-indigo-500/20 shrink-0"
              >
                {loadingJobId === selectedJob.id ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Calculating...</>
                ) : (
                  <><Sparkles className="h-3.5 w-3.5" /> Re-run Match</>
                )}
              </Button>
            )}
          </div>

          {/* Filter tabs */}
          {currentMatches.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 border-b border-border/70 pb-2.5">
              <span className="text-xs text-muted-foreground mr-1">Filter:</span>
              {["all", "matched", "screened", "approved_by_hr", "interview_scheduled", "rejected"].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                    filterStatus === st
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "bg-secondary/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {st === "all" ? `All (${currentMatches.length})` : st.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          )}

          {/* Match Cards */}
          {!selectedJob ? (
            <Card className="p-12 text-center border-border/80 bg-card/60">
              <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-sm font-semibold text-foreground">No requisition selected</p>
              <p className="text-xs text-muted-foreground mt-1">Select a job on the left to view candidate matches.</p>
            </Card>
          ) : currentMatches.length === 0 ? (
            <Card className="p-12 text-center border-border/80 bg-card/60 space-y-3">
              <Sparkles className="h-10 w-10 text-indigo-400 mx-auto opacity-70 animate-pulse" />
              <h3 className="text-base font-semibold text-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
                No matches computed yet
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Click <strong>Run Match</strong> to score candidates against <em>{selectedJob.title}</em>'s required skills.
              </p>
              <Button
                variant="gradient"
                disabled={loadingJobId === selectedJob.id}
                onClick={() => handleRunMatch(selectedJob.id)}
                className="gap-2"
              >
                {loadingJobId === selectedJob.id ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Scoring Candidates...</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Run Matching Engine</>
                )}
              </Button>
            </Card>
          ) : filteredMatches.length === 0 ? (
            <Card className="p-8 text-center border-border/80 bg-card/60">
              <p className="text-sm text-muted-foreground">No candidates in status '{filterStatus}'.</p>
            </Card>
          ) : (
            <>
              <div className="space-y-3.5">
                {paginatedMatches.map((match) => {
                  const score = Number(match.overall_score);
                  const isScreened = match.status === "screened";
                  const isRejected = match.status === "rejected";
                  const isHRApproved = match.status === "approved_by_hr";
                  const isInterview = match.status === "interview_scheduled";

                  let scoreColor = "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
                  if (score < 50) scoreColor = "text-rose-400 border-rose-500/30 bg-rose-500/10";
                  else if (score < 75) scoreColor = "text-amber-400 border-amber-500/30 bg-amber-500/10";

                  return (
                    <Card
                      key={match.id}
                      className="p-5 border-border/80 bg-card/70 backdrop-blur-xl hover:border-border transition-all space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
                              {match.candidate.full_name}
                            </h3>
                            <Badge
                              variant={
                                isScreened ? "info" : isHRApproved ? "success"
                                  : isInterview ? "purple" : isRejected ? "destructive" : "secondary"
                              }
                            >
                              {match.status.replace(/_/g, " ")}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span><strong>Exp:</strong> {match.candidate.total_experience_years} yrs</span>
                            {match.candidate.phone && <span>• {match.candidate.phone}</span>}
                            {match.meets_experience ? (
                              <span className="text-emerald-400 flex items-center gap-1 font-medium">
                                <CheckCircle2 className="h-3 w-3" /> Meets exp. criteria
                              </span>
                            ) : (
                              <span className="text-amber-400 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" /> Below min ({selectedJob.min_experience_years} yrs)
                              </span>
                            )}
                          </div>
                        </div>

                        <div className={`px-3 py-1.5 rounded-xl border text-center shrink-0 ${scoreColor}`}>
                          <span className="text-xl font-bold font-outfit">{score.toFixed(0)}%</span>
                          <span className="block text-[10px] font-semibold uppercase tracking-wider opacity-80">Match</span>
                        </div>
                      </div>

                      {/* Skills */}
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                          Skills:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {match.candidate.skills.length === 0 ? (
                            <span className="text-xs text-muted-foreground italic">No skills declared</span>
                          ) : (
                            match.candidate.skills.map((cs) => (
                              <span
                                key={cs.id}
                                className="text-xs px-2 py-0.5 rounded-md bg-secondary/80 text-foreground border border-border/60"
                              >
                                {cs.skill.name}
                                <span className="text-[10px] text-muted-foreground ml-1">({cs.proficiency_level})</span>
                              </span>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border/50">
                        <div>
                          {match.candidate.resume_file_path || match.candidate.resume_s3_key ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={loadingResumeId === match.candidate.id}
                              className="gap-1.5 text-xs h-8"
                              onClick={() => handleViewResume(match.candidate.id)}
                            >
                              {loadingResumeId === match.candidate.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                              ) : (
                                <FileText className="h-3.5 w-3.5 text-primary" />
                              )}
                              View Resume
                              <ExternalLink className="h-3 w-3 opacity-60 ml-0.5" />
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">No resume on file</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={updatingMatchId === match.id || isRejected}
                            onClick={() => handleUpdateStatus(match.id, "rejected", match.candidate.full_name)}
                            className="gap-1.5 text-xs h-8"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Reject
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            disabled={updatingMatchId === match.id || isScreened || isHRApproved || isInterview}
                            onClick={() => handleUpdateStatus(match.id, "screened", match.candidate.full_name)}
                            className="gap-1.5 text-xs h-8 bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                          >
                            {updatingMatchId === match.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                            {isScreened ? "Screened ✓" : "Screen for HR"}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalMatchPages > 1 && (
                <div className="flex items-center justify-between py-3 border-t border-border/60">
                  <p className="text-xs text-muted-foreground">
                    Showing {(matchPage - 1) * MATCH_PAGE_SIZE + 1}–{Math.min(matchPage * MATCH_PAGE_SIZE, filteredMatches.length)} of {filteredMatches.length} candidates
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs h-8"
                      disabled={matchPage <= 1}
                      onClick={() => setMatchPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" /> Prev
                    </Button>
                    <span className="text-xs text-muted-foreground font-medium">
                      {matchPage} / {totalMatchPages}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs h-8"
                      disabled={matchPage >= totalMatchPages}
                      onClick={() => setMatchPage((p) => p + 1)}
                    >
                      Next <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
