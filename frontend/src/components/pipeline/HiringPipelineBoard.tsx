import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  MatchResult,
  PipelineStatus,
  PIPELINE_STAGE_LABELS,
  PIPELINE_COLUMNS,
  PIPELINE_STATE_CONFIG,
} from "../../types";
import { matchingApi, resumeApi } from "../../services/api";
import { useToast } from "../ui/toast";
import { ScorecardModal } from "./ScorecardModal";
import { RequestInterviewModal } from "../workflow/RequestInterviewModal";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import {
  GripVertical,
  MessageSquarePlus,
  CheckCircle2,
  AlertCircle,
  Trophy,
  Users,
  ClipboardList,
  Gift,
  Sparkles,
  Calendar,
  CalendarCheck,
  Send,
  Loader2,
  FileText,
  Clock,
  X,
  UserCheck,
  XCircle,
  Search,
  SlidersHorizontal,
  Video,
  MapPin,
  ArrowRight,
  Maximize2,
  Minimize2,
  ExternalLink,
  Award,
  Check,
} from "lucide-react";

// ── Column config ──────────────────────────────────────────────────────────────
const COLUMN_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; icon: React.ElementType }
> = {
  matched: {
    label: "Matched",
    color: "text-indigo-400",
    bg: "bg-indigo-500/5",
    border: "border-indigo-500/20",
    icon: Sparkles,
  },
  screened: {
    label: "Screened / In Review",
    color: "text-blue-400",
    bg: "bg-blue-500/5",
    border: "border-blue-500/20",
    icon: Users,
  },
  approved_by_hr: {
    label: "Slots Proposed / Approved",
    color: "text-emerald-400",
    bg: "bg-emerald-500/5",
    border: "border-emerald-500/20",
    icon: CheckCircle2,
  },
  interview_scheduled: {
    label: "Interview / Feedback",
    color: "text-purple-400",
    bg: "bg-purple-500/5",
    border: "border-purple-500/20",
    icon: ClipboardList,
  },
  offer: {
    label: "Offer Stage",
    color: "text-amber-400",
    bg: "bg-amber-500/5",
    border: "border-amber-500/20",
    icon: Gift,
  },
  hired: {
    label: "Hired 🎉",
    color: "text-green-400",
    bg: "bg-green-500/5",
    border: "border-green-500/20",
    icon: Trophy,
  },
};

// ── Dynamic Mapping from Enterprise PipelineState to Column ─────────────────
export const mapPipelineStateToColumn = (match: MatchResult): string => {
  const pState = match.pipeline_state;
  if (!pState) {
    return match.status || "matched";
  }
  switch (pState) {
    case "CANDIDATE_MATCHED":
      return "matched";
    case "CANDIDATE_SHORTLISTED":
    case "SENT_TO_HIRING_MANAGER":
    case "HIRING_MANAGER_REVIEW":
      return "screened";
    case "INTERVIEW_REQUESTED":
    case "INTERVIEW_SLOTS_PROPOSED":
    case "WAITING_FOR_CANDIDATE_SLOT":
    case "CANDIDATE_SLOT_SELECTED":
      return "approved_by_hr";
    case "INTERVIEW_CONFIRMED":
    case "INTERVIEW_COMPLETED":
    case "WAITING_FOR_HM_FEEDBACK":
    case "INTERVIEW_GO":
      return "interview_scheduled";
    case "COMPENSATION_DISCUSSION":
    case "OFFER_CREATED":
    case "OFFER_SENT":
    case "OFFER_ACCEPTED":
      return "offer";
    case "HIRED":
      return "hired";
    case "HIRING_MANAGER_REJECTED":
    case "INTERVIEW_NO_GO":
    case "OFFER_REJECTED":
    case "BLACKLISTED":
    case "REJECTED":
      return "rejected";
    default:
      return match.status || "matched";
  }
};

// ── Candidate Card Component ──────────────────────────────────────────────────
interface CandidateCardProps {
  match: MatchResult;
  isDragging?: boolean;
  isCompact?: boolean;
  onScorecardClick: (match: MatchResult) => void;
  onRequestInterviewClick: (match: MatchResult) => void;
  onQuickStatusChange: (match: MatchResult, newStatus: PipelineStatus) => void;
  isUpdating?: boolean;
}

const CandidateCard: React.FC<CandidateCardProps> = ({
  match,
  isDragging,
  isCompact = false,
  onScorecardClick,
  onRequestInterviewClick,
  onQuickStatusChange,
  isUpdating = false,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: match.id.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.25 : 1,
  };

  const handleResumeClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const data = await resumeApi.getUrl(match.candidate.id);
      if (data.resume_url) {
        window.open(data.resume_url, "_blank");
      }
    } catch {
      // Ignore
    }
  };

  const scoreNum = Math.round(Number(match.overall_score) || 0);

  // Score Badge Color styling
  const scoreBadgeStyle =
    scoreNum >= 80
      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
      : scoreNum >= 60
      ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
      : "bg-blue-500/10 text-blue-400 border-blue-500/30";

  // Initials for avatar
  const initials = match.candidate.full_name
    ? match.candidate.full_name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "CA";

  const pState = match.pipeline_state || "CANDIDATE_MATCHED";
  const pStateCfg = PIPELINE_STATE_CONFIG[pState as keyof typeof PIPELINE_STATE_CONFIG] || {
    label: match.status.replace(/_/g, " "),
    badge: match.status.replace(/_/g, " "),
    color: "text-muted-foreground",
    bg: "bg-secondary/40 border-border/50",
  };

  const isMatched = pState === "CANDIDATE_MATCHED" || match.status === "matched";
  const isScreened =
    pState === "CANDIDATE_SHORTLISTED" ||
    pState === "SENT_TO_HIRING_MANAGER" ||
    pState === "HIRING_MANAGER_REVIEW" ||
    match.status === "screened";
  const isSlotProposedOrWaiting =
    pState === "INTERVIEW_REQUESTED" ||
    pState === "INTERVIEW_SLOTS_PROPOSED" ||
    pState === "WAITING_FOR_CANDIDATE_SLOT" ||
    pState === "CANDIDATE_SLOT_SELECTED" ||
    match.status === "approved_by_hr";
  const isInterviewConfirmed = pState === "INTERVIEW_CONFIRMED";
  const isNeedsHMFeedback = pState === "WAITING_FOR_HM_FEEDBACK" || pState === "INTERVIEW_COMPLETED";
  const isOfferStage =
    pState === "COMPENSATION_DISCUSSION" ||
    pState === "OFFER_CREATED" ||
    pState === "OFFER_SENT" ||
    pState === "OFFER_ACCEPTED" ||
    match.status === "offer";

  // Resume-extracted vs Self-declared skills
  const resumeSkills = (match.resume_detected_skills && match.resume_detected_skills.length > 0)
    ? match.resume_detected_skills
    : (match.candidate.skills || []).filter((s) => s.source === "resume" || s.evidence_text);

  const declaredSkills = (match.self_declared_skills && match.self_declared_skills.length > 0)
    ? match.self_declared_skills
    : (match.candidate.skills || []).filter((s) => s.source !== "resume" && !s.evidence_text);

  // ── Compact Card View ────────────────────────────────────────────────────────
  if (isCompact) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`group relative flex items-center justify-between p-2 rounded-xl border bg-card/95 hover:bg-card border-border/80 hover:border-primary/50 transition-all ${
          isDragging ? "border-primary shadow-lg ring-2 ring-primary/20 scale-102" : "hover:shadow-xs"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 pr-2">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground p-0.5 shrink-0"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </div>

          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary font-outfit shrink-0">
            {initials}
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground truncate font-outfit">
              {match.candidate.full_name}
            </p>
            <span className="text-[9px] text-muted-foreground truncate block">
              {pStateCfg.badge}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full border ${scoreBadgeStyle}`}>
            {scoreNum}%
          </span>

          {/* Quick Action Button */}
          {isMatched && (
            <button
              onClick={() => onQuickStatusChange(match, "screened")}
              disabled={isUpdating}
              title="Advance to Screened"
              className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
          {isScreened && (
            <button
              onClick={() => onRequestInterviewClick(match)}
              disabled={isUpdating}
              title="Propose Slots (Request Interview)"
              className="p-1 rounded-md text-purple-400 hover:bg-purple-500/10 transition-colors"
            >
              <Calendar className="h-3.5 w-3.5" />
            </button>
          )}
          {isNeedsHMFeedback && (
            <Link
              to={`/hr/interviews/${match.id}/feedback`}
              title="Submit Feedback"
              className="p-1 rounded-md text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            >
              <Award className="h-3.5 w-3.5" />
            </Link>
          )}
          {isOfferStage && (
            <button
              onClick={() => onQuickStatusChange(match, "hired")}
              disabled={isUpdating}
              title="Mark Hired"
              className="p-1 rounded-md text-muted-foreground hover:text-green-400 hover:bg-green-500/10 transition-colors"
            >
              <Trophy className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Professional Detailed Card View ──────────────────────────────────────────
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative p-3 rounded-xl border bg-card/95 hover:bg-card border-border/80 hover:border-primary/50 transition-all space-y-2.5 shadow-xs ${
        isDragging
          ? "border-primary shadow-xl ring-2 ring-primary/25 scale-102"
          : "hover:shadow-md hover:shadow-primary/5"
      }`}
    >
      {/* Top Header: Drag Handle + Avatar + Name + Fit Score */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-600/15 to-purple-600/15 border border-indigo-500/25 text-primary text-xs font-bold font-outfit shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-foreground truncate font-outfit leading-tight">
              {match.candidate.full_name}
            </h4>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
              <span>{match.candidate.total_experience_years || 0} yrs exp</span>
              {match.candidate.preferred_work_mode && (
                <>
                  <span>•</span>
                  <span className="capitalize">{match.candidate.preferred_work_mode}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${scoreBadgeStyle}`}>
            {scoreNum}% Fit
          </span>
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground p-0.5 rounded"
            title="Drag card to move stage"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>

      {/* Enterprise Pipeline State Indicator Badge */}
      <div className="flex items-center justify-between">
        <span
          className={`text-[9px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${pStateCfg.bg} ${pStateCfg.color}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          {pStateCfg.badge}
        </span>

        {match.assigned_recruiter && (
          <span className="text-[9px] text-muted-foreground truncate max-w-[110px]" title={`Claimed by ${match.assigned_recruiter.name}`}>
            Recruiter: {match.assigned_recruiter.name.split(" ")[0]}
          </span>
        )}
      </div>

      {/* Resume-Extracted Skills Section */}
      <div className="space-y-1.5 pt-0.5">
        {resumeSkills.length > 0 ? (
          <div>
            <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-400 uppercase tracking-wider mb-1">
              <Sparkles className="h-2.5 w-2.5" /> Verified Resume Skills:
            </div>
            <div className="flex flex-wrap gap-1">
              {resumeSkills.slice(0, 3).map((rs: any) => {
                const sName = rs.name || rs.skill?.name || rs.skill_name || "Skill";
                const evText = rs.evidence_text || (rs.source === "resume" ? "Verified in resume" : null);
                return (
                  <span
                    key={rs.id || rs.skill_id || sName}
                    title={evText ? `Resume Context: "${evText}"` : "Extracted from candidate resume"}
                    className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 truncate max-w-[115px] flex items-center gap-1 cursor-help"
                  >
                    <span>{sName}</span>
                    <span className="text-[7px] px-0.5 py-0 rounded bg-emerald-500/30 text-emerald-200 font-mono">
                      Resume
                    </span>
                  </span>
                );
              })}
              {resumeSkills.length > 3 && (
                <span className="text-[9px] px-1 py-0.5 text-emerald-400 font-bold self-center">
                  +{resumeSkills.length - 3}
                </span>
              )}
            </div>
          </div>
        ) : declaredSkills.length > 0 ? (
          <div>
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">
              Self-Declared Skills:
            </div>
            <div className="flex flex-wrap gap-1">
              {declaredSkills.slice(0, 3).map((ds: any) => (
                <span
                  key={ds.id || ds.skill_id || ds.name}
                  className="text-[9px] px-1.5 py-0.5 rounded bg-secondary/80 text-foreground/80 border border-border/50 truncate max-w-[100px]"
                >
                  {ds.name || ds.skill?.name || ds.skill_name}
                </span>
              ))}
              {declaredSkills.length > 3 && (
                <span className="text-[9px] px-1 py-0.5 text-muted-foreground self-center">
                  +{declaredSkills.length - 3}
                </span>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Primary 3-Way Lifecycle Action Button */}
      <div className="pt-1.5 border-t border-border/40">
        {isMatched && (
          <Button
            size="sm"
            variant="outline"
            disabled={isUpdating}
            onClick={() => onQuickStatusChange(match, "screened")}
            className="w-full h-7 text-xs font-semibold gap-1.5 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 border-indigo-500/30"
          >
            {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserCheck className="h-3 w-3" />}
            Screen Candidate
          </Button>
        )}

        {isScreened && (
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="default"
              disabled={isUpdating}
              onClick={() => onRequestInterviewClick(match)}
              className="flex-1 h-7 text-xs bg-purple-600 hover:bg-purple-500 text-white font-bold gap-1 shadow-xs"
            >
              <Calendar className="h-3 w-3" /> Propose Slots (HM)
            </Button>
            <Link
              to={`/hr/candidates/${match.id}/review`}
              className="inline-flex items-center justify-center h-7 px-2 text-xs rounded-md border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors"
              title="Full HM Review Dossier"
            >
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}

        {isSlotProposedOrWaiting && (
          <div className="p-2 rounded-lg bg-secondary/40 border border-border/50 text-[10px] space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Recruiter Dispatch:</span>
              <span className="font-semibold text-cyan-400">
                {pState === "INTERVIEW_SLOTS_PROPOSED" ? "Pending Dispatch" : "Candidate Selecting"}
              </span>
            </div>
            <button
              onClick={() => onRequestInterviewClick(match)}
              className="text-[10px] text-purple-400 hover:underline flex items-center gap-1 mt-0.5"
            >
              <Calendar className="h-2.5 w-2.5" /> Adjust Proposed Slots
            </button>
          </div>
        )}

        {isInterviewConfirmed && (
          <div className="flex items-center justify-between gap-1.5 p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-300">
            <span className="flex items-center gap-1 font-semibold">
              <CalendarCheck className="h-3.5 w-3.5" /> Confirmed
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={isUpdating}
              onClick={() => onQuickStatusChange(match, "offer")}
              className="h-6 px-2 text-[10px] text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
              title="Move to Offer"
            >
              Extend Offer
            </Button>
          </div>
        )}

        {isNeedsHMFeedback && (
          <Link
            to={`/hr/interviews/${match.id}/feedback`}
            className="w-full inline-flex items-center justify-center h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg gap-1.5 shadow-xs transition-colors"
          >
            <Award className="h-3.5 w-3.5" />
            Submit GO / NO-GO Feedback
          </Link>
        )}

        {isOfferStage && (
          <Button
            size="sm"
            variant="default"
            disabled={isUpdating}
            onClick={() => onQuickStatusChange(match, "hired")}
            className="w-full h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1 shadow-xs"
          >
            {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trophy className="h-3 w-3" />}
            Mark Hired
          </Button>
        )}
      </div>

      {/* Auxiliary Icon Bar: Feedback Scorecard, Resume, Reject */}
      <div className="flex items-center justify-between gap-1 pt-1 border-t border-border/30 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onScorecardClick(match);
            }}
            className="hover:text-primary transition-colors flex items-center gap-1"
            title="Open Evaluation Scorecard"
          >
            <MessageSquarePlus className="h-3 w-3 text-primary/80" />
            <span>Scorecard</span>
          </button>

          {(match.candidate.resume_file_path || match.candidate.resume_s3_key) && (
            <button
              type="button"
              onClick={handleResumeClick}
              className="hover:text-foreground transition-colors flex items-center gap-1"
              title="View Candidate Resume"
            >
              <FileText className="h-3 w-3 text-indigo-400" />
              <span>Resume</span>
            </button>
          )}
        </div>

        {match.status !== "hired" && pState !== "HIRED" && (
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => onQuickStatusChange(match, "rejected")}
            title="Reject Candidate"
            className="text-muted-foreground/50 hover:text-rose-400 transition-colors p-0.5"
          >
            <XCircle className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

// ── Droppable Kanban Column ───────────────────────────────────────────────────
interface KanbanColumnProps {
  columnId: string;
  matches: MatchResult[];
  isCompact: boolean;
  onScorecardClick: (match: MatchResult) => void;
  onRequestInterviewClick: (match: MatchResult) => void;
  onQuickStatusChange: (match: MatchResult, newStatus: PipelineStatus) => void;
  updatingMatchId: number | null;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  columnId,
  matches,
  isCompact,
  onScorecardClick,
  onRequestInterviewClick,
  onQuickStatusChange,
  updatingMatchId,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: columnId });

  const cfg = COLUMN_CONFIG[columnId] || {
    label: columnId,
    color: "text-muted-foreground",
    bg: "bg-secondary/20",
    border: "border-border/60",
    icon: Sparkles,
  };
  const Icon = cfg.icon;

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-w-[285px] max-w-[305px] h-[calc(100vh-270px)] max-h-[720px] min-h-[480px] rounded-2xl border transition-colors ${
        isOver ? "border-primary ring-2 ring-primary/20 bg-primary/5" : `${cfg.border} ${cfg.bg}`
      } p-3 shrink-0 shadow-xs`}
    >
      {/* Sticky Column Header */}
      <div className="flex items-center justify-between pb-2.5 mb-1 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${cfg.color}`} />
          <h3 className="text-xs font-bold font-outfit uppercase tracking-wider text-foreground">
            {cfg.label}
          </h3>
        </div>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-background/80 text-foreground/80 border border-border/60">
          {matches.length}
        </span>
      </div>

      {/* Scrollable Column Cards Container */}
      <SortableContext
        items={matches.map((m) => m.id.toString())}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 scrollbar-thin scrollbar-thumb-border hover:scrollbar-thumb-muted-foreground/30">
          {matches.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center p-4 border border-dashed border-border/60 rounded-xl text-center">
              <Icon className={`h-5 w-5 ${cfg.color} opacity-40 mb-1`} />
              <p className="text-[11px] text-muted-foreground">No candidates in stage</p>
              <p className="text-[10px] text-muted-foreground/60">Drag candidates here</p>
            </div>
          ) : (
            matches.map((m) => (
              <CandidateCard
                key={m.id}
                match={m}
                isCompact={isCompact}
                onScorecardClick={onScorecardClick}
                onRequestInterviewClick={onRequestInterviewClick}
                onQuickStatusChange={onQuickStatusChange}
                isUpdating={updatingMatchId === m.id}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
};

// ── Main Pipeline Board ───────────────────────────────────────────────────────
interface HiringPipelineBoardProps {
  initialMatches: MatchResult[];
  onMatchesUpdate?: (matches: MatchResult[]) => void;
}

export const HiringPipelineBoard: React.FC<HiringPipelineBoardProps> = ({
  initialMatches,
  onMatchesUpdate,
}) => {
  const toast = useToast();
  const [matches, setMatches] = useState<MatchResult[]>(initialMatches);
  const [activeMatch, setActiveMatch] = useState<MatchResult | null>(null);
  const [scorecardTarget, setScorecardTarget] = useState<MatchResult | null>(null);
  const [updatingMatchId, setUpdatingMatchId] = useState<number | null>(null);

  // View controls
  const [searchQuery, setSearchQuery] = useState("");
  const [scoreFilter, setScoreFilter] = useState<"all" | "80" | "60">("all");
  const [isCompact, setIsCompact] = useState(false);

  // 3-Way Interview Request Modal State
  const [interviewModalMatch, setInterviewModalMatch] = useState<MatchResult | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Synchronize when parent updates
  React.useEffect(() => {
    setMatches(initialMatches);
  }, [initialMatches]);

  // Filter matches based on search query and score filter
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      // Score filter
      if (scoreFilter === "80" && Number(m.overall_score) < 80) return false;
      if (scoreFilter === "60" && Number(m.overall_score) < 60) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatches = m.candidate.full_name?.toLowerCase().includes(q);
        const skillMatches = m.candidate.skills?.some((s) =>
          s.skill.name.toLowerCase().includes(q)
        );
        const resumeSkillMatches = m.resume_detected_skills?.some((rs: any) =>
          (rs.name || rs.skill_name || "").toLowerCase().includes(q)
        );
        return nameMatches || skillMatches || resumeSkillMatches;
      }
      return true;
    });
  }, [matches, searchQuery, scoreFilter]);

  // Group filtered matches dynamically by enterprise pipeline state mapping
  const getColumnMatches = (colId: string): MatchResult[] =>
    filteredMatches.filter((m) => mapPipelineStateToColumn(m) === colId);

  // Find which column a match belongs to
  const findColumn = (matchId: string): string | null => {
    const match = matches.find((m) => m.id.toString() === matchId);
    if (!match) return null;
    return mapPipelineStateToColumn(match);
  };

  const handleQuickStatusChange = async (match: MatchResult, newStatus: PipelineStatus) => {
    setUpdatingMatchId(match.id);
    const previous = [...matches];

    // Optimistic update
    if (newStatus === "rejected") {
      setMatches((prev) => prev.filter((m) => m.id !== match.id));
    } else {
      setMatches((prev) =>
        prev.map((m) => (m.id === match.id ? { ...m, status: newStatus } : m))
      );
    }

    try {
      const updated = await matchingApi.updateStatus(match.id, newStatus);
      toast.success(
        `${match.candidate.full_name} moved to ${PIPELINE_STAGE_LABELS[newStatus] || newStatus}`
      );
      const nextList =
        newStatus === "rejected"
          ? matches.filter((m) => m.id !== match.id)
          : matches.map((m) => (m.id === match.id ? { ...m, ...updated } : m));
      setMatches(nextList);
      onMatchesUpdate?.(nextList);
    } catch (err: any) {
      setMatches(previous);
      toast.error(err.response?.data?.detail || "Failed to update candidate status.");
    } finally {
      setUpdatingMatchId(null);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const match = matches.find((m) => m.id.toString() === event.active.id.toString());
    setActiveMatch(match ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveMatch(null);

    if (!over) return;

    const activeId = active.id.toString();
    const overId = over.id.toString();

    let targetColumn: string | null = null;
    if (PIPELINE_COLUMNS.includes(overId)) {
      targetColumn = overId;
    } else {
      targetColumn = findColumn(overId);
    }

    if (!targetColumn) return;

    const sourceMatch = matches.find((m) => m.id.toString() === activeId);
    if (!sourceMatch || mapPipelineStateToColumn(sourceMatch) === targetColumn) return;

    // If dragged to interview_scheduled or approved_by_hr, open 3-way Propose Slots modal
    if (targetColumn === "interview_scheduled" || targetColumn === "approved_by_hr") {
      setInterviewModalMatch(sourceMatch);
      return;
    }

    // Advance to target column
    await handleQuickStatusChange(sourceMatch, targetColumn as PipelineStatus);
  };

  const handleInterviewRequestSuccess = () => {
    if (interviewModalMatch) {
      const updated = matches.map((m) =>
        m.id === interviewModalMatch.id
          ? {
              ...m,
              status: "interview_scheduled" as PipelineStatus,
              pipeline_state: "INTERVIEW_SLOTS_PROPOSED" as any,
            }
          : m
      );
      setMatches(updated);
      onMatchesUpdate?.(updated);
    }
  };

  return (
    <div className="space-y-4">
      {/* Board Controls Toolbar */}
      <Card className="p-3 border-border/80 bg-card/60 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search candidates */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Filter by candidate, resume skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-xs bg-background/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filters & View Density */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Fit Score Filter */}
            <div className="flex items-center gap-1 bg-secondary/50 p-0.5 rounded-lg border border-border/50 text-xs">
              <button
                type="button"
                onClick={() => setScoreFilter("all")}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                  scoreFilter === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Scores
              </button>
              <button
                type="button"
                onClick={() => setScoreFilter("80")}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                  scoreFilter === "80" ? "bg-emerald-600 text-white" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                ≥80% High Match
              </button>
              <button
                type="button"
                onClick={() => setScoreFilter("60")}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                  scoreFilter === "60" ? "bg-amber-600 text-white" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                ≥60% Qualified
              </button>
            </div>

            {/* Density Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCompact(!isCompact)}
              className="h-8 gap-1.5 text-xs"
              title="Toggle card size"
            >
              {isCompact ? (
                <>
                  <Maximize2 className="h-3.5 w-3.5" /> Detailed View
                </>
              ) : (
                <>
                  <Minimize2 className="h-3.5 w-3.5" /> Compact View
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* DnD Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 pt-1">
          {PIPELINE_COLUMNS.map((colId) => (
            <KanbanColumn
              key={colId}
              columnId={colId}
              matches={getColumnMatches(colId)}
              isCompact={isCompact}
              onScorecardClick={setScorecardTarget}
              onRequestInterviewClick={setInterviewModalMatch}
              onQuickStatusChange={handleQuickStatusChange}
              updatingMatchId={updatingMatchId}
            />
          ))}
        </div>

        {/* Drag overlay — ghost card while dragging */}
        <DragOverlay>
          {activeMatch ? (
            <CandidateCard
              match={activeMatch}
              isDragging
              isCompact={isCompact}
              onScorecardClick={() => {}}
              onRequestInterviewClick={() => {}}
              onQuickStatusChange={() => {}}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Scorecard modal */}
      {scorecardTarget && (
        <ScorecardModal
          matchId={scorecardTarget.id}
          candidateName={scorecardTarget.candidate.full_name}
          isOpen={!!scorecardTarget}
          onClose={() => setScorecardTarget(null)}
        />
      )}

      {/* 3-Way Interview Request Modal (HM proposes >=2 slots -> Recruiter -> Candidate) */}
      {interviewModalMatch && (
        <RequestInterviewModal
          isOpen={!!interviewModalMatch}
          onClose={() => setInterviewModalMatch(null)}
          match={interviewModalMatch}
          onSuccess={handleInterviewRequestSuccess}
        />
      )}
    </div>
  );
};
export default HiringPipelineBoard;
