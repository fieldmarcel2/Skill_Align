import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { usersApi, skillsApi } from "../../services/api";
import { AdminStats } from "../../types";
import { StatCard } from "../../components/common/StatCard";
import { Button } from "../../components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import {
  Users,
  UserCheck,
  Briefcase,
  Layers,
  Cpu,
  ShieldCheck,
  PlusCircle,
  ArrowUpRight,
  Loader2,
} from "lucide-react";

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
          <h1 className="text-3xl font-extrabold font-outfit text-foreground tracking-tight">
            System Administration
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Global management of user access roles, active accounts, and skill taxonomy.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/admin/users">
            <Button variant="gradient" className="gap-2 shadow-lg shadow-indigo-500/20">
              <PlusCircle className="h-4 w-4" /> Create HR / Recruiter
            </Button>
          </Link>
          <Link to="/admin/skills">
            <Button variant="outline" className="gap-2">
              <Cpu className="h-4 w-4" /> Manage Skills
            </Button>
          </Link>
        </div>
      </div>

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
          description="Job requisition creators"
        />
        <StatCard
          title="Registered Candidates"
          value={stats?.candidates || 0}
          icon={UserCheck}
          color="amber"
          description="Candidate talent pool"
        />
        <StatCard
          title="Master Skills"
          value={stats?.total_skills || 0}
          icon={Cpu}
          color="purple"
          description="Available in taxonomy"
        />
        <StatCard
          title="Platform Status"
          value="Healthy"
          icon={Layers}
          color="emerald"
          description="FastAPI 0.115 + PostgreSQL 18"
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
              Candidate registration is public. HR and Recruiter accounts can only be provisioned by System Admins.
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
  );
};
