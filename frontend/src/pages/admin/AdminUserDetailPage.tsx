import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { adminApi, resumeApi } from "../../services/api";
import { useToast } from "../../components/ui/toast";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  Briefcase,
  UserCheck,
  FileText,
  GraduationCap,
  Star,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Building,
  Layers,
  AlertCircle,
  ExternalLink,
  FileCode,
  Sparkles,
  Copy,
  Check,
  Award,
  Code2,
  Trash2,
  AlertTriangle,
  Eye,
  ArrowRight,
  Activity,
  Edit3,
  UserCog,
} from "lucide-react";

export const AdminUserDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const userId = Number(id);
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();

  const [detail, setDetail] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  // Resume viewing states
  const [isViewingResume, setIsViewingResume] = useState(false);
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);
  const [extractedRawText, setExtractedRawText] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  const fetchDetail = async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.getUserDetail(userId);
      setDetail(data);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to load user details.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userId) fetchDetail();
  }, [userId]);

  const handleToggleStatus = async () => {
    if (!detail) return;
    setIsToggling(true);
    try {
      const updated = await adminApi.toggleUserStatus(userId);
      setDetail((prev: any) => ({ ...prev, is_active: updated.is_active }));
      toast.success(`${detail.name} has been ${updated.is_active ? "activated" : "deactivated"}.`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to toggle user status.");
    } finally {
      setIsToggling(false);
    }
  };

  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleDeleteUser = async () => {
    if (!detail) return;
    setIsDeleting(true);
    try {
      await adminApi.deleteUser(userId);
      toast.success(`${detail.name} has been permanently deleted.`, "User Removed");
      navigate("/admin/users");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to remove user.", "Error");
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  // Edit Profile modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone_number: "",
    role: "Recruiter",
    is_active: true,
  });

  const handleOpenEditModal = () => {
    if (!detail || detail.role === "Candidate") return;
    setEditForm({
      name: detail.name || "",
      email: detail.email || "",
      phone_number: detail.phone_number || "",
      role: detail.role === "HR" ? "HR" : detail.role || "Recruiter",
      is_active: detail.is_active ?? true,
    });
    setIsEditModalOpen(true);
  };

  useEffect(() => {
    if (searchParams.get("edit") === "true" && detail && detail.role !== "Candidate") {
      handleOpenEditModal();
    }
  }, [searchParams, detail]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name.trim()) {
      toast.error("User name cannot be empty.");
      return;
    }
    if (!editForm.email.trim()) {
      toast.error("Email address cannot be empty.");
      return;
    }

    setIsUpdating(true);
    try {
      const updated = await adminApi.updateUser(userId, {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        phone_number: editForm.phone_number.trim() || null,
        role: editForm.role,
        is_active: editForm.is_active,
      });

      toast.success(`Profile for ${updated.name} updated successfully!`);
      setIsEditModalOpen(false);
      await fetchDetail();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to update user profile.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleViewOriginalResume = async (candidateId: number) => {
    setIsViewingResume(true);
    try {
      const data = await resumeApi.getUrl(candidateId);
      if (data.resume_url) {
        window.open(data.resume_url, "_blank", "noopener,noreferrer");
      } else {
        toast.error("Resume file URL not found.");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to retrieve secure resume URL.");
    } finally {
      setIsViewingResume(false);
    }
  };

  const handleViewExtractedText = async (candidateId: number) => {
    setIsLoadingText(true);
    try {
      const data = await resumeApi.getText(candidateId);
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

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "Admin": return <Shield className="h-4 w-4 text-purple-400" />;
      case "HR": return <Sparkles className="h-4 w-4 text-blue-400" />;
      case "Recruiter": return <Briefcase className="h-4 w-4 text-emerald-400" />;
      default: return <User className="h-4 w-4 text-amber-400" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "Admin": return <Badge variant="purple" className="gap-1"><Shield className="w-3 h-3" /> Admin</Badge>;
      case "HR": return <Badge variant="info" className="gap-1"><Sparkles className="w-3 h-3" /> HM (Hiring Manager)</Badge>;
      case "Recruiter": return <Badge variant="success" className="gap-1"><Briefcase className="w-3 h-3" /> Recruiter</Badge>;
      case "Candidate": return <Badge variant="warning" className="gap-1"><User className="w-3 h-3" /> Candidate</Badge>;
      default: return <Badge variant="secondary">{role}</Badge>;
    }
  };

  const getProficiencyColor = (level: string) => {
    switch (level) {
      case "Expert": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
      case "Intermediate": return "text-blue-400 bg-blue-500/10 border-blue-500/30";
      default: return "text-amber-400 bg-amber-500/10 border-amber-500/30";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="text-center py-20 space-y-3">
        <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto opacity-40" />
        <p className="text-sm text-muted-foreground">User not found.</p>
        <Button variant="outline" onClick={() => navigate("/admin/users")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to User Directory
        </Button>
      </div>
    );
  }

  const cp = detail.candidate_profile;
  const joinDate = detail.created_at
    ? new Date(detail.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
    : "-";

  // Parse extracted structured resume data if present
  let parsedResumeData: any = null;
  if (cp?.extracted_data) {
    try {
      parsedResumeData = typeof cp.extracted_data === "string" ? JSON.parse(cp.extracted_data) : cp.extracted_data;
    } catch {
      parsedResumeData = null;
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* Breadcrumb */}
      <Link
        to="/admin/users"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to User Directory
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 text-primary text-2xl font-extrabold font-outfit shadow-lg">
            {detail.name ? detail.name.charAt(0).toUpperCase() : "U"}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight font-outfit">
              {detail.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {getRoleBadge(detail.role)}
              {detail.is_active ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400" /> Deactivated
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {detail.role !== "Candidate" && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-9 text-primary hover:text-primary-foreground hover:bg-primary border-primary/40 gap-1.5 px-3 font-semibold shadow-xs"
              onClick={handleOpenEditModal}
              title="Edit user profile, phone, or role"
            >
              <Edit3 className="h-3.5 w-3.5" /> Edit Profile
            </Button>
          )}

          {detail.role !== "Admin" && (
            <>
              <Button
                variant={detail.is_active ? "outline" : "secondary"}
                className={
                  detail.is_active
                    ? "text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border-rose-500/30"
                    : "text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border-emerald-500/30"
                }
                disabled={isToggling}
                onClick={handleToggleStatus}
              >
                {isToggling ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : detail.is_active ? (
                  <XCircle className="h-4 w-4 mr-2" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                {isToggling ? "Updating..." : detail.is_active ? "Deactivate Account" : "Activate Account"}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-9 text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 border border-rose-500/30 gap-1.5 px-3"
                onClick={() => setIsDeleteModalOpen(true)}
                title="Permanently remove user"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove User
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Core Info + Role Detail */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card className="border-border/80 bg-card/70 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4 text-primary" /> Account Information
            </CardTitle>
            {detail.role === "Candidate" ? (
              <span className="text-[10px] text-muted-foreground font-medium px-2 py-0.5 rounded bg-secondary border border-border">
                Candidate-Managed Profile
              </span>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenEditModal}
                className="h-7 px-2.5 text-xs text-primary hover:text-primary hover:bg-primary/10 gap-1 font-semibold"
              >
                <Edit3 className="h-3 w-3" /> Edit
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3.5">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-indigo-400 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium text-foreground">{detail.email || "-"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Phone Number</p>
                <p className="font-medium text-foreground">{detail.phone_number || "Not provided"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-amber-400 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Member Since</p>
                <p className="font-medium text-foreground">{joinDate}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              {getRoleIcon(detail.role)}
              <div>
                <p className="text-xs text-muted-foreground">Role</p>
                <p className="font-medium text-foreground">{detail.role === "HR" ? "HM (Hiring Manager)" : detail.role}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Candidate Resume & Document Management */}
        {detail.role === "Candidate" && cp && (
          <Card className="border-border/80 bg-card/70 backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-purple-400" /> Resume & Extraction
              </CardTitle>
              {cp.resume_uploaded && (
                <Badge variant="success" className="text-[10px]">
                  Uploaded & Processed
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-3.5">
              <div className="flex items-center gap-3">
                {cp.resume_uploaded ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-rose-400 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {cp.resume_uploaded ? (cp.resume_filename || "Resume Document") : "No Resume Uploaded"}
                  </p>
                  {cp.resume_uploaded && (
                    <p className="text-xs text-muted-foreground">
                      Stored securely in S3 with automated text extraction
                    </p>
                  )}
                </div>
              </div>

              {cp.resume_uploaded && (
                <div className="flex flex-wrap gap-2 pt-1 border-t border-border/50">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs text-primary border-primary/40 hover:bg-primary/10"
                    disabled={isViewingResume}
                    onClick={() => handleViewOriginalResume(cp.id)}
                  >
                    {isViewingResume ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                    View Original File
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/10"
                    disabled={isLoadingText}
                    onClick={() => handleViewExtractedText(cp.id)}
                  >
                    {isLoadingText ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileCode className="h-3.5 w-3.5" />}
                    View Extracted Text (.txt)
                  </Button>
                </div>
              )}

              <div className="border-t border-border/50 pt-2 space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <GraduationCap className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <span>
                    {cp.education_degree
                      ? `${cp.education_degree}${cp.education_institution ? ` - ${cp.education_institution}` : ""}`
                      : "Education not specified"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span>{cp.total_experience_years} years experience</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {detail.role === "Candidate" && !cp && (
          <Card className="border-border/80 bg-card/70 backdrop-blur-xl">
            <CardContent className="py-10 text-center">
              <User className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-sm text-muted-foreground">Candidate profile not yet created.</p>
            </CardContent>
          </Card>
        )}

        {detail.role === "Recruiter" && (
          <Card className="border-border/80 bg-card/70 backdrop-blur-xl">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-emerald-400" /> Recruiter Portfolio & Workload
                </span>
                <Badge variant="success" className="text-[10px]">Talent Sourcing</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/60">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Assigned Requisitions</span>
                  <span className="text-2xl font-extrabold font-outfit text-foreground">
                    {detail.recruiter_profile?.assigned_jobs_count ?? 0}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/60">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Claimed Candidates</span>
                  <span className="text-2xl font-extrabold font-outfit text-foreground">
                    {detail.recruiter_profile?.claimed_candidates_count ?? 0}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Active recruitment partner managing candidate pipelines, claiming matching profiles, and conducting structured screenings.
              </p>
            </CardContent>
          </Card>
        )}

        {detail.role === "HR" && (
          <Card className="border-border/80 bg-card/70 backdrop-blur-xl">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-400" /> Hiring Manager (HM) Governance
                </span>
                <Badge variant="info" className="text-[10px]">HM Authority</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/60">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Supervised Requisitions</span>
                  <span className="text-2xl font-extrabold font-outfit text-foreground">
                    {detail.hm_profile?.owned_jobs_count ?? 0}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/60">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Shortlist Reviews</span>
                  <span className="text-2xl font-extrabold font-outfit text-foreground">
                    {detail.hm_profile?.reviews_conducted ?? 0}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Hiring Manager responsible for requisition requirements, evaluating shortlisted talent, conducting interviews, and submitting scorecards.
              </p>
            </CardContent>
          </Card>
        )}

        {detail.role === "Admin" && (
          <Card className="border-border/80 bg-card/70 backdrop-blur-xl">
            <CardContent className="py-10 text-center flex flex-col items-center gap-3">
              <Shield className="h-8 w-8 text-purple-400 opacity-80" />
              <p className="text-sm font-semibold text-foreground">System Administrator</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Platform administrator with root governance access across directories, role provisioning, and hiring audit logs.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Structured Parsed Resume Information (If Available) */}
      {detail.role === "Candidate" && parsedResumeData && (
        <Card className="border-border/80 bg-card/70 backdrop-blur-xl space-y-4 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-400" />
              <div>
                <h3 className="text-base font-bold font-outfit text-foreground">
                  Extracted Structured Resume Information
                </h3>
                <p className="text-xs text-muted-foreground">
                  Deterministic rule-based data parsed from candidate resume
                </p>
              </div>
            </div>
            {cp?.resume_parsed_at && (
              <span className="text-[11px] text-muted-foreground">
                Parsed: {new Date(cp.resume_parsed_at).toLocaleDateString()}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Contact & Basics */}
            <div className="p-3.5 rounded-xl bg-secondary/30 border border-border/60 text-xs space-y-2">
              <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
                Extracted Contact Profile
              </span>
              <p className="font-semibold text-foreground text-sm">
                {parsedResumeData.name || cp.full_name || detail.name}
              </p>
              <div className="space-y-1 text-muted-foreground">
                {parsedResumeData.email && <p>Email: <span className="text-foreground">{parsedResumeData.email}</span></p>}
                {parsedResumeData.phone && <p>Phone: <span className="text-foreground">{parsedResumeData.phone}</span></p>}
                <p>Calculated Tenure: <span className="text-foreground font-semibold">{parsedResumeData.total_experience_years ?? cp.total_experience_years} yrs</span></p>
              </div>
            </div>

            {/* Academic Degrees */}
            <div className="p-3.5 rounded-xl bg-secondary/30 border border-border/60 text-xs space-y-2">
              <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
                <GraduationCap className="h-3.5 w-3.5 text-emerald-400" /> Academic Credentials
              </span>
              {parsedResumeData.education && parsedResumeData.education.length > 0 ? (
                <div className="space-y-2">
                  {parsedResumeData.education.map((edu: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-foreground">
                      <div>
                        <p className="font-semibold text-emerald-300">{edu.degree}</p>
                        <p className="text-[11px] text-muted-foreground">{edu.institution}</p>
                      </div>
                      {edu.year && <Badge variant="outline" className="text-[10px]">{edu.year}</Badge>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground italic">No degree explicitly detected.</p>
              )}
            </div>
          </div>

          {/* Detected Skills */}
          {parsedResumeData.skills && parsedResumeData.skills.length > 0 && (
            <div className="p-3.5 rounded-xl bg-secondary/30 border border-border/60 space-y-2">
              <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
                <Code2 className="h-3.5 w-3.5 text-indigo-400" /> Automatically Detected Skills ({parsedResumeData.skills.length})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {parsedResumeData.skills.map((s: any, i: number) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-medium"
                  >
                    {s.name || s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Experience Roles */}
          {parsedResumeData.experience && parsedResumeData.experience.length > 0 && (
            <div className="p-3.5 rounded-xl bg-secondary/30 border border-border/60 space-y-2">
              <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5 text-blue-400" /> Detected Work Experience
              </span>
              <div className="space-y-1.5 text-xs">
                {parsedResumeData.experience.map((exp: any, i: number) => (
                  <div key={i} className="flex justify-between items-center text-foreground">
                    <span className="font-semibold text-blue-300">{exp.title}</span>
                    {exp.duration && <span className="text-muted-foreground text-[11px]">{exp.duration}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Certifications */}
          {parsedResumeData.certifications && parsedResumeData.certifications.length > 0 && (
            <div className="p-3.5 rounded-xl bg-secondary/30 border border-border/60 space-y-2">
              <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
                <Award className="h-3.5 w-3.5 text-amber-400" /> Certifications
              </span>
              <ul className="text-xs text-foreground list-disc list-inside space-y-0.5">
                {parsedResumeData.certifications.map((cert: string, i: number) => (
                  <li key={i}>{cert}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {/* Candidate Skills Portfolio */}
      {detail.role === "Candidate" && cp && cp.skills.length > 0 && (
        <Card className="border-border/80 bg-card/70 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Star className="h-4 w-4 text-amber-400" /> Profile Declared Skills ({cp.skills.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {cp.skills.map((s: any, i: number) => (
                <div
                  key={i}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium ${getProficiencyColor(s.proficiency_level)}`}
                >
                  <span className="font-semibold">{s.skill_name}</span>
                  <span className="opacity-60">•</span>
                  <span>{s.proficiency_level}</span>
                  {s.years_experience > 0 && (
                    <span className="opacity-50">({s.years_experience}y)</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recruiter Details: Assigned Requisitions & Actions */}
      {detail.role === "Recruiter" && (
        <div className="space-y-6">
          {/* Assigned Requisitions */}
          <Card className="border-border/80 bg-card/70 backdrop-blur-xl">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-bold font-outfit">
                  <Briefcase className="h-4 w-4 text-emerald-400" /> Assigned Job Requisitions ({detail.recruiter_profile?.assigned_jobs?.length || 0})
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Job requisitions actively assigned to this recruiter's sourcing queue
                </p>
              </div>
              <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground border border-border">
                {detail.recruiter_profile?.assigned_jobs_count || 0} Total Active Assignments
              </span>
            </CardHeader>
            <CardContent className="pt-4">
              {!detail.recruiter_profile?.assigned_jobs || detail.recruiter_profile.assigned_jobs.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <Briefcase className="h-8 w-8 text-muted-foreground mx-auto opacity-40" />
                  <p className="text-sm font-semibold text-foreground">No Job Requisitions Assigned</p>
                  <p className="text-xs text-muted-foreground">This recruiter has not been assigned to any open job queues yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {detail.recruiter_profile.assigned_jobs.map((job: any) => (
                    <div
                      key={job.id}
                      className="p-4 rounded-xl border border-border/80 bg-card/60 hover:bg-card/90 hover:border-primary/40 transition-all flex items-start justify-between gap-3 group"
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            to={`/admin/jobs/${job.id}`}
                            className="text-sm font-bold text-foreground hover:text-primary hover:underline transition-colors line-clamp-1 font-outfit cursor-pointer"
                            title={`Inspect ${job.title}`}
                          >
                            {job.title}
                          </Link>
                          <Badge variant="outline" className="text-[10px] font-mono uppercase shrink-0">
                            ID #{job.id}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {job.department && (
                            <span className="inline-flex items-center gap-1 bg-secondary/60 px-2 py-0.5 rounded text-[11px] font-medium text-foreground">
                              <Building className="h-3 w-3 text-indigo-400" /> {job.department}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 text-[11px]">
                            <Clock className="h-3 w-3 text-amber-400" /> Min {job.min_experience_years}y exp
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px]">
                            <Layers className="h-3 w-3 text-cyan-400" /> {job.work_mode || "Hybrid"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant={
                            job.status?.toLowerCase() === "active"
                              ? "success"
                              : job.status?.toLowerCase() === "closed"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-[10px] uppercase font-bold"
                        >
                          {job.status || "ACTIVE"}
                        </Badge>
                        <Link to={`/admin/jobs/${job.id}`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                            title={`Inspect ${job.title}`}
                            aria-label={`Inspect ${job.title}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recruiter Activity & Workflow Actions */}
          {detail.recruiter_profile?.recent_actions && detail.recruiter_profile.recent_actions.length > 0 && (
            <Card className="border-border/80 bg-card/70 backdrop-blur-xl">
              <CardHeader className="border-b border-border/60 pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-bold font-outfit">
                  <Activity className="h-4 w-4 text-emerald-400" /> Recent Recruiter Workflow Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                <div className="divide-y divide-border/50 text-xs">
                  {detail.recruiter_profile.recent_actions.map((act: any) => (
                    <div key={act.id} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-foreground">
                          {act.action?.replace(/_/g, " ") || "Workflow Action"}
                        </span>
                        {(act.from_state || act.to_state) && (
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            {act.from_state && <span>{act.from_state}</span>}
                            {act.from_state && <ArrowRight className="h-3 w-3" />}
                            {act.to_state && <span className="font-semibold text-primary">{act.to_state}</span>}
                          </div>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {act.created_at ? new Date(act.created_at).toLocaleDateString() : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* HM Details: Supervised Requisitions & Decisions */}
      {detail.role === "HR" && (
        <div className="space-y-6">
          {/* Supervised Requisitions */}
          <Card className="border-border/80 bg-card/70 backdrop-blur-xl">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-bold font-outfit">
                  <Sparkles className="h-4 w-4 text-blue-400" /> Supervised Job Requisitions ({detail.hm_profile?.owned_jobs?.length || 0})
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Job requisitions under this Hiring Manager's review and approval governance
                </p>
              </div>
              <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground border border-border">
                {detail.hm_profile?.owned_jobs_count || 0} Supervised Requisitions
              </span>
            </CardHeader>
            <CardContent className="pt-4">
              {!detail.hm_profile?.owned_jobs || detail.hm_profile.owned_jobs.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <Building className="h-8 w-8 text-muted-foreground mx-auto opacity-40" />
                  <p className="text-sm font-semibold text-foreground">No Supervised Requisitions</p>
                  <p className="text-xs text-muted-foreground">No job requisitions are linked to this Hiring Manager yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {detail.hm_profile.owned_jobs.map((job: any) => (
                    <div
                      key={job.id}
                      className="p-4 rounded-xl border border-border/80 bg-card/60 hover:bg-card/90 hover:border-primary/40 transition-all flex items-start justify-between gap-3 group"
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            to={`/admin/jobs/${job.id}`}
                            className="text-sm font-bold text-foreground hover:text-primary hover:underline transition-colors line-clamp-1 font-outfit cursor-pointer"
                            title={`Inspect ${job.title}`}
                          >
                            {job.title}
                          </Link>
                          <Badge variant="outline" className="text-[10px] font-mono uppercase shrink-0">
                            ID #{job.id}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {job.department && (
                            <span className="inline-flex items-center gap-1 bg-secondary/60 px-2 py-0.5 rounded text-[11px] font-medium text-foreground">
                              <Building className="h-3 w-3 text-blue-400" /> {job.department}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 text-[11px]">
                            <Clock className="h-3 w-3 text-amber-400" /> Min {job.min_experience_years}y exp
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px]">
                            <Layers className="h-3 w-3 text-cyan-400" /> {job.work_mode || "Hybrid"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant={
                            job.status?.toLowerCase() === "active"
                              ? "success"
                              : job.status?.toLowerCase() === "closed"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-[10px] uppercase font-bold"
                        >
                          {job.status || "ACTIVE"}
                        </Badge>
                        <Link to={`/admin/jobs/${job.id}`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                            title={`Inspect ${job.title}`}
                            aria-label={`Inspect ${job.title}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* HM Activity & Workflow Actions */}
          {detail.hm_profile?.recent_actions && detail.hm_profile.recent_actions.length > 0 && (
            <Card className="border-border/80 bg-card/70 backdrop-blur-xl">
              <CardHeader className="border-b border-border/60 pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-bold font-outfit">
                  <Activity className="h-4 w-4 text-blue-400" /> Recent Hiring Manager Reviews & Decisions
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                <div className="divide-y divide-border/50 text-xs">
                  {detail.hm_profile.recent_actions.map((act: any) => (
                    <div key={act.id} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-foreground">
                          {act.action?.replace(/_/g, " ") || "Workflow Action"}
                        </span>
                        {(act.from_state || act.to_state) && (
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            {act.from_state && <span>{act.from_state}</span>}
                            {act.from_state && <ArrowRight className="h-3 w-3" />}
                            {act.to_state && <span className="font-semibold text-primary">{act.to_state}</span>}
                          </div>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {act.created_at ? new Date(act.created_at).toLocaleDateString() : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Extracted Resume Plain Text (.txt) Modal */}
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
              Clean, readable text extracted from the candidate's document for deterministic parsing.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 rounded-xl bg-secondary/40 border border-border/80 font-mono text-xs text-foreground whitespace-pre-wrap leading-relaxed">
            {extractedRawText || "No text content available."}
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setIsTextModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={isDeleteModalOpen} onOpenChange={(open) => !open && setIsDeleteModalOpen(false)}>
        <DialogContent className="sm:max-w-md border-border/80 bg-card/95 backdrop-blur-xl">
          <DialogHeader>
            <div className="flex items-center gap-3 text-rose-400 mb-1">
              <div className="h-10 w-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold font-outfit text-foreground">
                  Permanently Remove User
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  This action is irreversible and purges all related user assignments and records.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {detail && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs space-y-2.5 my-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground text-sm">{detail.name}</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border border-border">
                  {detail.role === "HR" ? "HM" : detail.role}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground space-y-0.5">
                <p>Email: {detail.email || "None"}</p>
                <p>Phone: {detail.phone_number || "None"}</p>
              </div>
              <div className="flex items-start gap-2 pt-2 border-t border-rose-500/20 text-rose-300 text-[11px] leading-relaxed">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                <span>
                  All job assignments, collaboration tasks, candidate claims, evaluations, and activity associated with this {detail.role === "HR" ? "Hiring Manager (HM)" : detail.role} will be permanently removed.
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isDeleting}
              onClick={handleDeleteUser}
              className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Removing...
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" /> Permanently Remove User
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── EDIT USER PROFILE MODAL ─────────────────────────────────────── */}
      <Dialog open={isEditModalOpen} onOpenChange={(open) => !open && setIsEditModalOpen(false)}>
        <DialogContent className="sm:max-w-md border-border/80 bg-card/95 backdrop-blur-2xl">
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <DialogHeader>
              <div className="flex items-center gap-3 text-primary mb-1">
                <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0 text-primary">
                  <UserCog className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold font-outfit text-foreground">
                    Edit User Profile
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Update personal details, communication channels, and governance roles.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-3.5 py-1">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Full Name</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Required</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Second Recruiter"
                    className="pl-9 text-xs"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Email Address</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Login Identity</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="e.g. recruiter@skillalign.dev"
                    className="pl-9 text-xs"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Phone Number</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Optional</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="tel"
                    value={editForm.phone_number}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, phone_number: e.target.value }))}
                    placeholder="e.g. +91 98765 43210 or +1 (555) 0199"
                    className="pl-9 text-xs"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">Used for interview coordination and notifications.</p>
              </div>

              {/* System Role */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>System Role & Permissions</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Role assignment</span>
                </label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, role: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                >
                  <option value="Recruiter">Recruiter (Talent Sourcing & Candidate Claiming)</option>
                  <option value="HR">Hiring Manager / HM (Requisitions & Offer Approvals)</option>
                  <option value="Admin">System Administrator</option>
                </select>
              </div>

              {/* Account Status Switch */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-secondary/30 mt-2">
                <div>
                  <span className="text-xs font-semibold text-foreground block">Account Status</span>
                  <span className="text-[11px] text-muted-foreground">
                    {editForm.is_active ? "User can sign in and perform assigned duties" : "Account is suspended and cannot log in"}
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.is_active}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-border/60">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsEditModalOpen(false)}
                disabled={isUpdating}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isUpdating}
                className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving Changes...
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" /> Save Changes
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
