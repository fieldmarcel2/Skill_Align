import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { matchingApi, candidatesApi } from "../../services/api";
import { MatchResult } from "../../types";
import { useToast } from "../../components/ui/toast";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { ScoreBadge } from "../../components/common/ScoreBadge";
import { getProficiencyBadgeClass } from "../../lib/utils";
import {
  BookmarkCheck,
  Briefcase,
  FileText,
  Clock,
  ArrowLeft,
  ArrowRight,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  TrendingUp,
  Users,
  Target,
  Award,
  CheckCircle2,
  XCircle,
  MapPin,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Calendar,
  LayoutGrid,
  Table,
  Filter,
  RefreshCw,
  Sparkles,
  Eye,
} from "lucide-react";

type SortField = "name" | "score" | "experience" | "status" | "job";
type SortDir = "asc" | "desc";
type ViewMode = "table" | "grid";

export const HRShortlistsPage: React.FC = () => {
  const toast = useToast();
  const [shortlists, setShortlists] = useState<MatchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [jobFilter, setJobFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [minScore, setMinScore] = useState(0);
  const [sortField, setSortField] = useState<SortField>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await matchingApi.listShortlists();
        setShortlists(data);
      } catch {
        toast.error("Failed to load shortlisted candidates.");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // Unique jobs for filter
  const uniqueJobs = useMemo(() => {
    const map = new Map<number, string>();
    for (const m of shortlists) {
      if (m.job) map.set(m.job.id, m.job.title);
    }
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [shortlists]);

  // Stats
  const stats = useMemo(() => {
    if (!shortlists.length) return { total: 0, avgScore: 0, topScore: 0, jobs: 0 };
    let scoreSum = 0, maxScore = 0;
    for (const m of shortlists) {
      const raw = Number(m.overall_score) || 0;
      const pct = raw > 1 ? raw : raw * 100;
      scoreSum += pct;
      if (pct > maxScore) maxScore = pct;
    }
    return {
      total: shortlists.length,
      avgScore: Math.round(scoreSum / shortlists.length),
      topScore: Math.round(maxScore),
      jobs: uniqueJobs.length,
    };
  }, [shortlists, uniqueJobs]);

  // Filtered + sorted list
  const filteredList = useMemo(() => {
    let list = [...shortlists];

    if (jobFilter !== "all") {
      list = list.filter((m) => String(m.job?.id) === jobFilter);
    }
    if (stageFilter !== "all") {
      list = list.filter((m) => m.status === stageFilter);
    }
    if (minScore > 0) {
      list = list.filter((m) => {
        const raw = Number(m.overall_score) || 0;
        return (raw > 1 ? raw : raw * 100) >= minScore;
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((m) =>
        m.candidate.full_name?.toLowerCase().includes(q) ||
        m.job?.title?.toLowerCase().includes(q) ||
        m.candidate.city?.toLowerCase().includes(q) ||
        (m.candidate.skills || []).some((cs) =>
          cs.skill?.name?.toLowerCase().includes(q)
        )
      );
    }

    list.sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;
      if (sortField === "score") {
        const ar = Number(a.overall_score) || 0;
        const br = Number(b.overall_score) || 0;
        aVal = ar > 1 ? ar : ar * 100;
        bVal = br > 1 ? br : br * 100;
      } else if (sortField === "name") {
        aVal = a.candidate.full_name?.toLowerCase() || "";
        bVal = b.candidate.full_name?.toLowerCase() || "";
      } else if (sortField === "experience") {
        aVal = Number(a.candidate.total_experience_years) || 0;
        bVal = Number(b.candidate.total_experience_years) || 0;
      } else if (sortField === "status") {
        aVal = a.status || "";
        bVal = b.status || "";
      } else if (sortField === "job") {
        aVal = a.job?.title?.toLowerCase() || "";
        bVal = b.job?.title?.toLowerCase() || "";
      }
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [shortlists, jobFilter, stageFilter, minScore, searchQuery, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));
  const paginatedList = filteredList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />;
    return sortDir === "asc"
      ? <ChevronUp className="h-3.5 w-3.5 text-primary" />
      : <ChevronDown className="h-3.5 w-3.5 text-primary" />;
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedList.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedList.map((m) => m.id)));
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
    if (score >= 65) return "text-sky-600 dark:text-sky-400";
    if (score >= 50) return "text-amber-600 dark:text-amber-400";
    return "text-rose-600 dark:text-rose-400";
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      shortlisted: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
      screened: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30",
      approved_by_hr: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
      interview_scheduled: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
      offer: "bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30",
      hired: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
      rejected: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
    };
    return map[status] || "bg-secondary text-muted-foreground border-border";
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Loading shortlisted pipeline...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/hr"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to HR Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <BookmarkCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black font-outfit tracking-tight text-foreground flex items-center gap-2.5">
                Shortlisted Candidates
                <Badge variant="success" className="text-xs font-bold">
                  {shortlists.length} Total
                </Badge>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Talent pipeline — candidates cleared threshold criteria & awaiting review.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center rounded-xl border border-border bg-secondary/50 p-1 gap-0.5">
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg transition-all ${viewMode === "table" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
              title="Table view"
            >
              <Table className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-all ${viewMode === "grid" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
              title="Grid view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={async () => {
            setIsLoading(true);
            try { const d = await matchingApi.listShortlists(); setShortlists(d); } catch {}
            setIsLoading(false);
          }}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Shortlisted", value: stats.total, icon: <Users className="h-4 w-4 text-primary" />, color: "text-foreground" },
          { label: "Avg Match Score", value: `${stats.avgScore}%`, icon: <Target className="h-4 w-4 text-sky-500" />, color: "text-sky-600 dark:text-sky-400" },
          { label: "Top Match Score", value: `${stats.topScore}%`, icon: <TrendingUp className="h-4 w-4 text-emerald-500" />, color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Open Requisitions", value: stats.jobs, icon: <Briefcase className="h-4 w-4 text-amber-500" />, color: "text-foreground" },
        ].map((s) => (
          <div key={s.label} className="bg-card/70 border border-border/80 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</span>
              {s.icon}
            </div>
            <div className={`text-2xl font-extrabold font-outfit ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filter + Search Bar */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, job, city, or skill..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Job Filter */}
          <select
            value={jobFilter}
            onChange={(e) => { setJobFilter(e.target.value); setPage(1); }}
            className="py-2 px-3 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full md:w-44"
          >
            <option value="all">All Requisitions</option>
            {uniqueJobs.map((j) => (
              <option key={j.id} value={String(j.id)}>{j.title}</option>
            ))}
          </select>

          {/* Stage Filter */}
          <select
            value={stageFilter}
            onChange={(e) => { setStageFilter(e.target.value); setPage(1); }}
            className="py-2 px-3 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full md:w-44"
          >
            <option value="all">All Stages</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="screened">Screened</option>
            <option value="approved_by_hr">HR Approved</option>
            <option value="interview_scheduled">Interview Scheduled</option>
            <option value="offer">Offer Extended</option>
          </select>

          {/* Score Filter */}
          <select
            value={minScore}
            onChange={(e) => { setMinScore(Number(e.target.value)); setPage(1); }}
            className="py-2 px-3 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full md:w-36"
          >
            <option value={0}>Any Score</option>
            <option value={80}>80%+ Strong</option>
            <option value={65}>65%+ Good</option>
            <option value={50}>50%+ Moderate</option>
          </select>

          {/* Clear Filters */}
          {(searchQuery || jobFilter !== "all" || stageFilter !== "all" || minScore > 0) && (
            <button
              onClick={() => { setSearchQuery(""); setJobFilter("all"); setStageFilter("all"); setMinScore(0); setPage(1); }}
              className="text-xs text-muted-foreground hover:text-foreground whitespace-nowrap flex items-center gap-1 px-2 py-2 rounded-lg hover:bg-secondary/60 transition-colors"
            >
              <XCircle className="h-3.5 w-3.5" /> Clear
            </button>
          )}
        </div>

        {selectedIds.size > 0 && (
          <div className="mt-3 pt-3 border-t border-border/60 flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-semibold">
              {selectedIds.size} candidate{selectedIds.size > 1 ? "s" : ""} selected
            </span>
            <Button variant="outline" size="sm" className="text-xs h-7 px-3">
              Bulk Action
            </Button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear selection
            </button>
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-muted-foreground">
          Showing <strong className="text-foreground">{paginatedList.length}</strong> of{" "}
          <strong className="text-foreground">{filteredList.length}</strong> shortlisted candidates
          {filteredList.length !== shortlists.length && ` (filtered from ${shortlists.length})`}
        </p>
      </div>

      {filteredList.length === 0 ? (
        <div className="p-14 text-center bg-card/60 border border-border/80 rounded-2xl">
          <BookmarkCheck className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-bold text-foreground">No candidates match your filters</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Try adjusting the search or clearing filters.
          </p>
          <Link to="/hr">
            <Button variant="gradient" size="sm">Go to HR Dashboard</Button>
          </Link>
        </div>
      ) : viewMode === "table" ? (
        /* ── TABLE VIEW ── */
        <div className="bg-card border border-border/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/80 bg-secondary/30">
                  <th className="w-10 px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === paginatedList.length && paginatedList.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-border accent-primary cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      className="flex items-center gap-1 font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider text-[10px]"
                      onClick={() => toggleSort("name")}
                    >
                      Candidate <SortIcon field="name" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      className="flex items-center gap-1 font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider text-[10px]"
                      onClick={() => toggleSort("job")}
                    >
                      Requisition <SortIcon field="job" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      className="flex items-center gap-1 font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider text-[10px]"
                      onClick={() => toggleSort("score")}
                    >
                      Match Score <SortIcon field="score" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      className="flex items-center gap-1 font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider text-[10px]"
                      onClick={() => toggleSort("experience")}
                    >
                      Exp <SortIcon field="experience" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      className="flex items-center gap-1 font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider text-[10px]"
                      onClick={() => toggleSort("status")}
                    >
                      Stage <SortIcon field="status" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-bold text-muted-foreground uppercase tracking-wider text-[10px]">
                    Top Skills
                  </th>
                  <th className="px-4 py-3 text-right font-bold text-muted-foreground uppercase tracking-wider text-[10px]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedList.map((match, idx) => {
                  const raw = Number(match.overall_score) || 0;
                  const score = Math.round(raw > 1 ? raw : raw * 100);
                  const isExpanded = expandedRowId === match.id;
                  const isSelected = selectedIds.has(match.id);

                  return (
                    <React.Fragment key={match.id}>
                      <tr
                        className={`border-b border-border/40 transition-colors hover:bg-secondary/20 ${isSelected ? "bg-primary/5" : idx % 2 === 0 ? "bg-transparent" : "bg-secondary/5"}`}
                      >
                        {/* Checkbox */}
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(match.id)}
                            className="rounded border-border accent-primary cursor-pointer"
                          />
                        </td>

                        {/* Candidate */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs font-outfit shrink-0">
                              {match.candidate.full_name?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                            <div>
                              <div className="font-semibold text-foreground text-xs">
                                {match.candidate.full_name}
                              </div>
                              {(match.candidate.city || match.candidate.state) && (
                                <div className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                                  <MapPin className="h-2.5 w-2.5" />
                                  {[match.candidate.city, match.candidate.state].filter(Boolean).join(", ")}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Requisition */}
                        <td className="px-4 py-3">
                          <span className="font-medium text-foreground/90 line-clamp-1">
                            {match.job?.title || "—"}
                          </span>
                        </td>

                        {/* Score */}
                        <td className="px-4 py-3">
                          <span className={`font-extrabold text-sm font-outfit ${getScoreColor(score)}`}>
                            {score}%
                          </span>
                        </td>

                        {/* Experience */}
                        <td className="px-4 py-3">
                          <span className="text-foreground/80">
                            {match.candidate.total_experience_years || 0} <span className="text-muted-foreground text-[10px]">yrs</span>
                          </span>
                        </td>

                        {/* Stage */}
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(match.status)}`}>
                            {match.status?.replace(/_/g, " ") || "—"}
                          </span>
                        </td>

                        {/* Skills */}
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(match.candidate.skills || []).slice(0, 3).map((cs) => (
                              <span
                                key={cs.id}
                                className="px-1.5 py-0.5 rounded text-[10px] bg-secondary/80 text-foreground border border-border/60"
                              >
                                {cs.skill?.name}
                              </span>
                            ))}
                            {(match.candidate.skills || []).length > 3 && (
                              <span className="text-[10px] text-muted-foreground">
                                +{(match.candidate.skills || []).length - 3}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 justify-end">
                            <button
                              onClick={() => setExpandedRowId(isExpanded ? null : match.id)}
                              className="p-1.5 rounded-lg hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
                              title="Expand details"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <Link to={`/hr/jobs/${match.job_id}/matches`}>
                              <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-bold transition-colors border border-primary/20">
                                View Matches <ArrowRight className="h-3 w-3" />
                              </button>
                            </Link>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded row */}
                      {isExpanded && (
                        <tr className="bg-secondary/20 border-b border-border/40">
                          <td colSpan={8} className="px-6 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              {/* Education */}
                              {match.candidate.education_degree && (
                                <div>
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Education</span>
                                  <span className="text-xs text-foreground">{match.candidate.education_degree}</span>
                                </div>
                              )}

                              {/* All Skills */}
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                                  All Skills ({(match.candidate.skills || []).length})
                                </span>
                                <div className="flex flex-wrap gap-1">
                                  {(match.candidate.skills || []).map((cs) => (
                                    <span
                                      key={cs.id}
                                      className={`px-1.5 py-0.5 rounded text-[10px] border font-medium ${getProficiencyBadgeClass(cs.proficiency_level)}`}
                                    >
                                      {cs.skill?.name}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {/* Match Breakdown */}
                              {match.skill_breakdown && match.skill_breakdown.length > 0 && (
                                <div>
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                                    Required Skills Match
                                  </span>
                                  <div className="flex flex-wrap gap-1">
                                    {match.skill_breakdown.slice(0, 6).map((sk) => {
                                      const verified = sk.source === "resume" || Boolean(sk.evidence_text);
                                      return (
                                        <span
                                          key={sk.skill_id}
                                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border font-medium ${
                                            verified
                                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                                              : "bg-secondary text-muted-foreground border-border"
                                          }`}
                                        >
                                          {verified && <CheckCircle2 className="h-2.5 w-2.5" />}
                                          {sk.skill_name}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ── GRID VIEW ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedList.map((match) => {
            const raw = Number(match.overall_score) || 0;
            const score = Math.round(raw > 1 ? raw : raw * 100);
            return (
              <div
                key={match.id}
                className="bg-card/80 border border-border/80 rounded-2xl p-4 hover:border-primary/30 transition-all shadow-sm hover:shadow-md group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm font-outfit">
                      {match.candidate.full_name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <Link to={`/hr/jobs/${match.job_id}/matches`} className="font-semibold text-sm text-foreground hover:text-primary transition-colors line-clamp-1">
                        {match.candidate.full_name}
                      </Link>
                      {match.candidate.city && (
                        <div className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                          <MapPin className="h-2.5 w-2.5" /> {match.candidate.city}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className={`text-lg font-extrabold font-outfit ${getScoreColor(score)}`}>{score}%</span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Briefcase className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground line-clamp-1">{match.job?.title || "—"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground">{match.candidate.total_experience_years || 0} yrs experience</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mt-3">
                  {(match.candidate.skills || []).slice(0, 4).map((cs) => (
                    <span key={cs.id} className="px-1.5 py-0.5 rounded text-[10px] bg-secondary text-foreground/80 border border-border/60">
                      {cs.skill?.name}
                    </span>
                  ))}
                </div>

                <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(match.status)}`}>
                    {match.status?.replace(/_/g, " ")}
                  </span>
                  <Link to={`/hr/jobs/${match.job_id}/matches`}>
                    <button className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline">
                      Review <ArrowRight className="h-3 w-3" />
                    </button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between py-3 border-t border-border/60">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages} · {filteredList.length} results
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="gap-1 text-xs h-8"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </Button>

            {/* Page numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5) {
                  if (page <= 3) pageNum = i + 1;
                  else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
                      page === pageNum
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-secondary text-muted-foreground"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="gap-1 text-xs h-8"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
