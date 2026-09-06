import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  UserCheck,
  FileText,
  CheckCircle2,
  XCircle,
  Briefcase,
  MapPin,
  Clock,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  HelpCircle,
  Tag,
  User,
} from "lucide-react";
import { MatchResult } from "../../types";
import { cn } from "../../lib/utils";

interface CandidateCardProps {
  match: MatchResult;
  currentUserId?: number;
  onClaim?: (jobId: number, candidateId: number) => Promise<void>;
  onScreen?: (matchId: number, status: "screened" | "rejected") => Promise<void>;
  showJobTitle?: boolean;
}

export const CandidateCard: React.FC<CandidateCardProps> = ({
  match,
  currentUserId,
  onClaim,
  onScreen,
  showJobTitle = false,
}) => {
  const [isClaiming, setIsClaiming] = useState(false);
  const [isScreening, setIsScreening] = useState(false);

  const candidate = match.candidate;
  const isAssigned =
    (match.assignment_status === "claimed" || match.assignment_status === "assigned") &&
    Boolean(match.assigned_recruiter);
  const isClaimedByMe = isAssigned && match.assigned_recruiter?.id === currentUserId;
  const isClaimedByOther = isAssigned && match.assigned_recruiter?.id !== currentUserId;
  const isUnassigned = !isAssigned;

  const handleClaim = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onClaim) return;
    try {
      setIsClaiming(true);
      await onClaim(match.job_id, match.candidate_id);
    } finally {
      setIsClaiming(false);
    }
  };

  const handleScreenAction = async (e: React.MouseEvent, status: "screened" | "rejected") => {
    e.preventDefault();
    e.stopPropagation();
    if (!onScreen) return;
    try {
      setIsScreening(true);
      await onScreen(match.id, status);
    } finally {
      setIsScreening(false);
    }
  };

  // Score color helper with safe 0-100 normalization
  const rawScore = Number(match.overall_score) || 0;
  const scorePercent = Math.round(rawScore > 1 ? rawScore : rawScore * 100);
  const scoreColor =
    scorePercent >= 80
      ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/30"
      : scorePercent >= 65
      ? "text-sky-500 bg-sky-500/10 border-sky-500/30"
      : scorePercent >= 50
      ? "text-amber-500 bg-amber-500/10 border-amber-500/30"
      : "text-rose-500 bg-rose-500/10 border-rose-500/30";

  return (
    <div className="group relative bg-card/80 backdrop-blur-sm border border-border/80 hover:border-primary/50 transition-all duration-300 rounded-xl p-5 shadow-sm hover:shadow-md flex flex-col justify-between">
      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Link
                to={`/recruiter/jobs/${match.job_id}/candidates/${match.candidate_id}`}
                className="text-base font-bold text-foreground hover:text-primary transition-colors truncate"
              >
                {candidate?.full_name || "Candidate #" + match.candidate_id}
              </Link>

              {/* Assignment Badge */}
              {isClaimedByMe ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <UserCheck className="w-3 h-3" />
                  Claimed by You
                </span>
              ) : isClaimedByOther ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-secondary text-muted-foreground border border-border">
                  <User className="w-3 h-3" />
                  Assigned: {match.assigned_recruiter?.name}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
                  Unassigned
                </span>
              )}

              {/* Status Badge */}
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-[11px] font-medium uppercase tracking-wider border",
                  match.status === "screened" || match.status === "approved_by_hr"
                    ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                    : match.status === "rejected"
                    ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                    : "bg-secondary text-secondary-foreground border-border"
                )}
              >
                {match.status.replace(/_/g, " ")}
              </span>
            </div>

            {showJobTitle && match.job && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <Briefcase className="w-3 h-3 text-primary" />
                Job: <span className="font-medium text-foreground">{match.job.title}</span>
              </p>
            )}

            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
              {candidate?.total_experience_years !== undefined && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {candidate.total_experience_years} yrs exp
                </span>
              )}
              {(candidate?.city || candidate?.state) && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {[candidate.city, candidate.state].filter(Boolean).join(", ")}
                </span>
              )}
            </div>
          </div>

          {/* Match Score Gauge */}
          <div
            className={cn(
              "flex flex-col items-center justify-center min-w-[56px] h-14 rounded-xl border px-2.5",
              scoreColor
            )}
            title="Algorithm Match Score based on resume evidence, required skills, and experience"
          >
            <span className="text-lg font-extrabold leading-none">{scorePercent}%</span>
            <span className="text-[10px] font-bold uppercase tracking-wider mt-0.5">Match</span>
          </div>
        </div>

        {/* Skill Evidence Highlights */}
        <div className="my-3 space-y-2 border-t border-border/40 pt-3">
          {/* Matched Required Skills */}
          {match.skill_breakdown && match.skill_breakdown.length > 0 ? (
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-primary" />
                Required Skills Match:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {match.skill_breakdown.map((sk) => {
                  const isResumeDetected = sk.source === "resume" || Boolean(sk.evidence_text);
                  const hasEvidence = Boolean(sk.evidence_text);

                  return (
                    <span
                      key={sk.skill_id}
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs border font-medium",
                        isResumeDetected
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25"
                          : "bg-secondary text-foreground border-border"
                      )}
                      title={
                        hasEvidence
                          ? `Resume quote: "${sk.evidence_text}"`
                          : isResumeDetected
                          ? "Verified from resume text"
                          : "Self-Declared by candidate"
                      }
                    >
                      {sk.skill_name}
                      {isResumeDetected ? (
                        <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-bold">
                          Resume
                        </span>
                      ) : (
                        <span className="text-[10px] px-1 py-0.2 rounded bg-secondary text-muted-foreground">
                          Self
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          ) : match.matched_skills && match.matched_skills.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {match.matched_skills.map((s) => (
                <span
                  key={s}
                  className="px-2 py-0.5 rounded-md text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                >
                  {s}
                </span>
              ))}
            </div>
          ) : null}

          {/* Missing Required Skills */}
          {match.missing_skills && match.missing_skills.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
              <span className="text-rose-500 font-medium">Missing:</span>
              <div className="flex flex-wrap gap-1">
                {match.missing_skills.slice(0, 3).map((m) => (
                  <span
                    key={m}
                    className="px-1.5 py-0.5 rounded text-[11px] bg-rose-500/10 text-rose-500 border border-rose-500/20"
                  >
                    {m}
                  </span>
                ))}
                {match.missing_skills.length > 3 && (
                  <span className="text-[11px] text-muted-foreground">
                    +{match.missing_skills.length - 3}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Additional Candidate Skills Portfolio from Resume & Profile */}
          {(() => {
            const requiredSkillNames = new Set(
              match.skill_breakdown?.map((s) => s.skill_name.toLowerCase()) || []
            );
            const additionalSkills = (candidate?.skills || [])
              .filter((cs) => cs.skill?.name && !requiredSkillNames.has(cs.skill.name.toLowerCase()))
              .map((cs) => ({
                name: cs.skill.name,
                isResume: cs.source === "resume" || Boolean(cs.evidence_text),
              }));

            if (additionalSkills.length === 0) return null;

            return (
              <div className="space-y-1 pt-2 border-t border-border/40">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  Candidate Skills Portfolio ({additionalSkills.length}):
                </span>
                <div className="flex flex-wrap gap-1">
                  {additionalSkills.slice(0, 6).map((ask, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] bg-secondary/80 text-foreground border border-border/60"
                      title={ask.isResume ? "Extracted from candidate resume" : "Self-declared skill"}
                    >
                      {ask.name}
                      {ask.isResume && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold">
                          Resume
                        </span>
                      )}
                    </span>
                  ))}
                  {additionalSkills.length > 6 && (
                    <span className="text-[11px] text-muted-foreground self-center px-1">
                      +{additionalSkills.length - 6} more
                    </span>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Bottom Footer Actions */}
      <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between gap-2">
        {/* Left: Claim or Status */}
        {isUnassigned ? (
          <button
            type="button"
            onClick={handleClaim}
            disabled={isClaiming}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50"
          >
            <UserCheck className="w-3.5 h-3.5" />
            {isClaiming ? "Claiming..." : "Assign to Me"}
          </button>
        ) : isClaimedByMe && match.status === "matched" ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => handleScreenAction(e, "screened")}
              disabled={isScreening}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm"
              title="Screen and endorse candidate"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Screen
            </button>
            <button
              type="button"
              onClick={(e) => handleScreenAction(e, "rejected")}
              disabled={isScreening}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-secondary hover:bg-rose-500/10 text-rose-500 border border-border hover:border-rose-500/30 transition"
              title="Reject candidate"
            >
              <XCircle className="w-3.5 h-3.5" />
              Reject
            </button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground font-medium">
            {isClaimedByOther ? `Claimed by ${match.assigned_recruiter?.name}` : "Ready for review"}
          </span>
        )}

        {/* Right: View Profile */}
        <Link
          to={`/recruiter/jobs/${match.job_id}/candidates/${match.candidate_id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          View Profile
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
