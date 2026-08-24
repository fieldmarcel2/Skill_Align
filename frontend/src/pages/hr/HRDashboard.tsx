import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { jobsApi, matchingApi } from "../../services/api";
import { Job } from "../../types";
import { useToast } from "../../components/ui/toast";
import { Button } from "../../components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { StatCard } from "../../components/common/StatCard";
import {
  Briefcase,
  Sparkles,
  Users,
  Building,
  Clock,
  ArrowRight,
  Loader2,
  BookmarkCheck,
  CheckCircle2,
} from "lucide-react";

export const HRDashboard: React.FC = () => {
  const toast = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [runningJobId, setRunningJobId] = useState<number | null>(null);

  const fetchJobs = async () => {
    try {
      const data = await jobsApi.list({ status: "active" });
      setJobs(data);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to load active jobs.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleRunMatch = async (jobId: number) => {
    setRunningJobId(jobId);
    try {
      const result = await matchingApi.runMatch(jobId);
      toast.success(
        `Matching complete! Scored ${result.total_candidates} candidates.`,
        "Algorithm Executed"
      );
      // Redirect to matches detail
      window.location.href = `/hr/jobs/${jobId}/matches`;
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to execute matching algorithm.");
    } finally {
      setRunningJobId(null);
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
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-outfit text-foreground tracking-tight">
            HR Candidate Matching Portal
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Evaluate open job requirements, execute algorithmic talent matching, and curate candidate shortlists.
          </p>
        </div>
        <Link to="/hr/shortlists">
          <Button variant="outline" className="gap-2">
            <BookmarkCheck className="h-4 w-4 text-emerald-400" /> View Shortlisted Candidates
          </Button>
        </Link>
      </div>

      {/* Top Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          title="Active Requisitions"
          value={jobs.length}
          icon={Briefcase}
          color="indigo"
          description="Open jobs ready for matching"
        />
        <StatCard
          title="Engine Status"
          value="Ready"
          icon={Sparkles}
          color="emerald"
          description="Weighted proficiency model active"
        />
        <StatCard
          title="Shortlist Pipeline"
          value="Active"
          icon={BookmarkCheck}
          color="blue"
          description="Direct handoff to recruiters"
        />
      </div>

      {/* Active Jobs Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold font-outfit text-foreground">
            Active Job Requisitions ({jobs.length})
          </h2>
        </div>

        {jobs.length === 0 ? (
          <Card className="p-12 text-center border-border/80 bg-card/60">
            <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <h3 className="text-base font-semibold text-foreground">No active jobs found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Ask your recruiters to create and publish active job requisitions.
            </p>
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
                        {job.client_name && (
                          <span className="text-slate-400 font-medium">
                            • {job.client_name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Min {job.min_experience_years} yrs exp
                        </span>
                      </div>
                    </div>
                    <Badge variant="success">Active</Badge>
                  </div>

                  {job.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {job.description}
                    </p>
                  )}

                  {/* Skills tags */}
                  <div className="pt-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Weighted Skills Criteria ({job.job_skills.length}):
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

                {/* Actions */}
                <div className="flex items-center justify-between pt-6 mt-4 border-t border-border/50">
                  <span className="text-xs text-muted-foreground">
                    Posted by <span className="text-foreground">{job.creator.name}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="gradient"
                      size="sm"
                      className="gap-2 shadow-md shadow-indigo-500/20"
                      disabled={runningJobId === job.id}
                      onClick={() => handleRunMatch(job.id)}
                    >
                      {runningJobId === job.id ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Scoring...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5" /> Run Match
                        </>
                      )}
                    </Button>
                    <Link to={`/hr/jobs/${job.id}/matches`}>
                      <Button variant="outline" size="sm">
                        View Matches <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
