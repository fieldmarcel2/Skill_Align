import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Cell,
} from "recharts";

interface HRPipelineFunnelChartProps {
  screenedCount: number;
  awaitingHMReviewCount: number;
  scheduledCount: number;
  feedbackRequiredCount: number;
  offersCount: number;
  totalHiredCount: number;
}

export const HRPipelineFunnelChart: React.FC<HRPipelineFunnelChartProps> = ({
  screenedCount,
  awaitingHMReviewCount,
  scheduledCount,
  feedbackRequiredCount,
  offersCount,
  totalHiredCount,
}) => {
  const data = [
    {
      stage: "Sourced & Screened",
      shortStage: "Sourced",
      count: screenedCount,
      color: "#6366f1",
      detail: "Screened candidates evaluated in talent pool",
    },
    {
      stage: "HM Review & Slots",
      shortStage: "HM Review",
      count: awaitingHMReviewCount,
      color: "#f59e0b",
      detail: "Awaiting hiring manager review or slots proposal",
    },
    {
      stage: "Interviews Active",
      shortStage: "Interviews",
      count: scheduledCount,
      color: "#06b6d4",
      detail: "Scheduled or active interview rounds",
    },
    {
      stage: "Evaluations & Feedback",
      shortStage: "Feedback",
      count: feedbackRequiredCount,
      color: "#8b5cf6",
      detail: "Completed rounds awaiting GO/NO-GO verdict",
    },
    {
      stage: "Offers Formulated",
      shortStage: "Offers",
      count: offersCount,
      color: "#ec4899",
      detail: "Compensation structured, pending, or sent",
    },
    {
      stage: "Confirmed Hires",
      shortStage: "Hires",
      count: totalHiredCount,
      color: "#10b981",
      detail: "Offers accepted & confirmed candidate hires",
    },
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 12, right: 15, left: -15, bottom: 0 }}>
        <XAxis
          dataKey="shortStage"
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={{ stroke: "hsl(var(--border))" }}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={{ stroke: "hsl(var(--border))" }}
        />
        <RechartsTooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const item = payload[0].payload;
            return (
              <div className="p-3 rounded-xl bg-popover/95 border border-border shadow-xl text-xs space-y-1">
                <div className="font-bold text-foreground font-outfit">{item.stage}</div>
                <div className="text-primary font-bold text-sm">
                  {item.count} candidate{item.count !== 1 ? "s" : ""}
                </div>
                <div className="text-[10px] text-muted-foreground">{item.detail}</div>
              </div>
            );
          }}
        />
        <Bar dataKey="count" radius={[5, 5, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`funnel-cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default HRPipelineFunnelChart;
