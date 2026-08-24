import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatExperience(years: number): string {
  if (years === 0) return "0 yrs (Fresher)";
  if (years === 1) return "1 yr";
  return `${years} yrs`;
}

export function getProficiencyBadgeClass(level: string): string {
  switch (level?.toLowerCase()) {
    case "expert":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "intermediate":
      return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    case "beginner":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    default:
      return "bg-slate-500/15 text-slate-300 border-slate-500/30";
  }
}

export function getScoreColor(score: number): { text: string; bg: string; border: string; ring: string } {
  if (score >= 80) {
    return {
      text: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      ring: "stroke-emerald-500",
    };
  }
  if (score >= 60) {
    return {
      text: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
      ring: "stroke-blue-500",
    };
  }
  if (score >= 40) {
    return {
      text: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      ring: "stroke-amber-500",
    };
  }
  return {
    text: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    ring: "stroke-rose-500",
  };
}
