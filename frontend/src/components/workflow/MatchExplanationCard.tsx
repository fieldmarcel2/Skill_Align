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
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
      {/* Blacklist Warning */}
      {isBlacklisted && (
        <div className="flex items-start gap-3 p-3.5 rounded-lg bg-red-600/15 border border-red-600/40 text-red-400">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
          <div className="text-xs">
            <h5 className="font-bold text-red-300">Candidate Currently Blacklisted (6-Month Cooldown)</h5>
            <p className="mt-0.5 text-red-400/90">
              This candidate rejected a formal job offer. Active blacklist restriction applies until{" "}
              <span className="font-mono font-semibold text-red-200">
                {blacklistUntil ? new Date(blacklistUntil).toLocaleDateString() : "the cooldown period ends"}
              </span>.
            </p>
          </div>
        </div>
      )}

      {/* Header Match Score */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            AI Match Scorecard
          </span>
          <h4 className="text-base font-bold text-white mt-0.5">Role Fit Evaluation</h4>
        </div>
        <div className={`px-3.5 py-1.5 rounded-lg border font-bold text-lg ${getScoreColor(score)}`}>
          {Math.round(score)}% Match
        </div>
      </div>

      {/* Explanation Summary */}
      {explanation && (
        <p className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 leading-relaxed">
          {explanation}
        </p>
      )}

      {/* Experience Check */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/40 border border-slate-800/60 text-xs">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-slate-400" />
          <span className="text-slate-300">Experience Requirement:</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-slate-200">
            {candidateExperience.toFixed(1)} yrs candidate / {requiredExperience.toFixed(1)} yrs required
          </span>
          {meetsExperience ? (
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Meets
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[11px] font-semibold flex items-center gap-1">
              <XCircle className="w-3 h-3" /> Below Target
            </span>
          )}
        </div>
      </div>

      {/* Skills Grid */}
      <div className="space-y-3 pt-1">
        {/* Matched Skills */}
        <div>
          <span className="text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Matched Skills ({matchedSkills.length})
          </span>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {matchedSkills.length > 0 ? (
              matchedSkills.map((s, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/25"
                >
                  ✓ {s}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-500 italic">No direct required skills matched</span>
            )}
          </div>
        </div>

        {/* Missing Skills */}
        {missingSkills.length > 0 && (
          <div>
            <span className="text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 text-rose-400" />
              Skill Gaps ({missingSkills.length})
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {missingSkills.map((s, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-md text-xs font-medium bg-rose-500/10 text-rose-300 border border-rose-500/25"
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
