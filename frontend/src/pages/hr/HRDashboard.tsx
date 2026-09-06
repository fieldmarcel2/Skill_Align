import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { jobsApi, matchingApi, interviewsApi, candidatesApi, notificationsApi, resumeApi } from "../../services/api";
import { Job, MatchResult, Interview, PipelineStatus } from "../../types";
import { useToast } from "../../components/ui/toast";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { StatCard } from "../../components/common/StatCard";
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
} from "lucide-react";
import { AssignRecruiterModal } from "../../components/job/AssignRecruiterModal";

export const HRDashboard: React.FC = () => {
  const toast = useToast();
  const [screenedMatches, setScreenedMatches] = useState<MatchResult[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [publishingJobId, setPublishingJobId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"screened" | "interviews" | "jobs">("screened");
  const [selectedJobForRecruiters, setSelectedJobForRecruiters] = useState<{ id: number; title: string } | null>(null);

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

  const fetchData = async () => {
    try {
      const [screenedData, interviewsData, jobsData] = await Promise.all([
        matchingApi.getScreenedMatches(),
        interviewsApi.list(),
        jobsApi.list(),
      ]);
      setScreenedMatches(screenedData);
      setInterviews(interviewsData);
      setJobs(jobsData);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to load HR dashboard data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

      {/* Top Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Job Requisitions"
          value={jobs.length}
          icon={Briefcase}
          color="indigo"
          description={`${jobs.filter((j) => j.status === "active").length} active, ${jobs.filter((j) => j.status === "draft").length} draft`}
        />
        <StatCard
          title="Screened by Recruiter"
          value={awaitingHRCount}
          icon={UserCheck}
          color="blue"
          description="Awaiting HR strategic approval"
        />
        <StatCard
          title="HR Approved"
          value={approvedCount}
          icon={CheckCircle2}
          color="emerald"
          description="Ready for interview scheduling"
        />
        <StatCard
          title="Active Interviews"
          value={scheduledCount}
          icon={Calendar}
          color="purple"
          description="Scheduled hiring rounds"
        />
      </div>

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

                        {/* Candidate Skills */}
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                            Declared Skills:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {match.candidate.skills.slice(0, 4).map((cs) => (
                              <span
                                key={cs.id}
                                className="text-xs px-2 py-0.5 rounded bg-secondary/80 text-foreground border border-border/50"
                              >
                                {cs.skill.name} ({cs.proficiency_level})
                              </span>
                            ))}
                            {match.candidate.skills.length > 4 && (
                              <span className="text-xs text-muted-foreground self-center">
                                +{match.candidate.skills.length - 4} more
                              </span>
                            )}
                          </div>
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

                          {/* Schedule Interview Modal Trigger */}
                          <Button
                            size="sm"
                            variant="gradient"
                            onClick={() => openScheduleModal(match)}
                            className="gap-1 text-xs h-8 px-3 shadow-md shadow-indigo-500/20"
                          >
                            <Calendar className="h-3.5 w-3.5" />
                            {isScheduled ? "Re-Schedule" : "Schedule Interview"}
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
                          <span>{new Date(iv.interview_date).toLocaleString()}</span>
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
                      <span className="text-[11px] text-muted-foreground">
                        Dispatched to candidate
                      </span>
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

      {/* ── SCHEDULE INTERVIEW MODAL ─────────────────────────────────────────── */}
      {selectedMatchForInterview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
          <Card className="w-full max-w-lg border-border/80 bg-card p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div className="flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold font-outfit text-foreground">
                  Schedule Candidate Interview
                </h3>
              </div>
              <button
                onClick={() => setSelectedMatchForInterview(null)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Candidate & Job Preview */}
            <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/60 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Candidate:</span>
                <span className="font-bold text-foreground">
                  {selectedMatchForInterview.candidate.full_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Position:</span>
                <span className="font-bold text-primary">
                  {selectedMatchForInterview.job?.title}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fit Score:</span>
                <span className="font-bold text-emerald-400">
                  {Number(selectedMatchForInterview.overall_score).toFixed(0)}%
                </span>
              </div>
            </div>

            <form onSubmit={handleScheduleInterviewSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-primary" /> Interview Date & Time *
                </label>
                <Input
                  type="datetime-local"
                  required
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Interview Format</label>
                  <select
                    value={interviewType}
                    onChange={(e) => setInterviewType(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-secondary/50 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Technical Interview">Technical Interview</option>
                    <option value="HR Behavioral & Strategic">HR Behavioral & Strategic</option>
                    <option value="Culture Fit & Team Meet">Culture Fit & Team Meet</option>
                    <option value="Executive Final Round">Executive Final Round</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Meeting Mode</label>
                  <select
                    value={interviewMode}
                    onChange={(e) => setInterviewMode(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-secondary/50 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Online">Online (Google Meet / Zoom)</option>
                    <option value="In-Person">In-Person (Office)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Video className="h-3.5 w-3.5 text-indigo-400" /> Video Call / Meeting Link (Google Meet / Zoom)
                </label>
                <Input
                  type="url"
                  placeholder="e.g. https://meet.google.com/abc-defg-hij or https://zoom.us/j/..."
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Instructions / Notes for Candidate
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Please be prepared to present code or architecture..."
                  value={meetingNotes}
                  onChange={(e) => setMeetingNotes(e.target.value)}
                  className="w-full rounded-lg border border-border bg-secondary/50 p-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="send_notification"
                  checked={sendEmailNotification}
                  onChange={(e) => setSendEmailNotification(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="send_notification" className="text-xs text-muted-foreground">
                  Dispatch email invitation to candidate with meeting link
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/70">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedMatchForInterview(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="gradient"
                  size="sm"
                  disabled={isScheduling}
                  className="gap-1.5 shadow-lg shadow-indigo-500/20 font-semibold"
                >
                  {isScheduling ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Scheduling...
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" /> Confirm & Dispatch Schedule
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
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

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Declared Skills Portfolio
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {selectedProfileMatch.candidate.skills.map((cs) => (
                  <div
                    key={cs.id}
                    className="p-2 rounded-lg border border-border/70 bg-secondary/30 flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-foreground">{cs.skill.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                      {cs.proficiency_level}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border/70">
              {selectedProfileMatch.candidate.resume_file_path ? (
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
                  openScheduleModal(match);
                }}
              >
                Schedule Interview
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
    </div>
  );
};
