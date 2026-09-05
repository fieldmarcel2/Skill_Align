import React from "react";
import { Link } from "react-router-dom";

interface SkillAlignLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showBadge?: boolean;
  badgeText?: string;
  isLink?: boolean;
  to?: string;
  className?: string;
}

export const SkillAlignLogo: React.FC<SkillAlignLogoProps> = ({
  size = "md",
  showBadge = false,
  badgeText = "Enterprise",
  isLink = true,
  to = "/",
  className = "",
}) => {
  // Dimensions based on size prop
  const iconSizes = {
    sm: "h-7 w-7",
    md: "h-9 w-9",
    lg: "h-11 w-11",
    xl: "h-14 w-14",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl",
    xl: "text-4xl",
  };

  const badgeSizes = {
    sm: "text-[9px] px-1.5 py-0.2",
    md: "text-[10px] px-2 py-0.5",
    lg: "text-xs px-2.5 py-0.5",
    xl: "text-xs px-3 py-1",
  };

  const content = (
    <div className={`flex items-center gap-2.5 group select-none ${className}`}>
      {/* Bespoke Geometric Precision Alignment Logo Mark */}
      <div
        className={`relative flex ${iconSizes[size]} items-center justify-center rounded-xl bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 border border-indigo-500/30 shadow-md shadow-indigo-500/20 group-hover:scale-105 group-hover:border-indigo-400/50 transition-all duration-300 shrink-0 overflow-hidden`}
      >
        {/* Glow backdrop inside logo */}
        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/30 via-transparent to-purple-500/30 opacity-70 group-hover:opacity-100 transition-opacity" />

        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-4/5 h-4/5 relative z-10"
        >
          {/* Outer Alignment Bracket (Left Node) */}
          <path
            d="M 12 10 C 7 15, 7 25, 12 30"
            stroke="url(#skillGrad)"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          {/* Outer Alignment Bracket (Right Node) */}
          <path
            d="M 28 10 C 33 15, 33 25, 28 30"
            stroke="url(#alignGrad)"
            strokeWidth="3.2"
            strokeLinecap="round"
          />

          {/* Central Precision Nexus & Aligning Bars */}
          <line
            x1="13"
            y1="20"
            x2="27"
            y2="20"
            stroke="url(#nexusGrad)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="20" cy="20" r="3.5" fill="#6366F1" />
          <circle cx="20" cy="20" r="1.5" fill="#FFFFFF" />

          {/* Caliper Target Markers */}
          <circle cx="12" cy="20" r="1.5" fill="#818CF8" />
          <circle cx="28" cy="20" r="1.5" fill="#C084FC" />
          <circle cx="20" cy="11" r="1.5" fill="#818CF8" />
          <circle cx="20" cy="29" r="1.5" fill="#C084FC" />

          <defs>
            <linearGradient id="skillGrad" x1="7" y1="10" x2="12" y2="30" gradientUnits="userSpaceOnUse">
              <stop stopColor="#6366F1" />
              <stop offset="1" stopColor="#818CF8" />
            </linearGradient>
            <linearGradient id="alignGrad" x1="33" y1="10" x2="28" y2="30" gradientUnits="userSpaceOnUse">
              <stop stopColor="#A855F7" />
              <stop offset="1" stopColor="#EC4899" />
            </linearGradient>
            <linearGradient id="nexusGrad" x1="13" y1="20" x2="27" y2="20" gradientUnits="userSpaceOnUse">
              <stop stopColor="#6366F1" />
              <stop offset="0.5" stopColor="#A855F7" />
              <stop offset="1" stopColor="#EC4899" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Typography: Skill + Align */}
      <div className="flex items-center gap-1.5">
        <span
          className={`font-outfit ${textSizes[size]} font-black tracking-tight text-foreground flex items-center leading-none`}
        >
          <span className="text-slate-900 dark:text-white font-extrabold">Skill</span>
          <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 bg-clip-text text-transparent font-black ml-0.5">
            Align
          </span>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 ml-1 mb-0.5 animate-pulse" />
        </span>

        {showBadge && (
          <span
            className={`font-mono font-bold tracking-wider uppercase rounded-md border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 ${badgeSizes[size]}`}
          >
            {badgeText}
          </span>
        )}
      </div>
    </div>
  );

  if (isLink) {
    return (
      <Link to={to} className="inline-block focus:outline-none">
        {content}
      </Link>
    );
  }

  return content;
};
