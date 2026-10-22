import React, { useId } from "react";
import { cn } from "../../lib/utils";

interface MatchScoreGaugeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  className?: string;
  showSubtitle?: boolean;
  subtitle?: string;
}

/**
 * MatchScoreGauge
 * ===============
 * Enterprise-grade radial score indicator with SVG gradient stroke,
 * subtle ambient glow, and refined typography.
 */
export const MatchScoreGauge: React.FC<MatchScoreGaugeProps> = ({
  score,
  size = "md",
  className,
  showSubtitle = true,
  subtitle = "Match",
}) => {
  const uniqueId = useId().replace(/:/g, "");
  const normalized = Number(score) || 0;
  const scorePercent = Math.round(normalized > 1 ? normalized : normalized * 100);

  // Gradient & color mapping
  const config =
    scorePercent >= 80
      ? {
          start: "#10b981", // emerald-500
          end: "#06b6d4",   // cyan-500
          textColor: "text-emerald-600 dark:text-emerald-400",
          trackColor: "stroke-slate-200/90 dark:stroke-slate-800/80",
          glowColor: "rgba(16, 185, 129, 0.25)",
          borderColor: "border-slate-200/90 dark:border-slate-800/80",
        }
      : scorePercent >= 65
      ? {
          start: "#3b82f6", // blue-500
          end: "#0ea5e9",   // sky-500
          textColor: "text-sky-600 dark:text-sky-400",
          trackColor: "stroke-slate-200/90 dark:stroke-slate-800/80",
          glowColor: "rgba(14, 165, 233, 0.22)",
          borderColor: "border-slate-200/90 dark:border-slate-800/80",
        }
      : scorePercent >= 50
      ? {
          start: "#f59e0b", // amber-500
          end: "#ea580c",   // orange-600
          textColor: "text-amber-600 dark:text-amber-400",
          trackColor: "stroke-slate-200/90 dark:stroke-slate-800/80",
          glowColor: "rgba(245, 158, 11, 0.22)",
          borderColor: "border-slate-200/90 dark:border-slate-800/80",
        }
      : {
          start: "#f43f5e", // rose-500
          end: "#e11d48",   // rose-600
          textColor: "text-rose-600 dark:text-rose-400",
          trackColor: "stroke-slate-200/90 dark:stroke-slate-800/80",
          glowColor: "rgba(244, 63, 94, 0.22)",
          borderColor: "border-slate-200/90 dark:border-slate-800/80",
        };

  if (size === "sm") {
    // Inline micro-pill badge
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-xs",
          config.borderColor,
          className
        )}
        title={`AI Match Fit: ${scorePercent}%`}
      >
        <span
          className="w-2 h-2 rounded-full shrink-0 shadow-xs"
          style={{ backgroundColor: config.start }}
        />
        <span className={cn("text-xs font-bold font-mono", config.textColor)}>
          {scorePercent}%
        </span>
        {showSubtitle && (
          <span className="text-[10px] text-muted-foreground font-semibold">
            {subtitle}
          </span>
        )}
      </div>
    );
  }

  // Radial Ring dimensions
  const isLg = size === "lg";
  const dim = isLg ? 66 : 52;
  const strokeWidth = isLg ? 3.5 : 2.75;
  const radius = isLg ? 26.5 : 20.5;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (circumference * Math.min(100, Math.max(0, scorePercent))) / 100;
  const gradId = `gauge-grad-${uniqueId}`;

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center shrink-0 rounded-2xl bg-white/95 dark:bg-slate-900/90 backdrop-blur-md border shadow-xs transition-all duration-200 hover:shadow-sm",
        config.borderColor,
        isLg ? "w-[66px] h-[66px]" : "w-[52px] h-[52px]",
        className
      )}
      title={`Algorithm Match Score: ${scorePercent}% based on resume evidence, required skills, and experience`}
    >
      <svg
        width={dim}
        height={dim}
        className="transform -rotate-90 pointer-events-none"
        viewBox={`0 0 ${dim} ${dim}`}
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={config.start} />
            <stop offset="100%" stopColor={config.end} />
          </linearGradient>
        </defs>

        {/* Background track */}
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className={config.trackColor}
          fill="transparent"
        />

        {/* Dynamic progress stroke */}
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke={`url(#${gradId})`}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 0 3px ${config.glowColor})`,
            transition: "stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </svg>

      {/* Center Label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
        <span
          className={cn(
            "font-extrabold font-outfit tracking-tight leading-none text-foreground",
            isLg ? "text-base" : "text-xs"
          )}
        >
          {scorePercent}%
        </span>
        {showSubtitle && (
          <span
            className={cn(
              "font-bold uppercase tracking-wider text-muted-foreground",
              isLg ? "text-[8.5px] mt-0.5" : "text-[7.5px] mt-0.5"
            )}
          >
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};

export default MatchScoreGauge;
