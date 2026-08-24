import React, { useEffect, useState } from "react";
import { matchingApi, candidatesApi } from "../../services/api";
import { MatchResult } from "../../types";
import { useToast } from "../../components/ui/toast";
import { Button } from "../../components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { ScoreBadge } from "../../components/common/ScoreBadge";
import { getProficiencyBadgeClass } from "../../lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/dialog";
import {
  UserCheck,
  Briefcase,
  FileText,
  Phone,
  Clock,
  Layers,
  XCircle,
  CheckCircle2,
  Download,
  Loader2,
  ExternalLink,
} from "lucide-react";

export const ShortlistsPage: React.FC = () => {
  const toast = useToast();
  const [shortlists, setShortlists] = useState<MatchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCandidateMatch, setSelectedCandidateMatch] = useState<MatchResult | null>(null);

  const fetchShortlists = async () => {
    try {
      const data = await matchingApi.listShortlists();
      setShortlists(data);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to load shortlists.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShortlists();
  }, []);

  const handleReject = async (matchId: number) => {
    if (!window.confirm("Are you sure you want to reject this shortlisted candidate?")) return;
    try {
      await matchingApi.updateStatus(matchId, "rejected");
      setShortlists((prev) => prev.filter((m) => m.id !== matchId));
      setSelectedCandidateMatch(null);
      toast.info("Candidate removed from shortlist and marked as rejected.");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to reject candidate.");
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
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-extrabold font-outfit text-foreground tracking-tight flex items-center gap-3">
          Shortlisted Candidates
          <Badge variant="success" className="text-xs">
            {shortlists.length} Ready for Review
          </Badge>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Top-matching candidates shortlisted by HR for your job requisitions.
        </p>
      </div>

      {shortlists.length === 0 ? (
        <Card className="p-12 text-center border-border/80 bg-card/60">
          <UserCheck className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-semibold text-foreground">No shortlisted candidates yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            When HR runs matching algorithms on your active jobs and shortlists candidates, they will appear here.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {shortlists.map((match) => (
            <Card
              key={match.id}
              className="border-border/80 bg-card/70 backdrop-blur-xl p-6 hover:border-emerald-500/40 transition-all"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-3">
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

                  {/* Skills tags preview */}
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
                    {match.candidate.skills.length > 6 && (
                      <span className="text-xs px-2 py-0.5 text-muted-foreground">
                        +{match.candidate.skills.length - 6} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Score & Actions */}
                <div className="flex items-center justify-between lg:justify-end gap-5 shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-border/50">
                  <ScoreBadge score={match.overall_score} size="md" />

                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSelectedCandidateMatch(match)}
                      className="text-xs"
                    >
                      View Profile & Resume
                    </Button>

                    {match.candidate.resume_file_path && (
                      <a
                        href={candidatesApi.getResumeUrl(match.candidate.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-xs text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/10"
                        >
                          <FileText className="h-3.5 w-3.5" /> Resume
                        </Button>
                      </a>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReject(match.id)}
                      className="text-xs text-rose-400 hover:bg-rose-500/10 border-rose-500/30"
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Candidate Profile Details Modal */}
      <Dialog
        open={!!selectedCandidateMatch}
        onOpenChange={(open) => !open && setSelectedCandidateMatch(null)}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedCandidateMatch && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle className="text-2xl font-bold font-outfit">
                      {selectedCandidateMatch.candidate.full_name}
                    </DialogTitle>
                    <DialogDescription className="flex items-center gap-3 pt-1 text-xs">
                      {selectedCandidateMatch.candidate.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" /> {selectedCandidateMatch.candidate.phone}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> Total Experience:{" "}
                        {selectedCandidateMatch.candidate.total_experience_years} Years
                      </span>
                    </DialogDescription>
                  </div>
                  <ScoreBadge score={selectedCandidateMatch.overall_score} size="md" />
                </div>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Resume section */}
                <div className="p-4 rounded-xl border border-border bg-secondary/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-6 w-6 text-primary" />
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">Candidate Resume</h4>
                      <p className="text-xs text-muted-foreground">
                        {selectedCandidateMatch.candidate.resume_file_path
                          ? "Resume uploaded on file"
                          : "No resume uploaded yet"}
                      </p>
                    </div>
                  </div>
                  {selectedCandidateMatch.candidate.resume_file_path && (
                    <a
                      href={candidatesApi.getResumeUrl(selectedCandidateMatch.candidate.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="gradient" size="sm" className="gap-1.5">
                        <Download className="h-4 w-4" /> Download / Open Resume
                      </Button>
                    </a>
                  )}
                </div>

                {/* Candidate all declared skills */}
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Layers className="h-4 w-4 text-indigo-400" /> Complete Candidate Skills Portfolio
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {selectedCandidateMatch.candidate.skills.map((cs) => (
                      <div
                        key={cs.id}
                        className="p-3 rounded-xl border border-border/70 bg-card/60 flex items-center justify-between"
                      >
                        <div>
                          <span className="text-sm font-semibold text-foreground">
                            {cs.skill.name}
                          </span>
                          <span className="block text-[11px] text-muted-foreground">
                            {cs.skill.category}
                          </span>
                        </div>
                        <div className="text-right">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-md border font-semibold ${getProficiencyBadgeClass(
                              cs.proficiency_level
                            )}`}
                          >
                            {cs.proficiency_level}
                          </span>
                          <span className="block text-[10px] text-muted-foreground pt-0.5">
                            {cs.years_experience} yrs exp
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
