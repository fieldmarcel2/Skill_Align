import React from "react";
import { CheckCircle2, XCircle, Briefcase, Award, ShieldAlert, Sparkles } from "lucide-react";
import { SkillMatchBreakdown } from "../../types";

interface MatchExplanationCardProps {
  score: number;
  matchedSkills?: string[];
  missingSkills?: string[];
  skillBreakdown?: SkillMatchBreakdown[];
  candidateExperience: number;
  requiredExperience: number;
  meetsExperience: boolean;
  explanation?: string | null;
  isBlacklisted?: boolean;
  blacklistUntil?: string | null;
}

export const MatchExplanationCard: React.FC<MatchExplanationCardProps> = ({
  score,
  matchedSkills = [],
  missingSkills = [],
  skillBreakdown,
  candidateExperience,
  requiredExperience,
  meetsExperience,
  explanation,
  isBlacklisted = false,
  blacklistUntil,
}) => {
  const getScoreColor = (val: number) => {
    if (val >= 80) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    if (val >= 60) return "text-blue-400 bg-blue-500/10 border-blue-500/30";
    if (val >= 40) return "text-amber-400 bg-amber-500/10 border-amber-500/30";
    return "text-rose-400 bg-rose-500/10 border-rose-500/30";
  };

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 space-y-5 shadow-sm">
      {/* Blacklist Warning */}
      {isBlacklisted && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
          <div className="text-xs">
            <h5 className="font-bold text-red-800 dark:text-red-300">Candidate Currently Blacklisted (6-Month Cooldown)</h5>
            <p className="mt-0.5 text-red-700/90 dark:text-red-400/90">
              This candidate rejected a formal job offer. Active blacklist restriction applies until{" "}
              <span className="font-mono font-semibold">
                {blacklistUntil ? new Date(blacklistUntil).toLocaleDateString() : "the cooldown period ends"}
              </span>.
            </p>
          </div>
        </div>
      )}

      {/* Header Match Score */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            AI Match Scorecard
          </span>
          <h4 className="text-base font-bold font-outfit text-foreground mt-0.5">Role Fit Evaluation</h4>
        </div>
        <div className={`px-4 py-1.5 rounded-full border font-bold text-base shadow-xs ${getScoreColor(score)}`}>
          {Math.round(score)}% Match
        </div>
      </div>

      {/* Explanation Summary */}
      {explanation && (
        <div className="text-xs text-foreground/90 bg-muted/40 p-4 rounded-xl border border-border/60 leading-relaxed space-y-1">
          <div className="font-bold text-primary flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
            <Sparkles className="w-3 h-3" /> AI Match Narrative
          </div>
          <p>{explanation}</p>
        </div>
      )}

      {/* Experience Check */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-xl bg-muted/30 border border-border/60 text-xs">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-primary" />
          <span className="text-foreground font-semibold">Experience Requirement:</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-muted-foreground font-medium">
            {candidateExperience.toFixed(1)} yrs candidate / {requiredExperience.toFixed(1)} yrs required
          </span>
          {meetsExperience ? (
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Meets
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1">
              <XCircle className="w-3 h-3" /> Below Target
            </span>
          )}
        </div>
      </div>

      {/* Skills Grid */}
      <div className="space-y-4 pt-1">
        {/* Matched Skills */}
        <div>
          <span className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Matched Skills ({matchedSkills.length})
          </span>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {matchedSkills.length > 0 ? (
              matchedSkills.map((s, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                >
                  ✓ {s}
                </span>
              ))
            ) : (
              <span className="text-xs text-muted-foreground italic">No direct required skills matched</span>
            )}
          </div>
        </div>

        {/* Missing Skills */}
        {missingSkills.length > 0 && (
          <div>
            <span className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 text-rose-500" />
              Skill Gaps ({missingSkills.length})
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {missingSkills.map((s, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-lg text-xs font-medium bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/25"
                >
                  ✗ {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default MatchExplanationCard;
