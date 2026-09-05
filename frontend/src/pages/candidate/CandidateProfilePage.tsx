import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { candidatesApi, resumeApi } from "../../services/api";
import { Candidate } from "../../types";
import { useToast } from "../../components/ui/toast";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import {
  UserCheck,
  ArrowLeft,
  FileText,
  Upload,
  CheckCircle2,
  Loader2,
  Save,
  AlertCircle,
  ExternalLink,
  Trash2,
  MapPin,
  Briefcase,
  Laptop,
  Building2,
  Layers,
  Coins,
  Clock,
  ShieldCheck,
} from "lucide-react";

export const CandidateProfilePage: React.FC = () => {
  const toast = useToast();
  const { refreshUser } = useAuth();
  const [profile, setProfile] = useState<Candidate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isViewingResume, setIsViewingResume] = useState(false);
  const [isDeletingResume, setIsDeletingResume] = useState(false);

  // Profile Form state
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [totalExperienceYears, setTotalExperienceYears] = useState<number>(0);
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

  // Resume File
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fetchProfile = async () => {
    try {
      const data = await candidatesApi.getMyProfile();
      setProfile(data);
      setFullName(data.full_name || "");
      setPhone(data.phone || "");
      setTotalExperienceYears(data.total_experience_years || 0);
      setAddress(data.address || "");
      setCity(data.city || "");
      setState(data.state || "");
      setPincode(data.pincode || "");
      setCountry(data.country || "India");
      setWorkAuthorization(data.work_authorization || "Indian Citizen");
      setPreferredWorkMode(data.preferred_work_mode || "Hybrid");
      setNoticePeriod(data.notice_period || "30 Days");
      setCurrentCtc(data.current_ctc !== undefined && data.current_ctc !== null ? String(data.current_ctc) : "");
      setExpectedCtc(data.expected_ctc !== undefined && data.expected_ctc !== null ? String(data.expected_ctc) : "");
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

    setIsSaving(true);
    try {
      const payload = {
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
        total_experience_years: Number(totalExperienceYears) || 0,
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
      const res = await resumeApi.upload(profile.id, selectedFile);
      const originalKey = res.original_s3_key || (res as any).resume_s3_key;
      const filename = res.filename || (res as any).resume_filename;
      const uploadedAt = res.uploaded_at || (res as any).resume_uploaded_at;
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              resume_file_path: originalKey,
              resume_s3_key: originalKey,
              resume_filename: filename,
              resume_uploaded_at: uploadedAt,
            }
          : null
      );
      setSelectedFile(null);
      toast.success("Resume uploaded and parsed successfully!", "Upload Complete");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to upload resume to S3.");
    } finally {
      setIsUploading(false);
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
      toast.success("Resume deleted from AWS S3.");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to delete resume.");
    } finally {
      setIsDeletingResume(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasResume = Boolean(profile?.resume_s3_key || profile?.resume_file_path);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-5xl mx-auto">
      <Link
        to="/candidate"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
      </Link>

      <div>
        <h1 className="text-2xl font-bold font-outfit text-foreground tracking-tight">
          Candidate Profile & Career Preferences
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Maintain your personal credentials, contact details, address, CTC preferences, and verified resume document.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Profile Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSaveProfile} className="space-y-6">
            {/* Section 1: Basic Information */}
            <Card className="border-border/80 bg-card/70 backdrop-blur-xl p-6 space-y-4">
              <h3 className="text-base font-bold font-outfit text-foreground flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-primary" /> Personal Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
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
                  <label className="text-xs font-semibold text-foreground">Mobile Number (+91 Indian Format) *</label>
                  <Input
                    type="tel"
                    placeholder="e.g. +91 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">10-digit number starting with 6, 7, 8, or 9</p>
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
                </div>
              </div>
            </Card>

            {/* Section 2: Address Details */}
            <Card className="border-border/80 bg-card/70 backdrop-blur-xl p-6 space-y-4">
              <h3 className="text-base font-bold font-outfit text-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4 text-indigo-400" /> Address & Location
              </h3>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Street Address</label>
                  <Input
                    type="text"
                    placeholder="Flat / House No., Street, Landmark"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">City</label>
                    <Input
                      type="text"
                      placeholder="e.g. Bangalore"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">State / Province</label>
                    <Input
                      type="text"
                      placeholder="e.g. Karnataka"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Pincode / ZIP</label>
                    <Input
                      type="text"
                      placeholder="e.g. 560001"
                      maxLength={10}
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
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
            </Card>

            {/* Section 3: Work Preferences & Compensation */}
            <Card className="border-border/80 bg-card/70 backdrop-blur-xl p-6 space-y-4">
              <h3 className="text-base font-bold font-outfit text-foreground flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-emerald-400" /> Work Preferences & Compensation
              </h3>

              <div className="space-y-4">
                {/* Preferred Work Mode Radio */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground block">Preferred Work Mode *</label>
                  <div className="grid grid-cols-3 gap-3">
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
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? "border-primary bg-primary/10 text-primary shadow-sm"
                              : "border-border bg-card/50 text-muted-foreground hover:border-border/80 hover:text-foreground"
                          }`}
                        >
                          <input
                            type="radio"
                            name="work_mode"
                            value={mode.id}
                            checked={isSelected}
                            onChange={() => setPreferredWorkMode(mode.id as any)}
                            className="sr-only"
                          />
                          <Icon className="h-4 w-4 mb-1.5" />
                          <span className="text-xs font-semibold">{mode.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" /> Work Authorization
                    </label>
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
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-amber-400" /> Notice Period
                    </label>
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
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Coins className="h-3.5 w-3.5 text-emerald-400" /> Current CTC (in LPA)
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="e.g. 12.5"
                      value={currentCtc}
                      onChange={(e) => setCurrentCtc(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Coins className="h-3.5 w-3.5 text-emerald-400" /> Expected CTC (in LPA)
                    </label>
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

              <div className="pt-4 flex justify-end border-t border-border/50">
                <Button type="submit" variant="gradient" disabled={isSaving} className="gap-2 shadow-md shadow-indigo-500/20">
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Saving Details...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" /> Save Profile Details
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </form>
        </div>

        {/* Right Col: Resume Upload Card */}
        <div className="space-y-6">
          <Card className="border-border/80 bg-card/70 backdrop-blur-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-outfit text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-400" /> Resume Document
              </h3>
              {hasResume && (
                <Badge variant="success" className="text-[10px]">
                  AWS S3 Verified
                </Badge>
              )}
            </div>

            {hasResume ? (
              <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span className="truncate max-w-[170px]">
                      {profile?.resume_filename || "Resume is Uploaded"}
                    </span>
                  </div>
                  {profile?.resume_uploaded_at && (
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(profile.resume_uploaded_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Processed on AWS S3 with deterministic taxonomy matching.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs flex-1 gap-1"
                    disabled={isViewingResume}
                    onClick={handleViewResume}
                  >
                    {isViewingResume ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <ExternalLink className="h-3 w-3" />
                    )}
                    View Document
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-destructive hover:bg-destructive/10"
                    disabled={isDeletingResume}
                    onClick={handleDeleteResume}
                  >
                    {isDeletingResume ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>No Resume on File</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Upload a PDF or Word document to trigger automatic skill extraction.
                </p>
              </div>
            )}

            {/* Upload Form */}
            <form onSubmit={handleResumeUpload} className="space-y-3 pt-2 border-t border-border/50">
              <label className="text-xs font-semibold text-foreground block">
                {hasResume ? "Replace Existing Resume" : "Upload Resume (PDF, DOCX)"}
              </label>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="block w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-secondary file:text-foreground hover:file:bg-secondary/80 cursor-pointer"
              />
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="w-full gap-2 text-xs"
                disabled={!selectedFile || isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading & Parsing...
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5" /> Upload to AWS S3
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
