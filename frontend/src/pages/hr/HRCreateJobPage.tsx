/**
 * HRCreateJobPage — Hiring Manager (HM) owned job requisition creation.
 *
 * This is the authoritative entry point for job creation (v2.0 architecture).
 * HM (not Recruiter) owns the full job lifecycle: create, update, close.
 *
 * Architecture:
 *   - Backend: POST /api/jobs enforced by require_hr_or_admin dependency
 *   - Frontend: This page is only accessible via /hr/jobs/create route
 *   - After creation: auto-matching is queued by the backend if status = 'active'
 *   - Recruiters: Cannot create jobs — they view, screen, and schedule candidates.
 */

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { jobsApi, skillsApi } from "../../services/api";
import { Skill, JobSkillIn } from "../../types";
import { useToast } from "../../components/ui/toast";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import {
  Briefcase,
  ArrowLeft,
  PlusCircle,
  Trash2,
  Sparkles,
  Loader2,
  Sliders,
  CheckCircle2,
  MapPin,
  Laptop,
  Building2,
  Clock,
  Navigation,
  Zap,
  BookmarkCheck,
  Check,
  Star,
  Users,
  Search,
  Flame,
  RotateCcw,
  Eye,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

interface SelectedSkillRow {
  skill_id: number;
  skill_name: string;
  category: string;
  requirement_type: "required" | "preferred";
  weight: number;
}

interface RoleTemplate {
  name: string;
  badge: string;
  title: string;
  department: string;
  clientName: string;
  minExpYears: number;
  workMode: "WFH" | "WFO" | "Hybrid";
  locationCity: string;
  urgency: string;
  shiftTiming: string;
  description: string;
  skillKeywords: { name: string; type: "required" | "preferred"; weight: number }[];
}

const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    name: "Full Stack Engineer",
    badge: "Core Engineering",
    title: "Senior Full-Stack Engineer (React / Python)",
    department: "Product Engineering",
    clientName: "Enterprise Cloud Platforms",
    minExpYears: 3,
    workMode: "Hybrid",
    locationCity: "Bangalore",
    urgency: "15 Days",
    shiftTiming: "Day Shift",
    description:
      "Drive end-to-end architecture and implementation of scalable web applications. Build resilient FastAPI microservices and responsive, accessible React interfaces with comprehensive test coverage.",
    skillKeywords: [
      { name: "Python", type: "required", weight: 5 },
      { name: "React", type: "required", weight: 5 },
      { name: "Docker", type: "preferred", weight: 4 },
      { name: "PostgreSQL", type: "preferred", weight: 3 },
    ],
  },
  {
    name: "Cloud & DevOps Architect",
    badge: "Infrastructure",
    title: "DevOps & Cloud Infrastructure Engineer",
    department: "Cloud Operations",
    clientName: "Global Platform Engineering",
    minExpYears: 4,
    workMode: "WFH",
    locationCity: "Remote",
    urgency: "Immediate",
    shiftTiming: "Flexible",
    description:
      "Automate multi-region cloud infrastructure on AWS using Terraform. Manage Kubernetes container orchestration, architect secure CI/CD pipelines, and maintain 99.99% system reliability.",
    skillKeywords: [
      { name: "AWS", type: "required", weight: 5 },
      { name: "Docker", type: "required", weight: 5 },
      { name: "Terraform", type: "preferred", weight: 4 },
      { name: "Linux", type: "required", weight: 4 },
    ],
  },
  {
    name: "AI / Machine Learning",
    badge: "Data & AI",
    title: "Applied Machine Learning & GenAI Engineer",
    department: "AI Innovation Labs",
    clientName: "Applied Intelligence Division",
    minExpYears: 3,
    workMode: "Hybrid",
    locationCity: "Hyderabad",
    urgency: "30 Days",
    shiftTiming: "Day Shift",
    description:
      "Develop and deploy machine learning models, vector retrieval pipelines, and fine-tune LLM systems for enterprise applications. Collaborate with data engineering to productionize ML inference at scale.",
    skillKeywords: [
      { name: "Python", type: "required", weight: 5 },
      { name: "PyTorch", type: "required", weight: 5 },
      { name: "Machine Learning", type: "required", weight: 4 },
      { name: "FastAPI", type: "preferred", weight: 3 },
    ],
  },
  {
    name: "Frontend Specialist",
    badge: "UI / UX Tech",
    title: "Lead Frontend Engineer (React / TypeScript)",
    department: "Web Experience",
    clientName: "Design Systems & Consumer Apps",
    minExpYears: 4,
    workMode: "WFH",
    locationCity: "Pune",
    urgency: "15 Days",
    shiftTiming: "Day Shift",
    description:
      "Design and maintain high-performance, responsive React components and design systems. Optimize web core vitals, implement accessible patterns, and partner with product designers.",
    skillKeywords: [
      { name: "React", type: "required", weight: 5 },
      { name: "TypeScript", type: "required", weight: 5 },
      { name: "Tailwind CSS", type: "preferred", weight: 3 },
      { name: "JavaScript", type: "required", weight: 4 },
    ],
  },
];

export const HRCreateJobPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [isLoadingSkills, setIsLoadingSkills] = useState(true);

  // Form Fields
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [clientName, setClientName] = useState("");
  const [minExpYears, setMinExpYears] = useState<number>(2);
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"draft" | "active">("active");

  // Extended Logistics & Working Conditions
  const [workMode, setWorkMode] = useState<"WFH" | "WFO" | "Hybrid">("Hybrid");
  const [locationCity, setLocationCity] = useState("");
  const [locationState, setLocationState] = useState("");
  const [locationCountry, setLocationCountry] = useState("India");
  const [urgency, setUrgency] = useState("30 Days");
  const [shiftTiming, setShiftTiming] = useState("Day Shift");
  const [travelRequirements, setTravelRequirements] = useState("None");

  // Selected Skills array
  const [selectedSkills, setSelectedSkills] = useState<SelectedSkillRow[]>([]);
  
  // Skill Add Drawer / Bar state
  const [skillToAddId, setSkillToAddId] = useState<number | "">("");
  const [skillRequirementType, setSkillRequirementType] = useState<"required" | "preferred">("required");
  const [skillWeight, setSkillWeight] = useState<number>(5);
  const [skillSearchQuery, setSkillSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadSkills = async () => {
      try {
        const data = await skillsApi.list();
        setAvailableSkills(data);
      } catch (err) {
        toast.error("Failed to load master skills taxonomy.");
      } finally {
        setIsLoadingSkills(false);
      }
    };
    loadSkills();
  }, []);

  // Compute unique skill categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    availableSkills.forEach((s) => {
      if (s.category) set.add(s.category);
    });
    return ["All", ...Array.from(set).sort()];
  }, [availableSkills]);

  // Filter skills based on search query and category
  const filteredAvailableSkills = useMemo(() => {
    return availableSkills.filter((s) => {
      const matchesCat = selectedCategory === "All" || s.category === selectedCategory;
      const matchesSearch =
        !skillSearchQuery.trim() ||
        s.name.toLowerCase().includes(skillSearchQuery.toLowerCase()) ||
        s.category.toLowerCase().includes(skillSearchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [availableSkills, selectedCategory, skillSearchQuery]);

  // Handle template selection
  const handleApplyTemplate = (tmpl: RoleTemplate) => {
    setTitle(tmpl.title);
    setDepartment(tmpl.department);
    setClientName(tmpl.clientName);
    setMinExpYears(tmpl.minExpYears);
    setWorkMode(tmpl.workMode);
    setLocationCity(tmpl.locationCity);
    setUrgency(tmpl.urgency);
    setShiftTiming(tmpl.shiftTiming);
    setDescription(tmpl.description);

    // Map template skills to available skills
    if (availableSkills.length > 0) {
      const newSkills: SelectedSkillRow[] = [];
      tmpl.skillKeywords.forEach((kw) => {
        const match = availableSkills.find(
          (s) => s.name.toLowerCase() === kw.name.toLowerCase()
        );
        if (match && !newSkills.some((ns) => ns.skill_id === match.id)) {
          newSkills.push({
            skill_id: match.id,
            skill_name: match.name,
            category: match.category,
            requirement_type: kw.type,
            weight: kw.weight,
          });
        }
      });
      if (newSkills.length > 0) {
        setSelectedSkills(newSkills);
      }
    }
    toast.success(`Template applied: ${tmpl.name}`, "Requisition Template Loaded");
  };

  const handleResetForm = () => {
    setTitle("");
    setDepartment("");
    setClientName("");
    setMinExpYears(2);
    setDescription("");
    setWorkMode("Hybrid");
    setLocationCity("");
    setLocationState("");
    setLocationCountry("India");
    setUrgency("30 Days");
    setShiftTiming("Day Shift");
    setTravelRequirements("None");
    setSelectedSkills([]);
    setStatus("active");
    toast.info("Form fields have been cleared.");
  };

  const handleAddSkill = () => {
    if (!skillToAddId) {
      toast.error("Please select a skill to add.");
      return;
    }
    const skillObj = availableSkills.find((s) => s.id === Number(skillToAddId));
    if (!skillObj) return;

    if (selectedSkills.some((s) => s.skill_id === skillObj.id)) {
      toast.error("Skill is already present in criteria list.");
      return;
    }

    setSelectedSkills((prev) => [
      ...prev,
      {
        skill_id: skillObj.id,
        skill_name: skillObj.name,
        category: skillObj.category,
        requirement_type: skillRequirementType,
        weight: skillWeight,
      },
    ]);
    setSkillToAddId("");
    setSkillSearchQuery("");
  };

  const handleRemoveSkill = (skillId: number) => {
    setSelectedSkills((prev) => prev.filter((s) => s.skill_id !== skillId));
  };

  const handleUpdateSkillRow = (
    skillId: number,
    field: "requirement_type" | "weight",
    value: any
  ) => {
    setSelectedSkills((prev) =>
      prev.map((s) => (s.skill_id === skillId ? { ...s, [field]: value } : s))
    );
  };

  // Readiness Calculation
  const readiness = useMemo(() => {
    let score = 0;
    if (title.trim()) score += 30;
    if (department.trim() || clientName.trim()) score += 15;
    if (description.trim().length > 20) score += 15;
    if (selectedSkills.length >= 1) score += 20;
    if (selectedSkills.length >= 3) score += 20;
    return Math.min(score, 100);
  }, [title, department, clientName, description, selectedSkills]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Requisition title is required.");
      return;
    }
    if (selectedSkills.length === 0) {
      toast.error("Please add at least one skill requirement for matching.");
      return;
    }

    setIsSubmitting(true);
    try {
      const skillsPayload: JobSkillIn[] = selectedSkills.map((s) => ({
        skill_id: s.skill_id,
        requirement_type: s.requirement_type,
        weight: Number(s.weight),
      }));

      const created = await jobsApi.create({
        title,
        department,
        client_name: clientName,
        min_experience_years: Number(minExpYears),
        description,
        status,
        work_mode: workMode,
        location_city: locationCity.trim() || undefined,
        location_state: locationState.trim() || undefined,
        location_country: locationCountry.trim() || undefined,
        urgency,
        shift_timing: shiftTiming,
        travel_requirements: travelRequirements,
        skills: skillsPayload,
      });

      const matchMsg =
        status === "active"
          ? " AI matching engine has started analyzing candidate resumes in background."
          : " Saved as draft. Publish when ready to score candidate pool.";

      toast.success(
        `'${created.title}' created successfully!${matchMsg}`,
        "Job Requisition Published"
      );
      navigate("/hr");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to create job requisition.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-24 animate-in fade-in duration-300">
      {/* Breadcrumb Trail */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Link
            to="/hr"
            className="hover:text-foreground inline-flex items-center gap-1 transition-colors font-medium"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> HM Dashboard
          </Link>
          <ChevronRight className="h-3 w-3 text-border" />
          <span>Job Requisitions</span>
          <ChevronRight className="h-3 w-3 text-border" />
          <span className="text-foreground font-semibold">Create Requisition</span>
        </div>

        <button
          type="button"
          onClick={handleResetForm}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-rose-400 transition-colors"
          title="Reset all form fields"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Clear Form
        </button>
      </div>

      {/* Hero Header */}
      <div className="relative rounded-3xl border border-border/80 bg-gradient-to-r from-card/90 via-card/70 to-indigo-950/20 backdrop-blur-2xl p-6 sm:p-8 shadow-xl overflow-hidden">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" /> Hiring Manager (HM) Portal
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Zap className="h-3.5 w-3.5 text-emerald-400" /> Auto-Matching Engine v2.0
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold font-outfit text-foreground tracking-tight flex items-center gap-3">
              Create Job Requisition
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
              HR defines the role requirements. Matching runs automatically when published.
            </p>
          </div>

          {/* Dynamic Requisition Health & Readiness Indicator */}
          <div className="w-full md:w-72 p-4 rounded-2xl bg-secondary/50 border border-border/70 backdrop-blur-md space-y-2 shrink-0">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-indigo-400" /> Readiness Score
              </span>
              <span
                className={`font-mono font-bold ${
                  readiness >= 75
                    ? "text-emerald-400"
                    : readiness >= 50
                    ? "text-amber-400"
                    : "text-rose-400"
                }`}
              >
                {readiness}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-background/80 overflow-hidden border border-border/40">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  readiness >= 75
                    ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm shadow-emerald-500/50"
                    : readiness >= 50
                    ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                    : "bg-gradient-to-r from-rose-500 to-orange-400"
                }`}
                style={{ width: `${readiness}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              {readiness >= 75 ? (
                <>
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  Optimal: Ready for instant automated match
                </>
              ) : (
                <>
                  <Clock className="h-3 w-3 text-amber-400" />
                  Define role title & at least 1 required skill
                </>
              )}
            </p>
          </div>
        </div>

        {/* Quick Role Templates Strip */}
        <div className="relative z-10 mt-6 pt-5 border-t border-border/50">
          <div className="flex items-center gap-2 mb-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <Zap className="h-3.5 w-3.5 text-amber-400" /> Quick-Start Role Presets:
          </div>
          <div className="flex flex-wrap gap-2">
            {ROLE_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.name}
                type="button"
                onClick={() => handleApplyTemplate(tmpl)}
                className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium bg-secondary/60 hover:bg-primary/15 border border-border hover:border-primary/50 text-foreground transition-all duration-200"
              >
                <span className="font-semibold">{tmpl.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-background/80 text-muted-foreground group-hover:text-primary transition-colors">
                  {tmpl.badge}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Role Architecture & Logistics (7 Columns) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Card 1: Core Role Details */}
            <Card className="border-border/80 bg-card/75 backdrop-blur-xl p-6 sm:p-7 rounded-2xl shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <h3 className="text-lg font-bold font-outfit text-foreground flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <Briefcase className="h-4 w-4" />
                  </div>
                  Core Role Architecture
                </h3>
                <Badge variant="outline" className="text-xs font-mono">
                  Step 1 of 3
                </Badge>
              </div>

              <div className="space-y-4">
                {/* Job Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span>Requisition Title *</span>
                    <span className="text-[11px] font-normal text-muted-foreground">
                      {title.length}/100 chars
                    </span>
                  </label>
                  <Input
                    type="text"
                    maxLength={100}
                    placeholder="e.g. Senior Backend Engineer (FastAPI / Cloud Native)"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-11 text-sm bg-secondary/40 border-border/80 focus:ring-primary/40"
                  />
                </div>

                {/* Department & Client */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Building2 className="h-3 w-3 text-primary" /> Department / Business Unit
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. Infrastructure & Platforms"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="h-10 text-sm bg-secondary/40 border-border/80"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Users className="h-3 w-3 text-primary" /> Client / Hiring Team
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. Internal Products or Client Name"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="h-10 text-sm bg-secondary/40 border-border/80"
                    />
                  </div>
                </div>

                {/* Min Experience with Quick Pills & Stepper */}
                <div className="space-y-2 pt-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-primary" /> Minimum Experience Required
                    </span>
                    <span className="font-mono font-bold text-xs text-primary">
                      {minExpYears} {minExpYears === 1 ? "Year" : "Years"} Minimum
                    </span>
                  </label>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center rounded-xl border border-border bg-secondary/40 p-1">
                      <button
                        type="button"
                        onClick={() => setMinExpYears((prev) => Math.max(0, prev - 1))}
                        className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-background text-foreground transition-colors font-bold text-base"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        step="0.5"
                        value={minExpYears}
                        onChange={(e) => setMinExpYears(Math.max(0, Number(e.target.value)))}
                        className="w-16 text-center font-mono font-bold text-sm bg-transparent border-0 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setMinExpYears((prev) => prev + 1)}
                        className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-background text-foreground transition-colors font-bold text-base"
                      >
                        +
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: "Junior (0-1y)", val: 1 },
                        { label: "Mid (2-4y)", val: 3 },
                        { label: "Senior (5-7y)", val: 5 },
                        { label: "Lead (8y+)", val: 8 },
                      ].map((tier) => (
                        <button
                          key={tier.label}
                          type="button"
                          onClick={() => setMinExpYears(tier.val)}
                          className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                            minExpYears === tier.val
                              ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                              : "bg-secondary/30 text-muted-foreground border-border hover:border-border/90"
                          }`}
                        >
                          {tier.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Job Description */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Job Description & Responsibilities
                    </label>
                    <span className="text-[11px] text-muted-foreground">
                      Optional context for recruiters
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    placeholder="Provide a comprehensive summary of key responsibilities, deliverables, team structure, and qualifications..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-xl border border-border/80 bg-secondary/40 p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 leading-relaxed transition-all resize-y"
                  />
                </div>
              </div>
            </Card>

            {/* Card 2: Working Conditions & Deployment Logistics */}
            <Card className="border-border/80 bg-card/75 backdrop-blur-xl p-6 sm:p-7 rounded-2xl shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <h3 className="text-lg font-bold font-outfit text-foreground flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                    <Laptop className="h-4 w-4" />
                  </div>
                  Deployment Logistics & Location
                </h3>
                <Badge variant="outline" className="text-xs font-mono">
                  Step 2 of 3
                </Badge>
              </div>

              {/* Work Mode Visual Cards */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  Work Arrangement Mode *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: "WFH",
                      label: "Remote (WFH)",
                      sub: "100% Anywhere",
                      icon: Laptop,
                      color: "text-emerald-400",
                      glow: "peer-checked:border-emerald-500/50 peer-checked:bg-emerald-500/10",
                    },
                    {
                      id: "Hybrid",
                      label: "Hybrid Blend",
                      sub: "Office + Remote",
                      icon: Briefcase,
                      color: "text-indigo-400",
                      glow: "peer-checked:border-indigo-500/50 peer-checked:bg-indigo-500/10",
                    },
                    {
                      id: "WFO",
                      label: "On-site (WFO)",
                      sub: "Corporate Office",
                      icon: Building2,
                      color: "text-amber-400",
                      glow: "peer-checked:border-amber-500/50 peer-checked:bg-amber-500/10",
                    },
                  ].map((mode) => {
                    const Icon = mode.icon;
                    const isSelected = workMode === mode.id;
                    return (
                      <label
                        key={mode.id}
                        className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer text-center transition-all duration-200 select-none ${
                          isSelected
                            ? "border-primary bg-primary/10 shadow-md shadow-primary/10"
                            : "border-border/70 bg-secondary/30 hover:border-border hover:bg-secondary/50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="work_mode"
                          value={mode.id}
                          checked={isSelected}
                          onChange={() => setWorkMode(mode.id as any)}
                          className="sr-only"
                        />
                        <div
                          className={`p-2 rounded-xl mb-1.5 ${
                            isSelected ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-bold text-foreground">{mode.label}</span>
                        <span className="text-[11px] text-muted-foreground mt-0.5">{mode.sub}</span>
                        {isSelected && (
                          <div className="absolute top-2 right-2">
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          </div>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Geographic Coordinates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-primary" /> City
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Bangalore"
                    value={locationCity}
                    onChange={(e) => setLocationCity(e.target.value)}
                    className="h-10 text-sm bg-secondary/40 border-border/80"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    State / Region
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Karnataka"
                    value={locationState}
                    onChange={(e) => setLocationState(e.target.value)}
                    className="h-10 text-sm bg-secondary/40 border-border/80"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Country
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. India"
                    value={locationCountry}
                    onChange={(e) => setLocationCountry(e.target.value)}
                    className="h-10 text-sm bg-secondary/40 border-border/80"
                  />
                </div>
              </div>

              {/* Urgency, Shift & Travel */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Flame className="h-3.5 w-3.5 text-rose-400" /> Hiring Urgency
                  </label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-border/80 bg-secondary/40 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                  >
                    <option value="Immediate">Immediate (0 - 7 days)</option>
                    <option value="15 Days">15 Days Standard</option>
                    <option value="30 Days">30 Days Standard</option>
                    <option value="60 Days">60 Days Pipeline</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-indigo-400" /> Shift Schedule
                  </label>
                  <select
                    value={shiftTiming}
                    onChange={(e) => setShiftTiming(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-border/80 bg-secondary/40 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                  >
                    <option value="Day Shift">Day Shift (Regular)</option>
                    <option value="Night Shift">Night Shift (US/EU)</option>
                    <option value="Rotational">Rotational Shift</option>
                    <option value="Flexible">Flexible Hours</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Navigation className="h-3.5 w-3.5 text-emerald-400" /> Travel Expectation
                  </label>
                  <select
                    value={travelRequirements}
                    onChange={(e) => setTravelRequirements(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-border/80 bg-secondary/40 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                  >
                    <option value="None">None (0% Travel)</option>
                    <option value="Occasional">Occasional (&lt; 20%)</option>
                    <option value="Frequent">Frequent (&gt; 50%)</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* Card 3: Publication Strategy & Auto-Matching Mode */}
            <Card className="border-border/80 bg-card/75 backdrop-blur-xl p-6 sm:p-7 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <h3 className="text-lg font-bold font-outfit text-foreground flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                    <Zap className="h-4 w-4" />
                  </div>
                  Publication Mode & Matching Trigger
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                    status === "active"
                      ? "border-emerald-500/80 bg-emerald-500/10 shadow-lg shadow-emerald-500/10"
                      : "border-border/70 bg-secondary/30 hover:border-border hover:bg-secondary/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="requisition_status"
                    value="active"
                    checked={status === "active"}
                    onChange={() => setStatus("active")}
                    className="sr-only"
                  />
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Zap className="h-4 w-4 text-emerald-400" /> Active Requisition
                      </span>
                      {status === "active" && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Publish immediately. Automatically initiates background scoring across candidate resumes.
                    </p>
                  </div>
                  <span className="inline-block mt-3 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                    Recommended for immediate hiring
                  </span>
                </label>

                <label
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                    status === "draft"
                      ? "border-amber-500/80 bg-amber-500/10 shadow-lg shadow-amber-500/10"
                      : "border-border/70 bg-secondary/30 hover:border-border hover:bg-secondary/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="requisition_status"
                    value="draft"
                    checked={status === "draft"}
                    onChange={() => setStatus("draft")}
                    className="sr-only"
                  />
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-bold text-foreground flex items-center gap-2">
                        <BookmarkCheck className="h-4 w-4 text-amber-400" /> Save as Draft
                      </span>
                      {status === "draft" && (
                        <CheckCircle2 className="h-4 w-4 text-amber-400" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Store requisition specifications privately. No candidate matching will run until published.
                    </p>
                  </div>
                  <span className="inline-block mt-3 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                    Safe draft staging
                  </span>
                </label>
              </div>
            </Card>
          </div>

          {/* RIGHT COLUMN: Skills Criteria Builder & Live Preview (5 Columns) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Card 4: Weighted Skills Criteria Matrix */}
            <Card className="border-border/80 bg-card/75 backdrop-blur-xl p-6 sm:p-7 rounded-2xl shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div>
                  <h3 className="text-lg font-bold font-outfit text-foreground flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400">
                      <Sliders className="h-4 w-4" />
                    </div>
                    Weighted Skills Criteria
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Defined criteria determines candidate matching scores.
                  </p>
                </div>
                <Badge variant="secondary" className="font-mono text-xs font-bold">
                  {selectedSkills.length} Added
                </Badge>
              </div>

              {/* Skills Category Filter Chips */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Taxonomy Category Filter:
                </span>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg transition-colors font-medium ${
                        selectedCategory === cat
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Skill Selection Controls */}
              <div className="p-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground flex items-center justify-between">
                    <span>Select Skill to Add</span>
                    {isLoadingSkills && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" /> Loading taxonomy...
                      </span>
                    )}
                  </label>

                  <select
                    value={skillToAddId}
                    onChange={(e) => setSkillToAddId(e.target.value ? Number(e.target.value) : "")}
                    disabled={isLoadingSkills}
                    className="w-full h-11 px-3 rounded-xl border border-border/80 bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                  >
                    <option value="">Choose a skill from master catalog...</option>
                    {filteredAvailableSkills.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.category})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Requirement Type Toggle & Weight Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Requirement Level
                    </label>
                    <div className="grid grid-cols-2 gap-1 rounded-xl bg-background p-1 border border-border/70">
                      <button
                        type="button"
                        onClick={() => setSkillRequirementType("required")}
                        className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                          skillRequirementType === "required"
                            ? "bg-violet-600 text-white shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Required
                      </button>
                      <button
                        type="button"
                        onClick={() => setSkillRequirementType("preferred")}
                        className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                          skillRequirementType === "preferred"
                            ? "bg-sky-600 text-white shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Preferred
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                      <span>Weight Significance</span>
                      <span className="font-mono text-primary font-bold">{skillWeight}.0x</span>
                    </label>
                    <div className="grid grid-cols-5 gap-1 rounded-xl bg-background p-1 border border-border/70">
                      {[1, 2, 3, 4, 5].map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => setSkillWeight(w)}
                          className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                            skillWeight === w
                              ? "bg-primary text-primary-foreground shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="gradient"
                  onClick={handleAddSkill}
                  disabled={!skillToAddId}
                  className="w-full gap-2 shadow-md shadow-indigo-500/20 text-xs font-bold h-10"
                >
                  <PlusCircle className="h-4 w-4" /> Add to Evaluation Matrix
                </Button>
              </div>

              {/* Selected Skills List */}
              <div className="space-y-2 pt-1">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider block">
                  Active Criteria ({selectedSkills.length}):
                </span>

                {selectedSkills.length === 0 ? (
                  <div className="text-center py-8 px-4 rounded-2xl border border-dashed border-border bg-secondary/20 space-y-2">
                    <SlidersHorizontal className="h-8 w-8 text-muted-foreground/50 mx-auto" />
                    <p className="text-xs font-semibold text-foreground">No Skills Specified Yet</p>
                    <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                      Add at least one required or preferred skill above, or click a Quick-Start Preset.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                    {selectedSkills.map((s) => (
                      <div
                        key={s.skill_id}
                        className="p-3 rounded-xl border border-border/70 bg-card/80 hover:bg-card flex items-center justify-between gap-3 transition-colors shadow-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-foreground truncate">
                              {s.skill_name}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground shrink-0 font-medium">
                              {s.category}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mt-1">
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateSkillRow(
                                  s.skill_id,
                                  "requirement_type",
                                  s.requirement_type === "required" ? "preferred" : "required"
                                )
                              }
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                                s.requirement_type === "required"
                                  ? "bg-violet-500/20 text-violet-300 border-violet-500/40"
                                  : "bg-sky-500/20 text-sky-300 border-sky-500/40"
                              }`}
                            >
                              {s.requirement_type === "required" ? "★ Required" : "○ Preferred"}
                            </button>

                            <span className="text-[11px] text-muted-foreground font-mono font-semibold">
                              Weight: {s.weight}x
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <select
                            value={s.weight}
                            onChange={(e) =>
                              handleUpdateSkillRow(s.skill_id, "weight", Number(e.target.value))
                            }
                            className="h-8 px-2 rounded-lg border border-border bg-secondary/60 text-xs font-bold text-foreground focus:outline-none"
                          >
                            <option value={5}>5x Critical</option>
                            <option value={4}>4x High</option>
                            <option value={3}>3x Medium</option>
                            <option value={2}>2x Low</option>
                            <option value={1}>1x Minor</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(s.skill_id)}
                            className="p-2 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                            title="Remove skill"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {/* Card 5: WYSIWYG Live Requisition Preview */}
            <Card className="border-border/80 bg-gradient-to-br from-card/90 via-card/60 to-purple-950/10 backdrop-blur-xl p-6 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <h4 className="text-sm font-bold font-outfit text-foreground flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary" /> Live Requisition Card Preview
                </h4>
                <span className="text-[10px] text-muted-foreground font-mono">HM & Recruiter View</span>
              </div>

              <div className="p-4 rounded-2xl border border-border/90 bg-card/90 shadow-md space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-extrabold font-outfit text-foreground">
                      {title.trim() || "Untitled Requisition Role"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {department.trim() || "General Engineering"} • {clientName.trim() || "Direct Corporate"}
                    </p>
                  </div>
                  <Badge variant={status === "active" ? "success" : "secondary"}>
                    {status === "active" ? "Active Job" : "Draft Requisition"}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="px-2 py-0.5 rounded-md bg-secondary/80 border border-border flex items-center gap-1 font-medium">
                    <Clock className="h-3 w-3 text-primary" /> {minExpYears} Yrs Min Exp
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-secondary/80 border border-border flex items-center gap-1 font-medium">
                    <Laptop className="h-3 w-3 text-emerald-400" /> {workMode}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-secondary/80 border border-border flex items-center gap-1 font-medium">
                    <MapPin className="h-3 w-3 text-amber-400" /> {locationCity || "Location Flexible"}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-secondary/80 border border-border flex items-center gap-1 font-medium">
                    <Flame className="h-3 w-3 text-rose-400" /> {urgency}
                  </span>
                </div>

                {/* Target Skills in Preview */}
                <div className="pt-2 border-t border-border/60">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Target Skills & Weights ({selectedSkills.length}):
                  </span>
                  {selectedSkills.length === 0 ? (
                    <span className="text-xs text-muted-foreground italic">
                      No skills criteria added to preview.
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedSkills.map((s) => (
                        <span
                          key={s.skill_id}
                          className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${
                            s.requirement_type === "required"
                              ? "bg-violet-500/15 text-violet-300 border-violet-500/30"
                              : "bg-sky-500/15 text-sky-300 border-sky-500/30"
                          }`}
                        >
                          {s.skill_name} <span className="opacity-75">({s.weight}x)</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Floating / Sticky Bottom Action Bar */}
        <div className="sticky bottom-4 z-30 p-4 rounded-2xl bg-card/95 border border-border/80 backdrop-blur-2xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              Requisition Mode:{" "}
              <strong className="text-foreground">
                {status === "active" ? "Active (Auto-Matching Triggered)" : "Private Draft"}
              </strong>
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">
              {selectedSkills.length} Skills Configured
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link to="/hr" className="w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                className="w-full sm:w-auto text-xs"
              >
                Cancel
              </Button>
            </Link>

            <Button
              type="submit"
              variant="gradient"
              size="lg"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-8 shadow-xl shadow-indigo-500/30 text-xs font-bold gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Publishing Requisition...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {status === "active" ? "Publish & Trigger Auto-Match" : "Save Requisition Draft"}
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
