import React from "react";
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
    color: "text-gray-400",
    bg: "bg-gray-500/10 border-gray-500/30",
    badge: currentState,
  };

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
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${currentConfig.bg} ${currentConfig.color}`}
        >
          {isHired && <Award className="w-3.5 h-3.5 text-emerald-400" />}
          {isRejected && <XCircle className="w-3.5 h-3.5 text-rose-400" />}
          {!isHired && !isRejected && <Clock className="w-3.5 h-3.5 animate-pulse" />}
          {currentConfig.badge}
        </span>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-900/80 border border-slate-800 rounded-xl p-4 sm:p-5 backdrop-blur-md shadow-lg shadow-black/20">
      {/* Top Banner Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Recruitment Lifecycle Stage
          </span>
          <h4 className="text-base font-bold text-white flex items-center gap-2 mt-0.5">
            <span>{currentConfig.label}</span>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${currentConfig.bg} ${currentConfig.color}`}
            >
              {currentConfig.badge}
            </span>
          </h4>
        </div>

        {/* Status Callout */}
        {isHired && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
            <Award className="w-4 h-4 text-emerald-400" />
            Candidate Successfully Hired
          </div>
        )}
        {currentState === "BLACKLISTED" && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-600/10 border border-red-600/30 text-red-400 text-xs font-medium">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            Blacklisted (6-Month Exclusion Active)
          </div>
        )}
        {isRejected && currentState !== "BLACKLISTED" && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
            <XCircle className="w-4 h-4 text-rose-400" />
            Application Terminated ({currentConfig.label})
          </div>
        )}
      </div>

      {/* Visual Step Progress Bar */}
      <div className="relative">
        {/* Track Line */}
        <div className="absolute top-4 left-4 right-4 h-0.5 bg-slate-800 -z-0">
          <div
            className={`h-full transition-all duration-500 ${
              isRejected
                ? "bg-gradient-to-r from-blue-500 via-purple-500 to-rose-500"
                : isHired
                ? "bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500"
                : "bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500"
            }`}
            style={{
              width: `${(activeStepIndex / (WORKFLOW_STEPS.length - 1)) * 100}%`,
            }}
          />
        </div>

        {/* Step Nodes */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 relative z-10">
          {WORKFLOW_STEPS.map((step, idx) => {
            const isCompleted = idx < activeStepIndex;
            const isCurrent = idx === activeStepIndex;
            const isFuture = idx > activeStepIndex;

            let circleClass = "bg-slate-800 text-slate-500 border-slate-700";
            let labelClass = "text-slate-500";

            if (isCompleted) {
              circleClass = "bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/20";
              labelClass = "text-slate-300 font-medium";
            } else if (isCurrent) {
              if (isRejected) {
                circleClass = "bg-rose-600 text-white border-rose-400 ring-4 ring-rose-500/20 animate-pulse";
                labelClass = "text-rose-400 font-bold";
              } else if (isHired) {
                circleClass = "bg-emerald-600 text-white border-emerald-400 ring-4 ring-emerald-500/20";
                labelClass = "text-emerald-400 font-bold";
              } else {
                circleClass = "bg-cyan-500 text-slate-950 border-cyan-300 ring-4 ring-cyan-500/20 animate-pulse";
                labelClass = "text-cyan-400 font-bold";
              }
            }

            return (
              <div key={step.number} className="flex flex-col items-center text-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border text-xs transition-all duration-300 ${circleClass}`}
                >
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : step.icon}
                </div>
                <span className={`text-[11px] mt-1.5 line-clamp-1 ${labelClass}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
export default PipelineStateBar;
