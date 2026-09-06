import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { candidatesApi, skillsApi } from "../../services/api";
import { Candidate, Skill, CandidateSkill } from "../../types";
import { useToast } from "../../components/ui/toast";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { getProficiencyBadgeClass } from "../../lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog";
import {
  Layers,
  ArrowLeft,
  PlusCircle,
  Pencil,
  Trash2,
  Search,
  Sparkles,
  Loader2,
  CheckCircle2,
} from "lucide-react";

export const CandidateSkillsPage: React.FC = () => {
  const toast = useToast();
  const [profile, setProfile] = useState<Candidate | null>(null);
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add Skill Form state
  const [selectedSkillId, setSelectedSkillId] = useState<number | "">("");
  const [proficiency, setProficiency] = useState<string>("Intermediate");
  const [yearsExp, setYearsExp] = useState<number>(2);
  const [isAdding, setIsAdding] = useState(false);

  // Edit Skill Modal state
  const [editingSkill, setEditingSkill] = useState<CandidateSkill | null>(null);
  const [editProficiency, setEditProficiency] = useState<string>("Intermediate");
  const [editYears, setEditYears] = useState<number>(0);
  const [isEditing, setIsEditing] = useState(false);

  const fetchData = async () => {
    try {
      const [profileData, skillsData] = await Promise.all([
        candidatesApi.getMyProfile(),
        skillsApi.list(),
      ]);
      setProfile(profileData);
      setAvailableSkills(skillsData);
    } catch (err: any) {
      if (err.response?.status === 404) {
        toast.error("Please create your basic candidate profile first.");
      } else {
        toast.error("Failed to load skills portfolio.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSkillId) {
      toast.error("Please select a skill from the list.");
      return;
    }

    setIsAdding(true);
    try {
      const updated = await candidatesApi.addSkill({
        skill_id: Number(selectedSkillId),
        proficiency_level: proficiency,
        years_experience: Number(yearsExp),
      });
      setProfile(updated);
      setSelectedSkillId("");
      toast.success("Skill added to your profile portfolio.");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to add skill.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleOpenEdit = (cs: CandidateSkill) => {
    setEditingSkill(cs);
    setEditProficiency(cs.proficiency_level || "Beginner");
    setEditYears(cs.years_experience);
  };

  const handleUpdateSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSkill) return;

    setIsEditing(true);
    try {
      const updated = await candidatesApi.updateSkill(editingSkill.skill.id, {
        proficiency_level: editProficiency,
        years_experience: Number(editYears),
      });
      setProfile(updated);
      setEditingSkill(null);
      toast.success(`Updated proficiency for ${editingSkill.skill.name}.`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to update skill.");
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteSkill = async (skillId: number, skillName: string) => {
    if (!window.confirm(`Are you sure you want to remove '${skillName}'?`)) return;
    try {
      const updated = await candidatesApi.removeSkill(skillId);
      setProfile(updated);
      toast.success(`Removed '${skillName}' from your profile.`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to remove skill.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Filter skills not yet added
  const existingSkillIds = new Set(profile?.skills.map((s) => s.skill.id) || []);
  const unaddedSkills = availableSkills.filter((s) => !existingSkillIds.has(s.id));

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
      <Link
        to="/candidate"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Candidate Dashboard
      </Link>

      <div>
        <h1 className="text-3xl font-extrabold font-outfit text-foreground tracking-tight">
          Candidate Skills & Proficiency
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Add skills with proficiency levels (Beginner, Intermediate, Expert) and years of experience.
        </p>
      </div>

      {/* Add New Skill Form Card */}
      <Card className="border-border/80 bg-card/70 backdrop-blur-xl p-6">
        <form onSubmit={handleAddSkill} className="space-y-4">
          <h3 className="text-base font-bold font-outfit text-foreground flex items-center gap-2">
            <PlusCircle className="h-4 w-4 text-primary" /> Add Skill to Portfolio
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Select Skill *</label>
              <select
                value={selectedSkillId}
                onChange={(e) => setSelectedSkillId(e.target.value ? Number(e.target.value) : "")}
                required
                className="w-full h-10 px-3 rounded-lg border border-border bg-secondary/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Choose from taxonomy...</option>
                {unaddedSkills.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.category})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Proficiency Level *</label>
              <select
                value={proficiency}
                onChange={(e) => setProficiency(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-secondary/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="Expert">Expert (5+ yrs / Advanced)</option>
                <option value="Intermediate">Intermediate (3-5 yrs / Autonomous)</option>
                <option value="Beginner">Beginner (1-2 yrs / Foundational)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Years of Experience *
              </label>
              <Input
                type="number"
                min="0"
                step="0.5"
                required
                value={yearsExp}
                onChange={(e) => setYearsExp(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              variant="gradient"
              disabled={isAdding || !selectedSkillId}
              className="gap-2"
            >
              {isAdding ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Adding...
                </>
              ) : (
                <>
                  <PlusCircle className="h-4 w-4" /> Add Skill
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>

      {/* Current Declared Skills Portfolio */}
      <Card className="border-border/80 bg-card/70 backdrop-blur-xl p-6 space-y-4">
        <h3 className="text-base font-bold font-outfit text-foreground flex items-center gap-2">
          <Layers className="h-4 w-4 text-purple-400" /> My Declared Skills (
          {profile?.skills.length || 0})
        </h3>

        {profile?.skills.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No skills declared yet. Select a skill above to start building your portfolio.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {profile?.skills.map((cs) => (
              <div
                key={cs.id}
                className="p-4 rounded-xl border border-border/70 bg-card/60 flex items-center justify-between group hover:border-primary/40 transition-all"
              >
                <div>
                  <h4 className="text-sm font-bold text-foreground">{cs.skill.name}</h4>
                  <p className="text-xs text-muted-foreground">{cs.skill.category}</p>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    {cs.years_experience} Years Experience
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-lg border font-semibold ${getProficiencyBadgeClass(
                      cs.proficiency_level
                    )}`}
                  >
                    {cs.proficiency_level || "Extracted"}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => handleOpenEdit(cs)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-400"
                    onClick={() => handleDeleteSkill(cs.skill.id, cs.skill.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Edit Skill Dialog */}
      <Dialog open={!!editingSkill} onOpenChange={(open) => !open && setEditingSkill(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Skill: {editingSkill?.skill.name}</DialogTitle>
            <DialogDescription>
              Adjust your proficiency level and years of verified experience.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateSkill} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Proficiency Level</label>
              <select
                value={editProficiency}
                onChange={(e) => setEditProficiency(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-secondary/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="Expert">Expert (1.00 Factor)</option>
                <option value="Intermediate">Intermediate (0.70 Factor)</option>
                <option value="Beginner">Beginner (0.40 Factor)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Years of Experience</label>
              <Input
                type="number"
                min="0"
                step="0.5"
                required
                value={editYears}
                onChange={(e) => setEditYears(Number(e.target.value))}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingSkill(null)}
                disabled={isEditing}
              >
                Cancel
              </Button>
              <Button type="submit" variant="gradient" disabled={isEditing}>
                {isEditing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
