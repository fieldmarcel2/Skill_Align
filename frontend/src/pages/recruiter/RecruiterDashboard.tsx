import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { jobsApi, matchingApi } from "../../services/api";
import { Job, MatchResult } from "../../types";
import { useToast } from "../../components/ui/toast";
import { Button } from "../../components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { StatCard } from "../../components/common/StatCard";
import {
  Briefcase,
  PlusCircle,
  Users,
  Clock,
  Building,
  UserCheck,
  ArrowRight,
  Loader2,
  FileSpreadsheet,
} from "lucide-react";

export const RecruiterDashboard: React.FC = () => {
  const toast = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [shortlists, setShortlists] = useState<MatchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [jobsData, shortlistsData] = await Promise.all([
        jobsApi.list({ my_jobs_only: true }),
        matchingApi.listShortlists(),
      ]);
      setJobs(jobsData);
      setShortlists(shortlistsData);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to load recruiter data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeJobsCount = jobs.filter((j) => j.status === "active").length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-outfit text-foreground tracking-tight">
            Recruiter Workspace
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Publish job specifications, configure weighted skills criteria, and review candidate shortlists.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/recruiter/jobs/create">
            <Button variant="gradient" className="gap-2 shadow-lg shadow-indigo-500/20">
              <PlusCircle className="h-4 w-4" /> Create New Job Requisition
            </Button>
          </Link>
          <Link to="/recruiter/shortlists">
            <Button variant="outline" className="gap-2">
              <UserCheck className="h-4 w-4 text-emerald-400" /> Shortlisted Talents ({shortlists.length})
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          title="My Open Jobs"
          value={jobs.length}
          icon={Briefcase}
          color="indigo"
          description={`${activeJobsCount} currently active for matching`}
        />
        <StatCard
          title="Shortlisted by HR"
          value={shortlists.length}
          icon={UserCheck}
          color="emerald"
          description="Candidates ready for recruiter interview"
        />
        <StatCard
          title="Hiring Pipeline"
          value="Healthy"
          icon={FileSpreadsheet}
          color="blue"
          description="Direct candidate review enabled"
        />
      </div>

      {/* My Jobs List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold font-outfit text-foreground">
            My Job Requisitions ({jobs.length})
          </h2>
          <Link to="/recruiter/jobs/create">
            <Button variant="ghost" size="sm" className="gap-1 text-primary">
              <PlusCircle className="h-4 w-4" /> Post Another Job
            </Button>
          </Link>
        </div>

        {jobs.length === 0 ? (
          <Card className="p-12 text-center border-border/80 bg-card/60">
            <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <h3 className="text-base font-semibold text-foreground">No jobs posted yet</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Create your first job requisition with weighted skill criteria.
            </p>
            <Link to="/recruiter/jobs/create">
              <Button variant="gradient">Create First Job</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {jobs.map((job) => (
              <Card
                key={job.id}
                className="border-border/80 bg-card/70 backdrop-blur-xl p-6 flex flex-col justify-between hover:border-primary/40 transition-all group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-bold font-outfit text-foreground group-hover:text-primary transition-colors">
                        {job.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
                        {job.department && (
                          <span className="flex items-center gap-1">
                            <Building className="h-3 w-3" /> {job.department}
                          </span>
                        )}
                        {job.client_name && <span>• {job.client_name}</span>}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Min {job.min_experience_years} yrs exp
                        </span>
                      </div>
                    </div>
                    <Badge variant={job.status === "active" ? "success" : "secondary"}>
                      {job.status}
                    </Badge>
                  </div>

                  {job.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{job.description}</p>
                  )}

                  {/* Skills tags */}
                  <div className="pt-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Required & Preferred Skills ({job.job_skills.length}):
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {job.job_skills.map((js) => (
                        <span
                          key={js.id}
                          className={`text-xs px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                            js.requirement_type === "required"
                              ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/30 font-medium"
                              : "bg-secondary text-muted-foreground border-border text-[11px]"
                          }`}
                        >
                          <span>{js.skill.name}</span>
                          <span className="opacity-60 text-[10px]">w:{js.weight}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 mt-4 border-t border-border/50">
                  <span className="text-xs text-muted-foreground">
                    Created {new Date(job.created_at).toLocaleDateString()}
                  </span>
                  <Link to={`/recruiter/jobs/${job.id}`}>
                    <Button variant="outline" size="sm">
                      Edit Job Details <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
