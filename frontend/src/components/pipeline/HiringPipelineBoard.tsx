import React, { useState, useMemo } from "react";
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
import { MatchResult, PipelineStatus, PIPELINE_STAGE_LABELS, PIPELINE_COLUMNS } from "../../types";
import { matchingApi, interviewsApi, resumeApi } from "../../services/api";
import { useToast } from "../ui/toast";
import { ScorecardModal } from "./ScorecardModal";
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
    label: "Screened",
    color: "text-blue-400",
    bg: "bg-blue-500/5",
    border: "border-blue-500/20",
    icon: Users,
  },
  approved_by_hr: {
    label: "HR Approved",
    color: "text-emerald-400",
    bg: "bg-emerald-500/5",
    border: "border-emerald-500/20",
    icon: CheckCircle2,
  },
  interview_scheduled: {
    label: "Interview Scheduled",
    color: "text-purple-400",
    bg: "bg-purple-500/5",
    border: "border-purple-500/20",
    icon: ClipboardList,
  },
  offer: {
    label: "Offer Extended",
    color: "text-amber-400",
    bg: "bg-amber-500/5",
    border: "border-amber-500/20",
    icon: Gift,
  },
  hired: {
    label: "Hired",
    color: "text-green-400",
    bg: "bg-green-500/5",
    border: "border-green-500/20",
    icon: Trophy,
  },
};

// ── Candidate Card Component ──────────────────────────────────────────────────
interface CandidateCardProps {
  match: MatchResult;
  isDragging?: boolean;
  isCompact?: boolean;
  onScorecardClick: (match: MatchResult) => void;
  onScheduleInterviewClick: (match: MatchResult) => void;
  onQuickStatusChange: (match: MatchResult, newStatus: PipelineStatus) => void;
  isUpdating?: boolean;
}

const CandidateCard: React.FC<CandidateCardProps> = ({
  match,
  isDragging,
  isCompact = false,
  onScorecardClick,
  onScheduleInterviewClick,
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

  const isMatched = match.status === "matched";
  const isScreened = match.status === "screened";
  const isApproved = match.status === "approved_by_hr";
  const isScheduled = match.status === "interview_scheduled";
  const isOffer = match.status === "offer";

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

          <p className="text-xs font-semibold text-foreground truncate font-outfit">
            {match.candidate.full_name}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full border ${scoreBadgeStyle}`}>
            {scoreNum}%
          </span>

          {/* 1-click stage advancement */}
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
              onClick={() => onQuickStatusChange(match, "approved_by_hr")}
              disabled={isUpdating}
              title="Approve for HR"
              className="p-1 rounded-md text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
          {isApproved && (
            <button
              onClick={() => onScheduleInterviewClick(match)}
              disabled={isUpdating}
              title="Schedule Interview"
              className="p-1 rounded-md text-muted-foreground hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
            >
              <Calendar className="h-3.5 w-3.5" />
            </button>
          )}
          {isScheduled && (
            <button
              onClick={() => onQuickStatusChange(match, "offer")}
              disabled={isUpdating}
              title="Extend Offer"
              className="p-1 rounded-md text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
          {isOffer && (
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

      {/* Top declared skills pills */}
      {match.candidate.skills && match.candidate.skills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {match.candidate.skills.slice(0, 3).map((cs) => (
            <span
              key={cs.id}
              className="text-[9px] px-1.5 py-0.5 rounded bg-secondary/80 text-foreground/80 border border-border/50 truncate max-w-[100px]"
            >
              {cs.skill.name}
            </span>
          ))}
          {match.candidate.skills.length > 3 && (
            <span className="text-[9px] px-1 py-0.5 text-muted-foreground">
              +{match.candidate.skills.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Primary Stage Advancement Button */}
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
            Screen for HR
          </Button>
        )}

        {isScreened && (
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="default"
              disabled={isUpdating}
              onClick={() => onQuickStatusChange(match, "approved_by_hr")}
              className="flex-1 h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-1 shadow-xs"
            >
              {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isUpdating}
              onClick={() => onScheduleInterviewClick(match)}
              className="h-7 px-2 text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 border-purple-500/30"
              title="Schedule Interview"
            >
              <Calendar className="h-3 w-3" />
            </Button>
          </div>
        )}

        {isApproved && (
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="gradient"
              disabled={isUpdating}
              onClick={() => onScheduleInterviewClick(match)}
              className="flex-1 h-7 text-xs font-semibold gap-1 shadow-xs"
            >
              <Calendar className="h-3 w-3" /> Schedule Call
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isUpdating}
              onClick={() => onQuickStatusChange(match, "offer")}
              className="h-7 px-2 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border-amber-500/30"
              title="Skip to Offer"
            >
              <Gift className="h-3 w-3" />
            </Button>
          </div>
        )}

        {isScheduled && (
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="default"
              disabled={isUpdating}
              onClick={() => onQuickStatusChange(match, "offer")}
              className="flex-1 h-7 text-xs bg-amber-600 hover:bg-amber-500 text-white font-semibold gap-1 shadow-xs"
            >
              {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Gift className="h-3 w-3" />}
              Extend Offer
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isUpdating}
              onClick={() => onScheduleInterviewClick(match)}
              className="h-7 px-2 text-xs text-purple-400 border-purple-500/30 hover:bg-purple-500/10"
              title="Reschedule Interview"
            >
              <Calendar className="h-3 w-3" />
            </Button>
          </div>
        )}

        {isOffer && (
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

      {/* Auxiliary Icon Bar: Feedback, Resume, Reject */}
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
            <span>Feedback</span>
          </button>

          {(match.candidate.resume_file_path || match.candidate.resume_s3_key) && (
            <button
              type="button"
              onClick={handleResumeClick}
              className="hover:text-foreground transition-colors flex items-center gap-1"
              title="View Candidate Resume"
            >
              <FileText className="h-3 w-3 text-indigo-400" />
              <span>CV</span>
            </button>
          )}
        </div>

        {match.status !== "hired" && (
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
  onScheduleInterviewClick: (match: MatchResult) => void;
  onQuickStatusChange: (match: MatchResult, newStatus: PipelineStatus) => void;
  updatingMatchId: number | null;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  columnId,
  matches,
  isCompact,
  onScorecardClick,
  onScheduleInterviewClick,
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
      className={`flex flex-col min-w-[275px] max-w-[295px] h-[calc(100vh-270px)] max-h-[720px] min-h-[480px] rounded-2xl border transition-colors ${
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
                onScheduleInterviewClick={onScheduleInterviewClick}
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

  // Schedule Interview Modal state
  const [interviewTarget, setInterviewTarget] = useState<MatchResult | null>(null);
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewType, setInterviewType] = useState("Technical Interview");
  const [interviewMode, setInterviewMode] = useState<"online" | "in_person">("online");
  const [meetingLink, setMeetingLink] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [sendEmailNotification, setSendEmailNotification] = useState(true);
  const [isScheduling, setIsScheduling] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

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
        return nameMatches || skillMatches;
      }
      return true;
    });
  }, [matches, searchQuery, scoreFilter]);

  // Group filtered matches by status
  const getColumnMatches = (colId: string): MatchResult[] =>
    filteredMatches.filter((m) => m.status === colId);

  // Find which column a match belongs to
  const findColumn = (matchId: string): string | null => {
    for (const col of PIPELINE_COLUMNS) {
      if (matches.find((m) => m.id.toString() === matchId && m.status === col)) {
        return col;
      }
    }
    return null;
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
          : matches.map((m) => (m.id === match.id ? { ...m, status: updated.status } : m));
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
    if (!sourceMatch || sourceMatch.status === targetColumn) return;

    // If dragged to interview_scheduled, open scheduling modal
    if (targetColumn === "interview_scheduled") {
      openScheduleModal(sourceMatch);
      return;
    }

    // Advance to target column
    await handleQuickStatusChange(sourceMatch, targetColumn as PipelineStatus);
  };

  const openScheduleModal = (match: MatchResult) => {
    setInterviewTarget(match);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const tzOffset = tomorrow.getTimezoneOffset() * 60000;
    const localISOTime = new Date(tomorrow.getTime() - tzOffset).toISOString().slice(0, 16);
    setInterviewDate(localISOTime);
    setInterviewType("Technical Interview");
    setInterviewMode("online");
    setMeetingLink("https://meet.google.com/new");
    setMeetingNotes("");
    setSendEmailNotification(true);
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interviewTarget || !interviewDate) {
      toast.error("Please provide interview date and time.");
      return;
    }

    setIsScheduling(true);
    try {
      await interviewsApi.create({
        match_result_id: interviewTarget.id,
        interview_date: new Date(interviewDate).toISOString(),
        interview_type: interviewType,
        meeting_link: interviewMode === "online" ? meetingLink : undefined,
        feedback: meetingNotes,
        send_notification: sendEmailNotification,
      });

      toast.success(
        `Interview scheduled with ${interviewTarget.candidate.full_name}! Candidate notification dispatched.`
      );

      const updated = matches.map((m) =>
        m.id === interviewTarget.id ? { ...m, status: "interview_scheduled" as PipelineStatus } : m
      );
      setMatches(updated);
      onMatchesUpdate?.(updated);
      setInterviewTarget(null);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to schedule interview.");
    } finally {
      setIsScheduling(false);
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
              placeholder="Filter candidates by name or skill..."
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
                All Fit Scores
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
              onScheduleInterviewClick={openScheduleModal}
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
              onScheduleInterviewClick={() => {}}
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

      {/* Schedule Interview Modal */}
      {interviewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
          <Card className="w-full max-w-lg border-border/80 bg-card p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div className="flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold font-outfit text-foreground">
                  Schedule Interview Round
                </h3>
              </div>
              <button
                onClick={() => setInterviewTarget(null)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-secondary/40 border border-border/60 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Candidate:</span>
                <span className="font-bold text-foreground">{interviewTarget.candidate.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fit Score:</span>
                <span className="font-bold text-emerald-400">
                  {Number(interviewTarget.overall_score).toFixed(0)}%
                </span>
              </div>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-primary" /> Interview Date & Time *
                </label>
                <Input
                  type="datetime-local"
                  required
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Interview Format</label>
                  <select
                    value={interviewType}
                    onChange={(e) => setInterviewType(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-secondary/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Technical Interview">Technical Interview</option>
                    <option value="HR Behavioral & Strategic">HR Behavioral & Strategic</option>
                    <option value="Culture Fit & Team Meet">Culture Fit & Team Meet</option>
                    <option value="Executive Final Round">Executive Final Round</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Interview Mode</label>
                  <div className="flex gap-2 h-10">
                    <button
                      type="button"
                      onClick={() => setInterviewMode("online")}
                      className={`flex-1 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
                        interviewMode === "online"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-secondary/50 text-muted-foreground"
                      }`}
                    >
                      <Video className="h-3.5 w-3.5" /> Online
                    </button>
                    <button
                      type="button"
                      onClick={() => setInterviewMode("in_person")}
                      className={`flex-1 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
                        interviewMode === "in_person"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-secondary/50 text-muted-foreground"
                      }`}
                    >
                      <MapPin className="h-3.5 w-3.5" /> In-Person
                    </button>
                  </div>
                </div>
              </div>

              {interviewMode === "online" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <Video className="h-3.5 w-3.5 text-indigo-400" /> Video Meeting Link
                  </label>
                  <Input
                    type="url"
                    placeholder="https://meet.google.com/xyz-abc"
                    value={meetingLink}
                    onChange={(e) => setMeetingLink(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Meeting Notes & Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Please join 5 minutes early with your code editor ready."
                  value={meetingNotes}
                  onChange={(e) => setMeetingNotes(e.target.value)}
                  className="w-full rounded-lg border border-border bg-secondary/50 p-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="pipeline_send_email"
                  checked={sendEmailNotification}
                  onChange={(e) => setSendEmailNotification(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                />
                <label htmlFor="pipeline_send_email" className="text-xs text-muted-foreground cursor-pointer">
                  Dispatch email notification with meeting link to candidate
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/70">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setInterviewTarget(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="gradient"
                  size="sm"
                  disabled={isScheduling}
                  className="gap-1.5 font-semibold"
                >
                  {isScheduling ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Scheduling...
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" /> Confirm & Send Invite
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
