import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authApi } from "../services/api";
import { HeroBackground } from "../components/effects/HeroBackground";
import { AnimatedCard } from "../components/effects/AnimatedCard";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Sparkles,
  Shield,
  Users,
  Briefcase,
  UserCheck,
  CheckCircle2,
  Cpu,
  Layers,
  ArrowRight,
  Target,
  Zap,
} from "lucide-react";

export const LandingPage: React.FC = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const handleQuickLogin = async (email: string, pass: string, targetPath: string) => {
    try {
      const res = await authApi.login({ email, password: pass });
      await login(res.access_token);
      navigate(targetPath);
    } catch (err) {
      navigate("/login");
    }
  };

  return (
    <HeroBackground>
      {/* Top Navbar */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="font-outfit text-2xl font-bold tracking-tight text-foreground">
            Skill<span className="text-primary">Align</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <Link
              to={
                user.role.name === "Admin"
                  ? "/admin"
                  : user.role.name === "HR"
                  ? "/hr"
                  : user.role.name === "Recruiter"
                  ? "/recruiter"
                  : "/candidate"
              }
            >
              <Button variant="gradient" className="gap-2">
                Open {user.role.name} Dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link to="/register">
                <Button variant="gradient">Register Candidate</Button>
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-5xl mx-auto text-center px-6 pt-16 pb-24">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 backdrop-blur-md text-indigo-300 text-xs font-semibold mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
          <Zap className="h-3.5 w-3.5 text-indigo-400" />
          Intelligent Weighted Recruitment Matching Engine
        </div>

        <h1 className="font-outfit text-5xl sm:text-7xl font-extrabold tracking-tight text-foreground leading-[1.1] mb-6">
          Align Talent to Roles with{" "}
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Algorithmic Precision
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed">
          SkillAlign scores candidates against complex job requisitions using weighted proficiency
          factors, required vs. preferred criteria, and verified experience.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
          <Link to="/register">
            <Button size="lg" variant="gradient" className="gap-2 text-base px-8 h-13 rounded-xl">
              Get Started as Candidate <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="outline" className="text-base px-8 h-13 rounded-xl">
              Sign In to Portal
            </Button>
          </Link>
        </div>

        {/* 1-Click Role Quick Access Bar for live demo testing */}
        <div className="p-6 rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xl shadow-2xl text-left max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Explore by Role (1-Click Demo Login)
              </h4>
              <p className="text-xs text-muted-foreground">
                Instantly switch accounts to experience the recruitment workflow from every perspective.
              </p>
            </div>
            <Badge variant="outline" className="hidden sm:inline-flex">
              Dev Mode Enabled
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Admin demo */}
            <button
              onClick={() => handleQuickLogin("admin@skillaign.dev", "Admin@123", "/admin")}
              className="p-3.5 rounded-xl border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/15 transition-all text-left group"
            >
              <div className="flex items-center gap-2 mb-1">
                <Shield className="h-4 w-4 text-purple-400" />
                <span className="text-xs font-bold text-foreground">Admin Portal</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Manage HRs, Recruiters & Skills Taxonomy</p>
            </button>

            {/* HR demo */}
            <button
              onClick={() => handleQuickLogin("hr@skillaign.dev", "HR@12345", "/hr")}
              className="p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/15 transition-all text-left group"
            >
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-blue-400" />
                <span className="text-xs font-bold text-foreground">HR Manager</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Run Matching Engine & Shortlist Candidates</p>
            </button>

            {/* Recruiter demo */}
            <button
              onClick={() => handleQuickLogin("recruiter@skillaign.dev", "Rec@12345", "/recruiter")}
              className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/15 transition-all text-left group"
            >
              <div className="flex items-center gap-2 mb-1">
                <Briefcase className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-bold text-foreground">Recruiter Portal</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Create Weighted Jobs & Review Resumes</p>
            </button>

            {/* Candidate demo */}
            <button
              onClick={() => handleQuickLogin("alice@candidate.dev", "Alice@123", "/candidate")}
              className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/15 transition-all text-left group"
            >
              <div className="flex items-center gap-2 mb-1">
                <UserCheck className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-bold text-foreground">Candidate Profile</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Manage Proficiency, Experience & Resume</p>
            </button>
          </div>
        </div>
      </div>

      {/* Feature Showcase Grid */}
      <div className="max-w-7xl mx-auto px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="font-outfit text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Engineered for Modern Talent Acquisition
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            A complete layered solution connecting job requisitions to the best-fit talent without manual resume screening fatigue.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <AnimatedCard delay={0.1}>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 mb-4">
              <Target className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">Weighted Scoring Engine</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Every job skill can be assigned weights (1-5) and marked as Required vs. Preferred. Proficiency levels (Beginner, Intermediate, Expert) scale mathematical scores.
            </p>
          </AnimatedCard>

          <AnimatedCard delay={0.2}>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-400 border border-purple-500/30 mb-4">
              <Cpu className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">Role-Segregated Workflows</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Strict RBAC authorization separates Admin taxonomy, Recruiter job creation, HR candidate scoring, and Candidate profile management.
            </p>
          </AnimatedCard>

          <AnimatedCard delay={0.3}>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 mb-4">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">Transaction-Safe Matching</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Idempotent upsert logic ensures re-running match algorithms updates scores cleanly without generating duplicate records.
            </p>
          </AnimatedCard>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/60 py-8 px-8 text-center text-sm text-muted-foreground">
        <p>© 2026 SkillAlign. Built with React, Vite, Tailwind CSS, FastAPI & PostgreSQL.</p>
      </footer>
    </HeroBackground>
  );
};
