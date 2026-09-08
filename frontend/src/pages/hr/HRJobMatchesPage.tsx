import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import confetti from "canvas-confetti";
import { jobsApi, matchingApi, candidatesApi, resumeApi } from "../../services/api";
import { Job, MatchResult, PipelineStatus } from "../../types";
import { useToast } from "../../components/ui/toast";
import { Button } from "../../components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { ScoreBadge } from "../../components/common/ScoreBadge";
import { getProficiencyBadgeClass } from "../../lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog";
import {
  ArrowLeft,
  Sparkles,
  BookmarkCheck,
  XCircle,
  Clock,
  Building,
  CheckCircle2,
  AlertCircle,
  FileText,
  Phone,
  Layers,
  Loader2,
  TrendingUp,
  FileCode,
  Copy,
  Check,
  ExternalLink,
  Users,
  ListTodo,
  UserCheck,
  Quote,
} from "lucide-react";
import { AssignRecruiterModal } from "../../components/job/AssignRecruiterModal";
import { RecruitmentTaskModal } from "../../components/task/RecruitmentTaskModal";

export const HRJobMatchesPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const jobId = Number(id);
  const toast = useToast();

  const [job, setJob] = useState<Job | null>(null);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [selectedMatch, setSelectedMatch] = useState<MatchResult | null>(null);

  // Recruiter assignment & Task modals
  const [isAssignRecruiterOpen, setIsAssignRecruiterOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskCandidate, setTaskCandidate] = useState<{ id: number; name: string } | null>(null);

  // Resume viewing states
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);
  const [extractedRawText, setExtractedRawText] = useState("");
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [jobData, matchData] = await Promise.all([
        jobsApi.getById(jobId),
        matchingApi.getMatches(jobId),
      ]);
      setJob(jobData);
      setMatches(matchData);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to load matching data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (jobId) fetchData();
  }, [jobId]);

  const handleRunMatchAgain = async () => {
    setIsRunning(true);
    try {
      const result = await matchingApi.runMatch(jobId);
      if (result.results && Array.isArray(result.results)) {
        setMatches(result.results);
        toast.success(
          `Matching re-executed! Refreshed scores for ${result.total_candidates} candidates.`,
          "Algorithm Updated"
        );
        setIsRunning(false);
      } else {
        toast.info(result.message || "Matching algorithm queued in background.", "Background Match Queued");
        let attempts = 0;
        const interval = setInterval(async () => {
          attempts++;
          try {
            const statusData = await matchingApi.getMatchStatus(jobId);
            if (statusData.processing_status === "completed" || attempts >= 10) {
              clearInterval(interval);
              setIsRunning(false);
              const refreshed = await matchingApi.getMatches(jobId);
              setMatches(refreshed);
              if (statusData.processing_status === "completed") {
                toast.success(`Matching complete! ${statusData.matched_candidates} candidates evaluated.`, "Algorithm Completed");
              }
            }
          } catch {
            if (attempts >= 5) {
              clearInterval(interval);
              setIsRunning(false);
            }
          }
        }, 2500);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to rerun matching.");
      setIsRunning(false);
    }
  };

  const handleStatusUpdate = async (
    matchId: number,
    newStatus: PipelineStatus
  ) => {
    try {
      const updated = await matchingApi.updateStatus(matchId, newStatus);
      setMatches((prev) => prev.map((m) => (m.id === matchId ? updated : m)));

      if (newStatus === "approved_by_hr" || newStatus === "interview_scheduled") {
        // Trigger celebratory confetti effect
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
          colors: ["#6366f1", "#a855f7", "#10b981"],
        });
        toast.success(`Candidate status updated to ${newStatus.replace(/_/g, " ")}.`, "Status Updated");
      } else {
        toast.info(`Candidate status updated to ${newStatus.replace(/_/g, " ")}.`, "Status Updated");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to update match status.");
    }
  };

  const filteredMatches = matches.filter((m) => {
    if (activeTab === "all") return true;
    return m.status === activeTab;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Back button & Page title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/hr"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to HR Dashboard
          </Link>
          <h1 className="text-3xl font-extrabold font-outfit text-foreground tracking-tight flex items-center gap-3">
            {job?.title}
            <Badge variant="success">Active Job</Badge>
          </h1>
          <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
            {job?.department && (
              <span className="flex items-center gap-1">
                <Building className="h-3.5 w-3.5" /> {job.department}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> Minimum {job?.min_experience_years} Years Experience
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAssignRecruiterOpen(true)}
            className="gap-1.5 text-xs font-semibold"
          >
            <Users className="h-4 w-4 text-primary" /> Assign Recruiters
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setTaskCandidate(null);
              setIsTaskModalOpen(true);
            }}
            className="gap-1.5 text-xs font-semibold"
          >
            <ListTodo className="h-4 w-4 text-primary" /> Dispatch Task
          </Button>

          <Button
            variant="gradient"
            size="sm"
            onClick={handleRunMatchAgain}
            disabled={isRunning}
            className="gap-2 shadow-lg shadow-indigo-500/20 text-xs font-semibold"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Recalculating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Re-run Matching Engine
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Required Skills breakdown bar */}
      <Card className="border-border/80 bg-card/60 backdrop-blur-xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Target Skills Criteria & Weights:
            </span>
            <div className="flex flex-wrap gap-2 pt-1">
              {job?.job_skills.map((js) => (
                <Badge
                  key={js.id}
                  variant={js.requirement_type === "required" ? "default" : "secondary"}
                  className="gap-1 py-1"
                >
                  <span className="font-semibold">{js.skill.name}</span>
                  <span className="opacity-70 text-[10px]">
                    ({js.requirement_type} • weight {js.weight})
                  </span>
                </Badge>
              ))}
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs text-muted-foreground">Ranked Candidates:</span>
            <p className="text-xl font-bold font-outfit text-foreground">{matches.length}</p>
          </div>
        </div>
      </Card>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "all"
              ? "bg-primary text-primary-foreground shadow-md shadow-indigo-500/20"
              : "text-muted-foreground hover:bg-secondary"
          }`}
        >
          All Matches ({matches.length})
        </button>
        <button
          onClick={() => setActiveTab("screening")}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "screening"
              ? "bg-blue-500 text-white shadow-md shadow-blue-500/20"
              : "text-muted-foreground hover:bg-secondary"
          }`}
        >
          Screening ({matches.filter((m) => m.status === "screening").length})
        </button>
        <button
          onClick={() => setActiveTab("technical_interview")}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "technical_interview"
              ? "bg-violet-500 text-white shadow-md shadow-violet-500/20"
              : "text-muted-foreground hover:bg-secondary"
          }`}
        >
          Technical ({matches.filter((m) => m.status === "technical_interview").length})
        </button>
        <button
          onClick={() => setActiveTab("rejected")}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "rejected"
              ? "bg-rose-500 text-white shadow-md shadow-rose-500/20"
              : "text-muted-foreground hover:bg-secondary"
          }`}
        >
          Rejected ({matches.filter((m) => m.status === "rejected").length})
        </button>
      </div>

      {/* Ranked Candidate Results List */}
      {filteredMatches.length === 0 ? (
        <Card className="p-12 text-center border-border/80 bg-card/60">
          <Sparkles className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-semibold text-foreground">No candidate matches in this view</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Click "Re-run Matching Engine" above to score available candidate profiles.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredMatches.map((match, index) => {
            const candSkillsMap = new Map(
              match.candidate.skills.map((cs) => [cs.skill.id, cs])
            );

            return (
              <Card
                key={match.id}
                className={`border bg-card/80 backdrop-blur-xl p-6 transition-all duration-300 hover:shadow-xl ${
                  match.status === "technical_interview" || match.status === "hr_interview" || match.status === "offer" || match.status === "hired"
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : match.status === "rejected"
                    ? "border-rose-500/20 opacity-70"
                    : "border-border/80 hover:border-primary/40"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* Left info */}
                  <div className="flex items-start gap-4">
                    {/* Rank number badge */}
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary border border-border text-foreground font-outfit font-bold shrink-0">
                      #{index + 1}
                    </div>

                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-bold font-outfit text-foreground">
                          {match.candidate.full_name}
                        </h3>

                        {/* Status Badge */}
                        {match.status === "technical_interview" && (
                          <Badge variant="success">
                            <BookmarkCheck className="h-3 w-3 mr-1" /> Technical Interview
                          </Badge>
                        )}
                        {match.status === "hr_interview" && (
                          <Badge variant="info">
                            <Sparkles className="h-3 w-3 mr-1" /> HR Interview
                          </Badge>
                        )}
                        {match.status === "offer" && (
                          <Badge variant="success">
                            <TrendingUp className="h-3 w-3 mr-1" /> Offer Extended
                          </Badge>
                        )}
                        {match.status === "hired" && (
                          <Badge variant="success">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Hired
                          </Badge>
                        )}
                        {match.status === "rejected" && (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" /> Rejected
                          </Badge>
                        )}
                        {match.status === "screening" && (
                          <Badge variant="info">
                            <Sparkles className="h-3 w-3 mr-1" /> Screening
                          </Badge>
                        )}

                        {/* Experience Check Badge */}
                        {match.meets_experience ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Meets Exp (
                            {match.candidate.total_experience_years} yrs)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                            <AlertCircle className="h-3.5 w-3.5" /> Experience Gap (
                            {match.candidate.total_experience_years} yrs vs req {job?.min_experience_years} yrs)
                          </span>
                        )}
                      </div>

                      {/* Contact & Experience info */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-primary" />
                          {match.candidate.total_experience_years} Years Experience
                        </span>
                        {match.candidate.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5 text-primary" />
                            {match.candidate.phone}
                          </span>
                        )}
                        {match.candidate.education_degree && (
                          <span className="flex items-center gap-1">
                            <Layers className="h-3.5 w-3.5 text-primary" />
                            {match.candidate.education_degree}
                          </span>
                        )}
                      </div>

                      {/* Skill Match Breakdown comparison */}
                      <div className="space-y-1.5 pt-1">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Job Skills Evaluation:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {job?.job_skills.map((js) => {
                            const cs = candSkillsMap.get(js.skill.id);
                            if (cs) {
                              const isResume = cs.source === "resume";
                              return (
                                <span
                                  key={js.id}
                                  className={`text-xs px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${getProficiencyBadgeClass(
                                    cs.proficiency_level
                                  )}`}
                                  title={cs.evidence_text ? `Resume evidence: "${cs.evidence_text}"` : undefined}
                                >
                                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                                  <span>{js.skill.name}</span>
                                  <span className="font-semibold text-[11px]">
                                    ({cs.proficiency_level || "Detected"})
                                  </span>
                                  {isResume && (
                                    <span className="text-[10px] px-1 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                                      Resume
                                    </span>
                                  )}
                                </span>
                              );
                            } else {
                              return (
                                <span
                                  key={js.id}
                                  className="text-xs px-2.5 py-1 rounded-lg border border-dashed border-rose-500/30 bg-rose-500/10 text-rose-400 flex items-center gap-1.5"
                                >
                                  <XCircle className="h-3 w-3 shrink-0" />
                                  <span>{js.skill.name}</span>
                                  <span className="text-[10px] opacity-75">(Missing)</span>
                                </span>
                              );
                            }
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Score & Actions */}
                  <div className="flex items-center justify-between lg:justify-end gap-6 shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-border/50">
                    <ScoreBadge score={match.overall_score} size="lg" />

                    <div className="flex flex-col gap-2 min-w-[140px]">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedMatch(match)}
                        className="w-full text-xs"
                      >
                        View Full Profile
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setTaskCandidate({ id: match.candidate.id, name: match.candidate.full_name });
                          setIsTaskModalOpen(true);
                        }}
                        className="w-full text-xs gap-1"
                      >
                        <ListTodo className="h-3.5 w-3.5 text-primary" /> Assign Task
                      </Button>

                      {match.status === "screening" && (
                        <Button
                          variant="gradient"
                          size="sm"
                          onClick={() => handleStatusUpdate(match.id, "technical_interview")}
                          className="w-full text-xs gap-1 shadow-md shadow-indigo-500/20"
                        >
                          <BookmarkCheck className="h-3.5 w-3.5" /> Move to Technical
                        </Button>
                      )}
                      {match.status === "technical_interview" && (
                        <Button
                          variant="gradient"
                          size="sm"
                          onClick={() => handleStatusUpdate(match.id, "hr_interview")}
                          className="w-full text-xs gap-1 shadow-md shadow-indigo-500/20"
                        >
                          <BookmarkCheck className="h-3.5 w-3.5" /> Move to HR Interview
                        </Button>
                      )}

                      {match.status !== "rejected" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusUpdate(match.id, "rejected")}
                          className="w-full text-xs text-rose-400 hover:bg-rose-500/10 border-rose-500/30"
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Candidate Profile Details Modal */}
      <Dialog open={!!selectedMatch} onOpenChange={(open) => !open && setSelectedMatch(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedMatch && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle className="text-2xl font-bold font-outfit">
                      {selectedMatch.candidate.full_name}
                    </DialogTitle>
                    <DialogDescription className="flex items-center gap-3 pt-1 text-xs">
                      {selectedMatch.candidate.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" /> {selectedMatch.candidate.phone}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> Total Experience:{" "}
                        {selectedMatch.candidate.total_experience_years} Years
                      </span>
                    </DialogDescription>
                  </div>
                  <ScoreBadge score={selectedMatch.overall_score} size="md" />
                </div>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Resume section */}
                <div className="p-4 rounded-xl border border-border bg-secondary/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-6 w-6 text-primary" />
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">Candidate Resume</h4>
                      <p className="text-xs text-muted-foreground">
                        {selectedMatch.candidate.resume_file_path || selectedMatch.candidate.resume_s3_key
                          ? "Resume uploaded and text extracted"
                          : "No resume uploaded yet"}
                      </p>
                    </div>
                  </div>
                  {(selectedMatch.candidate.resume_file_path || selectedMatch.candidate.resume_s3_key) && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs text-primary border-primary/40 hover:bg-primary/10"
                        onClick={async () => {
                          try {
                            const data = await resumeApi.getUrl(selectedMatch.candidate.id);
                            if (data.resume_url) {
                              window.open(data.resume_url, "_blank", "noopener,noreferrer");
                            } else {
                              toast.error("Resume URL not found.");
                            }
                          } catch {
                            toast.error("Failed to load secure resume URL.");
                          }
                        }}
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> View File
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isLoadingText}
                        className="gap-1.5 text-xs text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/10"
                        onClick={async () => {
                          setIsLoadingText(true);
                          try {
                            const data = await resumeApi.getText(selectedMatch.candidate.id);
                            setExtractedRawText(data.raw_text || "");
                            setIsTextModalOpen(true);
                          } catch {
                            toast.error("Failed to load extracted resume text.");
                          } finally {
                            setIsLoadingText(false);
                          }
                        }}
                      >
                        {isLoadingText ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileCode className="h-3.5 w-3.5" />}
                        View .TXT
                      </Button>
                    </div>
                  )}
                </div>

                {/* Candidate Skills Portfolio (Resume-Extracted vs Declared) */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4" /> Resume-Extracted & Matched Skills
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {selectedMatch.candidate.skills
                        .filter((cs) => cs.source === "resume" || cs.evidence_text)
                        .map((cs) => (
                          <div
                            key={cs.id}
                            title={cs.evidence_text ? `Evidence: "${cs.evidence_text}"` : "Extracted from resume"}
                            className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-between"
                          >
                            <div className="min-w-0 pr-2">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-semibold text-foreground truncate">
                                  {cs.skill.name}
                                </span>
                                <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/30 text-emerald-200 font-mono font-bold">
                                  [Resume]
                                </span>
                              </div>
                              {cs.evidence_text && (
                                <p className="text-[10px] text-emerald-300/80 italic truncate mt-0.5" title={cs.evidence_text}>
                                  "{cs.evidence_text}"
                                </p>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <span
                                className={`text-xs px-2 py-0.5 rounded-md border font-semibold ${getProficiencyBadgeClass(
                                  cs.proficiency_level
                                )}`}
                              >
                                {cs.proficiency_level || "Detected"}
                              </span>
                              <span className="block text-[10px] text-muted-foreground pt-0.5">
                                {cs.years_experience} yrs
                              </span>
                            </div>
                          </div>
                        ))}
                      {selectedMatch.candidate.skills.filter((cs) => cs.source === "resume" || cs.evidence_text).length === 0 && (
                        <p className="text-xs text-muted-foreground col-span-2 italic">
                          No skills auto-extracted from resume. Check declared skills below.
                        </p>
                      )}
                    </div>
                  </div>

                  {selectedMatch.candidate.skills.filter((cs) => cs.source !== "resume" && !cs.evidence_text).length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                        Self-Declared Skills
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {selectedMatch.candidate.skills
                          .filter((cs) => cs.source !== "resume" && !cs.evidence_text)
                          .map((cs) => (
                            <div
                              key={cs.id}
                              className="p-3 rounded-xl border border-border/70 bg-card/60 flex items-center justify-between"
                            >
                              <div>
                                <span className="text-sm font-semibold text-foreground">
                                  {cs.skill.name}
                                </span>
                                <span className="block text-[11px] text-muted-foreground">
                                  {cs.skill.category}
                                </span>
                              </div>
                              <div className="text-right">
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-md border font-semibold ${getProficiencyBadgeClass(
                                    cs.proficiency_level
                                  )}`}
                                >
                                  {cs.proficiency_level || "Declared"}
                                </span>
                                <span className="block text-[10px] text-muted-foreground pt-0.5">
                                  {cs.years_experience} yrs exp
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Extracted Resume Plain Text (.txt) Modal */}
      <Dialog open={isTextModalOpen} onOpenChange={setIsTextModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileCode className="h-5 w-5 text-indigo-400" />
                Extracted Resume Plain Text (.txt)
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!extractedRawText) return;
                  navigator.clipboard.writeText(extractedRawText);
                  setIsCopied(true);
                  setTimeout(() => setIsCopied(false), 2000);
                  toast.success("Copied to clipboard.");
                }}
                className="gap-1.5 text-xs"
              >
                {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {isCopied ? "Copied" : "Copy Text"}
              </Button>
            </DialogTitle>
            <DialogDescription>
              Clean, readable text extracted from candidate resume document.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 rounded-xl bg-secondary/40 border border-border/80 font-mono text-xs text-foreground whitespace-pre-wrap leading-relaxed">
            {extractedRawText || "No text content available."}
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setIsTextModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recruiter Assignment Modal */}
      <AssignRecruiterModal
        isOpen={isAssignRecruiterOpen}
        onClose={() => setIsAssignRecruiterOpen(false)}
        jobId={jobId}
        jobTitle={job?.title || "Requisition"}
        onAssignmentUpdated={() => fetchData()}
      />

      {/* Recruitment Task Modal */}
      <RecruitmentTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setTaskCandidate(null);
        }}
        jobId={jobId}
        jobTitle={job?.title || "Requisition"}
        candidateId={taskCandidate?.id}
        candidateName={taskCandidate?.name}
        onTaskCreated={() => toast.success("Recruitment task dispatched successfully!", "Task Created")}
      />
    </div>
  );
};
