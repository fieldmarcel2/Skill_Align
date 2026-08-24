import React from "react";
import { Card } from "../ui/card";
import { cn } from "../../lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  trend?: string;
  className?: string;
  color?: "indigo" | "emerald" | "amber" | "purple" | "blue";
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  description,
  trend,
  className,
  color = "indigo",
}) => {
  const getColorStyles = () => {
    switch (color) {
      case "emerald":
        return {
          iconBg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
          glow: "group-hover:border-emerald-500/40",
        };
      case "amber":
        return {
          iconBg: "bg-amber-500/15 text-amber-400 border-amber-500/25",
          glow: "group-hover:border-amber-500/40",
        };
      case "purple":
        return {
          iconBg: "bg-purple-500/15 text-purple-400 border-purple-500/25",
          glow: "group-hover:border-purple-500/40",
        };
      case "blue":
        return {
          iconBg: "bg-blue-500/15 text-blue-400 border-blue-500/25",
          glow: "group-hover:border-blue-500/40",
        };
      default:
        return {
          iconBg: "bg-indigo-500/15 text-indigo-400 border-indigo-500/25",
          glow: "group-hover:border-indigo-500/40",
        };
    }
  };

  const styles = getColorStyles();

  return (
    <Card
      className={cn(
        "group relative overflow-hidden p-6 border border-border/80 bg-card/70 backdrop-blur-xl transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5",
        styles.glow,
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <h3 className="text-3xl font-bold font-outfit text-foreground tracking-tight">
            {value}
          </h3>
          {description && (
            <p className="text-xs text-muted-foreground pt-1">{description}</p>
          )}
        </div>
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-2xl border shadow-inner transition-transform duration-300 group-hover:scale-110",
            styles.iconBg
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
          <span>{trend}</span>
        </div>
      )}
    </Card>
  );
};
