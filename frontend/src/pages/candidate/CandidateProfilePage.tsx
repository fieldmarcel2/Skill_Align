import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { candidatesApi } from "../../services/api";
import { Candidate } from "../../types";
import { useToast } from "../../components/ui/toast";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import {
  UserCheck,
  ArrowLeft,
  FileText,
  Upload,
  CheckCircle2,
  Loader2,
  Save,
  Download,
  AlertCircle,
} from "lucide-react";

export const CandidateProfilePage: React.FC = () => {
  const toast = useToast();
  const [profile, setProfile] = useState<Candidate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Profile Form state
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [totalExperienceYears, setTotalExperienceYears] = useState<number>(0);

  // Resume File
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fetchProfile = async () => {
    try {
      const data = await candidatesApi.getMyProfile();
      setProfile(data);
      setFullName(data.full_name);
      setPhone(data.phone || "");
      setTotalExperienceYears(data.total_experience_years);
    } catch (err: any) {
      if (err.response?.status !== 404) {
        toast.error("Failed to load candidate profile.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Full name is required.");
      return;
    }
    setIsSaving(true);
    try {
      if (profile) {
        const updated = await candidatesApi.updateProfile({
          full_name: fullName,
          phone,
          total_experience_years: Number(totalExperienceYears),
        });
        setProfile(updated);
        toast.success("Profile information updated successfully.");
      } else {
        const created = await candidatesApi.createProfile({
          full_name: fullName,
          phone,
          total_experience_years: Number(totalExperienceYears),
        });
        setProfile(created);
        toast.success("Profile created! You can now upload your resume and add skills.");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to save profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResumeUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Please select a file to upload.");
      return;
    }
    if (!profile) {
      toast.error("Please save your basic profile before uploading a resume.");
      return;
    }

    setIsUploading(true);
    try {
      const updated = await candidatesApi.uploadResume(selectedFile);
      setProfile(updated);
      setSelectedFile(null);
      toast.success("Resume uploaded and attached to profile.", "Upload Complete");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to upload resume.");
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
          Candidate Profile & Resume
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Maintain your personal credentials, contact details, and verified resume document.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Profile Form */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border-border/80 bg-card/70 backdrop-blur-xl p-6">
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <h3 className="text-base font-bold font-outfit text-foreground flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-primary" /> Personal Information
              </h3>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Full Name *</label>
                <Input
                  type="text"
                  placeholder="e.g. Alice Johnson"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Phone Number</label>
                <Input
                  type="tel"
                  placeholder="e.g. +1 555-0199"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Total Industry Experience (Years) *
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  required
                  value={totalExperienceYears}
                  onChange={(e) => setTotalExperienceYears(Number(e.target.value))}
                />
                <p className="text-[11px] text-muted-foreground">
                  Used by matching engine to evaluate job min-experience thresholds.
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <Button type="submit" variant="gradient" disabled={isSaving} className="gap-2">
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" /> Save Profile
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Right Col: Resume Upload Card */}
        <div className="space-y-6">
          <Card className="border-border/80 bg-card/70 backdrop-blur-xl p-6 space-y-4">
            <h3 className="text-base font-bold font-outfit text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-400" /> Resume Document
            </h3>

            {profile?.resume_file_path ? (
              <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" /> Resume is Uploaded
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Available for authorized HR and Recruiters upon match review.
                </p>
                <a
                  href={candidatesApi.getResumeUrl(profile.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block pt-1"
                >
                  <Button variant="outline" size="sm" className="w-full text-xs gap-1.5">
                    <Download className="h-3.5 w-3.5" /> Download Current File
                  </Button>
                </a>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                  <AlertCircle className="h-4 w-4" /> No Resume File Attached
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Upload a PDF, DOC, or DOCX resume document below.
                </p>
              </div>
            )}

            {/* File Upload Form */}
            <form onSubmit={handleResumeUpload} className="space-y-3 pt-2">
              <label className="text-xs font-semibold text-foreground block">
                {profile?.resume_file_path ? "Replace Resume File" : "Upload Resume File"}
              </label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/20 file:text-primary hover:file:bg-primary/30 cursor-pointer"
              />
              <p className="text-[10px] text-muted-foreground">
                Supported formats: PDF, DOC, DOCX (Max 10 MB).
              </p>

              <Button
                type="submit"
                variant="secondary"
                size="sm"
                disabled={!selectedFile || isUploading || !profile}
                className="w-full gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5" /> Upload Resume
                  </>
                )}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};
