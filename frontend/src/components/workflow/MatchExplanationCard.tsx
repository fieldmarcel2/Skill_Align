import React, { useId } from "react";
import {
  CheckCircle2,
  XCircle,
  Briefcase,
  ShieldAlert,
  Sparkles,
  Award,
  TrendingUp,
  Check,
  AlertCircle,
  Clock,
  Layers,
} from "lucide-react";
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
  const uniqueId = useId().replace(/:/g, "");
  const normalized = Number(score) || 0;
  const scorePercent = Math.min(100, Math.max(0, Math.round(normalized > 1 ? normalized : normalized * 100)));

  // Score tier configuration
  const tier = (() => {
    if (scorePercent >= 85) {
      return {
        label: "Exceptional Match",
        subtext: "Top-Tier Algorithmic Fit",
        badgeBg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
        pillBg: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60",
        startColor: "#10b981", // emerald-500
        endColor: "#06b6d4",   // cyan-500
        glow: "rgba(16, 185, 129, 0.35)",
        topGradient: "from-emerald-500 via-teal-400 to-cyan-500",
        auraColor: "rgba(16, 185, 129, 0.08)",
        ringTrack: "stroke-emerald-950/10 dark:stroke-emerald-900/20",
      };
    }
    if (scorePercent >= 70) {
      return {
        label: "Strong Fit",
        subtext: "Qualified Competencies",
        badgeBg: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
        pillBg: "bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/60",
        startColor: "#3b82f6", // blue-500
        endColor: "#0ea5e9",   // sky-500
        glow: "rgba(59, 130, 246, 0.35)",
        topGradient: "from-sky-500 via-blue-400 to-indigo-500",
        auraColor: "rgba(59, 130, 246, 0.08)",
        ringTrack: "stroke-sky-950/10 dark:stroke-sky-900/20",
      };
    }
    if (scorePercent >= 50) {
      return {
        label: "Moderate Fit",
        subtext: "Partial Skill Alignment",
        badgeBg: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
        pillBg: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60",
        startColor: "#f59e0b", // amber-500
        endColor: "#ea580c",   // orange-600
        glow: "rgba(245, 158, 11, 0.35)",
        topGradient: "from-amber-500 via-orange-400 to-amber-600",
        auraColor: "rgba(245, 158, 11, 0.08)",
        ringTrack: "stroke-amber-950/10 dark:stroke-amber-900/20",
      };
    }
    return {
      label: "Low Alignment",
      subtext: "Significant Skill Gaps",
      badgeBg: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
      pillBg: "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60",
      startColor: "#f43f5e", // rose-500
      endColor: "#e11d48",   // rose-600
      glow: "rgba(244, 63, 94, 0.35)",
      topGradient: "from-rose-500 via-pink-400 to-rose-600",
      auraColor: "rgba(244, 63, 94, 0.08)",
      ringTrack: "stroke-rose-950/10 dark:stroke-rose-900/20",
    };
  })();

  // Circular gauge calculations
  const gaugeDim = 60;
  const strokeWidth = 3.75;
  const radius = 24.5;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * scorePercent) / 100;
  const gaugeGradId = `card-gauge-grad-${uniqueId}`;

  // Metrics breakdown calculations
  const totalSkills = matchedSkills.length + missingSkills.length;
  const skillMatchPercent = totalSkills > 0 ? Math.round((matchedSkills.length / totalSkills) * 100) : scorePercent;
  const expRatioPercent = requiredExperience > 0
    ? Math.min(100, Math.round((candidateExperience / requiredExperience) * 100))
    : 100;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-slate-900/95 shadow-sm backdrop-blur-xl transition-all duration-300">
      {/* Sleek 2px Luminous Top Accent Line */}
      <div className={`h-1 w-full bg-gradient-to-r ${tier.topGradient}`} />

      {/* Subtle Ambient Background Aura */}
      <div
        className="pointer-events-none absolute -top-12 -right-12 w-64 h-64 rounded-full blur-3xl opacity-60 dark:opacity-30 transition-all duration-700"
        style={{ backgroundColor: tier.auraColor }}
      />

      <div className="p-5 sm:p-6 space-y-6 relative z-10">
        {/* Blacklist Warning */}
        {isBlacklisted && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
            <div className="text-xs">
              <h5 className="font-bold text-red-800 dark:text-red-300">
                Candidate Currently Blacklisted (6-Month Cooldown)
              </h5>
              <p className="mt-0.5 text-red-700/90 dark:text-red-400/90">
                This candidate rejected a formal job offer. Active blacklist restriction applies until{" "}
                <span className="font-mono font-semibold">
                  {blacklistUntil ? new Date(blacklistUntil).toLocaleDateString() : "the cooldown period ends"}
                </span>.
              </p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* HEADER: AI Title & Executive Match Scorecard Hero Box                     */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800/80">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Talent Intelligence Engine
            </span>
            <h4 className="text-lg font-bold font-outfit text-foreground mt-0.5">
              Role Fit & Competency Evaluation
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Deterministic scoring based on verified resume vectors and job requirements
            </p>
          </div>

          {/* Premium Executive Match Score Box */}
          <div className="flex items-center gap-4 px-4 py-3 rounded-2xl bg-gradient-to-br from-slate-50/90 via-white to-slate-100/50 dark:from-slate-800/70 dark:via-slate-900/80 dark:to-slate-950/80 border border-slate-200/90 dark:border-slate-700/80 shadow-xs shrink-0">
            {/* High-Precision Circular SVG Gauge */}
            <div className="relative flex items-center justify-center shrink-0">
              <svg
                width={gaugeDim}
                height={gaugeDim}
                className="transform -rotate-90 pointer-events-none"
                viewBox={`0 0 ${gaugeDim} ${gaugeDim}`}
              >
                <defs>
                  <linearGradient id={gaugeGradId} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={tier.startColor} />
                    <stop offset="100%" stopColor={tier.endColor} />
                  </linearGradient>
                </defs>

                {/* Track */}
                <circle
                  cx={gaugeDim / 2}
                  cy={gaugeDim / 2}
                  r={radius}
                  strokeWidth={strokeWidth}
                  className={tier.ringTrack}
                  fill="transparent"
                />

                {/* Progress Stroke */}
                <circle
                  cx={gaugeDim / 2}
                  cy={gaugeDim / 2}
                  r={radius}
                  strokeWidth={strokeWidth}
                  stroke={`url(#${gaugeGradId})`}
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  style={{
                    filter: `drop-shadow(0 0 4px ${tier.glow})`,
                    transition: "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                />
              </svg>

              {/* Center Numerical Score */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                <span className="text-base font-extrabold font-outfit tracking-tight leading-none text-foreground">
                  {scorePercent}%
                </span>
                <span className="text-[7.5px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">
                  MATCH
                </span>
              </div>
            </div>

            {/* Score Tier Badge & Verification Status */}
            <div className="flex flex-col justify-center min-w-[125px]">
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border shadow-2xs ${tier.badgeBg}`}
                >
                  <Sparkles className="w-3 h-3" />
                  {tier.label}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: tier.startColor }}
                />
                <span className="truncate">{tier.subtext}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SUB-METRIC PROGRESS BARS: Skills Match & Experience Compliance            */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Skills Coverage Metric */}
          <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800/70 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary" />
                Required Competency Match
              </span>
              <span className="font-mono font-bold text-foreground">
                {matchedSkills.length} / {totalSkills || 1} ({skillMatchPercent}%)
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700/60 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-emerald-500 to-teal-400"
                style={{ width: `${Math.min(100, Math.max(5, skillMatchPercent))}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {matchedSkills.length === totalSkills && totalSkills > 0
                ? "All required skills directly verified in resume."
                : `${missingSkills.length} skill requirement(s) missing or unverified.`}
            </p>
          </div>

          {/* Experience Compliance Metric */}
          <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800/70 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-primary" />
                Experience Threshold
              </span>
              <span className="font-mono font-bold text-foreground">
                {candidateExperience.toFixed(1)} / {requiredExperience.toFixed(1)} yrs
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700/60 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  meetsExperience
                    ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                    : "bg-gradient-to-r from-amber-500 to-orange-500"
                }`}
                style={{ width: `${Math.min(100, Math.max(5, expRatioPercent))}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">
                {meetsExperience
                  ? "Candidate satisfies minimum role experience"
                  : "Candidate falls below target experience threshold"}
              </span>
              {meetsExperience ? (
                <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 shrink-0">
                  <CheckCircle2 className="w-3 h-3" /> Met
                </span>
              ) : (
                <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 shrink-0">
                  <AlertCircle className="w-3 h-3" /> Gap
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* AI MATCH NARRATIVE BRIEFING                                              */}
        {/* ========================================================================= */}
        {explanation && (
          <div className="relative rounded-xl border border-primary/20 bg-gradient-to-r from-primary/[0.04] via-primary/[0.02] to-transparent p-4 space-y-1.5">
            <div className="font-bold text-primary flex items-center gap-1.5 text-xs tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              Synthesized Fit Analysis & Reasoning
            </div>
            <p className="text-xs text-foreground/90 leading-relaxed font-normal">
              {explanation}
            </p>
          </div>
        )}

        {/* ========================================================================= */}
        {/* DETAILED COMPETENCY BREAKDOWN: Matched Skills vs Skill Gaps               */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Matched Skills */}
          <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.02] dark:bg-emerald-500/[0.04] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Validated Core Skills ({matchedSkills.length})
              </span>
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                Resume Verified
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {matchedSkills.length > 0 ? (
                matchedSkills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/70 shadow-2xs transition-all hover:scale-[1.02]"
                  >
                    <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-xs text-muted-foreground italic">
                  No direct required skills detected in resume
                </span>
              )}
            </div>
          </div>

          {/* Skill Gaps */}
          <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/[0.02] dark:bg-rose-500/[0.04] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-rose-500" />
                Skill Gaps / Missing ({missingSkills.length})
              </span>
              {missingSkills.length > 0 && (
                <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full">
                  Requires Probing
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {missingSkills.length > 0 ? (
                missingSkills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800/70 shadow-2xs"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Full skill coverage achieved — zero requirement gaps!
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Detailed Skill Breakdown with Evidence (if present) */}
        {skillBreakdown && skillBreakdown.length > 0 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              Skill Evidence & Weight Distribution
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {skillBreakdown.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-800/60 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">{item.skill_name || (item as any).skill}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      Weight: {item.weight ? (item.weight * 100).toFixed(0) : "100"}%
                    </span>
                  </div>
                  {item.evidence_text && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2 italic">
                      "{item.evidence_text}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchExplanationCard;
