import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { matchingApi, candidatesApi } from "../../services/api";
import { MatchResult } from "../../types";
import { useToast } from "../../components/ui/toast";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { ScoreBadge } from "../../components/common/ScoreBadge";
import { getProficiencyBadgeClass } from "../../lib/utils";
import {
  BookmarkCheck,
  Briefcase,
  FileText,
  Clock,
  ArrowLeft,
  ArrowRight,
  Loader2,
} from "lucide-react";

export const HRShortlistsPage: React.FC = () => {
  const toast = useToast();
  const [shortlists, setShortlists] = useState<MatchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadShortlists = async () => {
      try {
        const data = await matchingApi.listShortlists();
        setShortlists(data);
      } catch (err: any) {
        toast.error("Failed to load shortlisted candidates.");
      } finally {
        setIsLoading(false);
      }
    };
    loadShortlists();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Link
        to="/hr"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to HR Dashboard
      </Link>

      <div>
        <h1 className="text-3xl font-extrabold font-outfit text-foreground tracking-tight flex items-center gap-3">
          Shortlisted Candidate Pipeline
          <Badge variant="success">{shortlists.length} Candidates</Badge>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Candidates who met criteria thresholds and were shortlisted for recruiter review.
        </p>
      </div>

      {shortlists.length === 0 ? (
        <Card className="p-12 text-center border-border/80 bg-card/60">
          <BookmarkCheck className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-semibold text-foreground">No candidates shortlisted yet</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Run matching on active jobs from your HR Dashboard and click "Shortlist" on top candidates.
          </p>
          <Link to="/hr">
            <Button variant="gradient">Go to HR Dashboard</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {shortlists.map((match) => (
            <Card
              key={match.id}
              className="border-border/80 bg-card/70 backdrop-blur-xl p-6 hover:border-primary/40 transition-all"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-bold font-outfit text-foreground">
                      {match.candidate.full_name}
                    </h3>
                    <Badge variant="info" className="gap-1">
                      <Briefcase className="h-3 w-3" /> Job: {match.job?.title || "Requisition"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Total Exp: {match.candidate.total_experience_years} Years
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {match.candidate.skills.slice(0, 6).map((cs) => (
                      <span
                        key={cs.id}
                        className={`text-xs px-2.5 py-0.5 rounded-md border font-medium ${getProficiencyBadgeClass(
                          cs.proficiency_level
                        )}`}
                      >
                        {cs.skill.name} ({cs.proficiency_level})
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between lg:justify-end gap-5 shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-border/50">
                  <ScoreBadge score={match.overall_score} size="md" />
                  <Link to={`/hr/jobs/${match.job_id}/matches`}>
                    <Button variant="outline" size="sm">
                      View Job Matching <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
