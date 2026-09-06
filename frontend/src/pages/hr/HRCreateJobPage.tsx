/**
 * HRCreateJobPage — HR-owned job requisition creation.
 *
 * This is the authoritative entry point for job creation (v2.0 architecture).
 * HR (not Recruiter) now owns the full job lifecycle: create, update, close.
 *
 * Architecture:
 *   - Backend: POST /api/jobs enforced by require_hr_or_admin dependency
 *   - Frontend: This page is only accessible via /hr/jobs/create route
 *   - After creation: auto-matching is queued by the backend if status = 'active'
 *   - Recruiters: Cannot create jobs — they view and screen candidates only
 */

import React, { useEffect, useState } from "react";
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
} from "lucide-react";

interface SelectedSkillRow {
  skill_id: number;
  skill_name: string;
  category: string;
  requirement_type: "required" | "preferred";
  weight: number;
}

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
  const [skillToAddId, setSkillToAddId] = useState<number | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadSkills = async () => {
      try {
        const data = await skillsApi.list();
        setAvailableSkills(data);
      } catch (err) {
        toast.error("Failed to load skills taxonomy.");
      } finally {
        setIsLoadingSkills(false);
      }
    };
    loadSkills();
  }, []);

  const handleAddSkill = () => {
    if (!skillToAddId) return;
    const skillObj = availableSkills.find((s) => s.id === Number(skillToAddId));
    if (!skillObj) return;

    if (selectedSkills.some((s) => s.skill_id === skillObj.id)) {
      toast.error("Skill is already added to criteria.");
      return;
    }

    setSelectedSkills((prev) => [
      ...prev,
      {
        skill_id: skillObj.id,
        skill_name: skillObj.name,
        category: skillObj.category,
        requirement_type: "required",
        weight: 5.0,
      },
    ]);
    setSkillToAddId("");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Job title is required.");
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

      const matchMsg = status === "active"
        ? " Candidate matching has been queued automatically."
        : " Save as draft — activate when ready to match candidates.";

      toast.success(
        `'${created.title}' created successfully!${matchMsg}`,
        "Job Requisition Created"
      );
      navigate("/hr");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to create job.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
      <Link
        to="/hr"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to HR Dashboard
      </Link>

      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/30">
            <Briefcase className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold font-outfit text-foreground tracking-tight">
              Create Job Requisition
            </h1>
            <p className="text-sm text-muted-foreground">
              HR defines the role requirements. Matching runs automatically when published.
            </p>
          </div>
        </div>

        {/* Architecture info banner */}
        <div className="mt-4 flex items-start gap-2 p-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs">
          <Zap className="h-4 w-4 mt-0.5 shrink-0 text-indigo-400" />
          <div>
            <span className="font-semibold">Auto-Matching Enabled:</span>{" "}
            Publishing this job as <strong>Active</strong> will automatically score all candidates
            with overlapping skills in the background. Recruiters will see ranked results within seconds.
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Job Details Card */}
        <Card className="border-border/80 bg-card/70 backdrop-blur-xl p-6 space-y-4">
          <h3 className="text-base font-bold font-outfit text-foreground flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" /> Role Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-foreground">Job Title *</label>
              <Input
                type="text"
                placeholder="e.g. Senior Backend Engineer (FastAPI/Python)"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Department / Team</label>
              <Input
                type="text"
                placeholder="e.g. Core Engineering"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Client / Company Name</label>
              <Input
                type="text"
                placeholder="e.g. Acme Corp Solutions"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Minimum Experience Required (Years)
              </label>
              <Input
                type="number"
                min="0"
                step="0.5"
                required
                value={minExpYears}
                onChange={(e) => setMinExpYears(Number(e.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Job Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-secondary/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="active">Active — Publish Now & Trigger Matching</option>
                <option value="draft">Draft — Save Without Matching</option>
              </select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-foreground">Job Description</label>
              <textarea
                rows={3}
                placeholder="Describe key responsibilities, deliverables, and role context..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-border bg-secondary/50 p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Working Conditions & Logistics */}
          <div className="pt-4 border-t border-border/60 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Laptop className="h-3.5 w-3.5 text-primary" /> Working Conditions & Location
            </h4>

            {/* Work Mode */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground block">Work Mode *</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "WFH", label: "Remote (WFH)", icon: Laptop },
                  { id: "WFO", label: "On-site (WFO)", icon: Building2 },
                  { id: "Hybrid", label: "Hybrid", icon: Briefcase },
                ].map((mode) => {
                  const Icon = mode.icon;
                  const isSelected = workMode === mode.id;
                  return (
                    <label
                      key={mode.id}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer text-center transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary shadow-sm"
                          : "border-border bg-card/40 text-muted-foreground hover:border-border/80"
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
                      <Icon className="h-4 w-4 mb-1" />
                      <span className="text-xs font-semibold">{mode.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Location Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-muted-foreground" /> City
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Bangalore"
                  value={locationCity}
                  onChange={(e) => setLocationCity(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">State</label>
                <Input
                  type="text"
                  placeholder="e.g. Karnataka"
                  value={locationState}
                  onChange={(e) => setLocationState(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Country</label>
                <Input
                  type="text"
                  placeholder="e.g. India"
                  value={locationCountry}
                  onChange={(e) => setLocationCountry(e.target.value)}
                />
              </div>
            </div>

            {/* Urgency, Shift Timing & Travel Requirements */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3 text-amber-400" /> Hiring Urgency
                </label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-secondary/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Immediate">Immediate (0-7 days)</option>
                  <option value="15 Days">15 Days</option>
                  <option value="30 Days">30 Days</option>
                  <option value="60 Days">60 Days</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3 text-indigo-400" /> Shift Timings
                </label>
                <select
                  value={shiftTiming}
                  onChange={(e) => setShiftTiming(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-secondary/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Day Shift">Day Shift (Regular)</option>
                  <option value="Night Shift">Night Shift</option>
                  <option value="Rotational">Rotational Shift</option>
                  <option value="Flexible">Flexible Hours</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Navigation className="h-3 w-3 text-emerald-400" /> Travel Requirements
                </label>
                <select
                  value={travelRequirements}
                  onChange={(e) => setTravelRequirements(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-secondary/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="None">None (0%)</option>
                  <option value="Occasional">Occasional (&lt; 20%)</option>
                  <option value="Frequent">Frequent (&gt; 50%)</option>
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* Weighted Skills Criteria Builder Card */}
        <Card className="border-border/80 bg-card/70 backdrop-blur-xl p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold font-outfit text-foreground flex items-center gap-2">
              <Sliders className="h-4 w-4 text-purple-400" /> Weighted Skills Criteria
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Assign weights (1-5) and requirement types. Required skills carry higher evaluation significance.
              The matching engine scores candidates against these weights automatically.
            </p>
          </div>

          {/* Add skill selector bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3 p-3.5 rounded-xl border border-dashed border-border bg-secondary/20">
            <select
              value={skillToAddId}
              onChange={(e) => setSkillToAddId(e.target.value ? Number(e.target.value) : "")}
              className="w-full sm:flex-1 h-10 px-3 rounded-lg border border-border bg-background/60 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select skill from master taxonomy...</option>
              {availableSkills.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.category})
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="secondary"
              onClick={handleAddSkill}
              disabled={!skillToAddId}
              className="w-full sm:w-auto gap-1.5 shrink-0"
            >
              <PlusCircle className="h-4 w-4" /> Add Skill Criteria
            </Button>
          </div>

          {/* Selected Skills List */}
          {selectedSkills.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No skills added yet. Select a skill above to define requirements.
            </div>
          ) : (
            <div className="space-y-3">
              {selectedSkills.map((s) => (
                <div
                  key={s.skill_id}
                  className="p-4 rounded-xl border border-border/70 bg-card/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">{s.skill_name}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {s.category}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Type:</span>
                      <select
                        value={s.requirement_type}
                        onChange={(e) =>
                          handleUpdateSkillRow(s.skill_id, "requirement_type", e.target.value)
                        }
                        className="h-9 px-2.5 rounded-lg border border-border bg-secondary/70 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="required">Required</option>
                        <option value="preferred">Preferred</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Weight:</span>
                      <select
                        value={s.weight}
                        onChange={(e) =>
                          handleUpdateSkillRow(s.skill_id, "weight", Number(e.target.value))
                        }
                        className="h-9 px-2.5 rounded-lg border border-border bg-secondary/70 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value={5}>5 (Critical)</option>
                        <option value={4}>4 (High)</option>
                        <option value={3}>3 (Medium)</option>
                        <option value={2}>2 (Low)</option>
                        <option value={1}>1 (Minor)</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(s.skill_id)}
                      className="p-1.5 text-muted-foreground hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Submit action */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link to="/hr">
            <Button type="button" variant="outline" disabled={isSubmitting}>
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            variant="gradient"
            size="lg"
            disabled={isSubmitting}
            className="px-8 shadow-lg shadow-indigo-500/25"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Publishing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                {status === "active" ? "Publish & Start Matching" : "Save as Draft"}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};
