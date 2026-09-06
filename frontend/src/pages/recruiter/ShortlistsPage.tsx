import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { matchingApi, candidatesApi } from "../../services/api";
import { MatchResult } from "../../types";
import { useToast } from "../../components/ui/toast";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { getProficiencyBadgeClass, cn } from "../../lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/dialog";
import {
  UserCheck,
  Briefcase,
  FileText,
  Phone,
  Clock,
  Layers,
  XCircle,
  CheckCircle2,
  Download,
  Loader2,
  ExternalLink,
  Search,
  SlidersHorizontal,
  Sparkles,
  MapPin,
  ArrowRight,
  TrendingUp,
  Award,
  Video,
  User,
} from "lucide-react";

export const ShortlistsPage: React.FC = () => {
  const toast = useToast();
  const [shortlists, setShortlists] = useState<MatchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCandidateMatch, setSelectedCandidateMatch] = useState<MatchResult | null>(null);

  // Filters state
  const [selectedJobId, setSelectedJobId] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [minScoreFilter, setMinScoreFilter] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchShortlists = async () => {
    try {
      setIsLoading(true);
      const data = await matchingApi.listShortlists();
      setShortlists(data);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to load shortlists.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShortlists();
  }, []);

  const handleReject = async (matchId: number) => {
    if (!window.confirm("Are you sure you want to reject this shortlisted candidate?")) return;
    try {
      await matchingApi.updateStatus(matchId, "rejected");
      setShortlists((prev) => prev.filter((m) => m.id !== matchId));
      if (selectedCandidateMatch?.id === matchId) {
        setSelectedCandidateMatch(null);
      }
      toast.info("Candidate removed from shortlist and marked as rejected.");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to reject candidate.");
    }
  };

  // Extract unique jobs from shortlisted candidates
  const jobTabs = useMemo(() => {
    const map = new Map<number, { id: number; title: string; count: number }>();
    for (const m of shortlists) {
      if (m.job) {
        const existing = map.get(m.job.id);
        if (existing) {
          existing.count += 1;
        } else {
          map.set(m.job.id, { id: m.job.id, title: m.job.title, count: 1 });
        }
      }
    }
    return Array.from(map.values());
  }, [shortlists]);

  // Filtered shortlists
  const filteredShortlists = useMemo(() => {
    return shortlists.filter((m) => {
      // Job filter
      if (selectedJobId !== "all" && m.job?.id !== selectedJobId) {
        return false;
      }

      // Min Score filter
      const rawScore = Number(m.overall_score) || 0;
      const scorePercent = rawScore > 1 ? rawScore : rawScore * 100;
      if (scorePercent < minScoreFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== "all" && m.status !== statusFilter) {
        return false;
      }

      // Search query (name, email, city, skills)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = m.candidate.full_name?.toLowerCase().includes(q);
        const cityMatch = m.candidate.city?.toLowerCase().includes(q);
        const jobMatch = m.job?.title.toLowerCase().includes(q);
        const skillMatch = (m.candidate.skills || []).some((cs) =>
          cs.skill?.name?.toLowerCase().includes(q)
        );
        if (!nameMatch && !cityMatch && !jobMatch && !skillMatch) {
          return false;
        }
      }

      return true;
    });
  }, [shortlists, selectedJobId, minScoreFilter, statusFilter, searchQuery]);

  // Aggregate stats
  const stats = useMemo(() => {
    const total = shortlists.length;
    if (total === 0) return { total: 0, topScore: 0, avgExp: 0, activeJobsCount: 0 };

    let maxScore = 0;
    let expSum = 0;
    for (const m of shortlists) {
      const raw = Number(m.overall_score) || 0;
      const pct = raw > 1 ? raw : raw * 100;
      if (pct > maxScore) maxScore = pct;
      expSum += Number(m.candidate.total_experience_years || 0);
    }

    return {
      total,
      topScore: Math.round(maxScore),
      avgExp: (expSum / total).toFixed(1),
      activeJobsCount: jobTabs.length,
    };
  }, [shortlists, jobTabs]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Loading shortlisted candidate pipeline...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 animate-in fade-in duration-300">
      {/* ── HEADER & TITLE ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black font-outfit tracking-tight text-foreground flex items-center gap-2.5">
                Shortlisted Talents
                <Badge variant="success" className="text-xs px-2.5 py-0.5 font-bold">
                  {shortlists.length} Candidates
                </Badge>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Top-matching candidates shortlisted for your requisitions. Evaluate profiles, inspect evidence, and coordinate interviews.
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchShortlists}
          className="self-start sm:self-auto text-xs gap-1.5"
        >
          Refresh List
        </Button>
      </div>

      {/* ── METRICS SUMMARY CARDS ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <Card className="p-4 bg-card/70 border-border/80 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Shortlisted</span>
            <UserCheck className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-extrabold text-foreground font-outfit">{stats.total}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Across all requisitions</p>
        </Card>

        <Card className="p-4 bg-card/70 border-border/80 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Top Match Score</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-outfit">
            {stats.topScore}%
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Highest algorithm fit</p>
        </Card>

        <Card className="p-4 bg-card/70 border-border/80 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Avg Experience</span>
            <Clock className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-extrabold text-foreground font-outfit">
            {stats.avgExp} <span className="text-sm font-semibold text-muted-foreground">yrs</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Candidate pool maturity</p>
        </Card>

        <Card className="p-4 bg-card/70 border-border/80 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Open Requisitions</span>
            <Briefcase className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-foreground font-outfit">
            {stats.activeJobsCount}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">With shortlisted talent</p>
        </Card>
      </div>

      {/* ── JOB REQUISITION TABS ───────────────────────────────────────────── */}
      {jobTabs.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedJobId("all")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap border",
              selectedJobId === "all"
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-secondary"
            )}
          >
            All Requisitions ({shortlists.length})
          </button>
          {jobTabs.map((j) => (
            <button
              key={j.id}
              type="button"
              onClick={() => setSelectedJobId(j.id)}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap border flex items-center gap-1.5",
                selectedJobId === j.id
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-secondary"
              )}
            >
              <Briefcase className="w-3 h-3" />
              <span>{j.title}</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-secondary text-[10px] font-extrabold">
                {j.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── SEARCH & FILTER CONTROLS ──────────────────────────────────────── */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search bar */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search shortlisted candidates by name, city, job, or skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Min Score Dropdown */}
          <div className="flex items-center gap-2 w-full md:w-auto text-xs">
            <span className="text-muted-foreground font-semibold whitespace-nowrap">Score:</span>
            <select
              value={minScoreFilter}
              onChange={(e) => setMinScoreFilter(Number(e.target.value))}
              className="w-full md:w-36 py-2 px-3 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value={0}>Any Score</option>
              <option value={80}>80%+ (Strong)</option>
              <option value={70}>70%+ (Good)</option>
              <option value={60}>60%+ (Moderate)</option>
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center gap-2 w-full md:w-auto text-xs">
            <span className="text-muted-foreground font-semibold whitespace-nowrap">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full md:w-44 py-2 px-3 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Pipeline Stages</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="interview_scheduled">Interview Scheduled</option>
              <option value="approved_by_hr">Approved by HR</option>
              <option value="screened">Screened</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── CANDIDATE CARDS LIST ──────────────────────────────────────────── */}
      {filteredShortlists.length === 0 ? (
        <Card className="p-12 text-center border-border/80 bg-card/60 rounded-2xl">
          <UserCheck className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-bold text-foreground">No shortlisted candidates match your filters</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Try adjusting your search criteria, clearing the minimum score filter, or selecting a different job requisition.
          </p>
          {(searchQuery || minScoreFilter > 0 || statusFilter !== "all" || selectedJobId !== "all") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setMinScoreFilter(0);
                setStatusFilter("all");
                setSelectedJobId("all");
              }}
              className="mt-4 text-xs"
            >
              Reset Filters
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredShortlists.map((match) => {
            const rawScore = Number(match.overall_score) || 0;
            const scorePercent = Math.round(rawScore > 1 ? rawScore : rawScore * 100);

            const scoreColor =
              scorePercent >= 80
                ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
                : scorePercent >= 65
                ? "text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/30"
                : scorePercent >= 50
                ? "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30"
                : "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/30";

            // Extract candidate skills
            const allCandidateSkills = match.candidate.skills || [];

            return (
              <Card
                key={match.id}
                className="border-border/80 bg-card/80 backdrop-blur-xl p-5 hover:border-primary/40 transition-all rounded-2xl shadow-sm hover:shadow-md"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  {/* Left Column: Candidate Info & Skills */}
                  <div className="space-y-3 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <Link
                        to={`/recruiter/jobs/${match.job_id}/candidates/${match.candidate_id}`}
                        className="text-lg font-bold font-outfit text-foreground hover:text-primary transition truncate"
                      >
                        {match.candidate.full_name}
                      </Link>

                      <Badge variant="info" className="gap-1 text-xs font-semibold">
                        <Briefcase className="h-3 w-3" /> {match.job?.title || "Requisition"}
                      </Badge>

                      <span
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border",
                          match.status === "interview_scheduled"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                            : match.status === "approved_by_hr"
                            ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
                            : "bg-secondary text-secondary-foreground border-border"
                        )}
                      >
                        {match.status.replace(/_/g, " ")}
                      </span>
                    </div>

                    {/* Metadata Row */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        Total Exp: <strong className="text-foreground">{match.candidate.total_experience_years || 0} Years</strong>
                      </span>
                      {(match.candidate.city || match.candidate.state) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-primary" />
                          {[match.candidate.city, match.candidate.state].filter(Boolean).join(", ")}
                        </span>
                      )}
                      {match.candidate.education_degree && (
                        <span className="flex items-center gap-1">
                          <Award className="w-3.5 h-3.5 text-primary" />
                          {match.candidate.education_degree}
                        </span>
                      )}
                    </div>

                    {/* Required Skills Match Breakdown */}
                    {match.skill_breakdown && match.skill_breakdown.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-primary" /> Required Skills Match:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {match.skill_breakdown.map((sk) => {
                            const isResume = sk.source === "resume" || Boolean(sk.evidence_text);
                            return (
                              <span
                                key={sk.skill_id}
                                className={cn(
                                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs border font-medium",
                                  isResume
                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25"
                                    : "bg-secondary text-foreground border-border"
                                )}
                                title={sk.evidence_text ? `Resume Evidence: "${sk.evidence_text}"` : isResume ? "Verified from resume" : "Self-declared"}
                              >
                                {sk.skill_name}
                                {isResume ? (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-bold">
                                    Resume
                                  </span>
                                ) : (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-secondary text-muted-foreground">
                                    Self
                                  </span>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Additional Candidate Skills Portfolio */}
                    {(() => {
                      const reqSet = new Set(match.skill_breakdown?.map((s) => s.skill_name.toLowerCase()) || []);
                      const extra = allCandidateSkills.filter(
                        (cs) => cs.skill?.name && !reqSet.has(cs.skill.name.toLowerCase())
                      );
                      if (extra.length === 0) return null;

                      return (
                        <div className="flex flex-wrap items-center gap-1 pt-1 text-xs">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
                            Skills:
                          </span>
                          {extra.slice(0, 5).map((cs) => (
                            <span
                              key={cs.id}
                              className="px-1.5 py-0.5 rounded text-[11px] bg-secondary/80 text-foreground border border-border/60"
                            >
                              {cs.skill.name}
                            </span>
                          ))}
                          {extra.length > 5 && (
                            <span className="text-[11px] text-muted-foreground">
                              +{extra.length - 5} more
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Right Column: Score & Action Suite */}
                  <div className="flex items-center justify-between lg:justify-end gap-4 shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-border/50">
                    {/* Score Badge */}
                    <div
                      className={cn(
                        "flex flex-col items-center justify-center min-w-[62px] h-14 rounded-2xl border px-3",
                        scoreColor
                      )}
                      title="Deterministic match score based on verified resume evidence, required skills, and experience"
                    >
                      <span className="text-xl font-black leading-none">{scorePercent}%</span>
                      <span className="text-[9px] font-extrabold uppercase tracking-wider mt-0.5">Match</span>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/recruiter/jobs/${match.job_id}/candidates/${match.candidate_id}`}>
                        <Button size="sm" className="text-xs gap-1 font-bold shadow-sm">
                          Evaluate & Review
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedCandidateMatch(match)}
                        className="text-xs"
                      >
                        Profile Details
                      </Button>

                      {match.candidate.resume_file_path && (
                        <a
                          href={candidatesApi.getResumeUrl(match.candidate.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-xs text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/10"
                            title="Open original resume document"
                          >
                            <FileText className="h-3.5 w-3.5" /> Resume
                          </Button>
                        </a>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReject(match.id)}
                        className="text-xs text-rose-500 hover:bg-rose-500/10 border-rose-500/30"
                        title="Reject candidate"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── CANDIDATE PROFILE DETAILS MODAL ───────────────────────────────── */}
      <Dialog
        open={!!selectedCandidateMatch}
        onOpenChange={(open) => !open && setSelectedCandidateMatch(null)}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedCandidateMatch && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <DialogTitle className="text-2xl font-bold font-outfit">
                      {selectedCandidateMatch.candidate.full_name}
                    </DialogTitle>
                    <DialogDescription className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                      {selectedCandidateMatch.job && (
                        <span className="flex items-center gap-1 text-primary font-semibold">
                          <Briefcase className="h-3.5 w-3.5" /> Requisition: {selectedCandidateMatch.job.title}
                        </span>
                      )}
                      {selectedCandidateMatch.candidate.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" /> {selectedCandidateMatch.candidate.phone}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {selectedCandidateMatch.candidate.total_experience_years || 0} Years Exp
                      </span>
                    </DialogDescription>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                      {Math.round(Number(selectedCandidateMatch.overall_score) > 1 ? Number(selectedCandidateMatch.overall_score) : Number(selectedCandidateMatch.overall_score) * 100)}%
                    </span>
                    <span className="block text-[10px] font-bold text-muted-foreground uppercase">Fit Score</span>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-5 py-3">
                {/* Resume Card */}
                <div className="p-4 rounded-xl border border-border bg-secondary/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-6 w-6 text-primary" />
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">Original Resume File</h4>
                      <p className="text-xs text-muted-foreground">
                        {selectedCandidateMatch.candidate.resume_file_path
                          ? "Candidate resume on record"
                          : "No resume uploaded"}
                      </p>
                    </div>
                  </div>
                  {selectedCandidateMatch.candidate.resume_file_path && (
                    <a
                      href={candidatesApi.getResumeUrl(selectedCandidateMatch.candidate.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="gradient" size="sm" className="gap-1.5 text-xs">
                        <Download className="h-3.5 w-3.5" /> Download Resume
                      </Button>
                    </a>
                  )}
                </div>

                {/* Complete Candidate Skills Portfolio */}
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" /> Full Candidate Skills Portfolio ({selectedCandidateMatch.candidate.skills?.length || 0})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(selectedCandidateMatch.candidate.skills || []).map((cs) => {
                      const isResume = cs.source === "resume" || Boolean(cs.evidence_text);
                      return (
                        <div
                          key={cs.id}
                          className="p-2.5 rounded-xl border border-border/70 bg-card/60 flex items-center justify-between"
                        >
                          <div>
                            <span className="text-xs font-semibold text-foreground">
                              {cs.skill.name}
                            </span>
                            <span className="block text-[10px] text-muted-foreground">
                              {cs.skill.category}
                            </span>
                          </div>
                          <div className="text-right">
                            {isResume ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30">
                                Resume Verified
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-secondary text-muted-foreground border">
                                Self-Declared
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Action shortcut to review */}
                <div className="pt-2 flex justify-end gap-2 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedCandidateMatch(null)}
                    className="text-xs"
                  >
                    Close
                  </Button>
                  <Link
                    to={`/recruiter/jobs/${selectedCandidateMatch.job_id}/candidates/${selectedCandidateMatch.candidate_id}`}
                    onClick={() => setSelectedCandidateMatch(null)}
                  >
                    <Button size="sm" className="text-xs gap-1 font-bold">
                      Open Full Candidate Evaluation
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
