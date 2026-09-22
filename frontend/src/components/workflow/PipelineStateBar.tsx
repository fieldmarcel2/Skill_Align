import React from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Award,
  Calendar,
  DollarSign,
  FileCheck,
  UserCheck,
  ShieldAlert,
} from "lucide-react";
import { PipelineState, PIPELINE_STATE_CONFIG } from "../../types";
import { getStageColor } from "../../lib/stageColors";

interface PipelineStateBarProps {
  currentState: PipelineState;
  compact?: boolean;
}

interface StepDef {
  number: number;
  label: string;
  states: PipelineState[];
  icon: React.ReactNode;
}

const WORKFLOW_STEPS: StepDef[] = [
  {
    number: 1,
    label: "Matched",
    states: ["CANDIDATE_MATCHED"],
    icon: <UserCheck className="w-3.5 h-3.5" />,
  },
  {
    number: 2,
    label: "Shortlisted",
    states: ["CANDIDATE_SHORTLISTED"],
    icon: <FileCheck className="w-3.5 h-3.5" />,
  },
  {
    number: 3,
    label: "HM Review",
    states: ["SENT_TO_HIRING_MANAGER", "HIRING_MANAGER_REVIEW", "HIRING_MANAGER_REJECTED"],
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  {
    number: 4,
    label: "Interview",
    states: [
      "INTERVIEW_REQUESTED",
      "INTERVIEW_SLOTS_PROPOSED",
      "WAITING_FOR_CANDIDATE_SLOT",
      "CANDIDATE_SLOT_SELECTED",
      "INTERVIEW_CONFIRMED",
    ],
    icon: <Calendar className="w-3.5 h-3.5" />,
  },
  {
    number: 5,
    label: "Feedback",
    states: ["INTERVIEW_COMPLETED", "WAITING_FOR_HM_FEEDBACK", "INTERVIEW_GO", "INTERVIEW_NO_GO"],
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  {
    number: 6,
    label: "Compensation",
    states: ["COMPENSATION_DISCUSSION", "OFFER_CREATED"],
    icon: <DollarSign className="w-3.5 h-3.5" />,
  },
  {
    number: 7,
    label: "Offer",
    states: ["OFFER_SENT"],
    icon: <FileCheck className="w-3.5 h-3.5" />,
  },
  {
    number: 8,
    label: "Outcome",
    states: ["OFFER_ACCEPTED", "OFFER_REJECTED", "BLACKLISTED", "HIRED", "REJECTED"],
    icon: <Award className="w-3.5 h-3.5" />,
  },
];

export const PipelineStateBar: React.FC<PipelineStateBarProps> = ({
  currentState,
  compact = false,
}) => {
  const currentConfig = PIPELINE_STATE_CONFIG[currentState] || {
    label: currentState,
    stepNumber: 1,
    color: "text-muted-foreground",
    bg: "bg-muted border-border",
    badge: currentState,
  };

  const stageColor = getStageColor(currentState);

  const isRejected = [
    "HIRING_MANAGER_REJECTED",
    "INTERVIEW_NO_GO",
    "OFFER_REJECTED",
    "BLACKLISTED",
    "REJECTED",
  ].includes(currentState);

  const isHired = currentState === "HIRED" || currentState === "OFFER_ACCEPTED";

  // Determine which main step is active
  let activeStepIndex = 0;
  for (let i = 0; i < WORKFLOW_STEPS.length; i++) {
    if (WORKFLOW_STEPS[i].states.includes(currentState)) {
      activeStepIndex = i;
      break;
    }
  }

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${stageColor.badge}`}>
        {isHired && <Award className="w-3.5 h-3.5" />}
        {isRejected && <XCircle className="w-3.5 h-3.5" />}
        {!isHired && !isRejected && <Clock className="w-3 h-3 opacity-70" />}
        {stageColor.label}
      </span>
    );
  }

  const progressPercent = activeStepIndex / (WORKFLOW_STEPS.length - 1);

  return (
    <div className={`w-full relative overflow-hidden rounded-2xl p-4 sm:p-6 shadow-md border transition-all ${stageColor.border} bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-purple-50/40 dark:from-slate-900/90 dark:via-indigo-950/40 dark:to-slate-900/80 backdrop-blur-md`}>
      {/* Subtle ambient stage glow */}
      <div className={`absolute -top-12 -right-12 w-72 h-72 ${stageColor.bg} rounded-full blur-3xl -z-0 opacity-40 pointer-events-none transition-colors duration-500`} />

      {/* Top Banner Status */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${stageColor.dot} animate-pulse`} />
            Recruitment Lifecycle Stage
          </span>
          <h4 className="text-sm font-bold text-foreground flex items-center gap-2 mt-0.5">
            <span>{stageColor.label}</span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${stageColor.badge}`}>
              {currentState.replace(/_/g, " ")}
            </span>
          </h4>
        </div>

        {/* Status Callout */}
        {isHired && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
            <Award className="w-4 h-4" />
            Candidate Successfully Placed
          </div>
        )}
        {currentState === "BLACKLISTED" && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-700 dark:text-red-400 text-xs font-semibold">
            <ShieldAlert className="w-4 h-4" />
            Profile Exclusion Active (6-Month Policy)
          </div>
        )}
        {isRejected && currentState !== "BLACKLISTED" && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-400 text-xs font-semibold">
            <XCircle className="w-4 h-4" />
            Application Closed — {stageColor.label}
          </div>
        )}
      </div>

      {/* Visual Step Progress Bar */}
      <div className="relative">
        {/* Track Line */}
        <div className="absolute top-4 left-4 right-4 h-0.5 bg-border -z-0 rounded-full">
          <motion.div
            className={`h-full rounded-full ${
              isRejected
                ? "bg-gradient-to-r from-primary via-violet-500 to-rose-500"
                : isHired
                ? "bg-gradient-to-r from-primary via-indigo-500 to-emerald-500"
                : "bg-gradient-to-r from-primary via-indigo-500 to-cyan-500"
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          />
        </div>

        {/* Step Nodes */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 relative z-10">
          {WORKFLOW_STEPS.map((step, idx) => {
            const isCompleted = idx < activeStepIndex;
            const isCurrent = idx === activeStepIndex;
            const isFuture = idx > activeStepIndex;

            let circleClass = "bg-muted text-muted-foreground border-border";
            let labelClass = "text-muted-foreground";

            if (isCompleted) {
              circleClass = "bg-primary text-primary-foreground border-primary/40 shadow-sm shadow-primary/20";
              labelClass = "text-foreground font-medium";
            } else if (isCurrent) {
              if (isRejected) {
                circleClass = "bg-rose-500 text-white border-rose-400 ring-4 ring-rose-500/20";
                labelClass = "text-rose-600 dark:text-rose-400 font-bold";
              } else if (isHired) {
                circleClass = "bg-emerald-500 text-white border-emerald-400 ring-4 ring-emerald-500/20";
                labelClass = "text-emerald-600 dark:text-emerald-400 font-bold";
              } else {
                circleClass = "bg-primary text-primary-foreground border-primary/40 ring-4 ring-primary/20";
                labelClass = "text-primary font-bold";
              }
            }

            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.06, duration: 0.3 }}
                className="flex flex-col items-center text-center"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border text-xs transition-all duration-300 ${circleClass}`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    step.icon
                  )}
                </div>
                <span className={`text-[10px] mt-1.5 line-clamp-1 leading-tight ${labelClass}`}>
                  {step.label}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PipelineStateBar;
