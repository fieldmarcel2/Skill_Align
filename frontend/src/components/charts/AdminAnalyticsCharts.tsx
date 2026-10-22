import React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { PieChart as PieChartIcon, TrendingUp, BarChart3 } from "lucide-react";

interface AdminAnalyticsChartsProps {
  totalUsers: number;
  roleDistributionData: Array<{ name: string; value: number; color: string }>;
  velocityData: Array<{ day: string; matches: number; screenings: number; interviews: number; offers: number }>;
  pipelineStageData: Array<{ stage: string; count: number; fill: string }>;
}

export const AdminAnalyticsCharts: React.FC<AdminAnalyticsChartsProps> = ({
  totalUsers,
  roleDistributionData,
  velocityData,
  pipelineStageData,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Account Role Distribution Donut */}
      <Card className="lg:col-span-4 border-border/80 bg-card shadow-xs min-w-0 overflow-hidden rounded-2xl">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold font-outfit flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-primary" />
              Account Role Distribution
            </CardTitle>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-secondary text-secondary-foreground border border-border">
              {totalUsers} Total
            </span>
          </div>
          <CardDescription className="text-xs">
            Active account segmentation across organizational roles
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="h-[250px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={roleDistributionData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  innerRadius={46}
                  outerRadius={75}
                  paddingAngle={4}
                >
                  {roleDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderRadius: "12px",
                    border: "1px solid hsl(var(--border))",
                    color: "hsl(var(--foreground))",
                    fontSize: "12px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 7-Day Velocity Area Chart */}
      <Card className="lg:col-span-5 border-border/80 bg-card shadow-xs min-w-0 overflow-hidden rounded-2xl">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold font-outfit flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              7-Day Recruitment Velocity
            </CardTitle>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Live Telemetry
            </span>
          </div>
          <CardDescription className="text-xs">
            Daily volume of candidate match runs, screenings, and interviews
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="h-[250px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={velocityData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="matchesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="interviewsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderRadius: "12px",
                    border: "1px solid hsl(var(--border))",
                    color: "hsl(var(--foreground))",
                    fontSize: "12px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="matches"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#matchesGrad)"
                  name="Candidate Matches"
                />
                <Area
                  type="monotone"
                  dataKey="interviews"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#interviewsGrad)"
                  name="Interviews Held"
                />
                <Legend
                  verticalAlign="bottom"
                  height={32}
                  iconType="circle"
                  wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Pipeline Stage Volume Bar Chart */}
      <Card className="lg:col-span-3 border-border/80 bg-card shadow-xs min-w-0 overflow-hidden rounded-2xl">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold font-outfit flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-500" />
              Stage Funnel
            </CardTitle>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
              Aggregate
            </span>
          </div>
          <CardDescription className="text-xs">
            Active candidates in each milestone
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="h-[250px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineStageData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.15} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                <YAxis
                  dataKey="stage"
                  type="category"
                  tick={{ fontSize: 10, fill: "hsl(var(--foreground))" }}
                  tickLine={false}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  width={65}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderRadius: "12px",
                    border: "1px solid hsl(var(--border))",
                    color: "hsl(var(--foreground))",
                    fontSize: "12px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {pipelineStageData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAnalyticsCharts;
