import React from "react";
import { MatchScoreGauge } from "./MatchScoreGauge";

interface ScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export const ScoreBadge: React.FC<ScoreBadgeProps> = ({
  score,
  size = "md",
  showLabel = true,
}) => {
  return (
    <MatchScoreGauge
      score={score}
      size={size}
      showSubtitle={showLabel}
      subtitle="Match"
    />
  );
};

export default ScoreBadge;
