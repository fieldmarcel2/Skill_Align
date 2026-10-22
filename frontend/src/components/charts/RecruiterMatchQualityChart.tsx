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

interface RecruiterMatchQualityChartProps {
  data?: Array<{
    tier: string;
    shortTier: string;
    count: number;
    color: string;
  }>;
}

const defaultData = [
  { tier: "90%+ Match (Exceptional)", shortTier: "≥90%", count: 4, color: "#10b981" },
  { tier: "80-89% Match (Strong Fit)", shortTier: "80-89%", count: 5, color: "#06b6d4" },
  { tier: "70-79% Match (Qualified)", shortTier: "70-79%", count: 2, color: "#6366f1" },
  { tier: "<70% Match (Baseline)", shortTier: "<70%", count: 1, color: "#94a3b8" },
];

export const RecruiterMatchQualityChart: React.FC<RecruiterMatchQualityChartProps> = ({
  data = defaultData,
}) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
        <XAxis
          dataKey="shortTier"
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
              <div className="p-2.5 rounded-lg bg-popover/95 border border-border shadow-lg text-xs">
                <span className="font-semibold text-foreground">{item.tier}</span>
                <div className="text-emerald-500 font-bold mt-0.5">
                  {item.count} candidate{item.count !== 1 ? "s" : ""}
                </div>
              </div>
            );
          }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`tier-cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default RecruiterMatchQualityChart;
