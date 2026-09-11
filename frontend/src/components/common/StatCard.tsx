import React from "react";
import { Card } from "../ui/card";
import { cn } from "../../lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  subtitle?: string;
  trend?: string;
  className?: string;
  color?: "indigo" | "emerald" | "amber" | "purple" | "blue";
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  description,
  subtitle,
  trend,
  className,
  color = "indigo",
}) => {
  const getColorStyles = () => {
    switch (color) {
      case "emerald":
        return {
          iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
          glow: "hover:border-emerald-500/40 dark:hover:border-emerald-500/50",
        };
      case "amber":
        return {
          iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
          glow: "hover:border-amber-500/40 dark:hover:border-amber-500/50",
        };
      case "purple":
        return {
          iconBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
          glow: "hover:border-purple-500/40 dark:hover:border-purple-500/50",
        };
      case "blue":
        return {
          iconBg: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
          glow: "hover:border-sky-500/40 dark:hover:border-sky-500/50",
        };
      default:
        return {
          iconBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
          glow: "hover:border-indigo-500/40 dark:hover:border-indigo-500/50",
        };
    }
  };

  const styles = getColorStyles();

  return (
    <Card
      className={cn(
        "group relative overflow-hidden p-3.5 sm:p-4 bg-white/90 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/80 shadow-xs transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5 min-w-0 flex flex-col justify-between",
        styles.glow,
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span
          title={title}
          className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate leading-tight"
        >
          {title}
        </span>
        <div
          className={cn(
            "flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg border shadow-xs transition-transform duration-200 group-hover:scale-105",
            styles.iconBg
          )}
        >
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </div>
      </div>

      <div className="mt-2 space-y-0.5">
        <h3 className="text-2xl sm:text-3xl font-extrabold font-outfit text-foreground tracking-tight leading-none">
          {value}
        </h3>
        {(description || subtitle) && (
          <p
            className="text-[11px] text-muted-foreground truncate leading-tight pt-0.5"
            title={description || subtitle}
          >
            {description || subtitle}
          </p>
        )}
      </div>

      {trend && (
        <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
          <span>{trend}</span>
        </div>
      )}
    </Card>
  );
};

