import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { jobsApi, matchingApi, candidatesApi, resumeApi } from "../../services/api";
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
  ArrowRight,
  Loader2,
  FileText,
  CheckCircle2,
  XCircle,
  Eye,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

export const RecruiterDashboard: React.FC = () => {
  const toast = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [jobMatches, setJobMatches] = useState<Record<number, MatchResult[]>>({});
  const [loadingJobId, setLoadingJobId] = useState<number | null>(null);
  const [updatingMatchId, setUpdatingMatchId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [resumeModalUrl, setResumeModalUrl] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const fetchData = async () => {
    try {
      const jobsData = await jobsApi.list({ my_jobs_only: true });
      setJobs(jobsData);

      // Auto-load matches for the first job if exists
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
      setJobMatches((prev) => ({ ...prev, [jobId]: matches }));
    } catch (err: any) {
      // Matches may not exist yet if not run
      setJobMatches((prev) => ({ ...prev, [jobId]: [] }));
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRunMatch = async (jobId: number) => {
    setLoadingJobId(jobId);
    try {
      const result = await matchingApi.runMatch(jobId);
      setJobMatches((prev) => ({ ...prev, [jobId]: result.results }));
      setSelectedJobId(jobId);
      toast.success(
        `Scored ${result.total_candidates} candidates for this requisition.`,
        "Algorithm Executed"
      );
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to execute matching algorithm.");
    } finally {
      setLoadingJobId(null);
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
        toast.success(
          `${candidateName} has been marked as Screened and sent to HR strategic review!`,
          "Screening Completed"
        );
      } else if (newStatus === "rejected") {
        toast.warning(`${candidateName} has been marked as Rejected.`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to update candidate status.");
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

  const filteredMatches = currentMatches.filter((m) => {
    if (filterStatus === "all") return true;
    return m.status === filterStatus;
  });

  const selectedJob = jobs.find((j) => j.id === selectedJobId);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-outfit text-foreground tracking-tight">
            Recruiter Tactical Hub
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create job requisitions, run candidate matching, review resumes, and screen talents for HR review.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/recruiter/jobs/create">
            <Button variant="gradient" className="gap-2 shadow-lg shadow-indigo-500/20">
              <PlusCircle className="h-4 w-4" /> Create Job Requisition
            </Button>
          </Link>
        </div>
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
          description="Forwarded to HR strategic pipeline"
        />
        <StatCard
          title="Matching Engine"
          value="Ready"
          icon={Sparkles}
          color="blue"
          description="Instant proficiency matching enabled"
        />
      </div>

      {/* Main Grid: Left Jobs List, Right Match & Review Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Requisitions */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold font-outfit text-foreground flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" /> My Job Requisitions ({jobs.length})
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
              {jobs.map((job) => {
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
                      <div>
                        <h3 className="text-base font-bold text-foreground">{job.title}</h3>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                          {job.department && (
                            <span className="flex items-center gap-1">
                              <Building className="h-3 w-3" /> {job.department}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Min {job.min_experience_years} yrs
                          </span>
                        </div>
                      </div>
                      <Badge variant={job.status === "active" ? "success" : "secondary"}>
                        {job.status}
                      </Badge>
                    </div>

                    {/* Required Skills tags */}
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {job.job_skills.map((js) => (
                        <span
                          key={js.id}
                          className="text-[11px] px-1.5 py-0.5 rounded bg-secondary/80 text-foreground border border-border/50"
                        >
                          {js.skill.name} (w:{js.weight})
                        </span>
                      ))}
                    </div>

                    {/* Action buttons on card */}
                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/50">
                      <span className="text-[11px] text-muted-foreground">
                        {matchesForThis.length > 0
                          ? `${matchesForThis.length} Scored Candidates`
                          : "Not matched yet"}
                      </span>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="gradient"
                          className="gap-1.5 h-7 text-xs px-2.5"
                          disabled={loadingJobId === job.id}
                          onClick={() => handleRunMatch(job.id)}
                        >
                          {loadingJobId === job.id ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" /> Matching...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3 w-3" /> Run Match
                            </>
                          )}
                        </Button>
                        <Link to={`/recruiter/jobs/${job.id}`}>
                          <Button size="sm" variant="outline" className="h-7 text-xs px-2">
                            Edit
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Match Results & Screen / Reject Workspace */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold font-outfit text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                {selectedJob ? `Candidate Matches: ${selectedJob.title}` : "Select a Job to View Matches"}
              </h2>
              {selectedJob && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Review calculated match scores, open candidate resumes, and perform initial screening.
                </p>
              )}
            </div>

            {selectedJob && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="gradient"
                  disabled={loadingJobId === selectedJob.id}
                  onClick={() => handleRunMatch(selectedJob.id)}
                  className="gap-1.5 text-xs shadow-md shadow-indigo-500/20"
                >
                  {loadingJobId === selectedJob.id ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Calculating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" /> Re-run Match
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Filter tabs */}
          {currentMatches.length > 0 && (
            <div className="flex items-center gap-2 border-b border-border/70 pb-2">
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
                  {st === "all" ? "All Matches" : st.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          )}

          {/* Matches List */}
          {!selectedJob ? (
            <Card className="p-12 text-center border-border/80 bg-card/60">
              <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-sm font-semibold text-foreground">No requisition selected</p>
              <p className="text-xs text-muted-foreground mt-1">
                Select a job requisition on the left to see candidate match scores.
              </p>
            </Card>
          ) : currentMatches.length === 0 ? (
            <Card className="p-12 text-center border-border/80 bg-card/60 space-y-3">
              <Sparkles className="h-10 w-10 text-indigo-400 mx-auto opacity-70 animate-pulse" />
              <h3 className="text-base font-bold text-foreground">No matches computed yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Click <strong>"Run Match"</strong> to score candidate profiles against {selectedJob.title}'s required skills.
              </p>
              <Button
                variant="gradient"
                disabled={loadingJobId === selectedJob.id}
                onClick={() => handleRunMatch(selectedJob.id)}
                className="gap-2"
              >
                {loadingJobId === selectedJob.id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Scoring Candidates...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Run Matching Engine Now
                  </>
                )}
              </Button>
            </Card>
          ) : filteredMatches.length === 0 ? (
            <Card className="p-8 text-center border-border/80 bg-card/60">
              <p className="text-sm text-muted-foreground">No candidates in status '{filterStatus}'.</p>
            </Card>
          ) : (
            <div className="space-y-3.5">
              {filteredMatches.map((match) => {
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
                          <h3 className="text-base font-bold text-foreground">
                            {match.candidate.full_name}
                          </h3>
                          <Badge
                            variant={
                              isScreened
                                ? "info"
                                : isHRApproved
                                ? "success"
                                : isInterview
                                ? "purple"
                                : isRejected
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {match.status.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span>
                            <strong>Experience:</strong> {match.candidate.total_experience_years} Years
                          </span>
                          {match.candidate.phone && <span>• {match.candidate.phone}</span>}
                          {match.meets_experience ? (
                            <span className="text-emerald-400 flex items-center gap-1 font-medium">
                              <CheckCircle2 className="h-3 w-3" /> Meets Exp Criteria
                            </span>
                          ) : (
                            <span className="text-amber-400 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" /> Below Min Exp ({selectedJob.min_experience_years} yrs)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Overall Match Score Badge */}
                      <div className="flex items-center gap-3">
                        <div className={`px-3 py-1.5 rounded-xl border text-center ${scoreColor}`}>
                          <span className="text-xl font-extrabold font-outfit">{score.toFixed(0)}%</span>
                          <span className="block text-[10px] font-semibold uppercase tracking-wider opacity-80">
                            Match Score
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Declared Candidate Skills */}
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                        Candidate Skills:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {match.candidate.skills.length === 0 ? (
                          <span className="text-xs text-muted-foreground italic">No skills declared</span>
                        ) : (
                          match.candidate.skills.map((cs) => (
                            <span
                              key={cs.id}
                              className="text-xs px-2 py-0.5 rounded-md bg-secondary/80 text-foreground border border-border/60 flex items-center gap-1"
                            >
                              <span>{cs.skill.name}</span>
                              <span className="text-[10px] text-muted-foreground">({cs.proficiency_level})</span>
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Tactical Actions: View Resume, Screen, Reject */}
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
                            View Candidate Resume
                            <ExternalLink className="h-3 w-3 opacity-60 ml-0.5" />
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No resume on file</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Recruiter Tactical Screening Actions */}
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
                          {isScreened ? "Screened (Sent to HR)" : "Screen for HR"}
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
