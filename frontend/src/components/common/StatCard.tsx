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
          iconBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          glow: "group-hover:border-emerald-300",
        };
      case "amber":
        return {
          iconBg: "bg-amber-50 text-amber-800 border-amber-200",
          glow: "group-hover:border-amber-300",
        };
      case "purple":
        return {
          iconBg: "bg-purple-50 text-purple-700 border-purple-200",
          glow: "group-hover:border-purple-300",
        };
      case "blue":
        return {
          iconBg: "bg-blue-50 text-blue-700 border-blue-200",
          glow: "group-hover:border-blue-300",
        };
      default:
        return {
          iconBg: "bg-indigo-50 text-indigo-700 border-indigo-200",
          glow: "group-hover:border-indigo-300",
        };
    }
  };

  const styles = getColorStyles();

  return (
    <Card
      className={cn(
        "group relative overflow-hidden p-6 border border-slate-200/90 bg-white shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5",
        styles.glow,
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </p>
          <h3 className="text-3xl font-bold font-outfit text-slate-900 tracking-tight">
            {value}
          </h3>
          {(description || subtitle) && (
            <p className="text-xs text-slate-500 pt-1">{description || subtitle}</p>
          )}
        </div>
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-2xl border shadow-xs transition-transform duration-300 group-hover:scale-105",
            styles.iconBg
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
          <span>{trend}</span>
        </div>
      )}
    </Card>
  );
};
