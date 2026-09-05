import React, { useState } from "react";
import { Link } from "react-router-dom";
import { SkillAlignLogo } from "../common/SkillAlignLogo";
import { useToast } from "../ui/toast";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  ShieldCheck,
  CheckCircle2,
  Mail,
  MapPin,
  ExternalLink,
  Github,
  Linkedin,
  Twitter,
  ArrowRight,
  Send,
  Heart,
  Globe,
  Lock,
  Cpu,
} from "lucide-react";

export const Footer: React.FC = () => {
  const toast = useToast();
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterEmail.includes("@")) {
      toast.error("Please enter a valid business email address.");
      return;
    }
    setIsSubscribed(true);
    toast.success("Thank you for subscribing to SkillAlign Enterprise Insights!");
    setNewsletterEmail("");
  };

  return (
    <footer className="border-t border-border/80 bg-card/90 backdrop-blur-2xl text-foreground relative z-20">
      {/* Top Section: Newsletter & Enterprise Advisory */}
      <div className="border-b border-border/60 py-10 px-6 sm:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="max-w-xl text-center lg:text-left">
            <h3 className="font-outfit text-xl font-bold tracking-tight text-foreground flex items-center justify-center lg:justify-start gap-2">
              <Cpu className="h-5 w-5 text-primary" />
              Subscribe to SkillAlign Talent Intelligence
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Bi-weekly engineering breakdowns on deterministic skill graphs, multi-factor ATS algorithms, and modern talent acquisition.
            </p>
          </div>

          <form onSubmit={handleSubscribe} className="flex items-center gap-2 w-full max-w-md">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="work.email@company.com"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                className="pl-9 h-10 text-xs bg-background/60"
                required
              />
            </div>
            <Button
              type="submit"
              variant="gradient"
              className="h-10 text-xs font-semibold gap-1.5 shrink-0 shadow-md shadow-indigo-500/20"
            >
              {isSubscribed ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Subscribed
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" /> Subscribe
                </>
              )}
            </Button>
          </form>
        </div>
      </div>

      {/* Main Footer Grid */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Column 1: Brand & Headquarters */}
          <div className="lg:col-span-2 space-y-4">
            <SkillAlignLogo size="md" showBadge badgeText="Enterprise v2.4" />
            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
              SkillAlign is the definitive talent intelligence platform that mathematically aligns candidate competencies, verified experience, and work models with complex employer requisitions.
            </p>

            {/* Operational Status Badge */}
            <div className="flex items-center gap-2 pt-1">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-semibold text-emerald-400">
                All Systems Operational · 99.99% Core API Uptime
              </span>
            </div>

            {/* Headquarters & Support */}
            <div className="text-xs text-muted-foreground space-y-1.5 pt-2 border-t border-border/40">
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Tech Park Outer Ring Rd, Bengaluru, KA · Financial District, San Francisco, CA</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                <a href="mailto:support@skillalign.dev" className="hover:text-primary transition-colors">
                  support@skillalign.dev
                </a>
              </div>
            </div>

            {/* Enterprise Security Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-secondary/80 text-muted-foreground border border-border/60">
                <Lock className="h-3 w-3 text-indigo-400" /> SOC-2 Type II
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-secondary/80 text-muted-foreground border border-border/60">
                <ShieldCheck className="h-3 w-3 text-emerald-400" /> ISO 27001
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-secondary/80 text-muted-foreground border border-border/60">
                <Globe className="h-3 w-3 text-purple-400" /> GDPR Ready
              </span>
            </div>
          </div>

          {/* Column 2: Platform Capabilities */}
          <div className="space-y-3">
            <h4 className="font-outfit text-xs font-bold uppercase tracking-wider text-foreground">
              Platform
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <a href="#features" className="hover:text-primary transition-colors">
                  Weighted Skill Matching
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-primary transition-colors">
                  Visual ATS Pipeline
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-primary transition-colors">
                  Master Skills Taxonomy
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-primary transition-colors">
                  Presigned S3 Resume Parser
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-primary transition-colors">
                  Video Interview Integrations
                </a>
              </li>
              <li>
                <Link to="/register" className="hover:text-primary transition-colors">
                  Candidate Registration
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-primary transition-colors">
                  Enterprise Portal Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Solutions */}
          <div className="space-y-3">
            <h4 className="font-outfit text-xs font-bold uppercase tracking-wider text-foreground">
              Solutions
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <span className="hover:text-primary transition-colors cursor-pointer">
                  High-Growth Tech Startups
                </span>
              </li>
              <li>
                <span className="hover:text-primary transition-colors cursor-pointer">
                  Global Enterprises
                </span>
              </li>
              <li>
                <span className="hover:text-primary transition-colors cursor-pointer">
                  Technical Staffing Agencies
                </span>
              </li>
              <li>
                <span className="hover:text-primary transition-colors cursor-pointer">
                  Executive Search Teams
                </span>
              </li>
              <li>
                <span className="hover:text-primary transition-colors cursor-pointer">
                  Candidate Blind Screening
                </span>
              </li>
              <li>
                <span className="hover:text-primary transition-colors cursor-pointer">
                  Talent Mobility Programs
                </span>
              </li>
            </ul>
          </div>

          {/* Column 4: Company & Legal */}
          <div className="space-y-3">
            <h4 className="font-outfit text-xs font-bold uppercase tracking-wider text-foreground">
              Company & Legal
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <span className="hover:text-primary transition-colors cursor-pointer">
                  About SkillAlign
                </span>
              </li>
              <li>
                <span className="inline-flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer">
                  Careers <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-primary/20 text-primary">Hiring</span>
                </span>
              </li>
              <li>
                <span className="hover:text-primary transition-colors cursor-pointer">
                  Privacy Policy & DPA
                </span>
              </li>
              <li>
                <span className="hover:text-primary transition-colors cursor-pointer">
                  Terms of Enterprise Service
                </span>
              </li>
              <li>
                <span className="hover:text-primary transition-colors cursor-pointer">
                  Security Disclosures
                </span>
              </li>
              <li>
                <span className="hover:text-primary transition-colors cursor-pointer">
                  Cookie Preferences
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border/60 py-6 px-6 sm:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© 2026 SkillAlign Inc. All rights reserved. Enterprise Recruitment Intelligence.</p>

          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground/80">
              Built with FastAPI, PostgreSQL, React, and Vite
            </span>
            <div className="flex items-center gap-3">
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
                aria-label="GitHub"
              >
                <Github className="h-4 w-4" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-indigo-400 transition-colors p-1"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-4 w-4" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-blue-400 transition-colors p-1"
                aria-label="Twitter / X"
              >
                <Twitter className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
