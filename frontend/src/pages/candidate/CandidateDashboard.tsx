import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { candidatesApi, interviewsApi, notificationsApi, skillsApi, resumeApi } from "../../services/api";
import { Candidate, MatchResult, Interview, Notification, Skill } from "../../types";
import { useToast } from "../../components/ui/toast";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { StatCard } from "../../components/common/StatCard";
import { getProficiencyBadgeClass } from "../../lib/utils";
import {
  UserCheck,
  Layers,
  FileText,
  Clock,
  Phone,
  ArrowRight,
  PlusCircle,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Sparkles,
  Building,
  Video,
  Mail,
  Bell,
  Trash2,
  XCircle,
  ExternalLink,
} from "lucide-react";

export const CandidateDashboard: React.FC = () => {
  const toast = useToast();
  const { refreshUser } = useAuth();
  const [profile, setProfile] = useState<Candidate | null>(null);
  const [pipelineMatches, setPipelineMatches] = useState<MatchResult[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pipeline" | "profile" | "skills" | "notifications">("pipeline");

  // Profile Form state
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [totalExperience, setTotalExperience] = useState<number>(0);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Resume upload state
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isUploadingResume, setIsUploadingResume] = useState(false);

  // Add Skill state
  const [selectedSkillId, setSelectedSkillId] = useState<number | "">("");
  const [proficiencyLevel, setProficiencyLevel] = useState<"Beginner" | "Intermediate" | "Expert">("Intermediate");
  const [skillYears, setSkillYears] = useState<number>(1);
  const [isAddingSkill, setIsAddingSkill] = useState(false);

  const fetchData = async () => {
    try {
      const [profileData, pipelineData, interviewsData, notificationsData, skillsData] = await Promise.all([
        candidatesApi.getMyProfile().catch(() => null),
        candidatesApi.getMyPipeline().catch(() => []),
        interviewsApi.getMyInterviews().catch(() => []),
        notificationsApi.getMyNotifications().catch(() => []),
        skillsApi.list().catch(() => []),
      ]);

      if (profileData) {
        setProfile(profileData);
        setFullName(profileData.full_name);
        setPhone(profileData.phone || "");
        setTotalExperience(profileData.total_experience_years);
      }
      setPipelineMatches(pipelineData);
      setInterviews(interviewsData);
      setNotifications(notificationsData);
      setAvailableSkills(skillsData);
    } catch (err: any) {
      toast.error("Failed to load candidate career data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      let updated: Candidate;
      if (profile) {
        updated = await candidatesApi.updateProfile({
          full_name: fullName,
          phone,
          total_experience_years: Number(totalExperience),
        });
      } else {
        updated = await candidatesApi.createProfile({
          full_name: fullName,
          phone,
          total_experience_years: Number(totalExperience),
        });
      }
      setProfile(updated);
      await refreshUser();
      toast.success("Profile saved successfully.");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to save profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const [isDeletingResume, setIsDeletingResume] = useState(false);
  const [isViewingResume, setIsViewingResume] = useState(false);

  const handleResumeUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      toast.error("Please fill in and save your Profile details first.");
      return;
    }
    if (!resumeFile) {
      toast.error("Please select a resume file (PDF, DOC, DOCX).");
      return;
    }
    setIsUploadingResume(true);
    try {
      const res = await resumeApi.upload(profile.id, resumeFile);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              resume_file_path: res.resume_s3_key,
              resume_s3_key: res.resume_s3_key,
              resume_filename: res.resume_filename,
              resume_uploaded_at: res.resume_uploaded_at,
            }
          : null
      );
      setResumeFile(null);
      toast.success("Resume uploaded successfully to AWS S3! Recruiters & HR can now review it.");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to upload resume to S3.");
    } finally {
      setIsUploadingResume(false);
    }
  };

  const handleViewResume = async () => {
    if (!profile) return;
    setIsViewingResume(true);
    try {
      const data = await resumeApi.getUrl(profile.id);
      if (data.resume_url) {
        window.open(data.resume_url, "_blank");
      } else {
        toast.error("Resume URL not found.");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to generate secure resume URL.");
    } finally {
      setIsViewingResume(false);
    }
  };

  const handleDeleteResume = async () => {
    if (!profile) return;
    if (!window.confirm("Are you sure you want to delete your uploaded resume from AWS S3?")) {
      return;
    }
    setIsDeletingResume(true);
    try {
      await resumeApi.delete(profile.id);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              resume_file_path: undefined,
              resume_s3_key: null,
              resume_filename: null,
              resume_uploaded_at: null,
            }
          : null
      );
      toast.success("Resume removed from AWS S3.");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to delete resume.");
    } finally {
      setIsDeletingResume(false);
    }
  };

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSkillId) {
      toast.error("Please choose a skill to add.");
      return;
    }
    setIsAddingSkill(true);
    try {
      const updated = await candidatesApi.addSkill({
        skill_id: Number(selectedSkillId),
        proficiency_level: proficiencyLevel,
        years_experience: Number(skillYears),
      });
      setProfile(updated);
      setSelectedSkillId("");
      toast.success("Skill added to your profile.");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to add skill.");
    } finally {
      setIsAddingSkill(false);
    }
  };

  const handleRemoveSkill = async (skillId: number) => {
    try {
      const updated = await candidatesApi.removeSkill(skillId);
      setProfile(updated);
      toast.success("Skill removed.");
    } catch (err: any) {
      toast.error("Failed to remove skill.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasProfile = !!profile;
  const hasResume = !!profile?.resume_file_path;
  const skillsCount = profile?.skills.length || 0;

  // Pipeline stage helper
  const getPipelineStageIndex = (status: string) => {
    switch (status) {
      case "matched":
      case "screening":
        return 1;
      case "screened":
        return 2;
      case "approved_by_hr":
        return 3;
      case "interview_scheduled":
      case "technical_interview":
      case "hr_interview":
      case "offer":
      case "hired":
        return 4;
      default:
        return 0;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-outfit text-foreground tracking-tight">
            Candidate Career Portal
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your application stages across open job requisitions, manage your skills, and view interview invites.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={activeTab === "pipeline" ? "gradient" : "outline"}
            onClick={() => setActiveTab("pipeline")}
            className="gap-2 text-xs"
          >
            <Sparkles className="h-4 w-4" /> Track Status ({pipelineMatches.length})
          </Button>
          <Button
            variant={activeTab === "profile" ? "gradient" : "outline"}
            onClick={() => setActiveTab("profile")}
            className="gap-2 text-xs"
          >
            <UserCheck className="h-4 w-4" /> Profile & Resume
          </Button>
          <Button
            variant={activeTab === "skills" ? "gradient" : "outline"}
            onClick={() => setActiveTab("skills")}
            className="gap-2 text-xs"
          >
            <Layers className="h-4 w-4" /> Skills ({skillsCount})
          </Button>
          <Button
            variant={activeTab === "notifications" ? "gradient" : "outline"}
            onClick={() => setActiveTab("notifications")}
            className="gap-2 text-xs"
          >
            <Bell className="h-4 w-4" /> Alerts ({notifications.length})
          </Button>
        </div>
      </div>

      {/* Top Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          title="Active Requisitions"
          value={pipelineMatches.length}
          icon={Sparkles}
          color="indigo"
          description="Jobs matched with your skill profile"
        />
        <StatCard
          title="Verified Skills"
          value={skillsCount}
          icon={Layers}
          color="emerald"
          description="Used by the AI matching engine"
        />
        <StatCard
          title="Interview Invites"
          value={interviews.length}
          icon={Calendar}
          color="blue"
          description="Scheduled by HR team"
        />
      </div>

      {/* ── TAB 1: TRACK APPLICATION STATUS (PIPELINE) ────────────────────── */}
      {activeTab === "pipeline" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold font-outfit text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-400" />
              Application & Hiring Pipeline Progression
            </h2>
          </div>

          {pipelineMatches.length === 0 ? (
            <Card className="p-12 text-center border-border/80 bg-card/60 space-y-3">
              <Sparkles className="h-10 w-10 text-indigo-400 mx-auto opacity-40" />
              <h3 className="text-base font-bold text-foreground">No active job matches yet</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Make sure your profile is complete and you have declared skills with proficiency levels so recruiters can match you with open jobs.
              </p>
              <Button variant="gradient" onClick={() => setActiveTab("skills")} className="gap-2">
                <PlusCircle className="h-4 w-4" /> Add More Skills
              </Button>
            </Card>
          ) : (
            <div className="space-y-6">
              {pipelineMatches.map((match) => {
                const isRejected = match.status === "rejected";
                const stageIndex = getPipelineStageIndex(match.status);
                const score = Number(match.overall_score);

                // Check if this match has scheduled interview
                const matchInterview = interviews.find((i) => i.match_result_id === match.id);

                return (
                  <Card
                    key={match.id}
                    className="p-6 border-border/80 bg-card/70 backdrop-blur-xl space-y-6 shadow-sm"
                  >
                    {/* Job Title & Score Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-foreground font-outfit">
                            {match.job?.title || `Requisition #${match.job_id}`}
                          </h3>
                          <Badge
                            variant={
                              match.status === "approved_by_hr"
                                ? "success"
                                : match.status === "interview_scheduled"
                                ? "purple"
                                : match.status === "screened"
                                ? "info"
                                : isRejected
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {match.status.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                          {match.job?.department && (
                            <span className="flex items-center gap-1">
                              <Building className="h-3 w-3" /> {match.job.department}
                            </span>
                          )}
                          {match.job?.client_name && <span>• {match.job.client_name}</span>}
                          <span>• Min Exp: {match.job?.min_experience_years || 0} yrs</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="px-3 py-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-center">
                          <span className="text-lg font-extrabold text-indigo-300 font-outfit">
                            {score.toFixed(0)}%
                          </span>
                          <span className="block text-[9px] font-semibold uppercase tracking-wider text-indigo-400">
                            Fit Score
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* ── 4-Step Visual Progress Stepper ─────────────────── */}
                    <div className="pt-2 pb-1">
                      <div className="grid grid-cols-4 gap-2 text-center">
                        {/* Step 1: Matched */}
                        <div className="space-y-1.5">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              stageIndex >= 1
                                ? isRejected
                                  ? "bg-rose-500"
                                  : "bg-indigo-500 shadow-sm shadow-indigo-500/50"
                                : "bg-secondary"
                            }`}
                          />
                          <span
                            className={`text-[11px] font-bold block ${
                              stageIndex >= 1 ? "text-foreground" : "text-muted-foreground opacity-60"
                            }`}
                          >
                            1. Matched
                          </span>
                          <span className="text-[10px] text-muted-foreground block">
                            Algorithmic Fit
                          </span>
                        </div>

                        {/* Step 2: Screened by Recruiter */}
                        <div className="space-y-1.5">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              stageIndex >= 2
                                ? isRejected
                                  ? "bg-rose-500"
                                  : "bg-blue-500 shadow-sm shadow-blue-500/50"
                                : "bg-secondary"
                            }`}
                          />
                          <span
                            className={`text-[11px] font-bold block ${
                              stageIndex >= 2 ? "text-foreground" : "text-muted-foreground opacity-60"
                            }`}
                          >
                            2. Screened
                          </span>
                          <span className="text-[10px] text-muted-foreground block">
                            Recruiter Review
                          </span>
                        </div>

                        {/* Step 3: Approved by HR */}
                        <div className="space-y-1.5">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              stageIndex >= 3
                                ? isRejected
                                  ? "bg-rose-500"
                                  : "bg-emerald-500 shadow-sm shadow-emerald-500/50"
                                : "bg-secondary"
                            }`}
                          />
                          <span
                            className={`text-[11px] font-bold block ${
                              stageIndex >= 3 ? "text-foreground" : "text-muted-foreground opacity-60"
                            }`}
                          >
                            3. HR Approved
                          </span>
                          <span className="text-[10px] text-muted-foreground block">
                            Strategic Pass
                          </span>
                        </div>

                        {/* Step 4: Interview Scheduled */}
                        <div className="space-y-1.5">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              stageIndex >= 4
                                ? isRejected
                                  ? "bg-rose-500"
                                  : "bg-purple-500 shadow-sm shadow-purple-500/50"
                                : "bg-secondary"
                            }`}
                          />
                          <span
                            className={`text-[11px] font-bold block ${
                              stageIndex >= 4 ? "text-foreground" : "text-muted-foreground opacity-60"
                            }`}
                          >
                            4. Interview
                          </span>
                          <span className="text-[10px] text-muted-foreground block">
                            Hiring Rounds
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Scheduled Interview Highlight Card if present */}
                    {matchInterview && (
                      <div className="p-4 rounded-xl border border-purple-500/40 bg-purple-500/10 space-y-2 animate-in fade-in">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                            <Calendar className="h-4 w-4 text-purple-400" /> Upcoming Interview Round
                          </h4>
                          <Badge variant="purple">Confirmed</Badge>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                          <div className="flex items-center gap-2 text-foreground font-semibold">
                            <Clock className="h-3.5 w-3.5 text-purple-400" />
                            {new Date(matchInterview.interview_date).toLocaleString()}
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Video className="h-3.5 w-3.5 text-purple-400" />
                            Format: <strong>{matchInterview.interview_type}</strong>
                          </div>
                        </div>
                        {matchInterview.feedback && (
                          <div className="pt-2 text-xs text-muted-foreground bg-purple-950/30 p-2.5 rounded-lg border border-purple-500/20">
                            <strong>Instructions / Meeting Details:</strong> {matchInterview.feedback}
                          </div>
                        )}
                      </div>
                    )}

                    {isRejected && (
                      <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                        <XCircle className="h-4 w-4" />
                        <span>This application has been closed at this time. Keep your skills updated for future openings!</span>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: PROFILE & RESUME ───────────────────────────────────────── */}
      {activeTab === "profile" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Profile Form */}
          <Card className="p-6 border-border/80 bg-card/70 backdrop-blur-xl space-y-4">
            <h3 className="text-lg font-bold font-outfit text-foreground flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" /> Personal Profile
            </h3>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Full Name</label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Alice Johnson"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Phone Number</label>
                <Input
                  type="tel"
                  placeholder="e.g. +91 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Total Professional Experience (Years)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  required
                  value={totalExperience}
                  onChange={(e) => setTotalExperience(Number(e.target.value))}
                />
              </div>

              <div className="pt-2">
                <Button type="submit" variant="gradient" disabled={isSavingProfile} className="w-full">
                  {isSavingProfile ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...
                    </>
                  ) : (
                    "Save Candidate Profile"
                  )}
                </Button>
              </div>
            </form>
          </Card>

          {/* Resume Upload Card */}
          <Card className="p-6 border-border/80 bg-card/70 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold font-outfit text-foreground flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-400" /> Resume Document (AWS S3)
              </h3>
              {hasResume && (
                <Badge variant="success" className="text-[10px]">
                  S3 Encrypted
                </Badge>
              )}
            </div>

            {hasResume ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span className="truncate max-w-[200px]">
                      {profile.resume_filename || "Resume Document"}
                    </span>
                  </div>
                  {profile.resume_uploaded_at && (
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(profile.resume_uploaded_at).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  Your resume is securely stored in AWS S3 with temporary pre-signed access URLs.
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleViewResume}
                    disabled={isViewingResume}
                    className="gap-1.5 text-xs text-primary border-primary/40 hover:bg-primary/10"
                  >
                    {isViewingResume ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ExternalLink className="h-3.5 w-3.5" />
                    )}
                    View / Download Resume
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleDeleteResume}
                    disabled={isDeletingResume}
                    className="gap-1 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 ml-auto"
                  >
                    {isDeletingResume ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Delete
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                No resume uploaded yet. Upload your PDF / DOCX resume to let recruiters evaluate your background.
              </div>
            )}

            <form onSubmit={handleResumeUpload} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {hasResume ? "Replace Existing Resume (PDF / DOCX)" : "Upload Resume (PDF / DOCX)"}
                </label>
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                />
              </div>

              <Button
                type="submit"
                variant="gradient"
                disabled={isUploadingResume || !resumeFile}
                className="w-full gap-2"
              >
                {isUploadingResume ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Uploading to AWS S3...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" /> Upload Selected File
                  </>
                )}
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* ── TAB 3: SKILLS MANAGEMENT ──────────────────────────────────────── */}
      {activeTab === "skills" && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Add Skill Form */}
          <div className="md:col-span-5">
            <Card className="p-6 border-border/80 bg-card/70 backdrop-blur-xl space-y-4">
              <h3 className="text-base font-bold font-outfit text-foreground flex items-center gap-2">
                <PlusCircle className="h-4 w-4 text-primary" /> Add Skill to Profile
              </h3>

              <form onSubmit={handleAddSkill} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Select Skill</label>
                  <select
                    value={selectedSkillId}
                    onChange={(e) => setSelectedSkillId(e.target.value ? Number(e.target.value) : "")}
                    required
                    className="w-full h-10 px-3 rounded-lg border border-border bg-secondary/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">-- Choose a skill --</option>
                    {availableSkills.map((sk) => (
                      <option key={sk.id} value={sk.id}>
                        {sk.name} ({sk.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Proficiency Level</label>
                  <select
                    value={proficiencyLevel}
                    onChange={(e) => setProficiencyLevel(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-secondary/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Beginner">Beginner (0.40)</option>
                    <option value="Intermediate">Intermediate (0.70)</option>
                    <option value="Expert">Expert (1.00)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Years of Experience</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    required
                    value={skillYears}
                    onChange={(e) => setSkillYears(Number(e.target.value))}
                  />
                </div>

                <Button type="submit" variant="gradient" disabled={isAddingSkill} className="w-full">
                  {isAddingSkill ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Add Skill"}
                </Button>
              </form>
            </Card>
          </div>

          {/* Declared Skills List */}
          <div className="md:col-span-7 space-y-4">
            <h3 className="text-base font-bold font-outfit text-foreground flex items-center gap-2">
              <Layers className="h-4 w-4 text-purple-400" /> Declared Skills Portfolio ({skillsCount})
            </h3>

            {skillsCount === 0 ? (
              <Card className="p-8 text-center border-border/80 bg-card/60">
                <p className="text-xs text-muted-foreground">No skills added yet. Use the form on the left to add skills.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {profile?.skills.map((cs) => (
                  <Card
                    key={cs.id}
                    className="p-3.5 border-border/80 bg-card/70 backdrop-blur-xl flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-foreground">{cs.skill.name}</h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{cs.years_experience} yrs exp</span>
                        <span>•</span>
                        <span className="text-primary font-medium">{cs.proficiency_level}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveSkill(cs.id)}
                      className="text-muted-foreground hover:text-rose-400 transition-colors p-1.5"
                      title="Remove skill"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 4: NOTIFICATIONS ──────────────────────────────────────────── */}
      {activeTab === "notifications" && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold font-outfit text-foreground flex items-center gap-2">
            <Bell className="h-5 w-5 text-indigo-400" />
            Interview Invites & Strategic Notifications ({notifications.length})
          </h2>

          {notifications.length === 0 ? (
            <Card className="p-12 text-center border-border/80 bg-card/60 space-y-2">
              <Mail className="h-10 w-10 text-muted-foreground mx-auto opacity-40" />
              <h3 className="text-base font-bold text-foreground">No alerts received yet</h3>
              <p className="text-xs text-muted-foreground">
                When HR schedules an interview or updates your status, you will receive notification updates here.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {notifications.map((notif) => (
                <Card
                  key={notif.id}
                  className="p-5 border-border/80 bg-card/70 backdrop-blur-xl space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-bold text-foreground">{notif.subject}</h3>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(notif.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-pre-line pl-6">
                    {notif.body}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
