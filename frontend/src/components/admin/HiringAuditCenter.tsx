import React, { useState, useEffect, useCallback } from "react";
import { adminApi } from "../../services/api";
import {
  HiringAuditLogEntry,
  HiringLogsResponse,
  HiringLogCategory,
  HiringLogsMetrics,
} from "../../types";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import {
  Activity,
  Search,
  RefreshCw,
  Clock,
  User,
  Briefcase,
  ArrowRight,
  CheckCircle2,
  FileText,
  Calendar,
  Zap,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Code2,
  Eye,
  X,
  Copy,
  Check,
  Filter,
  ShieldAlert,
  HelpCircle,
  Building,
} from "lucide-react";

const CATEGORIES: { key: HiringLogCategory; label: string; icon: React.FC<{ className?: string }> }[] = [
  { key: "ALL", label: "All Activities", icon: Activity },
  { key: "OFFERS", label: "Offers & Hires", icon: FileText },
  { key: "INTERVIEWS", label: "Interviews & Scheduling", icon: Calendar },
  { key: "REVIEWS", label: "HM Reviews", icon: CheckCircle2 },
  { key: "SOURCING", label: "Sourcing & Pipeline", icon: User },
  { key: "TASKS", label: "Operational Tasks", icon: Filter },
];

export const HiringAuditCenter: React.FC = () => {
  const [logs, setLogs] = useState<HiringAuditLogEntry[]>([]);
  const [metrics, setMetrics] = useState<HiringLogsMetrics | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [category, setCategory] = useState<HiringLogCategory>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<HiringAuditLogEntry | null>(null);
  const [copied, setCopied] = useState(false);
  const [showRawPayload, setShowRawPayload] = useState(false);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const data: HiringLogsResponse = await adminApi.getHiringLogs({
        page: currentPage,
        page_size: Math.min(pageSize, 50),
        category: category !== "ALL" ? category : undefined,
        search: debouncedSearch.trim() || undefined,
      });
      setLogs(data.items.slice(0, 50));
      const cappedTotal = Math.min(data.total, 50);
      setTotal(cappedTotal);
      setTotalPages(Math.max(1, Math.ceil(cappedTotal / pageSize)));
      setMetrics(data.metrics);
    } catch (err) {
      console.error("Failed to load hiring audit logs:", err);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, category, debouncedSearch]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleCopyJson = (jsonObj: any) => {
    navigator.clipboard.writeText(JSON.stringify(jsonObj, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getCategoryBadgeClass = (cat: string) => {
    switch (cat.toUpperCase()) {
      case "OFFERS":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "INTERVIEWS":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "REVIEWS":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "SOURCING":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "TASKS":
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
      default:
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
    }
  };

  const getRoleBadgeClass = (role?: string | null) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      case "hr":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "recruiter":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "candidate":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Metrics Row */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="bg-card/70 border border-border/80 rounded-xl p-4 backdrop-blur-md relative overflow-hidden group hover:border-indigo-500/40 transition-all">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Audit Events</span>
              <Activity className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-outfit text-foreground tracking-tight">
              {metrics.total_logs}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Platform-wide audit trail</p>
          </div>

          <div className="bg-card/70 border border-border/80 rounded-xl p-4 backdrop-blur-md relative overflow-hidden group hover:border-emerald-500/40 transition-all">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Offers Dispatched</span>
              <FileText className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-outfit text-foreground tracking-tight">
              {metrics.total_offers}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Offers generated & approved</p>
          </div>

          <div className="bg-card/70 border border-border/80 rounded-xl p-4 backdrop-blur-md relative overflow-hidden group hover:border-purple-500/40 transition-all">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Interviews Tracked</span>
              <Calendar className="h-4 w-4 text-purple-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-outfit text-foreground tracking-tight">
              {metrics.total_interviews}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Slots, bookings & rounds</p>
          </div>

          <div className="bg-card/70 border border-border/80 rounded-xl p-4 backdrop-blur-md relative overflow-hidden group hover:border-green-500/40 transition-all">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Successful Hires</span>
              <CheckCircle2 className="h-4 w-4 text-green-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-outfit text-foreground tracking-tight">
              {metrics.total_hires}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Accepted talent placements</p>
          </div>

          <div className="bg-card/70 border border-border/80 rounded-xl p-4 backdrop-blur-md relative overflow-hidden group hover:border-amber-500/40 transition-all col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">24h Velocity</span>
              <Zap className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-outfit text-foreground tracking-tight">
              {metrics.recent_24h}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Actions in last 24 hours</p>
          </div>
        </div>
      )}

      {/* Scalability Notice Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-lg bg-muted/60 border border-border/80 text-xs">
        <span className="flex items-center gap-2 text-foreground font-medium">
          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
          Displaying latest 50 operational activities (auto-pruned for optimal system scalability)
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {logs.length} of {total} recent entries
        </span>
      </div>

      {/* Controls & Filter Bar */}
      <Card className="border-border/80 bg-card/60 backdrop-blur-xl">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search candidate, job, recruiter, action, or details..."
                className="w-full pl-9 pr-8 py-2 bg-background/80 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Actions & Refresh */}
            <div className="flex items-center gap-2.5 self-end md:self-auto">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-background/80 border border-border rounded-lg px-2.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value={10}>10 per page</option>
                <option value={15}>15 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
              </select>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchLogs}
                disabled={isLoading}
                className="gap-2 text-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-primary" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Category Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/40">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = category === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => {
                    setCategory(cat.key);
                    setCurrentPage(1);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Activity Logs Stream */}
      <div className="space-y-3">
        {isLoading && logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-card/40 rounded-xl border border-border/60">
            <RefreshCw className="h-7 w-7 animate-spin text-primary mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Loading hiring audit logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 bg-card/40 rounded-xl border border-dashed border-border/80 p-6">
            <Activity className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <h3 className="text-base font-semibold text-foreground">No matching audit events found</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              {searchTerm || category !== "ALL"
                ? "Try adjusting your search criteria or switching to 'All Activities'."
                : "No recruitment lifecycle activity has been recorded yet."}
            </p>
            {(searchTerm || category !== "ALL") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setCategory("ALL");
                  setCurrentPage(1);
                }}
                className="mt-4 text-xs"
              >
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          logs.map((log) => {
            const hasTransition = Boolean(log.from_state || log.to_state);
            return (
              <div
                key={log.id}
                className="group bg-card/75 hover:bg-card border border-border/80 hover:border-primary/40 rounded-xl p-4 transition-all duration-200 shadow-sm relative overflow-hidden"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  {/* Left: Action & Entity Details */}
                  <div className="space-y-2 flex-1">
                    {/* Top Row: Category, Action Label, Timestamp */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getCategoryBadgeClass(
                          log.category
                        )}`}
                      >
                        {log.category}
                      </span>
                      <h4 className="text-sm sm:text-base font-bold text-foreground font-outfit">
                        {log.action_label}
                      </h4>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground ml-auto lg:ml-0">
                        <Clock className="h-3 w-3" />
                        <span title={log.created_at}>{log.relative_time}</span>
                      </div>
                    </div>

                    {/* Pipeline State Transition Pills */}
                    {hasTransition && (
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="text-muted-foreground text-[11px] font-medium">State Shift:</span>
                        {log.from_state && (
                          <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-[11px] font-mono">
                            {log.from_state}
                          </span>
                        )}
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 text-[11px] font-mono font-medium">
                          {log.to_state || "UPDATED"}
                        </span>
                      </div>
                    )}

                    {/* Meta context badges: Candidate, Job, Actor */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pt-0.5">
                      {log.candidate_name && (
                        <div className="inline-flex items-center gap-1 bg-muted/40 border border-border/60 px-2 py-0.5 rounded-md text-foreground">
                          <User className="h-3 w-3 text-amber-400" />
                          <span className="font-medium text-[11px]">{log.candidate_name}</span>
                        </div>
                      )}

                      {log.job_title && (
                        <div className="inline-flex items-center gap-1 bg-muted/40 border border-border/60 px-2 py-0.5 rounded-md text-foreground">
                          <Briefcase className="h-3 w-3 text-indigo-400" />
                          <span className="font-medium text-[11px]">
                            {log.job_title}
                            {log.job_department ? ` (${log.job_department})` : ""}
                          </span>
                        </div>
                      )}

                      {log.actor_name && (
                        <div className="inline-flex items-center gap-1 bg-muted/40 border border-border/60 px-2 py-0.5 rounded-md text-foreground">
                          <span className="text-muted-foreground text-[10px]">by</span>
                          <span className="font-medium text-[11px]">{log.actor_name}</span>
                          {log.actor_role && (
                            <span
                              className={`text-[9px] px-1 rounded uppercase font-semibold border ${getRoleBadgeClass(
                                log.actor_role
                              )}`}
                            >
                              {log.actor_role}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Action: Inspect Details */}
                  <div className="flex items-center gap-2 self-end lg:self-center">
                    {log.details && Object.keys(log.details).length > 0 && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                        className="gap-1.5 text-xs hover:bg-primary hover:text-primary-foreground transition-all"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Inspect Details
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-muted-foreground">
          <div>
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, total)} of {total} events
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 font-medium text-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages || isLoading}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getCategoryBadgeClass(
                      selectedLog.category
                    )}`}
                  >
                    {selectedLog.category}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">Log #{selectedLog.id}</span>
                </div>
                <h3 className="text-lg font-bold font-outfit text-foreground">
                  {selectedLog.action_label}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5">
              {/* Lifecycle State Transition Stepper */}
              {(selectedLog.from_state || selectedLog.to_state) && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-border/80 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Recruitment State Machine Transition
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-secondary text-foreground border border-border font-semibold">
                        {selectedLog.from_state || "INITIATION"}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-primary/15 text-primary border border-primary/30 font-bold">
                        {selectedLog.to_state || "CURRENT"}
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider">
                    {selectedLog.action}
                  </Badge>
                </div>
              )}

              {/* Stakeholder & Requisition Context Hub */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Actor Card */}
                <div className="p-3 rounded-xl bg-muted/40 border border-border/70 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <User className="w-3 h-3 text-primary" /> Authorized Actor
                    </span>
                    {selectedLog.actor_role && (
                      <span className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold ${getRoleBadgeClass(selectedLog.actor_role)}`}>
                        {selectedLog.actor_role}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-bold text-foreground truncate">
                    {selectedLog.actor_name || "System Automated"}
                  </div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" />
                    {new Date(selectedLog.created_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>

                {/* Candidate Card */}
                <div className="p-3 rounded-xl bg-muted/40 border border-border/70 space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Candidate Talent
                  </span>
                  <div className="text-xs font-bold text-foreground truncate">
                    {selectedLog.candidate_name || "N/A (Requisition Scope)"}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {selectedLog.candidate_name ? "Linked Candidate Profile" : "General Administrative Action"}
                  </div>
                </div>

                {/* Requisition Card */}
                <div className="p-3 rounded-xl bg-muted/40 border border-border/70 space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Briefcase className="w-3 h-3 text-indigo-500" /> Job Requisition
                  </span>
                  <div className="text-xs font-bold text-foreground truncate">
                    {selectedLog.job_title || "Company Wide / System"}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {selectedLog.job_title ? "Assigned Corporate Position" : "Platform Governance"}
                  </div>
                </div>
              </div>

              {/* Structured Event Parameters & Context */}
              {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-primary" />
                    Operational Event Parameters & Context
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {Object.entries(selectedLog.details).map(([key, val]) => {
                      const formattedKey = key
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (c) => c.toUpperCase());

                      let displayContent: React.ReactNode;

                      if (typeof val === "boolean") {
                        displayContent = (
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${val ? "bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>
                            {val ? "Confirmed (Yes)" : "False (No)"}
                          </span>
                        );
                      } else if (typeof val === "number") {
                        if (key.toLowerCase().includes("ctc") || key.toLowerCase().includes("salary") || key.toLowerCase().includes("amount")) {
                          displayContent = <span className="font-mono font-bold text-primary">₹{val.toLocaleString()}</span>;
                        } else {
                          displayContent = <span className="font-mono font-semibold text-foreground">{val}</span>;
                        }
                      } else if (Array.isArray(val)) {
                        displayContent = (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {val.map((item, i) => (
                              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-foreground border border-border font-medium">
                                {typeof item === "object" ? JSON.stringify(item) : String(item)}
                              </span>
                            ))}
                          </div>
                        );
                      } else if (typeof val === "object" && val !== null) {
                        displayContent = (
                          <div className="mt-1 p-2 rounded bg-muted/50 border border-border/60 text-[11px] space-y-1">
                            {Object.entries(val).map(([subK, subV]) => (
                              <div key={subK} className="flex justify-between gap-2">
                                <span className="text-muted-foreground">{subK}:</span>
                                <span className="font-medium text-foreground">{String(subV)}</span>
                              </div>
                            ))}
                          </div>
                        );
                      } else {
                        displayContent = <span className="font-medium text-foreground">{String(val)}</span>;
                      }

                      return (
                        <div
                          key={key}
                          className="bg-card/90 border border-border/80 rounded-xl p-3 text-xs shadow-xs space-y-1"
                        >
                          <span className="text-muted-foreground text-[10px] block font-semibold uppercase tracking-wider">
                            {formattedKey}
                          </span>
                          <div className="break-words">{displayContent}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Collapsible Technical Payload */}
              <div className="pt-2 border-t border-border/80">
                <button
                  type="button"
                  onClick={() => setShowRawPayload(!showRawPayload)}
                  className="w-full flex items-center justify-between text-xs font-semibold text-muted-foreground hover:text-foreground py-2 cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-primary" />
                    Developer Diagnostic Payload (JSON)
                  </span>
                  {showRawPayload ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>

                {showRawPayload && (
                  <div className="mt-2 space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Raw database audit record representation</span>
                      <button
                        type="button"
                        onClick={() => handleCopyJson(selectedLog)}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium cursor-pointer"
                      >
                        {copied ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-green-500" />
                            <span className="text-green-500">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy JSON</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-3.5 bg-slate-950 text-slate-200 border border-border rounded-xl text-xs font-mono overflow-x-auto max-h-48 leading-relaxed">
                      {JSON.stringify(selectedLog, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setSelectedLog(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
