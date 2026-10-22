import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Code2, Layers } from "lucide-react";

export interface CandidateAnalyticsChartsProps {
  skillsCount: number;
  activeApplicationsCount: number;
  skillDomainDistribution: Array<{
    domain: string;
    fullName: string;
    count: number;
  }>;
  pipelineStageDistribution: Array<{
    stage: string;
    count: number;
  }>;
}

export const CandidateAnalyticsCharts: React.FC<CandidateAnalyticsChartsProps> = ({
  skillsCount,
  activeApplicationsCount,
  skillDomainDistribution,
  pipelineStageDistribution,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Skill Domain Distribution */}
      <Card className="p-4 border-border/80 bg-card/70 backdrop-blur-xl shadow-sm space-y-3 min-w-0 overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Code2 className="h-4 w-4 text-indigo-400" />
              Verified Skill Domains
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Distribution of credentials across industry competencies
            </p>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono">
            {skillsCount} Total
          </Badge>
        </div>

        <div className="h-52 sm:h-56 w-full min-w-0 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={skillDomainDistribution}
              margin={{ top: 10, right: 15, left: -15, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis
                dataKey="domain"
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
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="p-2.5 rounded-lg bg-popover/95 border border-border shadow-lg text-xs">
                      <span className="font-semibold text-foreground">{data.fullName}</span>
                      <div className="text-indigo-400 font-bold mt-0.5">
                        {data.count} skill{data.count !== 1 ? "s" : ""}
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Active Pipeline Progression */}
      <Card className="p-4 border-border/80 bg-card/70 backdrop-blur-xl shadow-sm space-y-3 min-w-0 overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-emerald-400" />
              Active Pipeline Progression
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Recruitment stages for matched job requisitions
            </p>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono">
            {activeApplicationsCount} Positions
          </Badge>
        </div>

        <div className="h-52 sm:h-56 w-full min-w-0 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={pipelineStageDistribution}
              margin={{ top: 10, right: 15, left: -15, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis
                dataKey="stage"
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
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="p-2.5 rounded-lg bg-popover/95 border border-border shadow-lg text-xs">
                      <span className="font-semibold text-foreground">{data.stage} Stage</span>
                      <div className="text-emerald-400 font-bold mt-0.5">
                        {data.count} application{data.count !== 1 ? "s" : ""}
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

export default CandidateAnalyticsCharts;
