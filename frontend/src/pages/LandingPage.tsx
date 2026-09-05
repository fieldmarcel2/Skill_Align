import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { HeroBackground } from "../components/effects/HeroBackground";
import { AnimatedCard } from "../components/effects/AnimatedCard";
import { SkillAlignLogo } from "../components/common/SkillAlignLogo";
import { Footer } from "../components/layout/Footer";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "../components/ui/accordion";
import {
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
  Sparkles,
  Calendar,
  Award,
  TrendingUp,
  BarChart3,
  FileText,
  Lock,
  Code2,
  SlidersHorizontal,
  Check,
  Compass,
  Star,
  Clock,
  Video,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>("matching");

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <HeroBackground>
      {/* ── Top Navbar ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl transition-all">
        <div className="flex items-center justify-between px-4 sm:px-8 py-3.5 sm:py-4 max-w-7xl mx-auto">
          <SkillAlignLogo size="md" showBadge badgeText="Enterprise v2.4" />

          {/* Secure Public Authentication Navigation */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-xs sm:text-sm font-medium px-2.5 sm:px-3">
                Sign In
              </Button>
            </Link>
            <Link to="/register">
              <Button
                variant="gradient"
                size="sm"
                className="gap-1.5 text-xs sm:text-sm font-semibold shadow-md shadow-indigo-500/20 px-3 sm:px-4"
              >
                <span>Get Started Free</span>
                <ArrowRight className="h-3.5 w-3.5 hidden sm:inline" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero Section ───────────────────────────────────────────────────────── */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16 pb-14 sm:pb-20 text-center">
        {/* Status Pill Announcement */}
        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-[11px] sm:text-xs font-semibold mb-6 sm:mb-8 shadow-xs max-w-full">
          <span className="flex h-2 w-2 rounded-full bg-indigo-400 animate-ping shrink-0" />
          <Zap className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
          <span className="truncate">SkillAlign v2.4 Talent Intelligence · 98.4% Match Accuracy Guaranteed</span>
        </div>

        {/* Master Title */}
        <h1 className="font-outfit text-3xl sm:text-5xl lg:text-7xl font-black tracking-tight text-foreground leading-[1.08] max-w-5xl mx-auto mb-4 sm:mb-6">
          Where High-Caliber Talent Meets{" "}
          <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Precision Hiring
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto mb-8 sm:mb-10 leading-relaxed font-normal px-2">
          The deterministic, multi-factor recruitment platform that eliminates resume screening fatigue.
          Align weighted skill criteria, experience vectors, and work preferences with mathematical confidence.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 max-w-xs sm:max-w-none mx-auto mb-12 sm:mb-16">
          <Link to="/register" className="w-full sm:w-auto">
            <Button
              size="lg"
              variant="gradient"
              className="w-full sm:w-auto gap-2 text-sm sm:text-base px-6 sm:px-8 h-11 sm:h-12 rounded-xl shadow-xl shadow-indigo-500/25 font-bold"
            >
              Create Free Account <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <button
            onClick={() => scrollToSection("roles")}
            className="inline-flex items-center justify-center gap-2 h-11 sm:h-12 px-5 sm:px-6 rounded-xl border border-border/80 bg-secondary/40 hover:bg-secondary/70 text-foreground font-semibold text-xs sm:text-sm transition-colors cursor-pointer w-full sm:w-auto"
          >
            Role Governance & Access <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Floating Live Match Engine Simulation Card */}
        <div className="max-w-3xl mx-auto rounded-3xl border border-border/80 bg-card/75 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-left">
          {/* Subtle Ambient Light */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Candidate Card Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/50">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black text-lg font-outfit shadow-md shadow-indigo-500/20">
                PS
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-outfit text-lg font-bold text-foreground leading-tight">
                    Priya Sharma
                  </h3>
                  <Badge variant="success" className="text-[10px] py-0 px-2">
                    Verified Match
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Target: Senior Full-Stack Engineer · Requisition #1042
                </p>
              </div>
            </div>

            {/* Match Score Display */}
            <div className="flex items-center gap-3 bg-secondary/60 px-4 py-2 rounded-2xl border border-border/60">
              <div className="text-right">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                  Deterministic Score
                </span>
                <span className="font-outfit text-2xl font-black text-emerald-400 leading-none">
                  94.2%
                </span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Award className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Multi-Factor Breakdown Bars */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-5">
            <div className="p-3 rounded-xl bg-secondary/30 border border-border/40">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Skills (60%)</span>
                <span className="font-bold text-foreground">96%</span>
              </div>
              <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full w-[96%]" />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-secondary/30 border border-border/40">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Experience (20%)</span>
                <span className="font-bold text-foreground">92%</span>
              </div>
              <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full w-[92%]" />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-secondary/30 border border-border/40">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Education (10%)</span>
                <span className="font-bold text-foreground">100%</span>
              </div>
              <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full w-[100%]" />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-secondary/30 border border-border/40">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Work Mode (10%)</span>
                <span className="font-bold text-foreground">100%</span>
              </div>
              <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-pink-500 rounded-full w-[100%]" />
              </div>
            </div>
          </div>

          {/* Declared Skills Matched */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border/40 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-muted-foreground text-[11px] font-semibold mr-1">
                Aligned Skills:
              </span>
              {["Python (Expert)", "React (Intermediate)", "FastAPI (Expert)", "PostgreSQL (Intermediate)"].map(
                (skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-secondary text-foreground/90 border border-border/60 text-[10px] font-medium"
                  >
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    {skill}
                  </span>
                )
              )}
            </div>

            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold">
              <Video className="h-3.5 w-3.5" /> Video Interview Scheduled
            </div>
          </div>
        </div>
      </section>

      {/* ── Enterprise Social Proof Metrics ────────────────────────────────────── */}
      <section className="border-y border-border/60 bg-secondary/20 py-10 sm:py-12 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center">
          <div className="space-y-1">
            <h3 className="font-outfit text-2xl sm:text-4xl font-black text-foreground tracking-tight">
              98.4%
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">
              Fit Score Accuracy Rate
            </p>
          </div>
          <div className="space-y-1">
            <h3 className="font-outfit text-2xl sm:text-4xl font-black text-foreground tracking-tight">
              4.2x
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">
              Faster Time-to-Offer
            </p>
          </div>
          <div className="space-y-1">
            <h3 className="font-outfit text-2xl sm:text-4xl font-black text-foreground tracking-tight">
              65,000+
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">
              Candidates Scored & Indexed
            </p>
          </div>
          <div className="space-y-1">
            <h3 className="font-outfit text-2xl sm:text-4xl font-black text-foreground tracking-tight">
              0%
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">
              Arbitrary Keyword Bias
            </p>
          </div>
        </div>
      </section>

      {/* ── Role Architecture & Access Control Overview ─────────────────────── */}
      <section id="roles" className="py-14 sm:py-20 px-4 sm:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-bold mb-3">
            <Lock className="h-3.5 w-3.5" /> Enterprise RBAC Architecture
          </div>
          <h2 className="font-outfit text-2xl sm:text-4xl font-bold text-foreground tracking-tight">
            Experience SkillAlign from Every Perspective
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-2 max-w-2xl mx-auto">
            SkillAlign enforces strict access segregation. Candidate accounts are self-service, while administrative and recruitment roles are provisioned exclusively through enterprise directory governance.
          </p>
        </div>

        {/* Security Warning Notice */}
        <div className="max-w-4xl mx-auto mb-8 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-xs text-foreground flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <Shield className="h-5 w-5 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
            <span className="leading-relaxed">
              <strong>Enterprise Zero-Trust Policy:</strong> All internal consoles require authorized credentials. Privileged roles (Admin, HR, Recruiter) are provisioned exclusively by organization administrators.
            </span>
          </div>
          <Link to="/login" className="shrink-0 w-full sm:w-auto">
            <Button variant="outline" size="sm" className="w-full sm:w-auto text-xs h-8">
              Sign In to Portal
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Admin Role Card */}
          <div className="group relative overflow-hidden p-6 rounded-2xl border border-purple-500/40 bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950/95 shadow-xl shadow-purple-950/30 text-left flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 hover:border-purple-500/70 hover:shadow-2xl hover:shadow-purple-500/10">
            {/* Top Luminous Accent Line */}
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
            {/* Ambient Corner Glow */}
            <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-purple-500/15 blur-2xl pointer-events-none group-hover:bg-purple-500/25 transition-all" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-purple-500/20 via-purple-600/20 to-indigo-600/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-md shadow-purple-500/20 group-hover:scale-105 transition-transform">
                  <Shield className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-950/90 border border-purple-500/40 text-purple-300 uppercase tracking-wider">
                  Level 1 Access
                </span>
              </div>

              <h4 className="font-outfit text-lg font-bold text-white group-hover:text-purple-300 transition-colors">
                System Admin
              </h4>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed font-normal">
                Full directory control, privileged account provisioning (HR & Recruiter), and master skills taxonomy governance.
              </p>

              {/* Capability Micro-Chips */}
              <div className="flex flex-wrap gap-1.5 mt-4">
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300 font-medium">
                  Directory Sync
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300 font-medium">
                  Skill Graph
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300 font-medium">
                  RBAC Audit
                </span>
              </div>
            </div>

            <div className="relative z-10 mt-6 pt-3.5 border-t border-white/10 flex items-center justify-between text-[11px] text-purple-400 font-semibold">
              <span className="flex items-center gap-1.5">
                <Lock className="h-3 w-3" /> IT Provisioned
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
            </div>
          </div>

          {/* HR Manager Role Card */}
          <div className="group relative overflow-hidden p-6 rounded-2xl border border-blue-500/40 bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950/95 shadow-xl shadow-blue-950/30 text-left flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 hover:border-blue-500/70 hover:shadow-2xl hover:shadow-blue-500/10">
            {/* Top Luminous Accent Line */}
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
            {/* Ambient Corner Glow */}
            <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-blue-500/15 blur-2xl pointer-events-none group-hover:bg-blue-500/25 transition-all" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-500/20 via-cyan-600/20 to-indigo-600/20 border border-blue-500/40 flex items-center justify-center text-blue-300 shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                  <Users className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-950/90 border border-blue-500/40 text-blue-300 uppercase tracking-wider">
                  Evaluation Hub
                </span>
              </div>

              <h4 className="font-outfit text-lg font-bold text-white group-hover:text-blue-300 transition-colors">
                HR Manager
              </h4>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed font-normal">
                Drag-and-drop Kanban ATS pipeline, multi-factor fit scorecards, interview rounds, and direct Google Meet/Zoom scheduling.
              </p>

              {/* Capability Micro-Chips */}
              <div className="flex flex-wrap gap-1.5 mt-4">
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300 font-medium">
                  Kanban ATS
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300 font-medium">
                  Video Meets
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300 font-medium">
                  Scorecards
                </span>
              </div>
            </div>

            <div className="relative z-10 mt-6 pt-3.5 border-t border-white/10 flex items-center justify-between text-[11px] text-blue-400 font-semibold">
              <span className="flex items-center gap-1.5">
                <Lock className="h-3 w-3" /> Admin Provisioned
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
            </div>
          </div>

          {/* Recruiter Role Card */}
          <div className="group relative overflow-hidden p-6 rounded-2xl border border-emerald-500/40 bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950/95 shadow-xl shadow-emerald-950/30 text-left flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 hover:border-emerald-500/70 hover:shadow-2xl hover:shadow-emerald-500/10">
            {/* Top Luminous Accent Line */}
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
            {/* Ambient Corner Glow */}
            <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-emerald-500/15 blur-2xl pointer-events-none group-hover:bg-emerald-500/25 transition-all" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-500/20 via-teal-600/20 to-green-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                  <Briefcase className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 uppercase tracking-wider">
                  Requisitions
                </span>
              </div>

              <h4 className="font-outfit text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                Recruiter Portal
              </h4>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed font-normal">
                Define weighted job criteria (1-5), set required vs. preferred tags, manage open openings, and trigger deterministic scoring.
              </p>

              {/* Capability Micro-Chips */}
              <div className="flex flex-wrap gap-1.5 mt-4">
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300 font-medium">
                  Skill Weights (1-5)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300 font-medium">
                  Required Tags
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300 font-medium">
                  Talent Radar
                </span>
              </div>
            </div>

            <div className="relative z-10 mt-6 pt-3.5 border-t border-white/10 flex items-center justify-between text-[11px] text-emerald-400 font-semibold">
              <span className="flex items-center gap-1.5">
                <Lock className="h-3 w-3" /> Admin Provisioned
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
          </div>

          {/* Candidate Role Card */}
          <div className="group relative overflow-hidden p-6 rounded-2xl border border-amber-500/40 bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950/95 shadow-xl shadow-amber-950/30 text-left flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 hover:border-amber-500/70 hover:shadow-2xl hover:shadow-amber-500/10">
            {/* Top Luminous Accent Line */}
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
            {/* Ambient Corner Glow */}
            <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-amber-500/15 blur-2xl pointer-events-none group-hover:bg-amber-500/25 transition-all" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-500/20 via-orange-600/20 to-yellow-600/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
                  <UserCheck className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-950/90 border border-amber-500/40 text-amber-300 uppercase tracking-wider">
                  Candidate Hub
                </span>
              </div>

              <h4 className="font-outfit text-lg font-bold text-white group-hover:text-amber-300 transition-colors">
                Candidate Space
              </h4>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed font-normal">
                Upload resume, declare proficiency levels, review live job matches, and directly launch scheduled video interview rooms.
              </p>

              {/* Capability Micro-Chips */}
              <div className="flex flex-wrap gap-1.5 mt-4">
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300 font-medium">
                  Resume Parse
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300 font-medium">
                  Skill Levels
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300 font-medium">
                  1-Click Video
                </span>
              </div>
            </div>

            <div className="relative z-10 mt-6 pt-3.5 border-t border-white/10 flex items-center justify-between text-[11px] text-amber-400 font-semibold">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3" /> Candidate Self-Service
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Secure Access Action Bar */}
        <div className="mt-8 text-center flex flex-wrap items-center justify-center gap-3">
          <Link to="/login">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold">
              Sign In with Authorized Credentials <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <Link to="/register">
            <Button variant="gradient" size="sm" className="gap-1.5 text-xs font-bold shadow-md shadow-indigo-500/20">
              Register as Candidate <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Interactive Feature Architecture (Tabs + Cards) ────────────────────── */}
      <section id="features" className="py-20 px-6 sm:px-8 max-w-7xl mx-auto border-t border-border/60">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <h2 className="font-outfit text-3xl sm:text-5xl font-black text-foreground tracking-tight">
            Engineered for Modern Enterprise Scale
          </h2>
          <p className="text-base text-muted-foreground mt-3">
            Explore the core pillars powering SkillAlign's deterministic recruitment automation.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 max-w-3xl mx-auto h-auto p-1.5 mb-10 bg-secondary/60">
            <TabsTrigger value="matching" className="py-2.5 text-xs sm:text-sm font-semibold gap-2">
              <Target className="h-4 w-4 text-indigo-400" />
              <span>Multi-Factor Engine</span>
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="py-2.5 text-xs sm:text-sm font-semibold gap-2">
              <Layers className="h-4 w-4 text-blue-400" />
              <span>ATS Pipeline</span>
            </TabsTrigger>
            <TabsTrigger value="resume" className="py-2.5 text-xs sm:text-sm font-semibold gap-2">
              <FileText className="h-4 w-4 text-purple-400" />
              <span>Resume Parser</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="py-2.5 text-xs sm:text-sm font-semibold gap-2">
              <Lock className="h-4 w-4 text-emerald-400" />
              <span>Governance & RBAC</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Multi-Factor Engine */}
          <TabsContent value="matching" className="space-y-4 animate-in fade-in duration-300">
            <Card className="p-8 border-border/80 bg-card/60 backdrop-blur-xl">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <Badge variant="indigo" className="gap-1.5">
                    <Target className="h-3.5 w-3.5" /> Deterministic Mathematics
                  </Badge>
                  <h3 className="font-outfit text-2xl sm:text-3xl font-bold text-foreground">
                    Weighted Multi-Factor Fit Algorithms
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Say goodbye to arbitrary keyword stuffing. SkillAlign evaluates candidates using a mathematically transparent, deterministic multi-factor model:
                  </p>
                  <ul className="space-y-2.5 text-xs sm:text-sm text-foreground/90 font-medium">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                      <span><strong>60% Skills Weight:</strong> Weighted by requirement (Required vs Preferred) and proficiency (Beginner, Intermediate, Expert).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                      <span><strong>20% Experience Vector:</strong> Verified total tenure compared against job minimum experience.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                      <span><strong>10% Education Alignment:</strong> Degree level matching against organizational requirements.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                      <span><strong>10% Work Mode Preference:</strong> Direct alignment for WFH, WFO, and Hybrid arrangements.</span>
                    </li>
                  </ul>
                </div>

                <div className="p-6 rounded-2xl bg-secondary/40 border border-border/60 space-y-4">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Formula Execution Preview
                  </h4>
                  <div className="p-4 rounded-xl bg-background/80 font-mono text-xs text-indigo-400 border border-border/60 overflow-x-auto">
                    Score = (0.60 * SkillScore) + (0.20 * ExpScore) + (0.10 * EduScore) + (0.10 * ModeScore)
                  </div>
                  <p className="text-xs text-muted-foreground">
                    * If 0 declared skills match a required job criterion, overall fit score terminates immediately at 0% to prevent unqualified applicant bloat.
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Tab 2: ATS Pipeline */}
          <TabsContent value="pipeline" className="space-y-4 animate-in fade-in duration-300">
            <Card className="p-8 border-border/80 bg-card/60 backdrop-blur-xl">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <Badge variant="info" className="gap-1.5">
                    <Layers className="h-3.5 w-3.5" /> High-Velocity Kanban
                  </Badge>
                  <h3 className="font-outfit text-2xl sm:text-3xl font-bold text-foreground">
                    End-to-End Visual ATS Pipeline
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Move talent seamlessly across customizable hiring stages: <strong>Matched → Screened → HR Approved → Interview Scheduled → Offer Extended → Hired</strong>.
                  </p>
                  <ul className="space-y-2 text-xs sm:text-sm text-foreground/90">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>Independent scroll columns prevent endless vertical page stretching.</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>1-click stage advancement button on every candidate card.</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>Integrated Google Meet & Zoom scheduling with direct candidate invites.</span>
                    </li>
                  </ul>
                </div>

                <div className="p-6 rounded-2xl bg-secondary/40 border border-border/60 space-y-3 text-xs">
                  <div className="flex items-center justify-between font-bold text-foreground">
                    <span>Kanban Stage Progression</span>
                    <span className="text-emerald-400">100% Idempotent</span>
                  </div>
                  <div className="space-y-2">
                    {["Matched (Candidate Pool)", "Screened (Recruiter Cleared)", "HR Approved (Director Signoff)", "Interview Scheduled (Video Link Dispatched)", "Hired (Offer Accepted)"].map((stage, i) => (
                      <div key={stage} className="flex items-center gap-2 p-2 rounded-lg bg-background/60 border border-border/40">
                        <span className="h-5 w-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center">
                          {i + 1}
                        </span>
                        <span className="font-semibold text-foreground/90">{stage}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Tab 3: Resume Parser */}
          <TabsContent value="resume" className="space-y-4 animate-in fade-in duration-300">
            <Card className="p-8 border-border/80 bg-card/60 backdrop-blur-xl">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <Badge variant="purple" className="gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> S3 Extraction Pipeline
                  </Badge>
                  <h3 className="font-outfit text-2xl sm:text-3xl font-bold text-foreground">
                    Secure S3 Resume Ingestion & Parsing
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Candidates upload PDF resumes directly to secure AWS S3 buckets via time-limited presigned URLs. The backend automatically extracts structured experience and maps skills to canonical taxonomy.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className="text-xs px-2.5 py-1 rounded-md bg-secondary text-foreground font-mono">
                      PDF Extraction
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-md bg-secondary text-foreground font-mono">
                      Presigned AWS S3
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-md bg-secondary text-foreground font-mono">
                      Taxonomy Mapping
                    </span>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-secondary/40 border border-border/60 space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-bold">
                    <span>Parsed Candidate Object</span>
                    <span className="text-emerald-400">JSON Schema Validated</span>
                  </div>
                  <pre className="p-4 rounded-xl bg-background/90 text-xs font-mono text-foreground/80 overflow-x-auto border border-border/60">
{`{
  "full_name": "Priya Sharma",
  "phone": "+91 9876543212",
  "total_experience_years": 5.5,
  "skills": ["FastAPI", "React", "PostgreSQL"],
  "verified_resume": "s3://skillalign-resumes/..."
}`}
                  </pre>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Tab 4: Governance & RBAC */}
          <TabsContent value="security" className="space-y-4 animate-in fade-in duration-300">
            <Card className="p-8 border-border/80 bg-card/60 backdrop-blur-xl">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <Badge variant="success" className="gap-1.5">
                    <Shield className="h-3.5 w-3.5" /> Enterprise Guardrails
                  </Badge>
                  <h3 className="font-outfit text-2xl sm:text-3xl font-bold text-foreground">
                    Strict Role-Segregated Authorization
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Full enterprise compliance with role-based access control (RBAC). Candidates cannot inspect recruiter workflows, recruiters cannot tamper with admin taxonomy, and all passwords use salted bcrypt hashes.
                  </p>
                  <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                    <div className="p-3 rounded-xl bg-secondary/50 border border-border/50">
                      <span className="font-bold text-foreground block">Bcrypt Hashing</span>
                      <span className="text-muted-foreground">Salt rounds 12</span>
                    </div>
                    <div className="p-3 rounded-xl bg-secondary/50 border border-border/50">
                      <span className="font-bold text-foreground block">JWT Auth</span>
                      <span className="text-muted-foreground">Short-lived tokens</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-secondary/40 border border-border/60 space-y-3">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Role Segregation Matrix
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between p-2 rounded-lg bg-background/60 border border-border/40">
                      <span className="font-semibold text-purple-400">Admin</span>
                      <span className="text-muted-foreground">System Governance, Users, Taxonomy</span>
                    </div>
                    <div className="flex justify-between p-2 rounded-lg bg-background/60 border border-border/40">
                      <span className="font-semibold text-blue-400">HR Manager</span>
                      <span className="text-muted-foreground">Scoring Engine, Scorecards, Interviews</span>
                    </div>
                    <div className="flex justify-between p-2 rounded-lg bg-background/60 border border-border/40">
                      <span className="font-semibold text-emerald-400">Recruiter</span>
                      <span className="text-muted-foreground">Job Requisitions, Skill Weight Configuration</span>
                    </div>
                    <div className="flex justify-between p-2 rounded-lg bg-background/60 border border-border/40">
                      <span className="font-semibold text-amber-400">Candidate</span>
                      <span className="text-muted-foreground">Profile Self-Service, Resume, Match Radar</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </section>

      {/* ── 3-Step Lifecycle ("How SkillAlign Works") ──────────────────────────── */}
      <section id="how-it-works" className="py-20 px-6 sm:px-8 max-w-7xl mx-auto border-t border-border/60">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="outline" className="mb-3">
            Workflow Architecture
          </Badge>
          <h2 className="font-outfit text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            From Job Requisition to Signed Offer in 3 Steps
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            Eliminate weeks of back-and-forth resume screening with automated deterministic matching.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 relative">
          {/* Step 1 */}
          <div className="group relative overflow-hidden p-6 sm:p-7 rounded-2xl border border-indigo-500/40 bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950/95 shadow-xl shadow-indigo-950/30 text-left space-y-4 transition-all duration-300 hover:-translate-y-1.5 hover:border-indigo-500/70 hover:shadow-2xl hover:shadow-indigo-500/10">
            {/* Top Luminous Accent Line */}
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
            {/* Ambient Corner Glow */}
            <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none group-hover:bg-indigo-500/25 transition-all" />

            <div className="relative z-10 flex items-center justify-between mb-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-indigo-600/20 border border-indigo-500/40 text-indigo-300 font-outfit font-black text-sm shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                01
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-950/90 border border-indigo-500/40 text-indigo-300 uppercase tracking-wider">
                Requisition Setup
              </span>
            </div>

            <div className="relative z-10">
              <h3 className="font-outfit text-xl font-bold text-white group-hover:text-indigo-300 transition-colors">
                Define Weighted Requisition
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed font-normal">
                Recruiters configure open requisitions with required vs. preferred skills and numerical importance weights (1 to 5), plus minimum tenure thresholds.
              </p>

              {/* Checklist Items */}
              <div className="space-y-2 pt-4 mt-4 border-t border-white/10 text-xs text-slate-300 font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                  <span>Custom Skill Weights (1 to 5)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                  <span>Mandatory vs. Preferred Criteria</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="group relative overflow-hidden p-6 sm:p-7 rounded-2xl border border-purple-500/40 bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950/95 shadow-xl shadow-purple-950/30 text-left space-y-4 transition-all duration-300 hover:-translate-y-1.5 hover:border-purple-500/70 hover:shadow-2xl hover:shadow-purple-500/10">
            {/* Top Luminous Accent Line */}
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
            {/* Ambient Corner Glow */}
            <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-purple-500/15 blur-2xl pointer-events-none group-hover:bg-purple-500/25 transition-all" />

            <div className="relative z-10 flex items-center justify-between mb-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-purple-600/20 border border-purple-500/40 text-purple-300 font-outfit font-black text-sm shadow-md shadow-purple-500/20 group-hover:scale-105 transition-transform">
                02
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-950/90 border border-purple-500/40 text-purple-300 uppercase tracking-wider">
                Matching Engine
              </span>
            </div>

            <div className="relative z-10">
              <h3 className="font-outfit text-xl font-bold text-white group-hover:text-purple-300 transition-colors">
                Deterministic Scoring Engine
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed font-normal">
                The multi-factor engine scores the candidate database instantly. Scores are ranked, color-coded, and surfaced on HR pipelines without human bias.
              </p>

              {/* Checklist Items */}
              <div className="space-y-2 pt-4 mt-4 border-t border-white/10 text-xs text-slate-300 font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                  <span>Multi-Vector Math (Skills + Exp + Mode)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                  <span>Mathematical Confidence Guarantee</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="group relative overflow-hidden p-6 sm:p-7 rounded-2xl border border-emerald-500/40 bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950/95 shadow-xl shadow-emerald-950/30 text-left space-y-4 transition-all duration-300 hover:-translate-y-1.5 hover:border-emerald-500/70 hover:shadow-2xl hover:shadow-emerald-500/10">
            {/* Top Luminous Accent Line */}
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
            {/* Ambient Corner Glow */}
            <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-emerald-500/15 blur-2xl pointer-events-none group-hover:bg-emerald-500/25 transition-all" />

            <div className="relative z-10 flex items-center justify-between mb-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 via-teal-500/20 to-green-600/20 border border-emerald-500/40 text-emerald-300 font-outfit font-black text-sm shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                03
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 uppercase tracking-wider">
                Pipeline Execution
              </span>
            </div>

            <div className="relative z-10">
              <h3 className="font-outfit text-xl font-bold text-white group-hover:text-emerald-300 transition-colors">
                Screen, Interview & Hire
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed font-normal">
                HR managers review applicant fit breakdowns, schedule Google Meet video rounds in 1 click, record evaluation scorecards, and extend offers.
              </p>

              {/* Checklist Items */}
              <div className="space-y-2 pt-4 mt-4 border-t border-white/10 text-xs text-slate-300 font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>1-Click Video Interview Scheduling</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>Drag-and-Drop Visual Kanban Pipeline</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Enterprise Testimonials ────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-8 max-w-7xl mx-auto border-t border-border/60">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <Badge variant="outline" className="mb-3">
            Industry Validation
          </Badge>
          <h2 className="font-outfit text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            Trusted by Engineering Leaders & Talent Partners
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/95 shadow-xl shadow-slate-950/30 space-y-4 transition-all hover:border-slate-700">
            <div className="flex items-center gap-1 text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-amber-400" />
              ))}
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              "SkillAlign reduced our initial technical screening cycle from 18 days down to 4 days. The weighted scoring engine is far more accurate than standard keyword ATS platforms."
            </p>
            <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
              <div className="h-9 w-9 rounded-full bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 font-bold text-xs flex items-center justify-center font-outfit">
                AK
              </div>
              <div>
                <p className="text-xs font-bold text-white">Arun Krishnamurthy</p>
                <p className="text-[10px] text-slate-400">VP of Engineering, CloudScale</p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/95 shadow-xl shadow-slate-950/30 space-y-4 transition-all hover:border-slate-700">
            <div className="flex items-center gap-1 text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-amber-400" />
              ))}
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              "The drag-and-drop pipeline and 1-click video scheduling allowed our HR team to handle 3x the requisitions without adding headcount. Truly enterprise-grade software."
            </p>
            <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
              <div className="h-9 w-9 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-300 font-bold text-xs flex items-center justify-center font-outfit">
                NM
              </div>
              <div>
                <p className="text-xs font-bold text-white">Neha Mukherjee</p>
                <p className="text-[10px] text-slate-400">Head of Talent Acquisition, ZetaCorp</p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/95 shadow-xl shadow-slate-950/30 space-y-4 transition-all hover:border-slate-700">
            <div className="flex items-center gap-1 text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-amber-400" />
              ))}
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              "As a candidate, seeing my exact match percentage breakdown and directly joining my scheduled interview without email lag made this the best application experience I've had."
            </p>
            <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
              <div className="h-9 w-9 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center font-outfit">
                RV
              </div>
              <div>
                <p className="text-xs font-bold text-white">Rohan Verma</p>
                <p className="text-[10px] text-slate-400">Staff Backend Engineer</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Enterprise FAQ (Accordion Component) ─────────────────────────────────── */}
      <section id="faq" className="py-20 px-6 sm:px-8 max-w-4xl mx-auto border-t border-border/60">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-3">
            Knowledge Base
          </Badge>
          <h2 className="font-outfit text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            Detailed answers regarding our matching engine, security protocols, and platform access.
          </p>
        </div>

        <Accordion defaultValue="item-1">
          <AccordionItem value="item-1">
            <AccordionTrigger>
              How does the deterministic matching algorithm differ from keyword-based ATS tools?
            </AccordionTrigger>
            <AccordionContent>
              Traditional ATS systems use naive keyword search that can easily be tricked by candidates copying the job description into white font on their resume. SkillAlign uses a multi-factor mathematical scoring model: required vs. preferred skill weighting (60%), verified professional tenure (20%), educational level (10%), and preferred work mode alignment (10%). If a candidate possesses zero required skills, their match is immediately scored as 0% to prevent screening noise.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-2">
            <AccordionTrigger>
              Can recruiters customize skill weights and required vs. preferred criteria?
            </AccordionTrigger>
            <AccordionContent>
              Yes. When creating a job requisition in the Recruiter workspace, you can select any canonical skill from our platform taxonomy, specify whether it is strictly required or preferred, and assign a relative importance weight from 1 to 5.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-3">
            <AccordionTrigger>
              How is candidate resume data protected and stored?
            </AccordionTrigger>
            <AccordionContent>
              All candidate resumes are uploaded directly to Amazon S3 via short-lived, encrypted presigned URLs. Access is strictly protected by JWT authentication: candidates can only retrieve their own resume, while HR and Recruiters are restricted to candidates matched to active requisitions.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-4">
            <AccordionTrigger>
              What roles are supported out of the box?
            </AccordionTrigger>
            <AccordionContent>
              SkillAlign supports four distinct, role-segregated identities: System Administrator (taxonomy and directory management), HR Manager (candidate evaluation, shortlisting, and interview scheduling), Recruiter (requisition creation and applicant screening), and Candidate (profile, skills, and interview hub).
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-5">
            <AccordionTrigger>
              Can candidates track their interview and application status in real-time?
            </AccordionTrigger>
            <AccordionContent>
              Yes. The Candidate Dashboard features a real-time "Interview Schedule" tab where candidates can view their pipeline status, interview format, meeting notes, and click "Join Video Call" to launch their meeting instantly.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      {/* ── High-Conversion CTA Banner ─────────────────────────────────────────── */}
      <section className="py-14 sm:py-20 px-4 sm:px-8 max-w-7xl mx-auto">
        <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-r from-indigo-950 via-purple-950 to-slate-950 border border-indigo-500/30 p-6 sm:p-10 lg:p-14 text-center overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto space-y-4 sm:space-y-6">
            <h2 className="font-outfit text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
              Ready to Modernize Your Recruitment Intelligence?
            </h2>
            <p className="text-xs sm:text-base text-slate-300 leading-relaxed px-2">
              Join thousands of hiring managers and high-caliber candidates who have upgraded to deterministic, weighted talent matching.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 pt-2 w-full max-w-xs sm:max-w-none mx-auto">
              <Link to="/register" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="gradient"
                  className="w-full sm:w-auto gap-2 text-xs sm:text-base px-6 sm:px-8 h-11 sm:h-12 rounded-xl shadow-xl shadow-indigo-500/30 font-bold"
                >
                  Create Candidate Account <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto text-xs sm:text-base px-6 sm:px-8 h-11 sm:h-12 rounded-xl text-white border-white/20 hover:bg-white/10"
                >
                  Sign In to Platform
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Enterprise Footer ─────────────────────────────────────────────────── */}
      <Footer />
    </HeroBackground>
  );
};
