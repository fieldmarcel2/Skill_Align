import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { candidatesApi } from "../../services/api";
import { Candidate } from "../../types";
import { useToast } from "../../components/ui/toast";
import { Button } from "../../components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
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
} from "lucide-react";

export const CandidateDashboard: React.FC = () => {
  const toast = useToast();
  const [profile, setProfile] = useState<Candidate | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const data = await candidatesApi.getMyProfile();
      setProfile(data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setProfile(null);
      } else {
        toast.error("Failed to load candidate profile.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

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

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-outfit text-foreground tracking-tight">
            Candidate Career Portal
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Maintain your professional skills portfolio and resume to match with open requisitions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/candidate/profile">
            <Button variant="gradient" className="gap-2 shadow-lg shadow-indigo-500/20">
              <UserCheck className="h-4 w-4" /> Edit Profile & Resume
            </Button>
          </Link>
          <Link to="/candidate/skills">
            <Button variant="outline" className="gap-2">
              <PlusCircle className="h-4 w-4 text-primary" /> Manage Skills ({skillsCount})
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          title="Profile Status"
          value={hasProfile ? "Active" : "Incomplete"}
          icon={UserCheck}
          color={hasProfile ? "emerald" : "amber"}
          description={hasProfile ? "Profile published for matching" : "Create profile to get matched"}
        />
        <StatCard
          title="Verified Skills"
          value={skillsCount}
          icon={Layers}
          color="indigo"
          description="Proficiency & experience tracked"
        />
        <StatCard
          title="Resume on File"
          value={hasResume ? "Uploaded" : "Missing"}
          icon={FileText}
          color={hasResume ? "emerald" : "amber"}
          description={hasResume ? "PDF/DOC available to HR" : "Upload resume for recruiter review"}
        />
      </div>

      {/* Profile summary & Skills overview */}
      {!hasProfile ? (
        <Card className="p-8 text-center border-amber-500/30 bg-amber-500/5">
          <AlertCircle className="h-10 w-10 text-amber-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-foreground">Complete Your Candidate Profile</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-md mx-auto">
            You haven't initialized your profile yet. Add your full name, phone number, and experience so matching algorithms can score your profile.
          </p>
          <Link to="/candidate/profile">
            <Button variant="gradient">Create Profile Now</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Candidate Profile Details */}
          <Card className="border-border/80 bg-card/70 backdrop-blur-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold font-outfit text-foreground flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-indigo-400" /> Candidate Profile
              </h3>
              <Link to="/candidate/profile">
                <Button variant="ghost" size="sm" className="text-xs text-primary">
                  Edit
                </Button>
              </Link>
            </div>

            <div className="space-y-3 pt-1">
              <div className="flex justify-between py-1.5 border-b border-border/50 text-sm">
                <span className="text-muted-foreground">Full Name</span>
                <span className="font-semibold text-foreground">{profile.full_name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/50 text-sm">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-semibold text-foreground">{profile.phone || "Not provided"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/50 text-sm">
                <span className="text-muted-foreground">Total Experience</span>
                <span className="font-semibold text-foreground">
                  {profile.total_experience_years} Years
                </span>
              </div>
              <div className="flex justify-between py-1.5 text-sm items-center">
                <span className="text-muted-foreground">Resume File</span>
                {profile.resume_file_path ? (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Uploaded
                  </span>
                ) : (
                  <span className="text-xs text-amber-400">Not Uploaded</span>
                )}
              </div>
            </div>
          </Card>

          {/* Skills Portfolio Preview */}
          <Card className="border-border/80 bg-card/70 backdrop-blur-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold font-outfit text-foreground flex items-center gap-2">
                <Layers className="h-5 w-5 text-purple-400" /> Declared Skills ({skillsCount})
              </h3>
              <Link to="/candidate/skills">
                <Button variant="ghost" size="sm" className="text-xs text-primary">
                  Manage
                </Button>
              </Link>
            </div>

            {skillsCount === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No skills added yet. Add skills to match with open jobs.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {profile.skills.slice(0, 6).map((cs) => (
                  <div
                    key={cs.id}
                    className="p-2.5 rounded-lg border border-border/70 bg-secondary/30 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-semibold text-foreground">{cs.skill.name}</span>
                      <span className="block text-[10px] text-muted-foreground">
                        {cs.years_experience} yrs
                      </span>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold ${getProficiencyBadgeClass(
                        cs.proficiency_level
                      )}`}
                    >
                      {cs.proficiency_level}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};
