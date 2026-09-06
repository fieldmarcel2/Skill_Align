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

export function getProficiencyBadgeClass(level?: string | null): string {
  switch (level?.toLowerCase()) {
    case "expert":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold";
    case "intermediate":
      return "bg-blue-50 text-blue-700 border-blue-200 font-semibold";
    case "beginner":
      return "bg-amber-50 text-amber-800 border-amber-200 font-semibold";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200 font-medium";
  }
}

export function getScoreColor(score: number): { text: string; bg: string; border: string; ring: string } {
  if (score >= 80) {
    return {
      text: "text-emerald-700 font-bold",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      ring: "stroke-emerald-600",
    };
  }
  if (score >= 60) {
    return {
      text: "text-blue-700 font-bold",
      bg: "bg-blue-50",
      border: "border-blue-200",
      ring: "stroke-blue-600",
    };
  }
  if (score >= 40) {
    return {
      text: "text-amber-800 font-bold",
      bg: "bg-amber-50",
      border: "border-amber-200",
      ring: "stroke-amber-600",
    };
  }
  return {
    text: "text-rose-700 font-bold",
    bg: "bg-rose-50",
    border: "border-rose-200",
    ring: "stroke-rose-600",
  };
}
