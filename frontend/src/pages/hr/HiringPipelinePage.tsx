import React, { useEffect, useState, useCallback } from "react";
import { jobsApi, matchingApi } from "../../services/api";
import { Job, MatchResult } from "../../types";
import { useToast } from "../../components/ui/toast";
import { Card } from "../../components/ui/card";
import { HiringPipelineBoard } from "../../components/pipeline/HiringPipelineBoard";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Briefcase, Loader2, Kanban, RefreshCw } from "lucide-react";

export const HiringPipelinePage: React.FC = () => {
  const toast = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);

  const fetchJobs = async () => {
    try {
      const data = await jobsApi.list();
      setJobs(data);
      if (data.length > 0 && selectedJobId === null) {
        setSelectedJobId(data[0].id);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to load jobs.");
    } finally {
      setIsLoadingJobs(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchMatches = useCallback(async (jobId: number) => {
    setIsLoadingMatches(true);
    try {
      const data = await matchingApi.getMatches(jobId);
      // Filter out rejected for pipeline view
      setMatches(data.filter((m) => m.status !== "rejected"));
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to load match results.");
    } finally {
      setIsLoadingMatches(false);
    }
  }, [toast]);

  useEffect(() => {
    if (selectedJobId !== null) {
      fetchMatches(selectedJobId);
    }
  }, [selectedJobId, fetchMatches]);

  const selectedJob = jobs.find((j) => j.id === selectedJobId);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-outfit text-foreground tracking-tight flex items-center gap-3">
            <Kanban className="h-7 w-7 text-primary" />
            Hiring Pipeline
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Drag and drop candidates through the hiring stages or click "Schedule" to arrange interview rounds.
          </p>
        </div>
        {selectedJobId && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs"
            onClick={() => fetchMatches(selectedJobId)}
            disabled={isLoadingMatches}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoadingMatches ? "animate-spin" : ""}`} /> Refresh Pipeline
          </Button>
        )}
      </div>

      {/* Job selector */}
      {isLoadingJobs ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading jobs...</span>
        </div>
      ) : jobs.length === 0 ? (
        <Card className="p-10 text-center">
          <Briefcase className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            No jobs found. Ask recruiters to create job requisitions.
          </p>
        </Card>
      ) : (
        <Card className="border-border/80 bg-card/60 backdrop-blur-xl p-4">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-2">
              Select Job:
            </span>
            {jobs.map((job) => (
              <button
                key={job.id}
                type="button"
                onClick={() => setSelectedJobId(job.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  selectedJobId === job.id
                    ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                    : "bg-secondary text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {job.title}
                {job.department && (
                  <span className="ml-1.5 opacity-60">· {job.department}</span>
                )}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Selected job meta */}
      {selectedJob && (
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <Badge variant={selectedJob.status === "active" ? "success" : "secondary"}>
            {selectedJob.status}
          </Badge>
          <span>Min {selectedJob.min_experience_years} yrs exp</span>
          <span>·</span>
          <span>{selectedJob.job_skills?.length || 0} skills defined</span>
          <span>·</span>
          <span>{matches.length} candidates active in pipeline</span>
        </div>
      )}

      {/* Kanban board */}
      {selectedJobId && (
        isLoadingMatches ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : matches.length === 0 ? (
          <Card className="p-10 text-center space-y-2">
            <Kanban className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2 opacity-60" />
            <h3 className="text-base font-bold text-foreground">No candidates in pipeline for this job</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Candidates will appear here once matching is run and candidates progress through the stages.
            </p>
          </Card>
        ) : (
          <HiringPipelineBoard
            key={selectedJobId}
            initialMatches={matches}
            onMatchesUpdate={setMatches}
          />
        )
      )}
    </div>
  );
};
