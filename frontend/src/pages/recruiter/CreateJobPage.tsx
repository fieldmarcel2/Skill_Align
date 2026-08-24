import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { jobsApi, skillsApi } from "../../services/api";
import { Skill, JobSkillIn } from "../../types";
import { useToast } from "../../components/ui/toast";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
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
} from "lucide-react";

interface SelectedSkillRow {
  skill_id: number;
  skill_name: string;
  category: string;
  requirement_type: "required" | "preferred";
  weight: number;
}

export const CreateJobPage: React.FC = () => {
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
        skills: skillsPayload,
      });

      toast.success(`Job requisition '${created.title}' created successfully!`, "Job Created");
      navigate("/recruiter");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to create job.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
      <Link
        to="/recruiter"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Recruiter Dashboard
      </Link>

      <div>
        <h1 className="text-3xl font-extrabold font-outfit text-foreground tracking-tight">
          Create Job Requisition
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Specify role expectations and configure weighted skill criteria for algorithmic matching.
        </p>
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
                <option value="active">Active (Available for HR Matching)</option>
                <option value="draft">Draft</option>
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
        </Card>

        {/* Weighted Skills Criteria Builder Card */}
        <Card className="border-border/80 bg-card/70 backdrop-blur-xl p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold font-outfit text-foreground flex items-center gap-2">
              <Sliders className="h-4 w-4 text-purple-400" /> Weighted Skills Criteria
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Assign weights (1-5) and requirement types. Required skills carry higher evaluation significance.
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
              {selectedSkills.map((s, idx) => (
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

                  <div className="flex items-center gap-4">
                    {/* Requirement Type */}
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

                    {/* Weight (1 to 5) */}
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
          <Link to="/recruiter">
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
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating Requisition...
              </>
            ) : (
              "Publish Job Requisition"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};
