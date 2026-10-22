import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
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
  Shield,
  ShieldAlert,
  Building,
  Download,
  Terminal,
  Layers,
  Sparkles,
  ExternalLink,
} from "lucide-react";

const CATEGORIES: { key: HiringLogCategory; label: string; icon: React.FC<{ className?: string }> }[] = [
  { key: "ALL", label: "All Activities", icon: Activity },
  { key: "SOURCING", label: "Sourcing & Screening", icon: User },
  { key: "REVIEWS", label: "HM Approvals & Reviews", icon: CheckCircle2 },
  { key: "INTERVIEWS", label: "Interviews & Scorecards", icon: Calendar },
  { key: "OFFERS", label: "Offers & Hires", icon: FileText },
  { key: "JOBS", label: "Job Requisitions", icon: Briefcase },
  { key: "SECURITY", label: "Security & Users", icon: Shield },
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
  const [copiedRequestId, setCopiedRequestId] = useState<string | null>(null);
  const [showRawPayload, setShowRawPayload] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch logs from backend
  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const data: HiringLogsResponse = await adminApi.getHiringLogs({
        page: currentPage,
        page_size: pageSize,
        category: category !== "ALL" ? category : undefined,
        search: debouncedSearch.trim() || undefined,
      });
      setLogs(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages || Math.max(1, Math.ceil(data.total / pageSize)));
      setMetrics(data.metrics);
      setLastRefreshedAt(new Date());
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

  const handleCopyRequestId = (reqId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(reqId);
    setCopiedRequestId(reqId);
    setTimeout(() => setCopiedRequestId(null), 2000);
  };

  const handleExportCSV = () => {
    if (!logs.length) return;
    const headers = ["ID", "Timestamp", "Category", "Action", "Actor", "Actor Role", "Candidate", "Job", "From State", "To State", "Request ID"];
    const rows = logs.map((l) => [
      l.id,
      l.created_at,
      l.category,
      `"${l.action_label || l.action}"`,
      `"${l.actor_name || "System"}"`,
      `"${l.actor_role || ""}"`,
      `"${l.candidate_name || ""}"`,
      `"${l.job_title || ""}"`,
      `"${l.from_state || ""}"`,
      `"${l.to_state || ""}"`,
      `"${l.request_id || ""}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `skillalign_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    if (!logs.length) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", `skillalign_audit_logs_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getCategoryBadgeClass = (cat: string) => {
    switch (cat?.toUpperCase()) {
      case "OFFERS":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      case "INTERVIEWS":
        return "bg-purple-500/15 text-purple-400 border-purple-500/30";
      case "REVIEWS":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case "SOURCING":
        return "bg-blue-500/15 text-blue-400 border-blue-500/30";
      case "JOBS":
        return "bg-cyan-500/15 text-cyan-400 border-cyan-500/30";
      case "SECURITY":
        return "bg-rose-500/15 text-rose-400 border-rose-500/30";
      case "TASKS":
        return "bg-slate-500/15 text-slate-400 border-slate-500/30";
      default:
        return "bg-indigo-500/15 text-indigo-400 border-indigo-500/30";
    }
  };

  const getRoleBadgeClass = (role?: string | null) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return "bg-red-500/15 text-red-400 border-red-500/30";
      case "hr":
        return "bg-blue-500/15 text-blue-400 border-blue-500/30";
      case "recruiter":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      case "candidate":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      default:
        return "bg-slate-500/15 text-slate-400 border-slate-500/30";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Metrics Row */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="bg-card/80 border border-border/80 rounded-2xl p-4 backdrop-blur-md relative overflow-hidden group hover:border-indigo-500/40 transition-all shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Audit Events</span>
              <Activity className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-outfit text-foreground tracking-tight">
              {metrics.total_logs}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <Shield className="h-3 w-3 text-indigo-400" /> Platform-wide audit trail
            </p>
          </div>

          <div className="bg-card/80 border border-border/80 rounded-2xl p-4 backdrop-blur-md relative overflow-hidden group hover:border-emerald-500/40 transition-all shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider">Offers & Hires</span>
              <FileText className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-outfit text-foreground tracking-tight">
              {metrics.total_offers}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" /> {metrics.total_hires} accepted hires
            </p>
          </div>

          <div className="bg-card/80 border border-border/80 rounded-2xl p-4 backdrop-blur-md relative overflow-hidden group hover:border-purple-500/40 transition-all shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider">Interviews & Reviews</span>
              <Calendar className="h-4 w-4 text-purple-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-outfit text-foreground tracking-tight">
              {metrics.total_interviews}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <Zap className="h-3 w-3 text-purple-400" /> Slots, rounds & scorecards
            </p>
          </div>

          <div className="bg-card/80 border border-border/80 rounded-2xl p-4 backdrop-blur-md relative overflow-hidden group hover:border-amber-500/40 transition-all shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider">24h Velocity</span>
              <Zap className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-outfit text-foreground tracking-tight">
              {metrics.recent_24h}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <Clock className="h-3 w-3 text-amber-400" /> Actions in last 24 hours
            </p>
          </div>

          <div className="bg-card/80 border border-border/80 rounded-2xl p-4 backdrop-blur-md relative overflow-hidden group hover:border-cyan-500/40 transition-all shadow-xs col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-muted-foreground mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider">Request Tracing</span>
              <Terminal className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="text-sm font-bold font-outfit text-emerald-400 flex items-center gap-1.5 mt-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Active Correlation
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">Request ID linked 1:1</p>
          </div>
        </div>
      )}

      {/* Control Bar & Actions Header */}
      <Card className="border-border/80 bg-card/70 backdrop-blur-xl shadow-xs">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by action, candidate, job, actor, request ID..."
                className="w-full pl-10 pr-9 py-2.5 bg-background/90 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Actions: Page Size, Export */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-background/80 border border-border rounded-xl p-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExportCSV}
                  disabled={logs.length === 0}
                  className="h-8 px-2.5 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                  title="Export current audit log stream to CSV"
                >
                  <Download className="h-3.5 w-3.5" />
                  CSV
                </Button>
                <div className="h-4 w-px bg-border/60" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExportJSON}
                  disabled={logs.length === 0}
                  className="h-8 px-2.5 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                  title="Export current audit log stream to JSON"
                >
                  <Code2 className="h-3.5 w-3.5" />
                  JSON
                </Button>
              </div>

              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-background/90 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value={10}>10 / page</option>
                <option value={15}>15 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/50">
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
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25 font-semibold"
                      : "bg-muted/40 text-muted-foreground hover:bg-muted/80 hover:text-foreground border border-border/40"
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
          <div className="flex flex-col items-center justify-center py-24 bg-card/40 rounded-2xl border border-border/60">
            <RefreshCw className="h-8 w-8 animate-spin text-primary mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Loading audit log stream...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20 bg-card/40 rounded-2xl border border-dashed border-border p-6">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
            <h3 className="text-base font-semibold text-foreground">No matching audit events recorded</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              {searchTerm || category !== "ALL"
                ? "Try adjusting your search query or reset category filter to 'All Activities'."
                : "Operational and recruitment activity will appear here in real-time."}
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
                className="mt-4 text-xs rounded-xl"
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
                className="group bg-card/85 hover:bg-card border border-border/80 hover:border-primary/40 rounded-2xl p-4 sm:p-5 transition-all duration-200 shadow-xs relative overflow-hidden"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
                  {/* Left: Action & Entity Details */}
                  <div className="space-y-2 flex-1">
                    {/* Top Row: Category Badge, Action Label, Request ID, Timestamp */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getCategoryBadgeClass(
                          log.category
                        )}`}
                      >
                        {log.category}
                      </span>
                      <h4 className="text-sm sm:text-base font-bold text-foreground font-outfit">
                        {log.action_label || log.action}
                      </h4>

                      {/* Sentry Request ID Badge */}
                      {log.request_id && (
                        <button
                          type="button"
                          onClick={(e) => handleCopyRequestId(log.request_id!, e)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/25 text-[10px] font-mono transition-colors cursor-pointer"
                          title="Request Correlation ID: Unique distributed trace ID linking this action to backend server logs. Click to copy."
                        >
                          <Terminal className="h-2.5 w-2.5" />
                          <span>req.id:{log.request_id.slice(0, 8)}...</span>
                          {copiedRequestId === log.request_id ? (
                            <Check className="h-2.5 w-2.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-2.5 w-2.5 opacity-60 group-hover:opacity-100" />
                          )}
                        </button>
                      )}

                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground ml-auto lg:ml-0">
                        <Clock className="h-3 w-3" />
                        <span title={log.created_at}>{log.relative_time}</span>
                      </div>
                    </div>

                    {/* Pipeline State Transition Pills */}
                    {hasTransition && (
                      <div className="flex flex-wrap items-center gap-1.5 text-xs pt-0.5">
                        <span className="text-muted-foreground text-[11px] font-medium">State Shift:</span>
                        {log.from_state && (
                          <span className="px-2 py-0.5 rounded-md bg-muted/80 text-muted-foreground text-[11px] font-mono border border-border/50">
                            {log.from_state}
                          </span>
                        )}
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-[11px] font-mono font-bold">
                          {log.to_state || "UPDATED"}
                        </span>
                      </div>
                    )}

                    {/* Meta context badges: Candidate, Job, Actor */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pt-0.5">
                      {log.candidate_name && (
                        <div className="inline-flex items-center gap-1.5 bg-muted/40 border border-border/60 px-2.5 py-0.5 rounded-lg text-foreground">
                          <User className="h-3 w-3 text-amber-400" />
                          {log.candidate_id ? (
                            <Link
                              to={`/admin/candidates/${log.candidate_id}`}
                              className="font-medium text-[11px] hover:text-primary hover:underline transition-colors"
                              title={`Inspect candidate profile`}
                            >
                              {log.candidate_name}
                            </Link>
                          ) : (
                            <span className="font-medium text-[11px]">{log.candidate_name}</span>
                          )}
                        </div>
                      )}

                      {log.job_title && (
                        <div className="inline-flex items-center gap-1.5 bg-muted/40 border border-border/60 px-2.5 py-0.5 rounded-lg text-foreground">
                          <Briefcase className="h-3 w-3 text-indigo-400" />
                          {log.job_id ? (
                            <Link
                              to={`/admin/jobs/${log.job_id}`}
                              className="font-medium text-[11px] hover:text-primary hover:underline transition-colors"
                              title={`Inspect job requisition`}
                            >
                              {log.job_title}
                              {log.job_department ? ` (${log.job_department})` : ""}
                            </Link>
                          ) : (
                            <span className="font-medium text-[11px]">
                              {log.job_title}
                              {log.job_department ? ` (${log.job_department})` : ""}
                            </span>
                          )}
                        </div>
                      )}

                      {log.actor_name && (
                        <div className="inline-flex items-center gap-1.5 bg-muted/40 border border-border/60 px-2.5 py-0.5 rounded-lg text-foreground">
                          <span className="text-muted-foreground text-[10px]">by</span>
                          {log.actor_id ? (
                            <Link
                              to={`/admin/users/${log.actor_id}`}
                              className="font-medium text-[11px] hover:text-primary hover:underline transition-colors"
                              title={`Inspect user profile`}
                            >
                              {log.actor_name}
                            </Link>
                          ) : (
                            <span className="font-medium text-[11px]">{log.actor_name}</span>
                          )}
                          {log.actor_role && (
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded uppercase font-semibold border ${getRoleBadgeClass(
                                log.actor_role
                              )}`}
                            >
                              {log.actor_role === "HR" ? "HM" : log.actor_role}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Action: Inspect Details */}
                  <div className="flex items-center gap-2 self-end lg:self-center">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSelectedLog(log)}
                      className="gap-1.5 text-xs rounded-xl hover:bg-primary hover:text-primary-foreground transition-all"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Inspect Details
                    </Button>
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
              className="h-8 w-8 p-0 rounded-lg"
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
              className="h-8 w-8 p-0 rounded-lg"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[88vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-border bg-card/90">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getCategoryBadgeClass(
                      selectedLog.category
                    )}`}
                  >
                    {selectedLog.category}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">Log ID #{selectedLog.id}</span>
                </div>
                <h3 className="text-lg font-bold font-outfit text-foreground">
                  {selectedLog.action_label || selectedLog.action}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5">
              {/* Sentry Correlation Banner */}
              {selectedLog.request_id && (
                <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                      <Terminal className="h-3 w-3" /> Distributed Request ID
                    </span>
                    <p className="text-xs font-mono text-foreground font-semibold break-all">
                      {selectedLog.request_id}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => handleCopyRequestId(selectedLog.request_id!, e)}
                    className="h-8 px-2.5 text-xs gap-1 border-cyan-500/40 hover:bg-cyan-500/20 text-cyan-300"
                  >
                    {copiedRequestId === selectedLog.request_id ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Copy ID
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* State Machine Transition Stepper */}
              {(selectedLog.from_state || selectedLog.to_state) && (
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 flex flex-wrap items-center justify-between gap-3 shadow-xs">
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

              {/* Context Hub Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Actor Card */}
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 space-y-1">
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
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Candidate Talent
                  </span>
                  <div className="text-xs font-bold text-foreground truncate">
                    {selectedLog.candidate_name || "N/A (Requisition Scope)"}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {selectedLog.candidate_name ? "Linked Candidate Profile" : "General Governance Action"}
                  </div>
                </div>

                {/* Requisition Card */}
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 space-y-1">
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

              {/* Collapsible Developer Diagnostic Payload */}
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
            <div className="p-4 border-t border-border flex justify-end bg-card/90">
              <Button variant="outline" size="sm" onClick={() => setSelectedLog(null)} className="rounded-xl">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
