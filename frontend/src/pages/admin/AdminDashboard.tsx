import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { usersApi } from "../../services/api";
import { AdminStats } from "../../types";
import { StatCard } from "../../components/common/StatCard";
import { Button } from "../../components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
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
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "logs">("overview");

  const fetchStats = async () => {
    try {
      const data = await usersApi.getStats();
      setStats(data);
    } catch (err) {
      console.error("Failed to load admin stats:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Compute charts data
  const roleDistributionData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: "Candidates", value: stats.candidates || 0, color: "#f59e0b" },
      { name: "HR Managers", value: stats.hr_users || 0, color: "#3b82f6" },
      { name: "Recruiters", value: stats.recruiters || 0, color: "#10b981" },
      { name: "Administrators", value: Math.max(1, (stats.total_users || 0) - (stats.candidates || 0) - (stats.hr_users || 0) - (stats.recruiters || 0)), color: "#8b5cf6" },
    ];
  }, [stats]);

  const velocityData = useMemo(() => {
    return [
      { day: "Mon", matches: 12, screenings: 8, interviews: 4, offers: 2 },
      { day: "Tue", matches: 18, screenings: 14, interviews: 6, offers: 3 },
      { day: "Wed", matches: 15, screenings: 11, interviews: 8, offers: 2 },
      { day: "Thu", matches: 24, screenings: 19, interviews: 9, offers: 4 },
      { day: "Fri", matches: 28, screenings: 22, interviews: 12, offers: 5 },
      { day: "Sat", matches: 10, screenings: 6, interviews: 3, offers: 1 },
      { day: "Sun", matches: 16, screenings: 12, interviews: 5, offers: 2 },
    ];
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              <Shield className="h-3 w-3" /> System Administration
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-outfit text-foreground tracking-tight">
            Admin Management Console
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Global governance over platform accounts, taxonomy, and real-time recruitment lifecycle audit trails.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link to="/admin/users" className="w-full sm:w-auto">
            <Button variant="default" className="w-full sm:w-auto gap-2 text-xs sm:text-sm shadow-sm">
              <PlusCircle className="h-4 w-4" /> Provision Account
            </Button>
          </Link>
          <Link to="/admin/skills" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto gap-2 text-xs sm:text-sm">
              <Cpu className="h-4 w-4" /> Manage Skills
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="border-b border-border flex items-center gap-2">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === "overview"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          }`}
        >
          <LayoutDashboard className="h-4 w-4" />
          System Overview
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
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

          {/* Dynamic Visual Graphs (Recharts) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Account Role Distribution Donut */}
            <Card className="lg:col-span-5 border-border/80 bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl shadow-xs min-w-0 overflow-hidden">
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
                  Active account identity segmentation across organizational roles
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-[250px] sm:h-[270px] w-full min-w-0">
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
                          backgroundColor: "rgba(15, 23, 42, 0.95)",
                          borderRadius: "8px",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          color: "#fff",
                          fontSize: "12px",
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
            <Card className="lg:col-span-7 border-border/80 bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl shadow-xs min-w-0 overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold font-outfit flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    7-Day Recruitment Velocity & Funnel
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
                <div className="h-[250px] sm:h-[270px] w-full min-w-0">
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
                          backgroundColor: "rgba(15, 23, 42, 0.95)",
                          borderRadius: "8px",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          color: "#fff",
                          fontSize: "12px",
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
          </div>

          {/* Quick Action Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-border/80 bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl shadow-xs">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-500" /> User Directory
                </CardTitle>
                <CardDescription>
                  Create privileged HR and Recruiter accounts, view candidate registrations, or deactivate accounts.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Recruiter access is consolidated to James Recruiter and Second Recruiter. System Admins manage access provisioning.
                </p>
                <Link to="/admin/users">
                  <Button variant="secondary" className="w-full justify-between">
                    Open User Management <ArrowUpRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl shadow-xs">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-purple-500" /> Skill Taxonomy
                </CardTitle>
                <CardDescription>
                  Maintain verified skills used by recruiters for job criteria and candidates for proficiency profiles.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Categories include Cloud, DevOps, Backend, Frontend, Database, AI, Data Science, Security, and Testing.
                </p>
                <Link to="/admin/skills">
                  <Button variant="secondary" className="w-full justify-between">
                    Open Skills Taxonomy <ArrowUpRight className="h-4 w-4" />
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
