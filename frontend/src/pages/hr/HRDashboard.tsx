import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { matchingApi, interviewsApi, candidatesApi, notificationsApi, resumeApi } from "../../services/api";
import { MatchResult, Interview, PipelineStatus } from "../../types";
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
} from "lucide-react";

export const HRDashboard: React.FC = () => {
  const toast = useToast();
  const [screenedMatches, setScreenedMatches] = useState<MatchResult[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"screened" | "interviews">("screened");

  // Interview Modal State
  const [selectedMatchForInterview, setSelectedMatchForInterview] = useState<MatchResult | null>(null);
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewType, setInterviewType] = useState("Technical Interview");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [sendEmailNotification, setSendEmailNotification] = useState(true);
  const [isScheduling, setIsScheduling] = useState(false);

  // Profile View Modal State
  const [selectedProfileMatch, setSelectedProfileMatch] = useState<MatchResult | null>(null);

  // Action Loading states
  const [updatingMatchId, setUpdatingMatchId] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      const [screenedData, interviewsData] = await Promise.all([
        matchingApi.getScreenedMatches(),
        interviewsApi.list(),
      ]);
      setScreenedMatches(screenedData);
      setInterviews(interviewsData);
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

  const openScheduleModal = (match: MatchResult) => {
    setSelectedMatchForInterview(match);
    // Set default date to tomorrow 10:00 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const tzOffset = tomorrow.getTimezoneOffset() * 60000;
    const localISOTime = new Date(tomorrow.getTime() - tzOffset).toISOString().slice(0, 16);
    setInterviewDate(localISOTime);
    setInterviewType("Technical Interview");
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

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-outfit text-foreground tracking-tight">
            HR Strategic Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review candidates screened by recruiters, grant strategic hiring approval, and schedule candidate interviews.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === "screened" ? "gradient" : "outline"}
            onClick={() => setActiveTab("screened")}
            className="gap-2 text-xs"
          >
            <UserCheck className="h-4 w-4" /> Screened Talents ({awaitingHRCount})
          </Button>
          <Button
            variant={activeTab === "interviews" ? "gradient" : "outline"}
            onClick={() => setActiveTab("interviews")}
            className="gap-2 text-xs"
          >
            <CalendarCheck className="h-4 w-4" /> Scheduled Interviews ({scheduledCount})
          </Button>
        </div>
      </div>

      {/* Top Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          title="Screened by Recruiter"
          value={awaitingHRCount}
          icon={UserCheck}
          color="indigo"
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
          color="blue"
          description="Scheduled hiring rounds"
        />
      </div>

      {/* Tab 1: Screened Candidates Awaiting HR Review */}
      {activeTab === "screened" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold font-outfit text-foreground flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-indigo-400" />
              Candidates Forwarded by Recruiters ({screenedMatches.length})
            </h2>
          </div>

          {screenedMatches.length === 0 ? (
            <Card className="p-12 text-center border-border/80 bg-card/60 space-y-3">
              <Users className="h-10 w-10 text-muted-foreground mx-auto opacity-40" />
              <h3 className="text-base font-bold text-foreground">No screened candidates pending</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Once recruiters evaluate open jobs and click <strong>"Screen Candidate"</strong>, candidate profiles will appear here for HR approval and interview scheduling.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {screenedMatches.map((match) => {
                const score = Number(match.overall_score);
                const isScreened = match.status === "screened";
                const isApproved = match.status === "approved_by_hr";
                const isScheduled = match.status === "interview_scheduled";
                const isRejected = match.status === "rejected";

                let scoreBadge = "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
                if (score < 50) scoreBadge = "text-rose-400 border-rose-500/30 bg-rose-500/10";
                else if (score < 75) scoreBadge = "text-amber-400 border-amber-500/30 bg-amber-500/10";

                return (
                  <Card
                    key={match.id}
                    className="p-6 border-border/80 bg-card/70 backdrop-blur-xl flex flex-col justify-between hover:border-border transition-all space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
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
                          </div>
                        </div>

                        {/* Match Score */}
                        <div className={`px-3 py-1.5 rounded-xl border text-center ${scoreBadge}`}>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {interviews.map((iv) => (
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
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Video className="h-3.5 w-3.5 text-purple-400" />
                        <span>Format: <strong>{iv.interview_type}</strong></span>
                      </div>
                      {iv.scheduler_name && (
                        <div className="text-muted-foreground text-[11px]">
                          Scheduled by: {iv.scheduler_name} (HR)
                        </div>
                      )}
                    </div>

                    {iv.feedback && (
                      <p className="text-xs text-muted-foreground bg-card/50 p-2.5 rounded-lg border border-border/40 italic">
                        "{iv.feedback}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                    <span className="text-[11px] text-muted-foreground mr-auto">
                      Dispatched to candidate
                    </span>
                    <Badge variant="success" className="text-[10px]">
                      Confirmed
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SCHEDULE INTERVIEW MODAL ─────────────────────────────────────────── */}
      {selectedMatchForInterview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
          <Card className="w-full max-w-lg border-border/80 bg-card p-6 shadow-2xl space-y-5">
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
                  <Clock className="h-3.5 w-3.5 text-primary" /> Interview Date & Time
                </label>
                <Input
                  type="datetime-local"
                  required
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Interview Format / Type</label>
                <select
                  value={interviewType}
                  onChange={(e) => setInterviewType(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-secondary/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Technical Interview">Technical Interview</option>
                  <option value="HR Behavioral & Strategic">HR Behavioral & Strategic</option>
                  <option value="Culture Fit & Team Meet">Culture Fit & Team Meet</option>
                  <option value="Executive Final Round">Executive Final Round</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Meeting Link / Candidate Instructions
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Google Meet Link: https://meet.google.com/xyz, Please be prepared with your code editor."
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
                  Automatically dispatch email notification to candidate
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
                      <Send className="h-3.5 w-3.5" /> Confirm & Schedule Interview
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
    </div>
  );
};
