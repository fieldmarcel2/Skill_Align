import React from "react";
import {
  Send,
  CalendarCheck,
  FileCheck,
  Clock,
  ArrowRight,
  AlertTriangle,
  Briefcase,
  User,
} from "lucide-react";
import { ActionCenterItem } from "../../types";

interface ActionCenterCardProps {
  item: ActionCenterItem;
  onExecuteAction: (item: ActionCenterItem) => void;
  loading?: boolean;
}

export const ActionCenterCard: React.FC<ActionCenterCardProps> = ({
  item,
  onExecuteAction,
  loading = false,
}) => {
  const getActionConfig = (actionType: string) => {
    switch (actionType) {
      case "SEND_SLOTS_TO_CANDIDATE":
        return {
          icon: <Send className="w-4 h-4 text-cyan-400" />,
          btnLabel: "Send Slots to Candidate",
          btnColor: "bg-cyan-600 hover:bg-cyan-500 shadow-cyan-600/20",
          tag: "Interview Scheduling",
          tagColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
        };
      case "CONFIRM_INTERVIEW":
        return {
          icon: <CalendarCheck className="w-4 h-4 text-emerald-400" />,
          btnLabel: "Confirm Selected Slot",
          btnColor: "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20",
          tag: "Candidate Picked Slot",
          tagColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
        };
      case "CREATE_OFFER":
        return {
          icon: <FileCheck className="w-4 h-4 text-amber-400" />,
          btnLabel: "Draft & Send Offer",
          btnColor: "bg-amber-600 hover:bg-amber-500 shadow-amber-600/20",
          tag: "Interview Passed (GO)",
          tagColor: "bg-amber-500/10 text-amber-400 border-amber-500/30",
        };
      case "SEND_OFFER":
        return {
          icon: <Send className="w-4 h-4 text-purple-400" />,
          btnLabel: "Review & Send Offer",
          btnColor: "bg-purple-600 hover:bg-purple-500 shadow-purple-600/20",
          tag: "Offer Drafted",
          tagColor: "bg-purple-500/10 text-purple-400 border-purple-500/30",
        };
      default:
        return {
          icon: <Clock className="w-4 h-4 text-slate-400" />,
          btnLabel: "Take Action",
          btnColor: "bg-blue-600 hover:bg-blue-500 shadow-blue-600/20",
          tag: "Task",
          tagColor: "bg-slate-800 text-slate-300 border-slate-700",
        };
    }
  };

  const config = getActionConfig(item.action_type);

  const getPriorityBadge = (p: string) => {
    switch (p.toUpperCase()) {
      case "URGENT":
        return "bg-red-500/15 text-red-400 border-red-500/30";
      case "HIGH":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case "MEDIUM":
        return "bg-blue-500/15 text-blue-400 border-blue-500/30";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-xl p-4.5 transition-all shadow-md shadow-black/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${config.tagColor}`}>
            {config.tag}
          </span>
          <span className={`text-[11px] px-2 py-0.5 rounded font-mono font-medium border ${getPriorityBadge(item.priority)}`}>
            {item.priority}
          </span>
        </div>

        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          {config.icon}
          <span>{item.title}</span>
        </h4>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
          {item.candidate_name && (
            <div className="flex items-center gap-1.5 text-slate-300">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>{item.candidate_name}</span>
            </div>
          )}
          {item.job_title && (
            <div className="flex items-center gap-1.5 text-slate-300">
              <Briefcase className="w-3.5 h-3.5 text-slate-400" />
              <span>{item.job_title}</span>
            </div>
          )}
        </div>

        {item.description && (
          <p className="text-xs text-slate-400 line-clamp-1">{item.description}</p>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={() => onExecuteAction(item)}
          disabled={loading}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-xs font-semibold shadow-md transition-all ${config.btnColor} disabled:opacity-50`}
        >
          <span>{config.btnLabel}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
export default ActionCenterCard;
