import React from "react";
import {
  Clock,
  User,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  Calendar,
  FileCheck,
  Mail,
  Award,
  AlertCircle,
} from "lucide-react";
import { AuditLogEntry, PIPELINE_STATE_CONFIG, PipelineState } from "../../types";

interface CandidateTimelineProps {
  timeline: AuditLogEntry[];
  loading?: boolean;
}

export const CandidateTimeline: React.FC<CandidateTimelineProps> = ({
  timeline,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-3">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-400">Loading audit history...</span>
      </div>
    );
  }

  if (!timeline || timeline.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-900/50 rounded-xl border border-slate-800 text-slate-400">
        <Clock className="w-8 h-8 mx-auto mb-2 text-slate-600" />
        <p className="text-sm font-medium">No audit events recorded yet.</p>
        <p className="text-xs text-slate-500 mt-1">
          State changes and workflow activities will appear here in chronological order.
        </p>
      </div>
    );
  }

  const getActionIcon = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes("hired") || act.includes("accept")) {
      return <Award className="w-4 h-4 text-emerald-400" />;
    }
    if (act.includes("reject") || act.includes("no_go") || act.includes("blacklist")) {
      return <ShieldAlert className="w-4 h-4 text-rose-400" />;
    }
    if (act.includes("interview") || act.includes("slot")) {
      return <Calendar className="w-4 h-4 text-purple-400" />;
    }
    if (act.includes("offer")) {
      return <FileCheck className="w-4 h-4 text-amber-400" />;
    }
    if (act.includes("email") || act.includes("sent")) {
      return <Mail className="w-4 h-4 text-cyan-400" />;
    }
    if (act.includes("shortlist") || act.includes("review")) {
      return <CheckCircle2 className="w-4 h-4 text-indigo-400" />;
    }
    return <Clock className="w-4 h-4 text-slate-400" />;
  };

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return {
        date: d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
        time: d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
      };
    } catch {
      return { date: dateStr, time: "" };
    }
  };

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
      {timeline.map((entry, index) => {
        const { date, time } = formatDateTime(entry.created_at);
        const fromConfig = entry.from_state
          ? PIPELINE_STATE_CONFIG[entry.from_state as PipelineState]
          : null;
        const toConfig = entry.to_state
          ? PIPELINE_STATE_CONFIG[entry.to_state as PipelineState]
          : null;

        return (
          <div key={entry.id || index} className="relative group">
            {/* Timeline node icon */}
            <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center shadow-md group-hover:border-cyan-500 transition-colors">
              {getActionIcon(entry.action)}
            </div>

            {/* Content card */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3.5 hover:border-slate-700 transition-all">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">
                    {entry.action.replace(/_/g, " ")}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {entry.entity_type}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
                  <span>{date}</span>
                  <span>{time}</span>
                </div>
              </div>

              {/* State Transition Badges */}
              {(entry.from_state || entry.to_state) && (
                <div className="flex flex-wrap items-center gap-1.5 my-2">
                  {fromConfig && (
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded border ${fromConfig.bg} ${fromConfig.color}`}
                    >
                      {fromConfig.badge}
                    </span>
                  )}
                  {entry.from_state && entry.to_state && (
                    <ArrowRight className="w-3 h-3 text-slate-500" />
                  )}
                  {toConfig && (
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded border ${toConfig.bg} ${toConfig.color} font-medium`}
                    >
                      {toConfig.badge}
                    </span>
                  )}
                </div>
              )}

              {/* Details / Notes */}
              {entry.details && (
                <p className="text-xs text-slate-300 mt-1 bg-slate-950/40 p-2 rounded border border-slate-800/60 break-words">
                  {entry.details}
                </p>
              )}

              {/* Actor Info */}
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-2">
                <User className="w-3 h-3 text-slate-400" />
                <span>Triggered by: </span>
                <span className="text-slate-300 font-medium">
                  {entry.actor_name || "System"}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
export default CandidateTimeline;
