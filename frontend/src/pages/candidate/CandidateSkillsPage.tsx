import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { candidatesApi, skillsApi, resumeApi } from "../../services/api";
import { Candidate, Skill, CandidateSkill, ParsedResumeData } from "../../types";
import { useToast } from "../../components/ui/toast";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card } from "../../components/ui/card";
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
  Sparkles,
  Loader2,
  CheckCircle2,
  Quote,
  Check,
  Filter,
  Wand2,
  Briefcase,
  FolderGit2,
  Building2,
  ArrowRight,
  FileText,
  RefreshCw,
  Code2,
} from "lucide-react";

export const CandidateSkillsPage: React.FC = () => {
  const toast = useToast();
  const [profile, setProfile] = useState<Candidate | null>(null);
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [parsedData, setParsedData] = useState<ParsedResumeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Sub-navigation state
  const [activeSubTab, setActiveSubTab] = useState<"shelf" | "experience" | "portfolio">("shelf");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [isReparsing, setIsReparsing] = useState(false);

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

      if (profileData.extracted_data) {
        try {
          setParsedData(JSON.parse(profileData.extracted_data));
        } catch {
          setParsedData(null);
        }
      }
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

  const skillCategories = useMemo(() => {
    if (!parsedData?.skills) return ["All"];
    const cats = new Set<string>();
    parsedData.skills.forEach((s) => {
      if (s.category) cats.add(s.category);
    });
    return ["All", ...Array.from(cats)];
  }, [parsedData?.skills]);

  const filteredResumeSkills = useMemo(() => {
    if (!parsedData?.skills) return [];
    if (activeCategory === "All") return parsedData.skills;
    return parsedData.skills.filter((s) => s.category === activeCategory);
  }, [parsedData?.skills, activeCategory]);

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

  const handleAddSingleExtractedSkill = async (skillName: string, category: string = "Technical") => {
    let matched = availableSkills.find(
      (s) => s.name.toLowerCase() === skillName.toLowerCase()
    );
    if (!matched) {
      try {
        matched = await skillsApi.create({ name: skillName, category: category || "Technical" });
        setAvailableSkills((prev) => [...prev, matched!]);
      } catch {
        toast.error(`Skill "${skillName}" is not in the system taxonomy yet.`);
        return;
      }
    }
    try {
      const updated = await candidatesApi.addSkill({
        skill_id: matched.id,
        proficiency_level: "Intermediate",
        years_experience: Math.max(0.5, Math.min(profile?.total_experience_years || 1, 3)),
      });
      setProfile(updated);
      toast.success(`Added ${matched.name} to your active skills.`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to add skill.");
    }
  };

  const handleSyncAllResumeSkills = async () => {
    if (!profile || !parsedData?.skills || parsedData.skills.length === 0) {
      toast.error("No extracted resume skills found to sync.");
      return;
    }
    setIsSyncingAll(true);
    try {
      const existingSkillIds = new Set(profile.skills.map((s) => s.skill.id));
      const existingSkillNames = new Set(profile.skills.map((s) => s.skill.name.toLowerCase()));
      let currentAvailable = [...availableSkills];
      let addedCount = 0;

      for (const sk of parsedData.skills) {
        if (existingSkillNames.has(sk.name.toLowerCase())) continue;
        let matched = currentAvailable.find(
          (s) => s.name.toLowerCase() === sk.name.toLowerCase()
        );
        if (!matched) {
          try {
            matched = await skillsApi.create({ name: sk.name, category: sk.category || "Technical" });
            currentAvailable.push(matched);
            setAvailableSkills([...currentAvailable]);
          } catch {
            continue;
          }
        }
        if (matched && !existingSkillIds.has(matched.id)) {
          try {
            await candidatesApi.addSkill({
              skill_id: matched.id,
              proficiency_level: "Intermediate",
              years_experience: Math.max(0.5, Math.min(profile?.total_experience_years || 1, 3)),
            });
            existingSkillIds.add(matched.id);
            existingSkillNames.add(matched.name.toLowerCase());
            addedCount++;
          } catch {}
        }
      }

      const refreshed = await candidatesApi.getMyProfile();
      setProfile(refreshed);

      if (addedCount > 0) {
        toast.success(`Successfully added ${addedCount} resume-extracted skills to your active portfolio!`);
      } else {
        toast.info("All extracted skills are already active in your portfolio.");
      }
    } catch (err: any) {
      toast.error("Failed to sync resume skills.");
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleReparseResume = async () => {
    if (!profile) return;
    setIsReparsing(true);
    try {
      const res = await resumeApi.reparse(profile.id);
      if (res.parsed_data) {
        setParsedData(res.parsed_data as any);
      }
      const refreshed = await candidatesApi.getMyProfile();
      setProfile(refreshed);
      toast.success("Resume re-parsed with enhanced extraction intelligence!");
    } catch (err: any) {
      toast.error("Failed to re-parse resume.");
    } finally {
      setIsReparsing(false);
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
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
      <Link
        to="/candidate"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Candidate Dashboard
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-outfit text-foreground tracking-tight">
            Candidate Skills & Experience Intelligence
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review skills extracted with verified context from your resume, or declare new proficiencies in your portfolio.
          </p>
        </div>

        {parsedData?.skills && parsedData.skills.length > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={handleSyncAllResumeSkills}
            disabled={isSyncingAll}
            className="gap-2 text-xs text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/10 shadow-sm"
          >
            {isSyncingAll ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Wand2 className="h-3.5 w-3.5 text-indigo-400" />
            )}
            Sync All Resume Skills
          </Button>
        )}
      </div>

      {/* ── Summary Metrics Banner ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border/80 bg-card/70 backdrop-blur-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Declared in Profile</span>
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Code2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold font-outfit text-foreground">
              {profile?.skills.length || 0}
            </span>
            <span className="text-xs text-muted-foreground">skills</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 backdrop-blur-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-indigo-300 font-medium">Extracted from Resume</span>
            <div className="h-7 w-7 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold font-outfit text-indigo-300">
              {parsedData?.skills?.length || 0}
            </span>
            <span className="text-xs text-indigo-400/80">detected</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/5 backdrop-blur-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-purple-300 font-medium">Verified Citations</span>
            <div className="h-7 w-7 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300">
              <Quote className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold font-outfit text-purple-300">
              {parsedData?.skills?.filter((s) => s.evidence)?.length || 0}
            </span>
            <span className="text-xs text-purple-400/80">evidence quotes</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 backdrop-blur-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-300 font-medium">Industry Tenure</span>
            <div className="h-7 w-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300">
              <Briefcase className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold font-outfit text-amber-300">
              {parsedData?.total_experience_years !== undefined
                ? `${parsedData.total_experience_years} Yrs`
                : `${profile?.total_experience_years || 0} Yrs`}
            </span>
            <span className="text-xs text-amber-400/80">verified</span>
          </div>
        </div>
      </div>

      {/* ── Sub-Navigation Tabs ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-border/70 pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSubTab("shelf")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === "shelf"
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Resume-Extracted Skills Shelf</span>
          {parsedData?.skills && parsedData.skills.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-primary-foreground/20 text-[10px] font-bold">
              {parsedData.skills.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("experience")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === "experience"
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
          }`}
        >
          <Briefcase className="h-3.5 w-3.5" />
          <span>Extracted Experience & Projects</span>
          {(parsedData?.experience?.length || 0) + (parsedData?.structured_projects?.length || 0) > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-primary-foreground/20 text-[10px] font-bold">
              {(parsedData?.experience?.length || 0) + (parsedData?.structured_projects?.length || 0)}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("portfolio")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === "portfolio"
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
          }`}
        >
          <Code2 className="h-3.5 w-3.5" />
          <span>Declared Profile Skills & Add</span>
          <span className="px-1.5 py-0.2 rounded-full bg-secondary text-[10px] font-bold">
            {profile?.skills.length || 0}
          </span>
        </button>
      </div>

      {/* ── TAB 1: RESUME SKILLS & EVIDENCE SHELF ──────────────────────────── */}
      {activeSubTab === "shelf" && (
        <div className="space-y-4">
          {parsedData?.skills && parsedData.skills.length > 0 ? (
            <Card className="p-6 border-indigo-500/30 bg-gradient-to-br from-card/90 via-card/70 to-indigo-950/20 backdrop-blur-xl space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-border/50">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
                    <h3 className="text-base font-bold font-outfit text-foreground flex items-center gap-2">
                      <span>Resume-Extracted Technical Skills & Verified Evidence</span>
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Skills identified from <span className="font-semibold text-foreground">{profile?.resume_filename || "candidate resume"}</span> cross-referenced against enterprise job taxonomy with contextual quote evidence.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleReparseResume}
                  disabled={isReparsing}
                  className="gap-1.5 text-xs text-amber-300 border-amber-500/40 hover:bg-amber-500/10 shrink-0"
                >
                  {isReparsing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  Re-parse Resume
                </Button>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 shrink-0">
                  <Filter className="h-3.5 w-3.5 text-indigo-400" /> Category:
                </span>
                {skillCategories.map((cat) => {
                  const count =
                    cat === "All"
                      ? parsedData.skills.length
                      : parsedData.skills.filter((s) => s.category === cat).length;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                        activeCategory === cat
                          ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/30"
                          : "bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                    >
                      <span>{cat}</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 font-bold">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Skills Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
                {filteredResumeSkills.map((sk, sIdx) => {
                  const inProfile = profile?.skills?.some(
                    (s) => s.skill.name.toLowerCase() === sk.name.toLowerCase()
                  );
                  const profileSkill = profile?.skills?.find(
                    (s) => s.skill.name.toLowerCase() === sk.name.toLowerCase()
                  );

                  return (
                    <div
                      key={sIdx}
                      className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                        inProfile
                          ? "bg-emerald-500/5 border-emerald-500/30 hover:border-emerald-500/50"
                          : "bg-secondary/30 border-border/70 hover:border-indigo-500/50 hover:bg-secondary/50"
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                              <span>{sk.name}</span>
                            </h4>
                            <Badge
                              variant="outline"
                              className="text-[10px] text-indigo-300 border-indigo-500/30 bg-indigo-500/10 mt-1"
                            >
                              {sk.category || "Technical"}
                            </Badge>
                          </div>

                          {inProfile ? (
                            <Badge
                              variant="success"
                              className="text-[10px] shrink-0 gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            >
                              <Check className="h-3 w-3" />
                              <span>{profileSkill?.proficiency_level || "Active"}</span>
                            </Badge>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleAddSingleExtractedSkill(sk.name, sk.category)}
                              className="h-7 text-xs gap-1 text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/20 shrink-0"
                            >
                              <PlusCircle className="h-3 w-3" /> Add
                            </Button>
                          )}
                        </div>

                        {/* Evidence Quote Block */}
                        {sk.evidence ? (
                          <div className="mt-2 p-2.5 rounded-lg bg-card/60 border-l-2 border-indigo-500 text-[11px] text-muted-foreground leading-relaxed flex items-start gap-1.5">
                            <Quote className="h-3 w-3 text-indigo-400 shrink-0 mt-0.5" />
                            <span className="italic line-clamp-3">"{sk.evidence}"</span>
                          </div>
                        ) : (
                          <div className="mt-2 text-[10px] text-muted-foreground/70 italic flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-400/70" />
                            <span>Verified in resume technical competency section</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ) : (
            <Card className="p-12 text-center border-dashed border-border/80 bg-card/40 space-y-4">
              <div className="h-12 w-12 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
                <FileText className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold font-outfit text-foreground">
                  No Resume Skills Extracted Yet
                </h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Upload your resume in the Candidate Dashboard to automatically extract your skills, technical evidence snippets, and work tenure.
                </p>
              </div>
              <Link to="/candidate">
                <Button variant="outline" size="sm" className="gap-2 text-xs text-primary border-primary/30">
                  Go to Candidate Dashboard <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </Card>
          )}
        </div>
      )}

      {/* ── TAB 2: EXTRACTED EXPERIENCE & PROJECTS ───────────────────────── */}
      {activeSubTab === "experience" && (
        <div className="space-y-6">
          {/* Work Experience */}
          <Card className="p-6 border-border/80 bg-card/70 backdrop-blur-xl space-y-4">
            <h3 className="text-base font-bold font-outfit text-foreground flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-blue-400" /> Extracted Work Experience & Roles
            </h3>

            {parsedData?.experience && parsedData.experience.length > 0 ? (
              <div className="space-y-3">
                {parsedData.experience.map((pos, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-secondary/30 border border-border/60 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                          <Briefcase className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-foreground">{pos.title}</h4>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Building2 className="h-3 w-3 text-indigo-400" /> {pos.company || "Company Organization"}
                          </span>
                        </div>
                      </div>
                      {pos.duration && (
                        <Badge variant="outline" className="text-xs text-blue-300 border-blue-500/40 bg-blue-500/10 shrink-0">
                          {pos.duration}
                        </Badge>
                      )}
                    </div>

                    {pos.highlights && pos.highlights.length > 0 && (
                      <ul className="space-y-1 text-xs text-muted-foreground pl-1 pt-1">
                        {pos.highlights.map((bullet, bIdx) => (
                          <li key={bIdx} className="flex items-start gap-2 text-foreground/90">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic py-4">
                Early career or student profile. Hands-on experience demonstrated through projects below.
              </p>
            )}
          </Card>

          {/* Technical Projects */}
          <Card className="p-6 border-border/80 bg-card/70 backdrop-blur-xl space-y-4">
            <h3 className="text-base font-bold font-outfit text-foreground flex items-center gap-2">
              <FolderGit2 className="h-4 w-4 text-purple-400" /> Extracted Technical Projects
            </h3>

            {parsedData?.structured_projects && parsedData.structured_projects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {parsedData.structured_projects.map((proj, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-secondary/30 border border-border/60 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                        <FolderGit2 className="h-4 w-4 text-purple-400 shrink-0" />
                        <span>{proj.title}</span>
                      </h4>
                      {proj.duration && (
                        <Badge variant="outline" className="text-[10px] text-purple-300 border-purple-500/30 shrink-0">
                          {proj.duration}
                        </Badge>
                      )}
                    </div>

                    {proj.technologies && proj.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {proj.technologies.map((t, tIdx) => (
                          <span
                            key={tIdx}
                            className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/15 border border-purple-500/30 text-purple-300"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    {proj.bullets && proj.bullets.length > 0 ? (
                      <ul className="space-y-1 text-xs text-muted-foreground pt-1">
                        {proj.bullets.map((b, bIdx) => (
                          <li key={bIdx} className="flex items-start gap-2 text-foreground/80">
                            <span className="h-1 w-1 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-muted-foreground">{proj.description}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic py-4">
                No technical projects explicitly identified in resume text.
              </p>
            )}
          </Card>
        </div>
      )}

      {/* ── TAB 3: DECLARED PROFILE SKILLS & MANUAL ADD ───────────────────── */}
      {activeSubTab === "portfolio" && (
        <div className="space-y-6">
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
        </div>
      )}

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
