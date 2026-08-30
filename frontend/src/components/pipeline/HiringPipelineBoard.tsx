import React, { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
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
import { ScoreBadge } from "../common/ScoreBadge";
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
  ExternalLink,
  UserCheck,
  XCircle,
  Award,
} from "lucide-react";

// ── Column config ──────────────────────────────────────────────────────────────
const COLUMN_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; icon: React.ElementType }
> = {
  matched: {
    label: "Matched",
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/30",
    icon: Sparkles,
  },
  screened: {
    label: "Screened by Recruiter",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    icon: Users,
  },
  approved_by_hr: {
    label: "Approved by HR",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    icon: CheckCircle2,
  },
  interview_scheduled: {
    label: "Interview Scheduled",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
    icon: ClipboardList,
  },
  offer: {
    label: "Offer Extended",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    icon: Gift,
  },
  hired: {
    label: "Hired",
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/30",
    icon: Trophy,
  },
};

// ── Candidate Card ────────────────────────────────────────────────────────────
interface CandidateCardProps {
  match: MatchResult;
  isDragging?: boolean;
  onScorecardClick: (match: MatchResult) => void;
  onScheduleInterviewClick: (match: MatchResult) => void;
  onQuickStatusChange: (match: MatchResult, newStatus: PipelineStatus) => void;
  isUpdating?: boolean;
}

const CandidateCard: React.FC<CandidateCardProps> = ({
  match,
  isDragging,
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
    opacity: isSortableDragging ? 0.3 : 1,
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

  const isMatched = match.status === "matched";
  const isScreened = match.status === "screened";
  const isApproved = match.status === "approved_by_hr";
  const isScheduled = match.status === "interview_scheduled";
  const isOffer = match.status === "offer";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative p-3.5 rounded-xl border bg-card/90 backdrop-blur-sm transition-all space-y-2.5 ${
        isDragging
          ? "border-primary/60 shadow-lg shadow-primary/20 scale-105"
          : "border-border/70 hover:border-primary/40 hover:shadow-md hover:shadow-primary/10"
      }`}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-3 right-3 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors p-0.5"
        title="Drag candidate to move stage"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      <div className="pr-6 space-y-1.5">
        {/* Candidate name */}
        <p className="text-sm font-bold text-foreground truncate pr-1">
          {match.candidate.full_name}
        </p>

        {/* Score + experience tag */}
        <div className="flex items-center gap-2 flex-wrap">
          <ScoreBadge score={match.overall_score} size="sm" />
          {match.meets_experience ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded">
              <CheckCircle2 className="h-3 w-3" /> Exp OK
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-medium bg-amber-500/10 px-1.5 py-0.5 rounded">
              <AlertCircle className="h-3 w-3" /> Below Exp
            </span>
          )}
        </div>

        {/* Skills count */}
        <p className="text-[11px] text-muted-foreground">
          {match.candidate.skills.length} skills on profile · {match.candidate.total_experience_years} yrs exp
        </p>
      </div>

      {/* Main Tactical Action Buttons */}
      <div className="pt-2 border-t border-border/50 flex flex-wrap items-center gap-1.5">
        {isMatched && (
          <Button
            size="sm"
            variant="default"
            disabled={isUpdating}
            onClick={() => onQuickStatusChange(match, "screened")}
            className="text-xs h-7 px-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold gap-1 shadow-xs"
          >
            {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserCheck className="h-3 w-3" />}
            Screen for HR
          </Button>
        )}

        {isScreened && (
          <>
            <Button
              size="sm"
              variant="default"
              disabled={isUpdating}
              onClick={() => onQuickStatusChange(match, "approved_by_hr")}
              className="text-xs h-7 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-1 shadow-xs"
            >
              {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
              Approve
            </Button>
            <Button
              size="sm"
              variant="gradient"
              disabled={isUpdating}
              onClick={() => onScheduleInterviewClick(match)}
              className="text-xs h-7 px-2.5 gap-1 shadow-xs"
            >
              <Calendar className="h-3 w-3" /> Schedule
            </Button>
          </>
        )}

        {isApproved && (
          <>
            <Button
              size="sm"
              variant="gradient"
              disabled={isUpdating}
              onClick={() => onScheduleInterviewClick(match)}
              className="text-xs h-7 px-2.5 gap-1 shadow-xs"
            >
              <Calendar className="h-3 w-3" /> Schedule Interview
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isUpdating}
              onClick={() => onQuickStatusChange(match, "offer")}
              className="text-xs h-7 px-2 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border-amber-500/30 gap-1"
            >
              <Gift className="h-3 w-3" /> Offer
            </Button>
          </>
        )}

        {isScheduled && (
          <>
            <Button
              size="sm"
              variant="default"
              disabled={isUpdating}
              onClick={() => onQuickStatusChange(match, "offer")}
              className="text-xs h-7 px-2.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold gap-1 shadow-xs"
            >
              {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Gift className="h-3 w-3" />}
              Extend Offer
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isUpdating}
              onClick={() => onScheduleInterviewClick(match)}
              className="text-xs h-7 px-2 gap-1 text-purple-400 border-purple-500/30 hover:bg-purple-500/10"
            >
              <Calendar className="h-3 w-3" /> Re-Schedule
            </Button>
          </>
        )}

        {isOffer && (
          <Button
            size="sm"
            variant="default"
            disabled={isUpdating}
            onClick={() => onQuickStatusChange(match, "hired")}
            className="text-xs h-7 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1 shadow-xs"
          >
            {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trophy className="h-3 w-3" />}
            Mark Hired
          </Button>
        )}
      </div>

      {/* Auxiliary Actions: Feedback, Resume, Reject */}
      <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-border/30 text-[11px]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onScorecardClick(match);
            }}
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
          >
            <MessageSquarePlus className="h-3 w-3 text-primary" /> Feedback
          </button>

          {(match.candidate.resume_file_path || match.candidate.resume_s3_key) && (
            <button
              type="button"
              onClick={handleResumeClick}
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <FileText className="h-3 w-3 text-indigo-400" /> Resume
            </button>
          )}
        </div>

        {match.status !== "hired" && (
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => onQuickStatusChange(match, "rejected")}
            title="Reject Candidate"
            className="inline-flex items-center gap-0.5 text-muted-foreground/60 hover:text-rose-400 transition-colors ml-auto"
          >
            <XCircle className="h-3.5 w-3.5" /> Reject
          </button>
        )}
      </div>
    </div>
  );
};

// ── Droppable Column ──────────────────────────────────────────────────────────
interface KanbanColumnProps {
  columnId: string;
  matches: MatchResult[];
  onScorecardClick: (match: MatchResult) => void;
  onScheduleInterviewClick: (match: MatchResult) => void;
  onQuickStatusChange: (match: MatchResult, newStatus: PipelineStatus) => void;
  updatingMatchId: number | null;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  columnId,
  matches,
  onScorecardClick,
  onScheduleInterviewClick,
  onQuickStatusChange,
  updatingMatchId,
}) => {
  const cfg = COLUMN_CONFIG[columnId] || {
    label: columnId,
    color: "text-muted-foreground",
    bg: "bg-secondary/30",
    border: "border-border/60",
    icon: Sparkles,
  };
  const Icon = cfg.icon;

  return (
    <div className={`flex flex-col min-w-[260px] max-w-[280px] rounded-2xl border ${cfg.border} ${cfg.bg} p-3.5 space-y-3 shrink-0`}>
      {/* Column Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${cfg.color}`} />
          <h3 className="text-xs font-bold font-outfit uppercase tracking-wider text-foreground">
            {cfg.label}
          </h3>
        </div>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-background/60 text-muted-foreground border border-border/50">
          {matches.length}
        </span>
      </div>

      {/* Droppable Card list */}
      <SortableContext
        items={matches.map((m) => m.id.toString())}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 space-y-2.5 min-h-[160px]">
          {matches.length === 0 ? (
            <div className="h-full flex items-center justify-center p-4 border border-dashed border-border/60 rounded-xl text-[11px] text-muted-foreground text-center">
              Drop candidates here
            </div>
          ) : (
            matches.map((m) => (
              <CandidateCard
                key={m.id}
                match={m}
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

// ── Main Board ────────────────────────────────────────────────────────────────
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

  // Schedule Interview Modal state
  const [interviewTarget, setInterviewTarget] = useState<MatchResult | null>(null);
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewType, setInterviewType] = useState("Technical Interview");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [sendEmailNotification, setSendEmailNotification] = useState(true);
  const [isScheduling, setIsScheduling] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Group matches by status (excluding rejected)
  const getColumnMatches = (colId: string): MatchResult[] =>
    matches.filter((m) => m.status === colId);

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

    // If dragged to interview_scheduled, prompt schedule modal
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
    <>
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
                  <Clock className="h-3.5 w-3.5 text-primary" /> Interview Date & Time
                </label>
                <Input
                  type="datetime-local"
                  required
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                />
              </div>

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
                <label className="text-xs font-semibold text-foreground">
                  Meeting Instructions / Google Meet Link
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Google Meet link: https://meet.google.com/xyz"
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
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="pipeline_send_email" className="text-xs text-muted-foreground">
                  Automatically dispatch email notification to candidate
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
                      <Send className="h-3.5 w-3.5" /> Confirm Interview
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </>
  );
};
