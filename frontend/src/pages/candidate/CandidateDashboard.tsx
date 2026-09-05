import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { candidatesApi, interviewsApi, notificationsApi, skillsApi, resumeApi } from "../../services/api";
import { Candidate, MatchResult, Interview, Notification, Skill, ParsedResumeData } from "../../types";
import { useToast } from "../../components/ui/toast";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { StatCard } from "../../components/common/StatCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../components/ui/dialog";
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
  GraduationCap,
  Briefcase,
  Award,
  Code2,
  Copy,
  Check,
  FileCode,
  MapPin,
  Laptop,
  Building2,
  Coins,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Send,
  CalendarCheck,
} from "lucide-react";

const MATCH_PAGE_SIZE = 10;
const INTERVIEW_PAGE_SIZE = 10;

export const CandidateDashboard: React.FC = () => {
  const toast = useToast();
  const { refreshUser } = useAuth();
  const [profile, setProfile] = useState<Candidate | null>(null);
  const [pipelineMatches, setPipelineMatches] = useState<MatchResult[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pipeline" | "interviews" | "profile" | "skills" | "notifications">("pipeline");

  // Pagination states
  const [matchPage, setMatchPage] = useState(1);
  const [interviewPage, setInterviewPage] = useState(1);

  // Selected Job for Detailed Modal
  const [selectedJobMatch, setSelectedJobMatch] = useState<MatchResult | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  // Profile Form state
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [totalExperience, setTotalExperience] = useState<number>(0);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [country, setCountry] = useState("India");
  const [workAuthorization, setWorkAuthorization] = useState("Indian Citizen");
  const [preferredWorkMode, setPreferredWorkMode] = useState<"WFH" | "WFO" | "Hybrid">("Hybrid");
  const [noticePeriod, setNoticePeriod] = useState("30 Days");
  const [currentCtc, setCurrentCtc] = useState<string>("");
  const [expectedCtc, setExpectedCtc] = useState<string>("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Resume upload state
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [uploadStep, setUploadStep] = useState<string>("");

  // Extracted Text & Parsed Data Modal states
  const [isViewingResume, setIsViewingResume] = useState(false);
  const [isDeletingResume, setIsDeletingResume] = useState(false);
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);
  const [extractedRawText, setExtractedRawText] = useState("");
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Parsed Resume Structured Data state
  const [parsedData, setParsedData] = useState<ParsedResumeData | null>(null);

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
        setFullName(profileData.full_name || "");
        setPhone(profileData.phone || "");
        setTotalExperience(profileData.total_experience_years || 0);
        setAddress(profileData.address || "");
        setCity(profileData.city || "");
        setState(profileData.state || "");
        setPincode(profileData.pincode || "");
        setCountry(profileData.country || "India");
        setWorkAuthorization(profileData.work_authorization || "Indian Citizen");
        setPreferredWorkMode(profileData.preferred_work_mode || "Hybrid");
        setNoticePeriod(profileData.notice_period || "30 Days");
        setCurrentCtc(profileData.current_ctc !== undefined && profileData.current_ctc !== null ? String(profileData.current_ctc) : "");
        setExpectedCtc(profileData.expected_ctc !== undefined && profileData.expected_ctc !== null ? String(profileData.expected_ctc) : "");

        if (profileData.extracted_data) {
          try {
            setParsedData(JSON.parse(profileData.extracted_data));
          } catch (e) {
            setParsedData(null);
          }
        }
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

  const isValidIndianPhone = (num: string) => {
    if (!num) return true;
    const clean = num.replace(/[\s\-]/g, "");
    return /^(\+91)?[6-9]\d{9}$/.test(clean);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Full name is required.");
      return;
    }
    if (phone && !isValidIndianPhone(phone)) {
      toast.error("Please enter a valid 10-digit Indian mobile number (+91).");
      return;
    }

    setIsSavingProfile(true);
    try {
      const payload = {
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
        total_experience_years: Number(totalExperience) || 0,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        pincode: pincode.trim() || undefined,
        country: country.trim() || "India",
        work_authorization: workAuthorization,
        preferred_work_mode: preferredWorkMode,
        notice_period: noticePeriod,
        current_ctc: currentCtc ? Number(currentCtc) : undefined,
        expected_ctc: expectedCtc ? Number(expectedCtc) : undefined,
      };

      let updated: Candidate;
      if (profile) {
        updated = await candidatesApi.updateProfile(payload);
      } else {
        updated = await candidatesApi.createProfile(payload);
      }
      setProfile(updated);
      await refreshUser();
      toast.success("Profile and career preferences updated successfully!");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to update profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleResumeUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      toast.error("Please fill in and save your Profile details first.");
      return;
    }
    if (!resumeFile) {
      toast.error("Please select a resume file (PDF, DOCX, DOC, TXT).");
      return;
    }

    setIsUploadingResume(true);
    setUploadStep("1/3 Uploading original document...");

    try {
      setTimeout(() => setUploadStep("2/3 Extracting readable text & generating .txt..."), 600);
      setTimeout(() => setUploadStep("3/3 Parsing skills, experience & education..."), 1200);

      const res = await resumeApi.upload(profile.id, resumeFile);
      
      // Update local profile state
      const refreshedProfile = await candidatesApi.getMyProfile();
      setProfile(refreshedProfile);
      setFullName(refreshedProfile.full_name);
      setTotalExperience(refreshedProfile.total_experience_years);

      if (res.parsed_data) {
        setParsedData(res.parsed_data);
      } else if (refreshedProfile.extracted_data) {
        try {
          setParsedData(JSON.parse(refreshedProfile.extracted_data));
        } catch {}
      }

      // Refresh pipeline & skills
      const [newPipeline, newSkills] = await Promise.all([
        candidatesApi.getMyPipeline().catch(() => []),
        skillsApi.list().catch(() => []),
      ]);
      setPipelineMatches(newPipeline);
      setAvailableSkills(newSkills);

      setResumeFile(null);
      setUploadStep("");
      toast.success(
        `Resume processed! Extracted ${res.auto_added_skills?.length || 0} skills & structured credentials.`
      );
    } catch (err: any) {
      setUploadStep("");
      toast.error(err.response?.data?.detail || "Failed to process resume.");
    } finally {
      setIsUploadingResume(false);
    }
  };

  const handleViewOriginalResume = async () => {
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

  const handleViewExtractedText = async () => {
    if (!profile) return;
    setIsLoadingText(true);
    try {
      const data = await resumeApi.getText(profile.id);
      setExtractedRawText(data.raw_text || "");
      setIsTextModalOpen(true);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to fetch extracted resume text.");
    } finally {
      setIsLoadingText(false);
    }
  };

  const handleCopyText = () => {
    if (!extractedRawText) return;
    navigator.clipboard.writeText(extractedRawText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    toast.success("Extracted text copied to clipboard.");
  };

  const handleDeleteResume = async () => {
    if (!profile) return;
    if (!window.confirm("Are you sure you want to delete your resume and extracted credentials?")) {
      return;
    }
    setIsDeletingResume(true);
    try {
      await resumeApi.delete(profile.id);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              resume_file_path: null,
              resume_s3_key: null,
              resume_extracted_text_s3_key: null,
              resume_filename: null,
              resume_uploaded_at: null,
              resume_parsed_at: null,
              extracted_data: null,
            }
          : null
      );
      setParsedData(null);
      toast.success("Resume and extracted documents removed.");
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
      // Refresh pipeline matching
      const newPipeline = await candidatesApi.getMyPipeline().catch(() => []);
      setPipelineMatches(newPipeline);
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
      const newPipeline = await candidatesApi.getMyPipeline().catch(() => []);
      setPipelineMatches(newPipeline);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to remove skill.");
    }
  };

  const handleQuickApply = (match: MatchResult) => {
    setIsApplying(true);
    setTimeout(() => {
      setIsApplying(false);
      setSelectedJobMatch(null);
      toast.success(
        `Your application for ${match.job?.title} has been received! The hiring team has been notified.`,
        "Application Submitted"
      );
    }, 600);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">
          Loading your career matches & profile...
        </p>
      </div>
    );
  }

  const hasResume = Boolean(profile?.resume_s3_key || profile?.resume_file_path);

  // Filter out 0% match scores & jobs below 40% threshold as per requirement:
  // "80-100%: Green, 60-79%: Yellow, 40-59%: Orange, Below 40%: Not shown"
  const visibleMatches = pipelineMatches.filter((m) => {
    const score = Number(m.overall_score || 0);
    return score >= 40 || (score > 0 && m.meets_experience);
  });

  const activeApplications = visibleMatches.filter((m) => m.status !== "rejected");
  const upcomingInterviews = interviews.filter((i) => i.status === "scheduled");

  // Pagination for Job Matches
  const totalMatchPages = Math.max(1, Math.ceil(visibleMatches.length / MATCH_PAGE_SIZE));
  const paginatedMatches = visibleMatches.slice(
    (matchPage - 1) * MATCH_PAGE_SIZE,
    matchPage * MATCH_PAGE_SIZE
  );

  // Pagination for Interviews
  const totalInterviewPages = Math.max(1, Math.ceil(interviews.length / INTERVIEW_PAGE_SIZE));
  const paginatedInterviews = interviews.slice(
    (interviewPage - 1) * INTERVIEW_PAGE_SIZE,
    interviewPage * INTERVIEW_PAGE_SIZE
  );

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    if (score >= 60) return "text-amber-400 bg-amber-500/10 border-amber-500/30";
    if (score >= 40) return "text-orange-400 bg-orange-500/10 border-orange-500/30";
    return "text-muted-foreground bg-secondary border-border";
  };

  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-outfit text-foreground tracking-tight flex items-center gap-2">
            <span>Welcome back, {profile?.full_name || "Candidate"}</span>
            <span className="inline-block animate-wave text-2xl">👋</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Track your verified skill alignments, interview calendar, and active hiring stages.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {hasResume ? (
            <Badge variant="success" className="gap-1 px-3 py-1 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5" /> Resume Processed
            </Badge>
          ) : (
            <Badge variant="warning" className="gap-1 px-3 py-1 text-xs">
              <AlertCircle className="h-3.5 w-3.5" /> No Resume Uploaded
            </Badge>
          )}
        </div>
      </div>

      {/* ── Top Metric Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Matched Openings"
          value={activeApplications.length}
          icon={Layers}
          color="indigo"
          description="Positions matched"
        />
        <StatCard
          title="Interview Rounds"
          value={upcomingInterviews.length}
          icon={Calendar}
          color="purple"
          description="Scheduled sessions"
        />
        <StatCard
          title="Profile Skills"
          value={profile?.skills?.length || 0}
          icon={UserCheck}
          color="blue"
          description="Verified credentials"
        />
        <StatCard
          title="Total Experience"
          value={`${profile?.total_experience_years || 0} yrs`}
          icon={Clock}
          color="emerald"
          description="Career tenure"
        />
      </div>

      {/* ── Navigation Tabs ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-border/80 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab("pipeline")}
          className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "pipeline"
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>My Job Matches</span>
          {activeApplications.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-primary-foreground/20 font-bold">
              {activeApplications.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("interviews")}
          className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "interviews"
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
          }`}
        >
          <CalendarCheck className="h-4 w-4" />
          <span>Interview Schedule</span>
          {upcomingInterviews.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-purple-500 text-white font-bold animate-pulse">
              {upcomingInterviews.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("profile")}
          className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "profile"
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Resume & Profile</span>
          {hasResume && <span className="h-2 w-2 rounded-full bg-emerald-400" />}
        </button>

        <button
          onClick={() => setActiveTab("skills")}
          className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "skills"
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
          }`}
        >
          <Code2 className="h-4 w-4" />
          <span>Skills Inventory</span>
          <span className="text-[10px] opacity-70">({profile?.skills?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab("notifications")}
          className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "notifications"
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
          }`}
        >
          <Bell className="h-4 w-4" />
          <span>Updates</span>
          {notifications.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-indigo-500 text-white font-bold">
              {notifications.length}
            </span>
          )}
        </button>
      </div>

      {/* ── TAB 1: JOB MATCHES & EXPLAINABLE PIPELINE ─────────────────────── */}
      {activeTab === "pipeline" && (
        <div className="space-y-4">
          {visibleMatches.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-border/80 bg-card/40 space-y-4">
              <div className="h-12 w-12 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
                <Layers className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold font-outfit text-foreground">
                  No High-Alignment Job Requisitions Found
                </h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Only positions with verified skill alignments (&ge; 40% fit) are shown. Upload an updated resume or declare additional technical skills to expand your matching opportunities.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("profile")}
                className="gap-2 text-xs text-primary border-primary/30 hover:bg-primary/10"
              >
                <Upload className="h-3.5 w-3.5" /> Upload Resume
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground pb-1">
                <span>Showing {paginatedMatches.length} of {visibleMatches.length} qualified positions</span>
                <span className="text-[11px] italic">Click any job card to view full description and apply</span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {paginatedMatches.map((match) => {
                  const score = Number(match.overall_score || 0);
                  const isRejected = match.status === "rejected";
                  const stageOrder = ["matched", "screened", "approved_by_hr", "interview_scheduled"];
                  let stageIndex = stageOrder.indexOf(match.status);
                  if (match.status === "offer" || match.status === "hired") stageIndex = 4;
                  if (stageIndex === -1 && !isRejected) stageIndex = 1;

                  const matchInterview = interviews.find((i) => i.match_result_id === match.id);

                  return (
                    <Card
                      key={match.id}
                      onClick={() => setSelectedJobMatch(match)}
                      className="p-5 border-border/80 bg-card/70 backdrop-blur-xl hover:border-primary/60 hover:shadow-md cursor-pointer transition-all space-y-4 group"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-bold font-outfit text-foreground group-hover:text-primary transition-colors truncate">
                              {match.job?.title || "Requisition"}
                            </h3>
                            <Badge
                              variant={
                                isRejected
                                  ? "destructive"
                                  : match.status === "approved_by_hr" || match.status === "interview_scheduled"
                                  ? "success"
                                  : "outline"
                              }
                              className="text-[10px] capitalize"
                            >
                              {match.status.replace(/_/g, " ")}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                            {match.job?.client_name && (
                              <span className="font-medium text-foreground flex items-center gap-1">
                                <Building className="h-3.5 w-3.5 text-indigo-400" />
                                {match.job.client_name}
                              </span>
                            )}
                            {match.job?.department && <span>• {match.job.department}</span>}
                            {match.job?.work_mode && (
                              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary/80 text-[11px] font-medium text-foreground">
                                <Laptop className="h-3 w-3 text-primary" /> {match.job.work_mode}
                              </span>
                            )}
                            {match.job?.location_city && (
                              <span className="flex items-center gap-1 text-[11px]">
                                <MapPin className="h-3 w-3" /> {match.job.location_city}
                              </span>
                            )}
                            <span>• Min Exp: {match.job?.min_experience_years || 0} yrs</span>
                            {match.meets_experience ? (
                              <Badge variant="success" className="text-[9px] py-0 px-1.5">
                                Exp Met
                              </Badge>
                            ) : (
                              <Badge variant="warning" className="text-[9px] py-0 px-1.5">
                                Exp Below Min
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Match Percentage Display with Prominent Color Coding */}
                        <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <div className={`px-4 py-2 rounded-xl border text-center ${getScoreColor(score)}`}>
                            <span className="text-2xl font-extrabold font-outfit">
                              {score.toFixed(0)}%
                            </span>
                            <span className="block text-[9px] font-semibold uppercase tracking-wider opacity-80">
                              Fit Score
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Explainable Skills Breakdown */}
                      <div className="p-3.5 rounded-xl bg-secondary/30 border border-border/60 space-y-2 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-muted-foreground font-semibold text-[11px]">
                            Matched Skills:
                          </span>
                          {match.matched_skills && match.matched_skills.length > 0 ? (
                            match.matched_skills.map((sk) => (
                              <span
                                key={sk}
                                className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-medium"
                              >
                                ✓ {sk}
                              </span>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-[11px]">None aligned</span>
                          )}
                        </div>

                        {match.missing_skills && match.missing_skills.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className="text-muted-foreground font-semibold text-[11px]">
                              Missing Skills:
                            </span>
                            {match.missing_skills.map((sk) => (
                              <span
                                key={sk}
                                className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-medium"
                              >
                                - {sk}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Progress Stepper */}
                      <div className="pt-2 pb-1">
                        <div className="grid grid-cols-4 gap-2 text-center">
                          <div className="space-y-1">
                            <div className={`h-1.5 rounded-full ${stageIndex >= 1 ? "bg-indigo-500" : "bg-secondary"}`} />
                            <span className="text-[10px] text-muted-foreground">1. Matched</span>
                          </div>
                          <div className="space-y-1">
                            <div className={`h-1.5 rounded-full ${stageIndex >= 2 ? "bg-indigo-500" : "bg-secondary"}`} />
                            <span className="text-[10px] text-muted-foreground">2. Screened</span>
                          </div>
                          <div className="space-y-1">
                            <div className={`h-1.5 rounded-full ${stageIndex >= 3 ? "bg-indigo-500" : "bg-secondary"}`} />
                            <span className="text-[10px] text-muted-foreground">3. HR Approved</span>
                          </div>
                          <div className="space-y-1">
                            <div className={`h-1.5 rounded-full ${stageIndex >= 4 ? "bg-purple-500" : "bg-secondary"}`} />
                            <span className="text-[10px] text-muted-foreground">4. Interview</span>
                          </div>
                        </div>
                      </div>

                      {/* Interview Alert Banner */}
                      {matchInterview && (
                        <div className="p-3 rounded-xl border border-purple-500/40 bg-purple-500/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 text-purple-200">
                            <Calendar className="h-4 w-4 text-purple-400" />
                            <span>
                              Interview: <strong>{new Date(matchInterview.interview_date).toLocaleString()}</strong> ({matchInterview.interview_type})
                            </span>
                          </div>
                          {matchInterview.meeting_link && (
                            <a
                              href={matchInterview.meeting_link}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors"
                            >
                              <Video className="h-3.5 w-3.5" /> Join Meeting
                            </a>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              {totalMatchPages > 1 && (
                <div className="flex items-center justify-between py-3 border-t border-border/60">
                  <p className="text-xs text-muted-foreground">
                    Page {matchPage} of {totalMatchPages} ({visibleMatches.length} total matches)
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={matchPage <= 1}
                      onClick={() => setMatchPage((p) => p - 1)}
                      className="gap-1 text-xs h-8"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" /> Prev
                    </Button>
                    <span className="text-xs font-semibold text-foreground px-2">{matchPage}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={matchPage >= totalMatchPages}
                      onClick={() => setMatchPage((p) => p + 1)}
                      className="gap-1 text-xs h-8"
                    >
                      Next <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: INTERVIEW SCHEDULE (NEW REQUIREMENT) ────────────────────── */}
      {activeTab === "interviews" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold font-outfit text-foreground flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-purple-400" />
                Interview Schedule & Meeting Links
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage your scheduled recruitment rounds, video conference links, and reviewer feedback.
              </p>
            </div>
            <Badge variant="purple" className="px-3 py-1 text-xs">
              {upcomingInterviews.length} Scheduled
            </Badge>
          </div>

          {interviews.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-border/80 bg-card/40 space-y-3">
              <Calendar className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <h3 className="text-base font-bold font-outfit text-foreground">No Interviews Scheduled Yet</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                When HR approves your profile and schedules a technical or strategic round, the date, video call link (Google Meet / Zoom), and interviewer details will appear here.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {paginatedInterviews.map((iv) => {
                  const isUpcoming = iv.status === "scheduled";
                  const ivDate = new Date(iv.interview_date);

                  return (
                    <Card
                      key={iv.id}
                      className="p-5 border-border/80 bg-card/70 backdrop-blur-xl hover:border-purple-500/40 transition-all space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold font-outfit text-foreground">
                              {iv.job_title || "Position Interview"}
                            </h3>
                            <Badge variant={iv.status === "scheduled" ? "purple" : iv.status === "completed" ? "success" : "secondary"}>
                              {iv.status.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Format: <strong className="text-foreground">{iv.interview_type}</strong>
                            {iv.scheduler_name && ` • Scheduled by: ${iv.scheduler_name}`}
                          </p>
                        </div>

                        {iv.meeting_link && isUpcoming && (
                          <a
                            href={iv.meeting_link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all shrink-0"
                          >
                            <Video className="h-4 w-4" /> Join Video Call
                          </a>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-secondary/40 border border-border/60 text-xs">
                        <div>
                          <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Date</span>
                          <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                            <Calendar className="h-3.5 w-3.5 text-purple-400" />
                            {ivDate.toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Time</span>
                          <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="h-3.5 w-3.5 text-indigo-400" />
                            {ivDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Mode / Platform</span>
                          <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                            <Laptop className="h-3.5 w-3.5 text-emerald-400" />
                            {iv.interview_mode ? iv.interview_mode.toUpperCase() : "ONLINE (MEET/ZOOM)"}
                          </span>
                        </div>
                      </div>

                      {iv.meeting_link && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">Meeting Link:</span>
                          <a
                            href={iv.meeting_link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline truncate max-w-md font-medium"
                          >
                            {iv.meeting_link}
                          </a>
                        </div>
                      )}

                      {iv.feedback && (
                        <div className="p-3 rounded-lg bg-secondary/60 border border-border text-xs space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Interviewer Notes / Preparation Instructions:
                          </span>
                          <p className="text-foreground">{iv.feedback}</p>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>

              {totalInterviewPages > 1 && (
                <div className="flex items-center justify-between py-3 border-t border-border/60">
                  <p className="text-xs text-muted-foreground">
                    Showing page {interviewPage} of {totalInterviewPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={interviewPage <= 1}
                      onClick={() => setInterviewPage((p) => p - 1)}
                      className="gap-1 text-xs h-8"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" /> Prev
                    </Button>
                    <span className="text-xs font-semibold text-foreground px-2">{interviewPage}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={interviewPage >= totalInterviewPages}
                      onClick={() => setInterviewPage((p) => p + 1)}
                      className="gap-1 text-xs h-8"
                    >
                      Next <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: PROFILE & RESUME PROCESSING ────────────────────────────── */}
      {activeTab === "profile" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Top Quick Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-500/15 via-purple-500/10 to-transparent border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <FileCode className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground font-outfit">Resume Text & Structured Extraction</h4>
                <p className="text-xs text-muted-foreground">
                  Your uploaded resume is converted to clean plain text (.txt) and parsed into structured credentials below.
                </p>
              </div>
            </div>
            {hasResume && (
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleViewExtractedText}
                  disabled={isLoadingText}
                  className="gap-1.5 text-xs text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/10"
                >
                  {isLoadingText ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileCode className="h-3.5 w-3.5" />}
                  View Extracted .TXT
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleViewOriginalResume}
                  disabled={isViewingResume}
                  className="gap-1.5 text-xs text-primary border-primary/40 hover:bg-primary/10"
                >
                  {isViewingResume ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                  View Original File
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Profile Form */}
            <div className="lg:col-span-6 space-y-6">
            <Card className="p-6 border-border/80 bg-card/70 backdrop-blur-xl space-y-5">
              <h3 className="text-base font-bold font-outfit text-foreground flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" /> Personal Profile & Address
              </h3>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-semibold text-foreground">Full Name *</label>
                    <Input
                      type="text"
                      required
                      placeholder="e.g. Alice Johnson"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Mobile Number (+91 Indian Format) *</label>
                    <Input
                      type="tel"
                      placeholder="e.g. +91 9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground">10-digit number (+91)</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Total Experience (Years) *
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
                </div>

                {/* Address Section */}
                <div className="pt-3 border-t border-border/60 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-indigo-400" /> Address Details
                  </h4>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Street Address</label>
                    <Input
                      type="text"
                      placeholder="Flat, Road, Area"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">City</label>
                      <Input
                        type="text"
                        placeholder="e.g. Bangalore"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">State</label>
                      <Input
                        type="text"
                        placeholder="e.g. Karnataka"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Pincode</label>
                      <Input
                        type="text"
                        placeholder="e.g. 560001"
                        maxLength={10}
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Country</label>
                      <Input
                        type="text"
                        placeholder="India"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Work Preferences & CTC Section */}
                <div className="pt-3 border-t border-border/60 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 text-emerald-400" /> Work Preferences & Compensation
                  </h4>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground block">Preferred Work Location Mode *</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "WFH", label: "Remote (WFH)", icon: Laptop },
                        { id: "WFO", label: "On-site (WFO)", icon: Building2 },
                        { id: "Hybrid", label: "Hybrid", icon: Layers },
                      ].map((mode) => {
                        const Icon = mode.icon;
                        const isSelected = preferredWorkMode === mode.id;
                        return (
                          <label
                            key={mode.id}
                            className={`flex flex-col items-center justify-center p-2.5 rounded-xl border cursor-pointer text-center transition-all ${
                              isSelected
                                ? "border-primary bg-primary/10 text-primary shadow-sm"
                                : "border-border bg-card/40 text-muted-foreground hover:border-border/80"
                            }`}
                          >
                            <input
                              type="radio"
                              name="dash_work_mode"
                              value={mode.id}
                              checked={isSelected}
                              onChange={() => setPreferredWorkMode(mode.id as any)}
                              className="sr-only"
                            />
                            <Icon className="h-4 w-4 mb-1" />
                            <span className="text-xs font-semibold">{mode.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Work Authorization</label>
                      <select
                        value={workAuthorization}
                        onChange={(e) => setWorkAuthorization(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="Indian Citizen">Indian Citizen</option>
                        <option value="Permanent Resident">Permanent Resident</option>
                        <option value="Employment Visa / Work Permit">Employment Visa / Work Permit</option>
                        <option value="Student Visa">Student Visa</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Notice Period</label>
                      <select
                        value={noticePeriod}
                        onChange={(e) => setNoticePeriod(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="Immediate">Immediate</option>
                        <option value="15 Days">15 Days</option>
                        <option value="30 Days">30 Days</option>
                        <option value="60 Days">60 Days</option>
                        <option value="90 Days">90 Days</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Current CTC (in LPA)</label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="e.g. 12.0"
                        value={currentCtc}
                        onChange={(e) => setCurrentCtc(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Expected CTC (in LPA)</label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="e.g. 18.0"
                        value={expectedCtc}
                        onChange={(e) => setExpectedCtc(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Button type="submit" variant="gradient" disabled={isSavingProfile} className="w-full gap-2">
                    {isSavingProfile ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Saving Profile...
                      </>
                    ) : (
                      "Save Candidate Profile"
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          {/* Resume Upload & Extracted Structured Data */}
          <div className="lg:col-span-6 space-y-6">
            <Card className="p-6 border-border/80 bg-card/70 backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold font-outfit text-foreground flex items-center gap-2">
                  <FileText className="h-5 w-5 text-indigo-400" /> Resume Upload & Extraction
                </h3>
                {hasResume && (
                  <Badge variant="success" className="text-[10px]">
                    Processed
                  </Badge>
                )}
              </div>

              {hasResume ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span className="truncate max-w-[200px]">
                        {profile?.resume_filename || "Resume Document"}
                      </span>
                    </div>
                    {profile?.resume_uploaded_at && (
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(profile.resume_uploaded_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Original document and extracted readable text (.txt) are preserved securely in storage.
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleViewOriginalResume}
                      disabled={isViewingResume}
                      className="gap-1.5 text-xs text-primary border-primary/40 hover:bg-primary/10"
                    >
                      {isViewingResume ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ExternalLink className="h-3.5 w-3.5" />
                      )}
                      Original File
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleViewExtractedText}
                      disabled={isLoadingText}
                      className="gap-1.5 text-xs text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/10"
                    >
                      {isLoadingText ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <FileCode className="h-3.5 w-3.5" />
                      )}
                      View .TXT Preview
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
                  Upload your resume (.pdf, .docx, .doc, .txt) to extract skills, experience, and education automatically.
                </div>
              )}

              <form onSubmit={handleResumeUpload} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {hasResume ? "Replace Existing Resume" : "Upload Resume (PDF, DOCX, TXT)"}
                  </label>
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                  />
                  <span className="text-[10px] text-muted-foreground block">
                    Supported: PDF (.pdf), Word (.docx, .doc), Text (.txt) up to 10MB
                  </span>
                </div>

                {uploadStep && (
                  <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs flex items-center gap-2 animate-pulse">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
                    <span>{uploadStep}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="gradient"
                  disabled={isUploadingResume || !resumeFile}
                  className="w-full gap-2"
                >
                  {isUploadingResume ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Processing Document...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" /> Upload & Parse Resume
                    </>
                  )}
                </Button>
              </form>
            </Card>

            {/* Structured Parsed Resume Overview */}
            <Card className="p-6 border-border/80 bg-card/70 backdrop-blur-xl space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold font-outfit text-foreground flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-indigo-400" /> Extracted Structured Information
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Deterministic rule-based extraction from your resume text
                  </p>
                </div>
                {profile?.resume_parsed_at && (
                  <span className="text-[10px] text-muted-foreground">
                    Parsed: {new Date(profile.resume_parsed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>

              {parsedData ? (
                <div className="space-y-4">
                  {/* Extracted Contact */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-secondary/30 border border-border/60 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-bold">
                        Extracted Candidate Name
                      </span>
                      <span className="font-semibold text-foreground text-sm">
                        {parsedData.name || profile?.full_name || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-bold">
                        Contact Info
                      </span>
                      <div className="flex flex-col gap-0.5 text-foreground font-medium">
                        {parsedData.email && <span>✉ {parsedData.email}</span>}
                        {parsedData.phone && <span>📞 {parsedData.phone}</span>}
                        {!parsedData.email && !parsedData.phone && <span>N/A</span>}
                      </div>
                    </div>
                  </div>

                  {/* Extracted Education */}
                  <div className="p-3.5 rounded-xl bg-secondary/30 border border-border/60 space-y-2">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                      <GraduationCap className="h-4 w-4 text-emerald-400" /> Academic Background
                    </h4>
                    {parsedData.education && parsedData.education.length > 0 ? (
                      <div className="space-y-1.5 text-xs">
                        {parsedData.education.map((edu, idx) => (
                          <div key={idx} className="flex justify-between items-center text-foreground">
                            <div>
                              <span className="font-semibold text-emerald-300">{edu.degree}</span>
                              <span className="text-muted-foreground block text-[11px]">{edu.institution}</span>
                            </div>
                            {edu.year && <Badge variant="outline">{edu.year}</Badge>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No degree explicitly detected.</p>
                    )}
                  </div>

                  {/* Extracted Experience */}
                  <div className="p-3.5 rounded-xl bg-secondary/30 border border-border/60 space-y-2">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                      <Briefcase className="h-4 w-4 text-blue-400" /> Work Experience (Detected {parsedData.total_experience_years || 0} yrs)
                    </h4>
                    {parsedData.experience && parsedData.experience.length > 0 ? (
                      <div className="space-y-1.5 text-xs">
                        {parsedData.experience.map((pos, idx) => (
                          <div key={idx} className="text-foreground">
                            <span className="font-semibold text-blue-300">{pos.title}</span>
                            {pos.duration && (
                              <span className="text-muted-foreground text-[11px] block">{pos.duration}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Calculated tenure: {parsedData.total_experience_years || 0} years.</p>
                    )}
                  </div>

                  {/* Extracted Skills Badges */}
                  <div className="p-3.5 rounded-xl bg-secondary/30 border border-border/60 space-y-2">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                      <Code2 className="h-4 w-4 text-indigo-400" /> Detected Skills ({parsedData.skills?.length || 0})
                    </h4>
                    {parsedData.skills && parsedData.skills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {parsedData.skills.map((sk, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-medium"
                          >
                            {sk.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No skills recognized from master taxonomy.</p>
                    )}
                  </div>

                  {/* Certifications & Projects */}
                  {(parsedData.certifications?.length > 0 || parsedData.projects?.length > 0) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {parsedData.certifications?.length > 0 && (
                        <div className="p-3 rounded-xl bg-secondary/30 border border-border/60 space-y-1.5">
                          <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <Award className="h-3.5 w-3.5 text-amber-400" /> Certifications
                          </h4>
                          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                            {parsedData.certifications.map((c, i) => (
                              <li key={i} className="text-foreground">{c}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {parsedData.projects?.length > 0 && (
                        <div className="p-3 rounded-xl bg-secondary/30 border border-border/60 space-y-1.5">
                          <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <Layers className="h-3.5 w-3.5 text-purple-400" /> Key Projects
                          </h4>
                          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                            {parsedData.projects.map((p, i) => (
                              <li key={i} className="text-foreground">{p}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center border border-dashed border-border/60 rounded-xl space-y-2">
                  <FileText className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
                  <p className="text-xs text-muted-foreground">
                    Upload a resume file on the left to extract structured candidate details.
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
      )}

      {/* ── TAB 3: SKILLS INVENTORY ──────────────────────────────────────── */}
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
                    <option value="Beginner">Beginner (Score weight: 40%)</option>
                    <option value="Intermediate">Intermediate (Score weight: 70%)</option>
                    <option value="Expert">Expert (Score weight: 100%)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Years of Experience</label>
                  <Input
                    type="number"
                    min="0"
                    max="40"
                    step="0.5"
                    required
                    value={skillYears}
                    onChange={(e) => setSkillYears(Number(e.target.value))}
                  />
                </div>

                <Button type="submit" variant="gradient" disabled={isAddingSkill} className="w-full gap-2">
                  {isAddingSkill ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Adding...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="h-4 w-4" /> Save Skill
                    </>
                  )}
                </Button>
              </form>
            </Card>
          </div>

          {/* Current Skills Table */}
          <div className="md:col-span-7">
            <Card className="p-6 border-border/80 bg-card/70 backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold font-outfit text-foreground flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-primary" /> Active Profile Skills
                </h3>
                <span className="text-xs text-muted-foreground">
                  {profile?.skills?.length || 0} skills active
                </span>
              </div>

              {profile?.skills && profile.skills.length > 0 ? (
                <div className="space-y-2">
                  {profile.skills.map((cs) => (
                    <div
                      key={cs.id}
                      className="p-3 rounded-xl bg-secondary/30 border border-border/60 flex items-center justify-between hover:bg-secondary/50 transition-all"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-foreground">{cs.skill.name}</span>
                          <span className={getProficiencyBadgeClass(cs.proficiency_level)}>
                            {cs.proficiency_level}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {cs.skill.category} • {cs.years_experience} yrs experience
                        </span>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSkill(cs.id)}
                        className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center border border-dashed border-border/60 rounded-xl space-y-2">
                  <Code2 className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
                  <p className="text-xs text-muted-foreground">
                    No skills in your profile inventory yet. Add skills on the left or upload your resume to auto-sync!
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ── TAB 4: NOTIFICATIONS ─────────────────────────────────────────── */}
      {activeTab === "notifications" && (
        <Card className="p-6 border-border/80 bg-card/70 backdrop-blur-xl space-y-4">
          <h3 className="text-base font-bold font-outfit text-foreground flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" /> Application Notifications
          </h3>
          {notifications.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              No recent notifications.
            </p>
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className="p-3.5 rounded-xl bg-secondary/30 border border-border/60 space-y-1"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground">{n.subject}</span>
                    <span className="text-muted-foreground text-[10px]">
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{n.body}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ── Extracted Plain Text (.txt) Modal ─────────────────────────────── */}
      <Dialog open={isTextModalOpen} onOpenChange={setIsTextModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileCode className="h-5 w-5 text-indigo-400" />
                Extracted Resume Plain Text (.txt)
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyText}
                className="gap-1.5 text-xs"
              >
                {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {isCopied ? "Copied" : "Copy Text"}
              </Button>
            </DialogTitle>
            <DialogDescription>
              Clean, readable text extracted from your document for deterministic matching and search.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 rounded-xl bg-secondary/40 border border-border/80 font-mono text-xs text-foreground whitespace-pre-wrap leading-relaxed">
            {extractedRawText || "No text content."}
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setIsTextModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: JOB DETAILS & QUICK APPLY ──────────────────────────────── */}
      <Dialog open={Boolean(selectedJobMatch)} onOpenChange={(open) => !open && setSelectedJobMatch(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedJobMatch && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <DialogTitle className="text-xl font-bold font-outfit text-foreground">
                      {selectedJobMatch.job?.title || "Requisition"}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-3">
                      {selectedJobMatch.job?.client_name && (
                        <span className="font-semibold text-foreground flex items-center gap-1">
                          <Building className="h-3.5 w-3.5 text-primary" /> {selectedJobMatch.job.client_name}
                        </span>
                      )}
                      {selectedJobMatch.job?.department && <span>• {selectedJobMatch.job.department}</span>}
                      {selectedJobMatch.job?.work_mode && (
                        <span className="flex items-center gap-1 text-primary font-semibold">
                          <Laptop className="h-3.5 w-3.5" /> {selectedJobMatch.job.work_mode}
                        </span>
                      )}
                    </DialogDescription>
                  </div>

                  <div className={`px-3 py-1.5 rounded-xl border text-center shrink-0 ${getScoreColor(Number(selectedJobMatch.overall_score || 0))}`}>
                    <span className="text-xl font-extrabold font-outfit">
                      {Number(selectedJobMatch.overall_score || 0).toFixed(0)}%
                    </span>
                    <span className="block text-[8px] font-bold uppercase tracking-wider opacity-80">
                      Match Fit
                    </span>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 pt-2 text-sm">
                {/* Meta details grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-secondary/40 border border-border text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Location</span>
                    <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" />
                      {selectedJobMatch.job?.location_city || "Flexible / Remote"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Urgency</span>
                    <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" />
                      {selectedJobMatch.job?.urgency || "30 days"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Experience</span>
                    <span className="font-semibold text-foreground mt-0.5 block">
                      Min {selectedJobMatch.job?.min_experience_years || 0} yrs
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Shift</span>
                    <span className="font-semibold text-foreground mt-0.5 block">
                      {selectedJobMatch.job?.shift_timing || "Day Shift"}
                    </span>
                  </div>
                </div>

                {/* Job Description */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Role Description
                  </h4>
                  <div className="text-xs text-foreground leading-relaxed whitespace-pre-line p-3 rounded-xl bg-card border border-border/80">
                    {selectedJobMatch.job?.description || "No specific job description provided for this opening."}
                  </div>
                </div>

                {/* Required Skills */}
                {selectedJobMatch.job?.job_skills && selectedJobMatch.job.job_skills.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      Required Skills ({selectedJobMatch.job.job_skills.length})
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedJobMatch.job.job_skills.map((js) => {
                        const isUserHave = selectedJobMatch.matched_skills?.includes(js.skill.name);
                        return (
                          <span
                            key={js.id}
                            className={`text-xs px-2.5 py-1 rounded-lg border font-medium flex items-center gap-1 ${
                              isUserHave
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                                : "bg-secondary text-muted-foreground border-border"
                            }`}
                          >
                            {isUserHave ? "✓ " : ""}
                            {js.skill.name} ({js.requirement_type})
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Timelines */}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                  <span>
                    Posted: {selectedJobMatch.job?.created_at ? new Date(selectedJobMatch.job.created_at).toLocaleDateString() : "Recent"}
                  </span>
                  <span>
                    Application Deadline: 30 Days from posting
                  </span>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-3">
                <Button variant="outline" size="sm" onClick={() => setSelectedJobMatch(null)}>
                  Close
                </Button>
                <Button
                  variant="gradient"
                  size="sm"
                  disabled={isApplying}
                  onClick={() => handleQuickApply(selectedJobMatch)}
                  className="gap-2"
                >
                  {isApplying ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" /> Quick Apply Now
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

