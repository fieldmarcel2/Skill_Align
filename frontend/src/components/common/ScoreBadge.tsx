import React from "react";
import { getScoreColor } from "../../lib/utils";

interface ScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export const ScoreBadge: React.FC<ScoreBadgeProps> = ({
  score,
  size = "md",
  showLabel = false,
}) => {
  const colors = getScoreColor(score);

  if (size === "sm") {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-bold ${colors.bg} ${colors.text} ${colors.border}`}
      >
        <span>{score.toFixed(1)}%</span>
        {showLabel && <span className="opacity-75 text-[10px]">Match</span>}
      </div>
    );
  }

  if (size === "lg") {
    const strokeDashoffset = 100 - score;
    return (
      <div className="relative inline-flex items-center justify-center">
        <svg className="w-20 h-20 transform -rotate-90">
          <circle
            cx="40"
            cy="40"
            r="32"
            stroke="currentColor"
            strokeWidth="6"
            className="text-secondary"
            fill="transparent"
          />
          <circle
            cx="40"
            cy="40"
            r="32"
            stroke="currentColor"
            strokeWidth="6"
            className={colors.ring}
            fill="transparent"
            strokeDasharray="201.06"
            strokeDashoffset={(201.06 * strokeDashoffset) / 100}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className={`text-lg font-bold ${colors.text}`}>
            {Math.round(score)}%
          </span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Match
          </span>
        </div>
      </div>
    );
  }

  // Default "md" pill badge
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl border text-sm font-semibold shadow-sm ${colors.bg} ${colors.text} ${colors.border}`}
    >
      <div className="relative flex h-2 w-2">
        <span
          className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
            score >= 70 ? "bg-emerald-400" : score >= 50 ? "bg-blue-400" : "bg-amber-400"
          }`}
        />
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${
            score >= 70 ? "bg-emerald-500" : score >= 50 ? "bg-blue-500" : "bg-amber-500"
          }`}
        />
      </div>
      <span>{score.toFixed(1)}% Match</span>
    </div>
  );
};
