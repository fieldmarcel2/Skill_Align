import React, { useEffect, useState } from "react";
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
} from "lucide-react";
import { HiringAuditCenter } from "../../components/admin/HiringAuditCenter";

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
            <Button variant="gradient" className="w-full sm:w-auto gap-2 text-xs sm:text-sm shadow-md shadow-indigo-500/20">
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
          className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all ${
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
          className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all relative ${
            activeTab === "logs"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          }`}
        >
          <Activity className="h-4 w-4 text-emerald-400" />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <StatCard
              title="Total Users"
              value={stats?.total_users || 0}
              icon={Users}
              color="indigo"
              description={`${stats?.active_users || 0} active accounts in platform`}
            />
            <StatCard
              title="HR Managers"
              value={stats?.hr_users || 0}
              icon={ShieldCheck}
              color="blue"
              description="Authorized matching evaluators"
            />
            <StatCard
              title="Recruiters"
              value={stats?.recruiters || 0}
              icon={Briefcase}
              color="emerald"
              description="James Recruiter & Second Recruiter"
            />
            <StatCard
              title="Registered Candidates"
              value={stats?.candidates || 0}
              icon={UserCheck}
              color="amber"
              description="Candidates with genuine resumes"
            />
            <StatCard
              title="Master Skills"
              value={stats?.total_skills || 0}
              icon={Cpu}
              color="purple"
              description="Available in taxonomy"
            />
          </div>

          {/* Quick Action Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-border/80 bg-card/70 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-400" /> User Directory
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

            <Card className="border-border/80 bg-card/70 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-purple-400" /> Skill Taxonomy
                </CardTitle>
                <CardDescription>
                  Maintain verified skills used by recruiters for job criteria and candidates for proficiency profiles.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Categories include Programming, Backend, Frontend, Cloud, DevOps, Database, Testing, and Data Science.
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
