import React from "react";
import { Loader2 } from "lucide-react";

interface ChartSkeletonProps {
  height?: string;
  label?: string;
}

export const ChartSkeleton: React.FC<ChartSkeletonProps> = ({
  height = "h-[190px]",
  label = "Loading visualization...",
}) => {
  return (
    <div
      className={`w-full ${height} rounded-xl border border-dashed border-border/70 bg-secondary/15 flex flex-col items-center justify-center gap-2 text-muted-foreground animate-pulse`}
    >
      <Loader2 className="w-5 h-5 animate-spin text-primary/70" />
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
};

export default ChartSkeleton;
