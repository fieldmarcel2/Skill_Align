import React from "react";
import {
  Send,
  CalendarCheck,
  FileCheck,
  Clock,
  ArrowRight,
  Briefcase,
  User,
  Check,
  Eye,
  MessageSquare,
  AlertCircle,
} from "lucide-react";
import { ActionCenterItem } from "../../types";

interface ActionCenterCardProps {
  item: ActionCenterItem;
  onExecuteAction: (item: ActionCenterItem) => void;
  onCompleteTask?: (item: ActionCenterItem) => void;
  loading?: boolean;
}

export const ActionCenterCard: React.FC<ActionCenterCardProps> = ({
  item,
  onExecuteAction,
  onCompleteTask,
  loading = false,
}) => {
  const getActionConfig = (actionType: string) => {
    switch (actionType) {
      case "SCREEN_CANDIDATE":
        return {
          icon: <Eye className="w-4 h-4 text-primary" />,
          btnLabel: "Review & Screen Candidate",
          tag: "Screening Needed",
        };
      case "SUBMIT_TO_HM":
        return {
          icon: <Briefcase className="w-4 h-4 text-primary" />,
          btnLabel: "Submit to Hiring Manager",
          tag: "Shortlist Review",
        };
      case "SEND_SLOTS_TO_CANDIDATE":
        return {
          icon: <Send className="w-4 h-4 text-primary" />,
          btnLabel: "Send Slots to Candidate",
          tag: "Interview Scheduling",
        };
      case "CONFIRM_INTERVIEW":
        return {
          icon: <CalendarCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
          btnLabel: "Confirm Booking",
          tag: "Slot Confirmed",
        };
      case "COLLECT_FEEDBACK":
        return {
          icon: <MessageSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
          btnLabel: "Review HM Feedback",
          tag: "HM Evaluation",
        };
      case "CREATE_OFFER":
        return {
          icon: <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
          btnLabel: "Draft Offer Letter",
          tag: "Interview Passed (GO)",
        };
      case "SEND_OFFER":
        return {
          icon: <Send className="w-4 h-4 text-primary" />,
          btnLabel: "Dispatch Offer Letter",
          tag: "Offer Document Ready",
        };
      default:
        return {
          icon: <Clock className="w-4 h-4 text-muted-foreground" />,
          btnLabel: "View Candidate Details",
          tag: "Action Required",
        };
    }
  };

  const config = getActionConfig(item.action_type);

  const getPriorityBadge = (p: string) => {
    switch (p.toUpperCase()) {
      case "URGENT":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/80 font-bold";
      case "HIGH":
        return "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/80 font-semibold";
      case "MEDIUM":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/80 font-medium";
      default:
        return "bg-secondary text-secondary-foreground border-border font-medium";
    }
  };

  const initials = (item.candidate_name || "Talent")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start gap-3.5 flex-1 min-w-0">
        {/* Candidate Avatar Initials */}
        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 flex items-center justify-center font-outfit font-bold text-xs text-foreground shadow-xs shrink-0 mt-0.5">
          {initials}
        </div>

        <div className="space-y-1.5 flex-1 min-w-0">
          {/* Tags row */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] px-2.5 py-0.5 rounded-md font-semibold bg-secondary text-foreground border border-border">
              {config.tag}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded border uppercase tracking-wider ${getPriorityBadge(item.priority)}`}>
              {item.priority}
            </span>
            {item.pipeline_state && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/80 font-mono">
                {item.pipeline_state}
              </span>
            )}
          </div>

          {/* Action Title */}
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 tracking-tight">
            {config.icon}
            <span className="truncate">{item.title}</span>
          </h4>

          {/* Candidate & Job Context */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            {item.candidate_name && (
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{item.candidate_name}</span>
              </div>
            )}
            {item.job_title && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Briefcase className="w-3.5 h-3.5 text-muted-foreground/80" />
                <span>{item.job_title}</span>
              </div>
            )}
          </div>

          {item.description && (
            <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
          )}
        </div>
      </div>

      {/* Action Button */}
      <div className="flex items-center gap-2 shrink-0 sm:self-center pl-13 sm:pl-0">
        {onCompleteTask && (
          <button
            type="button"
            title="Mark this task as completed / dismissed"
            onClick={() => onCompleteTask(item)}
            disabled={loading}
            className="inline-flex items-center justify-center p-2 rounded-lg text-xs font-semibold bg-secondary hover:bg-emerald-500/20 text-muted-foreground hover:text-emerald-700 dark:hover:text-emerald-300 border border-border transition-all disabled:opacity-50 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => onExecuteAction(item)}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all duration-150 disabled:opacity-50 cursor-pointer active:scale-98"
        >
          <span>{config.btnLabel}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default ActionCenterCard;
