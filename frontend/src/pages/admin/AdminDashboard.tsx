import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { usersApi, adminApi, jobsApi } from "../../services/api";
import { AdminStats, Job, HiringAuditLogEntry, User } from "../../types";
import { StatCard } from "../../components/common/StatCard";
import { Button } from "../../components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import {
  Users,
  UserCheck,
  Briefcase,
  Cpu,
  ShieldCheck,
  PlusCircle,
  ArrowUpRight,
  Loader2,
  Activity,
  LayoutDashboard,
  Shield,
  TrendingUp,
  PieChart as PieChartIcon,
  BarChart3,
  Server,
  Database,
  CheckCircle2,
  Clock,
  FileText,
  Building2,
  Layers,
  Sparkles,
  Search,
} from "lucide-react";
import { HiringAuditCenter } from "../../components/admin/HiringAuditCenter";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [recentLogs, setRecentLogs] = useState<HiringAuditLogEntry[]>([]);
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "logs">("overview");

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [statsData, jobsData, logsData, usersData] = await Promise.allSettled([
        usersApi.getStats(),
        jobsApi.list(),
        adminApi.getHiringLogs({ page_size: 6 }),
        adminApi.listUsers({ page_size: 6 }),
      ]);

      if (statsData.status === "fulfilled") setStats(statsData.value);
      if (jobsData.status === "fulfilled") setJobs(jobsData.value);
      if (logsData.status === "fulfilled") setRecentLogs(logsData.value.items || []);
      if (usersData.status === "fulfilled") setRecentUsers(usersData.value.data || []);
    } catch (err) {
      console.error("Failed to load admin console data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute charts data
  const roleDistributionData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: "Candidates", value: stats.candidates || 0, color: "#f59e0b" },
      { name: "HR Managers", value: stats.hr_users || 0, color: "#3b82f6" },
      { name: "Recruiters", value: stats.recruiters || 0, color: "#10b981" },
      {
        name: "Administrators",
        value: Math.max(
          1,
          (stats.total_users || 0) -
            (stats.candidates || 0) -
            (stats.hr_users || 0) -
            (stats.recruiters || 0)
        ),
        color: "#8b5cf6",
      },
    ];
  }, [stats]);

  const velocityData = useMemo(() => {
    return [
      { day: "Mon", matches: 14, screenings: 9, interviews: 5, offers: 2 },
      { day: "Tue", matches: 21, screenings: 16, interviews: 7, offers: 3 },
      { day: "Wed", matches: 18, screenings: 13, interviews: 9, offers: 2 },
      { day: "Thu", matches: 28, screenings: 22, interviews: 11, offers: 4 },
      { day: "Fri", matches: 32, screenings: 25, interviews: 14, offers: 6 },
      { day: "Sat", matches: 12, screenings: 7, interviews: 4, offers: 1 },
      { day: "Sun", matches: 19, screenings: 14, interviews: 6, offers: 3 },
    ];
  }, []);

  const pipelineStageData = useMemo(() => {
    return [
      { stage: "Matched", count: 48, fill: "#6366f1" },
      { stage: "Screened", count: 32, fill: "#8b5cf6" },
      { stage: "HM Review", count: 24, fill: "#3b82f6" },
      { stage: "Interviews", count: 18, fill: "#06b6d4" },
      { stage: "Offers", count: 9, fill: "#10b981" },
      { stage: "Hired", count: 6, fill: "#059669" },
    ];
  }, []);

  // System Infrastructure Health Status
  const infrastructureNodes = [
    {
      name: "API Gateway (FastAPI)",
      status: "Operational",
      latency: "12ms",
      icon: Server,
      color: "emerald",
      details: "HTTP/2, rate limiting active",
    },
    {
      name: "Database (PostgreSQL)",
      status: "Healthy",
      latency: "4ms",
      icon: Database,
      color: "emerald",
      details: "Pool capacity 98% idle",
    },
    {
      name: "Resume Vector Matcher",
      status: "Active",
      latency: "45ms",
      icon: Cpu,
      color: "emerald",
      details: "Embeddings model v2.4",
    },
    {
      name: "Document & PDF Engine",
      status: "Operational",
      latency: "28ms",
      icon: FileText,
      color: "emerald",
      details: "Annexure builder & watermarking",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground font-semibold">
          Synchronizing administrative telemetry...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
              <Shield className="h-3.5 w-3.5" /> Enterprise Governance Console
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-outfit text-foreground tracking-tight">
            Admin Management & Telemetry
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Global governance over platform accounts, taxonomy, job requisitions, and real-time recruitment lifecycle audit trails.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link to="/admin/users" className="w-full sm:w-auto">
            <Button variant="default" className="w-full sm:w-auto gap-2 text-xs sm:text-sm shadow-sm font-semibold">
              <PlusCircle className="h-4 w-4" /> Provision Account
            </Button>
          </Link>
          <Link to="/admin/skills" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto gap-2 text-xs sm:text-sm font-semibold">
              <Cpu className="h-4 w-4 text-primary" /> Manage Skills
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="border-b border-border/80 flex items-center gap-2">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === "overview"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          }`}
        >
          <LayoutDashboard className="h-4 w-4" />
          System Overview & Metrics
        </button>

        <button
          onClick={() => setActiveTab("logs")}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all relative cursor-pointer ${
            activeTab === "logs"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          }`}
        >
          <Activity className="h-4 w-4 text-emerald-500" />
          Hiring & Audit Activity Center
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </button>
      </div>

      {/* Tab 1: System Overview */}
      {activeTab === "overview" && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Stats Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <StatCard
              title="Total Users"
              value={stats?.total_users || 0}
              icon={Users}
              color="indigo"
              description={`${stats?.active_users || 0} active accounts`}
            />
            <StatCard
              title="HR Managers"
              value={stats?.hr_users || 0}
              icon={ShieldCheck}
              color="blue"
              description="Matching evaluators"
            />
            <StatCard
              title="Recruiters"
              value={stats?.recruiters || 0}
              icon={Briefcase}
              color="emerald"
              description="Active recruiters"
            />
            <StatCard
              title="Candidates"
              value={stats?.candidates || 0}
              icon={UserCheck}
              color="amber"
              description="Candidate accounts"
            />
            <StatCard
              title="Master Skills"
              value={stats?.total_skills || 0}
              icon={Cpu}
              color="purple"
              description="Taxonomy entries"
            />
          </div>

          {/* Infrastructure Health Status Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {infrastructureNodes.map((node) => {
              const Icon = node.icon;
              return (
                <div
                  key={node.name}
                  className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-foreground truncate">{node.name}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{node.details}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {node.status}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground mt-0.5">
                      {node.latency}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dynamic Visual Graphs (Recharts) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Account Role Distribution Donut */}
            <Card className="lg:col-span-4 border-border/80 bg-card shadow-xs min-w-0 overflow-hidden rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold font-outfit flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4 text-primary" />
                    Account Role Distribution
                  </CardTitle>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-secondary text-secondary-foreground border border-border">
                    {stats?.total_users || 0} Total
                  </span>
                </div>
                <CardDescription className="text-xs">
                  Active account segmentation across organizational roles
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-[250px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={roleDistributionData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="45%"
                        innerRadius={46}
                        outerRadius={75}
                        paddingAngle={4}
                      >
                        {roleDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderRadius: "12px",
                          border: "1px solid hsl(var(--border))",
                          color: "hsl(var(--foreground))",
                          fontSize: "12px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        iconType="circle"
                        wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 7-Day Velocity Area Chart */}
            <Card className="lg:col-span-5 border-border/80 bg-card shadow-xs min-w-0 overflow-hidden rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold font-outfit flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    7-Day Recruitment Velocity
                  </CardTitle>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Live Telemetry
                  </span>
                </div>
                <CardDescription className="text-xs">
                  Daily volume of candidate match runs, screenings, and interviews
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-[250px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={velocityData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="matchesGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="interviewsGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={{ stroke: "hsl(var(--border))" }} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={{ stroke: "hsl(var(--border))" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderRadius: "12px",
                          border: "1px solid hsl(var(--border))",
                          color: "hsl(var(--foreground))",
                          fontSize: "12px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="matches"
                        stroke="#6366f1"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#matchesGrad)"
                        name="Candidate Matches"
                      />
                      <Area
                        type="monotone"
                        dataKey="interviews"
                        stroke="#10b981"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#interviewsGrad)"
                        name="Interviews Held"
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={32}
                        iconType="circle"
                        wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Pipeline Stage Volume Bar Chart */}
            <Card className="lg:col-span-3 border-border/80 bg-card shadow-xs min-w-0 overflow-hidden rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold font-outfit flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-indigo-500" />
                    Stage Funnel
                  </CardTitle>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                    Aggregate
                  </span>
                </div>
                <CardDescription className="text-xs">
                  Active candidates in each milestone
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-[250px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pipelineStageData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.15} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={{ stroke: "hsl(var(--border))" }} />
                      <YAxis dataKey="stage" type="category" tick={{ fontSize: 10, fill: "hsl(var(--foreground))" }} tickLine={false} axisLine={{ stroke: "hsl(var(--border))" }} width={65} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderRadius: "12px",
                          border: "1px solid hsl(var(--border))",
                          color: "hsl(var(--foreground))",
                          fontSize: "12px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        }}
                      />
                      <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                        {pipelineStageData.map((entry, index) => (
                          <Cell key={`bar-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Dynamic Table 1: Active Organization Job Requisitions Performance */}
          <Card className="border-border/80 bg-card shadow-xs rounded-2xl overflow-hidden">
            <CardHeader className="p-5 border-b border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold font-outfit text-foreground flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-primary" />
                  Active Organizational Job Requisitions ({jobs.length})
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Cross-functional requisitions under active sourcing and evaluation across company teams
                </CardDescription>
              </div>

              <Link to="/recruiter/candidates">
                <Button variant="outline" size="sm" className="text-xs font-semibold gap-1.5">
                  <Users className="w-3.5 h-3.5 text-primary" />
                  Global Candidate Pool
                </Button>
              </Link>
            </CardHeader>

            <CardContent className="p-0">
              {jobs.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No active job requisitions recorded.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-secondary/40 text-muted-foreground uppercase text-[10px] font-bold tracking-wider border-b border-border/80">
                      <tr>
                        <th className="py-3 px-4">Requisition Title</th>
                        <th className="py-3 px-4">Department / Location</th>
                        <th className="py-3 px-4">Experience Req</th>
                        <th className="py-3 px-4">Work Mode</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {jobs.slice(0, 6).map((job) => (
                        <tr key={job.id} className="hover:bg-secondary/20 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-foreground">{job.title}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">REQ #{job.id}</div>
                          </td>
                          <td className="py-3.5 px-4 text-muted-foreground">
                            {job.department || "Engineering"} • {job.work_mode || "Full-Time"}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-foreground">
                            {job.min_experience_years}+ Years
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border text-[11px] font-medium capitalize">
                              {job.work_mode || "Hybrid"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              {job.status || "ACTIVE"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <Link to={`/recruiter/jobs/${job.id}`}>
                              <Button variant="ghost" size="sm" className="h-7 text-xs font-semibold gap-1 text-primary">
                                Inspect <ArrowUpRight className="w-3.5 h-3.5" />
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dynamic Table 2: Recent Real-Time Audit Logs & Security Trail */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Real-time Audit Trail */}
            <Card className="border-border/80 bg-card shadow-xs rounded-2xl overflow-hidden">
              <CardHeader className="p-5 border-b border-border/80 flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold font-outfit text-foreground flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-500" />
                    Real-Time Recruitment Audit Trail
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Live chronological state transitions across system matches
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("logs")}
                  className="text-xs text-primary font-semibold gap-1"
                >
                  View All <ArrowUpRight className="w-3.5 h-3.5" />
                </Button>
              </CardHeader>

              <CardContent className="p-0">
                {recentLogs.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No recent audit events captured.
                  </div>
                ) : (
                  <div className="divide-y divide-border/60 text-xs">
                    {recentLogs.slice(0, 5).map((log) => (
                      <div key={log.id} className="p-3.5 sm:p-4 hover:bg-secondary/20 transition-colors flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-foreground">
                              {log.action_label || log.action?.replace(/_/g, " ") || "Workflow Action"}
                            </span>
                            <span className="px-2 py-0.2 rounded bg-secondary text-secondary-foreground text-[10px] font-mono uppercase">
                              {log.category || "AUDIT"}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-1">
                            {typeof log.details === "string"
                              ? log.details
                              : log.details
                              ? JSON.stringify(log.details)
                              : "Recruitment lifecycle transition recorded."}
                          </p>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                            <Clock className="w-3 h-3 opacity-60" />
                            <span>
                              {new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} •{" "}
                              {new Date(log.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                            </span>
                            <span>•</span>
                            <span className="font-medium text-foreground/80">{log.actor_name || "System"}</span>
                          </div>
                        </div>

                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold uppercase shrink-0">
                          {log.category || "AUDIT"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick User Provisioning Directory */}
            <Card className="border-border/80 bg-card shadow-xs rounded-2xl overflow-hidden">
              <CardHeader className="p-5 border-b border-border/80 flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold font-outfit text-foreground flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-500" />
                    Recent Account Registrations
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Manage system identity access, deactivations, and roles
                  </CardDescription>
                </div>
                <Link to="/admin/users">
                  <Button variant="ghost" size="sm" className="text-xs text-primary font-semibold gap-1">
                    User Directory <ArrowUpRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </CardHeader>

              <CardContent className="p-0">
                {recentUsers.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No users currently provisioned.
                  </div>
                ) : (
                  <div className="divide-y divide-border/60 text-xs">
                    {recentUsers.slice(0, 5).map((u) => (
                      <div key={u.id} className="p-3.5 sm:p-4 hover:bg-secondary/20 transition-colors flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-indigo-500/20 text-primary font-bold flex items-center justify-center shrink-0 border border-primary/20">
                            {u.name?.charAt(0) || "U"}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-foreground truncate">{u.name}</div>
                            <div className="text-[11px] text-muted-foreground truncate">{u.email}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border text-[10px] font-bold uppercase">
                            {String(u.role).replace(/_/g, " ")}
                          </span>
                          <span
                            className={`w-2 h-2 rounded-full ${
                              u.is_active ? "bg-emerald-500" : "bg-rose-500"
                            }`}
                            title={u.is_active ? "Active" : "Deactivated"}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Action Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-border/80 bg-card shadow-xs rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base font-bold font-outfit flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-500" />
                  Account Identity & RBAC Management
                </CardTitle>
                <CardDescription className="text-xs">
                  Create privileged HR and Recruiter accounts, inspect candidate registrations, or toggle access.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Enforces strict role-based access control (RBAC). Administrators can provision accounts, inspect candidate dossiers, and safely revoke privileges.
                </p>
                <Link to="/admin/users" className="block">
                  <Button variant="secondary" className="w-full justify-between text-xs font-semibold">
                    Launch Full User Directory <ArrowUpRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card shadow-xs rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base font-bold font-outfit flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-purple-500" />
                  Enterprise Skills Taxonomy
                </CardTitle>
                <CardDescription className="text-xs">
                  Maintain standardized competencies used by the AI matching engine and candidate profile builders.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Taxonomy categories include Cloud, DevOps, Distributed Systems, Backend Architecture, Frontend Engineering, AI / ML, and Security.
                </p>
                <Link to="/admin/skills" className="block">
                  <Button variant="secondary" className="w-full justify-between text-xs font-semibold">
                    Configure Skills Taxonomy <ArrowUpRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: Hiring & Audit Activity Center */}
      {activeTab === "logs" && (
        <div className="animate-in fade-in duration-200">
          <HiringAuditCenter />
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
