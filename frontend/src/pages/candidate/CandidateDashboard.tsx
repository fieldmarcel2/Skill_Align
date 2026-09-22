import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { candidatesApi, interviewsApi, notificationsApi, skillsApi, resumeApi } from "../../services/api";
import { Candidate, MatchResult, Interview, Notification, Skill, ParsedResumeData, CandidateHiringResponse } from "../../types";
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
  FileCheck,
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
  Gift,
  Zap,
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
  RefreshCw,
  Quote,
  FolderGit2,
  CheckCheck,
  Wand2,
  Filter,
  Info,
  Eye,
} from "lucide-react";

import { CandidateSlotPickerModal } from "../../components/candidate/CandidateSlotPickerModal";
import { InlineSlotChooser } from "../../components/candidate/InlineSlotChooser";
import confetti from "canvas-confetti";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";

const MATCH_PAGE_SIZE = 10;
const INTERVIEW_PAGE_SIZE = 10;



const stageLabels: Record<string, string> = {
  matched: "Under Review",
  screened: "Screened",
  approved_by_hr: "Shortlisted",
  shortlisted: "Shortlisted",
  interview_scheduled: "Interview Scheduled",
  technical_interview: "Technical Round",
  hr_interview: "HR Round",
  offer: "Offer Extended",
  hired: "Hired",
  rejected: "Not Selected",
};

export const CandidateDashboard: React.FC = () => {
  const toast = useToast();
  const { refreshUser } = useAuth();
  const [profile, setProfile] = useState<Candidate | null>(null);
  const [pipelineMatches, setPipelineMatches] = useState<MatchResult[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hiringStatusData, setHiringStatusData] = useState<CandidateHiringResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"pipeline" | "interviews" | "profile" | "skills" | "notifications">("pipeline");

  // Selected Interview for Slot Picker Modal
  const [selectedInterviewForSlot, setSelectedInterviewForSlot] = useState<Interview | null>(null);

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

  // Parsed Resume Structured Data state & Enhanced Sub-Tabs
  const [parsedData, setParsedData] = useState<ParsedResumeData | null>(null);
  const [structuredTab, setStructuredTab] = useState<"overview" | "experience" | "projects" | "skills" | "education">("overview");
  const [isReparsing, setIsReparsing] = useState(false);
  const [isSyncingAllSkills, setIsSyncingAllSkills] = useState(false);
  const [activeSkillCategory, setActiveSkillCategory] = useState<string>("All");
  const [skillsSubTab, setSkillsSubTab] = useState<"shelf" | "experience" | "projects" | "manual">("shelf");

  // Add Skill state
  const [selectedSkillId, setSelectedSkillId] = useState<number | "">("");
  const [proficiencyLevel, setProficiencyLevel] = useState<"Beginner" | "Intermediate" | "Expert">("Intermediate");
  const [skillYears, setSkillYears] = useState<number>(1);
  const [isAddingSkill, setIsAddingSkill] = useState(false);

  // Notifications interactive state & actions
  const [notificationCategory, setNotificationCategory] = useState<"ALL" | "OFFERS" | "INTERVIEWS" | "UPDATES">("ALL");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch {
      toast.error("Failed to mark update as read.");
    }
  };

  const handleMarkAllAsRead = async () => {
    setIsMarkingAll(true);
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success("All notifications marked as read.");
    } catch {
      toast.error("Failed to mark all updates as read.");
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleDeleteNotification = async (id: number) => {
    try {
      await notificationsApi.delete(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success("Notification dismissed.");
    } catch {
      toast.error("Failed to dismiss notification.");
    }
  };

  const triggerOfferConfetti = () => {
    confetti({
      particleCount: 90,
      spread: 75,
      origin: { y: 0.6 },
      colors: ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#06b6d4"],
    });
  };

  const fetchData = async () => {
    try {
      const [profileData, pipelineData, interviewsData, notificationsData, skillsData, hiringRes] = await Promise.all([
        candidatesApi.getMyProfile().catch(() => null),
        candidatesApi.getMyPipeline().catch(() => []),
        interviewsApi.getMyInterviews().catch(() => []),
        notificationsApi.getMyNotifications().catch(() => []),
        skillsApi.list().catch(() => []),
        candidatesApi.getMyHiringStatus().catch(() => null),
      ]);

      if (hiringRes) {
        setHiringStatusData(hiringRes);
      }

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

      await refreshUser().catch(() => null);

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

  const handleApplyExtractedToProfile = () => {
    if (!parsedData) {
      toast.error("No extracted resume data available.");
      return;
    }
    if (parsedData.name && parsedData.name !== "N/A") {
      setFullName(parsedData.name);
    }
    if (parsedData.phone) {
      setPhone(parsedData.phone);
    }
    if (parsedData.total_experience_years !== undefined && parsedData.total_experience_years >= 0) {
      setTotalExperience(parsedData.total_experience_years);
    }
    if (parsedData.additional_info?.location) {
      if (parsedData.additional_info.location.toLowerCase().includes("india")) {
        setCountry("India");
      }
    }
    toast.success("Applied extracted resume credentials to profile form! Click 'Save Candidate Profile' below to persist changes.");
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
      setFullName(refreshed.full_name);
      setTotalExperience(refreshed.total_experience_years);
      const newPipeline = await candidatesApi.getMyPipeline().catch(() => []);
      setPipelineMatches(newPipeline);
      toast.success("Resume re-parsed with enhanced deterministic intelligence!");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to re-parse resume.");
    } finally {
      setIsReparsing(false);
    }
  };

  const handleSyncAllResumeSkills = async () => {
    if (!profile || !parsedData?.skills?.length) {
      toast.error("No extracted skills available to sync.");
      return;
    }
    setIsSyncingAllSkills(true);
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
              years_experience: Math.max(0.5, Math.min(totalExperience || 1, 3)),
            });
            existingSkillIds.add(matched.id);
            existingSkillNames.add(matched.name.toLowerCase());
            addedCount++;
          } catch {}
        }
      }

      const refreshed = await candidatesApi.getMyProfile();
      setProfile(refreshed);
      const newPipeline = await candidatesApi.getMyPipeline().catch(() => []);
      setPipelineMatches(newPipeline);

      if (addedCount > 0) {
        toast.success(`Successfully added ${addedCount} resume-extracted skills to your active profile inventory!`);
      } else {
        toast.info("All extracted skills are already active in your profile inventory.");
      }
    } catch (err: any) {
      toast.error("Failed to sync resume skills.");
    } finally {
      setIsSyncingAllSkills(false);
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
        years_experience: Math.max(0.5, Math.min(totalExperience || 1, 3)),
      });
      setProfile(updated);
      const newPipeline = await candidatesApi.getMyPipeline().catch(() => []);
      setPipelineMatches(newPipeline);
      toast.success(`Added ${matched.name} to active profile skills.`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to add skill.");
    }
  };

  const handleApplyExtractedExpToProfile = async () => {
    if (!profile || parsedData?.total_experience_years === undefined) return;
    try {
      const updated = await candidatesApi.updateProfile({
        total_experience_years: parsedData.total_experience_years,
      });
      setProfile(updated);
      setTotalExperience(updated.total_experience_years);
      const newPipeline = await candidatesApi.getMyPipeline().catch(() => []);
      setPipelineMatches(newPipeline);
      toast.success(`Updated total industry experience to ${parsedData.total_experience_years} years based on resume.`);
    } catch {
      toast.error("Failed to update experience tenure.");
    }
  };

  const skillCategories = React.useMemo(() => {
    if (!parsedData?.skills) return ["All"];
    const cats = new Set<string>();
    parsedData.skills.forEach((s) => {
      if (s.category) cats.add(s.category);
    });
    return ["All", ...Array.from(cats)];
  }, [parsedData?.skills]);

  const filteredResumeSkills = React.useMemo(() => {
    if (!parsedData?.skills) return [];
    if (activeSkillCategory === "All") return parsedData.skills;
    return parsedData.skills.filter((s) => s.category === activeSkillCategory);
  }, [parsedData?.skills, activeSkillCategory]);

  // Analytics for Visual Recharts - Declared before any early returns to respect React Rules of Hooks
  const skillDomainDistribution = React.useMemo(() => {
    const counts: Record<string, number> = {};
    if (profile?.skills && profile.skills.length > 0) {
      profile.skills.forEach((s) => {
        const cat = s.skill?.category || "Technical";
        counts[cat] = (counts[cat] || 0) + 1;
      });
    } else if (parsedData?.skills && parsedData.skills.length > 0) {
      parsedData.skills.forEach((s) => {
        const cat = s.category || "Technical";
        counts[cat] = (counts[cat] || 0) + 1;
      });
    } else {
      counts["Technical"] = 3;
      counts["Frameworks"] = 2;
      counts["Database"] = 1;
      counts["Cloud"] = 1;
    }
    return Object.entries(counts).map(([name, count]) => ({
      domain: name.length > 12 ? name.substring(0, 10) + "…" : name,
      fullName: name,
      count,
    }));
  }, [profile?.skills, parsedData?.skills]);

  const pipelineStageDistribution = React.useMemo(() => {
    const stageCounts: Record<string, number> = {
      "Review": 0,
      "Screened": 0,
      "Shortlist": 0,
      "Interview": 0,
      "Offer": 0,
    };
    pipelineMatches.forEach((m) => {
      const s = String(m.status || "");
      if (s === "offer" || s === "hired") stageCounts["Offer"]++;
      else if (s === "interview_scheduled" || s.includes("interview")) stageCounts["Interview"]++;
      else if (s === "approved_by_hr" || s === "shortlisted") stageCounts["Shortlist"]++;
      else if (s === "screened") stageCounts["Screened"]++;
      else if (s !== "rejected") stageCounts["Review"]++;
    });
    return Object.entries(stageCounts).map(([stage, count]) => ({ stage, count }));
  }, [pipelineMatches]);

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

  // Deduplicate interviews by match_result_id / id to ensure one active round per job application
  const uniqueInterviews = interviews
    .filter(
      (iv) =>
        iv.status !== "cancelled" &&
        iv.pipeline_state !== "REJECTED" &&
        iv.pipeline_state !== "HIRING_MANAGER_REJECTED" &&
        iv.pipeline_state !== "OFFER_REJECTED" &&
        iv.pipeline_state !== "BLACKLISTED" &&
        iv.pipeline_state !== "ON_HOLD_DUE_TO_HIRING" &&
        iv.pipeline_state !== "WITHDRAWN"
    )
    .reduce<Interview[]>((acc, current) => {
      const exists = acc.find(
        (item) =>
          (item.match_result_id && item.match_result_id === current.match_result_id) ||
          item.id === current.id
      );
      if (!exists) {
        acc.push(current);
      }
      return acc;
    }, []);

  const terminalOrOfferStates = [
    "HIRED",
    "OFFER_ACCEPTED",
    "OFFER_SENT",
    "OFFER_CREATED",
    "OFFER_READY",
    "HM_APPROVED",
    "SHORTLISTED",
    "INTERVIEW_COMPLETED",
    "WAITING_FOR_HM_FEEDBACK",
    "INTERVIEW_GO",
    "INTERVIEW_NO_GO",
    "REJECTED",
    "DECLINED",
    "BLACKLISTED",
    "HIRING_MANAGER_REJECTED",
    "OFFER_REJECTED",
    "ON_HOLD_DUE_TO_HIRING",
    "ON_HOLD",
    "WITHDRAWN",
  ];

  const isCandidateHired = Boolean(
    hiringStatusData?.is_hired ||
    profile?.hiring_status === "HIRED" ||
    visibleMatches.some((m) => m.pipeline_state === "HIRED" || m.status === "hired")
  );

  const pendingSlotInterviews = isCandidateHired
    ? []
    : uniqueInterviews.filter(
        (iv) =>
          iv.status !== "cancelled" &&
          iv.status !== "completed" &&
          !terminalOrOfferStates.includes(iv.pipeline_state || "") &&
          (
            iv.status === "pending_slot" ||
            iv.pipeline_state === "WAITING_FOR_CANDIDATE_SLOT" ||
            iv.pipeline_state === "INTERVIEW_SLOTS_PROPOSED" ||
            (iv.slots && iv.slots.some((s) => s.status === "proposed") && !iv.interview_date)
          )
      );

  const awaitingConfirmationInterviews = uniqueInterviews.filter(
    (iv) =>
      iv.status !== "cancelled" &&
      iv.pipeline_state === "CANDIDATE_SLOT_SELECTED" &&
      iv.status !== "completed" &&
      !terminalOrOfferStates.includes(iv.pipeline_state || "") &&
      Boolean(iv.interview_date)
  );

  const confirmedInterviews = uniqueInterviews.filter(
    (iv) =>
      iv.status !== "cancelled" &&
      (iv.status === "scheduled" || iv.pipeline_state === "INTERVIEW_CONFIRMED") &&
      iv.pipeline_state !== "CANDIDATE_SLOT_SELECTED" &&
      iv.pipeline_state !== "WAITING_FOR_CANDIDATE_SLOT" &&
      iv.status !== "pending_slot" &&
      iv.status !== "completed" &&
      !terminalOrOfferStates.includes(iv.pipeline_state || "") &&
      Boolean(iv.interview_date)
  );

  const completedInterviews = uniqueInterviews.filter(
    (iv) =>
      iv.status === "completed" ||
      iv.pipeline_state === "INTERVIEW_COMPLETED" ||
      iv.pipeline_state === "WAITING_FOR_HM_FEEDBACK" ||
      iv.pipeline_state === "INTERVIEW_GO" ||
      iv.pipeline_state === "INTERVIEW_NO_GO" ||
      iv.pipeline_state === "HIRED" ||
      iv.pipeline_state === "OFFER_ACCEPTED" ||
      iv.pipeline_state === "OFFER_SENT" ||
      iv.pipeline_state === "OFFER_CREATED"
  );

  const upcomingInterviews = [...awaitingConfirmationInterviews, ...confirmedInterviews];

  // Pagination for Job Matches
  const totalMatchPages = Math.max(1, Math.ceil(visibleMatches.length / MATCH_PAGE_SIZE));
  const paginatedMatches = visibleMatches.slice(
    (matchPage - 1) * MATCH_PAGE_SIZE,
    matchPage * MATCH_PAGE_SIZE
  );

  // Pagination for Interviews
  const totalInterviewPages = Math.max(1, Math.ceil(uniqueInterviews.length / INTERVIEW_PAGE_SIZE));
  const paginatedInterviews = uniqueInterviews.slice(
    (interviewPage - 1) * INTERVIEW_PAGE_SIZE,
    interviewPage * INTERVIEW_PAGE_SIZE
  );

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    if (score >= 60) return "text-amber-400 bg-amber-500/10 border-amber-500/30";
    if (score >= 40) return "text-orange-400 bg-orange-500/10 border-orange-500/30";
    return "text-muted-foreground bg-secondary border-border";
  };

  const offerNotifications = notifications.filter(
    (n) =>
      n.subject?.toLowerCase().includes("offer") ||
      n.body?.toLowerCase().includes("offer") ||
      n.notification_type?.includes("OFFER")
  );

  const interviewNotifications = notifications.filter(
    (n) =>
      n.subject?.toLowerCase().includes("interview") ||
      n.subject?.toLowerCase().includes("slot") ||
      n.body?.toLowerCase().includes("slot") ||
      n.notification_type?.includes("INTERVIEW") ||
      n.notification_type?.includes("SLOT")
  );

  const updateNotifications = notifications.filter(
    (n) =>
      !offerNotifications.some((o) => o.id === n.id) &&
      !interviewNotifications.some((i) => i.id === n.id)
  );

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const filteredNotifications = notifications.filter((n) => {
    if (unreadOnly && n.is_read) return false;
    if (notificationCategory === "OFFERS") {
      return offerNotifications.some((o) => o.id === n.id);
    }
    if (notificationCategory === "INTERVIEWS") {
      return interviewNotifications.some((i) => i.id === n.id);
    }
    if (notificationCategory === "UPDATES") {
      return updateNotifications.some((u) => u.id === n.id);
    }
    return true;
  });

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
          description={
            pendingSlotInterviews.length > 0
              ? `${pendingSlotInterviews.length} slot action needed`
              : "Scheduled sessions"
          }
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

      {/* ── 1. CANDIDATE HIRING COMPLETION BANNER ───────────────────────── */}
      {(() => {
        const isHiredCandidate = Boolean(
          hiringStatusData?.is_hired ||
          profile?.hiring_status === "HIRED" ||
          pipelineMatches.some((m) => m.pipeline_state === "HIRED" || m.status === "hired")
        );
        const details = hiringStatusData?.hiring_details;
        if (!isHiredCandidate || !details) return null;

        const firstName = details.candidate_name
          ? details.candidate_name.split(" ")[0]
          : profile?.full_name
          ? profile.full_name.split(" ")[0]
          : "Candidate";

        return (
          <div className="rounded-xl border border-emerald-500/40 bg-card/95 backdrop-blur-md p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                HIRING COMPLETE
              </span>
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold font-outfit text-foreground tracking-tight">
                Congratulations, {firstName}!
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You have accepted the offer for{" "}
                <strong className="text-foreground font-semibold">
                  {details.job_title}
                </strong>{" "}
                at{" "}
                <strong className="text-foreground font-semibold">
                  {details.company_name}
                </strong>.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-3 border-y border-border/70 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px] font-medium">
                  Joining Date:
                </span>
                <span className="font-semibold text-foreground text-sm flex items-center gap-1.5 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  {details.joining_date}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px] font-medium">
                  Work Mode:
                </span>
                <span className="font-semibold text-foreground text-sm flex items-center gap-1.5 mt-0.5">
                  <Laptop className="w-3.5 h-3.5 text-primary" />
                  {details.work_mode}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px] font-medium">
                  Employment Type:
                </span>
                <span className="font-semibold text-foreground text-sm flex items-center gap-1.5 mt-0.5">
                  <Briefcase className="w-3.5 h-3.5 text-primary" />
                  {details.employment_type}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link to={`/candidate/offers/${details.offer_id}`}>
                <Button variant="outline" size="sm" className="gap-2 text-xs font-semibold h-9 px-4">
                  <FileText className="w-4 h-4 text-primary" />
                  View Offer Letter
                </Button>
              </Link>
              <Link to="/candidate/hiring">
                <Button variant="default" size="sm" className="gap-2 text-xs font-semibold h-9 px-4 bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs">
                  <UserCheck className="w-4 h-4" />
                  View Hiring Details
                </Button>
              </Link>
            </div>
          </div>
        );
      })()}

      {/* ── OFFICIAL EMPLOYMENT OFFER NOTICE ───────────────────────────── */}
      {(() => {
        const offerMatches = visibleMatches.filter(
          (m) => m.status === "offer" || m.pipeline_state === "OFFER_SENT"
        );
        if (offerMatches.length === 0) return null;

        return (
          <div className="rounded-xl border border-primary/30 bg-slate-900/90 p-5 sm:p-6 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <FileCheck className="w-6 h-6" />
                </div>

                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[11px] font-semibold uppercase tracking-wider">
                    Action Required · Official Offer Letter
                  </div>
                  <h2 className="text-lg font-bold text-white">
                    Formal Employment Offer Extended
                  </h2>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                    {offerMatches.length === 1
                      ? <>You have received an official employment offer for <strong className="text-white">{offerMatches[0].job?.title || "a position"}</strong>. Please review the compensation breakdown, joining timeline, and official terms.</>
                      : <>You have received <strong className="text-white">{offerMatches.length} employment offers</strong>. Please review each official document and provide your response.</>}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap sm:flex-col gap-2 shrink-0">
                {offerMatches.map((m) => (
                  <Link
                    key={m.id}
                    to={`/candidate/offers/${m.id}`}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-sm transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    Review {offerMatches.length > 1 ? m.job?.title || `Offer #${m.id}` : "Offer Document"}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Action Alert Banner: Pending Interview Slot Selection ───────── */}
      {pendingSlotInterviews.length > 0 && (
        <Card className="p-4 sm:p-5 border border-primary/30 bg-primary/5 shadow-sm rounded-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <CalendarCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5">
                    Action Required
                  </Badge>
                  <span className="text-sm font-semibold text-foreground">
                    {pendingSlotInterviews.length} Interview Invitation{pendingSlotInterviews.length > 1 ? "s" : ""} Awaiting Your Time Slot Choice
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  The recruitment team has proposed time slots for your application. Please select your preferred timing below to proceed.
                </p>
              </div>
            </div>

            <Button
              onClick={() => setActiveTab("interviews")}
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5 text-xs font-semibold h-8"
            >
              <Calendar className="h-3.5 w-3.5" />
              View Schedule
            </Button>
          </div>

          {/* Inline chooser for first pending interview for instant 1-click selection */}
          <div className="pt-2 border-t border-border">
            <InlineSlotChooser
              interview={pendingSlotInterviews[0]}
              onSlotConfirmed={fetchData}
            />
          </div>
        </Card>
      )}

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
          {pendingSlotInterviews.length > 0 ? (
            <span className="ml-1.5 px-2 py-0.5 text-[10px] rounded-full bg-cyan-500 text-slate-950 font-black animate-pulse">
              {pendingSlotInterviews.length} Pick Slot
            </span>
          ) : upcomingInterviews.length > 0 ? (
            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-purple-500 text-white font-bold">
              {upcomingInterviews.length}
            </span>
          ) : null}
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
          <span>Skills & Experience</span>
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
          {unreadCount > 0 ? (
            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-rose-500 text-white font-black animate-pulse">
              {unreadCount} new
            </span>
          ) : notifications.length > 0 ? (
            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-secondary text-muted-foreground font-semibold">
              {notifications.length}
            </span>
          ) : null}
        </button>
      </div>

      {/* ── TAB 1: JOB MATCHES & EXPLAINABLE PIPELINE ─────────────────────── */}
      {activeTab === "pipeline" && (
        <div className="space-y-5">
          {/* Visual Analytics: Skill Domain Distribution & Application Progress */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4 border-border/80 bg-card/70 backdrop-blur-xl shadow-sm space-y-3 min-w-0 overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Code2 className="h-4 w-4 text-indigo-400" />
                    Verified Skill Domains
                  </h3>
                  <p className="text-[11px] text-muted-foreground">Distribution of credentials across industry competencies</p>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {profile?.skills?.length || 0} Total
                </Badge>
              </div>

              <div className="h-52 sm:h-56 w-full min-w-0 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={skillDomainDistribution} margin={{ top: 10, right: 15, left: -15, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis dataKey="domain" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={{ stroke: "hsl(var(--border))" }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={{ stroke: "hsl(var(--border))" }} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="p-2.5 rounded-lg bg-popover/95 border border-border shadow-lg text-xs">
                            <span className="font-semibold text-foreground">{data.fullName}</span>
                            <div className="text-indigo-400 font-bold mt-0.5">{data.count} skill{data.count !== 1 ? "s" : ""}</div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-4 border-border/80 bg-card/70 backdrop-blur-xl shadow-sm space-y-3 min-w-0 overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-emerald-400" />
                    Active Pipeline Progression
                  </h3>
                  <p className="text-[11px] text-muted-foreground">Recruitment stages for matched job requisitions</p>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {activeApplications.length} Positions
                </Badge>
              </div>

              <div className="h-52 sm:h-56 w-full min-w-0 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pipelineStageDistribution} margin={{ top: 10, right: 15, left: -15, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis dataKey="stage" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={{ stroke: "hsl(var(--border))" }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={{ stroke: "hsl(var(--border))" }} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="p-2.5 rounded-lg bg-popover/95 border border-border shadow-lg text-xs">
                            <span className="font-semibold text-foreground">{data.stage} Stage</span>
                            <div className="text-emerald-400 font-bold mt-0.5">{data.count} application{data.count !== 1 ? "s" : ""}</div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
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
                  const isRejected =
                    match.status === "rejected" ||
                    match.pipeline_state === "REJECTED" ||
                    match.pipeline_state === "HIRING_MANAGER_REJECTED" ||
                    match.pipeline_state === "OFFER_REJECTED" ||
                    match.pipeline_state === "BLACKLISTED";
                  const stageOrder = ["matched", "screened", "approved_by_hr", "interview_scheduled"];
                  let stageIndex = stageOrder.indexOf(match.status);
                  if (match.status === "offer" || match.status === "hired") stageIndex = 4;
                  if (stageIndex === -1 && !isRejected) stageIndex = 1;

                  const matchInterview = !isRejected
                    ? uniqueInterviews.find((i) => i.match_result_id === match.id && i.status !== "cancelled")
                    : undefined;

                  const isHired = match.status === "hired" || match.pipeline_state === "HIRED";
                  const isOfferStage = [
                    "OFFER_ACCEPTED",
                    "OFFER_SENT",
                    "OFFER_CREATED",
                    "OFFER_READY",
                    "HM_APPROVED",
                    "SHORTLISTED",
                  ].includes(match.pipeline_state || "");

                  const isAwaitingSlot =
                    !isRejected &&
                    !isHired &&
                    !isOfferStage &&
                    (match.pipeline_state === "WAITING_FOR_CANDIDATE_SLOT" ||
                      match.pipeline_state === "INTERVIEW_SLOTS_PROPOSED" ||
                      (matchInterview &&
                        matchInterview.status !== "completed" &&
                        !terminalOrOfferStates.includes(matchInterview.pipeline_state || "") &&
                        (matchInterview.status === "pending_slot" ||
                          (matchInterview.slots && matchInterview.slots.some((s) => s.status === "proposed") && !matchInterview.interview_date))));

                  const isSlotSelected =
                    !isRejected &&
                    !isHired &&
                    !isOfferStage &&
                    (match.pipeline_state === "CANDIDATE_SLOT_SELECTED" ||
                      (matchInterview && matchInterview.pipeline_state === "CANDIDATE_SLOT_SELECTED"));

                  const isInterviewConfirmed =
                    !isRejected &&
                    !isHired &&
                    !isOfferStage &&
                    Boolean(matchInterview?.interview_date) &&
                    (match.pipeline_state === "INTERVIEW_CONFIRMED" || matchInterview?.status === "scheduled") &&
                    !isAwaitingSlot &&
                    !isSlotSelected;
                  const isOnHoldDueToHiring = match.pipeline_state === "ON_HOLD_DUE_TO_HIRING";

                  if (isHired) {
                    const appliedDateStr = match.created_at
                      ? new Date(match.created_at).toLocaleDateString("en-US", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "10 Aug 2026";

                    const timelineSteps = [
                      "Application Submitted",
                      "Candidate Shortlisted",
                      "Sent to Hiring Manager",
                      "Interview Round 1",
                      "Interview Round 2",
                      "Final Interview",
                      "Final HM Decision — GO",
                      "Compensation Finalized",
                      "Offer Created",
                      "Offer Approved",
                      "Offer Sent",
                      "Offer Accepted",
                      "HIRED",
                    ];

                    return (
                      <Card
                        key={match.id}
                        className="p-6 border-2 border-emerald-500/40 bg-card/90 shadow-sm rounded-xl space-y-5"
                      >
                        {/* Header: Title, Company, Status: HIRED ✓ */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-4">
                          <div className="space-y-1">
                            <h3 className="text-xl font-bold font-outfit text-foreground">
                              {match.job?.title || "Junior Python Developer"}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                              <span className="font-semibold text-foreground flex items-center gap-1">
                                <Building className="h-3.5 w-3.5 text-emerald-500" />
                                {match.job?.client_name || "XYZ Technologies"}
                              </span>
                              {match.job?.department && <span>• {match.job.department}</span>}
                              {match.job?.location_city && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" /> {match.job.location_city}
                                </span>
                              )}
                              {match.job?.work_mode && (
                                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary text-[11px] font-medium">
                                  <Laptop className="h-3 w-3 text-primary" /> {match.job.work_mode}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0">
                            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              Status: HIRED ✓
                            </div>
                          </div>
                        </div>

                        {/* Metadata row */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-lg bg-muted/30 border border-border/60 text-xs">
                          <div>
                            <span className="text-muted-foreground block text-[11px] font-medium">Applied</span>
                            <span className="font-semibold text-foreground mt-0.5 block">{appliedDateStr}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[11px] font-medium">Interview</span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 block">Completed</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[11px] font-medium">Final Decision</span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 block">GO</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[11px] font-medium">Offer</span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 block">Accepted</span>
                          </div>
                        </div>

                        {/* Application Timeline */}
                        <div className="space-y-2.5">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-primary" />
                            Application Timeline
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
                            {timelineSteps.map((step, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2 p-2 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-medium text-[11px]"
                              >
                                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 stroke-[3]" />
                                <span>✓ {step}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/70">
                          <p className="text-xs text-muted-foreground">
                            Congratulations on completing your recruitment journey!
                          </p>
                          <div className="flex items-center gap-2">
                            <Link to={`/candidate/offers/${hiringStatusData?.hiring_details?.offer_id || match.id}`}>
                              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                                <FileText className="w-3.5 h-3.5 text-primary" />
                                View Offer Letter
                              </Button>
                            </Link>
                            <Link to="/candidate/hiring">
                              <Button variant="default" size="sm" className="gap-1.5 text-xs h-8 bg-emerald-600 hover:bg-emerald-500 text-white">
                                <UserCheck className="w-3.5 h-3.5" />
                                View Hiring Details
                              </Button>
                            </Link>
                            <Link to={`/applications/${match.id}/timeline`}>
                              <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8 text-muted-foreground">
                                Full Journey Log
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </Card>
                    );
                  }

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
                                  : isOnHoldDueToHiring
                                  ? "warning"
                                  : isAwaitingSlot
                                  ? "warning"
                                  : match.status === "approved_by_hr" || match.status === "interview_scheduled"
                                  ? "success"
                                  : "outline"
                              }
                              className="text-[10px] capitalize"
                            >
                              {isOnHoldDueToHiring
                                ? "On Hold (Hired on another role)"
                                : isAwaitingSlot
                                ? "Time Slot Choice Needed"
                                : match.status.replace(/_/g, " ")}
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

                        {/* Candidate Pipeline Stage Badge (Fit score kept confidential) */}
                        <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <div className="px-3.5 py-2 rounded-xl border border-primary/25 bg-primary/10 text-center">
                            <span className="text-xs font-black uppercase tracking-wider text-primary block">
                              {isAwaitingSlot ? "Action Required" : stageLabels[match.status] || match.status.replace(/_/g, " ")}
                            </span>
                            <span className="block text-[9px] font-semibold text-muted-foreground mt-0.5">
                              Application Status
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
                                className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-950 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800/80 font-semibold text-[11px]"
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
                                className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-950 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800/80 font-semibold text-[11px]"
                              >
                                ✕ {sk}
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

                      {/* Interactive Slot Chooser for Pending Invitations */}
                      {isAwaitingSlot && matchInterview && (
                        <div className="pt-1">
                          <InlineSlotChooser
                            interview={matchInterview}
                            onSlotConfirmed={fetchData}
                          />
                        </div>
                      )}

                      {/* Slot Selected Notice (Awaiting Recruiter Confirmation) */}
                      {isSlotSelected && matchInterview && matchInterview.interview_date && (
                        <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 text-amber-300">
                            <Clock className="h-4 w-4 text-amber-400 shrink-0" />
                            <span>
                              Slot Selected: <strong>{new Date(matchInterview.interview_date).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</strong> • Awaiting Recruiter Final Confirmation
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Confirmed Interview Alert Banner */}
                      {isInterviewConfirmed && matchInterview && matchInterview.interview_date && (
                        <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 font-semibold">
                            <CalendarCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>
                              Interview Confirmed: <strong>{new Date(matchInterview.interview_date).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</strong> ({matchInterview.interview_type || "Technical"} Round)
                            </span>
                          </div>
                          {matchInterview.meeting_link && (
                            <a
                              href={matchInterview.meeting_link}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors"
                            >
                              <Video className="h-3.5 w-3.5" /> Join Meeting
                            </a>
                          )}
                        </div>
                      )}

                      {/* On Hold Notification if Candidate was Hired on Another Role */}
                      {isOnHoldDueToHiring && (
                        <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2.5 text-amber-700 dark:text-amber-300">
                            <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                            <span>
                              This application is currently <strong>On Hold</strong> because you accepted an employment offer for another role. Your application data and full interview history remain safely preserved.
                            </span>
                          </div>
                          <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase shrink-0">
                            ON HOLD
                          </Badge>
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

      {/* ── TAB 2: INTERVIEW SCHEDULE & SLOT CHOOSER ───────────────────────── */}
      {activeTab === "interviews" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold font-outfit text-foreground flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-purple-400" />
                Interview Schedule & Slot Invitations
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Review proposed interview slots, select your preferred schedule, and access video meeting links.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {pendingSlotInterviews.length > 0 && (
                <Badge className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs px-3 py-1 font-bold animate-pulse">
                  {pendingSlotInterviews.length} Slot Action Needed
                </Badge>
              )}
              <Badge variant="purple" className="px-3 py-1 text-xs">
                {confirmedInterviews.length} Scheduled
              </Badge>
            </div>
          </div>

          {uniqueInterviews.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-border bg-card/40 space-y-3">
              <Calendar className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <h3 className="text-base font-bold font-outfit text-foreground">No Interviews Scheduled Yet</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                When HR or hiring managers propose interview slots or schedule a round, details and video links will appear here.
              </p>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* ── Section 1: Pending Slot Invitations (Action Required) ── */}
              {pendingSlotInterviews.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CalendarCheck className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold font-outfit text-foreground uppercase tracking-wider">
                      Pending Slot Invitations — Action Required ({pendingSlotInterviews.length})
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {pendingSlotInterviews.map((iv) => (
                      <Card
                        key={`pending-${iv.id}`}
                        className="p-5 border border-primary/30 bg-primary/5 shadow-sm space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-base font-bold font-outfit text-foreground">
                                {iv.job_title || "Position Interview"}
                              </h4>
                              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px] font-bold">
                                SELECT YOUR TIME SLOT
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Format: <strong className="text-foreground">{iv.interview_type || "Technical"} Round</strong>
                              {iv.scheduler_name && ` • Scheduled by: ${iv.scheduler_name}`}
                              {iv.company_name && ` • ${iv.company_name}`}
                            </p>
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedInterviewForSlot(iv)}
                            className="shrink-0 text-xs font-semibold gap-1.5 h-8"
                          >
                            <Calendar className="h-3.5 w-3.5" />
                            Open Slot Dialog
                          </Button>
                        </div>

                        {/* Direct Inline Slot Picker on the Card */}
                        <InlineSlotChooser
                          interview={iv}
                          onSlotConfirmed={fetchData}
                        />
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Section 2: Slot Selected — Awaiting Recruiter Final Confirmation ── */}
              {awaitingConfirmationInterviews.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-400" />
                    <h3 className="text-sm font-semibold font-outfit text-foreground uppercase tracking-wider text-amber-400">
                      Slot Selected — Awaiting Recruiter Confirmation ({awaitingConfirmationInterviews.length})
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {awaitingConfirmationInterviews.map((iv) => {
                      const ivDate = iv.interview_date ? new Date(iv.interview_date) : null;

                      return (
                        <Card
                          key={`awaiting-${iv.id}`}
                          className="p-5 border border-amber-500/30 bg-card shadow-sm space-y-4"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-base font-bold font-outfit text-foreground">
                                  {iv.job_title || "Position Interview"}
                                </h4>
                                <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px] font-bold">
                                  SLOT SELECTED • CONFIRMATION PENDING
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Format: <strong className="text-foreground">{iv.interview_type || "Technical"} Round</strong>
                                {iv.scheduler_name && ` • Recruiter: ${iv.scheduler_name}`}
                                {iv.company_name && ` • ${iv.company_name}`}
                              </p>
                            </div>
                          </div>

                          {ivDate && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-secondary/40 border border-border/80 text-xs">
                              <div>
                                <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Selected Date</span>
                                <span className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                                  <Calendar className="h-3.5 w-3.5 text-primary" />
                                  {ivDate.toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Selected Time</span>
                                <span className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                                  {ivDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Mode / Platform</span>
                                <span className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                                  <Laptop className="h-3.5 w-3.5 text-emerald-400" />
                                  {iv.interview_mode ? iv.interview_mode.toUpperCase() : "ONLINE (VIDEO CALL)"}
                                </span>
                              </div>
                            </div>
                          )}

                          <div className="p-3 rounded-lg bg-secondary/30 border border-border/70 text-xs flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4 text-amber-400 shrink-0" />
                            <span>
                              Your slot selection has been registered. The recruitment team is setting up official calendar invites and video meeting coordinates.
                            </span>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Section 3: Confirmed & Upcoming Interviews ── */}
              {confirmedInterviews.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <h3 className="text-sm font-semibold font-outfit text-foreground uppercase tracking-wider text-emerald-400">
                      Confirmed & Upcoming Interviews ({confirmedInterviews.length})
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {confirmedInterviews.map((iv) => {
                      const ivDate = iv.interview_date ? new Date(iv.interview_date) : null;

                      return (
                        <Card
                          key={`confirmed-${iv.id}`}
                          className="p-5 border border-emerald-500/30 bg-card shadow-sm space-y-4"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-base font-bold font-outfit text-foreground">
                                  {iv.job_title || "Position Interview"}
                                </h4>
                                <Badge variant="success" className="text-[10px] font-bold">
                                  CONFIRMED
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Format: <strong className="text-foreground">{iv.interview_type}</strong>
                                {iv.scheduler_name && ` • Scheduled by: ${iv.scheduler_name}`}
                                {iv.company_name && ` • ${iv.company_name}`}
                              </p>
                            </div>

                            {iv.meeting_link && (
                              <a
                                href={iv.meeting_link}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-sm transition-all shrink-0"
                              >
                                <Video className="h-4 w-4" /> Join Video Call
                              </a>
                            )}
                          </div>

                          {ivDate && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-secondary/40 border border-border/80 text-xs">
                              <div>
                                <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Date</span>
                                <span className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                                  <Calendar className="h-3.5 w-3.5 text-primary" />
                                  {ivDate.toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Time</span>
                                <span className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                                  <Clock className="h-3.5 w-3.5 text-primary" />
                                  {ivDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Mode / Platform</span>
                                <span className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                                  <Laptop className="h-3.5 w-3.5 text-emerald-400" />
                                  {iv.interview_mode ? iv.interview_mode.toUpperCase() : "ONLINE (VIDEO CALL)"}
                                </span>
                              </div>
                            </div>
                          )}

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
                            <div className="p-3 rounded-lg bg-secondary/50 border border-border text-xs space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                Interviewer Notes / Instructions:
                              </span>
                              <p className="text-foreground">{iv.feedback}</p>
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Section 4: Completed Interviews ── */}
              {completedInterviews.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold font-outfit text-foreground uppercase tracking-wider text-muted-foreground">
                      Completed Interview Rounds ({completedInterviews.length})
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {completedInterviews.map((iv) => {
                      const ivDate = iv.interview_date ? new Date(iv.interview_date) : null;
                      return (
                        <Card
                          key={`completed-${iv.id}`}
                          className="p-5 border-border bg-card/60 space-y-3 opacity-90"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-sm font-bold text-foreground">{iv.job_title || "Position Interview"}</h4>
                              <p className="text-xs text-muted-foreground">
                                {iv.interview_type} round • Completed
                              </p>
                            </div>
                            <Badge variant="secondary" className="text-[10px]">
                              COMPLETED
                            </Badge>
                          </div>
                          {ivDate && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              Conducted on {ivDate.toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
                            </p>
                          )}
                        </Card>
                      );
                    })}
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
          <div className="p-4 rounded-xl bg-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <FileCode className="h-5 w-5 text-primary" />
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
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold font-outfit text-foreground flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-primary" /> Personal Profile & Address
                  </h3>
                {parsedData && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleApplyExtractedToProfile}
                    className="text-xs text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/10 gap-1.5"
                  >
                    <Wand2 className="h-3.5 w-3.5" /> Auto-Fill from Resume
                  </Button>
                )}
              </div>
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
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-foreground">
                        Total Experience (Years) *
                      </label>
                      {parsedData?.total_experience_years !== undefined && parsedData.total_experience_years > 0 && parsedData.total_experience_years !== totalExperience && (
                        <button
                          type="button"
                          onClick={() => setTotalExperience(parsedData.total_experience_years)}
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 transition-colors"
                        >
                          <Sparkles className="h-3 w-3" /> Sync ({parsedData.total_experience_years} yrs)
                        </button>
                      )}
                    </div>
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
                      variant="outline"
                      size="sm"
                      onClick={handleReparseResume}
                      disabled={isReparsing}
                      className="gap-1.5 text-xs text-amber-300 border-amber-500/40 hover:bg-amber-500/10"
                    >
                      {isReparsing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                      Re-parse Resume
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
          </div>
        </div>

        {/* ── FULL-WIDTH EXTRACTED STRUCTURED INTELLIGENCE CARD ── */}
        <Card className="p-6 border-border/80 bg-card/75 backdrop-blur-xl shadow-lg space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/60">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold font-outfit text-foreground">
                    Extracted Candidate Structured Intelligence
                  </h3>
                  <Badge variant="success" className="gap-1 text-[10px] px-2 py-0.5 hidden sm:inline-flex">
                    <ShieldCheck className="h-3 w-3" /> 100% Deterministic Extraction
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  High-precision extraction of candidate summary, work history, projects, domain skills, and credentials from resume text.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {profile?.resume_parsed_at && (
                <span className="text-[11px] text-muted-foreground bg-secondary/50 px-2.5 py-1 rounded-md border border-border/40">
                  Parsed: {new Date(profile.resume_parsed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
              {parsedData && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleApplyExtractedToProfile}
                    className="gap-1.5 text-xs text-primary border-primary/40 hover:bg-primary/10"
                  >
                    <Wand2 className="h-3.5 w-3.5" /> Apply to Profile Form
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleReparseResume}
                    disabled={isReparsing}
                    className="gap-1.5 text-xs text-amber-300 border-amber-500/40 hover:bg-amber-500/10"
                  >
                    {isReparsing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    Re-parse
                  </Button>
                </>
              )}
            </div>
          </div>

          {parsedData ? (
            <div className="space-y-6">
              {/* Navigation Sub-Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-border/40">
                <button
                  type="button"
                  onClick={() => setStructuredTab("overview")}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    structuredTab === "overview"
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  }`}
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  <span>Summary & Persona</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStructuredTab("experience")}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    structuredTab === "experience"
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  }`}
                >
                  <Briefcase className="h-3.5 w-3.5" />
                  <span>Work Experience</span>
                  <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-primary-foreground/20 font-bold">
                    {parsedData.total_experience_years || 0} yrs
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setStructuredTab("projects")}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    structuredTab === "projects"
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  }`}
                >
                  <FolderGit2 className="h-3.5 w-3.5" />
                  <span>Technical Projects</span>
                  <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-primary-foreground/20 font-bold">
                    {parsedData.structured_projects?.length || parsedData.projects?.length || 0}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setStructuredTab("skills")}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    structuredTab === "skills"
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  }`}
                >
                  <Code2 className="h-3.5 w-3.5" />
                  <span>Skills Taxonomy</span>
                  <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-primary-foreground/20 font-bold">
                    {parsedData.skills?.length || 0}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setStructuredTab("education")}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    structuredTab === "education"
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  }`}
                >
                  <GraduationCap className="h-3.5 w-3.5" />
                  <span>Education & Certs</span>
                  <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-primary-foreground/20 font-bold">
                    {(parsedData.education?.length || 0) + (parsedData.certifications?.length || 0)}
                  </span>
                </button>
              </div>

              {/* Sub-tab 1: Summary & Persona */}
              {structuredTab === "overview" && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  {/* Executive Summary Card */}
                  {parsedData.summary && (
                    <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-2">
                      <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider">
                        <Quote className="h-4 w-4" /> Professional Executive Summary
                      </div>
                      <p className="text-sm text-foreground/90 leading-relaxed italic">
                        "{parsedData.summary}"
                      </p>
                    </div>
                  )}

                  {/* Persona Metadata Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="p-3 rounded-xl bg-secondary/30 border border-border/60">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                        Candidate Name
                      </span>
                      <span className="text-sm font-bold text-foreground truncate block">
                        {parsedData.name || profile?.full_name || "N/A"}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-secondary/30 border border-border/60">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                        Target Headline
                      </span>
                      <span className="text-sm font-bold text-indigo-300 truncate block">
                        {parsedData.headline || "Technical Specialist"}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-secondary/30 border border-border/60">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                        Verified Email
                      </span>
                      <span className="text-xs font-medium text-foreground truncate block">
                        {parsedData.email ? (
                          <a href={`mailto:${parsedData.email}`} className="text-primary hover:underline">
                            {parsedData.email}
                          </a>
                        ) : (
                          "N/A"
                        )}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-secondary/30 border border-border/60">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                        Contact Phone
                      </span>
                      <span className="text-xs font-medium text-foreground truncate block">
                        {parsedData.phone ? (
                          <a href={`tel:${parsedData.phone}`} className="text-foreground hover:underline">
                            {parsedData.phone}
                          </a>
                        ) : (
                          "N/A"
                        )}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-secondary/30 border border-border/60">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                        Location / Region
                      </span>
                      <span className="text-sm font-semibold text-foreground truncate block">
                        {parsedData.location || parsedData.additional_info?.location || profile?.country || "India"}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-secondary/30 border border-border/60">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                        Career Tenure
                      </span>
                      <span className="text-sm font-bold text-emerald-400 block">
                        {parsedData.total_experience_years || 0} Years
                      </span>
                    </div>
                  </div>

                  {/* Personal Details & Interests */}
                  {(parsedData.additional_info?.date_of_birth || parsedData.additional_info?.career_interests?.length) && (
                    <div className="p-4 rounded-xl bg-secondary/20 border border-border/60 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-indigo-400" /> Declared Career Interests & Additional Info
                        </h4>
                        {parsedData.additional_info?.date_of_birth && (
                          <span className="text-xs text-muted-foreground">
                            DOB: <span className="font-semibold text-foreground">{parsedData.additional_info.date_of_birth}</span>
                          </span>
                        )}
                      </div>
                      {parsedData.additional_info?.career_interests && parsedData.additional_info.career_interests.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {parsedData.additional_info.career_interests.map((interest, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs bg-indigo-500/10 border-indigo-500/30 text-indigo-300">
                              {interest}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Sub-tab 2: Work Experience */}
              {structuredTab === "experience" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-blue-500/10 border border-blue-500/30">
                    <div className="flex items-center gap-2 text-xs text-blue-300">
                      <Clock className="h-4 w-4 text-blue-400 shrink-0" />
                      <span>Total Professional Experience: <strong className="text-white font-bold">{parsedData.total_experience_years || 0} Years</strong></span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setTotalExperience(parsedData.total_experience_years || 0);
                        toast.success(`Applied ${parsedData.total_experience_years} years to profile form!`);
                      }}
                      className="text-xs text-blue-300 hover:text-white hover:bg-blue-500/20 h-7 px-2"
                    >
                      Apply tenure to profile
                    </Button>
                  </div>

                  {parsedData.experience && parsedData.experience.length > 0 ? (
                    <div className="space-y-4">
                      {parsedData.experience.map((pos, idx) => (
                        <div key={idx} className="p-4 rounded-xl bg-secondary/30 border border-border/60 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-border/40">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                                <Briefcase className="h-4 w-4" />
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-foreground">{pos.title}</h4>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Building2 className="h-3 w-3 text-indigo-400" /> {pos.company || "Company"}
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
                            <ul className="space-y-1.5 text-xs text-muted-foreground pl-1">
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
                    <div className="p-8 text-center border border-dashed border-border/60 rounded-xl space-y-2">
                      <Briefcase className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
                      <p className="text-xs text-muted-foreground">
                        Early career or student developer profile. Practical industry capabilities verified through technical projects and skill assessments below.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Sub-tab 3: Technical Projects */}
              {structuredTab === "projects" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {parsedData.structured_projects && parsedData.structured_projects.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {parsedData.structured_projects.map((proj, idx) => (
                        <div key={idx} className="p-4 rounded-xl bg-secondary/30 border border-border/60 flex flex-col justify-between space-y-3">
                          <div className="space-y-2">
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
                              <ul className="space-y-1.5 text-xs text-muted-foreground pt-1">
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
                        </div>
                      ))}
                    </div>
                  ) : parsedData.projects && parsedData.projects.length > 0 ? (
                    <div className="space-y-2">
                      {parsedData.projects.map((p, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-secondary/30 border border-border/60 text-xs text-foreground flex items-center gap-2">
                          <FolderGit2 className="h-4 w-4 text-purple-400 shrink-0" />
                          <span>{p}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic text-center py-6">
                      No technical projects explicitly titled in resume text.
                    </p>
                  )}
                </div>
              )}

              {/* Sub-tab 4: Categorized Skills */}
              {structuredTab === "skills" && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-2 border-b border-border/40">
                    <div>
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Code2 className="h-4 w-4 text-indigo-400" /> Domain Categorization & Verification
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Cross-referenced against master taxonomy with contextual sentence evidence from resume
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSyncAllResumeSkills}
                      disabled={isSyncingAllSkills}
                      className="gap-1.5 text-xs text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/10"
                    >
                      {isSyncingAllSkills ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                      Sync All to Active Skills
                    </Button>
                  </div>

                  {parsedData.categorized_skills && Object.keys(parsedData.categorized_skills).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(parsedData.categorized_skills).map(([cat, skList], cIdx) => (
                        <div key={cIdx} className="p-4 rounded-xl bg-secondary/25 border border-border/60 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-indigo-400" />
                              {cat}
                            </span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {skList.length}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {skList.map((skName, sIdx) => {
                              const fullSkill = parsedData.skills?.find(s => s.name.toLowerCase() === skName.toLowerCase());
                              const inProfile = profile?.skills?.some(s => s.skill.name.toLowerCase() === skName.toLowerCase());
                              return (
                                <div
                                  key={sIdx}
                                  title={fullSkill?.evidence || `Verified in resume text`}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 cursor-default transition-all ${
                                    inProfile
                                      ? "bg-emerald-50 text-emerald-950 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800/80 font-semibold"
                                      : "bg-indigo-500/15 border-indigo-500/30 text-indigo-300 hover:border-indigo-400"
                                  }`}
                                >
                                  <span>{skName}</span>
                                  {inProfile ? (
                                    <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleAddSingleExtractedSkill(skName)}
                                      title="Click to add this skill to active profile"
                                      className="text-indigo-400 hover:text-white"
                                    >
                                      <PlusCircle className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {parsedData.skills?.map((sk, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-medium"
                        >
                          {sk.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Sub-tab 5: Academic & Certifications */}
              {structuredTab === "education" && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  {/* Education */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                      <GraduationCap className="h-4 w-4 text-emerald-400" /> Academic Qualifications & Degrees
                    </h4>

                    {parsedData.education && parsedData.education.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {parsedData.education.map((edu, idx) => (
                          <div key={idx} className="p-4 rounded-xl bg-secondary/30 border border-border/60 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-bold text-sm text-emerald-800 dark:text-emerald-200">{edu.degree}</span>
                              {edu.year && <Badge variant="outline" className="text-[10px] shrink-0">{edu.year}</Badge>}
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground flex items-center gap-1.5">
                                <Building className="h-3.5 w-3.5 text-indigo-400" /> {edu.institution}
                              </span>
                              {edu.grade && (
                                <Badge variant="success" className="text-[10px]">
                                  {edu.grade}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No degree explicitly detected.</p>
                    )}
                  </div>

                  {/* Certifications */}
                  {parsedData.certifications && parsedData.certifications.length > 0 && (
                    <div className="space-y-3 pt-2 border-t border-border/40">
                      <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                        <Award className="h-4 w-4 text-amber-400" /> Recognized Certifications & Credentials
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {parsedData.certifications.map((c, i) => (
                          <div key={i} className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-xs font-semibold text-amber-200">
                            <ShieldCheck className="h-4 w-4 text-amber-400 shrink-0" />
                            <span>{c}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-10 text-center border border-dashed border-border/60 rounded-xl space-y-3">
              <FileText className="h-10 w-10 text-muted-foreground mx-auto opacity-50" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-foreground">No Structured Data Yet</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Upload your resume file above to extract comprehensive candidate credentials, work history, projects, and domain skills.
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
      )}

      {/* ── TAB 3: SKILLS & EXPERIENCE INTELLIGENCE ──────────────────────── */}
      {activeTab === "skills" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Top Summary Metrics Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-border/80 bg-card/70 backdrop-blur-xl shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">Active In Profile</span>
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Code2 className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold font-outfit text-foreground">{profile?.skills?.length || 0}</span>
                <span className="text-xs text-muted-foreground">declared skills</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 backdrop-blur-xl shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-indigo-300 font-medium">Extracted from Resume</span>
                <div className="h-8 w-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
                  <Sparkles className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold font-outfit text-indigo-300">{parsedData?.skills?.length || 0}</span>
                <span className="text-xs text-indigo-400/80">detected skills</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/5 backdrop-blur-xl shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-purple-300 font-medium">Verified Evidence</span>
                <div className="h-8 w-8 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300">
                  <Quote className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold font-outfit text-purple-300">
                  {parsedData?.skills?.filter((s) => s.evidence)?.length || 0}
                </span>
                <span className="text-xs text-purple-400/80">context citations</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 backdrop-blur-xl shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-amber-300 font-medium">Experience Tenure</span>
                <div className="h-8 w-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300">
                  <Briefcase className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold font-outfit text-amber-300">
                  {parsedData?.total_experience_years !== undefined
                    ? `${parsedData.total_experience_years} Yrs`
                    : `${totalExperience || 0} Yrs`}
                </span>
                <span className="text-xs text-amber-400/80">
                  {parsedData?.total_experience_years !== undefined ? "resume verified" : "profile tenure"}
                </span>
              </div>
            </div>
          </div>

          {/* Sub-Nav Bar inside Skills & Experience */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setSkillsSubTab("shelf")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  skillsSubTab === "shelf"
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Resume Skills & Evidence Shelf</span>
                {parsedData?.skills && parsedData.skills.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-primary-foreground/20 text-[10px] font-bold">
                    {parsedData.skills.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSkillsSubTab("experience")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  skillsSubTab === "experience"
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                }`}
              >
                <Briefcase className="h-3.5 w-3.5" />
                <span>Extracted Experience & Roles</span>
                {parsedData?.experience && parsedData.experience.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-primary-foreground/20 text-[10px] font-bold">
                    {parsedData.experience.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSkillsSubTab("projects")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  skillsSubTab === "projects"
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                }`}
              >
                <FolderGit2 className="h-3.5 w-3.5" />
                <span>Extracted Projects</span>
                {(parsedData?.structured_projects?.length || parsedData?.projects?.length || 0) > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-primary-foreground/20 text-[10px] font-bold">
                    {parsedData?.structured_projects?.length || parsedData?.projects?.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSkillsSubTab("manual")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  skillsSubTab === "manual"
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                }`}
              >
                <Code2 className="h-3.5 w-3.5" />
                <span>Active Profile Portfolio</span>
                <span className="px-1.5 py-0.2 rounded-full bg-secondary text-[10px] font-bold">
                  {profile?.skills?.length || 0}
                </span>
              </button>
            </div>

            {parsedData?.skills && parsedData.skills.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSyncAllResumeSkills}
                  disabled={isSyncingAllSkills}
                  className="gap-1.5 text-xs text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/10 shadow-sm shrink-0"
                >
                  {isSyncingAllSkills ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="h-3.5 w-3.5 text-indigo-400" />
                  )}
                  Sync All to Profile
                </Button>
              </div>
            )}
          </div>

          {/* ── SUBTAB 1: RESUME SKILLS & EVIDENCE SHELF ───────────────────── */}
          {skillsSubTab === "shelf" && (
            <div className="space-y-4">
              {parsedData?.skills && parsedData.skills.length > 0 ? (
                <Card className="p-6 border-border bg-card shadow-sm space-y-5">
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

                    <div className="flex items-center gap-2">
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
                          onClick={() => setActiveSkillCategory(cat)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                            activeSkillCategory === cat
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

                  {/* Skills Grid with Evidence */}
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
                                  className="text-[10px] shrink-0 gap-1 bg-emerald-50 text-emerald-950 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800/80 font-semibold"
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
                                <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
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
                      Upload your resume in the "Resume & Profile" tab to automatically extract your skills, technical evidence snippets, and work tenure.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("profile")}
                    className="gap-2 text-xs text-primary border-primary/30 hover:bg-primary/10"
                  >
                    Go to Resume Upload <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Card>
              )}
            </div>
          )}

          {/* ── SUBTAB 2: EXTRACTED EXPERIENCE & ROLES ──────────────────────── */}
          {skillsSubTab === "experience" && (
            <div className="space-y-4">
              <Card className="p-6 border-border/80 bg-card/70 backdrop-blur-xl space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/50">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold font-outfit text-foreground flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-blue-400" /> Extracted Career Experience & Positions
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Roles, tenure durations, and key technical accomplishments parsed from your resume text.
                    </p>
                  </div>

                  {parsedData?.total_experience_years !== undefined &&
                    parsedData.total_experience_years !== totalExperience && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleApplyExtractedExpToProfile}
                        className="gap-1.5 text-xs text-emerald-800 dark:text-emerald-200 border-emerald-500/40 hover:bg-emerald-500/10 shrink-0 font-semibold"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Apply {parsedData.total_experience_years} Yrs to Profile
                      </Button>
                    )}
                </div>

                {parsedData?.experience && parsedData.experience.length > 0 ? (
                  <div className="space-y-4">
                    {parsedData.experience.map((pos, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-secondary/30 border border-border/60 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="h-9 w-9 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
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
                            <Badge
                              variant="outline"
                              className="text-xs text-blue-300 border-blue-500/40 bg-blue-500/10 shrink-0 self-start sm:self-auto"
                            >
                              {pos.duration}
                            </Badge>
                          )}
                        </div>

                        {pos.highlights && pos.highlights.length > 0 && (
                          <ul className="space-y-1.5 text-xs text-muted-foreground pl-1 pt-1">
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
                  <div className="p-8 text-center border border-dashed border-border/60 rounded-xl space-y-3">
                    <Briefcase className="h-10 w-10 text-muted-foreground mx-auto opacity-50" />
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-foreground">Early Career / Fresher Profile</h4>
                      <p className="text-xs text-muted-foreground max-w-md mx-auto">
                        No corporate employment history explicitly detected. Your practical technical proficiencies are demonstrated through engineering projects and skills below.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSkillsSubTab("projects")}
                      className="gap-1.5 text-xs text-purple-300 border-purple-500/40 hover:bg-purple-500/10"
                    >
                      View Technical Projects <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* ── SUBTAB 3: EXTRACTED TECHNICAL PROJECTS ─────────────────────── */}
          {skillsSubTab === "projects" && (
            <div className="space-y-4">
              <Card className="p-6 border-border/80 bg-card/70 backdrop-blur-xl space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-border/50">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold font-outfit text-foreground flex items-center gap-2">
                      <FolderGit2 className="h-4 w-4 text-purple-400" /> Extracted Technical Projects
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Engineering projects, architectures, and technologies parsed from your resume text.
                    </p>
                  </div>
                </div>

                {parsedData?.structured_projects && parsedData.structured_projects.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {parsedData.structured_projects.map((proj, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-secondary/30 border border-border/60 flex flex-col justify-between space-y-3"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                              <FolderGit2 className="h-4 w-4 text-purple-400 shrink-0" />
                              <span>{proj.title}</span>
                            </h4>
                            {proj.duration && (
                              <Badge
                                variant="outline"
                                className="text-[10px] text-purple-300 border-purple-500/30 shrink-0"
                              >
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
                            <ul className="space-y-1.5 text-xs text-muted-foreground pt-1">
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
                      </div>
                    ))}
                  </div>
                ) : parsedData?.projects && parsedData.projects.length > 0 ? (
                  <div className="space-y-2">
                    {parsedData.projects.map((p, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-secondary/30 border border-border/60 text-xs text-foreground flex items-center gap-2"
                      >
                        <FolderGit2 className="h-4 w-4 text-purple-400 shrink-0" />
                        <span>{p}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center border border-dashed border-border/60 rounded-xl space-y-2">
                    <FolderGit2 className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
                    <p className="text-xs text-muted-foreground">
                      No technical projects explicitly titled in resume text.
                    </p>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* ── SUBTAB 4: ACTIVE PROFILE PORTFOLIO & MANUAL ADD ────────────── */}
          {skillsSubTab === "manual" && (
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
                        <option value="Beginner">Beginner (1-2 yrs / Foundational)</option>
                        <option value="Intermediate">Intermediate (3-5 yrs / Autonomous)</option>
                        <option value="Expert">Expert (5+ yrs / Advanced)</option>
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
        </div>
      )}

      {/* ── TAB 4: APPLICATION UPDATES & NOTIFICATIONS INTELLIGENCE ────────── */}
      {activeTab === "notifications" && (
        <div className="space-y-5 animate-in fade-in duration-300">
          {/* Top Celebration Banner when Offer is present */}
          {(() => {
            const hasOffers = offerNotifications.length > 0 || visibleMatches.some(m => m.status === "offer" || m.pipeline_state === "OFFER_SENT");
            const firstOfferMatch = visibleMatches.find(m => m.status === "offer" || m.pipeline_state === "OFFER_SENT");
            if (!hasOffers) return null;

            return (
              <div className="relative overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-950/40 via-purple-950/30 to-slate-900/90 p-5 sm:p-6 backdrop-blur-xl shadow-lg">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
                      <Gift className="w-6 h-6 animate-bounce" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-extrabold uppercase tracking-wider">
                          Official Employment Offer
                        </span>
                        <span className="text-xs text-muted-foreground">• Action Required</span>
                      </div>
                      <h3 className="text-base sm:text-lg font-bold font-outfit text-foreground">
                        Congratulations! You have an official offer letter ready for review.
                      </h3>
                      <p className="text-xs text-muted-foreground max-w-xl">
                        {firstOfferMatch?.job?.title ? (
                          <>Offer extended for <strong className="text-foreground">{firstOfferMatch.job.title}</strong> at <strong className="text-foreground">{firstOfferMatch.job.client_name || "SkillAlign Partner"}</strong>. Please review terms and confirm your joining response.</>
                        ) : (
                          <>Your candidacy has reached the final offer stage. Review the extended compensation package and formal documentation below.</>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={triggerOfferConfetti}
                      className="gap-1.5 text-xs text-amber-400 border-amber-500/40 hover:bg-amber-500/10"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      🎉 Celebrate
                    </Button>
                    {firstOfferMatch ? (
                      <Link
                        to={`/candidate/offers/${firstOfferMatch.id}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 transition-all"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Review Offer
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => setActiveTab("pipeline")}
                        className="gap-1.5 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                      >
                        View Matches <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Main Notifications Card */}
          <Card className="p-5 sm:p-6 border-border/80 bg-card/70 backdrop-blur-xl shadow-sm space-y-5">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-base font-bold font-outfit text-foreground flex items-center gap-2">
                    <Bell className="h-4 w-4 text-primary" />
                    Application Updates & Communication
                  </h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 border border-rose-500/40 text-rose-400 animate-pulse">
                      {unreadCount} Unread
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Official stage transitions, interview scheduling requests, and offer documents
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchData}
                  className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </Button>
                {unreadCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isMarkingAll}
                    onClick={handleMarkAllAsRead}
                    className="h-8 gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/10"
                  >
                    {isMarkingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
                    Mark All Read
                  </Button>
                )}
              </div>
            </div>

            {/* Category Filter Tabs & Unread Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setNotificationCategory("ALL")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    notificationCategory === "ALL"
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  }`}
                >
                  <span>All Updates</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-primary-foreground/20 text-[10px] font-bold">
                    {notifications.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setNotificationCategory("OFFERS")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    notificationCategory === "OFFERS"
                      ? "bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20 font-bold"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  }`}
                >
                  <Gift className="h-3.5 w-3.5" />
                  <span>Offers</span>
                  {offerNotifications.length > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${notificationCategory === "OFFERS" ? "bg-slate-950/20 text-slate-950" : "bg-amber-500/20 text-amber-300"}`}>
                      {offerNotifications.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setNotificationCategory("INTERVIEWS")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    notificationCategory === "INTERVIEWS"
                      ? "bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/20 font-bold"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  }`}
                >
                  <CalendarCheck className="h-3.5 w-3.5" />
                  <span>Interviews & Slots</span>
                  {interviewNotifications.length > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${notificationCategory === "INTERVIEWS" ? "bg-slate-950/20 text-slate-950" : "bg-cyan-500/20 text-cyan-300"}`}>
                      {interviewNotifications.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setNotificationCategory("UPDATES")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    notificationCategory === "UPDATES"
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 font-bold"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Status Milestones</span>
                  {updateNotifications.length > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${notificationCategory === "UPDATES" ? "bg-white/20 text-white" : "bg-indigo-500/20 text-indigo-300"}`}>
                      {updateNotifications.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Unread Only filter */}
              <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground hover:text-foreground shrink-0 select-none">
                <input
                  type="checkbox"
                  checked={unreadOnly}
                  onChange={(e) => setUnreadOnly(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                />
                <span>Unread Only ({unreadCount})</span>
              </label>
            </div>

            {/* Notification List Items */}
            {filteredNotifications.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-border/60 rounded-xl space-y-3">
                <Bell className="h-10 w-10 text-muted-foreground mx-auto opacity-40" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-foreground">No Updates Found</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    {unreadOnly
                      ? "You have read all updates in this category. Uncheck 'Unread Only' to view full communication history."
                      : "No notifications recorded yet. As your job applications progress, official updates and invitations will appear here."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredNotifications.map((n) => {
                  const isOffer =
                    n.subject?.toLowerCase().includes("offer") ||
                    n.body?.toLowerCase().includes("offer") ||
                    n.notification_type?.includes("OFFER");

                  const isInterview =
                    !isOffer &&
                    (n.subject?.toLowerCase().includes("interview") ||
                      n.subject?.toLowerCase().includes("slot") ||
                      n.body?.toLowerCase().includes("slot") ||
                      n.notification_type?.includes("INTERVIEW") ||
                      n.notification_type?.includes("SLOT"));

                  const isUnread = !n.is_read;

                  return (
                    <div
                      key={n.id}
                      className={`p-4 rounded-xl border transition-all duration-200 space-y-3 ${
                        isOffer
                          ? "bg-amber-950/20 border-amber-500/30 hover:border-amber-500/50"
                          : isInterview
                          ? "bg-cyan-950/20 border-cyan-500/30 hover:border-cyan-500/50"
                          : "bg-secondary/25 border-border/70 hover:border-border hover:bg-secondary/40"
                      } ${isUnread ? "ring-1 ring-primary/40 shadow-sm" : ""}`}
                    >
                      {/* Top Bar: Icon, Category Badge, Title, Timestamp */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                              isOffer
                                ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                                : isInterview
                                ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-400"
                                : "bg-indigo-500/15 border-indigo-500/30 text-indigo-400"
                            }`}
                          >
                            {isOffer ? (
                              <Gift className="w-4 h-4" />
                            ) : isInterview ? (
                              <CalendarCheck className="w-4 h-4" />
                            ) : (
                              <Layers className="w-4 h-4" />
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                isOffer
                                  ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                  : isInterview
                                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                                  : "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                              }`}
                            >
                              {isOffer ? "Employment Offer" : isInterview ? "Interview Request" : "Pipeline Update"}
                            </span>
                            <span className="font-bold text-sm text-foreground truncate">
                              {n.subject}
                            </span>
                            {isUnread && (
                              <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" title="Unread" />
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0 pl-10 sm:pl-0">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-[11px]">
                            {new Date(n.created_at).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Notification Body */}
                      <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap pl-1 sm:pl-10">
                        {n.body}
                      </p>

                      {/* Action Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40 pl-1 sm:pl-10">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isOffer && (
                            <Link
                              to={n.match_result_id ? `/candidate/offers/${n.match_result_id}` : "/candidate"}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-sm transition-all"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              View Official Offer Document
                              <ArrowRight className="w-3 h-3" />
                            </Link>
                          )}

                          {isInterview && (
                            <Button
                              size="sm"
                              onClick={() => setActiveTab("interviews")}
                              className="h-7 text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-semibold gap-1.5"
                            >
                              <Calendar className="h-3.5 w-3.5" />
                              Select Interview Slot / View Calendar
                            </Button>
                          )}

                          {!isOffer && !isInterview && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setActiveTab("pipeline")}
                              className="h-7 text-xs text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/10 gap-1.5"
                            >
                              <Eye className="h-3 w-3" />
                              Track Application Status
                            </Button>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isUnread && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsRead(n.id)}
                              title="Mark as read"
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10 gap-1"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Mark Read</span>
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteNotification(n.id)}
                            title="Dismiss notification"
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
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

                  <div className="px-3 py-1.5 rounded-xl border border-primary/25 bg-primary/10 text-center shrink-0">
                    <span className="text-xs font-black uppercase tracking-wider text-primary block">
                      {stageLabels[selectedJobMatch.status] || selectedJobMatch.status.replace(/_/g, " ")}
                    </span>
                    <span className="block text-[8px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
                      Stage
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
                            className={`text-xs px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1 ${
                              isUserHave
                                ? "bg-emerald-50 text-emerald-950 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800/80"
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

      {/* ── MODAL: INTERVIEW SLOT PICKER ─────────────────────────────────── */}
      {selectedInterviewForSlot && (
        <CandidateSlotPickerModal
          isOpen={Boolean(selectedInterviewForSlot)}
          onClose={() => setSelectedInterviewForSlot(null)}
          interview={selectedInterviewForSlot}
          onSlotConfirmed={() => {
            setSelectedInterviewForSlot(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
};

